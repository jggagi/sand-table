/**
 * Immutable, seeded tree structure for the miniature garden.
 * Positions are in local Y-up model units; `canopy` is the nominal crown diameter.
 * No runtime animation or Three.js object is allocated by this module.
 */
export type Vec3 = readonly [number, number, number];

export interface TreeBranch {
  from: Vec3;
  to: Vec3;
  radiusStart: number;
  radiusEnd: number;
}

export interface TreeFoliage {
  position: Vec3;
  scale: Vec3;
  rotation: Vec3;
  /** Stable 0–1 shade variation within the caller's leaf palette. */
  tone: number;
}

export interface TreePose {
  branches: TreeBranch[];
  foliage: TreeFoliage[];
}

export interface TreePoseOptions {
  height: number;
  canopy: number;
  habit: 'pine' | 'broadleaf';
  seed: number;
  /** Horizontal displacement of the upper trunk, in local model units [x, z]. */
  lean?: readonly [number, number];
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createTreePose(options: TreePoseOptions): TreePose {
  const { height, canopy, habit, seed } = options;
  if (!(height > 0) || !(canopy > 0) || !Number.isFinite(height) || !Number.isFinite(canopy)) throw new Error('Tree dimensions must be positive and finite');
  const random = seededRandom(seed);
  const pine = habit === 'pine';
  const phase = random() * TAU;
  const lean = options.lean ?? [Math.cos(phase) * height * (pine ? 0.09 : 0.055), Math.sin(phase) * height * (pine ? 0.09 : 0.055)];
  const direction = Math.atan2(lean[1], lean[0]) || phase;
  const perpendicular: readonly [number, number] = [-Math.sin(direction), Math.cos(direction)];
  const branches: TreeBranch[] = [];
  const foliage: TreeFoliage[] = [];

  // A coherent bend, rather than independently random trunk joints. The low
  // trunk bows one way; the upper leader turns back toward the light.
  const trunkAt = (t: number): Vec3 => {
    const bend = Math.sin(t * Math.PI * 1.8) * canopy * (pine ? 0.075 : 0.047);
    const leanWeight = t * t * 0.65 + t * 0.35;
    return [lean[0] * leanWeight + perpendicular[0] * bend, height * t, lean[1] * leanWeight + perpendicular[1] * bend];
  };
  const joints = pine ? [0, 0.16, 0.34, 0.53, 0.7, 0.86, 0.96] : [0, 0.18, 0.39, 0.61, 0.78, 0.94];
  joints.slice(1).forEach((t, index) => {
    const previous = joints[index];
    branches.push({
      from: trunkAt(previous), to: trunkAt(t),
      radiusStart: height * lerp(0.029, 0.006, previous),
      radiusEnd: height * lerp(0.029, 0.006, t),
    });
  });

  for (let root = 0; root < 4; root++) {
    const angle = phase + root * TAU / 4 + random() * 0.2;
    branches.push({
      from: trunkAt(0.036),
      to: [Math.cos(angle) * canopy * 0.12, 0.018, Math.sin(angle) * canopy * 0.12],
      radiusStart: height * 0.014, radiusEnd: height * 0.006,
    });
  }

  const addFoliage = (position: Vec3, scale: Vec3, rotation: Vec3, tone: number) => {
    // The little leader crowns the tree without exceeding the nominated
    // height; asymmetric lobes may reach fractionally above their centres.
    foliage.push({ position: [position[0], Math.min(position[1], height - scale[1] * 0.87), position[2]], scale, rotation, tone });
  };

  const count = pine ? 6 : 7;
  const levels = pine ? [0.43, 0.55, 0.66, 0.77, 0.84, 0.91] : [0.48, 0.57, 0.63, 0.71, 0.77, 0.83, 0.9];
  const reaches = pine ? [0.31, 0.37, 0.34, 0.29, 0.24, 0.14] : [0.3, 0.35, 0.32, 0.31, 0.27, 0.23, 0.15];
  for (let branch = 0; branch < count; branch++) {
    const t = levels[branch];
    // Unequal angles and reaches leave openings between foliage masses. The
    // low pine bough points opposite the leaning leader to balance its pose.
    const angle = pine && branch === 0 ? direction + Math.PI + 0.2 : phase + branch * 2.31 + (random() - 0.5) * 0.44;
    const radial: readonly [number, number] = [Math.cos(angle), Math.sin(angle)];
    const across: readonly [number, number] = [-radial[1], radial[0]];
    const reach = canopy * reaches[branch] * (0.94 + random() * 0.12);
    const origin = trunkAt(t - (pine ? 0.065 : 0.11));
    const elbow: Vec3 = [origin[0] + radial[0] * reach * 0.4 + across[0] * canopy * 0.025, height * (t - (pine ? 0.009 : 0.045)), origin[2] + radial[1] * reach * 0.4 + across[1] * canopy * 0.025];
    const tip: Vec3 = [origin[0] + radial[0] * reach, height * (t + (pine ? 0.025 : 0.038)), origin[2] + radial[1] * reach];
    const radius = height * (pine ? 0.012 : 0.013) * (1 - branch * 0.085);
    branches.push({ from: origin, to: elbow, radiusStart: radius, radiusEnd: radius * 0.67 });
    branches.push({ from: elbow, to: tip, radiusStart: radius * 0.67, radiusEnd: radius * 0.27 });

    // Each bough ends in a broken cloud of three or four unequal lobes. These
    // are deliberately offset along a bent bough, rather than stacked discs
    // centred on the trunk or a radial ball crown.
    const lobes = branch === count - 1 ? 3 : 4;
    for (let lobe = 0; lobe < lobes; lobe++) {
      const outward = [0, -0.105, 0.072, -0.058][lobe] * canopy;
      const sideways = [0, 0.125, -0.122, -0.165][lobe] * canopy;
      const rise = (pine ? [-0.004, 0.023, -0.012, 0.038] : [0, 0.026, -0.03, 0.071])[lobe] * height;
      const location: Vec3 = [tip[0] + radial[0] * outward + across[0] * sideways, tip[1] + rise, tip[2] + radial[1] * outward + across[1] * sideways];
      const factor = lobe === 0 ? 1 : 0.66 + random() * 0.16;
      const breadth = canopy * (pine ? 0.205 : 0.197) * factor * (0.9 + random() * 0.15) * (1 - branch * 0.035);
      const thickness = pine ? breadth * (0.39 + random() * 0.14) : breadth * (0.76 + random() * 0.22);
      const scale: Vec3 = [breadth * (1.07 + random() * 0.13), thickness, breadth * (0.73 + random() * 0.21)];
      addFoliage(location, scale, [(random() - 0.5) * (pine ? 0.23 : 0.45), -angle + (random() - 0.5) * 0.5, (random() - 0.5) * (pine ? 0.22 : 0.39)], 0.2 + random() * 0.64);

      if (lobe > 0) {
        const twigOrigin: Vec3 = [lerp(elbow[0], tip[0], 0.63), lerp(elbow[1], tip[1], 0.63), lerp(elbow[2], tip[2], 0.63)];
        branches.push({ from: twigOrigin, to: [location[0], location[1] - thickness * 0.5, location[2]], radiusStart: radius * 0.29, radiusEnd: radius * 0.105 });
      }
    }
  }

  // An off-centre small crown finishes the upper leader, not a large circular
  // cap. Its neighbouring lobe is displaced to keep the outline asymmetric.
  const top = trunkAt(0.945);
  const cap = canopy * (pine ? 0.14 : 0.16);
  addFoliage([top[0] + perpendicular[0] * cap * 0.35, height * 0.965, top[2] + perpendicular[1] * cap * 0.35], [cap * 1.13, cap * (pine ? 0.48 : 0.83), cap * 0.85], [0.1, phase + 0.4, -0.11], 0.78);
  addFoliage([top[0] - perpendicular[0] * cap * 0.65, height * 0.94, top[2] - perpendicular[1] * cap * 0.65], [cap * 0.72, cap * (pine ? 0.38 : 0.65), cap * 0.69], [-0.1, phase - 0.3, 0.12], 0.56);
  return { branches, foliage };
}
