import type { Setter } from 'solid-js';
import { createSignal } from 'solid-js';
import { buildPlaceMap, computeWorldPosition } from './canvas/hierarchy';
import type { Viewport } from './canvas/viewport';
import type { PersistedPlace } from './drawing/types';
import {
  type AwaitingTransformationTarget,
  createNoPendingTransformation,
  type PendingTransformationState,
  type SelectionTarget,
} from './drawing/types';
import type { PlaceId } from './lib/evolu-db';

const createDraftPlaceId = (() => {
  let nextId = 0;

  return () => {
    nextId += 1;

    return `draft-place-${nextId}`;
  };
})();

export interface InteractionState {
  hoveredPlaceId: () => string | null;
  pendingTransformation: () => PendingTransformationState;
  rejectPending: () => void;
  selectedPlaceId: () => string | null;
  selectionTarget: () => SelectionTarget;
  setSelectionTarget: (target: SelectionTarget) => void;
  awaitingTransformationTarget: () => AwaitingTransformationTarget;
  beginAddPlace: () => void;
  beginAddRelatedPlace: () => void;
  beginMovePlace: () => void;
  clearAwaitingTransformationTarget: () => void;
  setHoveredPlaceId: Setter<string | null>;
  setViewport: Setter<Viewport>;
  stageAddPlace: (x: number, y: number) => boolean;
  stageAddRelatedPlace: (
    x: number,
    y: number,
    places: ReadonlyArray<PersistedPlace>,
  ) => boolean;
  stageDeletePlace: (placeId: PlaceId) => boolean;
  stageMovePlace: (
    placeId: PlaceId,
    x: number,
    y: number,
    places: ReadonlyArray<PersistedPlace>,
  ) => boolean;
  updatePendingMove: (x: number, y: number) => void;
  viewport: () => Viewport;
}

