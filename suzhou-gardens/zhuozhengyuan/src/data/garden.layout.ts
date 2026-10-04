/** Art-directed spatial compression, not a surveyed ground plan. */
export const SCENE_NAME = 'zhuozhengyuan-artistic-miniature';
export const SCENE_SEED = 202610041;
export const REGION_IDS = ['open-water', 'lotus-islands', 'hall-shore', 'bridge-gallery'] as const;
export type RegionId = (typeof REGION_IDS)[number];
export type Vec3 = readonly [number, number, number];
export type Point2 = readonly [number, number];

export type SceneGeometry =
  | { kind: 'base'; width: number; depth: number; thickness: number }
  | { kind: 'pond'; width: number; depth: number }
  | { kind: 'island'; width: number; depth: number; height: number; outline: 'west' | 'east' }
  | { kind: 'building'; width: number; depth: number; height: number }
  | { kind: 'pavilion'; width: number; depth: number; height: number }
  | { kind: 'corridor'; length: number; width: number; height: number }
  | { kind: 'bridge'; width: number; height: number; points: readonly Point2[] }
  | { kind: 'wall'; width: number; height: number; openings: number }
  | { kind: 'court'; width: number; depth: number }
  | { kind: 'tree'; height: number; canopy: number; habit: 'broadleaf' | 'willow'; lean: Point2 }
  | { kind: 'lotus'; width: number; depth: number; count: number };

export interface SceneObject {
  readonly id: string;
  readonly regionId: RegionId;
  readonly position: Vec3;
  readonly rotation?: Vec3;
  readonly geometry: SceneGeometry;
  readonly placeholder: boolean;
  readonly sourceId?: string;
}

export const SCENE_BOUNDS = { min: [-17.2, -1, -12.7] as Vec3, max: [17.2, 6.8, 12.7] as Vec3 } as const;

