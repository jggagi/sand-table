import type { RegionId, Vec3 } from './garden.layout';
import { VIEW_CONTENT } from './garden.content';
export type ViewId = 'overview' | 'waterside' | 'pavilion' | 'corridor';
export type Point3 = Vec3;
export interface ViewPreset {
  portraitFraming?: { verticalSpan: number; horizontalSpan: number };
  id: ViewId; label: string; eyebrow: string; description: string;
  regionId: RegionId; focusId: string; position: Point3; target: Point3;
  verticalSpan: number; horizontalSpan: number;
}
export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'overview', ...VIEW_CONTENT.overview, regionId: 'wooded-hill', focusId: 'canglang-pavilion', position: [34, 35, 43], target: [0, 1.45, 0], verticalSpan: 29, horizontalSpan: 43 },
  { id: 'waterside', portraitFraming: { verticalSpan: 19, horizontalSpan: 25 }, ...VIEW_CONTENT.waterside, regionId: 'outside-river', focusId: 'river-outside-garden', position: [-29, 19, 36], target: [-1.2, 1.1, 2.65], verticalSpan: 22.5, horizontalSpan: 34 },
  { id: 'pavilion', portraitFraming: { verticalSpan: 10, horizontalSpan: 14 }, ...VIEW_CONTENT.pavilion, regionId: 'wooded-hill', focusId: 'canglang-pavilion', position: [14, 16.5, 21], target: [-2.4, 3.65, -1.1], verticalSpan: 12, horizontalSpan: 18.8 },
  { id: 'corridor', portraitFraming: { verticalSpan: 11, horizontalSpan: 18 }, ...VIEW_CONTENT.corridor, regionId: 'double-gallery', focusId: 'front-double-gallery', position: [13.4, 8.1, 24], target: [-1.7, 1.3, 5.95], verticalSpan: 11.5, horizontalSpan: 24.2 },
];
export const CAMERA_LIMITS = { minPolarAngle: 0.27, maxPolarAngle: 1.34, minZoomRatio: 0.65, maxZoomRatio: 2.4 } as const;
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
