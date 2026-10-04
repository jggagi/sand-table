import { VIEW_CONTENT } from './garden.content';
import type { RegionId, Vec3 } from './garden.layout';
export type ViewId = 'overview' | 'rockery' | 'waterside' | 'corridor';
export type Point3 = Vec3;
export interface ViewPreset {
  portraitFraming?: { verticalSpan: number; horizontalSpan: number };
  id: ViewId; label: string; eyebrow: string; description: string;
  regionId: RegionId; focusId: string; position: Point3; target: Point3;
  verticalSpan: number; horizontalSpan: number;
}
export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: 'overview', ...VIEW_CONTENT.overview, regionId: 'stone-labyrinth', focusId: 'stone-labyrinth', position: [29, 31, 36], target: [0, 1.0, 0], verticalSpan: 28, horizontalSpan: 40 },
  { id: 'rockery', portraitFraming: { verticalSpan: 15, horizontalSpan: 18 }, ...VIEW_CONTENT.rockery, regionId: 'stone-labyrinth', focusId: 'upper-rock-bridge', position: [-1, 10.0, 28], target: [-4.2, 1.7, -1.0], verticalSpan: 17, horizontalSpan: 23 },
  { id: 'waterside', portraitFraming: { verticalSpan: 16, horizontalSpan: 20 }, ...VIEW_CONTENT.waterside, regionId: 'eastern-water', focusId: 'huxin-pavilion', position: [28, 20, 16], target: [6.3, 0.9, 1.8], verticalSpan: 19, horizontalSpan: 25 },
  { id: 'corridor', portraitFraming: { verticalSpan: 12, horizontalSpan: 16 }, ...VIEW_CONTENT.corridor, regionId: 'turning-courts', focusId: 'moon-window-wall', position: [-22, 11, 20], target: [-8.6, 1.0, 5.1], verticalSpan: 14, horizontalSpan: 21 },
];
export const CAMERA_LIMITS = { minPolarAngle: 0.28, maxPolarAngle: 1.35, minZoomRatio: 0.65, maxZoomRatio: 2.4 } as const;
export function getViewPreset(id: ViewId): ViewPreset {
  const preset = VIEW_PRESETS.find(view => view.id === id);
  if (!preset) throw new Error(`未知观景点：${id}`);
  return preset;
}
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
