import type { Setter } from 'solid-js';
import { createSignal } from 'solid-js';
import type { Viewport } from './canvas/viewport';
import {
  createNoPendingTransformation,
  type PendingTransformationState,
  type ToolMode,
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
  setHoveredPlaceId: Setter<string | null>;
  setSelectedPlaceId: Setter<string | null>;
  setViewport: Setter<Viewport>;
  stageAddPlace: (x: number, y: number) => boolean;
  stageDeletePlace: (placeId: PlaceId) => boolean;
  stageMovePlace: (placeId: PlaceId, x: number, y: number) => boolean;
  tool: () => ToolMode;
  enterAddPlaceMode: () => void;
  updatePendingMove: (x: number, y: number) => void;
  viewport: () => Viewport;
}

export const createInteractionState = (): InteractionState => {
  const [viewport, setViewport] = createSignal<Viewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [selectedPlaceId, setSelectedPlaceId] = createSignal<string | null>(
    null,
  );
  const [hoveredPlaceId, setHoveredPlaceId] = createSignal<string | null>(null);
  const [tool, setTool] = createSignal<ToolMode>('select');
  const [pendingTransformation, setPendingTransformation] =
    createSignal<PendingTransformationState>(createNoPendingTransformation());

  const enterAddPlaceMode = () => {
    if (pendingTransformation().kind !== 'none') {
      return;
    }

    setTool('addPlace');
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
    setSelectedPlaceId(nextPlace.id);
    setHoveredPlaceId(nextPlace.id);
    setTool('select');

    return true;
  };

  const stageMovePlace = (placeId: PlaceId, x: number, y: number) => {
    const pending = pendingTransformation();

    if (
      pending.kind !== 'none' &&
      !(pending.kind === 'movePlace' && pending.placeId === placeId)
    ) {
      return false;
    }

    setPendingTransformation({
      kind: 'movePlace',
      placeId,
      from:
        pending.kind === 'movePlace' && pending.placeId === placeId
          ? pending.from
          : { x, y },
      to:
        pending.kind === 'movePlace' && pending.placeId === placeId
          ? pending.to
          : { x, y },
    });
    setSelectedPlaceId(placeId);
    setTool('select');

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
      return false;
    }

    setPendingTransformation({ kind: 'deletePlace', placeId });
    setSelectedPlaceId(placeId);
    setHoveredPlaceId(placeId);
    setTool('select');

    return true;
  };

  const rejectPending = () => {
    const pending = pendingTransformation();

    setPendingTransformation(createNoPendingTransformation());
    setHoveredPlaceId(null);
    setTool('select');

    if (pending.kind === 'addPlace') {
      setSelectedPlaceId(null);
      return;
    }

    if (pending.kind === 'movePlace' || pending.kind === 'deletePlace') {
      setSelectedPlaceId(pending.placeId);
    }
  };

  return {
    hoveredPlaceId,
    pendingTransformation,
    rejectPending,
    selectedPlaceId,
    setHoveredPlaceId,
    setSelectedPlaceId,
    setViewport,
    stageAddPlace,
    stageDeletePlace,
    stageMovePlace,
    tool,
    enterAddPlaceMode,
    updatePendingMove,
    viewport,
  };
};
