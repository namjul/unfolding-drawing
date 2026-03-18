import type { InferRow, Query, QueryRows } from '@evolu/common';
import type { NotNull } from 'kysely';
import { createEffect, createSignal, onCleanup } from 'solid-js';
import { deriveDisplayPlaces, getDisplayBounds } from './canvas/scene';
import type {
  PendingTransformationState,
  PersistedPlace,
  TransformationEntry,
  TransformationKind,
} from './drawing/types';
import { evolu, useEvolu } from './lib/evolu-db';

const placesQuery = evolu.createQuery((db) =>
  db
    .selectFrom('place')
    .select(['id', 'name', 'x', 'y', 'angle', 'parentPlaceId', 'placementMode'])
    .where('isDeleted', 'is not', 1)
    .where('x', 'is not', null)
    .where('y', 'is not', null)
    .where('placementMode', 'is not', null)
    .$narrowType<{
      x: NotNull;
      y: NotNull;
      placementMode: NotNull;
    }>()
    .orderBy('createdAt'),
);

const transformationsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('transformation')
    .select(['id', 'kind', 'timestamp', 'sequence', 'payload'])
    .where('isDeleted', 'is not', 1)
    .where('kind', 'is not', null)
    .where('timestamp', 'is not', null)
    .where('sequence', 'is not', null)
    .where('payload', 'is not', null)
    .$narrowType<{
      kind: NotNull;
      payload: NotNull;
      sequence: NotNull;
      timestamp: NotNull;
    }>()
    .orderBy('sequence'),
);

const useLiveQuery = <Q extends Query, Value>(
  query: Q,
  initialValue: Value,
  mapRows: (rows: QueryRows<InferRow<Q>>) => Value,
) => {
  const evolu = useEvolu();
  const [value, setValue] = createSignal(initialValue);
  const [isLoaded, setIsLoaded] = createSignal(false);

  createEffect(() => {
    let isActive = true;

    const applyRows = (rows: QueryRows<InferRow<Q>>) => {
      if (!isActive) {
        return;
      }

      setValue(() => mapRows(rows));
      setIsLoaded(true);
    };

    void evolu.loadQuery(query).then((rows) => {
      applyRows(rows as QueryRows<InferRow<Q>>);
    });

    const unsubscribe = evolu.subscribeQuery(query)(() => {
      applyRows(evolu.getQueryRows(query) as QueryRows<InferRow<Q>>);
    });

    onCleanup(() => {
      isActive = false;
      unsubscribe();
    });
  });

  return {
    isLoaded,
    value,
  };
};

const mapPlaces = (
  rows: QueryRows<InferRow<typeof placesQuery>>,
): ReadonlyArray<PersistedPlace> =>
  rows.map((row) => ({
    id: row.id,
    name: row.name,
    x: row.x,
    y: row.y,
    angle: row.angle,
    parentPlaceId: row.parentPlaceId,
    placementMode: row.placementMode,
  }));

const isTransformationKind = (value: string): value is TransformationKind =>
  value === 'addPlace' ||
  value === 'movePlace' ||
  value === 'deletePlace' ||
  value === 'resetDrawing';

const mapTransformations = (
  rows: QueryRows<InferRow<typeof transformationsQuery>>,
): ReadonlyArray<TransformationEntry> =>
  rows.flatMap((row) => {
    if (!isTransformationKind(row.kind)) {
      return [];
    }

    return [
      {
        id: row.id,
        kind: row.kind,
        timestamp: row.timestamp,
        sequence: row.sequence,
        payload: row.payload,
      },
    ];
  });

export const useDrawingState = () => {
  const placesState = useLiveQuery(
    placesQuery,
    [] as ReadonlyArray<PersistedPlace>,
    mapPlaces,
  );
  const transformationsState = useLiveQuery(
    transformationsQuery,
    [] as ReadonlyArray<TransformationEntry>,
    mapTransformations,
  );

  const derivePlaces = (pendingTransformation: PendingTransformationState) =>
    deriveDisplayPlaces(placesState.value(), pendingTransformation);

  return {
    deriveDisplayPlaces: derivePlaces,
    getDisplayBounds,
    places: placesState.value,
    placesLoaded: placesState.isLoaded,
    transformations: transformationsState.value,
    transformationsLoaded: transformationsState.isLoaded,
  };
};
