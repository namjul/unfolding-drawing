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

const AxisId = id('Axis');
export type AxisId = typeof AxisId.Type;

const CircularRepeaterId = id('CircularRepeater');
export type CircularRepeaterId = typeof CircularRepeaterId.Type;

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
const AddBendingCircularFieldKind = literal('addBendingCircularField');
const ModifyBendingCircularFieldKind = literal('modifyBendingCircularField');
const DeleteBendingCircularFieldKind = literal('deleteBendingCircularField');
const SplitLineKind = literal('splitLine');
const AddAxisKind = literal('addAxis');
const ModifyAxisKind = literal('modifyAxis');
const DeleteAxisKind = literal('deleteAxis');
const AddPlaceOnAxisKind = literal('addPlaceOnAxis');
const AddPlaceOnCircularFieldKind = literal('addPlaceOnCircularField');
const AddCircularRepeaterKind = literal('addCircularRepeater');
const ModifyCircularRepeaterKind = literal('modifyCircularRepeater');
const DeleteCircularRepeaterKind = literal('deleteCircularRepeater');
const AddPlaceOnCircularRepeaterKind = literal('addPlaceOnCircularRepeater');
const ModifyPlaceOnCircularRepeaterKind = literal(
  'modifyPlaceOnCircularRepeater',
);
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
  AddBendingCircularFieldKind,
  ModifyBendingCircularFieldKind,
  DeleteBendingCircularFieldKind,
  SplitLineKind,
  AddAxisKind,
  ModifyAxisKind,
  DeleteAxisKind,
  AddPlaceOnAxisKind,
  AddPlaceOnCircularFieldKind,
  AddCircularRepeaterKind,
  ModifyCircularRepeaterKind,
  DeleteCircularRepeaterKind,
  AddPlaceOnCircularRepeaterKind,
  ModifyPlaceOnCircularRepeaterKind,
);
export type TransformationKind = typeof TransformationKind.Type;

export const Schema = {
  place: {
    id: PlaceId,
    parentId: nullOr(PlaceId),
    parentAxisId: nullOr(AxisId),
    distanceAlongAxis: nullOr(FiniteNumber),
    distanceFromAxis: nullOr(FiniteNumber),
    repeaterEchoGroupId: nullOr(PlaceId),
    parentCircularFieldId: nullOr(CircularFieldId),
    angleOnCircle: nullOr(FiniteNumber),
    x: FiniteNumber,
    y: FiniteNumber,
    angle: nullOr(FiniteNumber),
    name: nullOr(String1000),
    isScaffolding: nullOr(FiniteNumber),
  },
  axis: {
    id: AxisId,
    placeId: PlaceId,
    angle: FiniteNumber,
    isBidirectional: nullOr(FiniteNumber),
    circularRepeaterId: nullOr(CircularRepeaterId),
  },
  circularRepeater: {
    id: CircularRepeaterId,
    placeId: PlaceId,
    count: FiniteNumber,
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
    lineSegmentId2: nullOr(LineSegmentId),
    lineSegmentId3: nullOr(LineSegmentId),
    circularFieldId: nullOr(CircularFieldId),
    bendingCircularFieldId: nullOr(BendingCircularFieldId),
    axisId: nullOr(AxisId),
    radius: nullOr(FiniteNumber),
    angleOnCircle: nullOr(FiniteNumber),
    axisIsBidirectional: nullOr(FiniteNumber),
    circularRepeaterId: nullOr(CircularRepeaterId),
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

export const allAxesQuery = evolu.createQuery((db) =>
  db
    .selectFrom('axis')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);

export const allCircularRepeatersQuery = evolu.createQuery((db) =>
  db
    .selectFrom('circularRepeater')
    .selectAll()
    .where((eb) =>
      eb.or([eb('isDeleted', 'is', null), eb('isDeleted', '=', 0)]),
    )
    .orderBy('createdAt'),
);
