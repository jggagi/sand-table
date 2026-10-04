import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_NAME, SCENE_OBJECTS, SCENE_SEED, type SceneObject, type Vec3 } from '../data/garden.layout';

type Surface = 'earth' | 'paving' | 'stone' | 'wall' | 'wood' | 'tile' | 'water' | 'leaf';
const COLORS: Record<Surface, string> = {
  earth: '#c8bda6', paving: '#d4cbb8', stone: '#818b85', wall: '#eee8db',
  wood: '#76614d', tile: '#444f51', water: '#6d928a', leaf: '#62765d',
};
type Materials = Record<Surface, THREE.MeshStandardMaterial>;
type Templates = { box: THREE.BoxGeometry; column: THREE.CylinderGeometry; leaves: THREE.BufferGeometry };

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function idSeed(id: string): number {
  let seed = SCENE_SEED;
  for (const letter of id) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return seed >>> 0;
}
function meshGeometry(vertices: number[], indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Each object keeps its identity while every material within it is one draw call. */
class Batch {
  private readonly parts = new Map<Surface, THREE.BufferGeometry[]>();
  constructor(private readonly resources: Templates, private readonly materials: Materials) {}
  add(source: THREE.BufferGeometry, surface: Surface, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0], tint?: string, owned = false): void {
    const copy = source.index ? source.toNonIndexed() : source.clone();
    copy.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    copy.deleteAttribute('uv');
    copy.deleteAttribute('uv1');
    const color = new THREE.Color(tint ?? COLORS[surface]);
    const wash = copy.getAttribute('color');
    const colors = new Float32Array(copy.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length / 3; index++) {
      colors[index * 3] = color.r * (wash?.getX(index) ?? 1);
      colors[index * 3 + 1] = color.g * (wash?.getY(index) ?? 1);
      colors[index * 3 + 2] = color.b * (wash?.getZ(index) ?? 1);
    }
    copy.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const parts = this.parts.get(surface) ?? [];
    parts.push(copy);
    this.parts.set(surface, parts);
    if (owned) source.dispose();
  }
  box(surface: Surface, size: Vec3, position: Vec3, tint?: string, rotation: Vec3 = [0, 0, 0]): void {
    this.add(this.resources.box, surface, position, size, rotation, tint);
  }
  rod(surface: Surface, from: Vec3, to: Vec3, radius: number, tint?: string): void {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const axis = b.clone().sub(a);
    const copy = this.resources.column.clone();
    copy.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()), new THREE.Vector3(radius, axis.length(), radius)));
    this.add(copy, surface, undefined, undefined, undefined, tint, true);
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [surface, parts] of this.parts) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      if (!geometry) throw new Error(`几何合批失败：${name}/${surface}`);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, this.materials[surface]);
      mesh.name = `${name}:${surface}`;
      mesh.castShadow = surface !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}
