import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_OBJECTS, SCENE_SEED, type SceneObject, type Vec3 } from '../data/liuyuan.layout';
import { createScholarRock } from './scholarRock';
import { createTreePose } from './treePose';

type MaterialName = 'base' | 'paving' | 'stone' | 'wood' | 'wall' | 'roof' | 'water' | 'leaf';
type Ring = readonly [number, number, number, number, number];

const PALETTE: Record<MaterialName, string> = {
  base: '#c9bda8', paving: '#ddd3bf', stone: '#aaa99a', wood: '#675143',
  wall: '#eee8da', roof: '#454e4c', water: '#638b83', leaf: '#556b55',
};

/** Small deterministic PRNG, used only while constructing the immutable scene. */
export function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(id: string): number {
  let value = SCENE_SEED;
  for (const character of id) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

function geometryFrom(vertices: number[], indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Unequal weathered ledges, with coherent folds rather than independent vertex noise. */
function rockGeometry(rings: readonly Ring[], random: () => number, sides = 11): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const phase = random() * Math.PI;
  const centres = new THREE.CatmullRomCurve3(rings.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');
  const radii = new THREE.CatmullRomCurve3(rings.map(([, , , x, z]) => new THREE.Vector3(x, z, 0)), false, 'centripetal');
  const sections = rings.length * 3;
  for (let ringIndex = 0; ringIndex <= sections; ringIndex++) {
    const t = ringIndex / sections;
    const centre = centres.getPoint(t);
    const radius = radii.getPoint(t);
    for (let side = 0; side < sides; side++) {
      const angle = phase + (side / sides) * Math.PI * 2;
      const fluctuation = 0.96 + 0.075 * Math.sin(angle * 2 + phase) + 0.045 * Math.cos(angle * 3 + t * 5);
      const fold = Math.sin(t * Math.PI) * Math.sin(angle * 2 + phase) * 0.06;
      vertices.push(centre.x + Math.cos(angle) * radius.x * fluctuation, Math.max(0, centre.y + fold), centre.z + Math.sin(angle) * radius.y * fluctuation);
    }
  }
  for (let ring = 0; ring < sections; ring++) {
    for (let side = 0; side < sides; side++) {
      const current = ring * sides + side;
      const next = ring * sides + (side + 1) % sides;
      indices.push(current, current + sides, next, next, current + sides, next + sides);
    }
  }
  for (let side = 1; side < sides - 1; side++) {
    indices.push(0, side, side + 1);
    const top = sections * sides;
    indices.push(top, top + side + 1, top + side);
  }
  const smooth = geometryFrom(vertices, indices);
  const geometry = smooth.toNonIndexed();
  const softNormals = geometry.getAttribute('normal').clone();
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  const normal = new THREE.Vector3();
  for (let index = 0; index < normals.count; index++) {
    normal.set(normals.getX(index) * 0.55 + softNormals.getX(index) * 0.45,
      normals.getY(index) * 0.55 + softNormals.getY(index) * 0.45,
      normals.getZ(index) * 0.55 + softNormals.getZ(index) * 0.45).normalize();
    normals.setXYZ(index, normal.x, normal.y, normal.z);
  }
  smooth.dispose();
  return geometry;
}

function roofGeometry(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];
  const across = Math.max(8, Math.ceil(width * 2));
  const slope = 10;
  for (let face = 0; face < 2; face++) {
    const sign = face ? -1 : 1;
    const offset = vertices.length / 3;
    for (let zIndex = 0; zIndex <= slope; zIndex++) {
      const fraction = zIndex / slope;
      for (let xIndex = 0; xIndex <= across; xIndex++) {
        const x = (xIndex / across - 0.5) * width;
        const y = rise * (1 - Math.pow(fraction, 0.68)) + 0.17 * Math.pow(fraction, 5) + 0.12 * Math.pow(Math.abs(x * 2 / width), 8) * Math.pow(fraction, 3);
        vertices.push(x, y, sign * fraction * depth / 2);
      }
    }
    for (let zIndex = 0; zIndex < slope; zIndex++) {
      for (let xIndex = 0; xIndex < across; xIndex++) {
        const a = offset + zIndex * (across + 1) + xIndex;
        const b = a + across + 1;
        if (sign > 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  // Close both gables with the same curved profile. The silhouette has real depth.
  for (const side of [-1, 1]) {
    const offset = vertices.length / 3;
    vertices.push(side * width / 2, 0.04, 0);
    for (let part = -slope; part <= slope; part++) {
      const fraction = Math.abs(part / slope);
      vertices.push(side * width / 2, rise * (1 - Math.pow(fraction, 0.68)) + 0.17 * Math.pow(fraction, 5) + 0.12 * Math.pow(fraction, 3), part / slope * depth / 2);
    }
    for (let part = 0; part < slope * 2; part++) {
      if (side > 0) indices.push(offset, offset + part + 2, offset + part + 1);
      else indices.push(offset, offset + part + 1, offset + part + 2);
    }
  }
  return geometryFrom(vertices, indices);
}

function smoothShape(points: readonly (readonly [number, number])[]): THREE.Shape {
  const path = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, -z, 0)), true, 'catmullrom', 0.22);
  const samples = path.getPoints(points.length * 9);
  const shape = new THREE.Shape();
  shape.moveTo(samples[0].x, samples[0].y);
  samples.slice(1).forEach((sample) => shape.lineTo(sample.x, sample.y));
  shape.closePath();
  return shape;
}

function roundedRectangle(width: number, depth: number, radius = 0.4): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
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

class Batch {
  private parts = new Map<MaterialName, THREE.BufferGeometry[]>();
  constructor(private templates: Templates, private materials: Record<MaterialName, THREE.MeshStandardMaterial>) {}

  add(source: THREE.BufferGeometry, material: MaterialName, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0], color?: string, ownSource = false) {
    const geometry = source.index ? source.toNonIndexed() : source.clone();
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    geometry.applyMatrix4(matrix);
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('uv1');
    const shade = new THREE.Color(color ?? PALETTE[material]);
    const sourceColors = geometry.getAttribute('color');
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let vertex = 0; vertex < colors.length; vertex += 3) {
      const index = vertex / 3;
      colors[vertex] = shade.r * (sourceColors?.getX(index) ?? 1);
      colors[vertex + 1] = shade.g * (sourceColors?.getY(index) ?? 1);
      colors[vertex + 2] = shade.b * (sourceColors?.getZ(index) ?? 1);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const parts = this.parts.get(material) ?? [];
    parts.push(geometry);
    this.parts.set(material, parts);
    if (ownSource) source.dispose();
  }

  box(material: MaterialName, size: Vec3, position: Vec3, color?: string, rotation: Vec3 = [0, 0, 0]) {
    this.add(this.templates.box, material, position, size, rotation, color);
  }

  beam(material: MaterialName, from: Vec3, to: Vec3, radius: number, color?: string) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const matrix = new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), new THREE.Vector3(radius, direction.length(), radius));
    const geometry = this.templates.cylinder.clone().applyMatrix4(matrix);
    this.add(geometry, material, undefined, undefined, undefined, color, true);
  }

  taperedBranch(from: Vec3, to: Vec3, radiusStart: number, radiusEnd: number) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radiusEnd, radiusStart, direction.length(), 8, 1);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    this.add(geometry, 'wood', undefined, undefined, undefined, '#796752', true);
  }

  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    this.parts.forEach((parts, material) => {
      const geometry = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!geometry) throw new Error(`无法合并场景几何：${name}/${material}`);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, this.materials[material]);
      mesh.name = `${name}:${material}`;
      mesh.castShadow = material !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    this.parts.clear();
    return group;
  }
}

