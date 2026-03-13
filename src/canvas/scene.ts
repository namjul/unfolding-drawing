import type {
  DisplayPlace,
  PendingTransformationState,
  PersistedPlace,
} from '../drawing/types';

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
  const nextPlaces = places.map<DisplayPlace>((place) => ({
    ...place,
    parentPlaceId: place.parentPlaceId,
    isDraft: false,
    isMarkedForDeletion: false,
  }));

  switch (pendingTransformation.kind) {
    case 'addPlace':
      return [
        ...nextPlaces,
        {
          ...pendingTransformation.place,
          isDraft: true,
          isMarkedForDeletion: false,
        },
      ];
    case 'movePlace':
      return nextPlaces.map((place) =>
        place.id === pendingTransformation.placeId
          ? {
              ...place,
              x: pendingTransformation.to.x,
              y: pendingTransformation.to.y,
            }
          : place,
      );
    case 'deletePlace':
      return nextPlaces.map((place) =>
        place.id === pendingTransformation.placeId
          ? { ...place, isMarkedForDeletion: true }
          : place,
      );
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
