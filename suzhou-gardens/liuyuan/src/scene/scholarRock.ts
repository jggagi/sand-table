import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

type Profile = readonly [number, number, number, number];

/** Height, half-width, half-depth, lateral movement. An asymmetric continuous silhouette. */
const PROFILE: readonly Profile[] = [
  [0.000, 0.130, 0.099, -0.012],
  [0.035, 0.120, 0.093, -0.013],
  [0.095, 0.071, 0.070, -0.030],
  [0.170, 0.068, 0.067, -0.036],
  [0.260, 0.091, 0.075, -0.025],
  [0.350, 0.112, 0.083, -0.001],
  [0.425, 0.091, 0.076, 0.008],
  [0.490, 0.077, 0.067, 0.008],
  [0.565, 0.119, 0.079, 0.014],
  [0.635, 0.104, 0.076, 0.006],
  [0.710, 0.094, 0.071, -0.021],
  [0.775, 0.083, 0.066, -0.013],
  [0.835, 0.049, 0.055, 0.006],
  [0.895, 0.061, 0.058, 0.025],
  [0.940, 0.092, 0.066, 0.046],
  [0.975, 0.062, 0.052, 0.040],
  [1.000, 0.020, 0.023, 0.015],
];

/** The supporting stones have low shoulders and a broken sloping top, not a miniature main peak. */
const SECONDARY_PROFILE: readonly Profile[] = [
  [0.000, 0.188, 0.134, -0.020],
  [0.045, 0.186, 0.128, -0.024],
  [0.130, 0.148, 0.110, -0.027],
  [0.265, 0.162, 0.112, -0.012],
  [0.405, 0.182, 0.120, 0.019],
  [0.505, 0.208, 0.131, 0.029],
  [0.620, 0.157, 0.104, 0.021],
  [0.720, 0.104, 0.080, 0.056],
  [0.815, 0.120, 0.090, 0.040],
  [0.900, 0.108, 0.093, 0.006],
  [0.963, 0.061, 0.058, -0.039],
  [1.000, 0.019, 0.021, -0.062],
];

function profileAt(y: number, secondary: boolean): readonly [number, number, number] {
  const profile = secondary ? SECONDARY_PROFILE : PROFILE;
  const clamped = THREE.MathUtils.clamp(y, 0, 1);
  let i = 0;
  while (i < profile.length - 2 && profile[i + 1][0] < clamped) i++;
  const a = profile[i];
  const b = profile[i + 1];
  const t = THREE.MathUtils.smoothstep(clamped, a[0], b[0]);
  return [THREE.MathUtils.lerp(a[1], b[1], t), THREE.MathUtils.lerp(a[2], b[2], t), THREE.MathUtils.lerp(a[3], b[3], t)];
}

function ellipseDistance(x: number, y: number, radiusX: number, radiusY: number): number {
  return (Math.hypot(x / radiusX, y / radiusY) - 1) * Math.min(radiusX, radiusY);
}

function smoothMax(a: number, b: number, radius: number): number {
  const h = Math.max(radius - Math.abs(a - b), 0) / radius;
  return Math.max(a, b) + h * h * radius * 0.25;
}

/**
 * A carved scholar's rock, rather than a stack of independent primitives.
 * A sampled continuous stone field is cut by irregular through-tunnels
 * (three in the main peak, one low opening in each broader supporting stone).
 * Only the final immutable position / normal / colour buffers escape this function.
 * Dimensions are artistic estimates, not a measured reconstruction of Guanyun Peak.
 */
