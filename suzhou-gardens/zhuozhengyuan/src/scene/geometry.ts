import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_NAME, SCENE_OBJECTS, SCENE_SEED, type Point2, type SceneObject, type Vec3 } from '../data/garden.layout';

type Surface = 'sand' | 'paving' | 'bank' | 'wall' | 'wood' | 'tile' | 'water' | 'foliage';
const COLORS: Record<Surface, string> = {
  sand: '#c8bea5', paving: '#dfd5c0', bank: '#aaa994', wall: '#f0ebdf',
  wood: '#705d4d', tile: '#515b57', water: '#709b90', foliage: '#6d805e',
};
type Materials = Record<Surface, THREE.MeshStandardMaterial>;
interface Templates { cube: THREE.BoxGeometry; cylinder: THREE.CylinderGeometry; foliage: THREE.BufferGeometry }

/** Construction-only random sequence: no animation or mutation in the render loop. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
function objectSeed(id: string): number {
  let value = SCENE_SEED;
  for (const letter of id) value = Math.imul(value ^ letter.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** Small material batches keep the semantic object groups without tiny draw calls. */
class Batch {
  private readonly parts = new Map<Surface, THREE.BufferGeometry[]>();
  constructor(private readonly templates: Templates, private readonly materials: Materials) {}
  add(source: THREE.BufferGeometry, surface: Surface, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0], color = COLORS[surface], own = false): void {
    const cloned = source.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    geometry.deleteAttribute('uv');
    geometry.deleteAttribute('uv1');
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const wash = geometry.getAttribute('color');
    const shade = new THREE.Color(color);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let vertex = 0; vertex < colors.length / 3; vertex++) {
      colors[vertex * 3] = shade.r * (wash?.getX(vertex) ?? 1);
      colors[vertex * 3 + 1] = shade.g * (wash?.getY(vertex) ?? 1);
      colors[vertex * 3 + 2] = shade.b * (wash?.getZ(vertex) ?? 1);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const collection = this.parts.get(surface) ?? [];
    collection.push(geometry);
    this.parts.set(surface, collection);
    if (own) source.dispose();
  }
  box(surface: Surface, size: Vec3, position: Vec3, color = COLORS[surface], rotation: Vec3 = [0, 0, 0]): void {
    this.add(this.templates.cube, surface, position, size, rotation, color);
  }
  rod(surface: Surface, from: Vec3, to: Vec3, radius: number, color = COLORS[surface]): void {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = this.templates.cylinder.clone();
    geometry.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), new THREE.Vector3(radius, direction.length(), radius)));
    this.add(geometry, surface, undefined, undefined, undefined, color, true);
  }
  branch(from: Vec3, to: Vec3, bottom: number, top: number): void {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(top, bottom, direction.length(), 7);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    this.add(geometry, 'wood', undefined, undefined, undefined, '#817461', true);
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [surface, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      geometries.forEach(geometry => geometry.dispose());
      if (!merged) throw new Error(`Cannot batch geometry: ${name}/${surface}`);
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, this.materials[surface]);
      mesh.name = `${name}:${surface}`;
      mesh.castShadow = surface !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

function makeGeometry(vertices: number[], indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function roundRect(width: number, depth: number, radius = 0.5): THREE.Shape {
  const shape = new THREE.Shape(), x = -width / 2, y = -depth / 2;
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
function plan(points: readonly Point2[]): THREE.Shape {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, -z, 0)), true, 'catmullrom', 0.3);
  const samples = curve.getPoints(points.length * 7);
  const shape = new THREE.Shape(samples.map(point => new THREE.Vector2(point.x, point.y)));
  shape.closePath();
  return shape;
}
const POND_PROFILE: readonly Point2[] = [[-0.49, -0.03], [-0.46, -0.3], [-0.28, -0.46], [-0.07, -0.5], [0.15, -0.43], [0.33, -0.43], [0.47, -0.26], [0.5, -0.04], [0.43, 0.2], [0.32, 0.39], [0.1, 0.49], [-0.16, 0.47], [-0.36, 0.35], [-0.48, 0.17]];
const ISLAND_PROFILES: Record<'west' | 'east', readonly Point2[]> = {
  west: [[-0.49, -0.07], [-0.35, -0.4], [-0.06, -0.48], [0.28, -0.4], [0.5, -0.1], [0.36, 0.2], [0.1, 0.55], [-0.17, 0.58], [-0.35, 0.29]],
  east: [[-0.45, -0.2], [-0.13, -0.48], [0.19, -0.4], [0.46, -0.08], [0.43, 0.21], [0.15, 0.44], [-0.21, 0.4], [-0.48, 0.11]],
};