interface Templates {
  box: THREE.BoxGeometry;
  cylinder: THREE.CylinderGeometry;
  foliage: THREE.BufferGeometry;
}

/** Shared hand-shaped leaf mass: subtle lobes, smooth normals and a soft tonal wash. */
function foliageGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index), y = position.getY(index), z = position.getZ(index);
    const lobe = 1 + 0.055 * Math.sin(x * 6 + z * 3) + 0.04 * Math.cos(z * 7 - y * 4);
    position.setXYZ(index, x * lobe, y * lobe, z * lobe);
    const tone = 0.95 + y * 0.06 + 0.025 * Math.sin(x * 4 + z * 3);
    colors.set([tone, tone, tone], index * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function roof(batch: Batch, width: number, depth: number, y: number, rise: number, positionZ = 0) {
  batch.add(roofGeometry(width, depth, rise), 'roof', [0, y, positionZ], undefined, undefined, undefined, true);
  batch.box('wood', [width - 0.2, 0.16, depth - 0.1], [0, y + 0.035, positionZ], '#544739');
  batch.beam('roof', [-width / 2 - 0.1, y + rise + 0.04, positionZ], [width / 2 + 0.1, y + rise + 0.04, positionZ], 0.085, '#505b56');
  for (const sign of [-1, 1]) {
    batch.beam('roof', [-width / 2, y + 0.2, positionZ + sign * depth / 2], [width / 2, y + 0.2, positionZ + sign * depth / 2], 0.085, '#333c3b');
  }
  // Thin baked ribs give readable tile rhythm without thousands of draw calls.
  for (let x = -width / 2 + 0.15; x < width / 2; x += 0.4) {
    for (const sign of [-1, 1]) {
      const line: Vec3[] = [];
      for (let sample = 0; sample <= 6; sample++) {
        const fraction = sample / 6;
        line.push([x, y + rise * (1 - Math.pow(fraction, 0.68)) + 0.17 * Math.pow(fraction, 5) + 0.12 * Math.pow(Math.abs(x * 2 / width), 8) * Math.pow(fraction, 3) + 0.026, positionZ + sign * fraction * depth / 2]);
      }
      for (let sample = 0; sample < line.length - 1; sample++) batch.beam('roof', line[sample], line[sample + 1], 0.018, '#505953');
    }
  }
}

function building(object: SceneObject, templates: Templates, materials: Record<MaterialName, THREE.MeshStandardMaterial>): THREE.Group {
  if (object.geometry.kind !== 'building' && object.geometry.kind !== 'corridor') throw new Error('建筑参数不匹配');
  const parameters = object.geometry;
  const width = parameters.kind === 'corridor' ? parameters.length : parameters.width;
  const depth = parameters.kind === 'corridor' ? parameters.width : parameters.depth;
  const height = parameters.height;
  const open = parameters.kind === 'corridor' || parameters.open;
  const upper = parameters.kind === 'building' && parameters.upperFloor;
  const body = new Batch(templates, materials);
  const tops = new Batch(templates, materials);
  body.box('paving', [width + 0.48, 0.2, depth + 0.48], [0, 0.1, 0]);
  body.box('paving', [width + 0.7, 0.1, depth + 0.7], [0, 0.03, 0], '#baad96');
  body.box('wood', [width, 0.13, depth], [0, 0.25, 0], '#967960');
  if (!open) {
    // Enclosed rear wall and gables leave every front bay genuinely open.
    body.box('wall', [width, height - 0.35, 0.16], [0, height / 2 + 0.2, -depth / 2 + 0.07]);
    for (const side of [-1, 1]) {
      const wallX = side * (width / 2 - 0.04);
      body.box('wall', [0.16, height - 0.3, depth * 0.32], [wallX, height / 2 + 0.2, -depth * 0.32]);
      body.box('wall', [0.16, 0.65, depth * 0.68], [wallX, 0.52, depth * 0.18]);
      body.box('wall', [0.16, 0.48, depth * 0.68], [wallX, height - 0.05, depth * 0.18]);
    }
  } else if (parameters.kind === 'building') {
    body.box('wall', [width, 1.2, 0.13], [0, 0.85, -depth / 2 + 0.03]);
  }
  const bays = Math.max(2, Math.round(width / (parameters.kind === 'corridor' ? 1.9 : 1.65)));
  for (let bay = 0; bay <= bays; bay++) {
    const x = -width / 2 + width * bay / bays;
    for (const z of [-depth / 2, depth / 2]) {
      body.box('wood', [0.14, height - 0.13, 0.14], [x, height / 2 + 0.22, z]);
      body.box('paving', [0.25, 0.22, 0.25], [x, 0.25, z], '#afa18a');
    }
  }
  body.box('wood', [width + 0.15, 0.22, 0.18], [0, height - 0.04, depth / 2]);
  body.box('wood', [width + 0.15, 0.22, 0.18], [0, height - 0.04, -depth / 2]);
  for (let bay = 0; bay < bays; bay++) {
    const centerX = -width / 2 + width * (bay + 0.5) / bays;
    const bayWidth = width / bays - 0.22;
    if (!open) {
      body.box('wood', [bayWidth, 0.53, 0.08], [centerX, 0.61, depth / 2], '#87684d');
      const baseY = upper ? 3 : 1.25;
      const topY = upper ? height - 0.2 : height - 0.45;
      // Delicate lattice bars surround clear, empty apertures.
      for (let pane = 0; pane < 4; pane++) {
        const paneX = centerX + (pane / 3 - 0.5) * bayWidth;
        body.box('wood', [0.045, topY - baseY, 0.07], [paneX, (baseY + topY) / 2, depth / 2]);
      }
      for (let row = 0; row < 3; row++) body.box('wood', [bayWidth, 0.035, 0.07], [centerX, baseY + (topY - baseY) * row / 2, depth / 2]);
      if (upper) {
        body.box('wood', [bayWidth, 0.45, 0.08], [centerX, 2.99, depth / 2], '#84654b');
        for (let baluster = 0; baluster < 6; baluster++) body.box('wood', [0.04, 0.62, 0.055], [centerX + (baluster / 5 - 0.5) * bayWidth, 3.48, depth / 2 + 0.17]);
        body.box('wood', [bayWidth, 0.075, 0.12], [centerX, 3.83, depth / 2 + 0.17]);
      }
    } else {
      for (const z of [-depth / 2, depth / 2]) {
        if (parameters.kind === 'corridor' && bay % 3 === 1 && z > 0) continue;
        body.box('wood', [bayWidth, 0.09, 0.09], [centerX, 0.95, z], '#785d45');
        for (const side of [-1, 1]) body.box('wood', [0.055, 0.62, 0.06], [centerX + side * bayWidth * 0.28, 0.6, z]);
      }
    }
    body.box('wood', [0.08, 0.16, depth], [centerX, height - 0.24, 0]);
  }
  const rise = parameters.kind === 'corridor' ? 0.74 : depth * 0.29;
  roof(tops, width + 0.68, depth + 0.72, height, rise);
  if (upper) {
    body.box('wood', [width, 0.18, depth], [0, 2.8, 0], '#6b5140');
    roof(tops, width + 0.65, depth + 0.7, 2.66, 0.54);
  }
  if (parameters.kind === 'building' && !parameters.open) {
    for (let stair = 0; stair < 3; stair++) body.box('paving', [width * 0.58, 0.075 * (3 - stair), 0.28], [0, 0.0375 * (3 - stair), depth / 2 + 0.27 + stair * 0.24]);
  }
  const group = new THREE.Group();
  group.add(body.finish(`body-${object.id}`), tops.finish(`roof-${object.id}`));
  return group;
}

function wall(object: SceneObject, templates: Templates, materials: Record<MaterialName, THREE.MeshStandardMaterial>): THREE.Group {
  if (object.geometry.kind !== 'wall') throw new Error('墙体参数不匹配');
  const { width, height, opening } = object.geometry;
  const body = new Batch(templates, materials);
  const tops = new Batch(templates, materials);
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0.06);
  shape.lineTo(width / 2, 0.06);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  if (opening === 'moon') {
    const hole = new THREE.Path();
    hole.absarc(0, 1.45, 1.28, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const rim = new THREE.Shape();
    rim.absarc(0, 1.45, 1.41, 0, Math.PI * 2, false);
    const inner = new THREE.Path();
    inner.absarc(0, 1.45, 1.28, 0, Math.PI * 2, true);
    rim.holes.push(inner);
    body.add(new THREE.ExtrudeGeometry(rim, { depth: 0.36, bevelEnabled: false, curveSegments: 48 }), 'paving', [0, 0, -0.19], undefined, undefined, '#b5afa0', true);
    body.box('paving', [2.58, 0.12, 0.72], [0, 0.065, 0], '#b9ac97');
  } else {
    const number = Math.max(1, Math.floor(width / 3.1));
    for (let openingIndex = 0; openingIndex < number; openingIndex++) {
      const center = (openingIndex - (number - 1) / 2) * 3.05;
      const hole = new THREE.Path();
      hole.moveTo(center - 0.84, 0.87);
      hole.lineTo(center - 0.84, 1.99);
      hole.lineTo(center + 0.84, 1.99);
      hole.lineTo(center + 0.84, 0.87);
      hole.closePath();
      shape.holes.push(hole);
      for (const x of [-0.9, 0.9]) body.box('stone', [0.09, 1.24, 0.3], [center + x, 1.43, 0], '#9ca394');
      for (const y of [0.82, 2.04]) body.box('stone', [1.87, 0.09, 0.3], [center, y, 0], '#9ca394');
      for (let bar = -2; bar <= 2; bar++) {
        body.box('wood', [0.035, 1.08, 0.05], [center + bar * 0.29, 1.43, 0], '#7a7865');
        body.box('wood', [1.65, 0.035, 0.05], [center, 1.43 + bar * 0.18, 0], '#7a7865');
      }
    }
  }
  body.add(new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false, curveSegments: 48 }), 'wall', [0, 0, -0.12], undefined, undefined, undefined, true);
  body.box('paving', [width + 0.08, 0.13, 0.31], [0, 0.065, 0], '#b7aa95');
  roof(tops, width + 0.18, 0.65, height + 0.04, 0.25);
  const group = new THREE.Group();
  group.add(body.finish(`body-${object.id}`), tops.finish(`roof-${object.id}`));
  return group;
}

