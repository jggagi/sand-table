/** All coordinates are an artistic compression, never a surveyed garden plan. */
export const SCENE_SEED = 2026100427;
export const SCENE_NAME = 'canglangting-artistic-miniature';
export type Vec3 = readonly [number, number, number];
export const REGION_IDS = ['outside-river', 'double-gallery', 'wooded-hill', 'quiet-hall'] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type SceneGeometry =
  | { kind: 'base'; width: number; depth: number; thickness: number }
  | { kind: 'river'; width: number; depth: number; channelWidth: number }
  | { kind: 'hill'; width: number; depth: number; height: number }
  | { kind: 'building'; width: number; depth: number; height: number; open: boolean; pavilion?: boolean }
  | { kind: 'double-corridor'; length: number; width: number; height: number; bays: number }
  | { kind: 'wall'; length: number; height: number; opening: 'lattice' | 'door' }
  | { kind: 'court'; width: number; depth: number }
  | { kind: 'path'; width: number; depth: number; rise?: number; steps?: number }
  | { kind: 'rock'; width: number; depth: number; height: number }
  | { kind: 'tree'; height: number; canopy: number; habit: 'pine' | 'broadleaf'; lean: readonly [number, number] }
  | { kind: 'bamboo'; height: number; spread: number };
export interface SceneObject {
  readonly id: string;
  readonly regionId: RegionId;
  readonly position: Vec3;
  readonly rotation?: Vec3;
  readonly geometry: SceneGeometry;
  readonly placeholder: boolean;
  readonly sourceId?: string;
}
export const SCENE_BOUNDS = { min: [-15.3, -0.9, -12.3] as Vec3, max: [15.3, 9.9, 12.3] as Vec3 } as const;

