import type { RegionId, Vec3 } from './garden.layout';
import { VIEW_CONTENT } from './garden.content';

export type ViewId = 'overview' | 'lotus' | 'hall' | 'bridge';
export type Point3 = Vec3;
export interface ViewPreset {
  portraitFraming?: { verticalSpan: number; horizontalSpan: number };
  id: ViewId;
  label: string;
  eyebrow: string;
  description: string;
  regionId: RegionId;
  focusId: string;
  position: Vec3;
  target: Vec3;
  verticalSpan: number;
  horizontalSpan: number;
}

export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'overview', ...VIEW_CONTENT.overview, regionId: 'open-water', focusId: 'broad-pond', position: [31, 35, 43], target: [0, 1, 0], verticalSpan: 29, horizontalSpan: 43 },
  { id: 'lotus', portraitFraming: { verticalSpan: 14, horizontalSpan: 18 }, ...VIEW_CONTENT.lotus, regionId: 'lotus-islands', focusId: 'hefeng-pavilion', position: [-22, 15, 22], target: [-6.5, 1.7, -0.7], verticalSpan: 16.5, horizontalSpan: 23 },
  { id: 'hall', portraitFraming: { verticalSpan: 15, horizontalSpan: 21 }, ...VIEW_CONTENT.hall, regionId: 'hall-shore', focusId: 'yuanxiang-hall', position: [-1, 15, 24], target: [-0.7, 1.5, -7.3], verticalSpan: 18, horizontalSpan: 28 },
  { id: 'bridge', portraitFraming: { verticalSpan: 16, horizontalSpan: 22 }, ...VIEW_CONTENT.bridge, regionId: 'bridge-gallery', focusId: 'island-zigzag-bridge', position: [25, 20, 19], target: [3.9, 1.2, -1.1], verticalSpan: 20, horizontalSpan: 29 },
];

export const CAMERA_LIMITS = { minPolarAngle: 0.28, maxPolarAngle: 1.35, minZoomRatio: 0.65, maxZoomRatio: 2.4 } as const;
export const getViewPreset = (id: ViewId): ViewPreset => VIEW_PRESETS.find(view => view.id === id)!;
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