function tree(object: SceneObject, batch: Batch, templates: Templates) {
  if (object.geometry.kind !== 'tree') return;
  const { height, canopy, habit, lean } = object.geometry;
  const pose = createTreePose({ height, canopy, habit, lean, seed: seedFor(object.id) });
  pose.branches.forEach(branch => batch.taperedBranch(branch.from, branch.to, branch.radiusStart, branch.radiusEnd));
  const dark = new THREE.Color(habit === 'pine' ? '#475e4a' : '#637657');
  const light = new THREE.Color(habit === 'pine' ? '#738264' : '#8b9470');
  pose.foliage.forEach(cluster => {
    const colour = dark.clone().lerp(light, cluster.tone).getStyle();
    batch.add(templates.foliage, 'leaf', cluster.position, cluster.scale, cluster.rotation, colour);
  });
}

function bamboo(object: SceneObject, batch: Batch, templates: Templates, random: () => number) {
  if (object.geometry.kind !== 'bamboo') return;
  const { height, spread } = object.geometry;
  for (let stem = 0; stem < 9; stem++) {
    const x = (random() - 0.5) * spread;
    const z = (random() - 0.5) * spread;
    const top = height * (0.65 + random() * 0.35);
    const drift = (random() - 0.5) * 0.5;
    batch.beam('wood', [x, 0, z], [x + drift, top, z + drift * 0.4], 0.026, '#71805a');
    for (let joint = 1; joint < 7; joint++) {
      const y = top * joint / 7;
      const angle = stem * 2 + joint;
      const leafPosition: Vec3 = [x + drift * y / top + Math.cos(angle) * 0.29, y + 0.08, z + Math.sin(angle) * 0.29];
      batch.beam('wood', [x + drift * y / top, y, z], leafPosition, 0.015, '#617450');
      batch.add(templates.foliage, 'leaf', leafPosition, [0.36, 0.045, 0.13], [0, -angle, 0.18], joint % 2 ? '#61754e' : '#7b8956');
    }
  }
}

