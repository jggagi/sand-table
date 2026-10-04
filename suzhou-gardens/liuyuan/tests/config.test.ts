import { describe, expect, it } from 'vitest';
import { Mesh, Raycaster, Vector3 } from 'three';
import { REGION_IDS, SCENE_BOUNDS, SCENE_OBJECTS, SCENE_SEED, type SceneObject } from '../src/data/liuyuan.layout';
import { CAMERA_LIMITS, getViewSpans, getFittedZoom, getViewPreset, VIEW_PRESETS } from '../src/data/liuyuan.views';
import { createGarden } from '../src/scene/geometry';

describe('留园场景的可替换资产配置', () => {
  it('使用唯一语义 ID，且所有对象引用已知区域', () => {
    const ids = SCENE_OBJECTS.map(object => object.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(REGION_IDS).toEqual(['central-water', 'corridor-courts', 'guanyun-court']);
    for (const object of SCENE_OBJECTS) {
      expect(object.id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      expect(REGION_IDS).toContain(object.regionId);
    }
    for (const region of REGION_IDS) {
      expect(SCENE_OBJECTS.some(object => object.regionId === region)).toBe(true);
    }
  });

  it('变换与几何尺寸有限、有效，不产生 NaN 或反向缩放', () => {
    for (const object of SCENE_OBJECTS as readonly SceneObject[]) {
      expect(object.position).toHaveLength(3);
      expect(object.position.every(Number.isFinite)).toBe(true);
      for (const coordinate of object.rotation ?? [0, 0, 0]) expect(Number.isFinite(coordinate)).toBe(true);
      for (const scale of object.scale ?? [1, 1, 1]) expect(scale).toBeGreaterThan(0);
      for (const value of Object.values(object.geometry)) {
        if (typeof value === 'number') {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }
      }
      expect(typeof object.placeholder).toBe('boolean');
    }
    expect(Number.isSafeInteger(SCENE_SEED)).toBe(true);
    for (let axis = 0; axis < 3; axis++) expect(SCENE_BOUNDS.min[axis]).toBeLessThan(SCENE_BOUNDS.max[axis]);
  });

  it('保留中部大池、廊院开口和独立的东部冠云峰，小水景不混入大池', () => {
    const object = (id: string) => SCENE_OBJECTS.find(item => item.id === id);
    expect(object('central-pond')).toMatchObject({ regionId: 'central-water', geometry: { kind: 'pond' } });
    expect(object('moon-gate')).toMatchObject({ regionId: 'corridor-courts', geometry: { kind: 'wall', opening: 'moon' } });
    expect(object('guanyun-peak')).toMatchObject({ regionId: 'guanyun-court', geometry: { kind: 'peak' }, placeholder: true });
    expect(object('guanyun-small-pool')).toMatchObject({ regionId: 'guanyun-court', geometry: { kind: 'pond' } });
    expect(object('guanyun-peak')!.position[0]).toBeGreaterThan(object('central-pond')!.position[0]);
    expect(object('hanbi-shanfang')?.geometry.kind).toBe('building');
    expect(object('mingse-lou')?.geometry.kind).toBe('building');
    expect(SCENE_OBJECTS.filter(item => item.geometry.kind === 'corridor').length).toBeGreaterThanOrEqual(2);
  });
});

describe('已发现视觉缺陷的真实几何回归', () => {
  it('西山闭合岩体的表面朝外，不把背面显示成薄片', () => {
    const resources = createGarden();
    try {
      const mountain = resources.group.getObjectByName('west-mountain')!;
      let volume = 0;
      const a = new Vector3(), b = new Vector3(), c = new Vector3();
      mountain.traverse(object => {
        if (!(object instanceof Mesh)) return;
        const positions = object.geometry.getAttribute('position');
        for (let index = 0; index < positions.count; index += 3) {
          a.fromBufferAttribute(positions, index);
          b.fromBufferAttribute(positions, index + 1);
          c.fromBufferAttribute(positions, index + 2);
          volume += a.dot(b.cross(c)) / 6;
        }
      });
      expect(volume).toBeGreaterThan(0);
    } finally {
      resources.dispose();
    }
  });

  it('月洞中心光线真正穿透，侧边光线仍命中实体墙体', () => {
    const resources = createGarden();
    try {
      resources.group.updateMatrixWorld(true);
      const gate = resources.group.getObjectByName('moon-gate')!;
      expect(gate).toBeDefined();
      const gateX = SCENE_OBJECTS.find(object => object.id === 'moon-gate')!.position[0];
      const centerRay = new Raycaster(new Vector3(gateX, 1.45, 10), new Vector3(0, 0, -1));
      expect(centerRay.intersectObject(gate, true)).toHaveLength(0);
      const sideRay = new Raycaster(new Vector3(gateX + 2.2, 1.45, 10), new Vector3(0, 0, -1));
      expect(sideRay.intersectObject(gate, true).length).toBeGreaterThan(0);
    } finally {
      resources.dispose();
    }
  });

  it('大池中心最上方是水面，池岸的实体顶面不会把水遮住', () => {
    const resources = createGarden();
    try {
      resources.group.updateMatrixWorld(true);
      const pond = resources.group.getObjectByName('central-pond')!;
      expect(pond).toBeDefined();
      const ray = new Raycaster(new Vector3(-6, 10, -1), new Vector3(0, -1, 0));
      const hits = ray.intersectObject(pond, true);
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].object.name).toContain(':water');
    } finally {
      resources.dispose();
    }
  });
});

