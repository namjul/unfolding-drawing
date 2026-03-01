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

import type { CircularFieldId, LineSegmentId, PlaceId } from './evolu-db';
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
  | RecordDeleteCircularField;

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
        radius: null,
      });
      break;
  }
}
