/**
 * Hierarchy rules for choosing the parent of the new place when splitting a line segment.
 * Used by the "Split line segment" transformation.
 */

import type { PlaceId } from './evolu-db';

export type PlaceForDepth = {
  id: PlaceId;
  parentId: PlaceId | null;
};

export type PlaceWithAbs = PlaceForDepth & {
  absX: number;
  absY: number;
  absWorldAngle: number;
};

/** Steps from place to root (root = 0). */
export function placeDepth(
  placeId: PlaceId,
  places: ReadonlyArray<PlaceForDepth>,
): number {
  let depth = 0;
  let currentId: PlaceId | null = placeId;
  const seen = new Set<string>();
  while (currentId != null) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const place = places.find((p) => p.id === currentId);
    if (!place || place.parentId === null) return depth;
    currentId = place.parentId;
    depth += 1;
  }
  return depth;
}

/**
 * Signed distance from place's absolute position to the parent's orientation axis.
 * Axis: line through (parent.absX, parent.absY) in direction of parent.absWorldAngle.
 */
export function distanceToParentAxis(
  placeId: PlaceId,
  places: ReadonlyArray<PlaceForDepth>,
  placesWithAbs: ReadonlyArray<PlaceWithAbs>,
): number {
  const place = placesWithAbs.find((p) => p.id === placeId);
  const parentId = places.find((p) => p.id === placeId)?.parentId;
  if (!place || parentId == null) return 0;
  const parent = placesWithAbs.find((p) => p.id === parentId);
  if (!parent) return 0;
  const dx = place.absX - parent.absX;
  const dy = place.absY - parent.absY;
  const axisAngle = parent.absWorldAngle;
  const perpX = -Math.sin(axisAngle);
  const perpY = Math.cos(axisAngle);
  return dx * perpX + dy * perpY;
}

export type PlaceForTieBreak = PlaceForDepth & {
  createdAt?: unknown;
};

/**
 * Chooses which of placeA or placeB should be the parent of the new place (PlaceC).
 * Rule 1: Lower depth wins.
 * Rule 2: Same depth and same parent → closer to parent's orientation axis wins.
 * Rule 3: Tie → created first wins (createdAt); else compare ids for stability.
 */
export function chooseParentForSplitPlace(
  placeAId: PlaceId,
  placeBId: PlaceId,
  places: ReadonlyArray<PlaceForTieBreak>,
  placesWithAbs: ReadonlyArray<PlaceWithAbs>,
): PlaceId {
  const depthA = placeDepth(placeAId, places);
  const depthB = placeDepth(placeBId, places);
  if (depthA < depthB) return placeAId;
  if (depthB < depthA) return placeBId;

  const placeA = places.find((p) => p.id === placeAId);
  const placeB = places.find((p) => p.id === placeBId);
  if (!placeA || !placeB) return placeAId;

  if (placeA.parentId !== placeB.parentId) {
    return placeAId;
  }

  const distA = Math.abs(distanceToParentAxis(placeAId, places, placesWithAbs));
  const distB = Math.abs(distanceToParentAxis(placeBId, places, placesWithAbs));
  if (distA < distB) return placeAId;
  if (distB < distA) return placeBId;

  const createdA = (placeA as PlaceForTieBreak).createdAt;
  const createdB = (placeB as PlaceForTieBreak).createdAt;
  if (createdA != null && createdB != null) {
    return String(createdA) <= String(createdB) ? placeAId : placeBId;
  }

  return String(placeAId) <= String(placeBId) ? placeAId : placeBId;
}
