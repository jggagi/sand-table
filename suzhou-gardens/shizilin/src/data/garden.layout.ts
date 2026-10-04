/** Artist-designed spatial relationships; coordinates are not a surveyed plan. */
export const SCENE_SEED = 2026100417;
export const SCENE_NAME = 'shizilin-artistic-miniature';
export type Vec3 = readonly [number, number, number];
export const REGION_IDS = ['stone-labyrinth', 'eastern-water', 'turning-courts'] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type StyleToken = 'warm-stone' | 'garden-rock' | 'still-water' | 'wood-and-tile' | 'white-wall' | 'muted-foliage';
export type SceneGeometry =
  | { kind: 'base'; width: number; depth: number; thickness: number }
  | { kind: 'rockery'; width: number; depth: number; height: number }
  | { kind: 'pond'; width: number; depth: number }
  | { kind: 'building'; width: number; depth: number; height: number; open?: boolean; roof?: 'hip' | 'gable' }
  | { kind: 'corridor'; length: number; width: number; height: number }
  | { kind: 'bridge'; length: number; width: number; height: number; rise: number; stone?: boolean }
  | { kind: 'wall'; width: number; height: number; opening: 'moon' | 'lattice' | 'none' }
  | { kind: 'court'; width: number; depth: number }
  | { kind: 'tree'; height: number; canopy: number; habit: 'pine' | 'broadleaf'; lean?: readonly [number, number] }
  | { kind: 'bamboo'; height: number; spread: number };
export interface SceneObject {
  readonly id: string;
  readonly regionId: RegionId;
  readonly position: Vec3;
  readonly rotation?: Vec3;
  readonly scale?: Vec3;
  readonly geometry: SceneGeometry;
  readonly style: StyleToken;
  readonly placeholder: boolean;
  readonly sourceId?: string;
}
export const SCENE_BOUNDS = { min: [-14.2, -0.85, -11.7] as Vec3, max: [14.2, 6.3, 11.7] as Vec3 } as const;
export const SCENE_OBJECTS = [
  { id: 'garden-base', regionId: 'stone-labyrinth', position: [0, 0, 0], geometry: { kind: 'base', width: 28, depth: 23, thickness: 0.78 }, style: 'warm-stone', placeholder: false },
  { id: 'stone-labyrinth', regionId: 'stone-labyrinth', position: [-3.7, 0, -1.2], geometry: { kind: 'rockery', width: 15.6, depth: 11.7, height: 5.8 }, style: 'garden-rock', placeholder: true, sourceId: 'R1' },
  { id: 'upper-rock-bridge', regionId: 'stone-labyrinth', position: [-6.6, 0, -2.05], rotation: [0, -0.16, 0], geometry: { kind: 'bridge', length: 5.6, width: 0.92, height: 3.36, rise: 0.2 }, style: 'wood-and-tile', placeholder: true, sourceId: 'R1' },
  { id: 'eastern-pond', regionId: 'eastern-water', position: [6.75, 0, 2.0], geometry: { kind: 'pond', width: 10.5, depth: 9.8 }, style: 'still-water', placeholder: true, sourceId: 'R1' },
  { id: 'huxin-pavilion', regionId: 'eastern-water', position: [8.7, 0.13, 2.9], geometry: { kind: 'building', width: 2.7, depth: 2.6, height: 2.35, open: true, roof: 'hip' }, style: 'wood-and-tile', placeholder: true, sourceId: 'R2' },
  { id: 'waterside-stone-bridge', regionId: 'eastern-water', position: [7.8, 0, 5.95], rotation: [0, Math.PI / 2 + 0.2, 0], geometry: { kind: 'bridge', length: 3.95, width: 1.1, height: 0.38, rise: 0.6, stone: true }, style: 'warm-stone', placeholder: true },
  { id: 'zhenqu-pavilion', regionId: 'turning-courts', position: [-0.45, 0, 6.7], geometry: { kind: 'building', width: 3.2, depth: 2.75, height: 2.5, open: true, roof: 'hip' }, style: 'wood-and-tile', placeholder: true, sourceId: 'R2' },
  { id: 'north-turning-corridor', regionId: 'turning-courts', position: [-3.0, 0, -9.25], geometry: { kind: 'corridor', length: 18.6, width: 1.45, height: 2.35 }, style: 'wood-and-tile', placeholder: true },
  { id: 'west-returning-corridor', regionId: 'turning-courts', position: [-12.2, 0, -4.35], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 8.5, width: 1.45, height: 2.35 }, style: 'wood-and-tile', placeholder: true },
  { id: 'east-returning-corridor', regionId: 'turning-courts', position: [11.65, 0, -5.6], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 7.25, width: 1.45, height: 2.35 }, style: 'wood-and-tile', placeholder: true },
  { id: 'southern-quiet-gallery', regionId: 'turning-courts', position: [3.6, 0, 9.0], geometry: { kind: 'corridor', length: 9.3, width: 1.45, height: 2.3 }, style: 'wood-and-tile', placeholder: true },
  { id: 'moon-window-wall', regionId: 'turning-courts', position: [-9.4, 0, 7.6], geometry: { kind: 'wall', width: 5.2, height: 2.35, opening: 'moon' }, style: 'white-wall', placeholder: true },
  { id: 'northern-lattice-wall', regionId: 'turning-courts', position: [7.7, 0, -8.2], geometry: { kind: 'wall', width: 5.9, height: 2.3, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'southern-small-court', regionId: 'turning-courts', position: [-5.4, 0, 6.7], geometry: { kind: 'court', width: 8.4, depth: 3.8 }, style: 'warm-stone', placeholder: true },
  { id: 'western-stone-path', regionId: 'stone-labyrinth', position: [-10.8, 0, 2.7], geometry: { kind: 'court', width: 1.45, depth: 8.1 }, style: 'warm-stone', placeholder: true },
  { id: 'western-old-pine', regionId: 'stone-labyrinth', position: [-10.25, 0, -6.65], geometry: { kind: 'tree', height: 5.65, canopy: 3.1, habit: 'pine', lean: [0.75, 0.25] }, style: 'muted-foliage', placeholder: true },
  { id: 'water-edge-tree', regionId: 'eastern-water', position: [12.0, 0, 9.4], geometry: { kind: 'tree', height: 4.8, canopy: 2.65, habit: 'broadleaf', lean: [-0.3, -0.55] }, style: 'muted-foliage', placeholder: true },
  { id: 'court-bamboo', regionId: 'turning-courts', position: [-10.4, 0, 6.0], geometry: { kind: 'bamboo', height: 3.2, spread: 0.75 }, style: 'muted-foliage', placeholder: true },
  { id: 'north-small-pine', regionId: 'turning-courts', position: [6.6, 0, -6.2], geometry: { kind: 'tree', height: 3.6, canopy: 2.0, habit: 'pine', lean: [-0.4, 0.3] }, style: 'muted-foliage', placeholder: true },
] as const satisfies readonly SceneObject[];
export const SCENE_OBJECT_IDS = SCENE_OBJECTS.map(object => object.id);

/** Raycasting evidence targets are world coordinates, using FrontSide material. */
export const ROCKERY_PROBES = {
  throughCave: { origin: [-6.7, 1.25, 6.8] as Vec3, direction: [0, 0, -1] as Vec3, far: 16 },
  adjacentSolid: { origin: [-8.3, 1.25, 6.8] as Vec3, direction: [0, 0, -1] as Vec3, far: 16 },
  caveCeiling: { origin: [-6.7, 1.25, -1.2] as Vec3, direction: [0, 1, 0] as Vec3, far: 6 },
} as const;
