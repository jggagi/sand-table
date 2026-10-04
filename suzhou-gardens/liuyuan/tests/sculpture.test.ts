import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { createScholarRock } from '../src/scene/scholarRock';

describe('雕刻石峰的真实负空间与构建边界', () => {
  const height = 7.25;
  const seed = 917041732;

  it('三处孔洞真正贯穿石体，孔侧仍保留实体', () => {
    const geometry = createScholarRock(height, seed);
    const material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(true);
    const ray = (x: number, y: number) => new Raycaster(new Vector3(x * height, y * height, height), new Vector3(0, 0, -1));
    try {
      for (const [x, y] of [[-0.019, 0.345], [0.039, 0.566], [-0.024, 0.740]]) {
        expect(ray(x, y).intersectObject(mesh)).toHaveLength(0);
      }
      expect(ray(-0.085, 0.345).intersectObject(mesh).length).toBeGreaterThan(0);
    } finally {
      geometry.dispose();
      material.dispose();
    }
    for (const [companionHeight, companionSeed] of [[2.5, 1245520713], [2.9, 1909279819]]) {
      const companionGeometry = createScholarRock(companionHeight, companionSeed, true);
      const companionMaterial = new MeshBasicMaterial();
      const companionMesh = new Mesh(companionGeometry, companionMaterial);
      companionMesh.updateMatrixWorld(true);
      try {
        const through = new Raycaster(new Vector3(-0.044 * companionHeight, 0.315 * companionHeight, companionHeight), new Vector3(0, 0, -1));
        const solid = new Raycaster(new Vector3(0.080 * companionHeight, 0.315 * companionHeight, companionHeight), new Vector3(0, 0, -1));
        expect(through.intersectObject(companionMesh)).toHaveLength(0);
        expect(solid.intersectObject(companionMesh).length).toBeGreaterThan(0);
      } finally {
        companionGeometry.dispose();
        companionMaterial.dispose();
      }
    }
  });

  it('固定种子生成相同石体，法线有限，高度与三角预算有效', () => {
    const first = createScholarRock(height, seed);
    const second = createScholarRock(height, seed);
    const companion = createScholarRock(2.5, seed + 1, true);
    try {
      expect(first.getAttribute('position').array).toEqual(second.getAttribute('position').array);
      expect(first.getAttribute('position').count / 3).toBeLessThan(45000);
      expect(companion.getAttribute('position').count / 3).toBeLessThan(10000);
      for (const geometry of [first, companion]) {
        expect(Array.from(geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
        expect(Array.from(geometry.getAttribute('color').array).every(Number.isFinite)).toBe(true);
        expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 4);
      }
      expect(first.boundingBox!.max.y).toBeCloseTo(height, 4);
    } finally {
      first.dispose();
      second.dispose();
      companion.dispose();
    }
  });
});
