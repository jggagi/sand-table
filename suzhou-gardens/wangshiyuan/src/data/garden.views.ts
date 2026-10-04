import type { RegionId } from './garden.layout';
import { VIEW_CONTENT } from './garden.content';

export type ViewId = 'overview' | 'pool' | 'pavilion' | 'courtyard';
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

/** Camera spans describe the miniature's composition, not surveyed garden dimensions. */
export const VIEW_PRESETS: readonly ViewPreset[] = [
  {
    id: 'overview',
    ...VIEW_CONTENT.overview,
    regionId: 'caixia-pool',
    focusId: 'caixia-pool',
    position: [31, 35, 35],
    target: [0, 1.3, 0],
    verticalSpan: 31,
    horizontalSpan: 38,
  },
  {
    id: 'pool',
    ...VIEW_CONTENT.pool,
    regionId: 'caixia-pool',
    focusId: 'caixia-pool',
    position: [-17, 23, 21],
    target: [-1.6, 0.6, 0.15],
    verticalSpan: 19,
    horizontalSpan: 24,
  },
  {
    id: 'pavilion',
    ...VIEW_CONTENT.pavilion,
    regionId: 'waterside-pavilions',
    focusId: 'yuede-feng-lai-pavilion',
    position: [8, 12, 12],
    target: [-6.8, 1.1, -2.1],
    verticalSpan: 14,
    horizontalSpan: 18,
  },
  {
    id: 'courtyard',
    ...VIEW_CONTENT.courtyard,
    regionId: 'dianchun-courtyard',
    focusId: 'dianchun-study',
    position: [16, 18, 21],
    target: [6.6, 1.1, -3.3],
    verticalSpan: 15,
    horizontalSpan: 18,
  },
];

export const CAMERA_LIMITS = {
  minPolarAngle: 0.28,
  maxPolarAngle: 1.35,
  minZoomRatio: 0.65,
  maxZoomRatio: 2.4,
} as const;

export const getViewPreset = (id: ViewId): ViewPreset =>
  VIEW_PRESETS.find(view => view.id === id)!;

/** Fit both viewport dimensions so portrait screens retain the whole overview. */
export function getFittedZoom(width: number, height: number, view: ViewPreset): number {
  return Math.max(
    0.01,
    Math.min(
      Math.max(1, height) / view.verticalSpan,
      Math.max(1, width) / view.horizontalSpan,
    ),
  );
}