function pond(object: SceneObject, batch: Batch) {
  if (object.geometry.kind !== 'pond') return;
  const { width, depth } = object.geometry;
  const main = object.id === 'central-pond';
  const points: readonly (readonly [number, number])[] = main
    ? [[-0.46, -0.26], [-0.35, -0.45], [-0.08, -0.5], [0.23, -0.39], [0.46, -0.1], [0.37, 0.2], [0.2, 0.43], [-0.1, 0.47], [-0.37, 0.3], [-0.5, 0.04]]
    : [[-0.49, -0.09], [-0.26, -0.44], [0.16, -0.4], [0.48, -0.03], [0.3, 0.41], [-0.15, 0.46]];
  const shape = smoothShape(points.map(([x, z]) => [x * width, z * depth]));
  const rim = shape.clone();
  const insetPoints = shape.getPoints().map((point) => point.multiplyScalar(main ? 0.958 : 0.918)).reverse();
  const inset = new THREE.Path(insetPoints);
  inset.closePath();
  rim.holes.push(inset);
  // The bank is an actual annulus. Its empty centre never occludes the water.
  const outline = new THREE.ExtrudeGeometry(rim, { depth: 0.12, bevelEnabled: false, steps: 1 });
  batch.add(outline, 'stone', [0, 0.03, 0], undefined, [-Math.PI / 2, 0, 0], '#a89f86', true);
  const waterScale = main ? 0.96 : 0.92;
  // The water surface carries a continuous mineral-green colour wash.
  // It remains still: no animated reflection or repeated per-frame construction.
  const water = new THREE.ShapeGeometry(shape, 36);
  const vertices = water.getAttribute('position');
  const waterColors = new Float32Array(vertices.count * 3);
  for (let index = 0; index < vertices.count; index++) {
    const x = vertices.getX(index) / width;
    const z = vertices.getY(index) / depth;
    const tone = 0.94 + 0.1 * Math.sin(x * 3 + z * 1.8) + 0.035 * Math.cos(z * 4);
    waterColors.set([tone, tone, tone], index * 3);
  }
  water.setAttribute('color', new THREE.BufferAttribute(waterColors, 3));
  batch.add(water, 'water', [0, 0.141, 0], [waterScale, waterScale, 1], [-Math.PI / 2, 0, 0], undefined, true);
  if (main) {
    for (let line = 0; line < 4; line++) {
      const z = -0.85 + line * 0.57;
      batch.beam('water', [-1.25 + line * 0.22, 0.153, z], [0.35 + line * 0.14, 0.153, z + 0.025], 0.008, '#8ba69a');
    }
  }
}