function roundedShape(width: number, depth: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape(), x = -width / 2, z = -depth / 2;
  shape.moveTo(x + radius, z);
  shape.lineTo(x + width - radius, z);
  shape.quadraticCurveTo(x + width, z, x + width, z + radius);
  shape.lineTo(x + width, z + depth - radius);
  shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
  shape.lineTo(x + radius, z + depth);
  shape.quadraticCurveTo(x, z + depth, x, z + depth - radius);
  shape.lineTo(x, z + radius);
  shape.quadraticCurveTo(x, z, x + radius, z);
  return shape;
}
function organicShape(points: readonly (readonly [number, number])[], scale = 1): THREE.Shape {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x * scale, -z * scale, 0)), true, 'catmullrom', 0.12);
  const samples = curve.getPoints(100);
  const shape = new THREE.Shape();
  shape.moveTo(samples[0].x, samples[0].y);
  for (let i = 1; i < samples.length; i++) shape.lineTo(samples[i].x, samples[i].y);
  shape.closePath();
  return shape;
}
function extrudeHorizontal(shape: THREE.Shape, thickness: number, bevel = 0): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 12 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Signed-distance union of deliberately unequal folds, not random stone balls. */
function carvedRockery(material: THREE.Material): THREE.BufferGeometry {
  const resolution = 66, width = 16.3, depth = 12.1, height = 7.0, yOffset = 2.75;
  const sculptor = new MarchingCubes(resolution, material, false, false, 65000);
  sculptor.isolation = 0;
  // Each long axis follows a different lean. The low shelves connect all crests.
  const folds: readonly (readonly [number, number, number, number, number, number, number])[] = [
    [-4.1, 1.0, -0.1, 3.05, 1.16, 3.28, -0.20],
    [-5.25, 2.05, -2.35, 1.65, 2.25, 2.12, -0.30],
    [-2.8, 1.66, -3.1, 3.25, 1.55, 1.48, 0.10],
    [-1.08, 1.9, -0.1, 1.86, 2.22, 3.12, 0.20],
    [1.74, 1.22, -0.88, 2.65, 1.48, 2.35, -0.18],
    [3.18, 2.0, -3.03, 1.38, 2.08, 1.78, 0.28],
    [-3.34, 1.19, 3.12, 3.05, 1.38, 1.42, -0.08],
    [-3.03, 2.34, -0.12, 1.66, 0.81, 2.46, -0.10],
    [0.32, 1.49, 2.64, 2.56, 1.58, 1.76, 0.26],
    [-0.36, 3.48, -1.79, 1.16, 1.14, 1.60, -0.34],
    [2.80, 0.63, 1.21, 1.65, 0.76, 2.20, 0.0],
  ];
  const hollows: readonly (readonly [number, number, number, number, number, number])[] = [
    [-5.72, 1.62, 0.65, 0.73, 0.96, 1.03],
    [2.78, 1.58, 1.78, 0.79, 0.85, 1.25],
    [-0.55, 3.5, -2.0, 0.65, 0.75, 0.84],
    [-1.93, 0.88, 3.70, 0.60, 0.74, 1.07],
  ];
  const blend = (a: number, b: number, softness: number) => {
    const t = Math.max(0, Math.min(1, 0.5 + 0.5 * (b - a) / softness));
    return b * (1 - t) + a * t - softness * t * (1 - t);
  };
  for (let zIndex = 0; zIndex < resolution; zIndex++) {
    const z = (zIndex / resolution - 0.5) * depth;
    for (let yIndex = 0; yIndex < resolution; yIndex++) {
      const y = (yIndex / resolution - 0.5) * height + yOffset;
      for (let xIndex = 0; xIndex < resolution; xIndex++) {
        const x = (xIndex / resolution - 0.5) * width;
        let distance = 100;
        for (const [cx, cy, cz, rx, ry, rz, lean] of folds) {
          const xx = x - cx - (y - cy) * lean;
          const ellipsoid = (Math.sqrt((xx / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2) - 1) * Math.min(rx, ry, rz);
          distance = blend(distance, ellipsoid, 0.28);
        }
        // Broad coherent striations plus a quiet, finer relief form the stone wash.
        let field = -distance + 0.125 * Math.sin(x * 4.5 + y * 2.2 + Math.sin(z * 2.8)) * Math.sin(z * 3.4 - y * 1.7)
          + 0.041 * Math.cos(x * 8.0 - z * 5.8 + y * 3.6);
        // Main opening is a true tunnel along the complete z axis, clear at x=-3/y=1.25.
        const mainCave = (Math.sqrt(((x + 3.0) / 1.02) ** 2 + ((y - 1.25) / 1.02) ** 2) - 1) * 1.02;
        field = Math.min(field, mainCave);
        // A transverse upper fissure and a second unequal lower portal add large negative spaces.
        const upperFissure = Math.max((Math.sqrt(((z + 0.60) / 0.77) ** 2 + ((y - 2.38) / 0.62) ** 2) - 1) * 0.62, -1.8 - x, x - 4.5);
        field = Math.min(field, upperFissure);
        const secondCave = (Math.sqrt(((x - 0.85) / 0.70) ** 2 + ((y - 0.85) / 0.71) ** 2) - 1) * 0.70;
        field = Math.min(field, secondCave, y - 0.12);
        for (const [cx, cy, cz, rx, ry, rz] of hollows) {
          const hollow = (Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2) - 1) * Math.min(rx, ry, rz);
          field = Math.min(field, hollow);
        }
        sculptor.field[zIndex * resolution * resolution + yIndex * resolution + xIndex] = field;
      }
    }
  }
  sculptor.update();
  if (sculptor.count >= sculptor.maxCount) throw new Error('假山雕刻超出有界网格预算');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(sculptor.positionArray.slice(0, sculptor.count * 3), 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(sculptor.normalArray.slice(0, sculptor.count * 3), 3));
  geometry.scale(width / 2, height / 2, depth / 2);
  geometry.translate(0, yOffset, 0);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const tone = 0.92 + Math.min(1, y / 5) * 0.08 + 0.04 * Math.sin(x * 2.8 + z * 2.3 + y * 4.0);
    colors.set([tone, tone * 1.015, tone * 0.982], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  sculptor.geometry.dispose();
  return geometry;
}

/** Closed rectangular curved roof, with upturned eaves and softly pinched ridge. */
function hipRoof(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const rings = 8, sides = 32;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const sx = 1 - t * 0.94, sz = 1 - t * 0.98;
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      const c = Math.cos(angle), s = Math.sin(angle), divisor = Math.max(Math.abs(c), Math.abs(s));
      const corner = (Math.min(Math.abs(c), Math.abs(s)) / divisor) ** 5;
      const y = rise * (1 - (1 - t) ** 0.68) + 0.16 * (1 - t) ** 5 + 0.12 * corner * (1 - t) ** 7;
      vertices.push(c / divisor * width / 2 * sx, y, s / divisor * depth / 2 * sz);
    }
  }
  for (let ring = 0; ring < rings; ring++) for (let side = 0; side < sides; side++) {
    const next = (side + 1) % sides, a = ring * sides + side, b = ring * sides + next;
    indices.push(a, a + sides, b, b, a + sides, b + sides);
  }
  for (let i = 1; i < sides - 1; i++) {
    indices.push(0, i, i + 1);
    const top = rings * sides;
    indices.push(top, top + i + 1, top + i);
  }
  return meshGeometry(vertices, indices);
}
function gableRoof(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const rows = 10, across = Math.max(8, Math.ceil(width * 2));
  for (let sign of [-1, 1]) {
    const start = vertices.length / 3;
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= across; col++) {
      const t = row / rows, x = (col / across - 0.5) * width;
      const y = rise * (1 - t ** 0.7) + 0.17 * t ** 6 + 0.06 * Math.abs(x * 2 / width) ** 7 * t ** 4;
      vertices.push(x, y, sign * t * depth / 2);
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < across; col++) {
      const a = start + row * (across + 1) + col, b = a + across + 1;
      if (sign > 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (const side of [-1, 1]) {
    const center = vertices.length / 3;
    vertices.push(side * width / 2, 0.08, 0);
    for (let row = -rows; row <= rows; row++) {
      const t = Math.abs(row / rows);
      vertices.push(side * width / 2, rise * (1 - t ** 0.7) + 0.17 * t ** 6 + 0.06 * t ** 4, row / rows * depth / 2);
    }
    for (let row = 0; row < rows * 2; row++) {
      if (side > 0) indices.push(center, center + row + 2, center + row + 1);
      else indices.push(center, center + row + 1, center + row + 2);
    }
  }
  // Solid underside closes the eave perimeter; all material remains FrontSide.
  const bottom = vertices.length / 3;
  vertices.push(-width / 2, 0.08, -depth / 2, width / 2, 0.08, -depth / 2, width / 2, 0.08, depth / 2, -width / 2, 0.08, depth / 2);
  indices.push(bottom, bottom + 1, bottom + 2, bottom, bottom + 2, bottom + 3);
  for (const sign of [-1, 1]) {
    const edge = vertices.length / 3;
    for (let col = 0; col <= across; col++) {
      const x = (col / across - 0.5) * width;
      vertices.push(x, 0.08, sign * depth / 2, x, 0.17 + 0.06 * Math.abs(x * 2 / width) ** 7, sign * depth / 2);
    }
    for (let col = 0; col < across; col++) {
      const a = edge + col * 2;
      if (sign < 0) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  return meshGeometry(vertices, indices);
}
function architecture(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  const p = object.geometry;
  if (p.kind !== 'building' && p.kind !== 'corridor') throw new Error('建筑配置错误');
  const width = p.kind === 'corridor' ? p.length : p.width, depth = p.kind === 'corridor' ? p.width : p.depth;
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  body.box('paving', [width + 0.24, 0.20, depth + 0.24], [0, 0.14, 0]);
  body.box('paving', [width + 0.48, 0.12, depth + 0.48], [0, 0.045, 0], '#b9ad97');
  const bays = Math.max(1, Math.ceil(width / 2.25));
  for (let bay = 0; bay <= bays; bay++) for (const sign of [-1, 1]) {
    const x = -width / 2 + 0.13 + bay / bays * (width - 0.26), z = sign * (depth / 2 - 0.13);
    body.rod('wood', [x, 0.25, z], [x, p.height, z], 0.07, '#7a5f48');
    body.add(templates.column, 'paving', [x, 0.27, z], [0.12, 0.19, 0.12]);
  }
  for (const sign of [-1, 1]) {
    body.box('wood', [width, 0.12, 0.1], [0, p.height - 0.08, sign * (depth / 2 - 0.1)]);
    if (p.kind === 'building') body.box('wood', [width - 0.2, 0.12, 0.12], [0, 0.78, sign * (depth / 2 - 0.12)]);
  }
  if (p.kind === 'building') {
    for (const side of [-1, 1]) {
      body.box('wood', [0.12, 0.12, depth - 0.2], [side * (width / 2 - 0.13), 0.78, 0]);
      body.box('wood', [0.13, 0.13, depth], [side * (width / 2 - 0.1), p.height - 0.08, 0]);
    }
    if (!p.open) body.box('wall', [width - 0.3, p.height - 0.4, 0.16], [0, p.height / 2 + 0.14, -depth / 2]);
    roof.add(hipRoof(width + 0.68, depth + 0.68, 0.83), 'tile', [0, p.height, 0], undefined, undefined, undefined, true);
    roof.rod('tile', [-width * 0.12, p.height + 0.87, 0], [width * 0.12, p.height + 0.87, 0], 0.055, '#3e4b48');
  } else {
    const rw = width + 0.46, rd = depth + 0.6, rise = 0.6;
    roof.add(gableRoof(rw, rd, rise), 'tile', [0, p.height, 0], undefined, undefined, undefined, true);
    roof.rod('tile', [-rw / 2, p.height + rise + 0.035, 0], [rw / 2, p.height + rise + 0.035, 0], 0.054);
    // Tile lines are baked into the single roof mesh, not one mesh per tile.
    for (let x = -rw / 2 + 0.16; x < rw / 2; x += 0.46) for (const side of [-1, 1]) {
      for (let segment = 0; segment < 5; segment++) {
        const a = segment / 5, b = (segment + 1) / 5;
        roof.rod('tile', [x, p.height + rise * (1 - a ** 0.7) + 0.17 * a ** 6 + 0.028, side * a * rd / 2], [x, p.height + rise * (1 - b ** 0.7) + 0.17 * b ** 6 + 0.028, side * b * rd / 2], 0.012, '#59655d');
      }
    }
  }
  const group = new THREE.Group(); group.name = object.id;
  group.add(body.finish('body'), roof.finish('roof'));
  return group;
}
function bridge(object: SceneObject, batch: Batch): void {
  const p = object.geometry; if (p.kind !== 'bridge') return;
  const surface: Surface = p.stone ? 'paving' : 'wood', pieces = p.stone ? 14 : 20;
  const heightAt = (t: number) => p.height + Math.sin(t * Math.PI) * p.rise;
  for (let i = 0; i < pieces; i++) {
    const t = (i + 0.5) / pieces;
    const tilt = Math.atan(Math.cos(t * Math.PI) * Math.PI * p.rise / p.length);
    batch.box(surface, [p.length / pieces + 0.03, p.stone ? 0.2 : 0.11, p.width], [(t - 0.5) * p.length, heightAt(t), 0], p.stone ? '#d1c8b4' : '#99836b', [0, 0, tilt]);
  }
  for (const side of [-1, 1]) {
    const z = side * (p.width / 2 - 0.045), segments = p.stone ? 6 : 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, x = (t - 0.5) * p.length, y = heightAt(t);
      batch.rod(surface, [x, y + 0.04, z], [x, y + 0.67, z], p.stone ? 0.055 : 0.035);
      if (i < segments) {
        const next = (i + 1) / segments;
        for (const level of [0.37, 0.67]) batch.rod(surface, [x, y + level, z], [(next - 0.5) * p.length, heightAt(next) + level, z], p.stone ? 0.038 : 0.025);
      }
    }
  }
  if (!p.stone) {
    // Both bridge feet visibly return to rocky shoulders.
    for (const side of [-1, 1]) {
      batch.rod('wood', [side * p.length / 2, p.height - 0.8, 0], [side * p.length / 2, p.height - 0.1, 0], 0.06);
      for (let step = 0; step < 4; step++) batch.box('paving', [0.36, 0.13, p.width], [side * (p.length / 2 + 0.16 + step * 0.29), p.height - 0.08 - step * 0.16, 0]);
    }
  }
}
function wall(object: SceneObject, batch: Batch): void {
  const p = object.geometry; if (p.kind !== 'wall') return;
  const shape = new THREE.Shape();
  shape.moveTo(-p.width / 2, 0.10); shape.lineTo(p.width / 2, 0.10); shape.lineTo(p.width / 2, p.height); shape.lineTo(-p.width / 2, p.height); shape.closePath();
  if (p.opening === 'moon') {
    const opening = new THREE.Path(); opening.absarc(0, 1.19, 1.05, 0, Math.PI * 2, true); shape.holes.push(opening);
  } else if (p.opening === 'lattice') {
    for (const x of [-1.55, 0, 1.55]) {
      const hole = new THREE.Path(); hole.moveTo(x - 0.46, 0.86); hole.lineTo(x - 0.46, 1.78); hole.lineTo(x + 0.46, 1.78); hole.lineTo(x + 0.46, 0.86); hole.closePath(); shape.holes.push(hole);
      for (const shift of [-0.3, 0, 0.3]) {
        batch.rod('tile', [x + shift, 0.87, 0], [x + shift, 1.77, 0], 0.018);
        batch.rod('tile', [x - 0.45, 1.32 + shift, 0], [x + 0.45, 1.32 + shift, 0], 0.018);
      }
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.23, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 1, curveSegments: 36 });
  geometry.translate(0, 0, -0.115);
  batch.add(geometry, 'wall', undefined, undefined, undefined, undefined, true);
  batch.box('paving', [p.width + 0.15, 0.16, 0.35], [0, 0.08, 0], '#b2aa98');
  batch.box('tile', [p.width + 0.2, 0.1, 0.43], [0, p.height + 0.07, 0]);
  batch.add(gableRoof(p.width + 0.16, 0.47, 0.14), 'tile', [0, p.height + 0.08, 0], undefined, undefined, undefined, true);
}
function pond(object: SceneObject, batch: Batch): void {
  const p = object.geometry; if (p.kind !== 'pond') return;
  const points: readonly (readonly [number, number])[] = [[-0.48, -0.25], [-0.27, -0.46], [0.1, -0.47], [0.44, -0.35], [0.49, -0.04], [0.44, 0.35], [0.16, 0.47], [-0.16, 0.43], [-0.47, 0.2]];
  const scaled = points.map(([x, z]) => [x * p.width, z * p.depth] as const);
  const rim = organicShape(scaled, 1.04), inner = organicShape(scaled, 0.98);
  const hole = new THREE.Path(inner.getPoints()); rim.holes.push(hole);
  batch.add(extrudeHorizontal(rim, 0.22, 0.025), 'paving', [0, 0.035, 0], undefined, undefined, '#bcb49f', true);
  const water = new THREE.ShapeGeometry(organicShape(scaled), 32); water.rotateX(-Math.PI / 2);
  batch.add(water, 'water', [0, 0.125, 0], undefined, undefined, undefined, true);
  // A few quiet marks suggest an ink wash without reflective or animated water.
  for (const [x, z, length] of [[-1.4, 1.5, 1.7], [1.0, -2.3, 1.2], [2.1, 0.1, 1.55]]) batch.box('water', [length, 0.008, 0.02], [x, 0.131, z], '#92aa99', [0, -0.09, 0]);
}
function foliageTemplate(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2), positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const wave = 1 + 0.045 * Math.sin(x * 7 + z * 4) * Math.cos(y * 6);
    positions.setXYZ(i, x * wave, y * wave, z * wave);
    const tint = 0.95 + y * 0.065 + 0.03 * Math.sin(x * 5 + z * 3);
    colors.set([tint, tint, tint], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}
function tree(object: SceneObject, batch: Batch, templates: Templates): void {
  const p = object.geometry; if (p.kind !== 'tree') return;
  const random = seededRandom(idSeed(object.id)), lean = p.lean ?? [0, 0];
  const path: Vec3[] = [[0, 0.13, 0], [-0.08, p.height * 0.28, 0.10], [lean[0] * 0.42, p.height * 0.58, lean[1] * 0.42], [lean[0], p.height * 0.87, lean[1]]];
  for (let i = 0; i < path.length - 1; i++) batch.rod('wood', path[i], path[i + 1], 0.16 - i * 0.034, '#7d725d');
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.18 + 0.25, height = p.height * (0.55 + i * 0.055), radius = p.canopy * (0.3 + random() * 0.08) * (1 - i * 0.047);
    const centre: Vec3 = [lean[0] * height / p.height + Math.cos(angle) * radius, height, lean[1] * height / p.height + Math.sin(angle) * radius];
    batch.rod('wood', [lean[0] * 0.5, height - 0.6, lean[1] * 0.5], centre, 0.045, '#7d725d');
    batch.add(templates.leaves, 'leaf', centre, [p.canopy * 0.35, p.canopy * (p.habit === 'pine' ? 0.14 : 0.27), p.canopy * 0.27], [0, angle, 0], i % 3 === 0 ? '#75826a' : '#5d745d');
  }
  batch.add(templates.leaves, 'leaf', [lean[0], p.height * 0.96, lean[1]], [p.canopy * 0.30, p.canopy * 0.16, p.canopy * 0.25]);
}
function bamboo(object: SceneObject, batch: Batch, templates: Templates): void {
  const p = object.geometry; if (p.kind !== 'bamboo') return;
  const random = seededRandom(idSeed(object.id));
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4, x = Math.cos(a) * p.spread * 0.35, z = Math.sin(a) * p.spread * 0.35, h = p.height * (0.76 + random() * 0.24);
    batch.rod('leaf', [x, 0.12, z], [x + Math.cos(a) * 0.19, h, z], 0.026, '#7a8864');
    for (let j = 0; j < 3; j++) batch.add(templates.leaves, 'leaf', [x + Math.cos(a) * 0.26, h * (0.65 + j * 0.12), z + Math.sin(a) * 0.22], [0.35, 0.09, 0.18], [0.15, a + j, 0.2]);
  }
}

export interface GardenResources { group: THREE.Group; dispose: () => void }
export function createGarden(): GardenResources {
  const materials = Object.fromEntries(Object.keys(COLORS).map(name => [name, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: name === 'water' ? 0.9 : 0.96, metalness: 0, side: THREE.FrontSide })])) as Materials;
  const templates: Templates = { box: new THREE.BoxGeometry(1, 1, 1), column: new THREE.CylinderGeometry(1, 1, 1, 8, 1, false), leaves: foliageTemplate() };
  const group = new THREE.Group(); group.name = SCENE_NAME;
  group.userData = { seed: SCENE_SEED, theme: '石境回转', artisticReconstruction: true };
  const objects: readonly SceneObject[] = [...SCENE_OBJECTS].sort((a, b) => Number(b.geometry.kind === 'court') - Number(a.geometry.kind === 'court'));
  for (const object of objects) {
    let child: THREE.Group;
    if (object.geometry.kind === 'building' || object.geometry.kind === 'corridor') child = architecture(object, templates, materials);
    else {
      const batch = new Batch(templates, materials), p = object.geometry;
      switch (p.kind) {
        case 'base': {
          const base = extrudeHorizontal(roundedShape(p.width, p.depth, 0.72), p.thickness, 0.05);
          batch.add(base, 'earth', [0, -p.thickness, 0], undefined, undefined, undefined, true);
          break;
        }
        case 'rockery': batch.add(carvedRockery(materials.stone), 'stone', undefined, undefined, undefined, undefined, true); break;
        case 'pond': pond(object, batch); break;
        case 'bridge': bridge(object, batch); break;
        case 'wall': wall(object, batch); break;
        case 'court': {
          batch.box('paving', [p.width, 0.06, p.depth], [0, 0.065, 0]);
          for (let x = -p.width / 2 + 0.7; x < p.width / 2; x += 0.85) batch.box('paving', [0.012, 0.008, p.depth - 0.05], [x, 0.10, 0], '#c1b8a5');
          break;
        }
        case 'tree': tree(object, batch, templates); break;
        case 'bamboo': bamboo(object, batch, templates); break;
      }
      child = batch.finish(object.id);
    }
    child.position.set(...object.position);
    if (object.rotation) child.rotation.set(...object.rotation);
    if (object.scale) child.scale.set(...object.scale);
    child.userData = { id: object.id, regionId: object.regionId, sourceId: object.sourceId, placeholder: object.placeholder };
    group.add(child);
  }
  // Construction templates are never attached to the returned scene.
  Object.values(templates).forEach(geometry => geometry.dispose());
  let disposed = false;
  return { group, dispose: () => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    group.traverse(node => { if (node instanceof THREE.Mesh) geometries.add(node.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    Object.values(materials).forEach(material => material.dispose());
  } };
}
