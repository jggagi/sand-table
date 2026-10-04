import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Box3, FrontSide, Matrix3, Mesh, Raycaster, Vector3, type Object3D } from 'three';
import { createGarden, type GardenResources } from '../src/scene/geometry';

describe('沧浪亭复廊与丘林真实几何', () => {
  let garden: GardenResources;

  beforeAll(() => {
    garden = createGarden();
    garden.group.updateMatrixWorld(true);
  });
  afterAll(() => garden.dispose());

  const object = (id: string): Object3D => {
    const found = garden.group.getObjectByName(id);
    if (!found) throw new Error(`场景缺少 ${id}`);
    return found;
  };

  it('复廊十个漏窗从水侧与园侧都可透视，窗间实体仍能命中', () => {
    const gallery = object('front-double-gallery');
    // The offset misses the sparse lattice crossbars inside the real apertures.
    // These are fixed sightlines from the asset audit, independent of the wall builder.
    for (let bay = 0; bay < 10; bay++) {
      const x = 0.05 + (bay - 4.5) * 2.17 + 0.25;
      for (const sign of [-1, 1]) {
        const ray = new Raycaster(new Vector3(x, 1.2768, 6.15 + sign * 4), new Vector3(0, 0, -sign));
        expect(ray.intersectObject(gallery, true), `漏窗 ${bay} 的 ${sign > 0 ? '水侧' : '园侧'}视线`).toHaveLength(0);
      }
    }
    // A completely missing wall must not satisfy the aperture regression.
    for (const sign of [-1, 1]) {
      const ray = new Raycaster(new Vector3(0.05, 1.2768, 6.15 + sign * 4), new Vector3(0, 0, -sign));
      const hits = ray.intersectObject(gallery, true);
      expect(hits.some(hit => hit.object.name.endsWith(':wall'))).toBe(true);
    }
  });

  it('六株坡树根部贴合实际丘面，不悬空或深埋', () => {
    const hill = object('wooded-earth-hill');
    const trees = [
      'hill-rear-leaning-pine', 'hill-west-bent-pine', 'hill-east-pine',
      'hill-front-slant-pine', 'wooded-north-understorey', 'wooded-slope-understorey',
    ];
    for (const id of trees) {
      const root = object(id).getWorldPosition(new Vector3());
      const ray = new Raycaster(new Vector3(root.x, 20, root.z), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(hill, true)[0];
      expect(hit, `${id} 下方必须有实际丘面`).toBeDefined();
      expect(Math.abs(root.y - hit.point.y), `${id} 的树根与丘面高度差`).toBeLessThan(0.035);
    }
  });

  it('四组丘石使用正向面，外侧射线先命中入面而非穿到背面', () => {
    const directions = [
      new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
      new Vector3(0, 0, 1), new Vector3(0, 0, -1), new Vector3(0, 1, 0),
    ];
    for (const id of ['western-hill-ledge', 'southern-hill-ledge', 'northern-weathered-stone', 'riverbank-low-stone']) {
      const rock = object(id);
      const center = new Box3().setFromObject(rock).getCenter(new Vector3());
      rock.traverse(child => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of materials) expect(material.side, `${id} 不能靠双面材质掩盖反向面`).toBe(FrontSide);
      });
      for (const direction of directions) {
        const ray = new Raycaster(center.clone().addScaledVector(direction, 20), direction.clone().negate());
        const hit = ray.intersectObject(rock, true)[0];
        expect(hit, `${id} 的外侧射线必须命中`).toBeDefined();
        expect(hit.distance, `${id} 必须在中心之前命中外表面`).toBeLessThan(20);
        expect(hit.face).not.toBeNull();
        const normal = hit.face!.normal.clone().applyNormalMatrix(new Matrix3().getNormalMatrix(hit.object.matrixWorld));
        expect(normal.dot(direction), `${id} 的命中面法线应朝向射线来源`).toBeGreaterThan(0);
      }
    }
  });
});
