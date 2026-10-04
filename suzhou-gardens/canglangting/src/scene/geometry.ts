import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_NAME, SCENE_OBJECTS, SCENE_SEED, type SceneObject, type Vec3 } from '../data/garden.layout';

type MaterialId = 'base' | 'ground' | 'paving' | 'stone' | 'wood' | 'wall' | 'roof' | 'water' | 'leaf';
type Materials = Record<MaterialId, THREE.MeshStandardMaterial>;
type Point2 = readonly [number, number];
const COLOURS: Record<MaterialId, string> = {
  base: '#bfb29c', ground: '#b6b594', paving: '#d6ceba', stone: '#a4a38e',
  wood: '#6c5644', wall: '#f0ecdf', roof: '#535b55', water: '#789d91', leaf: '#627352',
};
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function objectSeed(id: string): number {
  let seed = SCENE_SEED;
  for (const letter of id) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return seed >>> 0;
}
function meshGeometry(vertices: number[], triangles: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return geometry;
}

interface Templates { box: THREE.BufferGeometry; foliage: THREE.BufferGeometry }
/** One mesh per material per semantic group; no per-frame geometry is generated. */
class Batch {
  private pieces = new Map<MaterialId, THREE.BufferGeometry[]>();
  constructor(private templates: Templates, private materials: Materials) {}
  add(source: THREE.BufferGeometry, material: MaterialId, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0], colour?: string, own = false): void {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('uv1');
    const tint = new THREE.Color(colour ?? COLOURS[material]);
    const oldColours = geometry.getAttribute('color');
    const colours = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colours.length / 3; i++) {
      colours[i * 3] = tint.r * (oldColours?.getX(i) ?? 1);
      colours[i * 3 + 1] = tint.g * (oldColours?.getY(i) ?? 1);
      colours[i * 3 + 2] = tint.b * (oldColours?.getZ(i) ?? 1);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const list = this.pieces.get(material) ?? [];
    list.push(geometry);
    this.pieces.set(material, list);
    if (own) source.dispose();
  }
  box(material: MaterialId, dimensions: Vec3, position: Vec3, colour?: string, rotation: Vec3 = [0, 0, 0]): void {
    this.add(this.templates.box, material, position, dimensions, rotation, colour);
  }
  branch(material: MaterialId, from: Vec3, to: Vec3, radius: number, tip = radius, colour?: string): void {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const delta = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(tip, radius, delta.length(), 7, 1, false);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    this.add(geometry, material, undefined, undefined, undefined, colour, true);
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, list] of this.pieces) {
      const merged = mergeGeometries(list, false);
      list.forEach(piece => piece.dispose());
      if (!merged) throw new Error(`Cannot batch ${name}/${material}`);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.materials[material]);
      mesh.name = `${name}:${material}`;
      mesh.castShadow = material !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.pieces.clear();
    return group;
  }
}
function shapeFrom(points: readonly Point2[]): THREE.Shape {
  const shape = new THREE.Shape();
  // Local XY becomes XZ after the common -PI/2 rotation.
  shape.moveTo(points[0][0], -points[0][1]);
  for (const [x, z] of points.slice(1)) shape.lineTo(x, -z);
  shape.closePath();
  return shape;
}
function roundedRectangle(width: number, depth: number, radius: number): THREE.Shape {
  const x = -width / 2, y = -depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}
function foliageTemplate(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const positions = geometry.getAttribute('position');
  const colours = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const ripple = 1 + 0.075 * Math.sin(x * 5 + z * 4) + 0.04 * Math.cos(y * 5 - z * 6);
    positions.setXYZ(i, x * ripple, y * ripple, z * ripple);
    const tone = 0.95 + 0.06 * y + 0.028 * Math.sin(x * 2 + z * 5);
    colours.set([tone, tone, tone], i * 3);
  }
  geometry.computeVertexNormals();
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

