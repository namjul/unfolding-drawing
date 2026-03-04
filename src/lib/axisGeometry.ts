/**
 * Axis geometry: world position/orientation of an axis and viewport line segment.
 * An axis is a scaffolding line child of a place; its origin is the parent place
 * and its direction is parent world angle + axis.angle.
 */

import type { AxisId, PlaceId } from './evolu-db';

export type AxisWithPlace = {
  id: AxisId;
  placeId: PlaceId;
  angle: number;
};

export type PlaceWithAbs = {
  id: PlaceId;
  absX: number;
  absY: number;
  absWorldAngle: number;
};

/**
 * Returns axis origin (parent place position) and world angle (parent world angle + axis.angle).
 */
export function getAxisWorldGeometry(
  axis: AxisWithPlace,
  placesWithAbs: ReadonlyArray<PlaceWithAbs>,
): { originX: number; originY: number; worldAngle: number } {
  const parent = placesWithAbs.find((p) => p.id === axis.placeId);
  if (!parent) {
    return { originX: 0, originY: 0, worldAngle: axis.angle };
  }
  const worldAngle = parent.absWorldAngle + axis.angle;
  return {
    originX: parent.absX,
    originY: parent.absY,
    worldAngle,
  };
}

/**
 * Viewport in canvas coordinates (same space as places/axes).
 */
export type ViewportCanvas = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Intersection of an infinite line with a rectangle.
 * Line: origin + t * (cos(angle), sin(angle)) for t in (-inf, +inf).
 * Returns the segment (x1,y1)-(x2,y2) that lies inside the viewport, or null if no intersection.
 * Expands the viewport by margin so the line extends slightly past the visible edges.
 */
export function axisSegmentInViewport(
  originX: number,
  originY: number,
  angle: number,
  viewport: ViewportCanvas,
  margin = 100,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const left = viewport.left - margin;
  const right = viewport.left + viewport.width + margin;
  const top = viewport.top - margin;
  const bottom = viewport.top + viewport.height + margin;

  const ts: number[] = [];
  if (Math.abs(dx) > 1e-9) {
    const tLeft = (left - originX) / dx;
    const tRight = (right - originX) / dx;
    const yAtLeft = originY + tLeft * dy;
    const yAtRight = originY + tRight * dy;
    if (yAtLeft >= top && yAtLeft <= bottom) ts.push(tLeft);
    if (yAtRight >= top && yAtRight <= bottom) ts.push(tRight);
  }
  if (Math.abs(dy) > 1e-9) {
    const tTop = (top - originY) / dy;
    const tBottom = (bottom - originY) / dy;
    const xAtTop = originX + tTop * dx;
    const xAtBottom = originX + tBottom * dx;
    if (xAtTop >= left && xAtTop <= right) ts.push(tTop);
    if (xAtBottom >= left && xAtBottom <= right) ts.push(tBottom);
  }

  const validTs = ts.filter((t) => Number.isFinite(t));
  if (validTs.length < 2) {
    const tMin = -10000;
    const tMax = 10000;
    return {
      x1: originX + tMin * dx,
      y1: originY + tMin * dy,
      x2: originX + tMax * dx,
      y2: originY + tMax * dy,
    };
  }
  const tMin = Math.min(...validTs);
  const tMax = Math.max(...validTs);
  return {
    x1: originX + tMin * dx,
    y1: originY + tMin * dy,
    x2: originX + tMax * dx,
    y2: originY + tMax * dy,
  };
}

/**
 * Project point (px, py) onto the infinite line through (originX, originY) with given angle.
 * Returns the signed distance along the axis from origin to the projected point
 * (positive in direction of angle).
 */
export function projectPointOntoAxis(
  px: number,
  py: number,
  originX: number,
  originY: number,
  angle: number,
): number {
  const dx = px - originX;
  const dy = py - originY;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return dx * ux + dy * uy;
}
