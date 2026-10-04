import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SCENE_NAME, SCENE_OBJECTS, SCENE_SEED, type SceneObject, type Vec3 } from '../data/garden.layout';

type MaterialKey = 'base' | 'paving' | 'stone' | 'wall' | 'roof' | 'wood' | 'leaf' | 'water';
type Materials = Record<MaterialKey, THREE.MeshStandardMaterial>;
const PALETTE: Record<MaterialKey, string> = {
  base: '#bbaf98', paving: '#ded4bf', stone: '#a8aa98', wall: '#f1eadc',
  roof: '#53605c', wood: '#735c47', leaf: '#637a58', water: '#799c91',
};
interface Templates { box: THREE.BoxGeometry; cylinder: THREE.CylinderGeometry; foliage: THREE.BufferGeometry }

/** All variation is computed during construction; no frame-loop randomness. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function seedFor(id: string): number {
  let seed = SCENE_SEED;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}

/** Object-local material batches preserve object IDs and roof/body identity. */
class Batch {
  private parts = new Map<MaterialKey, THREE.BufferGeometry[]>();
  constructor(private templates: Templates, private materials: Materials) {}
  add(source: THREE.BufferGeometry, material: MaterialKey, position: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1], rotation: Vec3 = [0, 0, 0], color = PALETTE[material], ownSource = false): void {
    const part = source.index ? source.toNonIndexed() : source.clone();
    part.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale)));
    part.deleteAttribute('uv');
    part.deleteAttribute('uv1');
    const tone = new THREE.Color(color);
    const previous = part.getAttribute('color');
    const colors = new Float32Array(part.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length / 3; i++) {
      colors[i * 3] = tone.r * (previous?.getX(i) ?? 1);
      colors[i * 3 + 1] = tone.g * (previous?.getY(i) ?? 1);
      colors[i * 3 + 2] = tone.b * (previous?.getZ(i) ?? 1);
    }
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const parts = this.parts.get(material) ?? [];
    parts.push(part);
    this.parts.set(material, parts);
    if (ownSource) source.dispose();
  }
  box(material: MaterialKey, size: Vec3, position: Vec3, color = PALETTE[material], rotation: Vec3 = [0, 0, 0]): void {
    this.add(this.templates.box, material, position, size, rotation, color);
  }
  beam(material: MaterialKey, from: Vec3, to: Vec3, radius: number, color = PALETTE[material], taper = 1): void {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = taper === 1 ? this.templates.cylinder.clone() : new THREE.CylinderGeometry(taper, 1, 1, 7, 1);
    geometry.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), new THREE.Vector3(radius, direction.length(), radius)));
    this.add(geometry, material, undefined, undefined, undefined, color, true);
  }
  finish(name: string): THREE.Group {
    const group = new THREE.Group();
    group.name = name;
    for (const [material, parts] of this.parts) {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose());
      if (!geometry) throw new Error(`Cannot merge ${name}/${material}`);
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, this.materials[material]);
      mesh.name = `${name}:${material}`;
      mesh.castShadow = material !== 'water';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

function roundedRect(width: number, depth: number, radius = 0.26): THREE.Shape {
  const s = new THREE.Shape();
  const x = -width / 2, y = -depth / 2;
  s.moveTo(x + radius, y); s.lineTo(x + width - radius, y);
  s.quadraticCurveTo(x + width, y, x + width, y + radius);
  s.lineTo(x + width, y + depth - radius); s.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  s.lineTo(x + radius, y + depth); s.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y);
  s.closePath(); return s;
}