function roofGeometry(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const across = Math.max(8, Math.ceil(width * 2)), slope = 7;
  const profile = (fraction: number, x: number) => rise * (1 - Math.pow(fraction, 0.7)) + 0.15 * Math.pow(fraction, 5) + 0.11 * Math.pow(Math.abs(x * 2 / width), 6) * Math.pow(fraction, 3);
  for (const sign of [-1, 1]) {
    const offset = vertices.length / 3;
    for (let j = 0; j <= slope; j++) for (let i = 0; i <= across; i++) {
      const x = width * (i / across - 0.5), t = j / slope;
      vertices.push(x, profile(t, x), sign * t * depth / 2);
    }
    for (let j = 0; j < slope; j++) for (let i = 0; i < across; i++) {
      const a = offset + j * (across + 1) + i, b = a + across + 1;
      if (sign === 1) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (const sign of [-1, 1]) {
    const offset = vertices.length / 3;
    vertices.push(sign * width / 2, 0.02, 0);
    for (let i = -slope; i <= slope; i++) vertices.push(sign * width / 2, profile(Math.abs(i / slope), sign * width / 2), depth / 2 * i / slope);
    for (let i = 0; i < slope * 2; i++) {
      if (sign === 1) indices.push(offset, offset + i + 2, offset + i + 1);
      else indices.push(offset, offset + i + 1, offset + i + 2);
    }
  }
  return meshGeometry(vertices, indices);
}
function addRoof(batch: Batch, width: number, depth: number, eavesY: number, rise: number): void {
  batch.add(roofGeometry(width, depth, rise), 'roof', [0, eavesY, 0], undefined, undefined, undefined, true);
  batch.box('wood', [width - 0.14, 0.12, depth - 0.1], [0, eavesY + 0.015, 0], '#5b4c3e');
  batch.branch('roof', [-width / 2 - 0.05, eavesY + rise + 0.04, 0], [width / 2 + 0.05, eavesY + rise + 0.04, 0], 0.066, 0.066, '#677065');
  for (const sign of [-1, 1]) batch.branch('roof', [-width / 2, eavesY + 0.16, sign * depth / 2], [width / 2, eavesY + 0.16, sign * depth / 2], 0.065, 0.065, '#424c45');
  for (let x = -width / 2 + 0.2; x < width / 2; x += 0.45) for (const sign of [-1, 1]) {
    const points: Vec3[] = [];
    for (let i = 0; i <= 5; i++) {
      const f = i / 5;
      points.push([x, eavesY + rise * (1 - Math.pow(f, 0.7)) + 0.15 * Math.pow(f, 5) + 0.11 * Math.pow(Math.abs(x * 2 / width), 6) * Math.pow(f, 3) + 0.025, sign * f * depth / 2]);
    }
    for (let i = 0; i < points.length - 1; i++) batch.branch('roof', points[i], points[i + 1], 0.015, 0.015, '#697167');
  }
}
function architecturalGroup(id: string, body: Batch, roof: Batch): THREE.Group {
  const group = new THREE.Group();
  group.add(body.finish(`body-${id}`), roof.finish(`roof-${id}`));
  return group;
}
function building(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'building') throw new Error('Expected building');
  const { width, depth, height, open, pavilion } = object.geometry;
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  body.box('paving', [width + 0.6, 0.22, depth + 0.65], [0, 0.11, 0], '#bfb59e');
  body.box('paving', [width + 0.34, 0.08, depth + 0.38], [0, 0.25, 0]);
  const bays = pavilion ? 2 : 4;
  for (let i = 0; i <= bays; i++) {
    const x = width * (i / bays - 0.5);
    for (const z of [-depth / 2, depth / 2]) {
      if (pavilion && i === 1) continue;
      body.branch('wood', [x, 0.28, z], [x, height, z], 0.088, 0.074, '#735641');
      body.box('stone', [0.26, 0.2, 0.26], [x, 0.32, z], '#b3aa94');
    }
  }
  for (const z of [-depth / 2, depth / 2]) body.box('wood', [width + 0.16, 0.19, 0.17], [0, height - 0.07, z]);
  if (!open) {
    body.box('wall', [width, height - 0.28, 0.18], [0, height / 2 + 0.14, -depth / 2]);
    for (const side of [-1, 1]) body.box('wall', [0.18, height - 0.28, depth], [side * width / 2, height / 2 + 0.14, 0]);
    // Thin front panels and lattice bars enclose only part of each bay, leaving clear openings.
    for (let bay = 0; bay < bays; bay++) {
      const center = width * ((bay + 0.5) / bays - 0.5), bayWidth = width / bays - 0.19;
      body.box('wood', [bayWidth, 0.42, 0.085], [center, 0.54, depth / 2], '#8b7257');
      for (let bar = 0; bar < 4; bar++) body.box('wood', [0.04, 1.3, 0.05], [center + (bar / 3 - 0.5) * bayWidth, 1.43, depth / 2]);
      for (const y of [0.81, 1.42, 2.08]) body.box('wood', [bayWidth, 0.035, 0.05], [center, y, depth / 2]);
    }
    body.box('wood', [1.6, 0.34, 0.13], [0, height - 0.3, depth / 2 + 0.04], '#554535');
  } else {
    // An open pavilion: no opaque rear wall interrupts the hill-top view.
    for (const z of [-depth / 2, depth / 2]) {
      const gap = 1.1;
      for (const side of [-1, 1]) {
        const railWidth = (width - gap) / 2;
        body.box('wood', [railWidth, 0.07, 0.08], [side * (gap / 2 + railWidth / 2), 0.93, z], '#8a6c4e');
        body.box('wood', [0.05, 0.59, 0.07], [side * (gap / 2 + railWidth * 0.38), 0.63, z]);
      }
    }
    for (const x of [-width / 2, width / 2]) body.box('wood', [0.08, 0.07, depth], [x, 0.93, 0]);
  }
  addRoof(roof, width + 0.88, depth + 0.86, height, pavilion ? 1.0 : 0.92);
  for (let step = 0; step < 3; step++) body.box('paving', [pavilion ? 1.3 : width * 0.56, 0.08 * (3 - step), 0.28], [0, 0.04 * (3 - step), depth / 2 + 0.35 + step * 0.24]);
  return architecturalGroup(object.id, body, roof);
}

/** Alternating round/lozenge apertures are actual Shape holes, never dark painted panels. */
function perforatedWall(batch: Batch, length: number, height: number, bays: number, baySpacing: number, roundAlternating = true): void {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 0.13); shape.lineTo(length / 2, 0.13);
  shape.lineTo(length / 2, height); shape.lineTo(-length / 2, height); shape.closePath();
  for (let i = 0; i < bays; i++) {
    const x = (i - (bays - 1) / 2) * baySpacing, y = height * 0.57;
    const half = Math.min(0.66, baySpacing * 0.35), hole = new THREE.Path();
    if (roundAlternating && i % 2 === 0) hole.absarc(x, y, half, 0, Math.PI * 2, true);
    else {
      hole.moveTo(x, y - half); hole.lineTo(x - half, y); hole.lineTo(x, y + half); hole.lineTo(x + half, y); hole.closePath();
    }
    shape.holes.push(hole);
    const rim = new THREE.Shape();
    if (roundAlternating && i % 2 === 0) rim.absarc(x, y, half + 0.055, 0, Math.PI * 2, false);
    else {
      const outer = half + 0.075;
      rim.moveTo(x, y - outer); rim.lineTo(x + outer, y); rim.lineTo(x, y + outer); rim.lineTo(x - outer, y); rim.closePath();
    }
    rim.holes.push(hole.clone());
    batch.add(new THREE.ExtrudeGeometry(rim, { depth: 0.29, bevelEnabled: false, curveSegments: 18 }), 'stone', [0, 0, -0.145], undefined, undefined, '#b9b5a4', true);
    // Four delicate crossbars leave most of each aperture open to both landscapes.
    const barSize = half * 1.35;
    for (const offset of [-half * 0.3, half * 0.3]) {
      batch.box('wood', [0.028, barSize, 0.042], [x + offset, y, 0], '#81907a');
      batch.box('wood', [barSize, 0.028, 0.042], [x, y + offset, 0], '#81907a');
    }
  }
  batch.add(new THREE.ExtrudeGeometry(shape, { depth: 0.23, bevelEnabled: false, curveSegments: 18 }), 'wall', [0, 0, -0.115], undefined, undefined, undefined, true);
  batch.box('stone', [length, 0.14, 0.27], [0, 0.15, 0], '#b7af99');
}
function doubleCorridor(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'double-corridor') throw new Error('Expected double corridor');
  const { length, width, height, bays } = object.geometry;
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  body.box('paving', [length + 0.25, 0.18, width + 0.18], [0, 0.16, 0], '#d1c7b0');
  body.box('paving', [length + 0.3, 0.065, width + 0.25], [0, 0.032, 0], '#b5aa91');
  const bayWidth = length / bays;
  perforatedWall(body, length, height - 0.16, bays, bayWidth);
  for (let i = 0; i <= bays; i++) {
    const x = length * (i / bays - 0.5);
    for (const z of [-width / 2, width / 2]) {
      body.branch('wood', [x, 0.22, z], [x, height, z], 0.071, 0.065, '#725b46');
      body.box('paving', [0.2, 0.12, 0.2], [x, 0.3, z], '#bcb09a');
    }
  }
  for (let i = 0; i < bays; i++) {
    const x = length * ((i + 0.5) / bays - 0.5);
    for (const z of [-width / 2, width / 2]) {
      // Matching sparse rails on BOTH sides distinguish the two simultaneous views.
      body.box('wood', [bayWidth - 0.17, 0.07, 0.08], [x, 0.92, z], '#8a7053');
      for (const side of [-1, 1]) body.box('wood', [0.045, 0.58, 0.055], [x + side * bayWidth * 0.26, 0.61, z]);
    }
    body.box('wood', [0.085, 0.14, width], [x, height - 0.18, 0]);
  }
  for (const z of [-width / 2, width / 2]) body.box('wood', [length + 0.08, 0.18, 0.14], [0, height - 0.02, z]);
  addRoof(roof, length + 0.55, width + 0.48, height, 0.68);
  return architecturalGroup(object.id, body, roof);
}
function boundaryWall(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'wall') throw new Error('Expected wall');
  const { length, height } = object.geometry;
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  const bays = Math.max(1, Math.floor(length / 4));
  perforatedWall(body, length, height, bays, length / (bays + 1), false);
  addRoof(roof, length + 0.13, 0.5, height + 0.03, 0.22);
  return architecturalGroup(object.id, body, roof);
}

