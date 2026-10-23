import type { RegionId } from './garden.layout';
import { VIEW_CONTENT } from './garden.content';

export type ViewId = 'overview' | 'pool' | 'pavilion' | 'courtyard';
export type Point3 = readonly [number, number, number];

export interface ViewPreset {
  portraitFraming?: { verticalSpan: number; horizontalSpan: number };
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
    verticalSpan: 28,
    horizontalSpan: 35,
  },
  {
    id: 'pool', portraitFraming: { verticalSpan: 17, horizontalSpan: 21 },
    ...VIEW_CONTENT.pool,
    regionId: 'caixia-pool',
    focusId: 'caixia-pool',
    position: [-17, 23, 21],
    target: [-1.6, 0.6, 0.15],
    verticalSpan: 19,
    horizontalSpan: 24,
  },
  {
    id: 'pavilion', portraitFraming: { verticalSpan: 12, horizontalSpan: 14 },
    ...VIEW_CONTENT.pavilion,
    regionId: 'waterside-pavilions',
    focusId: 'yuede-feng-lai-pavilion',
    position: [8, 12, 12],
    target: [-6.8, 1.1, -2.1],
    verticalSpan: 14,
    horizontalSpan: 18,
  },
  {
    id: 'courtyard', portraitFraming: { verticalSpan: 12, horizontalSpan: 14 },
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

/** Close views frame their subject on compact canvases; overview always keeps its full envelope. */
export function getViewSpans(width: number, height: number, view: ViewPreset) {
  return width <= 680 && width / Math.max(1, height) <= 1.4 && view.portraitFraming
    ? view.portraitFraming
    : { verticalSpan: view.verticalSpan, horizontalSpan: view.horizontalSpan };
}
export function getFittedZoom(width: number, height: number, view: ViewPreset): number {
  const spans = getViewSpans(width, height, view);
  return Math.max(0.01, Math.min(Math.max(1, height) / spans.verticalSpan, Math.max(1, width) / spans.horizontalSpan));
}