export const SCENE_OBJECTS = [
  { id: 'garden-base', regionId: 'open-water', position: [0, 0, 0], geometry: { kind: 'base', width: 34, depth: 25, thickness: 0.82 }, placeholder: false },
  { id: 'broad-pond', regionId: 'open-water', position: [-0.6, 0, 0.7], geometry: { kind: 'pond', width: 26.5, depth: 17.8 }, placeholder: true, sourceId: 'R1' },
  { id: 'west-tree-island', regionId: 'lotus-islands', position: [-6.2, 0.17, -2.55], geometry: { kind: 'island', width: 6.8, depth: 4.5, height: 0.85, outline: 'west' }, placeholder: true, sourceId: 'R1' },
  { id: 'east-tree-island', regionId: 'lotus-islands', position: [4.45, 0.17, -2.0], geometry: { kind: 'island', width: 5.8, depth: 4.6, height: 1.12, outline: 'east' }, placeholder: true, sourceId: 'R1' },
  { id: 'yuanxiang-hall-terrace', regionId: 'hall-shore', position: [-0.7, 0, -8.55], geometry: { kind: 'court', width: 10.6, depth: 5.0 }, placeholder: true },
  { id: 'yuanxiang-hall', regionId: 'hall-shore', position: [-0.7, 0.12, -8.55], geometry: { kind: 'building', width: 8.45, depth: 3.25, height: 2.5 }, placeholder: true, sourceId: 'R2' },
  { id: 'hefeng-pavilion', regionId: 'lotus-islands', position: [-6.1, 0.36, -0.72], geometry: { kind: 'pavilion', width: 2.5, depth: 2.5, height: 2.15 }, placeholder: true, sourceId: 'R2' },
  { id: 'island-zigzag-bridge', regionId: 'bridge-gallery', position: [0, 0, 0], geometry: { kind: 'bridge', width: 1.0, height: 0.53, points: [[-6.1, -0.55], [-3.25, 0.25], [-1.0, 0.25], [0.25, -1.35], [3.2, -1.35], [6.3, -1.7], [8.2, -0.85], [11.9, -3.2]] }, placeholder: true, sourceId: 'R1' },
  { id: 'west-shore-bridge', regionId: 'bridge-gallery', position: [0, 0, 0], geometry: { kind: 'bridge', width: 0.88, height: 0.47, points: [[-12.2, -4.8], [-10.4, -4.2], [-8.55, -3.25]] }, placeholder: true },
  { id: 'east-waterside-gallery', regionId: 'bridge-gallery', position: [14.05, 0, 0.25], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'corridor', length: 12.5, width: 1.4, height: 2.15 }, placeholder: true },
  { id: 'northeast-turn-gallery', regionId: 'bridge-gallery', position: [10.6, 0, -6.7], geometry: { kind: 'corridor', length: 8.1, width: 1.4, height: 2.15 }, placeholder: true },
  { id: 'southeast-turn-gallery', regionId: 'bridge-gallery', position: [11.95, 0, 6.45], geometry: { kind: 'corridor', length: 5.6, width: 1.4, height: 2.15 }, placeholder: true },
  { id: 'east-perforated-boundary', regionId: 'bridge-gallery', position: [16.2, 0, 0.35], rotation: [0, Math.PI / 2, 0], geometry: { kind: 'wall', width: 20.7, height: 1.75, openings: 7 }, placeholder: true },
  { id: 'north-low-wall', regionId: 'hall-shore', position: [-10.2, 0, -10.7], geometry: { kind: 'wall', width: 11.8, height: 1.65, openings: 4 }, placeholder: true },
  { id: 'southern-landing', regionId: 'open-water', position: [-4.3, 0, 10.7], geometry: { kind: 'court', width: 7.4, depth: 1.2 }, placeholder: true },
  { id: 'lotus-west', regionId: 'lotus-islands', position: [-9.75, 0, 1.7], geometry: { kind: 'lotus', width: 2.55, depth: 2.1, count: 21 }, placeholder: true },
  { id: 'lotus-island-edge', regionId: 'lotus-islands', position: [-4.9, 0, 1.2], geometry: { kind: 'lotus', width: 1.65, depth: 1.1, count: 10 }, placeholder: true },
  { id: 'west-island-tree-a', regionId: 'lotus-islands', position: [-7.45, 0.82, -3.55], geometry: { kind: 'tree', height: 4.1, canopy: 3.5, habit: 'broadleaf', lean: [0.36, 0.24] }, placeholder: true },
  { id: 'west-island-tree-b', regionId: 'lotus-islands', position: [-4.7, 0.7, -3.2], geometry: { kind: 'tree', height: 3.45, canopy: 2.8, habit: 'broadleaf', lean: [-0.2, 0.22] }, placeholder: true },
  { id: 'east-island-tree-a', regionId: 'lotus-islands', position: [3.55, 1.1, -2.9], geometry: { kind: 'tree', height: 4.4, canopy: 3.1, habit: 'broadleaf', lean: [0.2, -0.24] }, placeholder: true },
  { id: 'east-island-tree-b', regionId: 'lotus-islands', position: [5.55, 0.7, -2.25], geometry: { kind: 'tree', height: 3.45, canopy: 2.55, habit: 'broadleaf', lean: [0.38, 0.18] }, placeholder: true },
  { id: 'northwest-willow', regionId: 'hall-shore', position: [-11.25, 0.08, -7.7], geometry: { kind: 'tree', height: 4.3, canopy: 3.7, habit: 'willow', lean: [0.52, 0.18] }, placeholder: true },
  { id: 'hall-west-tree', regionId: 'hall-shore', position: [-6.85, 0.07, -8.6], geometry: { kind: 'tree', height: 3.8, canopy: 3.2, habit: 'broadleaf', lean: [-0.3, 0.14] }, placeholder: true },
  { id: 'hall-east-tree', regionId: 'hall-shore', position: [5.55, 0.05, -8.8], geometry: { kind: 'tree', height: 4.35, canopy: 3.65, habit: 'broadleaf', lean: [0.15, 0.15] }, placeholder: true },
  { id: 'west-bank-willow', regionId: 'open-water', position: [-14.05, 0.08, 1.45], geometry: { kind: 'tree', height: 4.8, canopy: 3.8, habit: 'willow', lean: [0.65, -0.1] }, placeholder: true },
  { id: 'southwest-tree', regionId: 'open-water', position: [-11.9, 0.08, 8.2], geometry: { kind: 'tree', height: 3.95, canopy: 3.1, habit: 'broadleaf', lean: [0.3, -0.25] }, placeholder: true },
  { id: 'southeast-willow', regionId: 'open-water', position: [8.8, 0.08, 9.3], geometry: { kind: 'tree', height: 3.7, canopy: 3.0, habit: 'willow', lean: [-0.4, -0.18] }, placeholder: true },
  { id: 'gallery-end-tree', regionId: 'bridge-gallery', position: [13.4, 0.08, 9.2], geometry: { kind: 'tree', height: 3.3, canopy: 2.6, habit: 'broadleaf', lean: [-0.25, 0.1] }, placeholder: true },
] as const satisfies readonly SceneObject[];

export const SCENE_OBJECT_IDS: readonly string[] = SCENE_OBJECTS.map(object => object.id);