/** Gently irregular, compact pool, with one clipped corner beside the water pavilion. */
function poolShape(width: number, depth: number, inset = 1): THREE.Shape {
  const pairs: readonly (readonly [number, number])[] = [
    [-0.5, -0.19], [-0.39, -0.45], [-0.11, -0.49], [0.2, -0.46], [0.49, -0.27],
    [0.48, 0.25], [0.3, 0.44], [-0.07, 0.48], [-0.4, 0.33], [-0.49, 0.06],
  ];
  const curve = new THREE.CatmullRomCurve3(pairs.map(([x, z]) => new THREE.Vector3(x * width * inset, -z * depth * inset, 0)), true, 'catmullrom', 0.14);
  const points = curve.getPoints(90);
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}
function asHole(shape: THREE.Shape): THREE.Path {
  const hole = new THREE.Path(shape.getPoints(90).slice().reverse());
  hole.closePath(); return hole;
}
function planar(batch: Batch, shape: THREE.Shape, material: MaterialKey, y: number, color = PALETTE[material]): void {
  batch.add(new THREE.ShapeGeometry(shape, 20), material, [0, y, 0], undefined, [-Math.PI / 2, 0, 0], color, true);
}
function ground(batch: Batch, object: SceneObject): void {
  if (object.geometry.kind !== 'base') return;
  const { width, depth, thickness } = object.geometry;
  const slab = roundedRect(width, depth, 0.55);
  const cutout = poolShape(10.8, 8.4);
  const holePoints = cutout.getPoints(90).map(point => new THREE.Vector2(point.x - 1.6, point.y - 0.15)).reverse();
  const hole = new THREE.Path(holePoints); hole.closePath(); slab.holes.push(hole);
  batch.add(new THREE.ExtrudeGeometry(slab, { depth: thickness, bevelEnabled: false, curveSegments: 8 }), 'base', [0, -thickness, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  planar(batch, slab, 'paving', 0.005, '#d2cbb6');
  const plinth = roundedRect(width, depth, 0.55);
  batch.add(new THREE.ExtrudeGeometry(plinth, { depth: 0.05, bevelEnabled: false, curveSegments: 8 }), 'base', [0, -thickness - 0.05, 0], undefined, [-Math.PI / 2, 0, 0], '#a99c85', true);
  // Narrow paths connect the southern porch and western waterside pavilion.
  batch.box('paving', [7.15, 0.025, 1.25], [-5.25, 0.022, 6.05], '#dbd1ba');
  batch.box('paving', [1.8, 0.025, 3.25], [-8.3, 0.022, -4.85], '#d9ceb6');
}

function pond(batch: Batch, object: SceneObject): void {
  if (object.geometry.kind !== 'pond') return;
  const { width, depth } = object.geometry;
  const outer = poolShape(width, depth);
  outer.holes.push(asHole(poolShape(width, depth, 0.943)));
  batch.add(new THREE.ExtrudeGeometry(outer, { depth: 0.16, bevelEnabled: false }), 'stone', [0, -0.11, 0], undefined, [-Math.PI / 2, 0, 0], '#a9ac98', true);
  const water = new THREE.ShapeGeometry(poolShape(width, depth, 0.943), 24);
  const points = water.getAttribute('position');
  const colors = new Float32Array(points.count * 3);
  for (let i = 0; i < points.count; i++) {
    const tone = 0.96 + 0.055 * Math.sin(points.getX(i) * 0.31 - points.getY(i) * 0.17);
    colors.set([tone, tone, tone], i * 3);
  }
  water.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  batch.add(water, 'water', [0, -0.09, 0], undefined, [-Math.PI / 2, 0, 0], undefined, true);
  // A basin floor makes this a real shallow depression in the base.
  planar(batch, poolShape(width, depth, 0.943), 'stone', -0.22, '#899184');
  for (let i = 0; i < 3; i++) batch.beam('water', [-2.4 + i * 0.25, -0.085, 0.6 + i * 0.5], [-0.7 + i * 0.35, -0.085, 0.63 + i * 0.5], 0.008, '#95b1a3');
}

function roofHeight(t: number, rise: number): number { return rise * Math.pow(1 - t, 1.18) + 0.12 * Math.pow(t, 5); }
/** A closed curved cross-section extruded along the ridge; front-side faces only. */
function roofGeometry(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const section = new THREE.Shape();
  const edge: THREE.Vector2[] = [];
  for (let i = -10; i <= 10; i++) edge.push(new THREE.Vector2(i * depth / 20, roofHeight(Math.abs(i / 10), rise)));
  section.moveTo(edge[0].x, edge[0].y);
  edge.slice(1).forEach(point => section.lineTo(point.x, point.y));
  edge.slice().reverse().forEach(point => section.lineTo(point.x, point.y - 0.075));
  section.closePath();
  const geometry = new THREE.ExtrudeGeometry(section, { depth: width, bevelEnabled: false, steps: 1 });
  geometry.translate(0, 0, -width / 2); geometry.rotateY(Math.PI / 2);
  return geometry;
}
function roof(batch: Batch, width: number, depth: number, y: number, rise: number): void {
  batch.add(roofGeometry(width, depth, rise), 'roof', [0, y, 0], undefined, undefined, undefined, true);
  batch.beam('roof', [-width / 2 - 0.04, y + rise + 0.04, 0], [width / 2 + 0.04, y + rise + 0.04, 0], 0.057, '#46554f');
  for (const sign of [-1, 1]) {
    batch.beam('roof', [-width / 2, y + 0.12, sign * depth / 2], [width / 2, y + 0.12, sign * depth / 2], 0.042, '#48554f');
    for (let x = -width / 2 + 0.17; x < width / 2; x += 0.28) {
      for (let segment = 0; segment < 6; segment++) {
        const a = segment / 6, b = (segment + 1) / 6;
        batch.beam('roof', [x, y + roofHeight(a, rise) + 0.016, sign * depth / 2 * a], [x, y + roofHeight(b, rise) + 0.016, sign * depth / 2 * b], 0.009, '#64716a');
      }
    }
  }
}
function hexRoofGeometry(radius: number, rise: number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [];
  const sides = 6, segments = 6;
  // Parallel top and underside with radial strips; each eave is closed.
  for (let surface = 0; surface < 2; surface++) {
    for (let ring = 0; ring <= segments; ring++) {
      const t = ring / segments;
      for (let side = 0; side < sides; side++) {
        const a = Math.PI / 6 + side * Math.PI / 3;
        vertices.push(Math.cos(a) * radius * Math.max(0.015, t), roofHeight(t, rise) - surface * 0.07, Math.sin(a) * radius * Math.max(0.015, t));
      }
    }
  }
  const surfaceSize = (segments + 1) * sides;
  for (let surface = 0; surface < 2; surface++) {
    const base = surface * surfaceSize;
    for (let ring = 0; ring < segments; ring++) for (let side = 0; side < sides; side++) {
      const a = base + ring * sides + side, b = base + ring * sides + (side + 1) % sides;
      if (surface === 0) indices.push(a, b, a + sides, b, b + sides, a + sides);
      else indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
    for (let side = 1; side < sides - 1; side++) {
      if (surface === 0) indices.push(base, base + side + 1, base + side);
      else indices.push(base, base + side, base + side + 1);
    }
  }
  for (let side = 0; side < sides; side++) {
    const a = segments * sides + side, b = segments * sides + (side + 1) % sides;
    indices.push(a, b + surfaceSize, a + surfaceSize, a, b, b + surfaceSize);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function lattice(batch: Batch, center: Vec3, width: number, height: number, diamond = false): void {
  const [x, y, z] = center;
  for (const edge of [-1, 1]) {
    batch.box('wood', [width + 0.09, 0.065, 0.07], [x, y + edge * height / 2, z], '#71684f');
    batch.box('wood', [0.065, height + 0.09, 0.07], [x + edge * width / 2, y, z], '#71684f');
  }
  for (let column = -1; column <= 1; column++) batch.box('wood', [0.025, height, 0.045], [x + column * width / 4, y, z], '#7b735b');
  for (let row = -1; row <= 1; row++) batch.box('wood', [width, 0.025, 0.045], [x, y + row * height / 4, z], '#7b735b');
  if (diamond) {
    const halfW = width * 0.32, halfH = height * 0.32;
    const points: Vec3[] = [[x, y + halfH, z], [x + halfW, y, z], [x, y - halfH, z], [x - halfW, y, z], [x, y + halfH, z]];
    for (let i = 0; i < 4; i++) batch.beam('wood', points[i], points[i + 1], 0.018, '#665e48');
  }
}
function panelShape(width: number, height: number, apertures: readonly { x: number; y: number; width: number; height: number }[]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0.06); shape.lineTo(width / 2, 0.06); shape.lineTo(width / 2, height); shape.lineTo(-width / 2, height); shape.closePath();
  apertures.forEach(aperture => {
    const hole = new THREE.Path();
    const x = aperture.x - aperture.width / 2, y = aperture.y - aperture.height / 2;
    hole.moveTo(x, y); hole.lineTo(x, y + aperture.height); hole.lineTo(x + aperture.width, y + aperture.height); hole.lineTo(x + aperture.width, y); hole.closePath();
    shape.holes.push(hole);
  }); return shape;
}

function building(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'building' && object.geometry.kind !== 'corridor') throw new Error('Invalid architecture');
  const params = object.geometry;
  const width = params.kind === 'corridor' ? params.length : params.width;
  const depth = params.kind === 'corridor' ? params.width : params.depth;
  const height = params.height;
  const body = new Batch(templates, materials), top = new Batch(templates, materials);
  const group = new THREE.Group();
  if (params.kind === 'building' && params.pavilion) {
    const radius = width * 0.53;
    const platform = new THREE.CylinderGeometry(radius + 0.11, radius + 0.19, 0.22, 6);
    body.add(platform, 'paving', [0, 0.11, 0], undefined, [0, Math.PI / 6, 0], '#c4b99d', true);
    for (let side = 0; side < 6; side++) {
      const a = Math.PI / 6 + side * Math.PI / 3, b = a + Math.PI / 3;
      const start: Vec3 = [Math.cos(a) * radius * 0.8, 0.22, Math.sin(a) * radius * 0.8];
      const end: Vec3 = [start[0], height, start[2]];
      body.beam('wood', start, end, 0.067, '#745b43');
      body.beam('wood', [start[0], height - 0.09, start[2]], [Math.cos(b) * radius * 0.8, height - 0.09, Math.sin(b) * radius * 0.8], 0.061);
      if (side !== 1 && side !== 4) {
        body.beam('wood', [start[0], 0.58, start[2]], [Math.cos(b) * radius * 0.8, 0.58, Math.sin(b) * radius * 0.8], 0.057, '#856b4d');
        body.beam('wood', [start[0], 0.26, start[2]], [start[0], 0.7, start[2]], 0.032);
      }
    }
    top.add(hexRoofGeometry(radius + 0.35, 0.95), 'roof', [0, height, 0], undefined, undefined, undefined, true);
    for (let side = 0; side < 6; side++) {
      const a = Math.PI / 6 + side * Math.PI / 3;
      for (let segment = 0; segment < 6; segment++) {
        const t0 = segment / 6, t1 = (segment + 1) / 6;
        top.beam('roof', [Math.cos(a) * (radius + 0.35) * t0, height + roofHeight(t0, 0.95) + 0.02, Math.sin(a) * (radius + 0.35) * t0], [Math.cos(a) * (radius + 0.35) * t1, height + roofHeight(t1, 0.95) + 0.02, Math.sin(a) * (radius + 0.35) * t1], 0.034, '#53615a');
      }
    }
    top.add(new THREE.SphereGeometry(0.085, 8, 6), 'roof', [0, height + 1.02, 0], undefined, undefined, '#637069', true);
  } else {
    body.box('paving', [width + 0.36, 0.18, depth + 0.34], [0, 0.09, 0], '#c6bca4');
    body.box('paving', [width + 0.17, 0.045, depth + 0.16], [0, 0.2, 0], '#ded4bd');
    const bays = Math.max(2, Math.round(width / 1.8));
    for (let bay = 0; bay <= bays; bay++) {
      const x = (bay / bays - 0.5) * width;
      for (const sign of [-1, 1]) {
        body.beam('wood', [x, 0.22, sign * depth / 2], [x, height, sign * depth / 2], 0.064, '#71553e');
        body.box('stone', [0.18, 0.13, 0.18], [x, 0.22, sign * depth / 2], '#b5ad95');
      }
    }
    for (const sign of [-1, 1]) body.box('wood', [width + 0.08, 0.16, 0.13], [0, height - 0.03, sign * depth / 2]);
    for (let bay = 0; bay < bays; bay++) {
      const x = ((bay + 0.5) / bays - 0.5) * width, bayWidth = width / bays - 0.21;
      body.box('wood', [0.075, 0.12, depth], [x, height - 0.15, 0]);
      if (params.kind === 'building' && !params.open) {
        if (bay !== Math.floor(bays / 2)) {
          body.box('wood', [bayWidth, 0.54, 0.07], [x, 0.53, depth / 2], '#8e7758');
          lattice(body, [x, 1.43, depth / 2], bayWidth * 0.92, 1.03);
        }
        body.box('wood', [bayWidth, 0.26, 0.06], [x, height - 0.25, depth / 2], '#746449');
      } else if (params.kind === 'building' || params.rail) {
        for (const sign of [-1, 1]) {
          if (bay === Math.floor(bays / 2)) continue;
          body.box('wood', [bayWidth, 0.07, 0.08], [x, 0.83, sign * depth / 2], '#8b7153');
          for (const edge of [-1, 1]) body.box('wood', [0.035, 0.5, 0.045], [x + edge * bayWidth * 0.31, 0.54, sign * depth / 2]);
        }
      }
    }
    if (params.kind === 'building' && !params.open) {
      const rear = panelShape(width - 0.16, height - 0.16, [{ x: -width * 0.26, y: 1.38, width: 1.05, height: 0.9 }, { x: width * 0.26, y: 1.38, width: 1.05, height: 0.9 }]);
      body.add(new THREE.ExtrudeGeometry(rear, { depth: 0.13, bevelEnabled: false }), 'wall', [0, 0.22, -depth / 2 - 0.065], undefined, undefined, undefined, true);
      for (const sign of [-1, 1]) {
        lattice(body, [sign * width * 0.26, 1.6, -depth / 2], 1.05, 0.9);
        body.add(new THREE.ExtrudeGeometry(panelShape(depth, height - 0.16, [{ x: 0, y: 1.3, width: depth * 0.48, height: 0.85 }]), { depth: 0.12, bevelEnabled: false }), 'wall', [sign * width / 2 - 0.06, 0.22, 0], undefined, [0, Math.PI / 2, 0], undefined, true);
      }
      for (let step = 0; step < 2; step++) body.box('paving', [width * 0.52, 0.1 - step * 0.035, 0.3], [0, 0.05 - step * 0.0175, depth / 2 + 0.2 + step * 0.29]);
    }
    roof(top, width + 0.53, depth + 0.59, height, params.kind === 'corridor' ? 0.48 : 0.77);
  }
  group.add(body.finish(`body-${object.id}`), top.finish(`roof-${object.id}`));
  return group;
}

function wall(object: SceneObject, templates: Templates, materials: Materials): THREE.Group {
  if (object.geometry.kind !== 'wall') throw new Error('Invalid wall');
  const { width, height, opening } = object.geometry;
  const body = new Batch(templates, materials), top = new Batch(templates, materials);
  const shape = panelShape(width, height, []);
  if (opening === 'moon') {
    const radius = 1.12, center = 1.19;
    const hole = new THREE.Path(); hole.absarc(0, center, radius, 0, Math.PI * 2, true); shape.holes.push(hole);
    const rim = new THREE.Shape(); rim.absarc(0, center, radius + 0.115, 0, Math.PI * 2, false);
    const rimHole = new THREE.Path(); rimHole.absarc(0, center, radius, 0, Math.PI * 2, true); rim.holes.push(rimHole);
    body.add(new THREE.ExtrudeGeometry(rim, { depth: 0.31, bevelEnabled: false, curveSegments: 40 }), 'stone', [0, 0, -0.155], undefined, undefined, '#a5ac99', true);
    body.box('paving', [2.27, 0.07, 0.48], [0, 0.035, 0]);
  } else if (opening === 'lattice') {
    const number = Math.max(1, Math.floor(width / 2.6));
    const windowWidth = Math.min(1.45, width / number - 0.8), windowHeight = Math.min(1.1, height * 0.43), centerY = height * 0.58;
    for (let i = 0; i < number; i++) {
      const centerX = (i - (number - 1) / 2) * Math.min(2.7, width / number);
      const hole = new THREE.Path();
      hole.moveTo(centerX - windowWidth / 2, centerY - windowHeight / 2); hole.lineTo(centerX - windowWidth / 2, centerY + windowHeight / 2);
      hole.lineTo(centerX + windowWidth / 2, centerY + windowHeight / 2); hole.lineTo(centerX + windowWidth / 2, centerY - windowHeight / 2); hole.closePath(); shape.holes.push(hole);
      lattice(body, [centerX, centerY, 0], windowWidth, windowHeight, true);
    }
  }
  body.add(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false, curveSegments: 40 }), 'wall', [0, 0, -0.09], undefined, undefined, undefined, true);
  body.box('stone', [width + 0.06, 0.12, 0.27], [0, 0.06, 0], '#b6b09a');
  roof(top, width + 0.16, 0.54, height + 0.015, 0.19);
  const group = new THREE.Group(); group.add(body.finish(`body-${object.id}`), top.finish(`roof-${object.id}`)); return group;
}

function court(batch: Batch, object: SceneObject): void {
  if (object.geometry.kind !== 'court') return;
  const { width, depth, pattern } = object.geometry;
  batch.box('paving', [width, 0.028, depth], [0, 0.027, 0], '#d9d1bb');
  for (let x = -width / 2 + 0.4; x < width / 2; x += pattern === 'stone' ? 0.62 : 0.76) {
    batch.box('stone', [0.015, 0.003, depth - 0.09], [x, 0.043, 0], '#c3bfa9');
  }
  for (let z = -depth / 2 + 0.4; z < depth / 2; z += 0.7) batch.box('stone', [width - 0.09, 0.003, 0.016], [0, 0.044, z], '#c3bfa9');
}
function bed(batch: Batch, object: SceneObject): void {
  if (object.geometry.kind !== 'bed') return;
  const { width, depth } = object.geometry;
  const border = roundedRect(width, depth, 0.28); border.holes.push(asHole(roundedRect(width - 0.14, depth - 0.14, 0.23)));
  batch.add(new THREE.ExtrudeGeometry(border, { depth: 0.07, bevelEnabled: false }), 'stone', [0, 0.015, 0], undefined, [-Math.PI / 2, 0, 0], '#b3b6a0', true);
  planar(batch, roundedRect(width - 0.12, depth - 0.12, 0.23), 'leaf', 0.022, '#969b74');
}

function rockGeometry(random: () => number): THREE.BufferGeometry {
  const vertices: number[] = [], indices: number[] = [], sides = 9, layers = 5;
  const phase = random() * 6;
  for (let layer = 0; layer < layers; layer++) {
    const t = layer / (layers - 1), radius = [0.8, 1, 0.78, 0.62, 0.2][layer];
    for (let side = 0; side < sides; side++) {
      const a = side / sides * Math.PI * 2 + phase;
      const wrinkle = 1 + 0.09 * Math.sin(a * 3 + layer * 0.9) + 0.05 * Math.cos(a * 5);
      vertices.push(Math.cos(a) * radius * wrinkle + 0.12 * Math.sin(t * 4), t, Math.sin(a) * radius * wrinkle * 0.72 + 0.06 * Math.cos(t * 4));
    }
  }
  for (let layer = 0; layer < layers - 1; layer++) for (let side = 0; side < sides; side++) {
    const a = layer * sides + side, b = layer * sides + (side + 1) % sides;
    indices.push(a, a + sides, b, b, a + sides, b + sides);
  }
  for (let side = 1; side < sides - 1; side++) {
    indices.push(0, side, side + 1);
    const top = (layers - 1) * sides; indices.push(top, top + side + 1, top + side);
  }
  const indexed = new THREE.BufferGeometry(); indexed.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); indexed.setIndex(indices); indexed.computeVertexNormals();
  const result = indexed.toNonIndexed(); indexed.dispose();
  const smooth = result.getAttribute('normal').clone(); result.computeVertexNormals();
  const normals = result.getAttribute('normal'), n = new THREE.Vector3();
  for (let i = 0; i < normals.count; i++) {
    n.set(normals.getX(i) * 0.6 + smooth.getX(i) * 0.4, normals.getY(i) * 0.6 + smooth.getY(i) * 0.4, normals.getZ(i) * 0.6 + smooth.getZ(i) * 0.4).normalize(); normals.setXYZ(i, n.x, n.y, n.z);
  }
  return result;
}
function rockery(batch: Batch, object: SceneObject, random: () => number): void {
  if (object.geometry.kind !== 'rockery') return;
  const { width, depth, height } = object.geometry;
  const rocks: readonly (readonly [number, number, number, number, number])[] = [
    [-0.32, 0.01, 0.2, 0.35, 0.66], [-0.1, -0.13, 0.25, 0.46, 1], [0.17, 0.03, 0.26, 0.42, 0.74], [0.37, -0.05, 0.19, 0.32, 0.48],
    [-0.2, 0.28, 0.22, 0.25, 0.33], [0.14, 0.28, 0.2, 0.26, 0.31],
  ];
  rocks.forEach(([x, z, rx, rz, h], i) => batch.add(rockGeometry(random), 'stone', [x * width, 0.025, z * depth], [width * rx, height * h, depth * rz], [0, i * 0.67, 0], ['#a7aa99', '#b8b7a2', '#9fa58f', '#b3b5a1'][i % 4], true));
}