export const SCENE_OBJECTS = [
  { id: 'miniature-plinth', regionId: 'outside-river', position: [0, 0, 0], geometry: { kind: 'base', width: 30, depth: 24, thickness: 0.72 }, placeholder: false },
  { id: 'river-outside-garden', regionId: 'outside-river', position: [0, 0, 0], geometry: { kind: 'river', width: 28, depth: 20.5, channelWidth: 2.75 }, placeholder: true, sourceId: 'R1' },
  { id: 'wooded-earth-hill', regionId: 'wooded-hill', position: [-2.4, 0, -1.1], geometry: { kind: 'hill', width: 14.4, depth: 13, height: 2.55 }, placeholder: true, sourceId: 'R1' },
  { id: 'canglang-pavilion', regionId: 'wooded-hill', position: [-2.4, 2.55, -1.1], geometry: { kind: 'building', width: 3.75, depth: 3.5, height: 2.3, open: true, pavilion: true }, placeholder: true, sourceId: 'R2' },
  { id: 'front-double-gallery', regionId: 'double-gallery', position: [0.05, 0, 6.15], geometry: { kind: 'double-corridor', length: 21.7, width: 2.55, height: 2.4, bays: 10 }, placeholder: true, sourceId: 'R3' },
  { id: 'west-double-gallery', regionId: 'double-gallery', position: [-10.45, 0, -0.27], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'double-corridor', length: 10.5, width: 2.55, height: 2.4, bays: 5 }, placeholder: true, sourceId: 'R3' },
  { id: 'quiet-hall', regionId: 'quiet-hall', position: [8.35, 0, -2.3], geometry: { kind: 'building', width: 7.8, depth: 4.3, height: 2.5, open: false }, placeholder: true, sourceId: 'R4' },
  { id: 'hall-forecourt', regionId: 'quiet-hall', position: [8.35, 0, 2.0], geometry: { kind: 'court', width: 8, depth: 3.8 }, placeholder: true },
  { id: 'east-garden-wall', regionId: 'quiet-hall', position: [13.7, 0, -1.7], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', length: 13.5, height: 2.3, opening: 'lattice' }, placeholder: true },
  { id: 'rear-garden-wall', regionId: 'wooded-hill', position: [1.8, 0, -9.8], geometry: { kind: 'wall', length: 23.6, height: 2.15, opening: 'lattice' }, placeholder: true },
  { id: 'gallery-to-hill-steps', regionId: 'wooded-hill', position: [-2.4, 0, 3.45], geometry: { kind: 'path', width: 1.45, depth: 4.7, rise: 2.55, steps: 13 }, placeholder: true },
  { id: 'hill-to-hall-path', regionId: 'quiet-hall', position: [3.0, 0, 2.6], rotation: [0, -0.36, 0], geometry: { kind: 'path', width: 1.7, depth: 4.5 }, placeholder: true },
  { id: 'western-hill-ledge', regionId: 'wooded-hill', position: [-7.65, 0.1, -1.7], rotation: [0, -0.1, 0], geometry: { kind: 'rock', width: 3.1, depth: 2.4, height: 2.4 }, placeholder: true },
  { id: 'southern-hill-ledge', regionId: 'wooded-hill', position: [-5.2, 0.0, 3.55], rotation: [0, 0.7, 0], geometry: { kind: 'rock', width: 3.2, depth: 2.2, height: 1.95 }, placeholder: true },
  { id: 'northern-weathered-stone', regionId: 'wooded-hill', position: [-0.1, 0.2, -6.3], geometry: { kind: 'rock', width: 3.3, depth: 2.3, height: 1.8 }, placeholder: true },
  { id: 'riverbank-low-stone', regionId: 'outside-river', position: [-12.9, 0.1, 7.9], geometry: { kind: 'rock', width: 1.8, depth: 1.25, height: 0.55 }, placeholder: true },
  { id: 'hill-rear-leaning-pine', regionId: 'wooded-hill', position: [-5.65, 1.66, -4.3], geometry: { kind: 'tree', height: 6.15, canopy: 4.6, habit: 'pine', lean: [-0.95, 0.45] }, placeholder: true },
  { id: 'hill-west-bent-pine', regionId: 'wooded-hill', position: [-7.45, 1.39, -0.5], geometry: { kind: 'tree', height: 5.5, canopy: 3.55, habit: 'pine', lean: [-0.8, -0.25] }, placeholder: true },
  { id: 'hill-east-pine', regionId: 'wooded-hill', position: [1.75, 1.24, -3.8], geometry: { kind: 'tree', height: 5.25, canopy: 3.85, habit: 'pine', lean: [0.65, -0.1] }, placeholder: true },
  { id: 'hill-front-slant-pine', regionId: 'wooded-hill', position: [-6.6, 1.43, 2.0], geometry: { kind: 'tree', height: 4.6, canopy: 3.5, habit: 'pine', lean: [-0.6, 0.7] }, placeholder: true },
  { id: 'rear-left-canopy', regionId: 'wooded-hill', position: [-8.05, 0.08, -7.9], geometry: { kind: 'tree', height: 5.9, canopy: 3.8, habit: 'broadleaf', lean: [0.2, 0.6] }, placeholder: true },
  { id: 'rear-central-canopy', regionId: 'wooded-hill', position: [-2.0, 0.04, -8.0], geometry: { kind: 'tree', height: 5.6, canopy: 4.25, habit: 'broadleaf', lean: [-0.45, 0.3] }, placeholder: true },
  { id: 'rear-right-canopy', regionId: 'wooded-hill', position: [3.9, 0.05, -7.4], geometry: { kind: 'tree', height: 5.1, canopy: 3.6, habit: 'broadleaf', lean: [0.55, 0.15] }, placeholder: true },
  { id: 'wooded-north-understorey', regionId: 'wooded-hill', position: [-4.0, 1.17, -6.0], geometry: { kind: 'tree', height: 3.9, canopy: 2.8, habit: 'broadleaf', lean: [0.25, -0.2] }, placeholder: true },
  { id: 'wooded-slope-understorey', regionId: 'wooded-hill', position: [2.4, 1.65, -0.55], geometry: { kind: 'tree', height: 3.55, canopy: 2.7, habit: 'broadleaf', lean: [0.4, 0.35] }, placeholder: true },
  { id: 'hall-rear-small-pine', regionId: 'quiet-hall', position: [10.9, 0.05, -6.8], geometry: { kind: 'tree', height: 4.5, canopy: 3, habit: 'pine', lean: [0.3, -0.4] }, placeholder: true },
  { id: 'hall-side-spreading-tree', regionId: 'quiet-hall', position: [12.2, 0.05, 1.7], geometry: { kind: 'tree', height: 4.0, canopy: 2.8, habit: 'broadleaf', lean: [-0.5, 0.35] }, placeholder: true },
  { id: 'river-front-solitary-pine', regionId: 'outside-river', position: [11.75, 0.04, 8.1], geometry: { kind: 'tree', height: 3.85, canopy: 2.75, habit: 'pine', lean: [0.6, 0.25] }, placeholder: true },
  { id: 'west-rear-water-tree', regionId: 'outside-river', position: [-12.35, 0.03, -8.75], geometry: { kind: 'tree', height: 3.4, canopy: 2.45, habit: 'broadleaf', lean: [-0.3, 0.2] }, placeholder: true },
  { id: 'hall-side-bamboo', regionId: 'quiet-hall', position: [12.4, 0, -4.3], geometry: { kind: 'bamboo', height: 3.1, spread: 1.0 }, placeholder: true },
  { id: 'wooded-east-bamboo', regionId: 'wooded-hill', position: [3.3, 0.08, -5.2], geometry: { kind: 'bamboo', height: 3.4, spread: 1.1 }, placeholder: true },
] as const satisfies readonly SceneObject[];
export const SCENE_OBJECT_IDS = SCENE_OBJECTS.map(object => object.id);