function mountain(object: SceneObject, batch: Batch, random: () => number) {
  if (object.geometry.kind !== 'mountain') return;
  const { width, depth, height } = object.geometry;
  const pieces: readonly (readonly [number, number, number, number])[] = [[-0.2, 0, 0.02, 0.68], [0.14, 0, -0.12, 0.92], [-0.03, 0, 0.23, 0.5], [0.37, 0, 0.09, 0.45], [-0.39, 0, -0.21, 0.48]];
  pieces.forEach(([x, , z, relativeHeight], index) => {
    const tall = height * relativeHeight;
    const broad = width * (index === 1 ? 0.27 : 0.2);
    const rings: Ring[] = [[0, 0.02, 0, broad, depth * 0.31], [0.05, tall * 0.32, 0, broad * 0.91, depth * 0.25], [-0.18, tall * 0.69, 0.1, broad * 0.71, depth * 0.22], [0.16, tall, 0.13, broad * 0.25, depth * 0.1]];
    batch.add(rockGeometry(rings, random, 17), 'stone', [x * width, 0, z * depth], undefined, [0, index * 0.72, 0], ['#a8a894', '#b1af9b', '#999e8d', '#b4b09b', '#a4a792'][index], true);
  });
  // A few unequal weathered ledges; the shoreline is not an equal-spaced rock ring.
  for (let ledge = 0; ledge < 5; ledge++) {
    const x = -width * 0.38 + ledge * width * 0.18;
    const z = depth * 0.33 + (ledge % 2) * 0.25;
    batch.add(rockGeometry([[0, 0, 0, 0.67, 0.43], [0.12, 0.43 + random() * 0.25, 0.05, 0.53, 0.35], [-0.06, 0.72 + random() * 0.2, 0.07, 0.25, 0.18]], random, 8), 'stone', [x, 0, z], undefined, undefined, '#aaa58e', true);
  }
}