/** Broad, low earthwork, with a level summit and continuous upward-facing triangles. */
function hill(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'hill') return;
  const { width, depth, height } = object.geometry;
  const vertices: number[] = [0, height, 0], indices: number[] = [];
  const angular = 52, radial = 13;
  for (let ring = 1; ring <= radial; ring++) for (let side = 0; side < angular; side++) {
    const r = ring / radial, a = side * Math.PI * 2 / angular;
    const contour = 1 + 0.065 * Math.sin(a * 3 + 0.5) * r + 0.04 * Math.cos(a * 5 - 1.0) * r;
    const elevation = r < 0.32 ? height : height * Math.max(0, (1 - r * r) / (1 - 0.32 * 0.32));
    vertices.push(Math.cos(a) * width / 2 * r * contour, elevation + Math.sin(a * 4 + r * 6) * 0.055 * Math.sin(r * Math.PI), Math.sin(a) * depth / 2 * r * contour);
  }
  for (let side = 0; side < angular; side++) indices.push(0, 1 + (side + 1) % angular, 1 + side);
  for (let ring = 0; ring < radial - 1; ring++) for (let side = 0; side < angular; side++) {
    const a = 1 + ring * angular + side, b = 1 + ring * angular + (side + 1) % angular;
    const c = a + angular, d = b + angular;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = meshGeometry(vertices, indices);
  const colours = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length / 3; i++) {
    const shade = 0.91 + vertices[i * 3 + 1] / height * 0.07 + Math.sin(vertices[i * 3] * 0.6 + vertices[i * 3 + 2]) * 0.025;
    colours.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  batch.add(geometry, 'ground', [0, 0.025, 0], undefined, undefined, '#adb08b', true);
  // A summit terrace supports the open pavilion without a suspended slab.
  batch.box('stone', [4.32, 0.38, 4.12], [0, height - 0.16, 0], '#a8a48b');
}
function rock(object: SceneObject, batch: Batch, random: () => number): void {
  if (object.geometry.kind !== 'rock') return;
  const { width, depth, height } = object.geometry;
  // Stepped compact hill rocks, deliberately unlike a vertical scholar's peak.
  for (let piece = 0; piece < 3; piece++) {
    const vertices: number[] = [], triangles: number[] = [];
    const sides = 11, layers = 5, phase = random() * 6.28;
    const tall = height * (piece === 1 ? 1 : 0.68 + random() * 0.15);
    const broad = width * (piece === 1 ? 0.31 : 0.23), deep = depth * (piece === 1 ? 0.38 : 0.3);
    for (let layer = 0; layer < layers; layer++) {
      const t = layer / (layers - 1), radius = [1, 1.05, 0.81, 0.76, 0.24][layer];
      for (let side = 0; side < sides; side++) {
        const a = phase + side * Math.PI * 2 / sides, fold = 1 + 0.1 * Math.sin(a * 3 + layer * 0.7);
        vertices.push(Math.cos(a) * broad * radius * fold + t * 0.15, tall * t, Math.sin(a) * deep * radius * fold - t * 0.06);
      }
    }
    for (let layer = 0; layer < layers - 1; layer++) for (let side = 0; side < sides; side++) {
      const a = layer * sides + side, b = layer * sides + (side + 1) % sides;
      triangles.push(a, a + sides, b, b, a + sides, b + sides);
    }
    for (let side = 1; side < sides - 1; side++) {
      triangles.push(0, side, side + 1);
      const top = (layers - 1) * sides;
      triangles.push(top, top + side + 1, top + side);
    }
    const indexed = meshGeometry(vertices, triangles);
    const geometry = indexed.toNonIndexed();
    indexed.dispose();
    // Retain softened facets and normals pointing outwards; no DoubleSide patch.
    geometry.computeVertexNormals();
    batch.add(geometry, 'stone', [(piece - 1) * width * 0.24, 0, piece === 1 ? -depth * 0.12 : depth * 0.07], undefined, [0, piece * 0.5, 0], ['#a7a591', '#b4b19b', '#9fa18c'][piece], true);
  }
}

