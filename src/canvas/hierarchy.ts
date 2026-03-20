import type { PersistedPlace } from '../drawing/types';

// Generic place type that works with both PersistedPlace and DraftPlace
type PlaceLike = {
  id: string;
  x: number;
  y: number;
  parentPlaceId: string | null;
};

/**
 * Build a lookup map from place ID to place for efficient hierarchy traversal.
 */
export const buildPlaceMap = (
  places: ReadonlyArray<PersistedPlace>,
): Map<string, PersistedPlace> => {
  const placeMap = new Map<string, PersistedPlace>();
  for (const place of places) {
    placeMap.set(place.id, place);
  }
  return placeMap;
};

/**
 * Compute world position for a place.
 *
 * This function handles the DUAL COORDINATE INTERPRETATION:
 * - Root places (parentPlaceId === null): stored (x, y) = world coordinates
 * - Child places (parentPlaceId !== null): stored (x, y) = offset from parent
 *
 * For root places, returns stored coordinates directly.
 * For child places, recursively computes parent world position and adds offset.
 *
 * @param place - The place to compute world position for
 * @param placeMap - Map of all places for parent lookup
 * @param visited - Set of visited place IDs (for cycle detection)
 * @returns World coordinates { x, y }
 */
export const computeWorldPosition = (
  place: PlaceLike,
  placeMap: Map<string, PersistedPlace>,
  visited = new Set<string>(),
): { x: number; y: number } => {
  // Root place: stored (x, y) is already world coordinates
  if (place.parentPlaceId === null) {
    return { x: place.x, y: place.y };
  }

  // Orphan: parent doesn't exist, fallback to treating offset as world position
  const parent = placeMap.get(place.parentPlaceId);
  if (!parent) {
    return { x: place.x, y: place.y };
  }

  // Cycle detection: prevent infinite recursion
  if (visited.has(place.id)) {
    return { x: place.x, y: place.y };
  }
  visited.add(place.id);

  // Child place: recursively compute parent world, then add child offset
  const parentWorld = computeWorldPosition(parent, placeMap, visited);
  return {
    x: parentWorld.x + place.x,
    y: parentWorld.y + place.y,
  };
};

/**
 * Check if a place is a descendant of an ancestor (direct or indirect).
 *
 * @param placeId - ID of the place to check
 * @param ancestorId - ID of the potential ancestor
 * @param placeMap - Map of all places for parent lookup
 * @param visited - Set of visited place IDs (for cycle detection)
 * @returns true if placeId is a descendant of ancestorId
 */
export const isDescendantOf = (
  placeId: string,
  ancestorId: string,
  placeMap: Map<string, PersistedPlace>,
  visited = new Set<string>(),
): boolean => {
  const place = placeMap.get(placeId);
  if (!place) return false;
  if (place.parentPlaceId === null) return false;
  if (place.parentPlaceId === ancestorId) return true;

  // Cycle detection
  if (visited.has(placeId)) return false;
  visited.add(placeId);

  return isDescendantOf(place.parentPlaceId, ancestorId, placeMap, visited);
};

/**
 * Get all descendants of a place (children, grandchildren, etc.).
 *
 * @param ancestorId - ID of the ancestor place
 * @param placeMap - Map of all places
 * @returns Array of all descendant places
 */
export const getDescendants = (
  ancestorId: string,
  placeMap: Map<string, PersistedPlace>,
): ReadonlyArray<PersistedPlace> => {
  const descendants: PersistedPlace[] = [];
  for (const place of placeMap.values()) {
    if (isDescendantOf(place.id, ancestorId, placeMap)) {
      descendants.push(place);
    }
  }
  return descendants;
};

/**
 * Calculate the world position delta for a move operation.
 *
 * @param fromWorld - Starting world position
 * @param toWorld - Target world position
 * @returns Delta { x, y }
 */
export const calculateDelta = (
  fromWorld: { x: number; y: number },
  toWorld: { x: number; y: number },
): { x: number; y: number } => ({
  x: toWorld.x - fromWorld.x,
  y: toWorld.y - fromWorld.y,
});
