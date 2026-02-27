import {
  createEvolu,
  type EvoluSchema,
  FiniteNumber,
  getOrThrow,
  id,
  literal,
  nullOr,
  SimpleName,
  String1000,
  union,
} from '@evolu/common';
import { evoluWebDeps } from '@evolu/web';
import { createUseEvolu } from './evolu';

const PlaceId = id('Place');
export type PlaceId = typeof PlaceId.Type;

const LineSegmentEndId = id('LineSegmentEnd');
export type LineSegmentEndId = typeof LineSegmentEndId.Type;

const LineSegmentId = id('LineSegment');
export type LineSegmentId = typeof LineSegmentId.Type;

const TransformationId = id('Transformation');
export type TransformationId = typeof TransformationId.Type;

const AddKind = literal('add');
const MoveKind = literal('move');
const DeleteKind = literal('delete');
const RotateKind = literal('rotate');
const TransformationKind = union(AddKind, MoveKind, DeleteKind, RotateKind);
export type TransformationKind = typeof TransformationKind.Type;

export const Schema = {
  place: {
    id: PlaceId,
    parentId: nullOr(PlaceId),
    x: FiniteNumber,
    y: FiniteNumber,
    angle: nullOr(FiniteNumber),
    name: nullOr(String1000),
  },
  lineSegmentEnd: {
    id: LineSegmentEndId,
    placeId: PlaceId,
    name: nullOr(String1000),
  },
  lineSegment: {
    id: LineSegmentId,
    endAId: LineSegmentEndId,
    endBId: LineSegmentEndId,
    name: nullOr(String1000),
  },
  transformation: {
    id: TransformationId,
    kind: TransformationKind,
    placeId: PlaceId,
    parentId: nullOr(PlaceId),
    x: nullOr(FiniteNumber),
    y: nullOr(FiniteNumber),
    angle: nullOr(FiniteNumber),
  },
} satisfies EvoluSchema;

export const evolu = createEvolu(evoluWebDeps)(Schema, {
  name: getOrThrow(SimpleName.from('unfolding-drawing-app')),
});

export const useEvolu = createUseEvolu(evolu);

export const allPlacesQuery = evolu.createQuery((db) =>
  db
    .selectFrom('place')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);

export const allTransformationsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('transformation')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);

export const allLineSegmentEndsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('lineSegmentEnd')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);

export const allLineSegmentsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('lineSegment')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);
