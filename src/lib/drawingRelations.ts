import type { PlaceId } from './evolu-db';

type PlaceWithParent = {
  id: PlaceId;
  parentId: PlaceId | null;
};

type PlaceWithPosition = PlaceWithParent & {
  absX: number;
  absY: number;
};

function getDescendantIds(
  placeId: PlaceId,
  places: ReadonlyArray<PlaceWithParent>,
): PlaceId[] {
  const direct = places.filter((p) => p.parentId === placeId).map((p) => p.id);
  return direct.flatMap((id) => [id, ...getDescendantIds(id, places)]);
}

export function getRelatedPlaceIds(
  selectedPlaceId: PlaceId | null,
  places: ReadonlyArray<PlaceWithParent>,
): { parentId: PlaceId | null; descendantIds: PlaceId[] } {
  if (!selectedPlaceId) {
    return { parentId: null, descendantIds: [] };
  }
  const selected = places.find((p) => p.id === selectedPlaceId);
  if (!selected) {
    return { parentId: null, descendantIds: [] };
  }
  const parentId = selected.parentId;
  const descendantIds = getDescendantIds(selectedPlaceId, places);
  return { parentId, descendantIds };
}

export type RelationshipSegment = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  direction: 'parent-to-selected' | 'selected-to-child';
};

/**
 * Returns line segments for visualizing parent and child relationships
 * when a place is selected. When the selected place is being dragged,
 * pass placesWithPositions that already account for the move override
 * (e.g. from placesWithAbsolutePositions with moveOverride).
 */
export function getRelationshipSegments(
  selectedPlaceId: PlaceId | null,
  placesWithPositions: ReadonlyArray<PlaceWithPosition>,
): RelationshipSegment[] {
  if (!selectedPlaceId) return [];
  const segments: RelationshipSegment[] = [];
  const selected = placesWithPositions.find((p) => p.id === selectedPlaceId);
  if (!selected) return [];

  const { parentId, descendantIds } = getRelatedPlaceIds(
    selectedPlaceId,
    placesWithPositions,
  );

  if (parentId) {
    const parent = placesWithPositions.find((p) => p.id === parentId);
    if (parent) {
      segments.push({
        from: { x: parent.absX, y: parent.absY },
        to: { x: selected.absX, y: selected.absY },
        direction: 'parent-to-selected',
      });
    }
  }

  const subtreeIds = new Set([selectedPlaceId, ...descendantIds]);
  for (const p of placesWithPositions) {
    if (p.parentId && subtreeIds.has(p.parentId) && subtreeIds.has(p.id)) {
      const parent = placesWithPositions.find((x) => x.id === p.parentId);
      if (parent) {
        segments.push({
          from: { x: parent.absX, y: parent.absY },
          to: { x: p.absX, y: p.absY },
          direction: 'selected-to-child',
        });
      }
    }
  }

  return segments;
}