function base(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'base') return;
  const { width, depth, thickness } = object.geometry;
  batch.add(new THREE.ExtrudeGeometry(roundRect(width, depth, 0.65), { depth: thickness, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.055, bevelSegments: 2, curveSegments: 8 }), 'sand', [0, -thickness, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  batch.add(new THREE.ShapeGeometry(roundRect(width - 0.06, depth - 0.06, 0.62), 8), 'paving', [0, 0.012, 0], undefined, [-Math.PI / 2, 0, 0], '#c7c2a8', true);
  batch.add(new THREE.ExtrudeGeometry(roundRect(width + 0.1, depth + 0.1, 0.65), { depth: 0.11, bevelEnabled: false, curveSegments: 8 }), 'sand', [0, -thickness - 0.11, 0], undefined, [-Math.PI / 2, 0, 0], '#a99f87', true);
  const beds: readonly (readonly Point2[])[] = [
    [[-16.1, -9.4], [-12.0, -9.8], [-9.0, -7.4], [-11.0, -5.4], [-15.8, -5.2]],
    [[-16.1, -1.6], [-13.1, -1.1], [-13.2, 3.8], [-10.9, 6.3], [-12.3, 9.3], [-15.9, 8.8]],
    [[6.9, 10.7], [8.2, 7.9], [11.1, 8.0], [14.9, 8.3], [15.2, 11.3], [10.1, 11.5]],
    [[4.8, -10.7], [8.0, -11.0], [9.9, -8.6], [7.4, -7.6], [4.5, -8.2]],
  ];
  beds.forEach((points, i) => batch.add(new THREE.ShapeGeometry(plan(points)), 'foliage', [0, 0.025, 0], undefined, [-Math.PI / 2, 0, 0], i % 2 ? '#9ba284' : '#929c7d', true));
  // Land paths sit on shore. They never spread across the central water.
  batch.box('paving', [22.5, 0.055, 1.02], [0, 0.045, 11.1], '#d6ccb6');
  for (let stone = 0; stone < 12; stone++) {
    const z = -5.0 + stone * 0.94;
    batch.box('paving', [1.02, 0.08, 0.61], [-14.65 + Math.sin(stone * 0.45) * 0.35, 0.075, z], '#bfb79f', [0, Math.sin(stone) * 0.11, 0]);
  }
}

function pond(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'pond') return;
  const { width, depth } = object.geometry;
  const shore = plan(POND_PROFILE.map(([x, z]) => [x * width, z * depth]));
  const bank = shore.clone();
  bank.holes.push(new THREE.Path(shore.getPoints().map(point => point.clone().multiplyScalar(0.972)).reverse()));
  batch.add(new THREE.ExtrudeGeometry(bank, { depth: 0.13, bevelEnabled: false }), 'bank', [0, 0.015, 0], undefined, [-Math.PI / 2, 0, 0], '#b3ad95', true);
  const waterShape = plan(POND_PROFILE.map(([x, z]) => [x * width * 0.973, z * depth * 0.973]));
  for (const island of SCENE_OBJECTS.filter(item => item.geometry.kind === 'island')) {
    if (island.geometry.kind !== 'island') continue;
    const { width: iw, depth: id, outline } = island.geometry;
    const opening = plan(ISLAND_PROFILES[outline].map(([x, z]) => [x * iw * 0.95 + island.position[0] - object.position[0], z * id * 0.95 + island.position[2] - object.position[2]]));
    waterShape.holes.push(new THREE.Path(opening.getPoints().reverse()));
  }
  const water = new THREE.ShapeGeometry(waterShape);
  const positions = water.getAttribute('position');
  const wash = new Float32Array(positions.count * 3);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const x = positions.getX(vertex) / width, z = positions.getY(vertex) / depth;
    const tone = 0.98 + 0.055 * Math.sin(x * 5 - z * 3) + 0.025 * Math.cos(x * 3 + z * 4);
    wash.set([tone, tone, tone], vertex * 3);
  }
  water.setAttribute('color', new THREE.BufferAttribute(wash, 3));
  batch.add(water, 'water', [0, 0.142, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  // A few restrained mineral-colour ripples, baked once and kept still.
  for (let line = 0; line < 5; line++) {
    batch.rod('water', [-2.7 + line * 0.4, 0.152, 3.0 + line * 0.46], [-0.9 + line * 0.34, 0.152, 3.05 + line * 0.46], 0.008, '#8caea1');
  }
}

function island(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'island') return;
  const { width, depth, height, outline } = object.geometry;
  const outlineShape = plan(ISLAND_PROFILES[outline].map(([x, z]) => [x * width, z * depth]));
  batch.add(new THREE.ExtrudeGeometry(outlineShape, { depth: 0.2, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.04, bevelSegments: 1 }), 'bank', [0, -0.025, 0], undefined, [-Math.PI / 2, 0, 0], '#aaa993', true);
  const curve = new THREE.CatmullRomCurve3(ISLAND_PROFILES[outline].map(([x, z]) => new THREE.Vector3(x * width, 0, z * depth)), true, 'catmullrom', 0.3);
  const vertices: number[] = [0.25, height, -0.15], indices: number[] = [];
  const sides = 56, rings = 6;
  for (let ring = 1; ring <= rings; ring++) {
    const radial = ring / rings;
    for (let side = 0; side < sides; side++) {
      const edge = curve.getPoint(side / sides);
      const relief = Math.sin(side / sides * Math.PI * 6 + radial) * 0.07 * Math.sin(radial * Math.PI);
      vertices.push(edge.x * radial + 0.25 * (1 - radial), 0.13 + (height - 0.13) * Math.pow(1 - radial, 0.85) + relief, edge.z * radial - 0.15 * (1 - radial));
    }
  }
  for (let side = 0; side < sides; side++) indices.push(0, 1 + (side + 1) % sides, 1 + side);
  for (let ring = 0; ring < rings - 1; ring++) for (let side = 0; side < sides; side++) {
    const a = 1 + ring * sides + side, b = 1 + ring * sides + (side + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  batch.add(makeGeometry(vertices, indices), 'foliage', undefined, undefined, undefined, '#929a79', true);
  const random = seededRandom(objectSeed(object.id));
  // Uneven little shoreline ledges, without a monumental scholar-stone peak.
  for (let rock = 0; rock < 11; rock++) {
    const t = (rock / 11 + 0.045 * random()) % 1;
    const edge = curve.getPoint(t);
    batch.add(new THREE.IcosahedronGeometry(1, 0), 'bank', [edge.x * 0.96, 0.18, edge.z * 0.96], [0.35 + random() * 0.25, 0.18 + random() * 0.18, 0.25 + random() * 0.18], [0, random() * 3, 0], '#b5b19b', true);
  }
}

/** Two curved tile slopes, with an actual thickness along the gable edges. */
function gableRoof(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const across = Math.ceil(width * 2), down = 8;
  for (const sign of [-1, 1]) {
    const offset = vertices.length / 3;
    for (let row = 0; row <= down; row++) for (let col = 0; col <= across; col++) {
      const t = row / down, x = (col / across - 0.5) * width;
      const y = rise * (1 - Math.pow(t, 0.73)) + 0.12 * Math.pow(t, 5) + 0.11 * Math.pow(Math.abs(x * 2 / width), 8) * Math.pow(t, 3);
      vertices.push(x, y, sign * t * depth / 2);
    }
    for (let row = 0; row < down; row++) for (let col = 0; col < across; col++) {
      const a = offset + row * (across + 1) + col, b = a + across + 1;
      if (sign > 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
      else indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (const side of [-1, 1]) {
    const offset = vertices.length / 3;
    vertices.push(side * width / 2, 0.035, 0);
    for (let step = -down; step <= down; step++) {
      const t = Math.abs(step / down);
      vertices.push(side * width / 2, rise * (1 - Math.pow(t, 0.73)) + 0.12 * Math.pow(t, 5) + 0.11 * Math.pow(t, 3), step / down * depth / 2);
    }
    for (let step = 0; step < down * 2; step++) {
      if (side > 0) indices.push(offset, offset + step + 2, offset + step + 1);
      else indices.push(offset, offset + step + 1, offset + step + 2);
    }
  }
  return makeGeometry(vertices, indices);
}
function addRoof(batch: Batch, width: number, depth: number, height: number, rise: number): void {
  batch.add(gableRoof(width, depth, rise), 'tile', [0, height, 0], undefined, undefined, undefined, true);
  batch.box('wood', [width - 0.16, 0.13, depth - 0.1], [0, height + 0.02, 0], '#655341');
  batch.rod('tile', [-width / 2 - 0.05, height + rise + 0.035, 0], [width / 2 + 0.05, height + rise + 0.035, 0], 0.08, '#69716a');
  for (const sign of [-1, 1]) batch.rod('tile', [-width / 2, height + 0.15, sign * depth / 2], [width / 2, height + 0.15, sign * depth / 2], 0.045, '#414b47');
  // Baked seams give grey tiles a fine rhythm while retaining one tile mesh.
  for (let x = -width / 2 + 0.18; x < width / 2; x += 0.43) for (const sign of [-1, 1]) {
    for (let section = 0; section < 5; section++) {
      const a = section / 5, b = (section + 1) / 5;
      const y = (t: number) => height + rise * (1 - Math.pow(t, 0.73)) + 0.12 * Math.pow(t, 5) + 0.11 * Math.pow(Math.abs(x * 2 / width), 8) * Math.pow(t, 3) + 0.023;
      batch.rod('tile', [x, y(a), sign * a * depth / 2], [x, y(b), sign * b * depth / 2], 0.016, '#69716a');
    }
  }
}

function building(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'building' && object.geometry.kind !== 'corridor' && object.geometry.kind !== 'pavilion') throw new Error('Invalid architectural geometry');
  const p = object.geometry, width = p.kind === 'corridor' ? p.length : p.width, depth = p.kind === 'corridor' ? p.width : p.depth;
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  body.box('paving', [width + 0.48, 0.18, depth + 0.48], [0, 0.1, 0]);
  body.box('paving', [width + 0.7, 0.07, depth + 0.7], [0, 0.035, 0], '#b9b099');
  body.box('wood', [width, 0.09, depth], [0, 0.23, 0], '#a18c71');
  const bays = p.kind === 'pavilion' ? 1 : Math.max(2, Math.round(width / 1.75));
  for (let bay = 0; bay <= bays; bay++) {
    const x = width * (bay / bays - 0.5);
    for (const z of [-depth / 2, depth / 2]) {
      body.box('wood', [0.13, p.height - 0.14, 0.13], [x, (p.height + 0.3) / 2, z]);
      body.box('bank', [0.23, 0.15, 0.23], [x, 0.28, z], '#aba28a');
    }
  }
  for (const z of [-depth / 2, depth / 2]) body.box('wood', [width + 0.13, 0.16, 0.15], [0, p.height - 0.03, z]);
  if (p.kind === 'building') {
    // Warm-white gables and rear wall; every front lattice opening has empty space.
    body.box('wall', [width, p.height - 0.25, 0.14], [0, p.height / 2 + 0.14, -depth / 2 + 0.04]);
    for (const sign of [-1, 1]) {
      body.box('wall', [0.14, p.height - 0.24, depth * 0.36], [sign * width / 2, p.height / 2 + 0.14, -depth * 0.32]);
      body.box('wall', [0.14, 0.62, depth * 0.64], [sign * width / 2, 0.51, depth * 0.18]);
      body.box('wall', [0.14, 0.42, depth * 0.64], [sign * width / 2, p.height - 0.08, depth * 0.18]);
      for (let slat = -2; slat <= 2; slat++) body.box('wood', [0.06, 1.08, 0.04], [sign * width / 2, 1.39, depth * 0.18 + slat * depth * 0.095]);
    }
    for (let bay = 0; bay < bays; bay++) {
      const x = (bay / bays - 0.5) * width + width / bays / 2, span = width / bays - 0.18;
      if (bay === Math.floor(bays / 2)) continue; // Open central door.
      body.box('wood', [span, 0.47, 0.075], [x, 0.56, depth / 2], '#958067');
      for (let bar = 0; bar < 5; bar++) body.box('wood', [0.04, 1.24, 0.055], [x + (bar / 4 - 0.5) * span, 1.55, depth / 2]);
      for (let row = 0; row < 4; row++) body.box('wood', [span, 0.033, 0.055], [x, 0.95 + row * 0.39, depth / 2]);
    }
    for (let stair = 0; stair < 3; stair++) body.box('paving', [width * 0.43, 0.07 * (3 - stair), 0.24], [0, 0.035 * (3 - stair), depth / 2 + 0.36 + stair * 0.22]);
    addRoof(roof, width + 0.75, depth + 0.75, p.height, 0.95);
  } else if (p.kind === 'corridor') {
    for (let bay = 0; bay < bays; bay++) {
      const x = width * ((bay + 0.5) / bays - 0.5), span = width / bays - 0.18;
      body.box('wood', [0.09, 0.1, depth], [x, p.height - 0.21, 0]);
      for (const sign of [-1, 1]) {
        if (sign < 0 && bay % 3 === 1) continue;
        body.box('wood', [span, 0.08, 0.075], [x, 0.82, sign * depth / 2], '#877156');
        for (const a of [-0.28, 0.28]) body.box('wood', [0.045, 0.43, 0.05], [x + a * span, 0.57, sign * depth / 2]);
      }
    }
    addRoof(roof, width + 0.6, depth + 0.66, p.height, 0.59);
  } else {
    for (const sign of [-1, 1]) {
      body.box('wood', [width * 0.55, 0.1, 0.12], [0, 0.73, sign * depth / 2], '#8b775e');
      body.box('wood', [0.12, 0.1, depth * 0.55], [sign * width / 2, 0.73, 0], '#8b775e');
      for (const offset of [-0.42, 0.42]) {
        body.box('wood', [0.05, 0.4, 0.05], [offset, 0.5, sign * depth / 2]);
        body.box('wood', [0.05, 0.4, 0.05], [sign * width / 2, 0.5, offset]);
      }
    }
    // Four separate curved faces form the pavilion's square hipped silhouette.
    const vertices: number[] = [], indices: number[] = [];
    const halfX = (width + 0.82) / 2, halfZ = (depth + 0.82) / 2, steps = 10;
    for (let face = 0; face < 4; face++) {
      const corners: Vec3[] = [[-halfX, 0, -halfZ], [halfX, 0, -halfZ], [halfX, 0, halfZ], [-halfX, 0, halfZ]];
      const a = corners[face], b = corners[(face + 1) % 4], offset = vertices.length / 3;
      for (let row = 0; row <= steps; row++) for (let col = 0; col <= steps; col++) {
        const t = row / steps, fraction = col / steps;
        const x = (a[0] + (b[0] - a[0]) * fraction) * t, z = (a[2] + (b[2] - a[2]) * fraction) * t;
        vertices.push(x, 1.03 * (1 - Math.pow(t, 0.73)) + 0.18 * Math.pow(t, 5) + 0.095 * Math.pow(Math.abs(fraction * 2 - 1), 6) * t, z);
      }
      for (let row = 0; row < steps; row++) for (let col = 0; col < steps; col++) {
        const v = offset + row * (steps + 1) + col, next = v + steps + 1;
        indices.push(v, v + 1, next, v + 1, next + 1, next);
      }
      roof.rod('tile', [a[0], p.height + 0.275, a[2]], [b[0], p.height + 0.275, b[2]], 0.043, '#414b47');
      roof.rod('tile', [0, p.height + 1.06, 0], [a[0], p.height + 0.28, a[2]], 0.035, '#6d766c');
    }
    roof.add(makeGeometry(vertices, indices), 'tile', [0, p.height, 0], undefined, undefined, undefined, true);
    roof.box('wood', [width + 0.55, 0.13, depth + 0.55], [0, p.height + 0.03, 0], '#655744');
    roof.add(new THREE.SphereGeometry(0.11, 8, 5), 'tile', [0, p.height + 1.08, 0], undefined, undefined, '#777c6f', true);
  }
  const group = new THREE.Group();
  group.add(body.finish(`body-${object.id}`), roof.finish(`roof-${object.id}`));
  return group;
}

function bridge(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'bridge') return;
  const { width, height, points } = object.geometry;
  points.slice(1).forEach((point, index) => {
    const a = points[index], b = point, dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const rotation: Vec3 = [0, -Math.atan2(dz, dx), 0];
    const center: Vec3 = [(a[0] + b[0]) / 2, height, (a[1] + b[1]) / 2];
    batch.box('paving', [length + 0.12, 0.16, width], center, '#d4ccb8', rotation);
    // Slender piers: the span is empty underneath, rather than a solid causeway.
    for (const t of [0.12, 0.88]) {
      const x = a[0] + dx * t, z = a[1] + dz * t;
      batch.box('bank', [0.21, height - 0.15, width * 0.62], [x, (height + 0.13) / 2 - 0.1, z], '#b3ad96', rotation);
    }
    for (const side of [-1, 1]) {
      const nx = -dz / length * width * 0.46 * side, nz = dx / length * width * 0.46 * side;
      batch.rod('paving', [a[0] + nx, height + 0.59, a[1] + nz], [b[0] + nx, height + 0.59, b[1] + nz], 0.048, '#d8d1bd');
      batch.rod('paving', [a[0] + nx, height + 0.25, a[1] + nz], [b[0] + nx, height + 0.25, b[1] + nz], 0.026, '#c4bea9');
      const posts = Math.max(2, Math.ceil(length / 1.25));
      for (let post = 0; post <= posts; post++) {
        const t = post / posts;
        batch.box('paving', [0.085, 0.57, 0.085], [a[0] + dx * t + nx, height + 0.32, a[1] + dz * t + nz], '#d8d1bd');
      }
    }
    for (let joint = 1; joint < Math.floor(length / 0.65); joint++) {
      const t = joint * 0.65 / length;
      batch.box('bank', [0.015, 0.005, width * 0.93], [a[0] + dx * t, height + 0.082, a[1] + dz * t], '#bcb7a3', rotation);
    }
  });
}

function wall(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'wall') throw new Error('Invalid wall geometry');
  const { width, height, openings } = object.geometry, shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0.08); shape.lineTo(width / 2, 0.08); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  const body = new Batch(templates, materials), roof = new Batch(templates, materials);
  for (let opening = 0; opening < openings; opening++) {
    const center = (opening + 0.5) * width / openings - width / 2, w = 0.9, low = 0.55, high = height - 0.32;
    const hole = new THREE.Path();
    hole.moveTo(center - w / 2, low); hole.lineTo(center - w / 2, high); hole.lineTo(center + w / 2, high); hole.lineTo(center + w / 2, low); hole.closePath();
    shape.holes.push(hole);
    for (const y of [low - 0.03, high + 0.03]) body.box('bank', [w + 0.13, 0.06, 0.3], [center, y, 0], '#b3b3a0');
    for (const x of [-w / 2 - 0.03, w / 2 + 0.03]) body.box('bank', [0.06, high - low + 0.09, 0.3], [center + x, (low + high) / 2, 0], '#b3b3a0');
    // Actual bars with gaps, no opaque decal behind the aperture.
    for (const x of [-0.28, 0, 0.28]) body.box('wood', [0.026, high - low, 0.055], [center + x, (low + high) / 2, 0], '#8a8b73');
    for (const y of [0.3, 0.65]) body.box('wood', [w, 0.026, 0.055], [center, low + (high - low) * y, 0], '#8a8b73');
  }
  body.add(new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false }), 'wall', [0, 0, -0.11], undefined, undefined, undefined, true);
  body.box('bank', [width + 0.08, 0.11, 0.29], [0, 0.055, 0], '#b5ac94');
  addRoof(roof, width + 0.15, 0.56, height, 0.2);
  const group = new THREE.Group();
  group.add(body.finish(`body-${object.id}`), roof.finish(`roof-${object.id}`));
  return group;
}