function peak(object: SceneObject, batch: Batch) {
  if (object.geometry.kind !== 'peak') return;
  const { height, secondary } = object.geometry;
  batch.add(createScholarRock(height, seedFor(object.id), secondary), 'stone', undefined, undefined, undefined, secondary ? '#a9aa9a' : '#b5b4a3', true);
}

function court(object: SceneObject, batch: Batch) {
  if (object.geometry.kind !== 'court') return;
  const { width, depth } = object.geometry;
  batch.box('paving', [width, 0.06, depth], [0, 0.045, 0], '#d3c8af');
  batch.box('paving', [width - 0.28, 0.035, depth - 0.28], [0, 0.087, 0], '#ded4bd');
  for (let x = -width / 2 + 0.6; x < width / 2; x += 1.22) {
    batch.box('paving', [0.018, 0.004, depth - 0.35], [x, 0.108, 0], '#c7bea8');
  }
  for (let z = -depth / 2 + 0.65; z < depth / 2; z += 1.24) {
    batch.box('paving', [width - 0.35, 0.004, 0.018], [0, 0.109, z], '#c7bea8');
  }
}

export interface GardenResources {
  group: THREE.Group;
  dispose: () => void;
}

/** Build exactly once per mounted scene; all repeated components are material-batched. */
export function createGarden(): GardenResources {
  const templates: Templates = { box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(1, 1, 1, 7, 1), foliage: foliageGeometry() };
  const materials = Object.fromEntries(Object.keys(PALETTE).map((name) => [name, new THREE.MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: name === 'water' ? 0.56 : name === 'roof' ? 0.88 : 0.97, metalness: 0, side: name === 'roof' ? THREE.DoubleSide : THREE.FrontSide })])) as Record<MaterialName, THREE.MeshStandardMaterial>;
  const garden = new THREE.Group();
  garden.name = 'liuyuan-artistic-miniature';
  // Floors precede water in the scene; each still owns a distinct semantic identity.
  const objects: SceneObject[] = [...SCENE_OBJECTS].sort((a, b) => Number(b.geometry.kind === 'court') - Number(a.geometry.kind === 'court'));
  for (const object of objects) {
    const random = seededRandom(seedFor(object.id));
    let group: THREE.Group;
    const batch = new Batch(templates, materials);
    switch (object.geometry.kind) {
      case 'building': case 'corridor': group = building(object, templates, materials); break;
      case 'wall': group = wall(object, templates, materials); break;
      case 'base': {
        const { width, depth, thickness } = object.geometry;
        batch.add(new THREE.ExtrudeGeometry(roundedRectangle(width, depth, 0.55), { depth: thickness, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.09, bevelThickness: 0.06 }), 'base', [0, -thickness, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
        // The polished top remains a thin slab, with one understated lower edge.
        batch.add(new THREE.ShapeGeometry(roundedRectangle(width - 0.12, depth - 0.12, 0.5)), 'paving', [0, 0.012, 0], undefined, [-Math.PI / 2, 0, 0], '#c6bea4', true);
        const top = new THREE.ExtrudeGeometry(roundedRectangle(width + 0.04, depth + 0.04, 0.55), { depth: 0.1, bevelEnabled: false });
        batch.add(top, 'base', [0, -thickness - 0.1, 0], undefined, [-Math.PI / 2, 0, 0], '#ab9e86', true);
        // Sparse ground patches give cultivated areas a softer edge.
        const gardenBeds = [smoothShape([[-14.6, -9.9], [-8.2, -10], [-7.9, -7.2], [-11.3, -6.5], [-14.8, -6.2]]), smoothShape([[-14.1, 3.8], [-11.5, 3.3], [-10.2, 6.1], [-12.2, 7.2], [-14.4, 6.6]]), smoothShape([[11.7, 3.4], [14.8, 3.7], [14.9, 7.7], [12, 7.5], [11.2, 5.3]])];
        gardenBeds.forEach((bed) => batch.add(new THREE.ShapeGeometry(bed), 'leaf', [0, 0.021, 0], undefined, [-Math.PI / 2, 0, 0], '#8d9671', true));
        // Connecting paths read as deliberate shared ground, not three separate exhibits.
        batch.box('paving', [17, 0.06, 1.7], [0.7, 0.05, 9.3], '#d8cbb1');
        batch.box('paving', [3.2, 0.055, 3.1], [2.2, 0.05, 3.9], '#d8cbb1');
        for (let step = 0; step < 8; step++) batch.box('paving', [1.3, 0.075, 0.65], [-14, 0.054, -3.5 + step * 0.88], '#c8bea7', [0, step % 2 ? -0.08 : 0.07, 0]);
        group = batch.finish(`body-${object.id}`);
        break;
      }
      case 'pond': pond(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'mountain': mountain(object, batch, random); group = batch.finish(`body-${object.id}`); break;
      case 'peak': peak(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'tree': tree(object, batch, templates); group = batch.finish(`body-${object.id}`); break;
      case 'bamboo': bamboo(object, batch, templates, random); group = batch.finish(`body-${object.id}`); break;
      case 'court': court(object, batch); group = batch.finish(`body-${object.id}`); break;
    }
    group.name = object.id;
    group.userData = { regionId: object.regionId, placeholder: object.placeholder, sourceId: 'sourceId' in object ? object.sourceId : undefined };
    group.position.set(...object.position);
    if ('rotation' in object && object.rotation) group.rotation.set(...object.rotation);
    if ('scale' in object && object.scale) group.scale.set(...object.scale);
    garden.add(group);
  }
  Object.values(templates).forEach((template) => template.dispose());
  let disposed = false;
  return {
    group: garden,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      garden.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
