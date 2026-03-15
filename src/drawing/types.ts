import type { Viewport } from '../canvas/viewport';
import type { PlaceId, TransformationId } from '../lib/evolu-db';

export type PlacementMode = 'free';
export type TransformationKind = 'addPlace' | 'movePlace' | 'deletePlace';

export type SelectionTarget =
  | { kind: 'canvas' }
  | { kind: 'place'; placeId: string };

export type AwaitingTransformationTarget =
  | { kind: 'none' }
  | { kind: 'addPlace' }
  | { kind: 'movePlace'; placeId: PlaceId };

export interface PersistedPlace {
  id: PlaceId;
  name: string | null;
  x: number;
  y: number;
  angle: number | null;
  parentPlaceId: PlaceId | null;
  placementMode: PlacementMode;
}

export interface DraftPlace {
  id: string;
  name: string | null;
  x: number;
  y: number;
  angle: null;
  parentPlaceId: null;
  placementMode: 'free';
}

export interface DisplayPlace {
  id: string;
  name: string | null;
  x: number;
  y: number;
  angle: number | null;
  parentPlaceId: string | null;
  placementMode: PlacementMode;
  isDraft: boolean;
  isMarkedForDeletion: boolean;
}

export interface TransformationEntry {
  id: TransformationId;
  kind: TransformationKind;
  timestamp: number;
  sequence: number;
  payload: string;
}

export type PendingTransformationState =
  | { kind: 'none' }
  | { kind: 'addPlace'; place: DraftPlace }
  | {
      kind: 'movePlace';
      placeId: PlaceId;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | { kind: 'deletePlace'; placeId: PlaceId };

export type ViewportState = Viewport;

export const createNoPendingTransformation =
  (): PendingTransformationState => ({
    kind: 'none',
  });