function leafTemplate(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2), positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const amplitude = 1 + 0.035 * Math.sin(x * 9 + z * 6) + 0.04 * Math.cos(z * 8 - y * 3);
    positions.setXYZ(i, x * amplitude, y * amplitude, z * amplitude);
    const tone = 0.94 + y * 0.07; colors.set([tone, tone, tone], i * 3);
  }
  geometry.computeVertexNormals(); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry;
}
function tree(batch: Batch, object: SceneObject, templates: Templates, random: () => number): void {
  if (object.geometry.kind !== 'tree') return;
  const { height: h, canopy: c, habit, lean = [0, 0] } = object.geometry;
  const pine = habit === 'pine';
  const nodes: Vec3[] = [[0, 0.02, 0], [-0.11, h * 0.25, 0.05], [lean[0] * 0.45, h * 0.52, lean[1] * 0.45], [lean[0], h * 0.78, lean[1]], [lean[0] * 1.1 + 0.12, h * 0.97, lean[1] * 1.1]];
  for (let i = 0; i < nodes.length - 1; i++) batch.beam('wood', nodes[i], nodes[i + 1], 0.11 * (1 - i * 0.19), '#847454', 0.7);
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.27 + (random() - 0.5) * 0.2;
    const level = 0.48 + i * 0.056;
    const reach = c * (i > 5 ? 0.26 : 0.38) * (0.84 + random() * 0.25);
    const root: Vec3 = [lean[0] * level, h * level, lean[1] * level];
    const elbow: Vec3 = [root[0] + Math.cos(angle) * reach * 0.52, h * (level + 0.035), root[2] + Math.sin(angle) * reach * 0.52];
    const tip: Vec3 = [root[0] + Math.cos(angle) * reach, h * (level + 0.08), root[2] + Math.sin(angle) * reach];
    batch.beam('wood', root, elbow, 0.045, '#847454', 0.64); batch.beam('wood', elbow, tip, 0.03, '#847454', 0.55);
    const radius = c * (i > 5 ? 0.21 : 0.26);
    batch.add(templates.foliage, 'leaf', tip, [radius * 1.05, pine ? radius * 0.28 : radius * 0.55, radius * 0.8], [0, angle, pine ? 0.035 : -0.09], i % 3 === 0 ? '#7c8966' : pine ? '#5b7457' : '#70805b');
  }
  batch.add(templates.foliage, 'leaf', nodes[4], [c * 0.25, pine ? c * 0.13 : c * 0.22, c * 0.24], undefined, pine ? '#6a7d5e' : '#7d8a66');
}
function bamboo(batch: Batch, object: SceneObject, templates: Templates, random: () => number): void {
  if (object.geometry.kind !== 'bamboo') return;
  const { height, spread } = object.geometry;
  for (let stem = 0; stem < 5; stem++) {
    const x = (random() - 0.5) * spread, z = (random() - 0.5) * spread, h = height * (0.8 + random() * 0.2), drift = (random() - 0.5) * 0.26;
    batch.beam('wood', [x, 0.02, z], [x + drift, h, z + 0.07], 0.018, '#6b8057');
    for (let leaf = 0; leaf < 5; leaf++) {
      const y = h * (0.35 + leaf * 0.12), angle = leaf * 2.7 + stem;
      const end: Vec3 = [x + drift * y / h + Math.cos(angle) * 0.22, y + 0.06, z + Math.sin(angle) * 0.22];
      batch.beam('wood', [x + drift * y / h, y, z], end, 0.009, '#6f855a');
      batch.add(templates.foliage, 'leaf', end, [0.22, 0.035, 0.07], [0, -angle, 0.18], '#748660');
    }
  }
}

