import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Box3, Material, Mesh, Raycaster, Texture, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createGarden } from '../src/scene/geometry';
import { installCraftStone } from '../src/scene/craftStone';

const bytes=readFileSync(new URL('../public/assets/craft-stone.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const kind: string='shizilin';
describe('实际Blender GLB的孔洞、坐标与资源所有权',()=>{
 it('与原机位/对象坐标一致，实际石洞可透视且实体存在',()=>{
  const resources=installCraftStone(createGarden(),asset.scene);
  try {
   resources.group.updateMatrixWorld(true);
   if(kind==='liuyuan') {
    const stone=resources.group.getObjectByName('guanyun-peak')!;
    const ray=(x:number,y:number)=>new Raycaster(stone.localToWorld(new Vector3(x*7.25,y*7.25,7.25)),new Vector3(0,0,-1).transformDirection(stone.matrixWorld));
    for(const [x,y] of [[-.019,.345],[.039,.566],[-.024,.740]])expect(ray(x,y).intersectObject(stone,true)).toHaveLength(0);
    expect(ray(-.085,.345).intersectObject(stone,true).length).toBeGreaterThan(0);
    const bounds=new Box3().setFromObject(stone);
    expect(bounds.max.y).toBeGreaterThan(7.15);expect(bounds.max.y).toBeLessThan(7.35);
   } else {
    const stone=resources.group.getObjectByName('stone-labyrinth')!;
    const hit=(origin:number[],direction:number[],far=16)=>new Raycaster(new Vector3(...origin as [number,number,number]),new Vector3(...direction as [number,number,number]),0,far).intersectObject(stone,true);
    expect(hit([-6.7,1.25,6.8],[0,0,-1])).toHaveLength(0);
    expect(hit([-8.3,1.25,6.8],[0,0,-1]).length).toBeGreaterThan(0);
    expect(hit([-6.7,1.25,-1.2],[0,1,0],6).length).toBeGreaterThan(0);
   }
   let triangles=0;resources.group.traverse(o=>{if(o instanceof Mesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;expect(Array.from(o.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);}});
   expect(triangles).toBeLessThan(kind==='liuyuan'?200000:170000);
  } finally {resources.dispose();}
 });
 it('每次挂载拥有独立资源，释放两次不会损坏缓存或其他挂载',()=>{
  const first=installCraftStone(createGarden(),asset.scene),second=installCraftStone(createGarden(),asset.scene);
  let cacheReleased=0,released=0;const geometries=new Set<Mesh['geometry']>(),materials=new Set<Material>();
  asset.scene.traverse(o=>{if(o instanceof Mesh)o.geometry.addEventListener('dispose',()=>cacheReleased++);});
  first.group.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
  geometries.forEach(g=>g.addEventListener('dispose',()=>released++));materials.forEach(m=>m.addEventListener('dispose',()=>released++));
  first.dispose();expect(released).toBe(geometries.size+materials.size);first.dispose();expect(released).toBe(geometries.size+materials.size);expect(cacheReleased).toBe(0);
  expect(new Box3().setFromObject(second.group).max.y).toBeGreaterThan(4);second.dispose();expect(cacheReleased).toBe(0);
 });
 it('法线纹理按挂载克隆，释放不会损坏加载缓存',()=>{
  const cached=new Texture();let cacheReleased=0,ownedReleased=0;
  cached.addEventListener('dispose',()=>cacheReleased++);
  const resources=installCraftStone(createGarden(),asset.scene,cached);
  const maps=new Set<Texture>();resources.group.getObjectByName('stone-labyrinth')!.traverse(o=>{
    if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){
      const map=(m as import('three').MeshStandardMaterial).normalMap;
      expect(map).not.toBe(cached);expect(map).toBeTruthy();maps.add(map!);
    }
  });
  maps.forEach(m=>m.addEventListener('dispose',()=>ownedReleased++));
  resources.dispose();resources.dispose();expect(ownedReleased).toBe(maps.size);expect(cacheReleased).toBe(0);cached.dispose();
 });
});