function foliageTemplate(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2), positions = geometry.getAttribute('position');
  const wash = new Float32Array(positions.count * 3);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const x = positions.getX(vertex), y = positions.getY(vertex), z = positions.getZ(vertex);
    const lobe = 1 + 0.055 * Math.sin(x * 6 + z * 4) + 0.035 * Math.cos(y * 6 - z * 5);
    positions.setXYZ(vertex, x * lobe, y * lobe, z * lobe);
    const tone = 0.97 + y * 0.07 + 0.025 * Math.sin(z * 3 + x * 4);
    wash.set([tone, tone, tone], vertex * 3);
  }
  // Keep the original shared radial normals: recomputing normals on this
  // non-indexed template would give each tiny triangle a hard flat face.
  geometry.setAttribute('color', new THREE.BufferAttribute(wash, 3));
  return geometry;
}
function tree(object: SceneObject, batch: Batch, templates: Templates): void {
  if (object.geometry.kind !== 'tree') return;
  const { height, canopy, habit, lean } = object.geometry, random = seededRandom(objectSeed(object.id));
  const radius = canopy / 2, willow = habit === 'willow';
  const root: Vec3 = [0, 0.02, 0], joint: Vec3 = [lean[0] * 0.4, height * 0.36, lean[1] * 0.4], crown: Vec3 = [lean[0], height * 0.72, lean[1]];
  batch.branch(root, joint, height * 0.039, height * 0.025);
  batch.branch(joint, crown, height * 0.027, height * 0.012);
  const dark = new THREE.Color(willow ? '#70866a' : '#5c765b'), pale = new THREE.Color(willow ? '#9ba980' : '#8e9b72');
  for (let arm = 0; arm < 6; arm++) {
    const angle = arm * 2.399 + random() * 0.24, reach = radius * (0.56 + random() * 0.35);
    const branchRoot: Vec3 = [lean[0] * 0.55, height * (0.44 + arm * 0.045), lean[1] * 0.55];
    const elbow: Vec3 = [lean[0] + Math.cos(angle) * reach * 0.6, height * (0.7 + random() * 0.1), lean[1] + Math.sin(angle) * reach * 0.6];
    const end: Vec3 = [lean[0] + Math.cos(angle) * reach, height * (0.73 + random() * 0.13), lean[1] + Math.sin(angle) * reach];
    batch.branch(branchRoot, elbow, height * 0.018, height * 0.01);
    batch.branch(elbow, end, height * 0.01, height * 0.004);
    const tone = dark.clone().lerp(pale, 0.22 + random() * 0.55).getStyle();
    batch.add(templates.foliage, 'foliage', [end[0] * 0.87, end[1], end[2] * 0.87], [radius * (0.41 + random() * 0.15), height * 0.14, radius * 0.39], [0.06, angle, 0.12], tone);
    if (willow) {
      for (let sprig = 0; sprig < 4; sprig++) {
        const phase = angle + (sprig - 1.5) * 0.24;
        const tip: Vec3 = [end[0] + Math.cos(phase) * radius * 0.18, end[1] - height * (0.25 + random() * 0.12), end[2] + Math.sin(phase) * radius * 0.18];
        batch.rod('wood', end, tip, 0.013, '#8e9270');
        batch.add(templates.foliage, 'foliage', [(tip[0] + end[0]) / 2, (tip[1] + end[1]) / 2, (tip[2] + end[2]) / 2], [radius * 0.105, height * 0.18, radius * 0.1], [0.08, phase, -0.09], tone);
      }
    } else {
      const small: Vec3 = [elbow[0] - Math.sin(angle) * radius * 0.31, elbow[1] + height * 0.05, elbow[2] + Math.cos(angle) * radius * 0.31];
      batch.branch(elbow, small, height * 0.007, height * 0.003);
      batch.add(templates.foliage, 'foliage', small, [radius * 0.36, height * 0.125, radius * 0.31], [0.1, angle + 0.6, 0.12], dark.clone().lerp(pale, 0.32 + random() * 0.5).getStyle());
    }
  }
  batch.add(templates.foliage, 'foliage', [lean[0], height * 0.9, lean[1]], [radius * 0.46, height * 0.12, radius * 0.4], [0.05, 0.4, 0.05], pale.clone().lerp(dark, 0.34).getStyle());
}

