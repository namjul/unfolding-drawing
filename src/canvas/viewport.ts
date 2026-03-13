import type { SceneBounds } from './scene';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.06;
const MAX_SCALE = 6;
const VIEW_PADDING = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const createViewportToFit = (
  bounds: SceneBounds,
  width: number,
  height: number,
): Viewport => {
  const sceneWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const sceneHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const scaleX = Math.max((width - VIEW_PADDING * 2) / sceneWidth, MIN_SCALE);
  const scaleY = Math.max((height - VIEW_PADDING * 2) / sceneHeight, MIN_SCALE);
  const scale = clamp(Math.min(scaleX, scaleY), MIN_SCALE, 0.28);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    x: width / 2 - centerX * scale,
    y: height / 2 - centerY * scale,
  };
};

export const screenToWorld = (
  viewport: Viewport,
  screenX: number,
  screenY: number,
) => ({
  x: (screenX - viewport.x) / viewport.scale,
  y: (screenY - viewport.y) / viewport.scale,
});

export const zoomViewportAt = (
  viewport: Viewport,
  amount: number,
  originX: number,
  originY: number,
): Viewport => {
  const nextScale = clamp(viewport.scale * amount, MIN_SCALE, MAX_SCALE);

  if (nextScale === viewport.scale) {
    return viewport;
  }

  const worldX = (originX - viewport.x) / viewport.scale;
  const worldY = (originY - viewport.y) / viewport.scale;

  return {
    scale: nextScale,
    x: originX - worldX * nextScale,
    y: originY - worldY * nextScale,
  };
};
