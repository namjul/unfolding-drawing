import type { LineSegmentId } from './evolu-db';

/**
 * Squared distance from point (px, py) to line segment (x1,y1)-(x2,y2).
 * Avoids sqrt until needed for comparison.
 */
export function distanceSqFromPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) {
    return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

export function distanceFromPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.sqrt(distanceSqFromPointToSegment(px, py, x1, y1, x2, y2));
}

export type LineSegmentWithPositions = {
  id: LineSegmentId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/**
 * Find the first line segment (in list order) within threshold of (cx, cy).
 */
export function findLineSegmentAt(
  cx: number,
  cy: number,
  lineSegments: ReadonlyArray<LineSegmentWithPositions>,
  threshold: number,
): LineSegmentId | null {
  const threshSq = threshold * threshold;
  for (const seg of lineSegments) {
    if (
      distanceSqFromPointToSegment(cx, cy, seg.x1, seg.y1, seg.x2, seg.y2) <=
      threshSq
    ) {
      return seg.id;
    }
  }
  return null;
}
