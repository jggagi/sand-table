import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {BoxGeometry,Group,Matrix4,Mesh,MeshStandardMaterial,OrthographicCamera,Texture,Vector3} from 'three';
import {PNG} from 'pngjs';
import {VIEW_PRESETS} from '../src/data/garden.views';
import {pondShape,shoreDistance} from '../src/scene/pondShape';
import {PondWater,createShoreTexture,updateMirrorCamera} from '../src/scene/pondWater';
import {installCraftStone} from '../src/scene/craftStone';

describe('实际正交机位的平面倒影数学',()=>{
  it.each(VIEW_PRESETS)('$id：保留正交缩放，镜像投影与水面交点对齐',view=>{
    const source=new OrthographicCamera(-20,20,14,-14,.1,180),mirror=new OrthographicCamera();
    source.position.set(...view.position);source.lookAt(new Vector3(...view.target));source.zoom=1.7;source.updateProjectionMatrix();source.updateMatrixWorld();
    const matrix=source.matrixWorld.clone();updateMirrorCamera(source,mirror);
    expect(mirror.isOrthographicCamera).toBe(true);expect(mirror.projectionMatrix.equals(source.projectionMatrix)).toBe(true);expect(source.matrixWorld.equals(matrix)).toBe(true);
    expect(mirror.position.y).toBeCloseTo(.25-source.position.y,8);
    const direction=source.getWorldDirection(new Vector3()),reflectedDirection=mirror.getWorldDirection(new Vector3());
    expect(reflectedDirection.distanceTo(direction.clone().reflect(new Vector3(0,1,0)))).toBeLessThan(1e-8);
    const object=new Vector3(8.7,2.3,2.9),virtual=object.clone();virtual.y=.25-object.y;
    const onWater=virtual.clone().addScaledVector(direction,(.125-virtual.y)/direction.y);
    const objectUv=object.clone().project(mirror),waterUv=onWater.clone().project(mirror);
    expect(objectUv.x).toBeCloseTo(waterUv.x,7);expect(objectUv.y).toBeCloseTo(waterUv.y,7);
    expect(mirror.matrixWorldInverse.clone().multiply(mirror.matrixWorld).elements.every((n,i)=>Math.abs(n-new Matrix4().elements[i])<1e-8)).toBe(true);
  });
});

it('岸深来自实际弯曲边界，岸边零、池心深、池外为负',()=>{
  const outline=pondShape(10.5,9.8).getPoints();
  expect(shoreDistance(0,0,outline)).toBeGreaterThan(3);
  for(const p of outline)expect(Math.abs(shoreDistance(p.x,-p.y,outline))).toBeLessThan(1e-8);
  expect(shoreDistance(6,0,outline)).toBeLessThan(0);
  const texture=createShoreTexture(64),bytes=texture.image.data as Uint8Array;
  expect(bytes[(32*64+32)*4]).toBe(255);expect(bytes[0]).toBe(0);
  expect(new Set(bytes).size).toBeGreaterThan(40);texture.dispose();
});

it('卸载水面回收自有材质/纹理/帧缓冲，不回收场景原材质和几何',()=>{
  const geometry=new BoxGeometry(),original=new MeshStandardMaterial(),mesh=new Mesh(geometry,original);
  const water=new PondWater(mesh,true);let owned=0,foreign=0;
  [water.material,water.shore,water.target].forEach(o=>o.addEventListener('dispose',()=>owned++));
  geometry.addEventListener('dispose',()=>foreign++);original.addEventListener('dispose',()=>foreign++);
  expect(mesh.material).toBe(water.material);expect(water.target.width).toBe(256);
  water.dispose();water.dispose();expect(mesh.material).toBe(original);expect(owned).toBe(3);expect(foreign).toBe(0);
  geometry.dispose();original.dispose();
});

it('Blender产物包含真实UV和独立法线烘焙，GLB不隐式引用图片',()=>{
  const bytes=readFileSync(new URL('../public/assets/craft-stone.glb',import.meta.url));
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString());
  expect(gltf.images??[]).toHaveLength(0);
  expect(gltf.meshes[0].primitives[0].attributes.TEXCOORD_0).toBeDefined();
  const image=PNG.sync.read(readFileSync(new URL('../public/assets/stone-normal.png',import.meta.url)));
  expect([image.width,image.height]).toEqual([1024,1024]);
  let blue=0,count=0;const reds=new Set<number>();
  for(let i=0;i<image.data.length;i+=4){if(image.data[i+2]>128){blue+=image.data[i+2];count++;reds.add(image.data[i]);}}
  expect(count).toBeGreaterThan(100000);expect(blue/count).toBeGreaterThan(180);expect(reds.size).toBeGreaterThan(80);
});

it('损坏的资产节点在抛错前回收本次创建的场景',()=>{
  let released=0;const resources={group:new Group(),dispose:()=>{released++;}};
  const cached=new Texture();let textureReleased=0;cached.addEventListener('dispose',()=>textureReleased++);
  expect(()=>installCraftStone(resources,new Group(),cached)).toThrow('精修石体缺少稳定对象');
  expect(released).toBe(1);expect(textureReleased).toBe(0);cached.dispose();
});