export const createInteractionState = (): InteractionState => {
  const [viewport, setViewport] = createSignal<Viewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [selectionTarget, setSelectionTarget] = createSignal<SelectionTarget>({
    kind: 'canvas',
  });
  const [hoveredPlaceId, setHoveredPlaceId] = createSignal<string | null>(null);
  const [pendingTransformation, setPendingTransformation] =
    createSignal<PendingTransformationState>(createNoPendingTransformation());
  const [awaitingTransformationTarget, setAwaitingTransformationTarget] =
    createSignal<AwaitingTransformationTarget>({ kind: 'none' });

  // Backward compatibility accessor
  const selectedPlaceId = () => {
    const target = selectionTarget();
    return target.kind === 'place' ? target.placeId : null;
  };

  const stageAddPlace = (x: number, y: number) => {
    if (pendingTransformation().kind !== 'none') {
      return false;
    }

    const nextPlace = {
      id: createDraftPlaceId(),
      name: null,
      x,
      y,
      angle: null,
      parentPlaceId: null,
      placementMode: 'free' as const,
    };

    setPendingTransformation({ kind: 'addPlace', place: nextPlace });
    setSelectionTarget({ kind: 'place', placeId: nextPlace.id });
    setHoveredPlaceId(nextPlace.id);

    return true;
  };

  const stageMovePlace = (
    placeId: PlaceId,
    x: number,
    y: number,
    places: ReadonlyArray<PersistedPlace>,
  ) => {
    const pending = pendingTransformation();

    if (
      pending.kind !== 'none' &&
      !(pending.kind === 'movePlace' && pending.placeId === placeId)
    ) {
      return false;
    }

    // Compute current world position for "from" coordinate
    const placeMap = buildPlaceMap(places);
    const place = placeMap.get(placeId);
    const fromWorld = place ? computeWorldPosition(place, placeMap) : { x, y };

    setPendingTransformation({
      kind: 'movePlace',
      placeId,
      from:
        pending.kind === 'movePlace' && pending.placeId === placeId
          ? pending.from
          : fromWorld,
      to: { x, y },
    });
    setSelectionTarget({ kind: 'place', placeId });

    return true;
  };

  const updatePendingMove = (x: number, y: number) => {
    const pending = pendingTransformation();

    if (pending.kind !== 'movePlace') {
      return;
    }

    setPendingTransformation({
      ...pending,
      to: { x, y },
    });
  };

  const stageDeletePlace = (placeId: PlaceId) => {
    if (pendingTransformation().kind !== 'none') {
      rejectPending();
    }

    setPendingTransformation({ kind: 'deletePlace', placeId });
    setSelectionTarget({ kind: 'place', placeId });
    setHoveredPlaceId(placeId);

    return true;
  };

  const rejectPending = () => {
    const pending = pendingTransformation();

    setPendingTransformation(createNoPendingTransformation());
    setHoveredPlaceId(null);
    clearAwaitingTransformationTarget();

    if (pending.kind === 'addPlace') {
      setSelectionTarget({ kind: 'canvas' });
      return;
    }

    if (pending.kind === 'movePlace' || pending.kind === 'deletePlace') {
      setSelectionTarget({ kind: 'place', placeId: pending.placeId });
    }
  };

  const clearAwaitingTransformationTarget = () => {
    setAwaitingTransformationTarget({ kind: 'none' });
  };

  const beginAddPlace = () => {
    if (pendingTransformation().kind !== 'none') {
      rejectPending();
    }
    setAwaitingTransformationTarget({ kind: 'addPlace' });
  };

  const beginAddRelatedPlace = () => {
    const target = selectionTarget();
    if (target.kind !== 'place') return;

    if (pendingTransformation().kind !== 'none') {
      rejectPending();
    }

    setAwaitingTransformationTarget({
      kind: 'addRelatedPlace',
      parentPlaceId: target.placeId as PlaceId,
    });
  };

  const beginMovePlace = () => {
    const target = selectionTarget();
    if (target.kind !== 'place') return;

    if (pendingTransformation().kind !== 'none') {
      rejectPending();
    }

    setAwaitingTransformationTarget({
      kind: 'movePlace',
      placeId: target.placeId as PlaceId,
    });
  };

  const stageAddRelatedPlace = (
    x: number,
    y: number,
    places: ReadonlyArray<PersistedPlace>,
  ) => {
    const awaiting = awaitingTransformationTarget();
    if (awaiting.kind !== 'addRelatedPlace') {
      return false;
    }

    if (pendingTransformation().kind !== 'none') {
      return false;
    }

    // Compute parent's world position to calculate offset
    const placeMap = buildPlaceMap(places);
    const parent = placeMap.get(awaiting.parentPlaceId);
    const parentWorld = parent
      ? computeWorldPosition(parent, placeMap)
      : { x: 0, y: 0 };

    // Calculate offset from parent's world position
    const offsetX = x - parentWorld.x;
    const offsetY = y - parentWorld.y;

    const nextPlace = {
      id: createDraftPlaceId(),
      name: null,
      x: offsetX,
      y: offsetY,
      angle: null,
      parentPlaceId: awaiting.parentPlaceId,
      placementMode: 'relativeToParent' as const,
    };

    setPendingTransformation({
      kind: 'addRelatedPlace',
      place: nextPlace,
      parentPlaceId: awaiting.parentPlaceId,
    });
    setSelectionTarget({ kind: 'place', placeId: nextPlace.id });
    setHoveredPlaceId(nextPlace.id);
    clearAwaitingTransformationTarget();

    return true;
  };

  return {
    hoveredPlaceId,
    pendingTransformation,
    rejectPending,
    selectedPlaceId,
    selectionTarget,
    setSelectionTarget,
    awaitingTransformationTarget,
    beginAddPlace,
    beginAddRelatedPlace,
    beginMovePlace,
    clearAwaitingTransformationTarget,
    setHoveredPlaceId,
    setViewport,
    stageAddPlace,
    stageAddRelatedPlace,
    stageDeletePlace,
    stageMovePlace,
    updatePendingMove,
    viewport,
  };
};