function lotusLeaf(): THREE.BufferGeometry {
  const vertices: number[] = [0, 0.055, 0], indices: number[] = [], sides = 16;
  for (let side = 0; side <= sides; side++) {
    const angle = (side / sides) * (Math.PI * 2 - 0.27) + 0.13;
    vertices.push(Math.cos(angle), 0.035 * Math.sin(angle * 3), Math.sin(angle));
  }
  for (let side = 0; side < sides; side++) indices.push(0, side + 1, side + 2);
  return makeGeometry(vertices, indices);
}
function lotus(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'lotus') return;
  const { width, depth, count } = object.geometry, random = seededRandom(objectSeed(object.id)), leaf = lotusLeaf();
  for (let index = 0; index < count; index++) {
    const angle = index * 2.399, reach = Math.sqrt((index + 0.5) / count);
    const x = Math.cos(angle) * reach * width / 2, z = Math.sin(angle) * reach * depth / 2;
    const radius = 0.13 + random() * 0.13, y = 0.18 + random() * 0.075;
    batch.rod('foliage', [x, 0.12, z], [x, y, z], 0.016, '#718d65');
    batch.add(leaf, 'foliage', [x, y, z], [radius, radius, radius], [0.02, random() * 6, 0.03], index % 3 ? '#83a178' : '#9bad7c');
  }
  leaf.dispose();
}
function court(object: SceneObject, batch: Batch): void {
  if (object.geometry.kind !== 'court') return;
  const { width, depth } = object.geometry;
  batch.box('paving', [width, 0.11, depth], [0, 0.08, 0], '#d5cbb4');
  batch.box('paving', [width - 0.13, 0.02, depth - 0.13], [0, 0.143, 0], '#e0d7c1');
  for (let x = -width / 2 + 0.6; x < width / 2; x += 1.15) batch.box('bank', [0.015, 0.004, depth - 0.2], [x, 0.156, 0], '#c5bea8');
  for (let z = -depth / 2 + 0.6; z < depth / 2; z += 1.15) batch.box('bank', [width - 0.2, 0.004, 0.015], [0, 0.156, z], '#c5bea8');
}

