/** Art-directed spatial compression; these coordinates are not a surveyed plan. */
export const SCENE_SEED = 2026100403;
export const SCENE_NAME = 'wangshiyuan-artistic-miniature';
export const REGION_IDS = ['caixia-pool', 'waterside-pavilions', 'dianchun-courtyard'] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type Vec3 = readonly [number, number, number];
export type StyleToken = 'warm-stone' | 'still-water' | 'garden-rock' | 'white-wall' | 'wood-and-tile' | 'muted-foliage';
export type SceneGeometry =
  | { kind: 'base'; width: number; depth: number; thickness: number }
  | { kind: 'pond'; width: number; depth: number }
  | { kind: 'building'; width: number; depth: number; height: number; open?: boolean; pavilion?: boolean }
  | { kind: 'corridor'; length: number; width: number; height: number; rail?: boolean }
  | { kind: 'wall'; width: number; height: number; opening: 'moon' | 'lattice' | 'none' }
  | { kind: 'court'; width: number; depth: number; pattern?: 'grid' | 'stone' }
  | { kind: 'rockery'; width: number; depth: number; height: number }
  | { kind: 'tree'; height: number; canopy: number; habit: 'pine' | 'broadleaf'; lean?: readonly [number, number] }
  | { kind: 'bed'; width: number; depth: number }
  | { kind: 'bamboo'; height: number; spread: number };
