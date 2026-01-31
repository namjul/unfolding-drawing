import {
  createEvolu,
  type EvoluSchema,
  FiniteNumber,
  getOrThrow,
  id,
  literal,
  SimpleName,
} from '@evolu/common';
import { evoluWebDeps } from '@evolu/web';
import { createUseEvolu } from './evolu';

const Point = literal('point');
type Point = typeof Point.Type;

const ShapeId = id('Shape');
type ShapeId = typeof ShapeId.Type;

export const Schema = {
  shape: {
    id: ShapeId,
    kind: Point,
    x: FiniteNumber,
    y: FiniteNumber,
  },
} satisfies EvoluSchema;

export const evolu = createEvolu(evoluWebDeps)(Schema, {
  name: getOrThrow(SimpleName.from('unfolding-drawing-app')),
  // syncUrl: "wss://your-sync-url", // optional, defaults to wss://free.evoluhq.com
});

export const useEvolu = createUseEvolu(evolu);