function river(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'river') return;
  const { width, depth, channelWidth } = object.geometry;
  const channel = channelWidth;
  const left = -width / 2 + 0.8, front = depth / 2 - 0.6;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(left, 0, -8.0), new THREE.Vector3(left - 0.28, 0, -4.0),
    new THREE.Vector3(left - 0.28, 0, 2.4), new THREE.Vector3(left + 0.65, 0, 7.65),
    new THREE.Vector3(-8.8, 0, front), new THREE.Vector3(-2.0, 0, front + 0.1),
    new THREE.Vector3(6.1, 0, front - 0.1), new THREE.Vector3(width / 2 - 0.4, 0, front - 0.65),
  ], false, 'centripetal');
  const outer: Point2[] = [], inner: Point2[] = [];
  const samples = 74;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples, p = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
    const normalX = -tangent.z, normalZ = tangent.x;
    const half = channel * (0.48 + 0.06 * Math.sin(t * Math.PI));
    outer.push([p.x - normalX * half, p.z - normalZ * half]);
    inner.push([p.x + normalX * half, p.z + normalZ * half]);
  }
  const shape = shapeFrom([...outer, ...inner.reverse()]);
  const water = new THREE.ShapeGeometry(shape);
  const positions = water.getAttribute('position'), colours = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const shade = 0.97 + Math.sin(positions.getX(i) * 0.11 + positions.getY(i) * 0.16) * 0.075;
    colours.set([shade, shade, shade], i * 3);
  }
  water.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  batch.add(water, 'water', [0, 0.065, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  // Narrow banks follow the same open river curve; they do not enclose an interior pool.
  for (const sign of [-1, 1]) {
    const edge: Point2[] = [], inset: Point2[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples, p = curve.getPoint(t), tangent = curve.getTangent(t).normalize();
      const nx = -tangent.z, nz = tangent.x;
      const h = channel * (0.48 + 0.06 * Math.sin(t * Math.PI));
      edge.push([p.x + nx * sign * (h + 0.115), p.z + nz * sign * (h + 0.115)]);
      inset.push([p.x + nx * sign * (h - 0.025), p.z + nz * sign * (h - 0.025)]);
    }
    const bank = shapeFrom([...edge, ...inset.reverse()]);
    batch.add(new THREE.ExtrudeGeometry(bank, { depth: 0.105, bevelEnabled: false }), 'stone', [0, 0.045, 0], undefined, [-Math.PI / 2, 0, 0], '#b5ae97', true);
  }
  for (let i = 0; i < 4; i++) batch.branch('water', [-4.5 + i * 1.9, 0.078, front + 0.2 + i * 0.07], [-3.1 + i * 1.9, 0.078, front + 0.21 + i * 0.07], 0.006, 0.006, '#a4bbac');
}

function tree(object: SceneObject, batch: Batch, templates: Templates, random: () => number): void {
  if (object.geometry.kind !== 'tree') return;
  const { height, canopy, habit, lean } = object.geometry;
  const pine = habit === 'pine', phase = random() * Math.PI * 2;
  const trunkAt = (t: number): Vec3 => [lean[0] * t * t + Math.cos(phase) * Math.sin(t * 5.2) * canopy * 0.045, height * t, lean[1] * t * t + Math.sin(phase) * Math.sin(t * 5.2) * canopy * 0.045];
  const joints = [0, 0.17, 0.36, 0.56, 0.73, 0.87, 0.97];
  for (let i = 0; i < joints.length - 1; i++) batch.branch('wood', trunkAt(joints[i]), trunkAt(joints[i + 1]), height * (0.028 - joints[i] * 0.023), height * (0.028 - joints[i + 1] * 0.023), '#7b6a51');
  for (let root = 0; root < 4; root++) {
    const a = phase + root * Math.PI / 2;
    batch.branch('wood', trunkAt(0.035), [Math.cos(a) * canopy * 0.11, 0.015, Math.sin(a) * canopy * 0.11], height * 0.014, height * 0.005, '#807159');
  }
  const dark = new THREE.Color(pine ? '#4d664e' : '#697e57'), light = new THREE.Color(pine ? '#7e8b65' : '#949b73');
  for (let branch = 0; branch < 6; branch++) {
    const level = 0.4 + branch * 0.09, angle = phase + branch * 2.38 + random() * 0.24;
    const reach = canopy * (0.35 - branch * 0.026) * (0.9 + random() * 0.2);
    const from = trunkAt(level - 0.07), tip: Vec3 = [from[0] + Math.cos(angle) * reach, height * (level + 0.045), from[2] + Math.sin(angle) * reach];
    const elbow: Vec3 = [(from[0] + tip[0]) * 0.5, height * (level - (pine ? 0.005 : 0.03)), (from[2] + tip[2]) * 0.5];
    batch.branch('wood', from, elbow, height * 0.013 * (1 - branch * 0.08), height * 0.007, '#7b6a51');
    batch.branch('wood', elbow, tip, height * 0.007, height * 0.002, '#7b6a51');
    // Flat unequal pine boughs versus asymmetric fuller deciduous clusters.
    for (let lobe = 0; lobe < 3; lobe++) {
      const side = (lobe - 1) * canopy * 0.13, radius = canopy * (0.2 - branch * 0.009) * (lobe === 1 ? 1 : 0.73);
      const center: Vec3 = [tip[0] - Math.sin(angle) * side + Math.cos(angle) * side * 0.3, tip[1] + (lobe - 1) * height * 0.024, tip[2] + Math.cos(angle) * side + Math.sin(angle) * side * 0.3];
      const colour = dark.clone().lerp(light, 0.18 + random() * 0.59).getStyle();
      batch.add(templates.foliage, 'leaf', center, [radius * 1.15, radius * (pine ? 0.4 : 0.84), radius * 0.8], [0.09 * (lobe - 1), -angle + 0.15 * lobe, pine ? 0.08 : 0.16], colour);
    }
  }
  const top = trunkAt(0.94), cap = canopy * 0.135;
  batch.add(templates.foliage, 'leaf', [top[0] + cap * 0.22, Math.min(height - cap * (pine ? 0.42 : 0.78), height * 0.97), top[2]], [cap * 1.15, cap * (pine ? 0.45 : 0.8), cap * 0.79], [0.07, phase, -0.08], light.getStyle());
}
function bamboo(object: SceneObject, batch: Batch, templates: Templates, random: () => number): void {
  if (object.geometry.kind !== 'bamboo') return;
  const { height, spread } = object.geometry;
  for (let stem = 0; stem < 6; stem++) {
    const x = (random() - 0.5) * spread, z = (random() - 0.5) * spread, top = height * (0.7 + random() * 0.3), drift = (random() - 0.5) * 0.42;
    batch.branch('wood', [x, 0, z], [x + drift, top, z], 0.024, 0.018, '#6f8054');
    for (let joint = 2; joint < 7; joint++) {
      const y = top * joint / 7, a = stem * 2.25 + joint;
      const to: Vec3 = [x + drift * joint / 7 + Math.cos(a) * 0.31, y + 0.12, z + Math.sin(a) * 0.31];
      batch.branch('wood', [x + drift * joint / 7, y, z], to, 0.011, 0.007, '#6f8054');
      batch.add(templates.foliage, 'leaf', to, [0.35, 0.035, 0.11], [0.12, -a, 0.18], joint % 2 ? '#70815a' : '#879163');
    }
  }
}
function court(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'court') return;
  const { width, depth } = object.geometry;
  batch.box('paving', [width, 0.055, depth], [0, 0.062, 0], '#dbd2bb');
  for (let x = -width / 2 + 0.75; x < width / 2; x += 1.2) batch.box('paving', [0.014, 0.005, depth - 0.12], [x, 0.092, 0], '#beb9a3');
  for (let z = -depth / 2 + 0.65; z < depth / 2; z += 1.05) batch.box('paving', [width - 0.1, 0.005, 0.014], [0, 0.092, z], '#beb9a3');
}
function path(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'path') return;
  const { width, depth, rise = 0, steps = 1 } = object.geometry;
  for (let i = 0; i < steps; i++) {
    const level = rise * (i + 1) / steps;
    batch.box('paving', [width, level + 0.09, depth / steps + 0.04], [0, (level + 0.09) / 2, depth / 2 - (i + 0.5) * depth / steps], i % 3 ? '#c9c1a9' : '#d4cbb3');
  }
}
function base(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'base') return;
  const { width, depth, thickness } = object.geometry;
  batch.add(new THREE.ExtrudeGeometry(roundedRectangle(width, depth, 0.58), { depth: thickness, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.08, bevelThickness: 0.05 }), 'base', [0, -thickness, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  batch.add(new THREE.ShapeGeometry(roundedRectangle(width - 0.08, depth - 0.08, 0.54)), 'ground', [0, 0.012, 0], undefined, [-Math.PI / 2, 0, 0], '#c4c1a4', true);
  batch.add(new THREE.ExtrudeGeometry(roundedRectangle(width + 0.04, depth + 0.04, 0.6), { depth: 0.09, bevelEnabled: false }), 'base', [0, -thickness - 0.09, 0], undefined, [-Math.PI / 2, 0, 0], '#a99b81', true);
  const woodlandBeds: readonly (readonly Point2[])[] = [
    [[-9.1, -9.1], [-3.8, -9.25], [-1.5, -6.4], [-4.2, -4.9], [-8.8, -5.1]],
    [[-1.3, -9.15], [6.3, -9.1], [7.15, -6.5], [4.5, -4.7], [1.3, -5.5]],
    [[10.8, -7.8], [13.15, -7.7], [13.25, -4.2], [11.7, -4.6]],
  ];
  for (const points of woodlandBeds) batch.add(new THREE.ShapeGeometry(shapeFrom(points)), 'leaf', [0, 0.028, 0], undefined, [-Math.PI / 2, 0, 0], '#8e9772', true);
  // Interior path to the hall meets the gallery while water stays beyond it.
  batch.box('paving', [7.7, 0.055, 1.05], [8.15, 0.04, 4.55], '#d4cbb3');
}

export interface GardenResources { group: THREE.Group; dispose: () => void }
export function createGarden(): GardenResources {
  const templates: Templates = { box: new THREE.BoxGeometry(1, 1, 1), foliage: foliageTemplate() };
  const materials = Object.fromEntries(Object.keys(COLOURS).map(name => [name, new THREE.MeshStandardMaterial({
    color: 'white', vertexColors: true, roughness: name === 'water' ? 0.68 : name === 'roof' ? 0.89 : 0.98,
    metalness: 0, side: name === 'roof' ? THREE.DoubleSide : THREE.FrontSide,
  })])) as Materials;
  const garden = new THREE.Group();
  garden.name = SCENE_NAME;
  for (const object of SCENE_OBJECTS as readonly SceneObject[]) {
    const batch = new Batch(templates, materials), random = seededRandom(objectSeed(object.id));
    let group: THREE.Group;
    switch (object.geometry.kind) {
      case 'building': group = building(object, templates, materials); break;
      case 'double-corridor': group = doubleCorridor(object, templates, materials); break;
      case 'wall': group = boundaryWall(object, templates, materials); break;
      case 'base': base(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'river': river(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'hill': hill(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'rock': rock(object, batch, random); group = batch.finish(`body-${object.id}`); break;
      case 'tree': tree(object, batch, templates, random); group = batch.finish(`body-${object.id}`); break;
      case 'bamboo': bamboo(object, batch, templates, random); group = batch.finish(`body-${object.id}`); break;
      case 'court': court(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'path': path(object, batch); group = batch.finish(`body-${object.id}`); break;
    }
    group.name = object.id;
    group.position.set(...object.position);
    if ('rotation' in object && object.rotation) group.rotation.set(...object.rotation);
    group.userData = { regionId: object.regionId, placeholder: object.placeholder, sourceId: 'sourceId' in object ? object.sourceId : undefined };
    garden.add(group);
  }
  Object.values(templates).forEach(geometry => geometry.dispose());
  let disposed = false;
  return {
    group: garden,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      garden.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      Object.values(materials).forEach(material => material.dispose());
      garden.clear();
    },
  };
}
