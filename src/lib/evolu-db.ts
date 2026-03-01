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

const CircularFieldId = id('CircularField');
export type CircularFieldId = typeof CircularFieldId.Type;

const BendingCircularFieldId = id('BendingCircularField');
export type BendingCircularFieldId = typeof BendingCircularFieldId.Type;

const TransformationId = id('Transformation');
export type TransformationId = typeof TransformationId.Type;

const AddKind = literal('add');
const AddRelatedKind = literal('addRelated');
const MoveKind = literal('move');
const DeleteKind = literal('delete');
const RotateKind = literal('rotate');
const AddLineKind = literal('addLine');
const DeleteLineKind = literal('deleteLine');
const AddCircularFieldKind = literal('addCircularField');
const ModifyCircularFieldKind = literal('modifyCircularField');
const DeleteCircularFieldKind = literal('deleteCircularField');
const TransformationKind = union(
  AddKind,
  AddRelatedKind,
  MoveKind,
  DeleteKind,
  RotateKind,
  AddLineKind,
  DeleteLineKind,
  AddCircularFieldKind,
  ModifyCircularFieldKind,
  DeleteCircularFieldKind,
);
export type TransformationKind = typeof TransformationKind.Type;

export const Schema = {
  place: {
    id: PlaceId,
    parentId: nullOr(PlaceId),
    x: FiniteNumber,
    y: FiniteNumber,
    angle: nullOr(FiniteNumber),
    name: nullOr(String1000),
    isScaffolding: nullOr(FiniteNumber),
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
    isScaffolding: nullOr(FiniteNumber),
  },
  circularField: {
    id: CircularFieldId,
    placeId: PlaceId,
    radius: FiniteNumber,
  },
  bendingCircularField: {
    id: BendingCircularFieldId,
    lineSegmentEndId: LineSegmentEndId,
    radius: FiniteNumber,
    offsetX: FiniteNumber,
    offsetY: FiniteNumber,
  },
  transformation: {
    id: TransformationId,
    kind: TransformationKind,
    placeId: PlaceId,
    parentId: nullOr(PlaceId),
    x: nullOr(FiniteNumber),
    y: nullOr(FiniteNumber),
    angle: nullOr(FiniteNumber),
    lineSegmentId: nullOr(LineSegmentId),
    circularFieldId: nullOr(CircularFieldId),
    radius: nullOr(FiniteNumber),
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

export const allCircularFieldsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('circularField')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);

export const allBendingCircularFieldsQuery = evolu.createQuery((db) =>
  db
    .selectFrom('bendingCircularField')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);