export interface GardenResources { group: THREE.Group; dispose: () => void }
/** One static scene per mount. Every generated and shared resource is released once. */
export function createGarden(): GardenResources {
  const templates: Templates = { box: new THREE.BoxGeometry(1, 1, 1), cylinder: new THREE.CylinderGeometry(1, 1, 1, 7, 1), foliage: leafTemplate() };
  const materials = Object.fromEntries(Object.keys(PALETTE).map(key => [key, new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: key === 'water' ? 0.73 : key === 'roof' ? 0.92 : 0.98, metalness: 0, side: THREE.FrontSide })])) as Materials;
  const garden = new THREE.Group(); garden.name = SCENE_NAME;
  for (const object of SCENE_OBJECTS as readonly SceneObject[]) {
    const batch = new Batch(templates, materials), random = seededRandom(seedFor(object.id));
    let group: THREE.Group;
    switch (object.geometry.kind) {
      case 'building': case 'corridor': group = building(object, templates, materials); break;
      case 'wall': group = wall(object, templates, materials); break;
      case 'base': ground(batch, object); group = batch.finish(`body-${object.id}`); break;
      case 'pond': pond(batch, object); group = batch.finish(`body-${object.id}`); break;
      case 'court': court(batch, object); group = batch.finish(`body-${object.id}`); break;
      case 'bed': bed(batch, object); group = batch.finish(`body-${object.id}`); break;
      case 'rockery': rockery(batch, object, random); group = batch.finish(`body-${object.id}`); break;
      case 'tree': tree(batch, object, templates, random); group = batch.finish(`body-${object.id}`); break;
      case 'bamboo': bamboo(batch, object, templates, random); group = batch.finish(`body-${object.id}`); break;
    }
    group.name = object.id;
    group.userData = { regionId: object.regionId, placeholder: object.placeholder, sourceId: object.sourceId, kind: object.geometry.kind };
    group.position.set(...object.position);
    if (object.rotation) group.rotation.set(...object.rotation);
    garden.add(group);
  }
  Object.values(templates).forEach(geometry => geometry.dispose());
  let disposed = false;
  return { group: garden, dispose: () => {
    if (disposed) return;
    disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    garden.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    geometries.forEach(geometry => geometry.dispose());
    Object.values(materials).forEach(material => material.dispose());
  } };
}
