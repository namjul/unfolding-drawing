/**
 * Central recording of all committed transformations.
 *
 * Every user-committed change that mutates drawing state must be recorded here.
 * This module is the single place where transformation rows are inserted; the
 * UI and commit handlers call recordTransformation(...) instead of
 * evolu.insert('transformation', ...) directly.
 *
 * Audit: each transform in transform-matrix.ts (add, addRelated, addLine,
 * move, delete, deleteLine, rotate) must have a corresponding recording path
 * when the user commits that action.
 */

import type {
  AxisId,
  BendingCircularFieldId,
  CircularFieldId,
  CircularRepeaterId,
  LineSegmentId,
  PlaceId,
} from './evolu-db';
import { evolu } from './evolu-db';

/** Payload for place-add (canvas). */
export type RecordAdd = {
  kind: 'add';
  placeId: PlaceId;
  parentId: null;
  x: number;
  y: number;
};

/** Payload for add-related-place (child of another place). */
export type RecordAddRelated = {
  kind: 'addRelated';
  placeId: PlaceId;
  parentId: PlaceId;
  x: number;
  y: number;
};

/** Payload for move place. */
export type RecordMove = {
  kind: 'move';
  placeId: PlaceId;
  parentId: PlaceId | null;
  x: number;
  y: number;
};

/** Payload for delete place. */
export type RecordDelete = {
  kind: 'delete';
  placeId: PlaceId;
};

/** Payload for rotate place. */
export type RecordRotate = {
  kind: 'rotate';
  placeId: PlaceId;
  angle: number;
};

/** Payload for add line. */
export type RecordAddLine = {
  kind: 'addLine';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
};

/** Payload for delete line. */
export type RecordDeleteLine = {
  kind: 'deleteLine';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
};

/** Payload for add circular field. */
export type RecordAddCircularField = {
  kind: 'addCircularField';
  placeId: PlaceId;
  circularFieldId: CircularFieldId;
  radius: number;
};

/** Payload for modify circular field (radius change). */
export type RecordModifyCircularField = {
  kind: 'modifyCircularField';
  placeId: PlaceId;
  circularFieldId: CircularFieldId;
  radius: number;
};

/** Payload for delete circular field. */
export type RecordDeleteCircularField = {
  kind: 'deleteCircularField';
  placeId: PlaceId;
  circularFieldId: CircularFieldId;
};

/** Payload for add bending circular field. */
export type RecordAddBendingCircularField = {
  kind: 'addBendingCircularField';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
  bendingCircularFieldId: BendingCircularFieldId;
  radius: number;
};

/** Payload for modify bending circular field. */
export type RecordModifyBendingCircularField = {
  kind: 'modifyBendingCircularField';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
  bendingCircularFieldId: BendingCircularFieldId;
  radius: number;
};

/** Payload for delete bending circular field. */
export type RecordDeleteBendingCircularField = {
  kind: 'deleteBendingCircularField';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
  bendingCircularFieldId: BendingCircularFieldId;
};

/** Payload for split line segment. */
export type RecordSplitLine = {
  kind: 'splitLine';
  placeId: PlaceId;
  lineSegmentId: LineSegmentId;
  lineSegmentId2: LineSegmentId;
  lineSegmentId3: LineSegmentId;
};

/** Payload for add axis. */
export type RecordAddAxis = {
  kind: 'addAxis';
  placeId: PlaceId;
  axisId: AxisId;
  angle: number;
  isBidirectional?: number | null;
};

/** Payload for modify axis. */
export type RecordModifyAxis = {
  kind: 'modifyAxis';
  placeId: PlaceId;
  axisId: AxisId;
  angle: number;
  isBidirectional?: number | null;
};

/** Payload for delete axis. */
export type RecordDeleteAxis = {
  kind: 'deleteAxis';
  placeId: PlaceId;
  axisId: AxisId;
};

/** Payload for add place on axis. */
export type RecordAddPlaceOnAxis = {
  kind: 'addPlaceOnAxis';
  placeId: PlaceId;
  axisId: AxisId;
  distanceAlongAxis: number;
};