describe('四个正交观景点与视口边界', () => {
  it('固定 ID 完整且所有区域、焦点对象引用一致', () => {
    expect(VIEW_PRESETS.map(view => view.id)).toEqual(['overview', 'waterside', 'corridor', 'guanyun']);
    for (const view of VIEW_PRESETS) {
      expect(getViewPreset(view.id)).toBe(view);
      expect(REGION_IDS).toContain(view.regionId);
      expect(SCENE_OBJECTS.find(object => object.id === view.focusId)?.regionId).toBe(view.regionId);
      expect(view.label.length).toBeGreaterThan(0);
      expect(view.description.length).toBeGreaterThan(0);
      expect(view.position).toHaveLength(3);
      expect(view.target).toHaveLength(3);
      expect([...view.position, ...view.target].every(Number.isFinite)).toBe(true);
      expect(view.position).not.toEqual(view.target);
      expect(view.position[1]).toBeGreaterThan(view.target[1]);
      expect(view.verticalSpan).toBeGreaterThan(0);
      expect(view.horizontalSpan).toBeGreaterThan(0);
    }
  });

  it('俯仰限制不允许翻到底座下，缩放限制包括预设大小', () => {
    expect(CAMERA_LIMITS.minPolarAngle).toBeGreaterThan(0);
    expect(CAMERA_LIMITS.maxPolarAngle).toBeGreaterThan(CAMERA_LIMITS.minPolarAngle);
    expect(CAMERA_LIMITS.maxPolarAngle).toBeLessThan(Math.PI / 2);
    expect(CAMERA_LIMITS.minZoomRatio).toBeGreaterThan(0);
    expect(CAMERA_LIMITS.minZoomRatio).toBeLessThanOrEqual(1);
    expect(CAMERA_LIMITS.maxZoomRatio).toBeGreaterThanOrEqual(1);
  });

  it.each([[1440, 1000], [390, 844], [844, 390], [320, 568]])('在 %i×%i 视口内同时容纳水平与垂直范围', (width, height) => {
    for (const view of VIEW_PRESETS) {
      const zoom = getFittedZoom(width, height, view);
      expect(Number.isFinite(zoom)).toBe(true);
      expect(zoom).toBeGreaterThan(0);
      expect(zoom * getViewSpans(width, height, view).verticalSpan).toBeLessThanOrEqual(height + 0.0001);
      expect(zoom * getViewSpans(width, height, view).horizontalSpan).toBeLessThanOrEqual(width + 0.0001);
    }
  });

  it('窄屏重新适配且零尺寸初始化不会产生失效相机', () => {
    for (const view of VIEW_PRESETS) {
      expect(getFittedZoom(390, 844, view)).toBeLessThan(getFittedZoom(1440, 1000, view));
      expect(getFittedZoom(0, 0, view)).toBeGreaterThan(0);
      expect(Number.isFinite(getFittedZoom(0, 0, view))).toBe(true);
    }
  });
});

describe('手机近景保持主体可读，横屏恢复宽幅构图', () => {
  it('全园保持完整包络，窄屏近景使用更集中的视野', () => {
    const overview = getViewPreset('overview');
    expect(getViewSpans(390, 460, overview)).toEqual({ verticalSpan: overview.verticalSpan, horizontalSpan: overview.horizontalSpan });
    for (const view of VIEW_PRESETS.filter(view => view.id !== 'overview')) {
      expect(getFittedZoom(390, 460, view)).toBeGreaterThan(Math.min(460 / view.verticalSpan, 390 / view.horizontalSpan));
      const spans = getViewSpans(390, 460, view);
      expect(spans.verticalSpan).toBeGreaterThan(0);
      expect(spans.horizontalSpan).toBeGreaterThan(0);
    }
  });
  it('短横屏与桌面不采用竖屏局部裁切', () => {
    for (const view of VIEW_PRESETS) {
      const expected = { verticalSpan: view.verticalSpan, horizontalSpan: view.horizontalSpan };
      expect(getViewSpans(844, 240, view)).toEqual(expected);
      expect(getViewSpans(1280, 680, view)).toEqual(expected);
    }
  });
});
