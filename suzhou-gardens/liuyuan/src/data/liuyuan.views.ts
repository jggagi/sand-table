import type { RegionId } from './liuyuan.layout';
import { VIEW_CONTENT } from './liuyuan.content';

export type ViewId = 'overview' | 'waterside' | 'corridor' | 'guanyun';
export type Point3 = readonly [number, number, number];
export interface ViewPreset {
  id: ViewId;
  label: string;
  eyebrow: string;
  description: string;
  regionId: RegionId;
  focusId: string;
  position: Point3;
  target: Point3;
  verticalSpan: number;
  horizontalSpan: number;
}

export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'overview', ...VIEW_CONTENT.overview, regionId: 'central-water', focusId: 'hanbi-shanfang', position: [34, 42, 40], target: [0, 1, 0], verticalSpan: 31, horizontalSpan: 44 },
  { id: 'waterside', ...VIEW_CONTENT.waterside, regionId: 'central-water', focusId: 'mingse-lou', position: [-25, 24, -27], target: [-6, 1, 0], verticalSpan: 24, horizontalSpan: 32 },
  { id: 'corridor', ...VIEW_CONTENT.corridor, regionId: 'corridor-courts', focusId: 'moon-gate', position: [2.65, 7.5, 25], target: [2.65, 1.3, 0.5], verticalSpan: 11, horizontalSpan: 20 },
  { id: 'guanyun', ...VIEW_CONTENT.guanyun, regionId: 'guanyun-court', focusId: 'guanyun-peak', position: [22, 14, 20], target: [9.3, 2.3, -2.85], verticalSpan: 14, horizontalSpan: 19 },
];

export const CAMERA_LIMITS = { minPolarAngle: 0.28, maxPolarAngle: 1.35, minZoomRatio: 0.65, maxZoomRatio: 2.4 } as const;
export const getViewPreset = (id: ViewId): ViewPreset => VIEW_PRESETS.find(view => view.id === id)!;
export function getFittedZoom(width: number, height: number, view: ViewPreset): number {
  return Math.max(0.01, Math.min(Math.max(1, height) / view.verticalSpan, Math.max(1, width) / view.horizontalSpan));
}