/** Payload for add place on circular field. */
export type RecordAddPlaceOnCircularField = {
  kind: 'addPlaceOnCircularField';
  placeId: PlaceId;
  circularFieldId: CircularFieldId;
  angleOnCircle: number;
};

/** Payload for add circular repeater. */
export type RecordAddCircularRepeater = {
  kind: 'addCircularRepeater';
  placeId: PlaceId;
  circularRepeaterId: CircularRepeaterId;
  count: number;
};

/** Payload for modify circular repeater. */
export type RecordModifyCircularRepeater = {
  kind: 'modifyCircularRepeater';
  placeId: PlaceId;
  circularRepeaterId: CircularRepeaterId;
  count: number;
};

/** Payload for delete circular repeater. */
export type RecordDeleteCircularRepeater = {
  kind: 'deleteCircularRepeater';
  placeId: PlaceId;
  circularRepeaterId: CircularRepeaterId;
};

/** Payload for add place on circular repeater (N echo places). */
export type RecordAddPlaceOnCircularRepeater = {
  kind: 'addPlaceOnCircularRepeater';
  circularRepeaterId: CircularRepeaterId;
  placeId: PlaceId;
  distanceAlongAxis: number;
};

/** Payload for modify place on circular repeater (move echo set). */
export type RecordModifyPlaceOnCircularRepeater = {
  kind: 'modifyPlaceOnCircularRepeater';
  placeId: PlaceId;
  circularRepeaterId: CircularRepeaterId;
  distanceAlongAxis: number;
  distanceFromAxis: number;
};

export type TransformationRecord =
  | RecordAdd
  | RecordAddRelated
  | RecordMove
  | RecordDelete
  | RecordRotate
  | RecordAddLine
  | RecordDeleteLine
  | RecordAddCircularField
  | RecordModifyCircularField
  | RecordDeleteCircularField
  | RecordAddBendingCircularField
  | RecordModifyBendingCircularField
  | RecordDeleteBendingCircularField
  | RecordSplitLine
  | RecordAddAxis
  | RecordModifyAxis
  | RecordDeleteAxis
  | RecordAddPlaceOnAxis
  | RecordAddPlaceOnCircularField
  | RecordAddCircularRepeater
  | RecordModifyCircularRepeater
  | RecordDeleteCircularRepeater
  | RecordAddPlaceOnCircularRepeater
  | RecordModifyPlaceOnCircularRepeater;

/**
 * Records one committed transformation. Call this exactly once per committed
 * user action that changes drawing state (add/move/delete/rotate place, add/delete line).
 */
