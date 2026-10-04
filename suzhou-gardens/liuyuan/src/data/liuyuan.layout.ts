export const SCENE_SEED = 20261003;

export const REGION_IDS = ['central-water', 'corridor-courts', 'guanyun-court'] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type Vec3 = readonly [number, number, number];
export type StyleToken = 'warm-stone' | 'still-water' | 'garden-rock' | 'white-wall' | 'wood-and-tile' | 'muted-foliage';

export type SceneGeometry =
  | { kind: 'base'; width: number; depth: number; thickness: number }
  | { kind: 'pond'; width: number; depth: number }
  | { kind: 'mountain'; width: number; depth: number; height: number }
  | { kind: 'building'; width: number; depth: number; height: number; upperFloor?: boolean; open?: boolean }
  | { kind: 'corridor'; length: number; width: number; height: number }
  | { kind: 'wall'; width: number; height: number; opening: 'moon' | 'lattice' }
  | { kind: 'court'; width: number; depth: number }
  | { kind: 'peak'; height: number; secondary?: boolean }
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

// These coordinates describe an art-directed miniature, never a surveyed plan.
export const SCENE_BOUNDS = { min: [-16.2, -0.9, -12.2] as Vec3, max: [16.2, 8, 12.2] as Vec3 } as const;

export const SCENE_OBJECTS = [
  { id: 'garden-base', regionId: 'central-water', position: [0, 0, 0], geometry: { kind: 'base', width: 32, depth: 24, thickness: 0.75 }, style: 'warm-stone', placeholder: false },
  { id: 'central-pond', regionId: 'central-water', position: [-6, 0, -1], geometry: { kind: 'pond', width: 13.5, depth: 12.3 }, style: 'still-water', placeholder: true, sourceId: 'R1' },
  { id: 'west-mountain', regionId: 'central-water', position: [-10.7, 0, -5.2], geometry: { kind: 'mountain', width: 6.8, depth: 4.4, height: 3.7 }, style: 'garden-rock', placeholder: true, sourceId: 'R1' },
  { id: 'hanbi-shanfang', regionId: 'central-water', position: [-6.4, 0, 6.2], geometry: { kind: 'building', width: 8.2, depth: 3.6, height: 2.65 }, style: 'wood-and-tile', placeholder: true, sourceId: 'R1' },
  { id: 'mingse-lou', regionId: 'central-water', position: [-0.65, 0, 6.1], geometry: { kind: 'building', width: 3.7, depth: 3.4, height: 4.8, upperFloor: true }, style: 'wood-and-tile', placeholder: true, sourceId: 'R1' },
  { id: 'west-waterside-pavilion', regionId: 'central-water', position: [-13.1, 0, 1.2], geometry: { kind: 'building', width: 3.2, depth: 2.8, height: 2.3, open: true }, style: 'wood-and-tile', placeholder: true },
  { id: 'southern-connecting-corridor', regionId: 'corridor-courts', position: [5.4, 0, 6], geometry: { kind: 'corridor', length: 2.2, width: 1.65, height: 2.65 }, style: 'wood-and-tile', placeholder: true },
  { id: 'turning-connecting-corridor', regionId: 'corridor-courts', position: [5.65, 0, 0.75], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 9.9, width: 1.7, height: 2.65 }, style: 'wood-and-tile', placeholder: true },
  { id: 'northern-connecting-corridor', regionId: 'corridor-courts', position: [3.35, 0, -4.7], geometry: { kind: 'corridor', length: 5.2, width: 1.6, height: 2.6 }, style: 'wood-and-tile', placeholder: true },
  { id: 'moon-gate', regionId: 'corridor-courts', position: [2.65, 0, 2.7], geometry: { kind: 'wall', width: 6.65, height: 3.4, opening: 'moon' }, style: 'white-wall', placeholder: true },
  { id: 'inner-lattice-wall', regionId: 'corridor-courts', position: [0.25, 0, -0.6], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', width: 6.3, height: 2.55, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'small-corridor-court', regionId: 'corridor-courts', position: [2.65, 0, -0.8], geometry: { kind: 'court', width: 4.4, depth: 5.5 }, style: 'warm-stone', placeholder: true },
  { id: 'guanyun-courtyard', regionId: 'guanyun-court', position: [10.1, 0, -2.2], geometry: { kind: 'court', width: 9.2, depth: 10.8 }, style: 'warm-stone', placeholder: true, sourceId: 'R1' },
  { id: 'east-court-gallery', regionId: 'guanyun-court', position: [10.15, 0, -8.1], geometry: { kind: 'building', width: 9.1, depth: 2.55, height: 2.35, open: true }, style: 'wood-and-tile', placeholder: true },
  { id: 'east-court-wall', regionId: 'guanyun-court', position: [14.4, 0, -2.3], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', width: 10.25, height: 2.45, opening: 'lattice' }, style: 'white-wall', placeholder: true },
  { id: 'guanyun-peak', regionId: 'guanyun-court', position: [9.3, 0, -2.85], rotation: [0, -0.24, 0], geometry: { kind: 'peak', height: 7.25 }, style: 'garden-rock', placeholder: true, sourceId: 'R1' },
  { id: 'guanyun-companion-west', regionId: 'guanyun-court', position: [7.25, 0, -2.25], rotation: [0, 0.35, 0], geometry: { kind: 'peak', height: 2.5, secondary: true }, style: 'garden-rock', placeholder: true },
  { id: 'guanyun-companion-east', regionId: 'guanyun-court', position: [11.65, 0, -3.3], rotation: [0, -0.65, 0], geometry: { kind: 'peak', height: 2.9, secondary: true }, style: 'garden-rock', placeholder: true },
  { id: 'guanyun-small-pool', regionId: 'guanyun-court', position: [9.5, 0, -0.1], geometry: { kind: 'pond', width: 3.55, depth: 2.15 }, style: 'still-water', placeholder: true, sourceId: 'R1' },
  { id: 'west-high-pine', regionId: 'central-water', position: [-12.35, 0, -7.15], geometry: { kind: 'tree', height: 6.4, canopy: 4.1, habit: 'pine', lean: [0.6, 0.35] }, style: 'muted-foliage', placeholder: true },
  { id: 'north-pond-pine', regionId: 'central-water', position: [-5.75, 0, -8.8], geometry: { kind: 'tree', height: 5.1, canopy: 3.15, habit: 'pine', lean: [-0.4, 0.45] }, style: 'muted-foliage', placeholder: true },
  { id: 'west-shore-tree', regionId: 'central-water', position: [-11.55, 0, 4.5], geometry: { kind: 'tree', height: 4.5, canopy: 2.65, habit: 'broadleaf', lean: [-0.4, -0.15] }, style: 'muted-foliage', placeholder: true },
  { id: 'small-court-bamboo', regionId: 'corridor-courts', position: [1.25, 0, -2.9], geometry: { kind: 'bamboo', height: 3.8, spread: 1 }, style: 'muted-foliage', placeholder: true },
  { id: 'east-court-tree', regionId: 'guanyun-court', position: [12.7, 0, -6.1], geometry: { kind: 'tree', height: 4.15, canopy: 2, habit: 'broadleaf', lean: [0.4, -0.15] }, style: 'muted-foliage', placeholder: true },
  { id: 'southern-small-pine', regionId: 'guanyun-court', position: [13.2, 0, 5.2], geometry: { kind: 'tree', height: 3.8, canopy: 2.1, habit: 'pine', lean: [0.35, 0.1] }, style: 'muted-foliage', placeholder: true },
] as const satisfies readonly SceneObject[];

export const SCENE_OBJECT_IDS = SCENE_OBJECTS.map((object) => object.id);
