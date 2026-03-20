import type {
  DisplayPlace,
  PendingTransformationState,
  PersistedPlace,
} from '../drawing/types';
import {
  buildPlaceMap,
  calculateDelta,
  computeWorldPosition,
  isDescendantOf,
} from './hierarchy';

export interface SceneBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EMPTY_SCENE_BOUNDS: SceneBounds = {
  minX: -160,
  minY: -120,
  maxX: 160,
  maxY: 120,
};

export const deriveDisplayPlaces = (
  places: ReadonlyArray<PersistedPlace>,
  pendingTransformation: PendingTransformationState,
): ReadonlyArray<DisplayPlace> => {
  // Build place map for hierarchy traversal
  const placeMap = buildPlaceMap(places);

  // Compute world positions for all places
  const computeWorld = (place: PersistedPlace) =>
    computeWorldPosition(place, placeMap);

  const nextPlaces = places.map<DisplayPlace>((place) => {
    const worldPos = computeWorld(place);
    return {
      ...place,
      x: worldPos.x,
      y: worldPos.y,
      parentPlaceId: place.parentPlaceId,
      isDraft: false,
      isMarkedForDeletion: false,
    };
  });

  switch (pendingTransformation.kind) {
    case 'addPlace': {
      const draftWorld = computeWorldPosition(
        pendingTransformation.place,
        placeMap,
      );
      return [
        ...nextPlaces,
        {
          ...pendingTransformation.place,
          x: draftWorld.x,
          y: draftWorld.y,
          isDraft: true,
          isMarkedForDeletion: false,
        },
      ];
    }
    case 'addRelatedPlace': {
      // Draft related place: compute world from stored offset + parent world
      const draftWorld = computeWorldPosition(
        pendingTransformation.place,
        placeMap,
      );
      return [
        ...nextPlaces,
        {
          ...pendingTransformation.place,
          x: draftWorld.x,
          y: draftWorld.y,
          isDraft: true,
          isMarkedForDeletion: false,
        },
      ];
    }
    case 'movePlace': {
      const movedPlaceId = pendingTransformation.placeId;
      const movedPlace = placeMap.get(movedPlaceId);
      if (!movedPlace) {
        return nextPlaces;
      }

      // Calculate delta from current world position to target
      const currentWorld = computeWorldPosition(movedPlace, placeMap);
      const delta = calculateDelta(currentWorld, pendingTransformation.to);

      // Apply delta to moved place and all descendants
      return nextPlaces.map((place) => {
        if (place.id === movedPlaceId) {
          // The moved place itself
          return {
            ...place,
            x: pendingTransformation.to.x,
            y: pendingTransformation.to.y,
          };
        }
        if (isDescendantOf(place.id, movedPlaceId, placeMap)) {
          // Descendant: add delta to their world position
          return {
            ...place,
            x: place.x + delta.x,
            y: place.y + delta.y,
          };
        }
        return place;
      });
    }
    case 'deletePlace': {
      const deletedPlaceId = pendingTransformation.placeId;
      // Mark place and all descendants for deletion
      return nextPlaces.map((place) => {
        if (place.id === deletedPlaceId) {
          return { ...place, isMarkedForDeletion: true };
        }
        if (isDescendantOf(place.id, deletedPlaceId, placeMap)) {
          return { ...place, isMarkedForDeletion: true };
        }
        return place;
      });
    }
    default:
      return nextPlaces;
  }
};

export const getDisplayBounds = (
  places: ReadonlyArray<DisplayPlace>,
): SceneBounds => {
  if (places.length === 0) {
    return EMPTY_SCENE_BOUNDS;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const place of places) {
    minX = Math.min(minX, place.x - 36);
    minY = Math.min(minY, place.y - 36);
    maxX = Math.max(maxX, place.x + 36);
    maxY = Math.max(maxY, place.y + 36);
  }

  return { minX, minY, maxX, maxY };
};

export const getPlaceLabel = (place: DisplayPlace, index: number): string => {
  if (place.name && place.name.trim().length > 0) {
    return place.name;
  }

  if (place.isDraft) {
    return 'Draft place';
  }

  return `Place ${index + 1}`;
};