export function recordTransformation(data: TransformationRecord): void {
  switch (data.kind) {
    case 'add':
      evolu.insert('transformation', {
        kind: 'add',
        placeId: data.placeId,
        parentId: data.parentId,
        x: data.x,
        y: data.y,
      });
      break;
    case 'addRelated':
      evolu.insert('transformation', {
        kind: 'addRelated',
        placeId: data.placeId,
        parentId: data.parentId,
        x: data.x,
        y: data.y,
      });
      break;
    case 'move':
      evolu.insert('transformation', {
        kind: 'move',
        placeId: data.placeId,
        parentId: data.parentId,
        x: data.x,
        y: data.y,
      });
      break;
    case 'delete':
      evolu.insert('transformation', {
        kind: 'delete',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
      });
      break;
    case 'rotate':
      evolu.insert('transformation', {
        kind: 'rotate',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: data.angle,
      });
      break;
    case 'addLine':
      evolu.insert('transformation', {
        kind: 'addLine',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
      });
      break;
    case 'deleteLine':
      evolu.insert('transformation', {
        kind: 'deleteLine',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
      });
      break;
    case 'addCircularField':
      evolu.insert('transformation', {
        kind: 'addCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        circularFieldId: data.circularFieldId,
        radius: data.radius,
      });
      break;
    case 'modifyCircularField':
      evolu.insert('transformation', {
        kind: 'modifyCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        circularFieldId: data.circularFieldId,
        radius: data.radius,
      });
      break;
    case 'deleteCircularField':
      evolu.insert('transformation', {
        kind: 'deleteCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        circularFieldId: data.circularFieldId,
        bendingCircularFieldId: null,
        radius: null,
      });
      break;
    case 'addBendingCircularField':
      evolu.insert('transformation', {
        kind: 'addBendingCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
        circularFieldId: null,
        bendingCircularFieldId: data.bendingCircularFieldId,
        radius: data.radius,
      });
      break;
    case 'modifyBendingCircularField':
      evolu.insert('transformation', {
        kind: 'modifyBendingCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
        circularFieldId: null,
        bendingCircularFieldId: data.bendingCircularFieldId,
        radius: data.radius,
      });
      break;
    case 'deleteBendingCircularField':
      evolu.insert('transformation', {
        kind: 'deleteBendingCircularField',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
        circularFieldId: null,
        bendingCircularFieldId: data.bendingCircularFieldId,
        radius: null,
      });
      break;
    case 'splitLine':
      evolu.insert('transformation', {
        kind: 'splitLine',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: data.lineSegmentId,
        lineSegmentId2: data.lineSegmentId2,
        lineSegmentId3: data.lineSegmentId3,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: null,
      });
      break;
    case 'addAxis':
      evolu.insert('transformation', {
        kind: 'addAxis',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: data.angle,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: data.axisId,
        radius: null,
        angleOnCircle: null,
        axisIsBidirectional: data.isBidirectional ?? null,
      });
      break;
    case 'modifyAxis':
      evolu.insert('transformation', {
        kind: 'modifyAxis',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: data.angle,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: data.axisId,
        radius: null,
        angleOnCircle: null,
        axisIsBidirectional: data.isBidirectional ?? null,
      });
      break;
    case 'deleteAxis':
      evolu.insert('transformation', {
        kind: 'deleteAxis',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: data.axisId,
        radius: null,
      });
      break;
    case 'addPlaceOnAxis':
      evolu.insert('transformation', {
        kind: 'addPlaceOnAxis',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: data.axisId,
        radius: null,
      });
      break;
    case 'addPlaceOnCircularField': {
      const d = data;
      evolu.insert('transformation', {
        kind: 'addPlaceOnCircularField',
        placeId: d.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: d.circularFieldId,
        bendingCircularFieldId: null,
        axisId: null,
        radius: null,
        angleOnCircle: d.angleOnCircle,
        circularRepeaterId: null,
      });
      break;
    }
    case 'addCircularRepeater':
      evolu.insert('transformation', {
        kind: 'addCircularRepeater',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: data.count,
        angleOnCircle: null,
        axisIsBidirectional: null,
        circularRepeaterId: data.circularRepeaterId,
      });
      break;
    case 'modifyCircularRepeater':
      evolu.insert('transformation', {
        kind: 'modifyCircularRepeater',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: data.count,
        angleOnCircle: null,
        axisIsBidirectional: null,
        circularRepeaterId: data.circularRepeaterId,
      });
      break;
    case 'deleteCircularRepeater':
      evolu.insert('transformation', {
        kind: 'deleteCircularRepeater',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: null,
        angleOnCircle: null,
        axisIsBidirectional: null,
        circularRepeaterId: data.circularRepeaterId,
      });
      break;
    case 'addPlaceOnCircularRepeater':
      evolu.insert('transformation', {
        kind: 'addPlaceOnCircularRepeater',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: data.distanceAlongAxis,
        angleOnCircle: null,
        axisIsBidirectional: null,
        circularRepeaterId: data.circularRepeaterId,
      });
      break;
    case 'modifyPlaceOnCircularRepeater':
      evolu.insert('transformation', {
        kind: 'modifyPlaceOnCircularRepeater',
        placeId: data.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: null,
        lineSegmentId: null,
        lineSegmentId2: null,
        lineSegmentId3: null,
        circularFieldId: null,
        bendingCircularFieldId: null,
        axisId: null,
        radius: data.distanceAlongAxis,
        angleOnCircle: null,
        axisIsBidirectional: null,
        circularRepeaterId: data.circularRepeaterId,
      });
      break;
  }
}
