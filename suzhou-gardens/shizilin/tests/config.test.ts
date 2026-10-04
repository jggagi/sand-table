import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Box3, Material, Mesh, Raycaster, Vector3 } from 'three';
import { ROCKERY_PROBES, REGION_IDS, SCENE_BOUNDS, SCENE_NAME, SCENE_OBJECTS, SCENE_SEED } from '../src/data/garden.layout';
import { CAMERA_LIMITS, getFittedZoom, getViewPreset, VIEW_PRESETS } from '../src/data/garden.views';
import { createGarden } from '../src/scene/geometry';

describe('本园独立布局与正交构图', () => {
  it('语义ID唯一、区域引用有效、构件与边界有限', () => {
    expect(SCENE_OBJECTS.length).toBeGreaterThan(10);
    expect(new Set(SCENE_OBJECTS.map(object=>object.id)).size).toBe(SCENE_OBJECTS.length);
    expect(Number.isSafeInteger(SCENE_SEED)).toBe(true);
    for (const object of SCENE_OBJECTS) {
      expect(REGION_IDS).toContain(object.regionId);
      expect(object.position.every(Number.isFinite)).toBe(true);
      for (const [key,value] of Object.entries(object.geometry)) {
        if (typeof value==='number') expect(Number.isFinite(value)).toBe(true);
        if (['width','height','depth','thickness','length'].includes(key) && typeof value==='number') expect(value).toBeGreaterThan(0);
      }
    }
    for (let axis=0;axis<3;axis++) expect(SCENE_BOUNDS.max[axis]).toBeGreaterThan(SCENE_BOUNDS.min[axis]);
  });
  it('四个真实观景点引用存在的物体，限制不允许翻到底座下', () => {
    expect(VIEW_PRESETS).toHaveLength(4);
    expect(new Set(VIEW_PRESETS.map(view=>view.id)).size).toBe(4);
    expect(VIEW_PRESETS[0].id).toBe('overview');
    for (const view of VIEW_PRESETS) {
      expect(getViewPreset(view.id)).toBe(view);
      expect(SCENE_OBJECTS.find(object=>object.id===view.focusId)?.regionId).toBe(view.regionId);
      expect([...view.position,...view.target].every(Number.isFinite)).toBe(true);
      expect(view.position[1]).toBeGreaterThan(view.target[1]);
      expect(view.verticalSpan).toBeGreaterThan(0);
      expect(view.horizontalSpan).toBeGreaterThan(0);
    }
    expect(CAMERA_LIMITS.minPolarAngle).toBeGreaterThan(0);
    expect(CAMERA_LIMITS.maxPolarAngle).toBeLessThan(Math.PI/2);
    expect(CAMERA_LIMITS.minZoomRatio).toBeLessThan(1);
    expect(CAMERA_LIMITS.maxZoomRatio).toBeGreaterThan(1);
  });
  it.each([[1440,1000],[390,844],[844,390],[320,568]])('在 %i×%i 视口同时适配两轴', (width,height) => {
    for (const view of VIEW_PRESETS) {
      const zoom=getFittedZoom(width,height,view);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom*view.horizontalSpan).toBeLessThanOrEqual(width+.001);
      expect(zoom*view.verticalSpan).toBeLessThanOrEqual(height+.001);
      expect(Number.isFinite(getFittedZoom(0,0,view))).toBe(true);
    }
  });
  it('场景包含全部稳定对象，固定种子几何重复一致且有合理预算', () => {
    const first=createGarden(), second=createGarden();
    const signature=(resources:ReturnType<typeof createGarden>)=>{
      const hash=createHash('sha256');let meshes=0,triangles=0;
      resources.group.traverse(object=>{
        if (!(object instanceof Mesh)) return;
        meshes++;
        const position=object.geometry.getAttribute('position');
        expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
        triangles+=(object.geometry.index?.count??position.count)/3;
        hash.update(Buffer.from(position.array.buffer,position.array.byteOffset,position.array.byteLength));
      });
      return {hash:hash.digest('hex'),meshes,triangles};
    };
    try {
      expect(first.group.name).toBe(SCENE_NAME);
      for (const object of SCENE_OBJECTS) expect(first.group.getObjectByName(object.id)).toBeDefined();
      const bounds=new Box3().setFromObject(first.group);
      bounds.min.toArray().forEach((value,axis)=>expect(value).toBeGreaterThanOrEqual(SCENE_BOUNDS.min[axis]));
      bounds.max.toArray().forEach((value,axis)=>expect(value).toBeLessThanOrEqual(SCENE_BOUNDS.max[axis]));
      const state=signature(first);
      expect(state.meshes).toBeGreaterThan(10);
      expect(state.meshes).toBeLessThan(250);
      expect(state.triangles).toBeGreaterThan(1000);
      expect(state.triangles).toBeLessThan(300000);
      expect(signature(second)).toEqual(state);
    } finally {first.dispose();second.dispose();}
  });
  it('卸载释放全部自有网格和材质，重复释放不会产生二次事件', () => {
    const resources=createGarden();
    const geometries=new Set<Mesh['geometry']>();
    const materials=new Set<Material>();let released=0;
    resources.group.traverse(object=>{
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material)?object.material:[object.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.addEventListener('dispose',()=>released++);
    for (const material of materials) material.addEventListener('dispose',()=>released++);
    resources.dispose();
    expect(released).toBe(geometries.size+materials.size);
    resources.dispose();
    expect(released).toBe(geometries.size+materials.size);
  });
});

// A carved opening must stay empty through the actual FrontSide rock surface.
it('连续洞壑有贯通主洞，同时保留侧壁和洞顶实体', () => {
  const resources=createGarden();
  try {
    resources.group.updateMatrixWorld(true);
    const rock=resources.group.getObjectByName('stone-labyrinth')!;
    const hit=(probe:typeof ROCKERY_PROBES[keyof typeof ROCKERY_PROBES])=>new Raycaster(new Vector3(...probe.origin),new Vector3(...probe.direction),0,probe.far).intersectObject(rock,true);
    expect(hit(ROCKERY_PROBES.throughCave)).toHaveLength(0);
    expect(hit(ROCKERY_PROBES.adjacentSolid).length).toBeGreaterThan(0);
    expect(hit(ROCKERY_PROBES.caveCeiling).length).toBeGreaterThan(0);
  } finally {resources.dispose();}
});