export interface SceneObject {
  readonly id: string;
  readonly regionId: RegionId;
  readonly position: Vec3;
  readonly rotation?: Vec3;
  readonly geometry: SceneGeometry;
  readonly style: StyleToken;
  readonly placeholder: boolean;
  readonly sourceId?: string;
}
export const SCENE_BOUNDS = { min: [-12, -0.75, -10] as Vec3, max: [12, 6.2, 10] as Vec3 } as const;
export const SCENE_OBJECTS = [
  { id: 'garden-base', regionId: 'caixia-pool', position: [0, 0, 0], geometry: { kind: 'base', width: 24, depth: 20, thickness: 0.7 }, style: 'warm-stone', placeholder: false },
  { id: 'caixia-pool', regionId: 'caixia-pool', position: [-1.6, 0, 0.15], geometry: { kind: 'pond', width: 10.8, depth: 8.4 }, style: 'still-water', placeholder: true, sourceId: 'W1' },
  { id: 'zhuoying-water-pavilion', regionId: 'waterside-pavilions', position: [-0.2, 0, 5.4], geometry: { kind: 'building', width: 5.4, depth: 2.7, height: 2.5, open: true }, style: 'wood-and-tile', placeholder: true, sourceId: 'W1' },
  { id: 'yuede-feng-lai-pavilion', regionId: 'waterside-pavilions', position: [-7.9, 0, -2.2], geometry: { kind: 'building', width: 3, depth: 3, height: 2.25, pavilion: true, open: true }, style: 'wood-and-tile', placeholder: true, sourceId: 'W1' },
  { id: 'dianchun-study', regionId: 'dianchun-courtyard', position: [7.1, 0, -6.7], geometry: { kind: 'building', width: 5.2, depth: 2.5, height: 2.3 }, style: 'wood-and-tile', placeholder: true, sourceId: 'W1' },
  { id: 'dianchun-inner-court', regionId: 'dianchun-courtyard', position: [7.1, 0, -3], geometry: { kind: 'court', width: 5.7, depth: 5.2, pattern: 'stone' }, style: 'warm-stone', placeholder: true },
  { id: 'east-quiet-gallery', regionId: 'dianchun-courtyard', position: [10.1, 0, -3.5], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 6.4, width: 1.2, height: 2.15, rail: false }, style: 'wood-and-tile', placeholder: true },
  { id: 'pool-side-gallery', regionId: 'dianchun-courtyard', position: [4.1, 0, -3.1], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 5.8, width: 1.05, height: 2.05, rail: true }, style: 'wood-and-tile', placeholder: true },
  { id: 'south-link-gallery', regionId: 'waterside-pavilions', position: [4.9, 0, 5.4], geometry: { kind: 'corridor', length: 4.2, width: 1.25, height: 2.1, rail: true }, style: 'wood-and-tile', placeholder: true },
  { id: 'dianchun-moon-gate', regionId: 'dianchun-courtyard', position: [6.9, 0, 0.55], geometry: { kind: 'wall', width: 5.4, height: 2.9, opening: 'moon' }, style: 'white-wall', placeholder: true },
  { id: 'inner-court-leak-window', regionId: 'dianchun-courtyard', position: [9.95, 0, -0.15], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', width: 3.8, height: 2.35, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'north-pool-leak-window', regionId: 'caixia-pool', position: [-0.2, 0, -6.6], geometry: { kind: 'wall', width: 6.8, height: 2.15, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'north-garden-screen', regionId: 'caixia-pool', position: [-7.2, 0, -7.5], geometry: { kind: 'wall', width: 5.4, height: 1.65, opening: 'none' }, style: 'white-wall', placeholder: true },
  { id: 'west-garden-screen', regionId: 'waterside-pavilions', position: [-10.2, 0, 0.4], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', width: 11.3, height: 1.55, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'caixia-north-rockery', regionId: 'caixia-pool', position: [-5.7, 0, -4.7], geometry: { kind: 'rockery', width: 4.3, depth: 2.3, height: 1.9 }, style: 'garden-rock', placeholder: true },
  { id: 'court-rock-foot', regionId: 'dianchun-courtyard', position: [5.55, 0, -2.8], geometry: { kind: 'rockery', width: 1.3, depth: 1.2, height: 1.05 }, style: 'garden-rock', placeholder: true },
  { id: 'west-walk', regionId: 'waterside-pavilions', position: [-8.5, 0, 3.5], geometry: { kind: 'court', width: 1.5, depth: 7.4, pattern: 'grid' }, style: 'warm-stone', placeholder: true },
  { id: 'front-approach', regionId: 'waterside-pavilions', position: [-0.3, 0, 7.6], geometry: { kind: 'court', width: 7.3, depth: 1.6, pattern: 'grid' }, style: 'warm-stone', placeholder: true },
  { id: 'east-approach', regionId: 'dianchun-courtyard', position: [6.9, 0, 3.1], geometry: { kind: 'court', width: 3.3, depth: 3.6, pattern: 'grid' }, style: 'warm-stone', placeholder: true },
  { id: 'dianchun-tree-bed', regionId: 'dianchun-courtyard', position: [7.8, 0, -2.6], geometry: { kind: 'bed', width: 2.0, depth: 2.05 }, style: 'muted-foliage', placeholder: true },
  { id: 'west-walk-bed', regionId: 'waterside-pavilions', position: [-9.4, 0, 6.4], geometry: { kind: 'bed', width: 2.35, depth: 3.2 }, style: 'muted-foliage', placeholder: true },
  { id: 'north-pine-bed', regionId: 'caixia-pool', position: [-5.4, 0, -7], geometry: { kind: 'bed', width: 2.4, depth: 2 }, style: 'muted-foliage', placeholder: true },
  { id: 'north-waterside-pine', regionId: 'caixia-pool', position: [-5.4, 0, -6.6], geometry: { kind: 'tree', height: 4.8, canopy: 3, habit: 'pine', lean: [0.48, 0.4] }, style: 'muted-foliage', placeholder: true },
  { id: 'pavilion-shade-tree', regionId: 'waterside-pavilions', position: [-8.4, 0, 0.4], geometry: { kind: 'tree', height: 3.7, canopy: 2.1, habit: 'broadleaf', lean: [-0.35, 0.15] }, style: 'muted-foliage', placeholder: true },
  { id: 'southwest-pine', regionId: 'waterside-pavilions', position: [-9.2, 0, 6.3], geometry: { kind: 'tree', height: 3.6, canopy: 2.3, habit: 'pine', lean: [0.36, -0.3] }, style: 'muted-foliage', placeholder: true },
  { id: 'dianchun-court-tree', regionId: 'dianchun-courtyard', position: [7.8, 0, -2.6], geometry: { kind: 'tree', height: 3.65, canopy: 1.9, habit: 'broadleaf', lean: [-0.35, -0.1] }, style: 'muted-foliage', placeholder: true },
  { id: 'dianchun-bamboo', regionId: 'dianchun-courtyard', position: [9.4, 0, -5], geometry: { kind: 'bamboo', height: 2.5, spread: 0.65 }, style: 'muted-foliage', placeholder: true },
] as const satisfies readonly SceneObject[];
export const SCENE_OBJECT_IDS = SCENE_OBJECTS.map(object => object.id);
