import {
  createEvolu,
  type EvoluSchema,
  String as EvoluString,
  FiniteNumber,
  getOrThrow,
  id,
  Json,
  literal,
  nullOr,
  SimpleName,
  union,
} from '@evolu/common';
import { evoluWebDeps } from '@evolu/web';
import { createUseEvolu } from './evolu';

export { Json };

const PlacementMode = union(literal('free'), literal('relativeToParent'));
export type PlacementMode = typeof PlacementMode.Type;

export const PlaceId = id('Place');
export type PlaceId = typeof PlaceId.Type;

export const TransformationId = id('Transformation');
export type TransformationId = typeof TransformationId.Type;

export const Schema = {
  place: {
    id: PlaceId,
    name: nullOr(EvoluString),
    x: FiniteNumber,
    y: FiniteNumber,
    angle: nullOr(FiniteNumber),
    parentPlaceId: nullOr(PlaceId),
    placementMode: PlacementMode,
  },
  transformation: {
    id: TransformationId,
    kind: EvoluString,
    timestamp: FiniteNumber,
    sequence: FiniteNumber,
    payload: Json,
  },
} satisfies EvoluSchema;

export const evolu = createEvolu(evoluWebDeps)(Schema, {
  name: getOrThrow(SimpleName.from('unfolding-drawing-app')),
  // syncUrl: "wss://your-sync-url", // optional, defaults to wss://free.evoluhq.com
});

export const useEvolu = createUseEvolu(evolu);