export interface GardenResources { group: THREE.Group; dispose: () => void }

/** One immutable construction per mount; cleanup owns every GPU allocation. */
export function createGarden(): GardenResources {
  const templates: Templates = { cube: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(1, 1, 1, 6), foliage: foliageTemplate() };
  const materials = Object.fromEntries(Object.keys(COLORS).map(surface => [surface, new THREE.MeshStandardMaterial({ color: 'white', vertexColors: true, roughness: surface === 'water' ? 0.68 : 0.95, metalness: 0, side: surface === 'tile' || surface === 'foliage' ? THREE.DoubleSide : THREE.FrontSide })])) as Materials;
  const garden = new THREE.Group();
  garden.name = SCENE_NAME;
  const objects: readonly SceneObject[] = SCENE_OBJECTS;
  for (const object of objects) {
    const batch = new Batch(templates, materials);
    let group: THREE.Group;
    switch (object.geometry.kind) {
      case 'building': case 'pavilion': case 'corridor': group = building(object, templates, materials); break;
      case 'wall': group = wall(object, templates, materials); break;
      case 'base': base(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'pond': pond(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'island': island(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'bridge': bridge(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'tree': tree(object, batch, templates); group = batch.finish(`body-${object.id}`); break;
      case 'lotus': lotus(object, batch); group = batch.finish(`body-${object.id}`); break;
      case 'court': court(object, batch); group = batch.finish(`body-${object.id}`); break;
    }
    group.name = object.id;
    group.userData = { regionId: object.regionId, placeholder: object.placeholder, sourceId: 'sourceId' in object ? object.sourceId : undefined };
    group.position.set(...object.position);
    if ('rotation' in object && object.rotation) group.rotation.set(...object.rotation);
    garden.add(group);
  }
  Object.values(templates).forEach(geometry => geometry.dispose());
  let disposed = false;
  return { group: garden, dispose: () => {
    if (disposed) return;
    disposed = true;
    garden.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    Object.values(materials).forEach(material => material.dispose());
  } };
}