export function createScholarRock(height: number, seed: number, secondary = false): THREE.BufferGeometry {
  if (!(height > 0) || !Number.isFinite(height)) throw new Error('Scholar rock height must be positive and finite.');
  const resolution = secondary ? 36 : 64;
  const triangleLimit = secondary ? 10000 : 45000;
  const temporaryMaterial = new THREE.MeshBasicMaterial();
  const surface = new MarchingCubes(resolution, temporaryMaterial, false, false, triangleLimit);
  surface.isolation = 0;
  const phase = ((seed >>> 0) % 4096) / 4096 * Math.PI * 2;
  // An anisotropic sampling box spends vertices on the tall narrow sculpture.
  const xSpan = secondary ? 0.310 : 0.235;
  const zSpan = secondary ? 0.215 : 0.195;
  const ySpan = 0.565;
  const yCentre = 0.505;

  for (let iz = 0; iz < resolution; iz++) {
    const z = (iz / resolution * 2 - 1) * zSpan;
    for (let iy = 0; iy < resolution; iy++) {
      const y = (iy / resolution * 2 - 1) * ySpan + yCentre;
      const [width, depth, centre] = profileAt(y, secondary);
      const zCentre = 0.016 * Math.sin(y * 7.5 + 0.4) - 0.008 * y;
      for (let ix = 0; ix < resolution; ix++) {
        const x = (ix / resolution * 2 - 1) * xSpan;
        const shiftedX = x - centre - Math.sin(y * 13 + phase) * 0.0035;
        const shiftedZ = z - zCentre;
        const angle = Math.atan2(shiftedZ / depth, shiftedX / width);
        // Weathering follows the stone's height: broad ridges with subdued finer grooves.
        const fold = 0.009 * Math.exp(-Math.pow((y - 0.225) / 0.065, 2) - Math.pow((angle - 1.45) / 0.6, 2))
          + 0.007 * Math.exp(-Math.pow((y - 0.430) / 0.045, 2) - Math.pow((angle - 0.95) / 0.5, 2))
          + 0.010 * Math.exp(-Math.pow((y - 0.660) / 0.080, 2) - Math.pow((angle - 2.15) / 0.65, 2))
          + 0.007 * Math.exp(-Math.pow((y - 0.890) / 0.040, 2) - Math.pow((angle + 1.70) / 0.8, 2));
        const ridge = 0.008 * Math.sin(angle * 3 + y * 9) - fold;
        let distance = ellipseDistance(shiftedX, shiftedZ, width, depth) - ridge;
        // Closed base and irregular pointed cap. SDF subtraction preserves true depth.
        distance = Math.max(distance, -y, y - 1.006);
        const frontWarp = shiftedZ * 0.12 + 0.0035 * Math.sin(shiftedZ * 31 + phase);
        const lowerX = x + (secondary ? 0.044 : 0.019) + frontWarp;
        const lowerY = y - (secondary ? 0.315 : 0.345) + 0.065 * shiftedZ;
        const middleX = x - 0.039 - shiftedZ * 0.10;
        const middleY = y - 0.566 - shiftedZ * 0.14;
        const upperX = x + 0.024 + shiftedZ * 0.20;
        const upperY = y - 0.740 + shiftedZ * 0.10;
        const lowerTunnel = ellipseDistance(
          lowerX * 0.976 + lowerY * 0.218 + lowerY * lowerY * 0.7,
          -lowerX * 0.218 + lowerY * 0.976,
          secondary ? 0.045 : 0.046,
          secondary ? 0.058 : 0.080,
        );
        const middleTunnel = ellipseDistance(
          middleX * 0.939 - middleY * 0.343,
          middleX * 0.343 + middleY * 0.939,
          secondary ? 0.027 : 0.035,
          secondary ? 0.044 : 0.060,
        );
        const upperTunnel = ellipseDistance(
          upperX * 0.921 + upperY * 0.389,
          -upperX * 0.389 + upperY * 0.921,
          secondary ? 0.021 : 0.027,
          secondary ? 0.025 : 0.035,
        );
        // A small fillet at the rim makes holes read as erosion rather than drilled disks.
        distance = smoothMax(distance, -lowerTunnel, 0.008);
        if (!secondary) {
          distance = smoothMax(distance, -middleTunnel, 0.007);
          distance = smoothMax(distance, -upperTunnel, 0.005);
        }
        const q = iz * resolution * resolution + iy * resolution + ix;
        surface.field[q] = -distance;
      }
    }
  }

  surface.update();
  if (surface.count / 3 > triangleLimit) {
    surface.geometry.dispose();
    temporaryMaterial.dispose();
    throw new Error('Scholar rock exceeded its triangle budget.');
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(surface.positionArray.slice(0, surface.count * 3), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(surface.normalArray.slice(0, surface.count * 3), 3));
  geometry.applyMatrix4(new THREE.Matrix4().makeScale(xSpan, ySpan, zSpan));
  geometry.translate(0, yCentre, 0);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const actualHeight = bounds.max.y - bounds.min.y;
  geometry.translate(0, -bounds.min.y, 0);
  geometry.scale(height / actualHeight, height / actualHeight, height / actualHeight);

  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / height;
    const y = position.getY(i) / height;
    const z = position.getZ(i) / height;
    // Multipliers are intentionally subtle. Lighting, not painted black holes, defines form.
    const value = 0.968 + 0.037 * Math.sin(y * 22 + z * 12 + phase)
      + 0.018 * Math.sin(x * 48 - y * 11 + z * 30);
    colours[i * 3] = value;
    colours[i * 3 + 1] = value;
    colours[i * 3 + 2] = value;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  geometry.userData = { artisticEstimate: true, seed, secondary, carvedThroughHoles: secondary ? 1 : 3 };
  surface.geometry.dispose();
  temporaryMaterial.dispose();
  return geometry;
}
