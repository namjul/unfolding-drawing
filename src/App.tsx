import { String1000 } from '@evolu/common';
import { createEventListener } from '@solid-primitives/event-listener';
import { createShortcut } from '@solid-primitives/keyboard';
import { createPerPointerListeners } from '@solid-primitives/pointer';
import {
  batch,
  type Component,
  createEffect,
  createMemo,
  createSignal,
} from 'solid-js';
import DrawingDNAPane from './components/DrawingDNAPane';
import type { GuideStep, TransformChoice } from './components/DrawingGuide';
import DrawingGuide from './components/DrawingGuide';
import {
  axisSegmentInViewport,
  getAxisWorldGeometry,
  projectPointOntoAxis,
  type ViewportCanvas,
} from './lib/axisGeometry';
import {
  type BendCircle,
  buildBentSegmentPath,
  distanceFromPointToBentPath,
} from './lib/bentSegmentPath';
import {
  getRelatedPlaceIds,
  getRelationshipSegments,
} from './lib/drawingRelations';
import {
  type AxisId,
  allAxesQuery,
  allBendingCircularFieldsQuery,
  allCircularFieldsQuery,
  allCircularRepeatersQuery,
  allLineSegmentEndsQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
  allTransformationsQuery,
  type BendingCircularFieldId,
  type CircularFieldId,
  type CircularRepeaterId,
  type LineSegmentEndId,
  type LineSegmentId,
  type PlaceId,
  useEvolu,
} from './lib/evolu-db';
import { lineSegmentEndDisplayName } from './lib/lineSegmentEndName';
import {
  distanceFromPointToSegment,
  type LineSegmentWithPositions,
} from './lib/lineSegmentHit';
import { recordTransformation } from './lib/recordTransformation';
import { chooseParentForSplitPlace } from './lib/splitLineHierarchy';
import {
  availableTransforms as getAvailableTransforms,
  getSelectionType,
} from './lib/transform-matrix';
import { useQuery } from './lib/useQuery';
import { classes, svg as svgTokens } from './styles/tokens';

const LINE_SEGMENT_HIT_THRESHOLD = 12;
const CIRCULAR_FIELD_DEFAULT_RADIUS = 50;
const CIRCULAR_FIELD_MIN_RADIUS = 5;
const CIRCULAR_FIELD_RADIUS_HANDLE_THRESHOLD = 12;
const CIRCULAR_FIELD_HIT_THRESHOLD = 12;
const BENDING_FIELD_HIT_THRESHOLD = 12;
const BENDING_FIELD_RADIUS_HANDLE_THRESHOLD = 12;
/** When adding/dragging a place on a repeater, snap onto the axis if within this distance (canvas units). */
const AXIS_MAGNETIC_THRESHOLD = 16;

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;
const WHEEL_SCALE_FACTOR = 0.01;
const PINCH_SCALE_FACTOR = 0.01;

type Mode = 'default' | 'pan';

const PLACE_RADIUS = 8;
const CROSSHAIR_SIZE = 10;

/** Sentinel id for the draggable preview place during "Split line segment". */
const PENDING_SPLIT_PLACE = '__pending_split_place__' as PlaceId;
/** Sentinel id for the draggable preview place during "Add place on axis". */
const PENDING_AXIS_PLACE = '__pending_axis_place__' as PlaceId;
/** Sentinel id for the draggable preview place during "Add place on circular field". */
const PENDING_CIRCULAR_FIELD_PLACE = '__pending_cf_place__' as PlaceId;

const App: Component = () => {
  const evolu = useEvolu();
  const { rows: placesRows, refresh: refreshPlaces } = useQuery(allPlacesQuery);
  const { rows: transformationsRows, refresh: refreshTransformations } =
    useQuery(allTransformationsQuery);
  const { rows: lineSegmentEndsRows, refresh: refreshLineSegmentEnds } =
    useQuery(allLineSegmentEndsQuery);
  const { rows: lineSegmentsRows, refresh: refreshLineSegments } =
    useQuery(allLineSegmentsQuery);
  const { rows: circularFieldsRows } = useQuery(allCircularFieldsQuery);
  const { rows: bendingCircularFieldsRows } = useQuery(
    allBendingCircularFieldsQuery,
  );
  const { rows: axesRows } = useQuery(allAxesQuery);
  const { rows: circularRepeatersRows } = useQuery(allCircularRepeatersQuery);
  let svg!: SVGSVGElement;

  const [scale, setScale] = createSignal(1);
  const [translateX, setTranslateX] = createSignal(0);
  const [translateY, setTranslateY] = createSignal(0);

  const [mode, setMode] = createSignal<Mode>('default');
  const [prevMode, setPrevMode] = createSignal<Mode>('default');
  const [isPanning, setIsPanning] = createSignal(false);

  const [guideStep, setGuideStep] = createSignal<GuideStep>('observe');
  const [selectedPlaceId, setSelectedPlaceId] = createSignal<PlaceId | null>(
    null,
  );
  const [selectedLineSegmentId, setSelectedLineSegmentId] =
    createSignal<LineSegmentId | null>(null);
  const [selectedCircularFieldId, setSelectedCircularFieldId] =
    createSignal<CircularFieldId | null>(null);
  const [selectedBendingCircularFieldId, setSelectedBendingCircularFieldId] =
    createSignal<BendingCircularFieldId | null>(null);
  const [selectedAxisId, setSelectedAxisId] = createSignal<AxisId | null>(null);
  const [selectedCircularRepeaterId, setSelectedCircularRepeaterId] =
    createSignal<CircularRepeaterId | null>(null);
  const [transformChoice, setTransformChoice] =
    createSignal<TransformChoice>(null);
  const [hasDrawingPaneSelected, setHasDrawingPaneSelected] =
    createSignal(false);

  /** True if this circular field's parent place has no other children (so moving is allowed). */
  const isCircularFieldOnlyChild = (cfId: CircularFieldId | null): boolean => {
    if (!cfId) return false;
    const cf = circularFields().find((c) => c.id === cfId);
    const placeId = cf?.placeId;
    if (!placeId) return false;
    const childPlaces = places().filter((p) => p.parentId === placeId).length;
    const endsAtPlace = lineSegmentEnds().filter(
      (e) => e.placeId === placeId,
    ).length;
    const fieldsAtPlace = circularFields().filter(
      (c) => c.placeId === placeId,
    ).length;
    return childPlaces === 0 && endsAtPlace === 0 && fieldsAtPlace === 1;
  };

  const selectionType = createMemo(() => {
    let st = getSelectionType(
      hasDrawingPaneSelected(),
      selectedPlaceId(),
      selectedLineSegmentId(),
      selectedCircularFieldId(),
      selectedBendingCircularFieldId(),
      selectedAxisId(),
      selectedCircularRepeaterId(),
    );
    if (st === 'place') {
      const pid = selectedPlaceId();
      if (pid) {
        const place = places().find((p) => p.id === pid) as
          | PlaceLike
          | undefined;
        if (place?.repeaterEchoGroupId != null) {
          st = 'placeOnCircularRepeater';
        } else {
          const axisId = place?.parentAxisId;
          if (axisId) {
            const axis = axes().find((a) => a.id === axisId);
            if (
              axis &&
              (axis as { circularRepeaterId?: CircularRepeaterId })
                .circularRepeaterId
            ) {
              st = 'placeOnCircularRepeater';
            }
          }
        }
      }
    }
    return st;
  });

  const availableTransformsList = createMemo(() => {
    const st = selectionType();
    const list = getAvailableTransforms(st);
    if (st !== 'circularField') return list;
    const cfId = selectedCircularFieldId();
    return list.filter(
      (t) => t.id !== 'moveCircularField' || isCircularFieldOnlyChild(cfId),
    );
  });

  const [
    pendingModifyPlaceOnCircularRepeater,
    setPendingModifyPlaceOnCircularRepeater,
  ] = createSignal<{
    placeId: PlaceId;
    circularRepeaterId: CircularRepeaterId;
    patternEnabled?: boolean;
    alternatingShow?: number | null;
    alternatingSkip?: number | null;
    alternatingStart?: number | null;
  } | null>(null);

  const [bendAtEndsDirty, setBendAtEndsDirty] = createSignal(false);
  const [pendingBendAtEndsAdded, setPendingBendAtEndsAdded] = createSignal<
    Array<{
      id: BendingCircularFieldId;
      placeId: PlaceId;
      lineSegmentId: LineSegmentId;
      radius: number;
    }>
  >([]);
  const [pendingBendAtEndsDeleted, setPendingBendAtEndsDeleted] = createSignal<
    Array<{
      id: BendingCircularFieldId;
      placeId: PlaceId;
      lineSegmentId: LineSegmentId;
    }>
  >([]);

  const bendAtEndsState = createMemo(() => {
    const segId = selectedLineSegmentId();
    const tc = transformChoice();
    if (tc !== 'bendAtEnds' || !segId) return null;
    const seg = lineSegments().find((s) => s.id === segId);
    if (!seg) return null;
    const endAId = seg.endAId;
    const endBId = seg.endBId;
    if (endAId == null || endBId == null) return null;
    const ends = lineSegmentEnds();
    const pl = places();
    const segsWithPos = lineSegmentsWithPositions();
    const pos = segsWithPos.find((s) => s.id === segId);
    if (!pos) return null;
    const endA = ends.find((e) => e.id === endAId);
    const endB = ends.find((e) => e.id === endBId);
    if (!endA || !endB) return null;
    const placeAName =
      pl.find((p) => p.id === endA.placeId)?.name?.trim() ?? 'Place';
    const placeBName =
      pl.find((p) => p.id === endB.placeId)?.name?.trim() ?? 'Place';
    const segmentName = seg.name?.trim() ?? 'Line segment';
    const endALabel = lineSegmentEndDisplayName(segmentName, placeAName);
    const endBLabel = lineSegmentEndDisplayName(segmentName, placeBName);
    const bending = bendingCircularFields();
    const bendAtA = bending.find((b) => b.lineSegmentEndId === endAId);
    const bendAtB = bending.find((b) => b.lineSegmentEndId === endBId);
    const L = Math.hypot(pos.x2 - pos.x1, pos.y2 - pos.y1) || 1;
    const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, 0.25 * L);
    const dx = pos.x2 - pos.x1;
    const dy = pos.y2 - pos.y1;
    const offsetForEndA = () => ({
      offsetX: radius * (-dy / L),
      offsetY: radius * (dx / L),
    });
    const offsetForEndB = () => ({
      offsetX: radius * (dy / L),
      offsetY: radius * (-dx / L),
    });
    return {
      endALabel,
      endBLabel,
      hasBendAtA: !!bendAtA,
      hasBendAtB: !!bendAtB,
      onToggleBendAtA: () => {
        const segmentsList = lineSegments();
        const group = getLineSegmentsInEchoGroup(segId, segmentsList);
        const allPos = lineSegmentsWithPositions();
        if (bendAtA) {
          const endAIds = group
            .map((s) => s.endAId)
            .filter((id): id is LineSegmentEndId => id != null);
          const toRemove = bendingCircularFields().filter((b) =>
            endAIds.includes(b.lineSegmentEndId),
          );
          const deletedEntries = toRemove
            .map((b) => {
              const placeIdA = ends.find((e) => e.id === b.lineSegmentEndId)
                ?.placeId;
              return placeIdA != null
                ? { id: b.id, placeId: placeIdA, lineSegmentId: segId }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x != null);
          setPendingBendAtEndsDeleted((prev) => [...prev, ...deletedEntries]);
          for (const b of toRemove) {
            evolu.update('bendingCircularField', { id: b.id, isDeleted: true });
          }
        } else {
          for (const s of group) {
            if (s.endAId == null) continue;
            const segPos = allPos.find((p) => p.id === s.id);
            if (!segPos) continue;
            const L = Math.hypot(
              segPos.x2 - segPos.x1,
              segPos.y2 - segPos.y1,
            ) || 1;
            const dx = segPos.x2 - segPos.x1;
            const dy = segPos.y2 - segPos.y1;
            const offsetX = radius * (-dy / L);
            const offsetY = radius * (dx / L);
            const res = evolu.insert('bendingCircularField', {
              lineSegmentEndId: s.endAId,
              radius,
              offsetX,
              offsetY,
            });
            if (res.ok) {
              const placeIdA = ends.find((e) => e.id === s.endAId)?.placeId;
              if (placeIdA != null) {
                setPendingBendAtEndsAdded((prev) => [
                  ...prev,
                  {
                    id: res.value.id,
                    placeId: placeIdA,
                    lineSegmentId: s.id,
                    radius,
                  },
                ]);
              }
            }
          }
        }
        setBendAtEndsDirty(true);
      },
      onToggleBendAtB: () => {
        const segmentsList = lineSegments();
        const group = getLineSegmentsInEchoGroup(segId, segmentsList);
        const allPos = lineSegmentsWithPositions();
        if (bendAtB) {
          const endBIds = group
            .map((s) => s.endBId)
            .filter((id): id is LineSegmentEndId => id != null);
          const toRemove = bendingCircularFields().filter((b) =>
            endBIds.includes(b.lineSegmentEndId),
          );
          const deletedEntries = toRemove
            .map((b) => {
              const placeIdB = ends.find((e) => e.id === b.lineSegmentEndId)
                ?.placeId;
              return placeIdB != null
                ? { id: b.id, placeId: placeIdB, lineSegmentId: segId }
                : null;
            })
            .filter((x): x is NonNullable<typeof x> => x != null);
          setPendingBendAtEndsDeleted((prev) => [...prev, ...deletedEntries]);
          for (const b of toRemove) {
            evolu.update('bendingCircularField', { id: b.id, isDeleted: true });
          }
        } else {
          for (const s of group) {
            if (s.endBId == null) continue;
            const segPos = allPos.find((p) => p.id === s.id);
            if (!segPos) continue;
            const L = Math.hypot(
              segPos.x2 - segPos.x1,
              segPos.y2 - segPos.y1,
            ) || 1;
            const dx = segPos.x2 - segPos.x1;
            const dy = segPos.y2 - segPos.y1;
            const offsetX = radius * (dy / L);
            const offsetY = radius * (-dx / L);
            const res = evolu.insert('bendingCircularField', {
              lineSegmentEndId: s.endBId,
              radius,
              offsetX,
              offsetY,
            });
            if (res.ok) {
              const placeIdB = ends.find((e) => e.id === s.endBId)?.placeId;
              if (placeIdB != null) {
                setPendingBendAtEndsAdded((prev) => [
                  ...prev,
                  {
                    id: res.value.id,
                    placeId: placeIdB,
                    lineSegmentId: s.id,
                    radius,
                  },
                ]);
              }
            }
          }
        }
        setBendAtEndsDirty(true);
      },
    };
  });

  const [pendingAdd, setPendingAdd] = createSignal<{
    x: number;
    y: number;
    parentId: PlaceId | null;
  } | null>(null);
  const [pendingMove, setPendingMove] = createSignal<{
    placeId: PlaceId | 'pending';
    x: number;
    y: number;
  } | null>(null);
  const [pendingDeletePlaceId, setPendingDeletePlaceId] =
    createSignal<PlaceId | null>(null);
  const [pendingRotate, setPendingRotate] = createSignal<{
    placeId: PlaceId;
    angle: number;
  } | null>(null);
  const [pendingAddLine, setPendingAddLine] = createSignal<{
    startPlaceId: PlaceId;
    startEndId: LineSegmentEndId;
    cursorX: number;
    cursorY: number;
  } | null>(null);
  const [pendingDeleteLineId, setPendingDeleteLineId] =
    createSignal<LineSegmentId | null>(null);
  type PendingAddCircularField =
    | { stage: 'placing' }
    | {
        stage: 'editing';
        placeId: PlaceId;
        circularFieldId: CircularFieldId;
        radius: number;
        radiusHandleAngle?: number;
        isNewPlace: boolean;
        /** When adding at multiple echo places, all circular field ids for radius sync. */
        circularFieldIds?: CircularFieldId[];
      };
  const [pendingAddCircularField, setPendingAddCircularField] =
    createSignal<PendingAddCircularField | null>(null);
  const [pendingModifyCircularField, setPendingModifyCircularField] =
    createSignal<{
      circularFieldId: CircularFieldId;
      placeId: PlaceId;
      radius: number;
      radiusHandleAngle?: number;
    } | null>(null);
  const [pendingDeleteCircularFieldId, setPendingDeleteCircularFieldId] =
    createSignal<CircularFieldId | null>(null);
  const [draggingCircularFieldRadius, setDraggingCircularFieldRadius] =
    createSignal<CircularFieldId | null>(null);
  const [radiusHandleDragPosition, setRadiusHandleDragPosition] =
    createSignal<{ x: number; y: number } | null>(null);
  const [pendingMoveBendingCircularField, setPendingMoveBendingCircularField] =
    createSignal<BendingCircularFieldId | null>(null);
  const [
    draggingBendingCircularFieldRadius,
    setDraggingBendingCircularFieldRadius,
  ] = createSignal<BendingCircularFieldId | null>(null);
  const [
    pendingDeleteBendingCircularFieldId,
    setPendingDeleteBendingCircularFieldId,
  ] = createSignal<BendingCircularFieldId | null>(null);

  type PendingSplitLine = {
    segmentId: LineSegmentId;
    placeAId: PlaceId;
    placeBId: PlaceId;
    endAId: LineSegmentEndId;
    endBId: LineSegmentEndId;
    parentPlaceId: PlaceId;
    previewX: number;
    previewY: number;
  };
  const [pendingSplitLine, setPendingSplitLine] =
    createSignal<PendingSplitLine | null>(null);

  const [pendingAddLineSegment, setPendingAddLineSegment] = createSignal<{
    originSelectedPlaceId: PlaceId;
    originGroupId: PlaceId;
    circularRepeaterId: CircularRepeaterId;
  } | null>(null);

  const [pendingAddAxis, setPendingAddAxis] = createSignal<{
    placeId: PlaceId;
    angle: number;
    isBidirectional: boolean;
    isMirror: boolean;
    /** When adding axis at each echo place, commit inserts N axes. */
    echoPlaceIds?: PlaceId[];
  } | null>(null);
  const [pendingModifyAxis, setPendingModifyAxis] = createSignal<{
    axisId: AxisId;
    placeId: PlaceId;
    angle: number;
    isBidirectional: boolean;
    isMirror: boolean;
  } | null>(null);
  const [pendingDeleteAxisId, setPendingDeleteAxisId] =
    createSignal<AxisId | null>(null);
  const [pendingAddPlaceOnAxis, setPendingAddPlaceOnAxis] = createSignal<{
    axisId: AxisId;
    distanceAlongAxis: number;
    distanceFromAxis?: number;
  } | null>(null);
  const [draggingAxisAngle, setDraggingAxisAngle] = createSignal(false);
  const [draggingPlaceOnAxis, setDraggingPlaceOnAxis] =
    createSignal<AxisId | null>(null);
  const [pendingAddPlaceOnCircularField, setPendingAddPlaceOnCircularField] =
    createSignal<{
      circularFieldId: CircularFieldId;
      angleOnCircle: number;
    } | null>(null);
  const [draggingPlaceOnCircularField, setDraggingPlaceOnCircularField] =
    createSignal<CircularFieldId | null>(null);
  const [pendingAddCircularRepeater, setPendingAddCircularRepeater] =
    createSignal<{ placeId: PlaceId; count: number } | null>(null);
  const [pendingModifyCircularRepeater, setPendingModifyCircularRepeater] =
    createSignal<{
      circularRepeaterId: CircularRepeaterId;
      count: number;
    } | null>(null);
  const [
    pendingAddPlaceOnCircularRepeater,
    setPendingAddPlaceOnCircularRepeater,
  ] = createSignal<{
    circularRepeaterId: CircularRepeaterId;
    distanceAlongAxis: number;
    distanceFromAxis?: number;
    patternEnabled?: boolean;
    placementAxisNumber?: number;
    alternatingShow?: number;
    alternatingSkip?: number;
    alternatingStart?: number;
  } | null>(null);
  const [pendingDeleteCircularRepeaterId, setPendingDeleteCircularRepeaterId] =
    createSignal<CircularRepeaterId | null>(null);
  const [draggingPlaceOnCircularRepeater, setDraggingPlaceOnCircularRepeater] =
    createSignal<CircularRepeaterId | null>(null);
  /** Cursor position in canvas coords for moving handles (orientation axis, axis). */
  const [lastCursorCanvas, setLastCursorCanvas] = createSignal<{
    x: number;
    y: number;
  } | null>(null);

  const places = () => placesRows();
  const lineSegmentEnds = () => lineSegmentEndsRows();
  const lineSegments = () => lineSegmentsRows();
  const circularFields = () => circularFieldsRows();
  const bendingCircularFields = () => bendingCircularFieldsRows();
  const axes = () =>
    axesRows().filter(
      (a): a is typeof a & { placeId: PlaceId } => a.placeId != null,
    );
  const circularRepeaters = () =>
    circularRepeatersRows().filter(
      (r): r is typeof r & { placeId: PlaceId } => r.placeId != null,
    );

  createEffect(() => {
    const isEmpty =
      places().length === 0 &&
      lineSegments().length === 0 &&
      circularFields().length === 0;
    if (isEmpty && guideStep() === 'observe') {
      batch(() => {
        setHasDrawingPaneSelected(true);
        setSelectedPlaceId(null);
        setSelectedLineSegmentId(null);
        setSelectedAxisId(null);
        setSelectedCircularRepeaterId(null);
        setGuideStep('transform');
      });
    }
  });

  function nextPlaceName(
    placesList: ReadonlyArray<{ name: string | null }>,
  ): string {
    const placeNumOnly = /^Place (\d+)$/;
    const placeNumEcho = /^Place (\d+) Echo \d+$/;
    let max = 0;
    for (const p of placesList) {
      const name = p.name?.trim();
      if (!name) continue;
      let m = placeNumOnly.exec(name);
      if (m && m[1] != null) {
        max = Math.max(max, Number.parseInt(m[1], 10));
        continue;
      }
      m = placeNumEcho.exec(name);
      if (m && m[1] != null)
        max = Math.max(max, Number.parseInt(m[1], 10));
    }
    return `Place ${max + 1}`;
  }

  function nextRepeaterName(
    repeatersList: ReadonlyArray<{ name: string | null }>,
  ): string {
    const repeaterNumPattern = /^Repeater (\d+)$/;
    let max = 0;
    for (const r of repeatersList) {
      const name = r.name?.trim();
      if (!name) continue;
      const m = repeaterNumPattern.exec(name);
      if (m && m[1] != null)
        max = Math.max(max, Number.parseInt(m[1], 10));
    }
    return `Repeater ${max + 1}`;
  }

  /** Axis id for a place in a repeater echo group (the place or an ancestor has parentAxisId). */
  function getAxisIdForEcho(
    place: { parentAxisId?: AxisId | null; parentId?: PlaceId | null },
    placesList: ReadonlyArray<{
      id: PlaceId;
      parentAxisId?: AxisId | null;
      parentId?: PlaceId | null;
    }>,
  ): AxisId | null {
    if (place.parentAxisId != null) return place.parentAxisId;
    if (place.parentId == null) return null;
    const parent = placesList.find((p) => p.id === place.parentId);
    return parent ? getAxisIdForEcho(parent, placesList) : null;
  }

  /** All place ids reachable by following parentId from the given place (excluding the root). */
  function getDescendantPlaceIds(
    placeId: PlaceId,
    placesList: ReadonlyArray<{ id: PlaceId; parentId?: PlaceId | null }>,
  ): PlaceId[] {
    const result: PlaceId[] = [];
    let queue = placesList
      .filter((p) => p.parentId === placeId)
      .map((p) => p.id);
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      const children = placesList
        .filter((p) => p.parentId === id)
        .map((p) => p.id);
      queue = queue.concat(children);
    }
    return result;
  }

  function nextLineSegmentName(
    segmentsList: ReadonlyArray<{ name: string | null }>,
  ): string {
    const lineNumPattern = /^Line (\d+)$/;
    let max = 0;
    for (const s of segmentsList) {
      const name = s.name?.trim();
      if (!name) continue;
      const m = lineNumPattern.exec(name);
      if (m && m[1] != null) max = Math.max(max, Number.parseInt(m[1], 10));
    }
    return `Line ${max + 1}`;
  }

  type PlaceLike = {
    id: PlaceId;
    parentId: PlaceId | null;
    parentAxisId?: AxisId | null;
    distanceAlongAxis?: number | null;
    distanceFromAxis?: number | null;
    repeaterEchoGroupId?: PlaceId | null;
    parentCircularFieldId?: CircularFieldId | null;
    angleOnCircle?: number | null;
    x: number | null;
    y: number | null;
    angle?: number | null;
  };

  const rotateBy = (angle: number, dx: number, dy: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  };

  type MoveOverrideSingle = {
    placeId: PlaceId | 'pending';
    x: number;
    y: number;
  };
  type MoveOverride =
    | MoveOverrideSingle
    | Array<{ placeId: PlaceId; x: number; y: number }>
    | null;

  const getAbsolutePosition = (
    place: PlaceLike,
    placesList: ReadonlyArray<PlaceLike>,
    moveOverride?: MoveOverride,
    angleOverride?: { placeId: PlaceId; angle: number } | null,
  ): { x: number; y: number; worldAngle: number } => {
    let resolved: MoveOverrideSingle | null = null;
    if (moveOverride != null) {
      if (Array.isArray(moveOverride)) {
        const o = moveOverride.find((e) => e.placeId === place.id);
        resolved = o ?? null;
      } else if (moveOverride.placeId === place.id) {
        resolved = moveOverride;
      }
    }
    if (resolved) {
      const localAngle = place.angle ?? 0;
      let worldAngle = localAngle;
      if (place.parentAxisId != null) {
        const axis = axes().find((a) => a.id === place.parentAxisId);
        const parent = axis
          ? placesList.find((p) => p.id === axis.placeId)
          : null;
        if (parent) {
          const parentRes = getAbsolutePosition(
            parent,
            placesList,
            moveOverride,
            angleOverride,
          );
          worldAngle = parentRes.worldAngle + (axis ? Number(axis.angle) : 0);
        }
      } else if (place.parentCircularFieldId != null) {
        const cf = circularFields().find(
          (c) => c.id === place.parentCircularFieldId,
        );
        const parent = cf ? placesList.find((p) => p.id === cf.placeId) : null;
        if (parent) {
          const parentRes = getAbsolutePosition(
            parent,
            placesList,
            moveOverride,
            angleOverride,
          );
          worldAngle = parentRes.worldAngle;
        }
      } else if (place.parentId !== null) {
        const parent = placesList.find((p) => p.id === place.parentId);
        if (parent) {
          const parentRes = getAbsolutePosition(
            parent,
            placesList,
            moveOverride,
            angleOverride,
          );
          worldAngle = parentRes.worldAngle + localAngle;
        }
      }
      return { x: resolved.x, y: resolved.y, worldAngle };
    }
    if (place.parentAxisId != null) {
      const axis = axes().find((a) => a.id === place.parentAxisId);
      const parent = axis
        ? placesList.find((p) => p.id === axis.placeId)
        : null;
      if (axis && parent) {
        const parentRes = getAbsolutePosition(
          parent,
          placesList,
          moveOverride,
          angleOverride,
        );
        const baseAxisAngle =
          parentRes.worldAngle + Number(axis.angle);
        const worldAngle =
          angleOverride && place.id === angleOverride.placeId
            ? angleOverride.angle
            : baseAxisAngle + (place.angle ?? 0);
        let d = place.distanceAlongAxis ?? 0;
        if (axis.isBidirectional === 0) d = Math.max(0, d);
        const perp = place.distanceFromAxis ?? 0;
        const cosA = Math.cos(baseAxisAngle);
        const sinA = Math.sin(baseAxisAngle);
        return {
          x: parentRes.x + d * cosA + perp * -sinA,
          y: parentRes.y + d * sinA + perp * cosA,
          worldAngle,
        };
      }
    }
    if (place.parentCircularFieldId != null) {
      const cf = circularFields().find(
        (c) => c.id === place.parentCircularFieldId,
      );
      const parent = cf ? placesList.find((p) => p.id === cf.placeId) : null;
      if (cf && parent) {
        const parentRes = getAbsolutePosition(
          parent,
          placesList,
          moveOverride,
          angleOverride,
        );
        const radius = Number(cf.radius);
        const angleOnCircle = place.angleOnCircle ?? 0;
        const localX = radius * Math.cos(angleOnCircle);
        const localY = radius * Math.sin(angleOnCircle);
        const rotated = rotateBy(parentRes.worldAngle, localX, localY);
        return {
          x: parentRes.x + rotated.x,
          y: parentRes.y + rotated.y,
          worldAngle: parentRes.worldAngle,
        };
      }
    }
    if (place.parentId === null) {
      const worldAngle =
        angleOverride?.placeId === place.id
          ? angleOverride.angle
          : (place.angle ?? 0);
      return {
        x: place.x ?? 0,
        y: place.y ?? 0,
        worldAngle,
      };
    }
    const parent = placesList.find((p) => p.id === place.parentId);
    if (!parent)
      return {
        x: place.x ?? 0,
        y: place.y ?? 0,
        worldAngle: place.angle ?? 0,
      };
    const parentRes = getAbsolutePosition(
      parent,
      placesList,
      moveOverride,
      angleOverride,
    );
    const placeEffectiveAngle =
      angleOverride?.placeId === place.id
        ? angleOverride.angle
        : (place.angle ?? 0);
    const parentWorldAngle = parentRes.worldAngle;
    const localOffset = { x: place.x ?? 0, y: place.y ?? 0 };
    const rotated = rotateBy(parentWorldAngle, localOffset.x, localOffset.y);
    const worldAngle =
      angleOverride?.placeId === place.id
        ? angleOverride.angle
        : parentWorldAngle + placeEffectiveAngle;
    return {
      x: parentRes.x + rotated.x,
      y: parentRes.y + rotated.y,
      worldAngle,
    };
  };

  /** World-space angle of the axis a place lies on (radians), or null if not on an axis. */
  function getAxisWorldAngle(
    place: PlaceLike,
    placesList: ReadonlyArray<PlaceLike>,
    angleOverride: { placeId: PlaceId; angle: number } | null,
  ): number | null {
    if (place.parentAxisId == null) return null;
    const axis = axes().find((a) => a.id === place.parentAxisId);
    const parent = axis
      ? placesList.find((p) => p.id === axis.placeId)
      : null;
    if (!axis || !parent) return null;
    const parentRes = getAbsolutePosition(
      parent,
      placesList,
      null,
      angleOverride,
    );
    return parentRes.worldAngle + Number(axis.angle);
  }

  /** Build move overrides for pending drag: only the moved place's echo group gets overrides. When places are on repeater axes, the drag is decomposed into along-axis and perpendicular components and applied per echo so each moves along its own axis (line-segment ends stay anchored to their place-echoes). */
  function buildMoveOverrideForPendingMove(
    placesList: ReadonlyArray<PlaceLike>,
    pm: { placeId: PlaceId | 'pending'; x: number; y: number } | null,
    angleOverride: { placeId: PlaceId; angle: number } | null,
  ): MoveOverride {
    if (!pm || pm.placeId === 'pending') return null;
    const movedPlace = placesList.find((p) => p.id === pm.placeId) as
      | PlaceLike
      | undefined;
    if (!movedPlace)
      return { placeId: pm.placeId, x: pm.x, y: pm.y };
    const groupId = movedPlace.repeaterEchoGroupId;
    if (groupId == null)
      return { placeId: pm.placeId, x: pm.x, y: pm.y };
    const groupPlaces = placesList.filter(
      (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
    );
    const committedMoved = getAbsolutePosition(
      movedPlace,
      placesList,
      null,
      angleOverride,
    );
    const dx = pm.x - committedMoved.x;
    const dy = pm.y - committedMoved.y;
    const movedAxisAngle = getAxisWorldAngle(movedPlace, placesList, angleOverride);
    let along = dx;
    let perp = dy;
    if (movedAxisAngle != null) {
      const c = Math.cos(movedAxisAngle);
      const s = Math.sin(movedAxisAngle);
      along = dx * c + dy * s;
      perp = -dx * s + dy * c;
    }
    const axis =
      movedPlace.parentAxisId != null
        ? axes().find((a) => a.id === movedPlace.parentAxisId)
        : null;
    const allSameAxis = groupPlaces.every(
      (p) => (p as PlaceLike).parentAxisId === movedPlace.parentAxisId,
    );
    const isMirrorSameAxis =
      axis != null &&
      (axis as { isMirror?: number | null }).isMirror === 1 &&
      allSameAxis;
    const overrides: Array<{ placeId: PlaceId; x: number; y: number }> = [];
    for (const place of groupPlaces) {
      const committed = getAbsolutePosition(
        place,
        placesList,
        null,
        angleOverride,
      );
      let worldDx = dx;
      let worldDy = dy;
      const placeAxisAngle = getAxisWorldAngle(place, placesList, angleOverride);
      if (placeAxisAngle != null) {
        const c = Math.cos(placeAxisAngle);
        const s = Math.sin(placeAxisAngle);
        const pPerp =
          isMirrorSameAxis && place.id !== pm.placeId ? -perp : perp;
        worldDx = along * c - pPerp * s;
        worldDy = along * s + pPerp * c;
      }
      overrides.push({
        placeId: place.id,
        x: committed.x + worldDx,
        y: committed.y + worldDy,
      });
    }
    return overrides;
  }

  /** Axis number (1-based) for a circular repeater axis, stable under repeater rotation. */
  const circularRepeaterAxisNumber = (
    axisId: AxisId,
    circularRepeaterId: CircularRepeaterId,
    axesList: ReadonlyArray<{
      id: AxisId;
      angle: unknown;
      circularRepeaterId?: CircularRepeaterId | null;
    }>,
  ): number => {
    const repAxes = axesList.filter(
      (a) => a.circularRepeaterId === circularRepeaterId,
    );
    const sorted = [...repAxes].sort(
      (a, b) => Number(a.angle) - Number(b.angle),
    );
    const idx = sorted.findIndex((a) => a.id === axisId);
    return idx >= 0 ? idx + 1 : 0;
  };

  /** Circular repeater id for a place that is a descendant of a repeater, or null. */
  function getCircularRepeaterIdForPlace(
    placeId: PlaceId,
    placesList: ReadonlyArray<PlaceLike>,
    axesList: ReadonlyArray<{ id: AxisId; circularRepeaterId?: CircularRepeaterId | null }>,
  ): CircularRepeaterId | null {
    const place = placesList.find((p) => p.id === placeId);
    if (!place) return null;
    const axisId = getAxisIdForEcho(place, placesList);
    if (!axisId) return null;
    const axis = axesList.find((a) => a.id === axisId) as
      | { circularRepeaterId?: CircularRepeaterId | null }
      | undefined;
    return axis?.circularRepeaterId ?? null;
  }

  /** All circular field ids in the same repeater echo group as the given field (by place). Returns [cfId] if not in a group. */
  function getCircularFieldEchoGroupIds(
    circularFieldId: CircularFieldId,
    placesList: ReadonlyArray<PlaceLike>,
    circularFieldsList: ReadonlyArray<{ id: CircularFieldId; placeId: PlaceId }>,
  ): CircularFieldId[] {
    const cf = circularFieldsList.find((c) => c.id === circularFieldId);
    if (!cf) return [circularFieldId];
    const place = placesList.find((p) => p.id === cf.placeId) as
      | (PlaceLike & { repeaterEchoGroupId?: PlaceId | null })
      | undefined;
    const groupId = place?.repeaterEchoGroupId;
    if (groupId == null) return [circularFieldId];
    const echoPlaceIds = new Set(
      placesList
        .filter((p) => (p as PlaceLike).repeaterEchoGroupId === groupId)
        .map((p) => p.id),
    );
    return circularFieldsList
      .filter((c) => echoPlaceIds.has(c.placeId))
      .map((c) => c.id);
  }

  /** Places in the same echo group as the given place, in stable order (by parent axis index). Returns [place] if not in a group. */
  function getPlaceEchoGroupPlaceIds(
    placeId: PlaceId,
    placesList: ReadonlyArray<PlaceLike>,
    axesList: ReadonlyArray<{
      id: AxisId;
      angle: unknown;
      circularRepeaterId?: CircularRepeaterId | null;
    }>,
  ): Array<PlaceLike & { id: PlaceId }> {
    const place = placesList.find((p) => p.id === placeId) as
      | (PlaceLike & { id: PlaceId })
      | undefined;
    if (!place) return [];
    const groupId = (place as PlaceLike).repeaterEchoGroupId ?? place.id;
    const echoes = placesList.filter(
      (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
    ) as Array<PlaceLike & { id: PlaceId }>;
    if (echoes.length <= 1) return echoes;
    const firstEcho = echoes[0];
    if (!firstEcho) return echoes;
    const firstAxisId = getAxisIdForEcho(firstEcho, placesList);
    if (!firstAxisId) return echoes;
    const axis = axesList.find((a) => a.id === firstAxisId);
    const repId = axis?.circularRepeaterId;
    if (repId == null) return echoes;
    return [...echoes].sort((a, b) => {
      const axisIdA = getAxisIdForEcho(a, placesList);
      const axisIdB = getAxisIdForEcho(b, placesList);
      const numA = axisIdA
        ? circularRepeaterAxisNumber(axisIdA, repId, axesList)
        : 0;
      const numB = axisIdB
        ? circularRepeaterAxisNumber(axisIdB, repId, axesList)
        : 0;
      return numA - numB;
    });
  }

  /** Repeater ids in the same echo group, in stable order (by place's parent axis index). Returns [repeaterId] if not in a group. */
  function getCircularRepeaterEchoGroupIds(
    repeaterId: CircularRepeaterId,
    circularRepeatersList: ReadonlyArray<{
      id: CircularRepeaterId;
      placeId: PlaceId;
      repeaterEchoGroupId?: CircularRepeaterId | null;
    }>,
    placesList: ReadonlyArray<PlaceLike>,
    axesList: ReadonlyArray<{
      id: AxisId;
      angle: unknown;
      circularRepeaterId?: CircularRepeaterId | null;
    }>,
  ): CircularRepeaterId[] {
    const repeater = circularRepeatersList.find((r) => r.id === repeaterId);
    if (!repeater) return [repeaterId];
    const canonicalId =
      (repeater as { repeaterEchoGroupId?: CircularRepeaterId | null })
        .repeaterEchoGroupId ?? repeater.id;
    const inGroup = circularRepeatersList.filter(
      (r) =>
        r.id === canonicalId ||
        (r as { repeaterEchoGroupId?: CircularRepeaterId | null })
          .repeaterEchoGroupId === canonicalId,
    );
    if (inGroup.length <= 1) return inGroup.map((r) => r.id);
    return [...inGroup]
      .sort((ra, rb) => {
        const placeA = placesList.find((p) => p.id === ra.placeId);
        const placeB = placesList.find((p) => p.id === rb.placeId);
        const axisIdA = placeA ? getAxisIdForEcho(placeA, placesList) : null;
        const axisIdB = placeB ? getAxisIdForEcho(placeB, placesList) : null;
        if (!axisIdA || !axisIdB) return 0;
        const axisA = axesList.find((a) => a.id === axisIdA);
        const axisB = axesList.find((a) => a.id === axisIdB);
        const repIdA = axisA?.circularRepeaterId;
        const repIdB = axisB?.circularRepeaterId;
        if (repIdA !== repIdB) return 0;
        const numA = repIdA
          ? circularRepeaterAxisNumber(axisIdA, repIdA, axesList)
          : 0;
        const numB = repIdB
          ? circularRepeaterAxisNumber(axisIdB, repIdB, axesList)
          : 0;
        return numA - numB;
      })
      .map((r) => r.id);
  }

  /** Echoes in the same repeater echo group, sorted by axis number (1-based order). */
  function getEchoesInAxisOrder(
    groupId: PlaceId,
    circularRepeaterId: CircularRepeaterId,
    placesList: ReadonlyArray<PlaceLike>,
    axesList: ReadonlyArray<{
      id: AxisId;
      angle: unknown;
      circularRepeaterId?: CircularRepeaterId | null;
    }>,
  ): PlaceLike[] {
    const echoes = placesList.filter(
      (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
    ) as PlaceLike[];
    return [...echoes].sort((a, b) => {
      const axisIdA = getAxisIdForEcho(a, placesList);
      const axisIdB = getAxisIdForEcho(b, placesList);
      const numA = axisIdA
        ? circularRepeaterAxisNumber(axisIdA, circularRepeaterId, axesList)
        : 0;
      const numB = axisIdB
        ? circularRepeaterAxisNumber(axisIdB, circularRepeaterId, axesList)
        : 0;
      return numA - numB;
    });
  }

  /** All line segments in the same repeater echo group (same logical line). Returns only the given segment if not in a group. */
  function getLineSegmentsInEchoGroup(
    segmentId: LineSegmentId,
    segmentsList: ReadonlyArray<{
      id: LineSegmentId;
      endAId?: LineSegmentEndId | null;
      endBId?: LineSegmentEndId | null;
      repeaterLineSegmentEchoGroupId?: LineSegmentId | null;
    }>,
  ): Array<{
    id: LineSegmentId;
    endAId: LineSegmentEndId | null;
    endBId: LineSegmentEndId | null;
    repeaterLineSegmentEchoGroupId?: LineSegmentId | null;
  }> {
    const seg = segmentsList.find((s) => s.id === segmentId);
    if (!seg) return [];
    const groupId =
      (seg as { repeaterLineSegmentEchoGroupId?: LineSegmentId | null })
        .repeaterLineSegmentEchoGroupId ?? seg.id;
    return segmentsList.filter(
      (s) =>
        s.id === groupId ||
        (s as { repeaterLineSegmentEchoGroupId?: LineSegmentId | null })
          .repeaterLineSegmentEchoGroupId === groupId,
    ) as Array<{
      id: LineSegmentId;
      endAId: LineSegmentEndId | null;
      endBId: LineSegmentEndId | null;
      repeaterLineSegmentEchoGroupId?: LineSegmentId | null;
    }>;
  }

  /** Whether a 1-based axis number is in the alternating pattern (show/skip/start). No pattern (nulls) = all axes. */
  const inAxisAlternatingPattern = (
    axisNumber1Based: number,
    start: number | null | undefined,
    show: number | null | undefined,
    skip: number | null | undefined,
    axisCount: number,
  ): boolean => {
    const s = start ?? 1;
    const sh = show ?? 1;
    const sk = skip ?? 0;
    if (axisCount <= 0) return false;
    const period = sh + sk;
    if (period <= 0) return true;
    const step = ((axisNumber1Based - s + axisCount) % axisCount + axisCount) % axisCount;
    return step % period < sh;
  };

  /** Given a repeater and a world point, return (distanceAlongAxis, distanceFromAxis, axisId) in the frame of the nearest repeater axis. */
  const repeaterPointToAxisParams = (
    circularRepeaterId: CircularRepeaterId,
    cx: number,
    cy: number,
    placesAbs: ReadonlyArray<{
      id: PlaceId;
      absX: number;
      absY: number;
      absWorldAngle: number;
    }>,
  ): {
    distanceAlongAxis: number;
    distanceFromAxis: number;
    axisId?: AxisId;
  } => {
    const repAxes = axes().filter(
      (a) =>
        (a as { circularRepeaterId?: CircularRepeaterId })
          .circularRepeaterId === circularRepeaterId,
    );
    let best: {
      d: number;
      perp: number;
      absPerp: number;
      axisId: AxisId;
    } | null = null;
    let fallback: {
      d: number;
      perp: number;
      absPerp: number;
      axisId: AxisId;
    } | null = null;
    for (const axis of repAxes) {
      const geom = getAxisWorldGeometry(
        { id: axis.id, placeId: axis.placeId, angle: Number(axis.angle) },
        placesAbs,
      );
      let d = projectPointOntoAxis(
        cx,
        cy,
        geom.originX,
        geom.originY,
        geom.worldAngle,
      );
      const cosA = Math.cos(geom.worldAngle);
      const sinA = Math.sin(geom.worldAngle);
      const projX = geom.originX + d * cosA;
      const projY = geom.originY + d * sinA;
      const perp = (cx - projX) * -sinA + (cy - projY) * cosA;
      const absPerp = Math.abs(perp);
      // For unidirectional axes, only consider this axis if the click is in the forward direction (d >= 0).
      // Otherwise we would pick an axis "behind" the click and clamp d to 0, snapping position to the center.
      if (axis.isBidirectional === 0) {
        if (d >= 0) {
          d = Math.max(0, d);
          if (best == null || absPerp < best.absPerp) {
            best = { d, perp, absPerp, axisId: axis.id };
          }
        } else if (fallback == null || absPerp < fallback.absPerp) {
          fallback = { d: 0, perp, absPerp, axisId: axis.id };
        }
      } else {
        if (best == null || absPerp < best.absPerp) {
          best = { d, perp, absPerp, axisId: axis.id };
        }
      }
    }
    const chosen = best ?? fallback;
    if (chosen == null) {
      return { distanceAlongAxis: 0, distanceFromAxis: 0 };
    }
    const perp =
      Math.abs(chosen.perp) <= AXIS_MAGNETIC_THRESHOLD ? 0 : chosen.perp;
    return {
      distanceAlongAxis: chosen.d,
      distanceFromAxis: perp,
      axisId: chosen.axisId,
    };
  };

  /** Given a repeater and a world point, return the snapped world position (x, y) for move preview. */
  const repeaterPointToSnappedWorld = (
    circularRepeaterId: CircularRepeaterId,
    cx: number,
    cy: number,
    placesAbs: ReadonlyArray<{
      id: PlaceId;
      absX: number;
      absY: number;
      absWorldAngle: number;
    }>,
  ): { x: number; y: number } => {
    const repAxes = axes().filter(
      (a) =>
        (a as { circularRepeaterId?: CircularRepeaterId })
          .circularRepeaterId === circularRepeaterId,
    );
    let best: {
      d: number;
      perp: number;
      absPerp: number;
      geom: { originX: number; originY: number; worldAngle: number };
    } | null = null;
    let fallback: {
      d: number;
      perp: number;
      absPerp: number;
      geom: { originX: number; originY: number; worldAngle: number };
    } | null = null;
    for (const axis of repAxes) {
      const geom = getAxisWorldGeometry(
        { id: axis.id, placeId: axis.placeId, angle: Number(axis.angle) },
        placesAbs,
      );
      let d = projectPointOntoAxis(
        cx,
        cy,
        geom.originX,
        geom.originY,
        geom.worldAngle,
      );
      const cosA = Math.cos(geom.worldAngle);
      const sinA = Math.sin(geom.worldAngle);
      const projX = geom.originX + d * cosA;
      const projY = geom.originY + d * sinA;
      const perp = (cx - projX) * -sinA + (cy - projY) * cosA;
      const absPerp = Math.abs(perp);
      const entry = { d, perp, absPerp, geom };
      if (axis.isBidirectional === 0) {
        if (d >= 0) {
          d = Math.max(0, d);
          if (best == null || absPerp < best.absPerp) {
            best = { d, perp, absPerp, geom };
          }
        } else if (fallback == null || absPerp < fallback.absPerp) {
          fallback = { d: 0, perp, absPerp, geom };
        }
      } else {
        if (best == null || absPerp < best.absPerp) {
          best = entry;
        }
      }
    }
    const chosen = best ?? fallback;
    if (chosen == null) {
      return { x: cx, y: cy };
    }
    const perpSnapped =
      Math.abs(chosen.perp) <= AXIS_MAGNETIC_THRESHOLD ? 0 : chosen.perp;
    const cosA = Math.cos(chosen.geom.worldAngle);
    const sinA = Math.sin(chosen.geom.worldAngle);
    const projX = chosen.geom.originX + chosen.d * cosA;
    const projY = chosen.geom.originY + chosen.d * sinA;
    return {
      x: projX + perpSnapped * -sinA,
      y: projY + perpSnapped * cosA,
    };
  };

  const placesWithAbsolutePositions = () => {
    const pl = places();
    const pm = pendingMove();
    const pr = pendingRotate();
    const angleOverride = pr ? { placeId: pr.placeId, angle: pr.angle } : null;
    const moveOverride = buildMoveOverrideForPendingMove(pl, pm, angleOverride);
    const result = pl.map((p) => {
      const abs = getAbsolutePosition(p, pl, moveOverride, angleOverride);
      return { ...p, absX: abs.x, absY: abs.y, absWorldAngle: abs.worldAngle };
    });
    if (pr) {
      const rotatedPlace = pl.find((p) => p.id === pr.placeId) as
        | PlaceLike
        | undefined;
      const groupId = rotatedPlace?.repeaterEchoGroupId;
      if (groupId != null && rotatedPlace) {
        const rotatedPlaceUnrotated = getAbsolutePosition(
          rotatedPlace,
          pl,
          moveOverride,
          null,
        );
        const delta = pr.angle - rotatedPlaceUnrotated.worldAngle;
        for (let i = 0; i < result.length; i++) {
          if ((result[i] as PlaceLike).repeaterEchoGroupId !== groupId) continue;
          const unrotated =
            result[i].id === pr.placeId
              ? rotatedPlaceUnrotated.worldAngle
              : result[i].absWorldAngle;
          result[i] = {
            ...result[i],
            absWorldAngle: unrotated + delta,
          } as (typeof result)[number];
        }
        const updatedIds = new Set<PlaceId>();
        for (let i = 0; i < result.length; i++) {
          if ((result[i] as PlaceLike).repeaterEchoGroupId !== groupId) continue;
          updatedIds.add(result[i].id);
        }
        const getPlaceDependency = (place: PlaceLike): PlaceId | null => {
          if (place.parentId != null) return place.parentId;
          if (place.parentAxisId != null) {
            const ax = axes().find((a) => a.id === place.parentAxisId);
            return ax ? ax.placeId : null;
          }
          if (place.parentCircularFieldId != null) {
            const cf = circularFields().find(
              (c) => c.id === place.parentCircularFieldId,
            );
            return cf ? cf.placeId : null;
          }
          return null;
        };
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < result.length; i++) {
            const p = result[i];
            const depId = getPlaceDependency(p as PlaceLike);
            if (
              depId == null ||
              !updatedIds.has(depId) ||
              updatedIds.has(p.id)
            )
              continue;
            const parentAbs = result.find((r) => r.id === depId);
            if (!parentAbs) continue;
            let absX: number;
            let absY: number;
            let absWorldAngle: number;
            if (p.parentId != null) {
              const localOffset = {
                x: (p as PlaceLike).x ?? 0,
                y: (p as PlaceLike).y ?? 0,
              };
              const rotated = rotateBy(
                parentAbs.absWorldAngle,
                localOffset.x,
                localOffset.y,
              );
              absX = parentAbs.absX + rotated.x;
              absY = parentAbs.absY + rotated.y;
              absWorldAngle =
                parentAbs.absWorldAngle + ((p as PlaceLike).angle ?? 0);
            } else if ((p as PlaceLike).parentAxisId != null) {
              const ax = axes().find(
                (a) => a.id === (p as PlaceLike).parentAxisId,
              );
              if (!ax) continue;
              const worldAngle =
                parentAbs.absWorldAngle + Number(ax.angle) +
                ((p as PlaceLike).angle ?? 0);
              let d = (p as PlaceLike).distanceAlongAxis ?? 0;
              if (ax.isBidirectional === 0) d = Math.max(0, d);
              const perp = (p as PlaceLike).distanceFromAxis ?? 0;
              const cosA = Math.cos(worldAngle);
              const sinA = Math.sin(worldAngle);
              absX = parentAbs.absX + d * cosA + perp * -sinA;
              absY = parentAbs.absY + d * sinA + perp * cosA;
              absWorldAngle = worldAngle;
            } else if ((p as PlaceLike).parentCircularFieldId != null) {
              const cf = circularFields().find(
                (c) => c.id === (p as PlaceLike).parentCircularFieldId,
              );
              if (!cf) continue;
              const radius = Number(cf.radius);
              const angleOnCircle = (p as PlaceLike).angleOnCircle ?? 0;
              const localX = radius * Math.cos(angleOnCircle);
              const localY = radius * Math.sin(angleOnCircle);
              const rotated = rotateBy(
                parentAbs.absWorldAngle,
                localX,
                localY,
              );
              absX = parentAbs.absX + rotated.x;
              absY = parentAbs.absY + rotated.y;
              absWorldAngle = parentAbs.absWorldAngle;
            } else continue;
            result[i] = {
              ...p,
              absX,
              absY,
              absWorldAngle,
            } as (typeof result)[number];
            updatedIds.add(p.id);
            changed = true;
          }
        }
      }
    }
    if (pm && pm.placeId !== 'pending') {
      const movedPlace = pl.find((p) => p.id === pm.placeId) as
        | PlaceLike
        | undefined;
      const groupId = movedPlace?.repeaterEchoGroupId;
      if (groupId != null && movedPlace) {
        const runDescendantPropagation = () => {
          const updatedIds = new Set<PlaceId>();
          for (let i = 0; i < result.length; i++) {
            const p = result[i];
            if ((p as PlaceLike).repeaterEchoGroupId !== groupId) continue;
            updatedIds.add(p.id);
          }
          const getPlaceDependency = (place: PlaceLike): PlaceId | null => {
            if (place.parentId != null) return place.parentId;
            if (place.parentAxisId != null) {
              const ax = axes().find((a) => a.id === place.parentAxisId);
              return ax ? ax.placeId : null;
            }
            if (place.parentCircularFieldId != null) {
              const cf = circularFields().find(
                (c) => c.id === place.parentCircularFieldId,
              );
              return cf ? cf.placeId : null;
            }
            return null;
          };
          let changed = true;
          while (changed) {
            changed = false;
            for (let i = 0; i < result.length; i++) {
              const p = result[i];
              const depId = getPlaceDependency(p as PlaceLike);
              if (
                depId == null ||
                !updatedIds.has(depId) ||
                updatedIds.has(p.id)
              )
                continue;
              const parentAbs = result.find((r) => r.id === depId);
              if (!parentAbs) continue;
              let absX: number;
              let absY: number;
              let absWorldAngle: number;
              if (p.parentId != null) {
                const localOffset = {
                  x: (p as PlaceLike).x ?? 0,
                  y: (p as PlaceLike).y ?? 0,
                };
                const rotated = rotateBy(
                  parentAbs.absWorldAngle,
                  localOffset.x,
                  localOffset.y,
                );
                absX = parentAbs.absX + rotated.x;
                absY = parentAbs.absY + rotated.y;
                absWorldAngle =
                  parentAbs.absWorldAngle + ((p as PlaceLike).angle ?? 0);
              } else if ((p as PlaceLike).parentAxisId != null) {
                const ax = axes().find(
                  (a) => a.id === (p as PlaceLike).parentAxisId,
                );
                if (!ax) continue;
                const worldAngle =
                  parentAbs.absWorldAngle + Number(ax.angle);
                let d = (p as PlaceLike).distanceAlongAxis ?? 0;
                if (ax.isBidirectional === 0) d = Math.max(0, d);
                const perp = (p as PlaceLike).distanceFromAxis ?? 0;
                const cosA = Math.cos(worldAngle);
                const sinA = Math.sin(worldAngle);
                absX = parentAbs.absX + d * cosA + perp * -sinA;
                absY = parentAbs.absY + d * sinA + perp * cosA;
                absWorldAngle = worldAngle;
              } else if ((p as PlaceLike).parentCircularFieldId != null) {
                const cf = circularFields().find(
                  (c) => c.id === (p as PlaceLike).parentCircularFieldId,
                );
                if (!cf) continue;
                const radius = Number(cf.radius);
                const angleOnCircle = (p as PlaceLike).angleOnCircle ?? 0;
                const localX = radius * Math.cos(angleOnCircle);
                const localY = radius * Math.sin(angleOnCircle);
                const rotated = rotateBy(
                  parentAbs.absWorldAngle,
                  localX,
                  localY,
                );
                absX = parentAbs.absX + rotated.x;
                absY = parentAbs.absY + rotated.y;
                absWorldAngle = parentAbs.absWorldAngle;
              } else continue;
              result[i] = {
                ...p,
                absX,
                absY,
                absWorldAngle,
              } as (typeof result)[number];
              updatedIds.add(p.id);
              changed = true;
            }
          }
        };
        if (movedPlace.parentAxisId != null) {
          const axis = axes().find((a) => a.id === movedPlace.parentAxisId);
          const parent = axis ? pl.find((p) => p.id === axis.placeId) : null;
          if (axis && parent) {
            const parentAbs = getAbsolutePosition(parent, pl);
            const worldAngle = parentAbs.worldAngle + Number(axis.angle);
            let d = projectPointOntoAxis(
              pm.x,
              pm.y,
              parentAbs.x,
              parentAbs.y,
              worldAngle,
            );
            if (axis.isBidirectional === 0) d = Math.max(0, d);
            const cosA = Math.cos(worldAngle);
            const sinA = Math.sin(worldAngle);
            const perp =
              (pm.x - (parentAbs.x + d * cosA)) * -sinA +
              (pm.y - (parentAbs.y + d * sinA)) * cosA;
            const isMirrorSameAxis =
              (axis as { isMirror?: number | null }).isMirror === 1;
            for (let i = 0; i < result.length; i++) {
              const p = result[i];
              if ((p as PlaceLike).repeaterEchoGroupId !== groupId) continue;
              const pAxisId = (p as PlaceLike).parentAxisId;
              if (pAxisId == null) continue;
              const pAxis = axes().find((a) => a.id === pAxisId);
              const pParent = pAxis
                ? pl.find((x) => x.id === pAxis.placeId)
                : null;
              if (!pAxis || !pParent) continue;
              const pParentAbs = getAbsolutePosition(pParent, pl);
              const pWorldAngle = pParentAbs.worldAngle + Number(pAxis.angle);
              const pCos = Math.cos(pWorldAngle);
              const pSin = Math.sin(pWorldAngle);
              const pPerp =
                isMirrorSameAxis && pAxisId === movedPlace.parentAxisId
                  ? (p as { id: PlaceId }).id === movedPlace.id
                    ? perp
                    : -perp
                  : perp;
              result[i] = {
                ...p,
                absX: pParentAbs.x + d * pCos + pPerp * -pSin,
                absY: pParentAbs.y + d * pSin + pPerp * pCos,
                absWorldAngle: pWorldAngle,
              } as (typeof result)[number];
            }
            runDescendantPropagation();
          }
        } else if (movedPlace.parentId != null) {
          const movedParentAbs = result.find(
            (r) => r.id === movedPlace.parentId,
          );
          if (movedParentAbs) {
            const worldDx = pm.x - movedParentAbs.absX;
            const worldDy = pm.y - movedParentAbs.absY;
            const newLocal = rotateBy(
              -movedParentAbs.absWorldAngle,
              worldDx,
              worldDy,
            );
            for (let i = 0; i < result.length; i++) {
              const p = result[i];
              if ((p as PlaceLike).repeaterEchoGroupId !== groupId) continue;
              const parentId = (p as PlaceLike).parentId;
              if (parentId == null) continue;
              const parentAbs = result.find((r) => r.id === parentId);
              if (!parentAbs) continue;
              const rotated = rotateBy(
                parentAbs.absWorldAngle,
                newLocal.x,
                newLocal.y,
              );
              result[i] = {
                ...p,
                absX: parentAbs.absX + rotated.x,
                absY: parentAbs.absY + rotated.y,
                absWorldAngle: p.absWorldAngle,
              } as (typeof result)[number];
            }
            runDescendantPropagation();
          }
        }
      }
    }
    const ps = pendingSplitLine();
    if (ps) {
      const previewX = pm?.placeId === PENDING_SPLIT_PLACE ? pm.x : ps.previewX;
      const previewY = pm?.placeId === PENDING_SPLIT_PLACE ? pm.y : ps.previewY;
      result.push({
        id: PENDING_SPLIT_PLACE,
        parentId: null,
        x: 0,
        y: 0,
        angle: null,
        name: null,
        isScaffolding: 1,
        absX: previewX,
        absY: previewY,
        absWorldAngle: 0,
      } as (typeof result)[number]);
    }
    const paPlace = pendingAddPlaceOnAxis();
    if (paPlace) {
      const axis = axes().find((a) => a.id === paPlace.axisId);
      if (axis) {
        const parentPlace = pl.find((p) => p.id === axis.placeId);
        if (parentPlace) {
          const parentAbs = getAbsolutePosition(
            parentPlace,
            pl,
            moveOverride,
            angleOverride,
          );
          const worldAngle = parentAbs.worldAngle + Number(axis.angle);
          const d = paPlace.distanceAlongAxis;
          const perp = paPlace.distanceFromAxis ?? 0;
          const cosA = Math.cos(worldAngle);
          const sinA = Math.sin(worldAngle);
          const px = parentAbs.x + d * cosA + perp * -sinA;
          const py = parentAbs.y + d * sinA + perp * cosA;
          const previewPx = pm?.placeId === PENDING_AXIS_PLACE ? pm.x : px;
          const previewPy = pm?.placeId === PENDING_AXIS_PLACE ? pm.y : py;
          result.push({
            id: PENDING_AXIS_PLACE,
            parentId: null,
            parentAxisId: null,
            x: 0,
            y: 0,
            angle: null,
            name: null,
            isScaffolding: 1,
            absX: previewPx,
            absY: previewPy,
            absWorldAngle: worldAngle,
          } as (typeof result)[number]);
        }
      }
    }
    const paRep = pendingAddPlaceOnCircularRepeater();
    if (paRep) {
      const repAxes = axes().filter(
        (a) =>
          (a as { circularRepeaterId?: CircularRepeaterId })
            .circularRepeaterId === paRep.circularRepeaterId,
      );
      const count = repAxes.length;
      const show = paRep.alternatingShow ?? 1;
      const skip = paRep.alternatingSkip ?? 1;
      const start = paRep.alternatingStart ?? 1;
      const perp = paRep.distanceFromAxis ?? 0;
      const usePattern = paRep.patternEnabled === true;
      let pendingEchoIndex = 0;
      for (let i = 0; i < repAxes.length; i++) {
        const axis = repAxes[i];
        if (!axis) continue;
        if (
          usePattern &&
          !inAxisAlternatingPattern(
            circularRepeaterAxisNumber(
              axis.id,
              paRep.circularRepeaterId,
              axes(),
            ),
            start,
            show,
            skip,
            count,
          )
        )
          continue;
        pendingEchoIndex += 1;
        const parentPlace = pl.find((p) => p.id === axis.placeId);
        if (parentPlace) {
          const parentAbs = getAbsolutePosition(
            parentPlace,
            pl,
            moveOverride,
            angleOverride,
          );
          const worldAngle = parentAbs.worldAngle + Number(axis.angle);
          const d = Math.max(0, paRep.distanceAlongAxis);
          const cosA = Math.cos(worldAngle);
          const sinA = Math.sin(worldAngle);
          const px = parentAbs.x + d * cosA + perp * -sinA;
          const py = parentAbs.y + d * sinA + perp * cosA;
          result.push({
            id: `__pending_rep_${pendingEchoIndex}__` as PlaceId,
            parentId: null,
            parentAxisId: null,
            x: 0,
            y: 0,
            angle: null,
            name: null,
            isScaffolding: 1,
            absX: px,
            absY: py,
            absWorldAngle: worldAngle,
          } as (typeof result)[number]);
        }
      }
    }
    const pac = pendingAddPlaceOnCircularField();
    if (pac) {
      const cf = circularFields().find((c) => c.id === pac.circularFieldId);
      if (cf) {
        const parentPlace = pl.find((p) => p.id === cf.placeId);
        if (parentPlace) {
          const parentAbs = getAbsolutePosition(
            parentPlace,
            pl,
            moveOverride,
            angleOverride,
          );
          const radius = Number(cf.radius);
          const angleOnCircle = pac.angleOnCircle;
          const localX = radius * Math.cos(angleOnCircle);
          const localY = radius * Math.sin(angleOnCircle);
          const rotated = rotateBy(parentAbs.worldAngle, localX, localY);
          const px = parentAbs.x + rotated.x;
          const py = parentAbs.y + rotated.y;
          const previewPx =
            pm?.placeId === PENDING_CIRCULAR_FIELD_PLACE ? pm.x : px;
          const previewPy =
            pm?.placeId === PENDING_CIRCULAR_FIELD_PLACE ? pm.y : py;
          result.push({
            id: PENDING_CIRCULAR_FIELD_PLACE,
            parentId: null,
            parentCircularFieldId: null,
            x: 0,
            y: 0,
            angle: null,
            name: null,
            isScaffolding: 1,
            absX: previewPx,
            absY: previewPy,
            absWorldAngle: parentAbs.worldAngle,
          } as (typeof result)[number]);
        }
      }
    }
    return result;
  };

  const relatedPlaceIds = createMemo(() =>
    getRelatedPlaceIds(selectedPlaceId(), places()),
  );

  /** When the selected place is in a repeater echo group, the set of all place ids in that group (for highlighting). */
  const selectedEchoGroupPlaceIds = createMemo(() => {
    const sid = selectedPlaceId();
    if (!sid) return new Set<PlaceId>();
    const place = places().find((p) => p.id === sid) as PlaceLike | undefined;
    const gid = place?.repeaterEchoGroupId;
    if (gid == null) return new Set<PlaceId>([sid]);
    return new Set(
      places()
        .filter((p) => (p as PlaceLike).repeaterEchoGroupId === gid)
        .map((p) => p.id),
    );
  });

  /** The place on which to show the move handle: selected place, or if an echo group the echo closest to the cursor. */
  const moveHandlePlaceId = createMemo(() => {
    const sid = selectedPlaceId();
    if (!sid) return null;
    const place = places().find((p) => p.id === sid) as PlaceLike | undefined;
    const gid = place?.repeaterEchoGroupId;
    if (gid == null) return sid;
    const cursor = lastCursorCanvas();
    const placesAbs = placesWithAbsolutePositions();
    const groupPlaces = placesAbs.filter(
      (p) => (p as PlaceLike).repeaterEchoGroupId === gid,
    );
    if (groupPlaces.length === 0) return sid;
    if (!cursor) return sid;
    let bestId: PlaceId = sid;
    let bestD = Infinity;
    for (const p of groupPlaces) {
      const d = Math.hypot(p.absX - cursor.x, p.absY - cursor.y);
      if (d < bestD) {
        bestD = d;
        bestId = p.id;
      }
    }
    return bestId;
  });

  const relationshipSegments = createMemo(() =>
    getRelationshipSegments(selectedPlaceId(), placesWithAbsolutePositions()),
  );

  const isPlaceAt = (
    px: number,
    py: number,
    place: { absX: number; absY: number },
  ) => Math.hypot(px - place.absX, py - place.absY) <= PLACE_RADIUS * 2;

  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = (x - translateX()) / scale();
    const cy = (y - translateY()) / scale();
    return { x: cx, y: cy };
  };

  const findPlaceAt = (cx: number, cy: number) =>
    placesWithAbsolutePositions().find(
      (p) => !String(p.id).startsWith('__pending_rep_') && isPlaceAt(cx, cy, p),
    );

  const lineSegmentsWithPositions = (): LineSegmentWithPositions[] => {
    const pl = places();
    const ends = lineSegmentEnds();
    const segs = lineSegments();
    const pm = pendingMove();
    const pr = pendingRotate();
    const ps = pendingSplitLine();
    const angleOverride = pr ? { placeId: pr.placeId, angle: pr.angle } : null;
    const moveOverride = buildMoveOverrideForPendingMove(pl, pm, angleOverride);
    const getPlaceAbs = (placeId: PlaceId) => {
      const place = pl.find((p) => p.id === placeId);
      if (!place) return null;
      const abs = getAbsolutePosition(place, pl, moveOverride, angleOverride);
      return { x: abs.x, y: abs.y };
    };
    let list = segs
      .filter((seg) => !ps || seg.id !== ps.segmentId)
      .map((seg) => {
        const endA = ends.find((e) => e.id === seg.endAId);
        const endB = ends.find((e) => e.id === seg.endBId);
        if (!endA || !endB || endA.placeId == null || endB.placeId == null)
          return null;
        const posA = getPlaceAbs(endA.placeId);
        const posB = getPlaceAbs(endB.placeId);
        if (!posA || !posB) return null;
        return {
          id: seg.id,
          x1: posA.x,
          y1: posA.y,
          x2: posB.x,
          y2: posB.y,
          isScaffolding:
            seg.isScaffolding != null ? Number(seg.isScaffolding) : null,
        };
      })
      .filter((s): s is LineSegmentWithPositions => s != null);
    if (ps) {
      const previewX = pm?.placeId === PENDING_SPLIT_PLACE ? pm.x : ps.previewX;
      const previewY = pm?.placeId === PENDING_SPLIT_PLACE ? pm.y : ps.previewY;
      const posA = getPlaceAbs(ps.placeAId);
      const posB = getPlaceAbs(ps.placeBId);
      const origSeg = segs.find((s) => s.id === ps.segmentId);
      const isScaff =
        origSeg?.isScaffolding != null ? Number(origSeg.isScaffolding) : null;
      if (posA && posB) {
        const synIdA = 'split-preview-a' as LineSegmentId;
        const synIdB = 'split-preview-b' as LineSegmentId;
        list = [
          ...list,
          {
            id: synIdA,
            x1: posA.x,
            y1: posA.y,
            x2: previewX,
            y2: previewY,
            isScaffolding: isScaff,
          },
          {
            id: synIdB,
            x1: previewX,
            y1: previewY,
            x2: posB.x,
            y2: posB.y,
            isScaffolding: isScaff,
          },
        ];
      }
    }
    return list;
  };

  const findLineSegmentAtCursor = (
    cx: number,
    cy: number,
  ): LineSegmentId | null => {
    const segs = lineSegmentsWithPositions();
    const fullSegs = lineSegments();
    const bending = bendingFieldsWithPositions();
    let bestId: LineSegmentId | null = null;
    let bestD = LINE_SEGMENT_HIT_THRESHOLD;
    for (const seg of segs) {
      const full = fullSegs.find((s) => s.id === seg.id);
      const bendA: BendCircle | undefined = full
        ? bending.find((b) => b.lineSegmentEndId === full.endAId)
        : undefined;
      const bendB: BendCircle | undefined = full
        ? bending.find((b) => b.lineSegmentEndId === full.endBId)
        : undefined;
      const d = distanceFromPointToBentPath(
        cx,
        cy,
        { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 },
        bendA,
        bendB,
      );
      if (d < bestD) {
        bestD = d;
        bestId = seg.id;
      }
    }
    return bestId;
  };

  const circularFieldsWithPositions = (): Array<{
    id: CircularFieldId;
    placeId: PlaceId;
    centerX: number;
    centerY: number;
    radius: number;
    radiusHandleAngle: number | null | undefined;
  }> => {
    const fields = circularFields();
    const positions = placesWithAbsolutePositions();
    return fields
      .map((f) => {
        if (f.placeId == null) return null;
        const place = positions.find((p) => p.id === f.placeId);
        if (!place) return null;
        return {
          id: f.id,
          placeId: f.placeId,
          centerX: place.absX,
          centerY: place.absY,
          radius: Number(f.radius),
          radiusHandleAngle: (f as { radiusHandleAngle?: number | null }).radiusHandleAngle,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  };

  const bendingFieldsWithPositions = (): Array<{
    id: BendingCircularFieldId;
    lineSegmentEndId: LineSegmentEndId;
    centerX: number;
    centerY: number;
    radius: number;
    endX: number;
    endY: number;
  }> => {
    const fields = bendingCircularFields();
    const ends = lineSegmentEnds();
    const positions = placesWithAbsolutePositions();
    return fields
      .map((f) => {
        if (f.lineSegmentEndId == null) return null;
        const end = ends.find((e) => e.id === f.lineSegmentEndId);
        if (!end?.placeId) return null;
        const place = positions.find((p) => p.id === end.placeId);
        if (!place) return null;
        const endX = place.absX;
        const endY = place.absY;
        const centerX = endX + Number(f.offsetX);
        const centerY = endY + Number(f.offsetY);
        return {
          id: f.id,
          lineSegmentEndId: f.lineSegmentEndId,
          centerX,
          centerY,
          radius: Number(f.radius),
          endX,
          endY,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);
  };

  /** True when (px, py) is within threshold of the circle's circumference (any angle). */
  const isPointNearRadiusHandle = (
    px: number,
    py: number,
    centerX: number,
    centerY: number,
    radius: number,
    threshold = CIRCULAR_FIELD_RADIUS_HANDLE_THRESHOLD,
  ) => {
    const distToCenter = Math.hypot(px - centerX, py - centerY);
    return Math.abs(distToCenter - radius) <= threshold;
  };

  const findCircularFieldAt = (
    cx: number,
    cy: number,
  ): CircularFieldId | null => {
    const threshold = CIRCULAR_FIELD_HIT_THRESHOLD;
    for (const cf of circularFieldsWithPositions()) {
      const dist = Math.hypot(cx - cf.centerX, cy - cf.centerY);
      if (dist <= cf.radius + threshold) return cf.id;
    }
    return null;
  };

  const findBendingCircularFieldAt = (
    cx: number,
    cy: number,
  ): BendingCircularFieldId | null => {
    const threshold = BENDING_FIELD_HIT_THRESHOLD;
    for (const bf of bendingFieldsWithPositions()) {
      const distToCenter = Math.hypot(cx - bf.centerX, cy - bf.centerY);
      if (distToCenter <= bf.radius + threshold) return bf.id;
      const distToRadiusLine = distanceFromPointToSegment(
        cx,
        cy,
        bf.centerX,
        bf.centerY,
        bf.endX,
        bf.endY,
      );
      if (distToRadiusLine <= threshold) return bf.id;
    }
    return null;
  };

  const isPointNearBendingRadiusHandle = (
    px: number,
    py: number,
    centerX: number,
    centerY: number,
    endX: number,
    endY: number,
    threshold = BENDING_FIELD_RADIUS_HANDLE_THRESHOLD,
  ) => {
    const handleX = 2 * centerX - endX;
    const handleY = 2 * centerY - endY;
    return Math.hypot(px - handleX, py - handleY) <= threshold;
  };

  const AXIS_HIT_THRESHOLD = 16;
  const findAxisAt = (cx: number, cy: number): AxisId | null => {
    const placesAbs = placesWithAbsolutePositions();
    const rect = svg?.getBoundingClientRect?.();
    if (!rect) return null;
    const viewport: ViewportCanvas = {
      left: -translateX() / scale(),
      top: -translateY() / scale(),
      width: rect.width / scale(),
      height: rect.height / scale(),
    };
    let best: { id: AxisId; dist: number } | null = null;
    for (const axis of axes()) {
      const geom = getAxisWorldGeometry(
        {
          id: axis.id,
          placeId: axis.placeId,
          angle: Number(axis.angle),
        },
        placesAbs,
      );
      const unidirectional = axis.isBidirectional === 0;
      const seg = axisSegmentInViewport(
        geom.originX,
        geom.originY,
        geom.worldAngle,
        viewport,
        100,
        { unidirectional },
      );
      const dist = distanceFromPointToSegment(
        cx,
        cy,
        seg.x1,
        seg.y1,
        seg.x2,
        seg.y2,
      );
      if (dist <= AXIS_HIT_THRESHOLD) {
        if (!best || dist < best.dist) best = { id: axis.id, dist };
      }
    }
    return best?.id ?? null;
  };

  const ORIENTATION_AXIS_LENGTH = 120;
  const isPointNearAxis = (
    px: number,
    py: number,
    cx: number,
    cy: number,
    angle: number,
    threshold = 36,
    useMathConvention = false,
  ) => {
    const dx = useMathConvention
      ? ORIENTATION_AXIS_LENGTH * Math.cos(angle)
      : ORIENTATION_AXIS_LENGTH * Math.sin(angle);
    const dy = useMathConvention
      ? ORIENTATION_AXIS_LENGTH * Math.sin(angle)
      : -ORIENTATION_AXIS_LENGTH * Math.cos(angle);
    const ex = cx + dx;
    const ey = cy + dy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return Math.hypot(px - cx, py - cy) <= threshold;
    const t = Math.max(
      0,
      Math.min(1, ((px - cx) * dx + (py - cy) * dy) / (len * len)),
    );
    const projX = cx + t * dx;
    const projY = cy + t * dy;
    return Math.hypot(px - projX, py - projY) <= threshold;
  };

  const handlePointerDown = (e: PointerEvent) => {
    const gs = guideStep();
    const tc = transformChoice();
    const md = mode();
    if (md !== 'default') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
    const hit = findPlaceAt(cx, cy);

    if (gs === 'select' || gs === 'transform') {
      if (hit) {
        setSelectedPlaceId(hit.id);
        setSelectedLineSegmentId(null);
        setSelectedCircularFieldId(null);
        setSelectedBendingCircularFieldId(null);
        setSelectedAxisId(null);
        setSelectedCircularRepeaterId(null);
        setHasDrawingPaneSelected(false);
      } else {
        const lineHit = findLineSegmentAtCursor(cx, cy);
        if (lineHit) {
          setSelectedLineSegmentId(lineHit);
          setSelectedPlaceId(null);
          setSelectedCircularFieldId(null);
          setSelectedBendingCircularFieldId(null);
          setSelectedAxisId(null);
          setSelectedCircularRepeaterId(null);
          setHasDrawingPaneSelected(false);
        } else {
          const cfHit = findCircularFieldAt(cx, cy);
          if (cfHit) {
            setSelectedCircularFieldId(cfHit);
            setSelectedPlaceId(null);
            setSelectedLineSegmentId(null);
            setSelectedBendingCircularFieldId(null);
            setSelectedAxisId(null);
            setSelectedCircularRepeaterId(null);
            setHasDrawingPaneSelected(false);
          } else {
            const bfHit = findBendingCircularFieldAt(cx, cy);
            if (bfHit) {
              setSelectedBendingCircularFieldId(bfHit);
              setSelectedPlaceId(null);
              setSelectedLineSegmentId(null);
              setSelectedCircularFieldId(null);
              setSelectedAxisId(null);
              setSelectedCircularRepeaterId(null);
              setHasDrawingPaneSelected(false);
            } else {
              const axisHit = findAxisAt(cx, cy);
              if (axisHit) {
                const axisRow = axes().find((a) => a.id === axisHit);
                const repeaterId = axisRow
                  ? (axisRow as { circularRepeaterId?: CircularRepeaterId })
                      .circularRepeaterId
                  : undefined;
                if (repeaterId != null) {
                  setSelectedCircularRepeaterId(repeaterId);
                  setSelectedAxisId(null);
                } else {
                  setSelectedAxisId(axisHit);
                  setSelectedCircularRepeaterId(null);
                }
                setSelectedPlaceId(null);
                setSelectedLineSegmentId(null);
                setSelectedCircularFieldId(null);
                setSelectedBendingCircularFieldId(null);
                setHasDrawingPaneSelected(false);
              } else {
                setSelectedPlaceId(null);
                setSelectedLineSegmentId(null);
                setSelectedCircularFieldId(null);
                setSelectedBendingCircularFieldId(null);
                setSelectedAxisId(null);
                setSelectedCircularRepeaterId(null);
                setHasDrawingPaneSelected(true);
              }
            }
          }
        }
      }
      if (gs === 'select') {
        setGuideStep('transform');
      }
      return;
    }

    const isAddOrAddRelated = tc === 'add' || tc === 'addRelated';
    if (gs === 'execute' && isAddOrAddRelated) {
      const pa = pendingAdd();
      if (pa && isPlaceAt(cx, cy, { absX: pa.x, absY: pa.y })) {
        setPendingMove({ placeId: 'pending' as PlaceId, x: pa.x, y: pa.y });
        return;
      }
      const parentId = tc === 'addRelated' ? selectedPlaceId() : null;
      setPendingAdd({ x: cx, y: cy, parentId });
      return;
    }

    const pac = pendingAddCircularField();
    if (
      gs === 'execute' &&
      tc === 'addCircularField' &&
      pac?.stage === 'placing'
    ) {
      const defaultName = nextPlaceName(places());
      const nameResult = String1000.from(defaultName);
      const placeRes = evolu.insert('place', {
        parentId: null,
        x: cx,
        y: cy,
        ...(nameResult.ok && { name: nameResult.value }),
        isScaffolding: 1,
      });
      if (placeRes.ok) {
        const cfRes = evolu.insert('circularField', {
          placeId: placeRes.value.id,
          radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
        });
        if (cfRes.ok) {
          setPendingAddCircularField({
            stage: 'editing',
            placeId: placeRes.value.id,
            circularFieldId: cfRes.value.id,
            radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
            isNewPlace: true,
          });
        }
      }
      return;
    }

    const pmc = pendingModifyCircularField();
    if (gs === 'execute' && tc === 'modifyCircularField' && pmc) {
      const cf = circularFieldsWithPositions().find(
        (c) => c.id === pmc.circularFieldId,
      );
      if (
        cf &&
        isPointNearRadiusHandle(cx, cy, cf.centerX, cf.centerY, pmc.radius)
      ) {
        setDraggingCircularFieldRadius(pmc.circularFieldId);
        setRadiusHandleDragPosition({ x: cx, y: cy });
        return;
      }
    }

    if (
      gs === 'execute' &&
      tc === 'addCircularField' &&
      pac?.stage === 'editing'
    ) {
      const place = placesWithAbsolutePositions().find(
        (p) => p.id === pac.placeId,
      );
      const centerX = place?.absX ?? 0;
      const centerY = place?.absY ?? 0;
      if (isPointNearRadiusHandle(cx, cy, centerX, centerY, pac.radius)) {
        setDraggingCircularFieldRadius(pac.circularFieldId);
        setRadiusHandleDragPosition({ x: cx, y: cy });
        return;
      }
      if (
        pac.isNewPlace &&
        isPlaceAt(cx, cy, { absX: centerX, absY: centerY })
      ) {
        setPendingMove({
          placeId: pac.placeId,
          x: centerX,
          y: centerY,
        });
        return;
      }
    }

    const paModRep = pendingModifyPlaceOnCircularRepeater();
    if (
      gs === 'execute' &&
      tc === 'modifyPlaceOnCircularRepeater' &&
      hit
    ) {
      const modPlace = paModRep
        ? (places().find((p) => p.id === paModRep.placeId) as
            | PlaceLike
            | undefined)
        : (places().find((p) => p.id === selectedPlaceId()) as
            | PlaceLike
            | undefined);
      const groupId = modPlace?.repeaterEchoGroupId;
      if (
        groupId != null &&
        (hit as PlaceLike).repeaterEchoGroupId === groupId
      ) {
        setPendingMove({
          placeId: hit.id,
          x: hit.absX,
          y: hit.absY,
        });
        return;
      }
    }

    if (gs === 'execute' && tc === 'move' && hit) {
      if (hit.id === selectedPlaceId()) {
        setPendingMove({
          placeId: hit.id,
          x: hit.absX,
          y: hit.absY,
        });
      }
    }

    if (
      gs === 'execute' &&
      tc === 'splitLine' &&
      pendingSplitLine() &&
      hit?.id === PENDING_SPLIT_PLACE
    ) {
      setPendingMove({
        placeId: PENDING_SPLIT_PLACE,
        x: hit.absX,
        y: hit.absY,
      });
    }

    const paPlace = pendingAddPlaceOnAxis();
    if (
      gs === 'execute' &&
      tc === 'addPlaceOnAxis' &&
      paPlace &&
      hit?.id === PENDING_AXIS_PLACE
    ) {
      setDraggingPlaceOnAxis(paPlace.axisId);
      return;
    }
    // When adding a place on axis, clicking on the axis line (or anywhere if mirror) places and starts drag.
    if (gs === 'execute' && tc === 'addPlaceOnAxis' && paPlace) {
      const axis = axes().find((a) => a.id === paPlace.axisId);
      if (axis) {
        const parentPlace = places().find((p) => p.id === axis.placeId);
        if (parentPlace) {
          const placesAbs = placesWithAbsolutePositions();
          const geom = getAxisWorldGeometry(
            { id: axis.id, placeId: axis.placeId, angle: Number(axis.angle) },
            placesAbs,
          );
          let d = projectPointOntoAxis(
            cx,
            cy,
            geom.originX,
            geom.originY,
            geom.worldAngle,
          );
          if (axis.isBidirectional === 0) d = Math.max(0, d);
          const projX = geom.originX + d * Math.cos(geom.worldAngle);
          const projY = geom.originY + d * Math.sin(geom.worldAngle);
          let perp =
            (cy - projY) * Math.cos(geom.worldAngle) -
            (cx - projX) * Math.sin(geom.worldAngle);
          const perpDist = Math.abs(perp);
          const isMirror =
            (axis as { isMirror?: number | null }).isMirror === 1;
          if (isMirror) {
            if (perpDist <= AXIS_MAGNETIC_THRESHOLD) perp = 0;
            setPendingAddPlaceOnAxis({
              axisId: paPlace.axisId,
              distanceAlongAxis: d,
              distanceFromAxis: perp,
            });
            setDraggingPlaceOnAxis(paPlace.axisId);
            return;
          }
          if (perpDist <= AXIS_HIT_THRESHOLD) {
            setPendingAddPlaceOnAxis({
              axisId: paPlace.axisId,
              distanceAlongAxis: d,
            });
            setDraggingPlaceOnAxis(paPlace.axisId);
            return;
          }
        }
      }
    }

    const paCf = pendingAddPlaceOnCircularField();
    if (
      gs === 'execute' &&
      tc === 'addPlaceOnCircularField' &&
      paCf &&
      hit?.id === PENDING_CIRCULAR_FIELD_PLACE
    ) {
      setDraggingPlaceOnCircularField(paCf.circularFieldId);
      return;
    }
    if (gs === 'execute' && tc === 'addPlaceOnCircularField' && paCf) {
      const cf = circularFieldsWithPositions().find(
        (c) => c.id === paCf.circularFieldId,
      );
      if (cf) {
        const dist = Math.hypot(cx - cf.centerX, cy - cf.centerY);
        const r = cf.radius;
        if (Math.abs(dist - r) <= CIRCULAR_FIELD_HIT_THRESHOLD) {
          const worldAngle = Math.atan2(cy - cf.centerY, cx - cf.centerX);
          const parentPlace = places().find((p) => p.id === cf.placeId);
          if (parentPlace) {
            const parentAbs = placesWithAbsolutePositions().find(
              (p) => p.id === parentPlace.id,
            );
            if (parentAbs) {
              const localAngle = worldAngle - parentAbs.absWorldAngle;
              setPendingAddPlaceOnCircularField({
                circularFieldId: paCf.circularFieldId,
                angleOnCircle: localAngle,
              });
              setDraggingPlaceOnCircularField(paCf.circularFieldId);
            }
          }
          return;
        }
      }
    }

    const paRep = pendingAddPlaceOnCircularRepeater();
    if (gs === 'execute' && tc === 'addPlaceOnCircularRepeater' && paRep) {
      const placesAbs = placesWithAbsolutePositions();
      const params = repeaterPointToAxisParams(
        paRep.circularRepeaterId,
        cx,
        cy,
        placesAbs,
      );
      const placementAxisNumber =
        params.axisId != null
          ? circularRepeaterAxisNumber(
              params.axisId,
              paRep.circularRepeaterId,
              axes(),
            )
          : undefined;
      setPendingAddPlaceOnCircularRepeater({
        ...paRep,
        distanceAlongAxis: params.distanceAlongAxis,
        distanceFromAxis: params.distanceFromAxis,
        ...(placementAxisNumber != null && { placementAxisNumber }),
      });
      setDraggingPlaceOnCircularRepeater(paRep.circularRepeaterId);
      return;
    }

    const pa = pendingAddAxis();
    const pmod = pendingModifyAxis();
    if (
      gs === 'execute' &&
      (tc === 'addAxis' || tc === 'modifyAxis') &&
      (pa || pmod) &&
      !draggingAxisAngle()
    ) {
      const placesAbs = placesWithAbsolutePositions();
      const axisInfo = pa
        ? {
            placeId: pa.placeId,
            angle: pa.angle,
            isBidirectional: pa.isBidirectional,
          }
        : pmod
          ? {
              placeId: pmod.placeId,
              angle: pmod.angle,
              isBidirectional: pmod.isBidirectional,
            }
          : null;
      if (axisInfo) {
        const geom = getAxisWorldGeometry(
          {
            id: '' as AxisId,
            placeId: axisInfo.placeId,
            angle: axisInfo.angle,
          },
          placesAbs,
        );
        const rect = svg?.getBoundingClientRect?.();
        if (rect) {
          const viewport: ViewportCanvas = {
            left: -translateX() / scale(),
            top: -translateY() / scale(),
            width: rect.width / scale(),
            height: rect.height / scale(),
          };
          const seg = axisSegmentInViewport(
            geom.originX,
            geom.originY,
            geom.worldAngle,
            viewport,
            100,
            { unidirectional: !axisInfo.isBidirectional },
          );
          const dist = distanceFromPointToSegment(
            cx,
            cy,
            seg.x1,
            seg.y1,
            seg.x2,
            seg.y2,
          );
          if (dist < 24) {
            setDraggingAxisAngle(true);
            return;
          }
        }
      }
    }

    if (gs === 'execute' && tc === 'moveCircularField') {
      const cfId = selectedCircularFieldId();
      if (cfId) {
        const cf = circularFieldsWithPositions().find((c) => c.id === cfId);
        if (cf) {
          const dist = Math.hypot(cx - cf.centerX, cy - cf.centerY);
          if (dist <= cf.radius + CIRCULAR_FIELD_HIT_THRESHOLD) {
            setPendingMove({
              placeId: cf.placeId,
              x: cf.centerX,
              y: cf.centerY,
            });
          }
        }
      }
    }

    if (gs === 'execute' && tc === 'bendAtEnds') {
      const segId = selectedLineSegmentId();
      if (segId) {
        const seg = lineSegments().find((s) => s.id === segId);
        if (seg) {
          const segmentBending = bendingFieldsWithPositions().filter(
            (bf) =>
              bf.lineSegmentEndId === seg.endAId ||
              bf.lineSegmentEndId === seg.endBId,
          );
          for (const bf of segmentBending) {
            if (
              isPointNearBendingRadiusHandle(
                cx,
                cy,
                bf.centerX,
                bf.centerY,
                bf.endX,
                bf.endY,
              )
            ) {
              setDraggingBendingCircularFieldRadius(bf.id);
              return;
            }
          }
          for (const bf of segmentBending) {
            const dist = Math.hypot(cx - bf.centerX, cy - bf.centerY);
            if (dist <= bf.radius + BENDING_FIELD_HIT_THRESHOLD) {
              setPendingMoveBendingCircularField(bf.id);
              return;
            }
          }
        }
      }
    }

    if (gs === 'execute' && tc === 'modifyBendingCircularField') {
      const bfId = selectedBendingCircularFieldId();
      if (bfId) {
        const bf = bendingFieldsWithPositions().find((b) => b.id === bfId);
        if (bf) {
          if (
            isPointNearBendingRadiusHandle(
              cx,
              cy,
              bf.centerX,
              bf.centerY,
              bf.endX,
              bf.endY,
            )
          ) {
            setDraggingBendingCircularFieldRadius(bfId);
            return;
          }
          const dist = Math.hypot(cx - bf.centerX, cy - bf.centerY);
          if (dist <= bf.radius + BENDING_FIELD_HIT_THRESHOLD) {
            setPendingMoveBendingCircularField(bfId);
          }
        }
      }
    }

    if (gs === 'execute' && tc === 'rotate') {
      const selId = selectedPlaceId();
      if (selId) {
        const place = placesWithAbsolutePositions().find((p) => p.id === selId);
        if (place) {
          const theta = pendingRotate()?.angle ?? place.absWorldAngle ?? 0;
          const parentAxisId = (place as PlaceLike).parentAxisId;
          const axis =
            parentAxisId != null
              ? axes().find((a) => a.id === parentAxisId)
              : null;
          const isRepeaterEcho =
            axis != null &&
            (axis as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId != null;
          const placesAbs = placesWithAbsolutePositions();
          const centerPlace =
            axis != null
              ? placesAbs.find((p) => p.id === axis.placeId)
              : null;
          const radialAngle =
            isRepeaterEcho && centerPlace != null
              ? Math.atan2(
                  place.absY - centerPlace.absY,
                  place.absX - centerPlace.absX,
                )
              : null;
          const angleForHit = theta;
          const useMathConvention = parentAxisId != null;
          if (
            isPointNearAxis(
              cx,
              cy,
              place.absX,
              place.absY,
              angleForHit,
              36,
              useMathConvention,
            )
          ) {
            setPendingRotate({
              placeId: selId,
              angle: theta,
            });
          }
        }
      }
    }

    const pals = pendingAddLineSegment();
    if (gs === 'execute' && tc === 'addLineSegment' && pals) {
      const placesList = places();
      const axesList = axes();
      const originEchoes = getEchoesInAxisOrder(
        pals.originGroupId,
        pals.circularRepeaterId,
        placesList,
        axesList,
      );
      if (originEchoes.length === 0) {
        setPendingAddLineSegment(null);
        return;
      }
      // Case 1: hit an existing place in the same repeater (not the origin)
      if (hit && hit.id !== pals.originSelectedPlaceId) {
        const hitRepeaterId = getCircularRepeaterIdForPlace(
          hit.id,
          placesList,
          axesList,
        );
        if (hitRepeaterId === pals.circularRepeaterId) {
          const hitPlace = placesList.find((p) => p.id === hit.id) as
            | PlaceLike
            | undefined;
          const hitGroupId = hitPlace?.repeaterEchoGroupId;
          if (hitGroupId != null) {
            const endingEchoes = getEchoesInAxisOrder(
              hitGroupId,
              pals.circularRepeaterId,
              placesList,
              axesList,
            );
            const originIdx = originEchoes.findIndex(
              (p) => p.id === pals.originSelectedPlaceId,
            );
            const endIdx = endingEchoes.findIndex((p) => p.id === hit.id);
            const originRotated =
              originIdx >= 0
                ? [
                    ...originEchoes.slice(originIdx),
                    ...originEchoes.slice(0, originIdx),
                  ]
                : originEchoes;
            const endRotated =
              endIdx >= 0
                ? [
                    ...endingEchoes.slice(endIdx),
                    ...endingEchoes.slice(0, endIdx),
                  ]
                : endingEchoes;
            const n = Math.min(originRotated.length, endRotated.length);
            const lineName = nextLineSegmentName(lineSegments());
            const segNameResult = String1000.from(lineName);
            let firstSegId: LineSegmentId | null = null;
            for (let i = 0; i < n; i++) {
              const origEcho = originRotated[i]!;
              const endEcho = endRotated[i]!;
              const endARes = evolu.insert('lineSegmentEnd', {
                placeId: origEcho.id,
              });
              const endBRes = evolu.insert('lineSegmentEnd', {
                placeId: endEcho.id,
              });
              if (endARes.ok && endBRes.ok && segNameResult.ok) {
                const segRes = evolu.insert('lineSegment', {
                  endAId: endARes.value.id,
                  endBId: endBRes.value.id,
                  name: segNameResult.value,
                  isScaffolding: 0,
                  ...(firstSegId != null && {
                    repeaterLineSegmentEchoGroupId: firstSegId,
                  }),
                });
                if (segRes.ok) {
                  if (firstSegId == null) {
                    firstSegId = segRes.value.id;
                    evolu.update('lineSegment', {
                      id: firstSegId,
                      repeaterLineSegmentEchoGroupId: firstSegId,
                    });
                  }
                  recordTransformation({
                    kind: 'addLine',
                    placeId: origEcho.id,
                    lineSegmentId: segRes.value.id,
                  });
                }
                const placeNameA =
                  (origEcho as { name?: string | null }).name?.trim() ||
                  'Place';
                const placeNameB =
                  (endEcho as { name?: string | null }).name?.trim() || 'Place';
                const endAName = String1000.from(
                  lineSegmentEndDisplayName(lineName, placeNameA),
                );
                const endBName = String1000.from(
                  lineSegmentEndDisplayName(lineName, placeNameB),
                );
                if (endAName.ok)
                  evolu.update('lineSegmentEnd', {
                    id: endARes.value.id,
                    name: endAName.value,
                  });
                if (endBName.ok)
                  evolu.update('lineSegmentEnd', {
                    id: endBRes.value.id,
                    name: endBName.value,
                  });
              }
            }
            setPendingAddLineSegment(null);
            return;
          }
        }
      }
      // Case 2: hit nothing (or not same repeater) – create new ending place and segments
      if (!hit || getCircularRepeaterIdForPlace(hit.id, placesList, axesList) !== pals.circularRepeaterId) {
        const firstOrigin = originEchoes[0]! as PlaceLike & {
          alternatingShow?: number | null;
          alternatingSkip?: number | null;
          alternatingStart?: number | null;
        };
        const show = firstOrigin.alternatingShow ?? 1;
        const skip = firstOrigin.alternatingSkip ?? 1;
        const start = firstOrigin.alternatingStart ?? 1;
        const baseName = nextPlaceName(placesList);
        const newEchoes: { id: PlaceId; name: string }[] = [];
        let groupId: PlaceId | null = null;
        for (let i = 0; i < originEchoes.length; i++) {
          const originEcho = originEchoes[i]!;
          const abs = getAbsolutePosition(originEcho, placesList);
          const worldOffset = { x: cx - abs.x, y: cy - abs.y };
          const local = rotateBy(-abs.worldAngle, worldOffset.x, worldOffset.y);
          const echoName = `${baseName} Echo ${i + 1}`;
          const echoNameResult = String1000.from(echoName);
          const placeRes = evolu.insert('place', {
            parentId: originEcho.id,
            x: local.x,
            y: local.y,
            ...(echoNameResult.ok && { name: echoNameResult.value }),
            ...(groupId != null && { repeaterEchoGroupId: groupId }),
            alternatingShow: show,
            alternatingSkip: skip,
            alternatingStart: start,
            isScaffolding: 1,
          });
          if (placeRes.ok) {
            if (groupId == null) {
              groupId = placeRes.value.id;
              evolu.update('place', {
                id: placeRes.value.id,
                repeaterEchoGroupId: groupId,
              });
            }
            newEchoes.push({
              id: placeRes.value.id,
              name: echoName,
            });
            recordTransformation({
              kind: 'addRelated',
              placeId: placeRes.value.id,
              parentId: originEcho.id,
              x: local.x,
              y: local.y,
            });
          }
        }
        const lineName = nextLineSegmentName(lineSegments());
        const segNameResult = String1000.from(lineName);
        let firstLineSegId: LineSegmentId | null = null;
        for (let i = 0; i < originEchoes.length && i < newEchoes.length; i++) {
          const origEcho = originEchoes[i]!;
          const newEcho = newEchoes[i]!;
          const endARes = evolu.insert('lineSegmentEnd', {
            placeId: origEcho.id,
          });
          const endBRes = evolu.insert('lineSegmentEnd', {
            placeId: newEcho.id,
          });
          if (endARes.ok && endBRes.ok && segNameResult.ok) {
            const segRes = evolu.insert('lineSegment', {
              endAId: endARes.value.id,
              endBId: endBRes.value.id,
              name: segNameResult.value,
              isScaffolding: 0,
              ...(firstLineSegId != null && {
                repeaterLineSegmentEchoGroupId: firstLineSegId,
              }),
            });
            if (segRes.ok) {
              if (firstLineSegId == null) {
                firstLineSegId = segRes.value.id;
                evolu.update('lineSegment', {
                  id: firstLineSegId,
                  repeaterLineSegmentEchoGroupId: firstLineSegId,
                });
              }
              recordTransformation({
                kind: 'addLine',
                placeId: origEcho.id,
                lineSegmentId: segRes.value.id,
              });
            }
            const placeNameA =
              (origEcho as { name?: string | null }).name?.trim() || 'Place';
            const endAName = String1000.from(
              lineSegmentEndDisplayName(lineName, placeNameA),
            );
            const endBName = String1000.from(
              lineSegmentEndDisplayName(lineName, newEcho.name),
            );
            if (endAName.ok)
              evolu.update('lineSegmentEnd', {
                id: endARes.value.id,
                name: endAName.value,
              });
            if (endBName.ok)
              evolu.update('lineSegmentEnd', {
                id: endBRes.value.id,
                name: endBName.value,
              });
          }
        }
        setPendingAddLineSegment(null);
        return;
      }
    }

    if (gs === 'execute' && tc === 'addLine') {
      const pal = pendingAddLine();
      if (!pal) return;
      if (hit && hit.id !== pal.startPlaceId) {
        const endBRes = evolu.insert('lineSegmentEnd', { placeId: hit.id });
        if (endBRes.ok) {
          const lineName = nextLineSegmentName(lineSegments());
          const nameResult = String1000.from(lineName);
          const placeNameA =
            places()
              .find((p) => p.id === pal.startPlaceId)
              ?.name?.trim() || 'Place';
          const placeNameB =
            places()
              .find((p) => p.id === hit.id)
              ?.name?.trim() || 'Place';
          const segRes = evolu.insert('lineSegment', {
            endAId: pal.startEndId,
            endBId: endBRes.value.id,
            ...(nameResult.ok && { name: nameResult.value }),
            isScaffolding: 0,
          });
          if (segRes.ok) {
            recordTransformation({
              kind: 'addLine',
              placeId: pal.startPlaceId,
              lineSegmentId: segRes.value.id,
            });
          }
          const endAName = String1000.from(
            lineSegmentEndDisplayName(lineName, placeNameA),
          );
          const endBName = String1000.from(
            lineSegmentEndDisplayName(lineName, placeNameB),
          );
          if (endAName.ok)
            evolu.update('lineSegmentEnd', {
              id: pal.startEndId,
              name: endAName.value,
            });
          if (endBName.ok)
            evolu.update('lineSegmentEnd', {
              id: endBRes.value.id,
              name: endBName.value,
            });
          setPendingAddLine(null);
        }
        return;
      }
      if (!hit) {
        const startPlaceId = pal.startPlaceId;
        const parent = places().find((p) => p.id === startPlaceId);
        const parentList = places();
        let x = cx;
        let y = cy;
        if (parent) {
          const parentRes = getAbsolutePosition(parent, parentList);
          const worldOffset = { x: cx - parentRes.x, y: cy - parentRes.y };
          const local = rotateBy(
            -parentRes.worldAngle,
            worldOffset.x,
            worldOffset.y,
          );
          x = local.x;
          y = local.y;
        }
        const defaultName = nextPlaceName(places());
        const nameResult = String1000.from(defaultName);
        const placeRes = evolu.insert('place', {
          parentId: startPlaceId,
          x,
          y,
          ...(nameResult.ok && { name: nameResult.value }),
          isScaffolding: 1,
        });
        if (placeRes.ok) {
          const endBRes = evolu.insert('lineSegmentEnd', {
            placeId: placeRes.value.id,
          });
          if (endBRes.ok) {
            const lineName = nextLineSegmentName(lineSegments());
            const segNameResult = String1000.from(lineName);
            const placeNameA =
              places()
                .find((p) => p.id === pal.startPlaceId)
                ?.name?.trim() || 'Place';
            const segRes = evolu.insert('lineSegment', {
              endAId: pal.startEndId,
              endBId: endBRes.value.id,
              ...(segNameResult.ok && { name: segNameResult.value }),
              isScaffolding: 0,
            });
            if (segRes.ok) {
              recordTransformation({
                kind: 'addLine',
                placeId: pal.startPlaceId,
                lineSegmentId: segRes.value.id,
              });
            }
            const endAName = String1000.from(
              lineSegmentEndDisplayName(lineName, placeNameA),
            );
            const endBName = String1000.from(
              lineSegmentEndDisplayName(lineName, defaultName),
            );
            if (endAName.ok)
              evolu.update('lineSegmentEnd', {
                id: pal.startEndId,
                name: endAName.value,
              });
            if (endBName.ok)
              evolu.update('lineSegmentEnd', {
                id: endBRes.value.id,
                name: endBName.value,
              });
            setPendingAddLine(null);
            setPendingMove({
              placeId: placeRes.value.id,
              x: cx,
              y: cy,
            });
          }
        }
      }
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const pm = pendingMove();
    const pr = pendingRotate();
    const pa = pendingAdd();
    const pal = pendingAddLine();
    const pac = pendingAddCircularField();
    const draggingCf = draggingCircularFieldRadius();
    const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
    if (pal && guideStep() === 'execute' && mode() === 'default') {
      setPendingAddLine({ ...pal, cursorX: cx, cursorY: cy });
    }
    const dragPlaceOnAxis = draggingPlaceOnAxis();
    if (dragPlaceOnAxis && guideStep() === 'execute' && mode() === 'default') {
      const axis = axes().find((a) => a.id === dragPlaceOnAxis);
      if (axis) {
        const parentPlace = places().find((p) => p.id === axis.placeId);
        if (parentPlace) {
          const placesAbs = placesWithAbsolutePositions();
          const geom = getAxisWorldGeometry(
            { id: axis.id, placeId: axis.placeId, angle: Number(axis.angle) },
            placesAbs,
          );
          let d = projectPointOntoAxis(
            cx,
            cy,
            geom.originX,
            geom.originY,
            geom.worldAngle,
          );
          if (axis.isBidirectional === 0) d = Math.max(0, d);
          const isMirror =
            (axis as { isMirror?: number | null }).isMirror === 1;
          if (isMirror) {
            const projX = geom.originX + d * Math.cos(geom.worldAngle);
            const projY = geom.originY + d * Math.sin(geom.worldAngle);
            let perp =
              (cy - projY) * Math.cos(geom.worldAngle) -
              (cx - projX) * Math.sin(geom.worldAngle);
            if (Math.abs(perp) <= AXIS_MAGNETIC_THRESHOLD) perp = 0;
            setPendingAddPlaceOnAxis({
              axisId: dragPlaceOnAxis,
              distanceAlongAxis: d,
              distanceFromAxis: perp,
            });
          } else {
            setPendingAddPlaceOnAxis({
              axisId: dragPlaceOnAxis,
              distanceAlongAxis: d,
            });
          }
        }
      }
    }

    const dragPlaceOnRep = draggingPlaceOnCircularRepeater();
    if (dragPlaceOnRep && guideStep() === 'execute' && mode() === 'default') {
      const paRep = pendingAddPlaceOnCircularRepeater();
      if (paRep) {
        const placesAbs = placesWithAbsolutePositions();
        const params = repeaterPointToAxisParams(
          paRep.circularRepeaterId,
          cx,
          cy,
          placesAbs,
        );
        const placementAxisNumber =
          params.axisId != null
            ? circularRepeaterAxisNumber(
                params.axisId,
                paRep.circularRepeaterId,
                axes(),
              )
            : undefined;
        setPendingAddPlaceOnCircularRepeater({
          ...paRep,
          distanceAlongAxis: params.distanceAlongAxis,
          distanceFromAxis: params.distanceFromAxis,
          ...(placementAxisNumber != null && { placementAxisNumber }),
        });
      }
    }

    const dragPlaceOnCf = draggingPlaceOnCircularField();
    if (dragPlaceOnCf && guideStep() === 'execute' && mode() === 'default') {
      const paCf = pendingAddPlaceOnCircularField();
      if (paCf) {
        const cf = circularFieldsWithPositions().find(
          (c) => c.id === paCf.circularFieldId,
        );
        if (cf) {
          const worldAngle = Math.atan2(cy - cf.centerY, cx - cf.centerX);
          const parentPlace = places().find((p) => p.id === cf.placeId);
          if (parentPlace) {
            const parentAbs = placesWithAbsolutePositions().find(
              (p) => p.id === parentPlace.id,
            );
            if (parentAbs) {
              const localAngle = worldAngle - parentAbs.absWorldAngle;
              setPendingAddPlaceOnCircularField({
                ...paCf,
                angleOnCircle: localAngle,
              });
            }
          }
        }
      }
    }

    if (
      draggingAxisAngle() &&
      guideStep() === 'execute' &&
      mode() === 'default'
    ) {
      const addAx = pendingAddAxis();
      const modAx = pendingModifyAxis();
      const axisInfo = addAx ?? modAx;
      if (axisInfo) {
        const parentPlace = places().find((p) => p.id === axisInfo.placeId);
        if (parentPlace) {
          const placesAbs = placesWithAbsolutePositions();
          const parentAbs = placesAbs.find((p) => p.id === parentPlace.id);
          if (parentAbs) {
            const worldAngle = Math.atan2(
              cy - parentAbs.absY,
              cx - parentAbs.absX,
            );
            const axisAngle = worldAngle - parentAbs.absWorldAngle;
            if (addAx) {
              setPendingAddAxis({
                placeId: addAx.placeId,
                angle: axisAngle,
                isBidirectional: addAx.isBidirectional,
                isMirror: addAx.isMirror,
                ...(addAx.echoPlaceIds != null && {
                  echoPlaceIds: addAx.echoPlaceIds,
                }),
              });
            } else if (modAx) {
              setPendingModifyAxis({
                axisId: modAx.axisId,
                placeId: modAx.placeId,
                angle: axisAngle,
                isBidirectional: modAx.isBidirectional,
                isMirror: modAx.isMirror,
              });
            }
          }
        }
      }
    }

    if (pm && guideStep() === 'execute' && mode() === 'default') {
      if (pm.placeId === 'pending' && pa) {
        setPendingAdd({ ...pa, x: cx, y: cy });
        setPendingMove({ placeId: 'pending', x: cx, y: cy });
      } else if (
        (transformChoice() === 'move' ||
          transformChoice() === 'modifyPlaceOnCircularRepeater') &&
        pm.placeId !== 'pending' &&
        pm.placeId !== PENDING_SPLIT_PLACE
      ) {
        const place = places().find((p) => p.id === pm.placeId) as
          | (PlaceLike & {
              parentAxisId?: AxisId | null;
              parentCircularFieldId?: CircularFieldId | null;
            })
          | undefined;
        if (place?.parentAxisId != null) {
          const axis = axes().find((a) => a.id === place.parentAxisId);
          if (axis) {
            const repId = (axis as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId;
            if (repId != null) {
              const placesAbs = placesWithAbsolutePositions();
              const snapped = repeaterPointToSnappedWorld(
                repId,
                cx,
                cy,
                placesAbs,
              );
              setPendingMove({ placeId: pm.placeId, x: snapped.x, y: snapped.y });
            } else {
              setPendingMove({ placeId: pm.placeId, x: cx, y: cy });
            }
          }
        } else if (place?.parentCircularFieldId != null) {
          const cf = circularFieldsWithPositions().find(
            (c) => c.id === place.parentCircularFieldId,
          );
          if (cf) {
            const worldAngle = Math.atan2(cy - cf.centerY, cx - cf.centerX);
            const parentPlace = places().find((p) => p.id === cf.placeId);
            if (parentPlace) {
              const parentAbs = placesWithAbsolutePositions().find(
                (p) => p.id === parentPlace.id,
              );
              if (parentAbs) {
                const localAngle = worldAngle - parentAbs.absWorldAngle;
                const localX = cf.radius * Math.cos(localAngle);
                const localY = cf.radius * Math.sin(localAngle);
                const rotated = rotateBy(
                  parentAbs.absWorldAngle,
                  localX,
                  localY,
                );
                const projX = cf.centerX + rotated.x;
                const projY = cf.centerY + rotated.y;
                setPendingMove({ placeId: pm.placeId, x: projX, y: projY });
              }
            }
          }
        } else {
          setPendingMove({ placeId: pm.placeId, x: cx, y: cy });
        }
      } else if (
        transformChoice() === 'moveCircularField' ||
        transformChoice() === 'addLine' ||
        transformChoice() === 'splitLine' ||
        (transformChoice() === 'addCircularField' &&
          pac?.stage === 'editing' &&
          pac.isNewPlace &&
          pm.placeId === pac.placeId)
      ) {
        setPendingMove({ placeId: pm.placeId, x: cx, y: cy });
      } else if (
        transformChoice() === 'move' &&
        (pm.placeId === PENDING_SPLIT_PLACE || pm.placeId === 'pending')
      ) {
        setPendingMove({ placeId: pm.placeId, x: cx, y: cy });
      }
    }
    if (pr && guideStep() === 'execute' && mode() === 'default') {
      const place = placesWithAbsolutePositions().find(
        (p) => p.id === pr.placeId,
      );
      if (place) {
        const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
        const angle =
          (place as PlaceLike).parentAxisId != null
            ? Math.atan2(cy - place.absY, cx - place.absX)
            : Math.atan2(cx - place.absX, place.absY - cy);
        setPendingRotate({ placeId: pr.placeId, angle });
      }
    }
    if (
      draggingCf != null &&
      guideStep() === 'execute' &&
      mode() === 'default'
    ) {
      const pmc = pendingModifyCircularField();
      if (pac?.stage === 'editing' && pac.circularFieldId === draggingCf) {
        const place = placesWithAbsolutePositions().find(
          (p) => p.id === pac.placeId,
        );
        const centerX = place?.absX ?? 0;
        const centerY = place?.absY ?? 0;
        const dist = Math.hypot(cx - centerX, cy - centerY);
        const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, dist);
        const angle = Math.atan2(cy - centerY, cx - centerX);
        if (pac.circularFieldIds != null) {
          for (const id of pac.circularFieldIds) {
            evolu.update('circularField', {
              id,
              radius,
              radiusHandleAngle: angle,
            });
          }
        } else {
          evolu.update('circularField', {
            id: draggingCf,
            radius,
            radiusHandleAngle: angle,
          });
        }
        setPendingAddCircularField({ ...pac, radius, radiusHandleAngle: angle });
        setRadiusHandleDragPosition({ x: cx, y: cy });
      } else if (pmc && pmc.circularFieldId === draggingCf) {
        const place = placesWithAbsolutePositions().find(
          (p) => p.id === pmc.placeId,
        );
        const centerX = place?.absX ?? 0;
        const centerY = place?.absY ?? 0;
        const dist = Math.hypot(cx - centerX, cy - centerY);
        const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, dist);
        const angle = Math.atan2(cy - centerY, cx - centerX);
        const echoIds = getCircularFieldEchoGroupIds(
          draggingCf,
          places(),
          circularFields(),
        );
        for (const id of echoIds) {
          evolu.update('circularField', {
            id,
            radius,
            radiusHandleAngle: angle,
          });
        }
        setPendingModifyCircularField({
          ...pmc,
          radius,
          radiusHandleAngle: angle,
        });
        setRadiusHandleDragPosition({ x: cx, y: cy });
      }
    }
    const pmbf = pendingMoveBendingCircularField();
    if (pmbf != null && guideStep() === 'execute' && mode() === 'default') {
      const bf = bendingFieldsWithPositions().find((b) => b.id === pmbf);
      if (bf) {
        const ox = cx - bf.endX;
        const oy = cy - bf.endY;
        const L = Math.hypot(ox, oy) || 1;
        const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, L);
        const s = radius / L;
        evolu.update('bendingCircularField', {
          id: pmbf,
          offsetX: ox * s,
          offsetY: oy * s,
          radius,
        });
      }
    }
    const draggingBf = draggingBendingCircularFieldRadius();
    if (
      draggingBf != null &&
      guideStep() === 'execute' &&
      mode() === 'default'
    ) {
      const bf = bendingFieldsWithPositions().find((b) => b.id === draggingBf);
      if (bf) {
        const midX = (cx + bf.endX) / 2;
        const midY = (cy + bf.endY) / 2;
        const newRadius = Math.max(
          CIRCULAR_FIELD_MIN_RADIUS,
          Math.hypot(cx - bf.endX, cy - bf.endY) / 2,
        );
        const offsetX = midX - bf.endX;
        const offsetY = midY - bf.endY;
        evolu.update('bendingCircularField', {
          id: draggingBf,
          offsetX,
          offsetY,
          radius: newRadius,
        });
      }
    }
  };

  const handlePointerUp = () => {
    if (draggingCircularFieldRadius() != null) {
      setDraggingCircularFieldRadius(null);
      setRadiusHandleDragPosition(null);
    }
    setDraggingAxisAngle(false);
    setDraggingPlaceOnAxis(null);
    setDraggingPlaceOnCircularField(null);
    setDraggingPlaceOnCircularRepeater(null);
    // Bending circle move/radius state is cleared in goToSelectStep on keep/discard
    // so hasChanges stays true after drag ends and keep/discard remain enabled.
  };

  const zoomBy = (amount: number, originX?: number, originY?: number) => {
    const currentScale = scale();
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, currentScale + amount),
    );

    if (newScale === currentScale) return;

    const rect = svg.getBoundingClientRect();
    const x = originX !== undefined ? originX - rect.left : rect.width / 2;
    const y = originY !== undefined ? originY - rect.top : rect.height / 2;

    const trueX = x / currentScale - translateX() / currentScale;
    const trueY = y / currentScale - translateY() / currentScale;

    const currX = trueX * currentScale;
    const currY = trueY * currentScale;
    const newX = trueX * newScale;
    const newY = trueY * newScale;

    setTranslateX(translateX() - (newX - currX));
    setTranslateY(translateY() - (newY - currY));
    setScale(newScale);
  };

  const zoomIn = () => zoomBy(SCALE_STEP);
  const zoomOut = () => zoomBy(-SCALE_STEP);
  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  const togglePan = () => {
    setMode(mode() === 'pan' ? 'default' : 'pan');
  };

  const resetGuide = () => {
    batch(() => {
      setGuideStep('observe');
      setTransformChoice(null);
      setPendingAdd(null);
      setPendingMove(null);
      setPendingDeletePlaceId(null);
      setPendingRotate(null);
      setPendingAddLine(null);
      setPendingDeleteLineId(null);
      setPendingAddCircularField(null);
      setPendingModifyCircularField(null);
      setPendingDeleteCircularFieldId(null);
      setDraggingCircularFieldRadius(null);
      setPendingMoveBendingCircularField(null);
      setDraggingBendingCircularFieldRadius(null);
      setPendingDeleteBendingCircularFieldId(null);
      setPendingSplitLine(null);
      setPendingAddAxis(null);
      setPendingModifyAxis(null);
      setPendingDeleteAxisId(null);
      setPendingAddPlaceOnAxis(null);
      setPendingAddPlaceOnCircularField(null);
      setDraggingPlaceOnCircularField(null);
      setPendingAddCircularRepeater(null);
      setPendingModifyCircularRepeater(null);
      setPendingAddPlaceOnCircularRepeater(null);
      setPendingModifyPlaceOnCircularRepeater(null);
      setPendingDeleteCircularRepeaterId(null);
      setDraggingPlaceOnCircularRepeater(null);
      setSelectedPlaceId(null);
      setSelectedLineSegmentId(null);
      setSelectedCircularFieldId(null);
      setSelectedBendingCircularFieldId(null);
      setSelectedAxisId(null);
      setSelectedCircularRepeaterId(null);
      setHasDrawingPaneSelected(false);
      setLastCursorCanvas(null);
    });
  };

  const handleTransformChoice = (choice: TransformChoice) => {
    setTransformChoice(choice);
    if (choice === 'delete' && selectedPlaceId()) {
      setPendingDeletePlaceId(selectedPlaceId());
    }
    if (choice === 'deleteLine' && selectedLineSegmentId()) {
      setPendingDeleteLineId(selectedLineSegmentId());
    }
    if (choice === 'modifyCircularField') {
      const cfId = selectedCircularFieldId();
      if (cfId) {
        const cf = circularFieldsWithPositions().find((c) => c.id === cfId);
        if (cf) {
          setPendingModifyCircularField({
            circularFieldId: cf.id,
            placeId: cf.placeId,
            radius: cf.radius,
            radiusHandleAngle: cf.radiusHandleAngle ?? 0,
          });
        }
      }
    }
    if (choice === 'deleteCircularField' && selectedCircularFieldId()) {
      setPendingDeleteCircularFieldId(selectedCircularFieldId());
    }
    if (
      choice === 'deleteBendingCircularField' &&
      selectedBendingCircularFieldId()
    ) {
      setPendingDeleteBendingCircularFieldId(selectedBendingCircularFieldId());
    }
    if (choice === 'addLine') {
      const startPlaceId = selectedPlaceId();
      if (startPlaceId) {
        const r = evolu.insert('lineSegmentEnd', { placeId: startPlaceId });
        if (r.ok) {
          const startPlace = placesWithAbsolutePositions().find(
            (p) => p.id === startPlaceId,
          );
          const cx = startPlace?.absX ?? 0;
          const cy = startPlace?.absY ?? 0;
          setPendingAddLine({
            startPlaceId,
            startEndId: r.value.id,
            cursorX: cx,
            cursorY: cy,
          });
        }
      }
    }
    if (choice === 'addLineSegment') {
      const placeId = selectedPlaceId();
      if (!placeId) return;
      const place = places().find((p) => p.id === placeId) as
        | PlaceLike
        | undefined;
      const groupId = place?.repeaterEchoGroupId;
      if (!groupId) return;
      const circularRepeaterId = getCircularRepeaterIdForPlace(
        placeId,
        places(),
        axes(),
      );
      if (!circularRepeaterId) return;
      setPendingAddLineSegment({
        originSelectedPlaceId: placeId,
        originGroupId: groupId,
        circularRepeaterId,
      });
    }
    if (choice === 'addCircularField') {
      if (hasDrawingPaneSelected()) {
        setPendingAddCircularField({ stage: 'placing' });
      } else {
        const placeId = selectedPlaceId();
        if (placeId) {
          const place = places().find((p) => p.id === placeId) as
            | PlaceLike
            | undefined;
          const groupId = place?.repeaterEchoGroupId;
          if (groupId != null) {
            const echoPlaces = places().filter(
              (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
            );
            const circularFieldIds: CircularFieldId[] = [];
            let firstPlaceId: PlaceId | null = null;
            let firstCfId: CircularFieldId | null = null;
            for (const echo of echoPlaces) {
              const r = evolu.insert('circularField', {
                placeId: echo.id,
                radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
              });
              if (r.ok) {
                circularFieldIds.push(r.value.id);
                if (firstPlaceId == null) {
                  firstPlaceId = echo.id;
                  firstCfId = r.value.id;
                }
              }
            }
            if (firstPlaceId != null && firstCfId != null) {
              setPendingAddCircularField({
                stage: 'editing',
                placeId: firstPlaceId,
                circularFieldId: firstCfId,
                radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
                isNewPlace: false,
                circularFieldIds,
              });
            }
          } else {
            const r = evolu.insert('circularField', {
              placeId,
              radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
            });
            if (r.ok) {
              setPendingAddCircularField({
                stage: 'editing',
                placeId,
                circularFieldId: r.value.id,
                radius: CIRCULAR_FIELD_DEFAULT_RADIUS,
                isNewPlace: false,
              });
            }
          }
        }
      }
    }
    if (choice === 'addAxis') {
      const placeId = selectedPlaceId();
      if (placeId) {
        const place = places().find((p) => p.id === placeId) as
          | PlaceLike
          | undefined;
        const groupId = place?.repeaterEchoGroupId;
        if (groupId != null) {
          const echoPlaces = places().filter(
            (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
          );
          const echoPlaceIds = echoPlaces.map((p) => p.id);
          setPendingAddAxis({
            placeId: echoPlaceIds[0] ?? placeId,
            angle: 0,
            isBidirectional: true,
            isMirror: false,
            echoPlaceIds,
          });
        } else {
          setPendingAddAxis({
            placeId,
            angle: 0,
            isBidirectional: true,
            isMirror: false,
          });
        }
      }
    }
    if (choice === 'modifyAxis') {
      const axisId = selectedAxisId();
      if (axisId) {
        const axis = axes().find((a) => a.id === axisId);
        if (axis) {
          const ax = axis as { isMirror?: number | null };
          setPendingModifyAxis({
            axisId,
            placeId: axis.placeId,
            angle: Number(axis.angle),
            isBidirectional: axis.isBidirectional !== 0,
            isMirror: ax.isMirror === 1,
          });
        }
      }
    }
    const axisId = selectedAxisId();
    if (choice === 'deleteAxis' && axisId) {
      setPendingDeleteAxisId(axisId);
    }
    if (choice === 'addPlaceOnAxis') {
      const axisId = selectedAxisId();
      if (axisId) {
        setPendingAddPlaceOnAxis({ axisId, distanceAlongAxis: 0 });
      }
    }
    if (choice === 'addPlaceOnCircularField') {
      const cfId = selectedCircularFieldId();
      if (cfId) {
        setPendingAddPlaceOnCircularField({
          circularFieldId: cfId,
          angleOnCircle: 0,
        });
      }
    }
    if (choice === 'addCircularRepeater') {
      const placeId = selectedPlaceId();
      if (placeId) {
        setPendingAddCircularRepeater({ placeId, count: 4 });
      }
    }
    if (choice === 'modifyCircularRepeater') {
      const repeaterId = selectedCircularRepeaterId();
      if (repeaterId) {
        const repeater = circularRepeaters().find((r) => r.id === repeaterId);
        if (repeater) {
          setPendingModifyCircularRepeater({
            circularRepeaterId: repeaterId,
            count: Number(repeater.count),
          });
        }
      }
    }
    if (choice === 'deleteCircularRepeater' && selectedCircularRepeaterId()) {
      setPendingDeleteCircularRepeaterId(selectedCircularRepeaterId());
    }
    if (choice === 'addPlaceOnCircularRepeater') {
      const repeaterId = selectedCircularRepeaterId();
      if (repeaterId) {
        setPendingAddPlaceOnCircularRepeater({
          circularRepeaterId: repeaterId,
          distanceAlongAxis: 0,
          patternEnabled: false,
        });
      }
    }
    if (choice === 'modifyPlaceOnCircularRepeater') {
      const placeId = selectedPlaceId();
      if (placeId) {
        const place = places().find((p) => p.id === placeId) as
          | PlaceLike
          | undefined;
        const axisId = place?.parentAxisId;
        if (axisId) {
          const axis = axes().find((a) => a.id === axisId);
          const repId = axis
            ? (axis as { circularRepeaterId?: CircularRepeaterId })
                .circularRepeaterId
            : null;
          if (repId) {
            const placeRow = place as {
              alternatingShow?: number | null;
              alternatingSkip?: number | null;
              alternatingStart?: number | null;
            };
            const hasPattern =
              placeRow.alternatingShow != null ||
              placeRow.alternatingSkip != null ||
              placeRow.alternatingStart != null;
            const defaultStart =
              placeRow.alternatingStart ??
              (circularRepeaterAxisNumber(axisId, repId, axes()) || 1);
            setPendingModifyPlaceOnCircularRepeater({
              placeId,
              circularRepeaterId: repId,
              patternEnabled: hasPattern,
              alternatingShow: placeRow.alternatingShow ?? 1,
              alternatingSkip: placeRow.alternatingSkip ?? 1,
              alternatingStart: defaultStart,
            });
          }
        }
      }
    }
    if (choice === 'splitLine') {
      const segId = selectedLineSegmentId();
      if (segId) {
        const seg = lineSegments().find((s) => s.id === segId);
        const ends = lineSegmentEnds();
        if (seg && seg.endAId != null && seg.endBId != null) {
          const endA = ends.find((e) => e.id === seg.endAId);
          const endB = ends.find((e) => e.id === seg.endBId);
          if (endA?.placeId != null && endB?.placeId != null) {
            const placeAId = endA.placeId;
            const placeBId = endB.placeId;
            const placesWithAbs = placesWithAbsolutePositions().filter(
              (p) => p.id !== PENDING_SPLIT_PLACE,
            );
            const parentPlaceId = chooseParentForSplitPlace(
              placeAId,
              placeBId,
              places(),
              placesWithAbs,
            );
            const segPos = lineSegmentsWithPositions().find(
              (s) => s.id === segId,
            );
            const previewX = segPos ? (segPos.x1 + segPos.x2) / 2 : 0;
            const previewY = segPos ? (segPos.y1 + segPos.y2) / 2 : 0;
            setPendingSplitLine({
              segmentId: segId,
              placeAId,
              placeBId,
              endAId: seg.endAId as LineSegmentEndId,
              endBId: seg.endBId as LineSegmentEndId,
              parentPlaceId,
              previewX,
              previewY,
            });
          }
        }
      }
    }
    setGuideStep('execute');
  };

  const goToSelectStep = () => {
    setGuideStep('select');
    setTransformChoice(null);
    setPendingAdd(null);
    setPendingMove(null);
    setPendingDeletePlaceId(null);
    setPendingRotate(null);
    setPendingAddLine(null);
    setPendingDeleteLineId(null);
    setPendingAddCircularField(null);
    setPendingModifyCircularField(null);
    setPendingDeleteCircularFieldId(null);
    setDraggingCircularFieldRadius(null);
    setPendingMoveBendingCircularField(null);
    setDraggingBendingCircularFieldRadius(null);
    setPendingDeleteBendingCircularFieldId(null);
    setBendAtEndsDirty(false);
    setPendingBendAtEndsAdded([]);
    setPendingBendAtEndsDeleted([]);
    setPendingSplitLine(null);
    setPendingAddLineSegment(null);
    setPendingAddAxis(null);
    setPendingModifyAxis(null);
    setPendingDeleteAxisId(null);
    setPendingAddPlaceOnAxis(null);
    setPendingAddPlaceOnCircularField(null);
    setDraggingPlaceOnCircularField(null);
    setPendingAddCircularRepeater(null);
    setPendingModifyCircularRepeater(null);
    setPendingAddPlaceOnCircularRepeater(null);
    setPendingDeleteCircularRepeaterId(null);
    setDraggingPlaceOnCircularRepeater(null);
    setSelectedPlaceId(null);
    setSelectedLineSegmentId(null);
    setSelectedCircularFieldId(null);
    setSelectedBendingCircularFieldId(null);
    setSelectedAxisId(null);
    setSelectedCircularRepeaterId(null);
    setHasDrawingPaneSelected(false);
  };

  const handleCancelSelection = () => {
    setSelectedPlaceId(null);
    setSelectedLineSegmentId(null);
    setSelectedCircularFieldId(null);
    setSelectedBendingCircularFieldId(null);
    setSelectedAxisId(null);
    setSelectedCircularRepeaterId(null);
    setHasDrawingPaneSelected(false);
    setTransformChoice(null);
    setPendingAddLineSegment(null);
    setGuideStep('select');
  };

  const handleCommit = () => {
    const add = pendingAdd();
    const move = pendingMove();
    const rot = pendingRotate();
    const del = pendingDeletePlaceId();
    const placesList = places();

    const paModRep = pendingModifyPlaceOnCircularRepeater();
    if (paModRep) {
      const repAxes = axes()
        .filter(
          (a) =>
            (a as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId === paModRep.circularRepeaterId,
        )
        .sort((a, b) => Number(a.angle) - Number(b.angle));
      const count = repAxes.length;
      const usePattern = paModRep.patternEnabled === true;
      const show = paModRep.alternatingShow ?? 1;
      const skip = paModRep.alternatingSkip ?? 1;
      const start = paModRep.alternatingStart ?? 1;
      const inPatternAxisNumbers = new Set<number>();
      if (usePattern) {
        for (let n = 1; n <= count; n++) {
          if (inAxisAlternatingPattern(n, start, show, skip, count))
            inPatternAxisNumbers.add(n);
        }
      } else {
        for (let n = 1; n <= count; n++) inPatternAxisNumbers.add(n);
      }
      const place = placesList.find((p) => p.id === paModRep.placeId) as
        | PlaceLike
        | undefined;
      const groupId = place?.repeaterEchoGroupId;
      if (groupId != null && repAxes.length > 0) {
        const groupPlaces = placesList.filter(
          (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
        );
        const repAxisIds = new Set(repAxes.map((a) => a.id));
        const directEchoes = groupPlaces.filter(
          (p) => (p as PlaceLike).parentAxisId != null && repAxisIds.has((p as PlaceLike).parentAxisId!),
        );
        const toDelete = new Set<PlaceId>();
        for (const p of directEchoes) {
          const axisId = (p as PlaceLike).parentAxisId!;
          const axisNum = circularRepeaterAxisNumber(
            axisId,
            paModRep.circularRepeaterId,
            axes(),
          );
          if (!inPatternAxisNumbers.has(axisNum)) {
            toDelete.add(p.id);
            const collectDescendants = (pid: PlaceId) => {
              for (const c of placesList) {
                if ((c as { parentId?: PlaceId }).parentId === pid) {
                  toDelete.add(c.id);
                  collectDescendants(c.id);
                }
              }
            };
            collectDescendants(p.id);
          }
        }
        for (const id of toDelete) {
          evolu.update('place', { id, isDeleted: true });
        }
        const remainingGroup = groupPlaces.filter((p) => !toDelete.has(p.id));
        const referenceEcho = remainingGroup.find(
          (p) => (p as PlaceLike).parentAxisId != null && repAxisIds.has((p as PlaceLike).parentAxisId!),
        ) as (PlaceLike & { distanceAlongAxis?: number; distanceFromAxis?: number }) | undefined;
        const distAlong = referenceEcho?.distanceAlongAxis ?? 0;
        const distFrom = referenceEcho?.distanceFromAxis ?? 0;
        const axesWithEcho = new Set(
          remainingGroup
            .filter((p) => (p as PlaceLike).parentAxisId != null && repAxisIds.has((p as PlaceLike).parentAxisId!))
            .map((p) => (p as PlaceLike).parentAxisId!),
        );
        const baseName = (
          (referenceEcho as { name?: string | null })?.name?.trim() ?? 'Place'
        ).replace(/ Echo \d+$/, '');
        let echoIndex = remainingGroup.filter(
          (p) => (p as PlaceLike).parentAxisId != null && repAxisIds.has((p as PlaceLike).parentAxisId!),
        ).length;
        const modPatternFields = usePattern
          ? {
              alternatingShow: show,
              alternatingSkip: skip,
              alternatingStart: start,
            }
          : {
              alternatingShow: null,
              alternatingSkip: null,
              alternatingStart: null,
            };
        for (const axis of repAxes) {
          const axisNum = circularRepeaterAxisNumber(
            axis.id,
            paModRep.circularRepeaterId,
            axes(),
          );
          if (!inPatternAxisNumbers.has(axisNum) || axesWithEcho.has(axis.id))
            continue;
          echoIndex += 1;
          const echoName = `${baseName} Echo ${echoIndex}`;
          const nameResult = String1000.from(echoName);
          evolu.insert('place', {
            parentId: null,
            parentAxisId: axis.id,
            distanceAlongAxis: distAlong,
            distanceFromAxis: distFrom,
            x: 0,
            y: 0,
            repeaterEchoGroupId: groupId,
            ...(nameResult.ok && { name: nameResult.value }),
            isScaffolding: 1,
            ...modPatternFields,
          });
          axesWithEcho.add(axis.id);
        }
        for (const p of remainingGroup) {
          evolu.update('place', {
            id: p.id,
            ...modPatternFields,
          });
        }
        recordTransformation({
          kind: 'modifyPlaceOnCircularRepeater',
          placeId: paModRep.placeId,
          circularRepeaterId: paModRep.circularRepeaterId,
          distanceAlongAxis: distAlong,
          distanceFromAxis: distFrom,
          ...(usePattern && {
            alternatingShow: show,
            alternatingSkip: skip,
            alternatingStart: start,
          }),
        });
      }
      setPendingModifyPlaceOnCircularRepeater(null);
    }

    let insertedPlaceId: PlaceId | null = null;
    if (add) {
      let x = add.x;
      let y = add.y;
      let didMultiAddRelated = false;
      if (add.parentId) {
        const parent = placesList.find((p) => p.id === add.parentId);
        if (parent) {
          const parentRes = getAbsolutePosition(parent, placesList);
          const worldOffset = {
            x: add.x - parentRes.x,
            y: add.y - parentRes.y,
          };
          const local = rotateBy(
            -parentRes.worldAngle,
            worldOffset.x,
            worldOffset.y,
          );
          x = local.x;
          y = local.y;
          const groupId = (parent as PlaceLike).repeaterEchoGroupId;
          if (groupId != null) {
            const echoPlaces = placesList.filter(
              (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
            );
            const axesList = axes();
            const sortedEchoes = [...echoPlaces].sort((a, b) => {
              const axisIdA = getAxisIdForEcho(a as PlaceLike, placesList);
              const axisIdB = getAxisIdForEcho(b as PlaceLike, placesList);
              const axA = axesList.find((ax) => ax.id === axisIdA);
              const axB = axesList.find((ax) => ax.id === axisIdB);
              return (
                Number(axA?.angle ?? 0) - Number(axB?.angle ?? 0)
              );
            });
            let firstPlaceId: PlaceId | null = null;
            const namesList: ReadonlyArray<{ name: string | null }> =
              placesList.map((p) => ({ name: p.name ?? null }));
            const baseName = nextPlaceName(namesList);
            sortedEchoes.forEach((echo, i) => {
              const echoName = `${baseName} Echo ${i + 1}`;
              const nameResult = String1000.from(echoName);
              const r = evolu.insert('place', {
                parentId: echo.id,
                x,
                y,
                ...(firstPlaceId != null && {
                  repeaterEchoGroupId: firstPlaceId,
                }),
                ...(nameResult.ok && { name: nameResult.value }),
                isScaffolding: 1,
              });
              if (r.ok) {
                if (firstPlaceId == null) firstPlaceId = r.value.id;
                recordTransformation({
                  kind: 'addRelated',
                  placeId: r.value.id,
                  parentId: echo.id,
                  x,
                  y,
                });
              }
            });
            if (firstPlaceId != null) {
              evolu.update('place', {
                id: firstPlaceId,
                repeaterEchoGroupId: firstPlaceId,
              });
            }
            didMultiAddRelated = true;
          }
        }
      }
      if (!didMultiAddRelated) {
        const defaultName = nextPlaceName(placesList);
        const nameResult = String1000.from(defaultName);
        const r = evolu.insert('place', {
          parentId: add.parentId,
          x,
          y,
          ...(nameResult.ok && { name: nameResult.value }),
          isScaffolding: 1,
        });
        if (r.ok) {
          insertedPlaceId = r.value.id;
          if (add.parentId != null) {
            recordTransformation({
              kind: 'addRelated',
              placeId: r.value.id,
              parentId: add.parentId,
              x,
              y,
            });
          } else {
            recordTransformation({
              kind: 'add',
              placeId: r.value.id,
              parentId: null,
              x,
              y,
            });
          }
        }
      }
      setPendingAdd(null);
    }

    if (move) {
      const placeId =
        move.placeId === 'pending' ? insertedPlaceId : move.placeId;
      if (placeId) {
        const place = placesList.find((p) => p.id === placeId);
        const placeOnAxis =
          place &&
          (place as PlaceLike).parentAxisId != null &&
          (place as PlaceLike).parentAxisId;
        if (placeOnAxis) {
          const axis = axes().find((a) => a.id === placeOnAxis);
          if (axis) {
            const placesAbs = placesWithAbsolutePositions();
            const repId = (axis as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId;
            let d: number;
            let perp: number;
            if (repId != null) {
              const params = repeaterPointToAxisParams(
                repId,
                move.x,
                move.y,
                placesAbs,
              );
              d = params.distanceAlongAxis;
              perp = params.distanceFromAxis;
            } else {
              const geom = getAxisWorldGeometry(
                {
                  id: axis.id,
                  placeId: axis.placeId,
                  angle: Number(axis.angle),
                },
                placesAbs,
              );
              d = projectPointOntoAxis(
                move.x,
                move.y,
                geom.originX,
                geom.originY,
                geom.worldAngle,
              );
              if (axis.isBidirectional === 0) d = Math.max(0, d);
              const cosA = Math.cos(geom.worldAngle);
              const sinA = Math.sin(geom.worldAngle);
              const projX = geom.originX + d * cosA;
              const projY = geom.originY + d * sinA;
              perp =
                (move.x - projX) * -sinA + (move.y - projY) * cosA;
              if (Math.abs(perp) <= AXIS_MAGNETIC_THRESHOLD) perp = 0;
            }
              const groupId = (place as PlaceLike).repeaterEchoGroupId;
              const toUpdate =
                groupId != null
                  ? placesList.filter(
                      (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
                    )
                  : [place];
              const paModRep = pendingModifyPlaceOnCircularRepeater();
              const placeRow = place as {
                alternatingShow?: number | null;
                alternatingSkip?: number | null;
                alternatingStart?: number | null;
              };
              const movePatternFields =
                paModRep?.patternEnabled === true
                  ? {
                      alternatingShow: paModRep.alternatingShow ?? 1,
                      alternatingSkip: paModRep.alternatingSkip ?? 1,
                      alternatingStart: paModRep.alternatingStart ?? 1,
                    }
                  : {
                      alternatingShow: null,
                      alternatingSkip: null,
                      alternatingStart: null,
                    };
              const isMirrorAxis =
                repId == null &&
                (axis as { isMirror?: number | null }).isMirror === 1;
              const mirrorSameAxis =
                isMirrorAxis && toUpdate.length >= 2;

              if (
                isMirrorAxis &&
                perp === 0 &&
                toUpdate.length >= 2
              ) {
                evolu.update('place', {
                  id: placeId,
                  distanceAlongAxis: d,
                  distanceFromAxis: null,
                  repeaterEchoGroupId: null,
                });
                for (const p of toUpdate) {
                  if (p && p.id !== placeId) {
                    evolu.update('place', { id: p.id, isDeleted: true });
                    recordTransformation({ kind: 'delete', placeId: p.id });
                  }
                }
                recordTransformation({
                  kind: 'move',
                  placeId,
                  parentId: null,
                  x: move.x,
                  y: move.y,
                });
              } else if (
                isMirrorAxis &&
                perp !== 0 &&
                toUpdate.length === 1
              ) {
                evolu.update('place', {
                  id: placeId,
                  distanceAlongAxis: d,
                  distanceFromAxis: perp,
                  repeaterEchoGroupId: placeId,
                });
                const placeName = (place as { name?: string | null }).name ?? null;
                const echoName = nextPlaceName([
                  ...placesList,
                  { name: placeName },
                ]);
                const echoNameResult = String1000.from(echoName);
                evolu.insert('place', {
                  parentId: null,
                  parentAxisId: placeOnAxis,
                  distanceAlongAxis: d,
                  distanceFromAxis: -perp,
                  x: 0,
                  y: 0,
                  ...(echoNameResult.ok && { name: echoNameResult.value }),
                  isScaffolding: 1,
                  repeaterEchoGroupId: placeId,
                });
                recordTransformation({
                  kind: 'move',
                  placeId,
                  parentId: null,
                  x: move.x,
                  y: move.y,
                });
              } else {
                for (const p of toUpdate) {
                  if (p && (p as PlaceLike).parentAxisId != null) {
                    const pPerp = mirrorSameAxis
                      ? p.id === placeId
                        ? perp
                        : -perp
                      : perp;
                    evolu.update('place', {
                      id: p.id,
                      distanceAlongAxis: d,
                      distanceFromAxis: pPerp,
                      ...(paModRep && repId != null && movePatternFields),
                    });
                  }
                }
                if (repId != null && groupId != null) {
                  recordTransformation({
                    kind: 'modifyPlaceOnCircularRepeater',
                    placeId,
                    circularRepeaterId: repId,
                    distanceAlongAxis: d,
                    distanceFromAxis: perp,
                    ...(paModRep?.patternEnabled === true
                      ? {
                          alternatingShow:
                            paModRep?.alternatingShow ?? placeRow.alternatingShow ?? 1,
                          alternatingSkip:
                            paModRep?.alternatingSkip ?? placeRow.alternatingSkip ?? 1,
                          alternatingStart:
                            paModRep?.alternatingStart ?? placeRow.alternatingStart ?? 1,
                        }
                      : {}),
                  });
                  setPendingModifyPlaceOnCircularRepeater(null);
                } else {
                  recordTransformation({
                    kind: 'move',
                    placeId,
                    parentId: null,
                    x: move.x,
                    y: move.y,
                  });
                }
              }
          }
        } else {
          const placeOnCf =
            place &&
            (place as PlaceLike).parentCircularFieldId != null &&
            (place as PlaceLike).parentCircularFieldId;
          if (placeOnCf) {
            const cf = circularFields().find((c) => c.id === placeOnCf);
            if (cf) {
              const parentPlace = placesList.find((p) => p.id === cf.placeId);
              if (parentPlace) {
                const parentRes = getAbsolutePosition(parentPlace, placesList);
                const worldAngle = Math.atan2(
                  move.y - parentRes.y,
                  move.x - parentRes.x,
                );
                const localAngle = worldAngle - parentRes.worldAngle;
                evolu.update('place', {
                  id: placeId,
                  angleOnCircle: localAngle,
                });
                recordTransformation({
                  kind: 'move',
                  placeId,
                  parentId: null,
                  x: move.x,
                  y: move.y,
                });
              }
            }
          } else {
            let x = move.x;
            let y = move.y;
            const parentIdForMove =
              place?.parentId ??
              (add && move.placeId === 'pending' ? add.parentId : null);
            if (parentIdForMove) {
              const parent = placesList.find((p) => p.id === parentIdForMove);
              if (parent) {
                const parentRes = getAbsolutePosition(parent, placesList);
                const worldOffset = {
                  x: move.x - parentRes.x,
                  y: move.y - parentRes.y,
                };
                const local = rotateBy(
                  -parentRes.worldAngle,
                  worldOffset.x,
                  worldOffset.y,
                );
                x = local.x;
                y = local.y;
              }
            }
            const groupId = (place as PlaceLike).repeaterEchoGroupId;
            const toUpdate =
              groupId != null
                ? placesList.filter(
                    (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
                  )
                : [place];
            for (const p of toUpdate) {
              if (p) {
                evolu.update('place', {
                  id: p.id,
                  x,
                  y,
                });
              }
            }
            recordTransformation({
              kind: 'move',
              placeId,
              parentId: parentIdForMove,
              x,
              y,
            });
          }
        }
      }
      setPendingMove(null);
    }

    if (del) {
      const delPlace = placesList.find((p) => p.id === del) as
        | PlaceLike
        | undefined;
      const groupId = delPlace?.repeaterEchoGroupId;
      const toDelete =
        groupId != null
          ? placesList.filter(
              (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
            )
          : [placesList.find((p) => p.id === del)].filter(Boolean);
      for (const p of toDelete) {
        if (p) {
          evolu.update('place', { id: p.id, isDeleted: true });
          recordTransformation({ kind: 'delete', placeId: p.id });
        }
      }
      setPendingDeletePlaceId(null);
    }

    if (rot) {
      const rotatedPlace = placesList.find((p) => p.id === rot.placeId);
      const groupId = (rotatedPlace as PlaceLike)?.repeaterEchoGroupId;
      const toRotate =
        groupId != null
          ? placesList.filter(
              (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
            )
          : rotatedPlace
            ? [rotatedPlace]
            : [];
      const rotatedPlaceUnrotated =
        rotatedPlace != null
          ? getAbsolutePosition(
              rotatedPlace,
              placesList,
              null as unknown as typeof moveOverride,
              null,
            ).worldAngle
          : rot.angle;
      const delta = rot.angle - rotatedPlaceUnrotated;
      for (const p of toRotate) {
        let storedAngle: number;
        if (groupId != null) {
          const pUnrotated = getAbsolutePosition(
            p,
            placesList,
            null as unknown as typeof moveOverride,
            null,
          ).worldAngle;
          const axis = (p as PlaceLike).parentAxisId != null
            ? axes().find(
                (a) => a.id === (p as PlaceLike).parentAxisId,
              )
            : null;
          const parent = axis
            ? placesList.find((pl) => pl.id === axis.placeId)
            : null;
          if (axis && parent) {
            const parentRes = getAbsolutePosition(
              parent,
              placesList,
              null as unknown as typeof moveOverride,
              null,
            );
            const baseAxisAngle =
              parentRes.worldAngle + Number(axis.angle);
            storedAngle = (pUnrotated + delta) - baseAxisAngle;
          } else {
            storedAngle = ((p as PlaceLike).angle ?? 0) + delta;
          }
        } else if ((p as PlaceLike).parentAxisId != null) {
          const axis = axes().find(
            (a) => a.id === (p as PlaceLike).parentAxisId,
          );
          const parent = axis
            ? placesList.find((pl) => pl.id === axis.placeId)
            : null;
          if (axis && parent) {
            const parentRes = getAbsolutePosition(
              parent,
              placesList,
              null as unknown as typeof moveOverride,
              null,
            );
            storedAngle =
              rot.angle - (parentRes.worldAngle + Number(axis.angle));
          } else {
            storedAngle = rot.angle;
          }
        } else if (p.parentId != null) {
          const parent = placesList.find((pl) => pl.id === p.parentId);
          if (parent) {
            const parentRes = getAbsolutePosition(
              parent,
              placesList,
              null as unknown as typeof moveOverride,
              null,
            );
            storedAngle = rot.angle - parentRes.worldAngle;
          } else {
            storedAngle = rot.angle;
          }
        } else {
          storedAngle = rot.angle;
        }
        evolu.update('place', { id: p.id, angle: storedAngle });
        recordTransformation({
          kind: 'rotate',
          placeId: p.id,
          angle: storedAngle,
        });
      }
      setPendingRotate(null);
    }

    const addAx = pendingAddAxis();
    if (addAx) {
      const placeIds =
        addAx.echoPlaceIds != null && addAx.echoPlaceIds.length > 0
          ? addAx.echoPlaceIds
          : [addAx.placeId];
      for (const pid of placeIds) {
        const axisRes = evolu.insert('axis', {
          placeId: pid,
          angle: addAx.angle,
          isBidirectional: addAx.isBidirectional ? 1 : 0,
          isMirror: addAx.isMirror ? 1 : 0,
        });
        if (axisRes.ok) {
          recordTransformation({
            kind: 'addAxis',
            placeId: pid,
            axisId: axisRes.value.id,
            angle: addAx.angle,
            isBidirectional: addAx.isBidirectional ? 1 : 0,
            isMirror: addAx.isMirror ? 1 : 0,
          });
        }
      }
      setPendingAddAxis(null);
    }

    const modAx = pendingModifyAxis();
    if (modAx) {
      evolu.update('axis', {
        id: modAx.axisId,
        angle: modAx.angle,
        isBidirectional: modAx.isBidirectional ? 1 : 0,
        isMirror: modAx.isMirror ? 1 : 0,
      });
      recordTransformation({
        kind: 'modifyAxis',
        placeId: modAx.placeId,
        axisId: modAx.axisId,
        angle: modAx.angle,
        isBidirectional: modAx.isBidirectional ? 1 : 0,
        isMirror: modAx.isMirror ? 1 : 0,
      });
      setPendingModifyAxis(null);
    }

    const delAxisId = pendingDeleteAxisId();
    if (delAxisId) {
      const axis = axes().find((a) => a.id === delAxisId);
      if (axis) {
        evolu.update('axis', { id: delAxisId, isDeleted: true });
        recordTransformation({
          kind: 'deleteAxis',
          placeId: axis.placeId,
          axisId: delAxisId,
        });
      }
      setPendingDeleteAxisId(null);
    }

    const addPlaceOnAx = pendingAddPlaceOnAxis();
    if (addPlaceOnAx) {
      const axis = axes().find((a) => a.id === addPlaceOnAx.axisId);
      const isMirror =
        (axis as { isMirror?: number | null } | undefined)?.isMirror === 1;
      const offAxis =
        addPlaceOnAx.distanceFromAxis != null &&
        addPlaceOnAx.distanceFromAxis !== 0;
      const defaultName = nextPlaceName(placesList);
      const nameResult = String1000.from(defaultName);
      const distanceFromAxis = addPlaceOnAx.distanceFromAxis ?? 0;
      const placeRes = evolu.insert('place', {
        parentId: null,
        parentAxisId: addPlaceOnAx.axisId,
        distanceAlongAxis: addPlaceOnAx.distanceAlongAxis,
        distanceFromAxis: distanceFromAxis !== 0 ? distanceFromAxis : null,
        x: 0,
        y: 0,
        ...(nameResult.ok && { name: nameResult.value }),
        isScaffolding: 1,
      });
      if (placeRes.ok) {
        if (isMirror && offAxis) {
          evolu.update('place', {
            id: placeRes.value.id,
            repeaterEchoGroupId: placeRes.value.id,
          });
          const echoDistanceFromAxis = -(addPlaceOnAx.distanceFromAxis ?? 0);
          const echoName = nextPlaceName([
            ...placesList,
            { name: nameResult.ok ? nameResult.value : defaultName },
          ]);
          const echoNameResult = String1000.from(echoName);
          evolu.insert('place', {
            parentId: null,
            parentAxisId: addPlaceOnAx.axisId,
            distanceAlongAxis: addPlaceOnAx.distanceAlongAxis,
            distanceFromAxis:
              echoDistanceFromAxis !== 0 ? echoDistanceFromAxis : null,
            x: 0,
            y: 0,
            ...(echoNameResult.ok && { name: echoNameResult.value }),
            isScaffolding: 1,
            repeaterEchoGroupId: placeRes.value.id,
          });
        }
        recordTransformation({
          kind: 'addPlaceOnAxis',
          placeId: placeRes.value.id,
          axisId: addPlaceOnAx.axisId,
          distanceAlongAxis: addPlaceOnAx.distanceAlongAxis,
          ...(addPlaceOnAx.distanceFromAxis != null &&
            addPlaceOnAx.distanceFromAxis !== 0 && {
              distanceFromAxis: addPlaceOnAx.distanceFromAxis,
            }),
        });
      }
      setPendingAddPlaceOnAxis(null);
    }

    const addPlaceOnCf = pendingAddPlaceOnCircularField();
    if (addPlaceOnCf) {
      const defaultName = nextPlaceName(placesList);
      const nameResult = String1000.from(defaultName);
      const placeRes = evolu.insert('place', {
        parentId: null,
        parentAxisId: null,
        parentCircularFieldId: addPlaceOnCf.circularFieldId,
        angleOnCircle: addPlaceOnCf.angleOnCircle,
        x: 0,
        y: 0,
        ...(nameResult.ok && { name: nameResult.value }),
        isScaffolding: 1,
      });
      if (placeRes.ok) {
        recordTransformation({
          kind: 'addPlaceOnCircularField',
          placeId: placeRes.value.id,
          circularFieldId: addPlaceOnCf.circularFieldId,
          angleOnCircle: addPlaceOnCf.angleOnCircle,
        });
      }
      setPendingAddPlaceOnCircularField(null);
    }

    const addRep = pendingAddCircularRepeater();
    if (addRep) {
      const count = Math.max(2, Math.min(108, Math.round(addRep.count)));
      const echoPlaces = getPlaceEchoGroupPlaceIds(
        addRep.placeId,
        placesList,
        axes(),
      );
      if (echoPlaces.length <= 1) {
        const repRes = evolu.insert('circularRepeater', {
          placeId: addRep.placeId,
          count,
        });
        if (repRes.ok) {
          const repId = repRes.value.id;
          const repeaterName = nextRepeaterName(circularRepeaters());
          const nameResult = String1000.from(repeaterName);
          if (nameResult.ok)
            evolu.update('circularRepeater', {
              id: repId,
              name: nameResult.value,
            });
          for (let k = 0; k < count; k++) {
            const angle = -Math.PI / 2 + (2 * Math.PI * k) / count;
            evolu.insert('axis', {
              placeId: addRep.placeId,
              angle,
              isBidirectional: 0,
              circularRepeaterId: repId,
            });
          }
          recordTransformation({
            kind: 'addCircularRepeater',
            placeId: addRep.placeId,
            circularRepeaterId: repId,
            count,
          });
        }
      } else {
        let firstRepId: CircularRepeaterId | null = null;
        const repeaterName = nextRepeaterName(circularRepeaters());
        const nameResult = String1000.from(repeaterName);
        for (let i = 0; i < echoPlaces.length; i++) {
          const place = echoPlaces[i];
          if (!place) continue;
          const repRes = evolu.insert('circularRepeater', {
            placeId: place.id,
            count,
            ...(firstRepId != null && { repeaterEchoGroupId: firstRepId }),
          }) as { ok: true; value: { id: CircularRepeaterId } } | { ok: false };
          if (repRes.ok) {
            const repId = repRes.value.id;
            if (firstRepId == null) {
              firstRepId = repId;
              evolu.update('circularRepeater', {
                id: repId,
                repeaterEchoGroupId: repId,
              });
              if (nameResult.ok)
                evolu.update('circularRepeater', {
                  id: repId,
                  name: nameResult.value,
                });
            } else if (nameResult.ok) {
              evolu.update('circularRepeater', {
                id: repId,
                name: nameResult.value,
              });
            }
            for (let k = 0; k < count; k++) {
              const angle = -Math.PI / 2 + (2 * Math.PI * k) / count;
              evolu.insert('axis', {
                placeId: place.id,
                angle,
                isBidirectional: 0,
                circularRepeaterId: repId,
              });
            }
          }
        }
        if (firstRepId != null) {
          recordTransformation({
            kind: 'addCircularRepeater',
            placeId: addRep.placeId,
            circularRepeaterId: firstRepId,
            count,
          });
        }
      }
      setPendingAddCircularRepeater(null);
    }

    const modRep = pendingModifyCircularRepeater();
    if (modRep) {
      const echoRepIds = getCircularRepeaterEchoGroupIds(
        modRep.circularRepeaterId,
        circularRepeaters(),
        placesList,
        axes(),
      );
      for (const currentRepId of echoRepIds) {
        const repeater = circularRepeaters().find(
          (r) => r.id === currentRepId,
        );
        if (!repeater) continue;
        const oldCount = Number(repeater.count);
        const newCount = Math.max(2, Math.min(108, Math.round(modRep.count)));
        const repAxes = axes().filter(
          (a) =>
            (a as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId === currentRepId,
        );
        let finalAxisIds: AxisId[] = repAxes.map((a) => a.id);
        if (newCount > oldCount) {
          // Map existing axes to the nearest slots in the newCount grid, then add axes for unassigned slots.
          const sorted = [...repAxes].sort(
            (a, b) => Number(a.angle) - Number(b.angle),
          );
          const assigned = new Set<number>();
          for (let k = 0; k < sorted.length; k++) {
            const j = Math.round((k * newCount) / oldCount) % newCount;
            const slot = (j + newCount) % newCount;
            assigned.add(slot);
            const angle = -Math.PI / 2 + (2 * Math.PI * slot) / newCount;
            const ax = sorted[k];
            if (ax) evolu.update('axis', { id: ax.id, angle });
          }
          const newAxisIds: AxisId[] = [];
          for (let j = 0; j < newCount; j++) {
            if (assigned.has(j)) continue;
            const angle = -Math.PI / 2 + (2 * Math.PI * j) / newCount;
            const axisRes = evolu.insert('axis', {
              placeId: repeater.placeId,
              angle,
              isBidirectional: 0,
              circularRepeaterId: currentRepId,
            }) as { ok: true; value: { id: AxisId } } | { ok: false };
            if (axisRes.ok) newAxisIds.push(axisRes.value.id);
          }
          const originalAxisIds = new Set(repAxes.map((a) => a.id));
          const firstPlaces = placesList.filter(
            (p) =>
              (p as PlaceLike).repeaterEchoGroupId === p.id &&
              (p as PlaceLike).parentAxisId != null &&
              originalAxisIds.has((p as PlaceLike).parentAxisId!),
          );
          for (const template of firstPlaces) {
            const groupId = template.id;
            const d = (template as PlaceLike).distanceAlongAxis ?? 0;
            const perp = (template as PlaceLike).distanceFromAxis ?? 0;
            const angle = (template as PlaceLike).angle ?? 0;
            const templateWithName = template as PlaceLike & {
              name?: string | null;
              isScaffolding?: number | null;
            };
            const baseName =
              (templateWithName.name?.trim().match(/^(.+?) Echo \d+$/) ?? null)?.[1] ??
              templateWithName.name?.trim() ??
              'Place';
            const groupEchoes = placesList.filter(
              (p) => (p as PlaceLike).repeaterEchoGroupId === groupId,
            );
            let maxEchoIndex = 0;
            for (const ep of groupEchoes) {
              const name = (ep as PlaceLike & { name?: string | null }).name;
              const m = name?.trim().match(/ Echo (\d+)$/);
              if (m?.[1])
                maxEchoIndex = Math.max(
                  maxEchoIndex,
                  Number.parseInt(m[1], 10),
                );
            }
            for (let idx = 0; idx < newAxisIds.length; idx++) {
              const echoName = `${baseName} Echo ${maxEchoIndex + idx + 1}`;
              const nameResult = String1000.from(echoName);
              const echoRes = evolu.insert('place', {
                parentId: null,
                parentAxisId: newAxisIds[idx]!,
                distanceAlongAxis: d,
                distanceFromAxis: perp,
                x: 0,
                y: 0,
                angle,
                repeaterEchoGroupId: groupId,
                ...(nameResult.ok && { name: nameResult.value }),
                isScaffolding: templateWithName.isScaffolding ?? 1,
              }) as { ok: true; value: { id: PlaceId } } | { ok: false };
              if (!echoRes.ok) continue;
              const newEchoId = echoRes.value.id;
              const oldToNew = new Map<PlaceId, PlaceId>([
                [template.id, newEchoId],
              ]);
              const newEchoIndex = maxEchoIndex + idx + 1;
              const descIds = getDescendantPlaceIds(template.id, placesList);
              for (const oldId of descIds) {
                const q = placesList.find((pl) => pl.id === oldId) as
                  | PlaceLike
                  | undefined;
                if (!q || q.parentId == null) continue;
                const parentNewId = oldToNew.get(q.parentId);
                if (parentNewId == null) continue;
                const descBaseName =
                  (q.name?.trim().match(/^(.+?) Echo \d+$/) ?? null)?.[1] ??
                  q.name?.trim() ??
                  'Place';
                const descEchoName = `${descBaseName} Echo ${newEchoIndex}`;
                const nameQ = String1000.from(descEchoName);
                const r = evolu.insert('place', {
                  parentId: parentNewId,
                  x: q.x ?? 0,
                  y: q.y ?? 0,
                  angle: q.angle ?? null,
                  repeaterEchoGroupId: groupId,
                  ...(nameQ.ok && { name: nameQ.value }),
                  isScaffolding: q.isScaffolding ?? 1,
                }) as { ok: true; value: { id: PlaceId } } | { ok: false };
                if (r.ok) oldToNew.set(oldId, r.value.id);
              }
              const repeatersAtTemplate = circularRepeaters().filter(
                (r) => r.placeId === template.id,
              );
              for (const rep of repeatersAtTemplate) {
                const repEchoGroupId = (rep as { repeaterEchoGroupId?: CircularRepeaterId }).repeaterEchoGroupId ?? rep.id;
                const newRepRes = evolu.insert('circularRepeater', {
                  placeId: newEchoId,
                  count: Number(rep.count),
                  repeaterEchoGroupId: repEchoGroupId,
                });
                if (newRepRes.ok) {
                  const newRepId = newRepRes.value.id;
                  for (let k = 0; k < Number(rep.count); k++) {
                    const axisAngle = -Math.PI / 2 + (2 * Math.PI * k) / Number(rep.count);
                    evolu.insert('axis', {
                      placeId: newEchoId,
                      angle: axisAngle,
                      isBidirectional: 0,
                      circularRepeaterId: newRepId,
                    });
                  }
                }
              }
            }
          }
          finalAxisIds = [...repAxes.map((a) => a.id), ...newAxisIds];
        } else if (newCount < oldCount) {
          const sorted = [...repAxes].sort(
            (a, b) => Number(a.angle) - Number(b.angle),
          );
          const toRemove = sorted.slice(newCount);
          const toKeep = sorted.slice(0, newCount);
          const removedAxisIds = new Set(toRemove.map((ax) => ax.id));
          const placesOnRemoved = placesList.filter(
            (p) =>
              (p as PlaceLike).parentAxisId != null &&
              removedAxisIds.has((p as PlaceLike).parentAxisId!),
          );
          const idsToDelete = new Set<PlaceId>();
          for (const p of placesOnRemoved) {
            idsToDelete.add(p.id);
            for (const descId of getDescendantPlaceIds(p.id, placesList)) {
              idsToDelete.add(descId);
            }
          }
          for (const id of idsToDelete) {
            evolu.update('place', { id, isDeleted: true });
          }
          for (const ax of toRemove) {
            evolu.update('axis', { id: ax.id, isDeleted: true });
          }
          for (let k = 0; k < toKeep.length; k++) {
            const angle = -Math.PI / 2 + (2 * Math.PI * k) / newCount;
            const ax = toKeep[k];
            if (ax) evolu.update('axis', { id: ax.id, angle });
          }
          finalAxisIds = toKeep.map((a) => a.id);
          const keepAxisIds = new Set(finalAxisIds);
          const remainingEchoPlaces = placesList.filter(
            (p) =>
              (p as PlaceLike).parentAxisId != null &&
              keepAxisIds.has((p as PlaceLike).parentAxisId!),
          );
          const axisOrder = new Map(toKeep.map((ax, i) => [ax.id, i]));
          const byGroup = new Map<PlaceId, typeof remainingEchoPlaces>();
          for (const p of remainingEchoPlaces) {
            const gid = (p as PlaceLike).repeaterEchoGroupId;
            if (gid == null) continue;
            if (!byGroup.has(gid)) byGroup.set(gid, []);
            byGroup.get(gid)!.push(p);
          }
          const remainingEchoPlaceIds = new Set(
            remainingEchoPlaces.map((p) => p.id),
          );
          for (const [, groupPlaces] of byGroup) {
            const sorted = [...groupPlaces].sort(
              (a, b) =>
                (axisOrder.get((a as PlaceLike).parentAxisId!) ?? 0) -
                (axisOrder.get((b as PlaceLike).parentAxisId!) ?? 0),
            );
            const baseName =
              (sorted[0]?.name?.trim().match(/^(.+?) Echo \d+$/) ?? null)?.[1] ??
              sorted[0]?.name?.trim() ??
              'Place';
            sorted.forEach((p, i) => {
              const echoName = `${baseName} Echo ${i + 1}`;
              const nameResult = String1000.from(echoName);
              if (nameResult.ok)
                evolu.update('place', { id: p.id, name: nameResult.value });
            });
          }
          for (const p of placesList) {
            if (remainingEchoPlaceIds.has(p.id)) continue;
            const axisId = getAxisIdForEcho(p as PlaceLike, placesList);
            if (axisId == null || !keepAxisIds.has(axisId)) continue;
            const axisIndex = axisOrder.get(axisId) ?? 0;
            const descBaseName =
              (p.name?.trim().match(/^(.+?) Echo \d+$/) ?? null)?.[1] ??
              p.name?.trim() ??
              'Place';
            const echoName = `${descBaseName} Echo ${axisIndex + 1}`;
            const nameResult = String1000.from(echoName);
            if (nameResult.ok)
              evolu.update('place', { id: p.id, name: nameResult.value });
          }
        }
        if (newCount !== oldCount) {
          const scale = oldCount / newCount;
          const finalAxisIdSet = new Set(finalAxisIds);
          for (const p of placesList) {
            const axisId = (p as PlaceLike).parentAxisId;
            if (axisId == null || !finalAxisIdSet.has(axisId)) continue;
            const d = (p as PlaceLike).distanceAlongAxis ?? 0;
            const perp = (p as PlaceLike).distanceFromAxis ?? 0;
            const r = Math.sqrt(d * d + perp * perp);
            const angleFromAxis = Math.atan2(perp, d);
            const newAngleFromAxis = angleFromAxis * scale;
            const newD = r * Math.cos(newAngleFromAxis);
            const newPerp = r * Math.sin(newAngleFromAxis);
            evolu.update('place', {
              id: p.id,
              distanceAlongAxis: newD,
              distanceFromAxis: newPerp,
            });
          }
        }
        evolu.update('circularRepeater', {
          id: currentRepId,
          count: newCount,
        });
      }
      if (echoRepIds.length > 0) {
        const firstRepeater = circularRepeaters().find(
          (r) => r.id === echoRepIds[0],
        );
        if (firstRepeater)
          recordTransformation({
            kind: 'modifyCircularRepeater',
            placeId: firstRepeater.placeId,
            circularRepeaterId: modRep.circularRepeaterId,
            count: Math.max(2, Math.min(108, Math.round(modRep.count))),
          });
      }
      setPendingModifyCircularRepeater(null);
    }

    const delRepId = pendingDeleteCircularRepeaterId();
    if (delRepId) {
      const echoRepIds = getCircularRepeaterEchoGroupIds(
        delRepId,
        circularRepeaters(),
        placesList,
        axes(),
      );
      let firstRepeater: { placeId: PlaceId } | null = null;
      for (const repId of echoRepIds) {
        const repeater = circularRepeaters().find((r) => r.id === repId);
        if (!repeater) continue;
        if (firstRepeater == null) firstRepeater = repeater;
        const repAxes = axes().filter(
          (a) =>
            (a as { circularRepeaterId?: CircularRepeaterId })
              .circularRepeaterId === repId,
        );
        const axisIds = new Set(repAxes.map((a) => a.id));
        const placesOnAxes = placesList.filter(
          (p) =>
            (p as PlaceLike).parentAxisId != null &&
            axisIds.has((p as PlaceLike).parentAxisId!),
        );
        const idsToDelete = new Set<PlaceId>();
        for (const p of placesOnAxes) {
          idsToDelete.add(p.id);
          for (const descId of getDescendantPlaceIds(p.id, placesList)) {
            idsToDelete.add(descId);
          }
        }
        for (const id of idsToDelete) {
          evolu.update('place', { id, isDeleted: true });
        }
        for (const ax of repAxes) {
          evolu.update('axis', { id: ax.id, isDeleted: true });
        }
        evolu.update('circularRepeater', { id: repId, isDeleted: true });
      }
      if (firstRepeater)
        recordTransformation({
          kind: 'deleteCircularRepeater',
          placeId: firstRepeater.placeId,
          circularRepeaterId: delRepId,
        });
      setPendingDeleteCircularRepeaterId(null);
    }

    const addPlaceOnRep = pendingAddPlaceOnCircularRepeater();
    if (addPlaceOnRep) {
      const echoRepIds = getCircularRepeaterEchoGroupIds(
        addPlaceOnRep.circularRepeaterId,
        circularRepeaters(),
        placesList,
        axes(),
      );
      const usePattern = addPlaceOnRep.patternEnabled === true;
      const show = addPlaceOnRep.alternatingShow ?? 1;
      const skip = addPlaceOnRep.alternatingSkip ?? 1;
      const start = addPlaceOnRep.alternatingStart ?? 1;
      const distanceFromAxis = addPlaceOnRep.distanceFromAxis ?? 0;
      const baseName = nextPlaceName(placesList);
      const patternFields = usePattern
        ? { alternatingShow: show, alternatingSkip: skip, alternatingStart: start }
        : {
            alternatingShow: null,
            alternatingSkip: null,
            alternatingStart: null,
          };
      const axesList = axes();
      const repAxesInPatternPerRepeater = echoRepIds.map((repId) => {
        const repAxes = axesList
          .filter(
            (a) =>
              (a as { circularRepeaterId?: CircularRepeaterId })
                .circularRepeaterId === repId,
          )
          .sort((a, b) => Number(a.angle) - Number(b.angle));
        const count = repAxes.length;
        return usePattern
          ? repAxes.filter((axis) => {
              const axisNum = circularRepeaterAxisNumber(
                axis.id,
                repId,
                axesList,
              );
              return inAxisAlternatingPattern(
                axisNum,
                start,
                show,
                skip,
                count,
              );
            })
          : repAxes;
      });
      const patternLength =
        repAxesInPatternPerRepeater[0]?.length ?? 0;
      let firstPlaceId: PlaceId | null = null;
      for (let axisIdx = 0; axisIdx < patternLength; axisIdx++) {
        const echoIndex = axisIdx + 1;
        const echoName = `${baseName} Echo ${echoIndex}`;
        const nameResult = String1000.from(echoName);
        for (let repIdx = 0; repIdx < echoRepIds.length; repIdx++) {
          const axisForRep = repAxesInPatternPerRepeater[repIdx]?.[axisIdx];
          if (!axisForRep) continue;
          const placeRes: { ok: true; value: { id: PlaceId } } | { ok: false } =
            evolu.insert('place', {
              parentId: null,
              parentAxisId: axisForRep.id,
              distanceAlongAxis: addPlaceOnRep.distanceAlongAxis,
              distanceFromAxis,
              x: 0,
              y: 0,
              ...(firstPlaceId != null && { repeaterEchoGroupId: firstPlaceId }),
              ...(nameResult.ok && { name: nameResult.value }),
              isScaffolding: 1,
              ...patternFields,
            });
          if (placeRes.ok && firstPlaceId == null)
            firstPlaceId = placeRes.value.id;
        }
      }
      if (firstPlaceId != null) {
        evolu.update('place', {
          id: firstPlaceId,
          repeaterEchoGroupId: firstPlaceId,
          ...patternFields,
        });
        recordTransformation({
          kind: 'addPlaceOnCircularRepeater',
          circularRepeaterId: addPlaceOnRep.circularRepeaterId,
          placeId: firstPlaceId,
          distanceAlongAxis: addPlaceOnRep.distanceAlongAxis,
          ...(usePattern && {
            alternatingShow: show,
            alternatingSkip: skip,
            alternatingStart: start,
          }),
        });
      }
      setPendingAddPlaceOnCircularRepeater(null);
    }

    const delLine = pendingDeleteLineId();
    if (delLine) {
      const segmentsList = lineSegments();
      const group = getLineSegmentsInEchoGroup(delLine, segmentsList);
      const ends = lineSegmentEnds();
      for (const seg of group) {
        if (seg.endAId != null && seg.endBId != null) {
          const endA = ends.find((e) => e.id === seg.endAId);
          const placeIdForDelete =
            endA?.placeId ??
            ends.find((e) => e.id === seg.endBId)?.placeId;
          if (placeIdForDelete != null) {
            recordTransformation({
              kind: 'deleteLine',
              placeId: placeIdForDelete,
              lineSegmentId: seg.id,
            });
          }
          evolu.update('lineSegment', { id: seg.id, isDeleted: true });
          evolu.update('lineSegmentEnd', { id: seg.endAId, isDeleted: true });
          evolu.update('lineSegmentEnd', { id: seg.endBId, isDeleted: true });
        }
      }
      setPendingDeleteLineId(null);
    }

    const ps = pendingSplitLine();
    if (ps) {
      const move = pendingMove();
      const worldX =
        move?.placeId === PENDING_SPLIT_PLACE ? move.x : ps.previewX;
      const worldY =
        move?.placeId === PENDING_SPLIT_PLACE ? move.y : ps.previewY;
      const parent = placesList.find((p) => p.id === ps.parentPlaceId);
      let localX = worldX;
      let localY = worldY;
      if (parent) {
        const parentRes = getAbsolutePosition(parent, placesList);
        const localOffset = rotateBy(
          -parentRes.worldAngle,
          worldX - parentRes.x,
          worldY - parentRes.y,
        );
        localX = localOffset.x;
        localY = localOffset.y;
      }
      const placeName = nextPlaceName(placesList);
      const placeNameResult = String1000.from(placeName);
      const endDisplayName1 = lineSegmentEndDisplayName(
        nextLineSegmentName(lineSegments()),
        placeName,
      );
      const name1 = nextLineSegmentName(lineSegments());
      const name2 = nextLineSegmentName([
        ...lineSegments().map((s) => ({ name: s.name })),
        { name: name1 },
      ]);
      // Task 1: insert place only so the worker applies it before task 2.
      setTimeout(() => {
        const placeRes = evolu.insert('place', {
          parentId: ps.parentPlaceId,
          x: localX,
          y: localY,
          ...(placeNameResult.ok && { name: placeNameResult.value }),
          isScaffolding: 1,
        });
        if (!placeRes.ok) {
          setPendingSplitLine(null);
          setPendingMove(null);
          goToSelectStep();
          return;
        }
        const newPlaceId = placeRes.value.id;
        // Task 2: rest of split + position update (place row now exists).
        setTimeout(() => {
          const endRes = evolu.insert('lineSegmentEnd', {
            placeId: newPlaceId,
          });
          if (!endRes.ok) {
            setPendingSplitLine(null);
            setPendingMove(null);
            goToSelectStep();
            return;
          }
          const newEndCId = endRes.value.id;
          const endNameResult = String1000.from(endDisplayName1);
          if (endNameResult.ok) {
            evolu.update('lineSegmentEnd', {
              id: newEndCId,
              name: endNameResult.value,
            });
          }
          const name1Result = String1000.from(name1);
          const seg1Res = evolu.insert('lineSegment', {
            endAId: ps.endAId,
            endBId: newEndCId,
            ...(name1Result.ok && { name: name1Result.value }),
            isScaffolding: 0,
          });
          if (!seg1Res.ok) {
            setPendingSplitLine(null);
            setPendingMove(null);
            goToSelectStep();
            return;
          }
          const name2Result = String1000.from(name2);
          const seg2Res = evolu.insert('lineSegment', {
            endAId: newEndCId,
            endBId: ps.endBId,
            ...(name2Result.ok && { name: name2Result.value }),
            isScaffolding: 0,
          });
          if (!seg2Res.ok) {
            setPendingSplitLine(null);
            setPendingMove(null);
            goToSelectStep();
            return;
          }
          evolu.update('lineSegment', {
            id: ps.segmentId,
            isDeleted: true,
          });
          recordTransformation({
            kind: 'splitLine',
            placeId: newPlaceId,
            lineSegmentId: ps.segmentId,
            lineSegmentId2: seg1Res.value.id,
            lineSegmentId3: seg2Res.value.id,
          });
          if (Number.isFinite(localX) && Number.isFinite(localY)) {
            evolu.update('place', { id: newPlaceId, x: localX, y: localY });
          }
          const REFRESH_DELAY_MS = 400;
          setTimeout(async () => {
            await Promise.all([
              refreshPlaces(),
              refreshLineSegments(),
              refreshLineSegmentEnds(),
              refreshTransformations(),
            ]);
            setPendingSplitLine(null);
            setPendingMove(null);
            goToSelectStep();
          }, REFRESH_DELAY_MS);
        }, 0);
      }, 0);
      return;
    }

    const pac = pendingAddCircularField();
    if (pac?.stage === 'editing') {
      const handleAngle = pac.radiusHandleAngle ?? 0;
      if (pac.circularFieldIds != null && pac.circularFieldIds.length > 0) {
        for (const cfId of pac.circularFieldIds) {
          evolu.update('circularField', {
            id: cfId,
            radius: pac.radius,
            radiusHandleAngle: handleAngle,
          });
          const cf = circularFields().find((c) => c.id === cfId);
          if (cf?.placeId != null) {
            recordTransformation({
              kind: 'addCircularField',
              placeId: cf.placeId,
              circularFieldId: cfId,
              radius: pac.radius,
            });
          }
        }
      } else {
        evolu.update('circularField', {
          id: pac.circularFieldId,
          radius: pac.radius,
          radiusHandleAngle: handleAngle,
        });
        if (pac.isNewPlace) {
          const move = pendingMove();
          const place = placesList.find((p) => p.id === pac.placeId);
          const finalX =
            move?.placeId === pac.placeId ? move.x : (place?.x ?? 0);
          const finalY =
            move?.placeId === pac.placeId ? move.y : (place?.y ?? 0);
          recordTransformation({
            kind: 'add',
            placeId: pac.placeId,
            parentId: null,
            x: finalX,
            y: finalY,
          });
        }
        recordTransformation({
          kind: 'addCircularField',
          placeId: pac.placeId,
          circularFieldId: pac.circularFieldId,
          radius: pac.radius,
        });
      }
      setPendingAddCircularField(null);
    }

    const pmc = pendingModifyCircularField();
    if (pmc) {
      const echoIds = getCircularFieldEchoGroupIds(
        pmc.circularFieldId,
        places(),
        circularFields(),
      );
      const handleAngle = pmc.radiusHandleAngle ?? 0;
      for (const id of echoIds) {
        evolu.update('circularField', {
          id,
          radius: pmc.radius,
          radiusHandleAngle: handleAngle,
        });
      }
      recordTransformation({
        kind: 'modifyCircularField',
        placeId: pmc.placeId,
        circularFieldId: pmc.circularFieldId,
        radius: pmc.radius,
      });
      setPendingModifyCircularField(null);
    }

    const pdcId = pendingDeleteCircularFieldId();
    if (pdcId) {
      const cf = circularFields().find((c) => c.id === pdcId);
      if (cf?.placeId != null) {
        evolu.update('circularField', { id: pdcId, isDeleted: true });
        recordTransformation({
          kind: 'deleteCircularField',
          placeId: cf.placeId,
          circularFieldId: pdcId,
        });
      }
      setPendingDeleteCircularFieldId(null);
    }

    const pmbf = pendingMoveBendingCircularField();
    if (pmbf) {
      const bf = bendingFieldsWithPositions().find((b) => b.id === pmbf);
      if (bf) {
        const end = lineSegmentEnds().find((e) => e.id === bf.lineSegmentEndId);
        const seg = lineSegments().find(
          (s) =>
            s.endAId === bf.lineSegmentEndId ||
            s.endBId === bf.lineSegmentEndId,
        );
        if (end?.placeId != null && seg) {
          recordTransformation({
            kind: 'modifyBendingCircularField',
            placeId: end.placeId,
            lineSegmentId: seg.id,
            bendingCircularFieldId: pmbf,
            radius: bf.radius,
          });
        }
      }
    }
    setPendingMoveBendingCircularField(null);
    const draggingBf = draggingBendingCircularFieldRadius();
    if (draggingBf) {
      const bf = bendingFieldsWithPositions().find((b) => b.id === draggingBf);
      if (bf) {
        const end = lineSegmentEnds().find((e) => e.id === bf.lineSegmentEndId);
        const seg = lineSegments().find(
          (s) =>
            s.endAId === bf.lineSegmentEndId ||
            s.endBId === bf.lineSegmentEndId,
        );
        if (end?.placeId != null && seg) {
          recordTransformation({
            kind: 'modifyBendingCircularField',
            placeId: end.placeId,
            lineSegmentId: seg.id,
            bendingCircularFieldId: draggingBf,
            radius: bf.radius,
          });
        }
      }
    }
    setDraggingBendingCircularFieldRadius(null);
    const pdbId = pendingDeleteBendingCircularFieldId();
    if (pdbId) {
      const bf = bendingCircularFields().find((b) => b.id === pdbId);
      if (bf?.lineSegmentEndId != null) {
        const end = lineSegmentEnds().find((e) => e.id === bf.lineSegmentEndId);
        const seg = lineSegments().find(
          (s) =>
            s.endAId === bf.lineSegmentEndId ||
            s.endBId === bf.lineSegmentEndId,
        );
        if (end?.placeId != null && seg) {
          recordTransformation({
            kind: 'deleteBendingCircularField',
            placeId: end.placeId,
            lineSegmentId: seg.id,
            bendingCircularFieldId: pdbId,
          });
        }
      }
      evolu.update('bendingCircularField', { id: pdbId, isDeleted: true });
      setPendingDeleteBendingCircularFieldId(null);
    }

    for (const a of pendingBendAtEndsAdded()) {
      recordTransformation({
        kind: 'addBendingCircularField',
        placeId: a.placeId,
        lineSegmentId: a.lineSegmentId,
        bendingCircularFieldId: a.id,
        radius: a.radius,
      });
    }
    setPendingBendAtEndsAdded([]);
    for (const d of pendingBendAtEndsDeleted()) {
      recordTransformation({
        kind: 'deleteBendingCircularField',
        placeId: d.placeId,
        lineSegmentId: d.lineSegmentId,
        bendingCircularFieldId: d.id,
      });
    }
    setPendingBendAtEndsDeleted([]);

    setPendingAddLine(null);
    goToSelectStep();
  };

  const handleReject = () => {
    const pac = pendingAddCircularField();
    if (pac?.stage === 'editing') {
      if (pac.isNewPlace) {
        evolu.update('place', { id: pac.placeId, isDeleted: true });
      }
      evolu.update('circularField', {
        id: pac.circularFieldId,
        isDeleted: true,
      });
    }
    setPendingAddCircularField(null);
    setPendingModifyCircularField(null);
    setPendingDeleteCircularFieldId(null);
    setDraggingCircularFieldRadius(null);
    setPendingSplitLine(null);
    setPendingMove(null);
    for (const a of pendingBendAtEndsAdded()) {
      evolu.update('bendingCircularField', { id: a.id, isDeleted: true });
    }
    setPendingBendAtEndsAdded([]);
    for (const d of pendingBendAtEndsDeleted()) {
      evolu.update('bendingCircularField', { id: d.id, isDeleted: false });
    }
    setPendingBendAtEndsDeleted([]);
    goToSelectStep();
  };

  const resetDrawing = () => {
    for (const p of places()) {
      evolu.update('place', { id: p.id, isDeleted: true });
    }
    for (const e of lineSegmentEnds()) {
      evolu.update('lineSegmentEnd', { id: e.id, isDeleted: true });
    }
    for (const s of lineSegments()) {
      evolu.update('lineSegment', { id: s.id, isDeleted: true });
    }
    for (const t of transformationsRows()) {
      evolu.update('transformation', { id: t.id, isDeleted: true });
    }
    for (const a of axes()) {
      evolu.update('axis', { id: a.id, isDeleted: true });
    }
    for (const c of circularFields()) {
      evolu.update('circularField', { id: c.id, isDeleted: true });
    }
    for (const r of circularRepeaters()) {
      const repAxes = axes().filter(
        (a) =>
          (a as { circularRepeaterId?: CircularRepeaterId })
            .circularRepeaterId === r.id,
      );
      for (const ax of repAxes) {
        evolu.update('axis', { id: ax.id, isDeleted: true });
      }
      evolu.update('circularRepeater', { id: r.id, isDeleted: true });
    }
    for (const b of bendingCircularFields()) {
      evolu.update('bendingCircularField', { id: b.id, isDeleted: true });
    }
    resetGuide();
    resetZoom();
  };

  const displayPlaces = () => {
    const result: Array<{
      id: PlaceId | 'pending';
      x: number;
      y: number;
      isScaffolding?: number | null;
    }> = [];
    const pm = pendingMove();
    const pa = pendingAdd();
    const placesData = placesWithAbsolutePositions();

    for (const p of placesData) {
      const overridden = pm && pm.placeId === p.id;
      result.push({
        id: p.id,
        x: overridden ? pm.x : p.absX,
        y: overridden ? pm.y : p.absY,
        isScaffolding: p.isScaffolding ?? null,
      });
    }
    if (pa) {
      result.push({
        id: 'pending',
        x: pa.x,
        y: pa.y,
        isScaffolding: 0,
      });
    }
    return result;
  };

  createShortcut(['='], zoomIn, { preventDefault: true });
  createShortcut(['+'], zoomIn, { preventDefault: true });
  createShortcut(['-'], zoomOut, { preventDefault: true });
  createShortcut(['0'], resetZoom, { preventDefault: true });

  createShortcut(
    [' '],
    () => {
      if (mode() !== 'pan') {
        setPrevMode(mode());
        setMode('pan');
      }
    },
    { preventDefault: true },
  );

  createEventListener(document, 'keyup', (e) => {
    if (e.code === 'Space') {
      setMode(prevMode());
    }
  });

  createEventListener(
    () => svg,
    'wheel',
    (e) => {
      e.preventDefault();
      zoomBy(-e.deltaY * WHEEL_SCALE_FACTOR, e.clientX, e.clientY);
    },
    { passive: false },
  );

  createEventListener(
    () => svg,
    'pointermove',
    (e) => {
      const gs = guideStep();
      const tc = transformChoice();
      const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
      const pal = pendingAddLine();
      if (pal && gs === 'execute' && tc === 'addLine' && mode() === 'default') {
        setPendingAddLine({ ...pal, cursorX: cx, cursorY: cy });
      }
      if (
        gs === 'execute' &&
        (tc === 'rotate' ||
          tc === 'addAxis' ||
          tc === 'modifyAxis' ||
          tc === 'move' ||
          tc === 'modifyPlaceOnCircularRepeater' ||
          (tc === 'addLineSegment' && pendingAddLineSegment() != null))
      ) {
        setLastCursorCanvas({ x: cx, y: cy });
      } else {
        setLastCursorCanvas(null);
      }
    },
  );

  const pointers = new Map<number, { x: number; y: number }>();
  let prevPinchDist = 0;

  createPerPointerListeners({
    target: () => svg,
    pointerTypes: ['mouse', 'touch'],
    onDown(ev, onMove, onUp) {
      const e = ev as PointerEvent;
      pointers.set(e.pointerId, { x: e.x, y: e.y });

      if (mode() === 'pan' && pointers.size === 1) {
        setIsPanning(true);
      }

      let isMoveDrag = false;
      if (mode() === 'default') {
        handlePointerDown(e);
        const pm = pendingMove();
        const tc = transformChoice();
        const gs = guideStep();
        const pr = pendingRotate();
        const pac = pendingAddCircularField();
        const shouldDrag =
          (pm &&
            gs === 'execute' &&
            (tc === 'move' ||
              tc === 'modifyPlaceOnCircularRepeater' ||
              tc === 'moveCircularField' ||
              tc === 'addLine' ||
              tc === 'splitLine' ||
              ((tc === 'add' || tc === 'addRelated') &&
                pm.placeId === 'pending') ||
              (tc === 'addCircularField' &&
                pac?.stage === 'editing' &&
                pac.isNewPlace &&
                pm.placeId === pac.placeId))) ||
          (pr && gs === 'execute' && tc === 'rotate') ||
          (draggingCircularFieldRadius() != null &&
            gs === 'execute' &&
            (tc === 'addCircularField' || tc === 'modifyCircularField')) ||
          (pendingMoveBendingCircularField() != null &&
            gs === 'execute' &&
            (tc === 'modifyBendingCircularField' || tc === 'bendAtEnds')) ||
          (draggingBendingCircularFieldRadius() != null &&
            gs === 'execute' &&
            (tc === 'modifyBendingCircularField' || tc === 'bendAtEnds')) ||
          (draggingAxisAngle() &&
            gs === 'execute' &&
            (tc === 'addAxis' || tc === 'modifyAxis')) ||
          (draggingPlaceOnAxis() != null &&
            gs === 'execute' &&
            tc === 'addPlaceOnAxis') ||
          (draggingPlaceOnCircularField() != null &&
            gs === 'execute' &&
            tc === 'addPlaceOnCircularField') ||
          (draggingPlaceOnCircularRepeater() != null &&
            gs === 'execute' &&
            tc === 'addPlaceOnCircularRepeater');
        if (shouldDrag) {
          isMoveDrag = true;
          onMove((moveEv) => {
            handlePointerMove(moveEv as PointerEvent);
          });
        }
      }

      if (!isMoveDrag) {
        onMove((e) => {
          const prev = pointers.get(e.pointerId);
          pointers.set(e.pointerId, { x: e.x, y: e.y });

          if (pointers.size === 2) {
            const pts = [...pointers.values()];
            const a = pts[0];
            const b = pts[1];
            if (!a || !b) return;

            const dist = Math.hypot(a.x - b.x, a.y - b.y);

            if (prevPinchDist > 0) {
              const delta = (dist - prevPinchDist) * PINCH_SCALE_FACTOR;
              const midX = (a.x + b.x) / 2;
              const midY = (a.y + b.y) / 2;
              zoomBy(delta, midX, midY);
            }
            prevPinchDist = dist;
          } else if (mode() === 'pan' && pointers.size === 1 && prev) {
            const dx = e.x - prev.x;
            const dy = e.y - prev.y;
            setTranslateX(translateX() + dx);
            setTranslateY(translateY() + dy);
          }
        });
      }

      onUp(() => {
        if (isMoveDrag) handlePointerUp();
        pointers.delete(e.pointerId);
        if (pointers.size < 2) prevPinchDist = 0;
        if (pointers.size === 0) setIsPanning(false);
      });
    },
  });

  const cursorClass = () => {
    if (isPanning()) return 'cursor-grabbing';
    if (mode() === 'pan') return 'cursor-grab';
    return '';
  };

  return (
    <div class={classes.appRoot}>
      {/* Left pane: Drawing Guide */}
      <div class={classes.pane}>
        <DrawingGuide
          step={guideStep}
          selectedPlaceId={selectedPlaceId()}
          selectedLineSegmentId={selectedLineSegmentId()}
          selectedCircularFieldId={selectedCircularFieldId()}
          selectedBendingCircularFieldId={selectedBendingCircularFieldId()}
          selectedAxisId={selectedAxisId()}
          selectedCircularRepeaterId={selectedCircularRepeaterId()}
          transformChoice={transformChoice()}
          onStepObserve={resetGuide}
          onStepSelect={() => setGuideStep('select')}
          onRequestStep={(s) => {
            if (s === 'select') {
              batch(() => {
                setGuideStep(s);
                setTransformChoice(null);
                setSelectedPlaceId(null);
                setSelectedLineSegmentId(null);
                setSelectedCircularFieldId(null);
                setSelectedBendingCircularFieldId(null);
                setSelectedAxisId(null);
                setSelectedCircularRepeaterId(null);
                setHasDrawingPaneSelected(false);
              });
            } else {
              setGuideStep(s);
            }
          }}
          onCancelSelection={handleCancelSelection}
          onSelectCanvas={() => {
            setHasDrawingPaneSelected(true);
            setSelectedPlaceId(null);
            setSelectedLineSegmentId(null);
            setSelectedCircularFieldId(null);
            setSelectedBendingCircularFieldId(null);
            setSelectedAxisId(null);
            setSelectedCircularRepeaterId(null);
            setGuideStep('transform');
          }}
          onTransformChoice={handleTransformChoice}
          onCommit={handleCommit}
          onReject={handleReject}
          onReset={() => {
            if (guideStep() === 'execute' || guideStep() === 'complete') {
              goToSelectStep();
            } else {
              resetGuide();
            }
          }}
          hasDrawingPaneSelected={hasDrawingPaneSelected()}
          pendingAdd={!!pendingAdd()}
          pendingMove={!!pendingMove()}
          pendingRotate={!!pendingRotate()}
          pendingAddLine={!!pendingAddLine()}
          pendingAddLineSegment={!!pendingAddLineSegment()}
          pendingAddCircularField={
            pendingAddCircularField() != null &&
            pendingAddCircularField()?.stage === 'editing'
          }
          pendingModifyCircularField={!!pendingModifyCircularField()}
          pendingDeleteLineId={!!pendingDeleteLineId()}
          pendingDeleteCircularFieldId={!!pendingDeleteCircularFieldId()}
          pendingDeleteBendingCircularFieldId={
            !!pendingDeleteBendingCircularFieldId()
          }
          pendingMoveBendingCircularField={!!pendingMoveBendingCircularField()}
          draggingBendingCircularFieldRadius={
            !!draggingBendingCircularFieldRadius()
          }
          pendingBendAtEndsDirty={bendAtEndsDirty()}
          pendingSplitLine={!!pendingSplitLine()}
          pendingAddAxis={!!pendingAddAxis()}
          pendingModifyAxis={!!pendingModifyAxis()}
          pendingDeleteAxisId={!!pendingDeleteAxisId()}
          pendingAddPlaceOnAxis={!!pendingAddPlaceOnAxis()}
          pendingAddPlaceOnCircularField={!!pendingAddPlaceOnCircularField()}
          pendingAddCircularRepeater={!!pendingAddCircularRepeater()}
          pendingModifyCircularRepeater={!!pendingModifyCircularRepeater()}
          pendingAddPlaceOnCircularRepeater={
            !!pendingAddPlaceOnCircularRepeater()
          }
          pendingModifyPlaceOnCircularRepeater={
            !!pendingModifyPlaceOnCircularRepeater()
          }
          pendingDeleteCircularRepeaterId={!!pendingDeleteCircularRepeaterId()}
          circularRepeaterCount={
            pendingAddCircularRepeater()?.count ??
            pendingModifyCircularRepeater()?.count ??
            4
          }
          onRepeaterCountChange={(n) => {
            const pa = pendingAddCircularRepeater();
            if (pa) setPendingAddCircularRepeater({ ...pa, count: n });
            const pmod = pendingModifyCircularRepeater();
            if (pmod) setPendingModifyCircularRepeater({ ...pmod, count: n });
          }}
          showRepetitionPatternSection={
            transformChoice() === 'addPlaceOnCircularRepeater' ||
            (transformChoice() === 'modifyPlaceOnCircularRepeater' &&
              pendingModifyPlaceOnCircularRepeater() != null)
          }
          repetitionPatternEnabled={
            (transformChoice() === 'addPlaceOnCircularRepeater' &&
              pendingAddPlaceOnCircularRepeater()?.patternEnabled) ||
            (transformChoice() === 'modifyPlaceOnCircularRepeater' &&
              pendingModifyPlaceOnCircularRepeater()?.patternEnabled) ||
            false
          }
          onRepetitionPatternEnabledChange={(enabled) => {
            const pa = pendingAddPlaceOnCircularRepeater();
            if (pa && transformChoice() === 'addPlaceOnCircularRepeater') {
              setPendingAddPlaceOnCircularRepeater({
                ...pa,
                patternEnabled: enabled,
                ...(enabled && {
                  alternatingShow: pa.alternatingShow ?? 1,
                  alternatingSkip: pa.alternatingSkip ?? 1,
                  alternatingStart:
                    pa.alternatingStart ??
                    pa.placementAxisNumber ??
                    1,
                }),
              });
            }
            const pmod = pendingModifyPlaceOnCircularRepeater();
            if (pmod && transformChoice() === 'modifyPlaceOnCircularRepeater') {
              setPendingModifyPlaceOnCircularRepeater({
                ...pmod,
                patternEnabled: enabled,
                ...(enabled && {
                  alternatingShow: pmod.alternatingShow ?? 1,
                  alternatingSkip: pmod.alternatingSkip ?? 1,
                  alternatingStart: pmod.alternatingStart ?? 1,
                }),
              });
            }
          }}
          alternatingPattern={
            (transformChoice() === 'addPlaceOnCircularRepeater' &&
              pendingAddPlaceOnCircularRepeater()?.patternEnabled) ||
            (transformChoice() === 'modifyPlaceOnCircularRepeater' &&
              pendingModifyPlaceOnCircularRepeater()?.patternEnabled)
              ? {
                  show:
                    pendingAddPlaceOnCircularRepeater()?.alternatingShow ??
                    pendingModifyPlaceOnCircularRepeater()?.alternatingShow ??
                    1,
                  skip:
                    pendingAddPlaceOnCircularRepeater()?.alternatingSkip ??
                    pendingModifyPlaceOnCircularRepeater()?.alternatingSkip ??
                    1,
                  start:
                    pendingAddPlaceOnCircularRepeater()?.alternatingStart ??
                    pendingAddPlaceOnCircularRepeater()?.placementAxisNumber ??
                    pendingModifyPlaceOnCircularRepeater()?.alternatingStart ??
                    1,
                }
              : null
          }
          onAlternatingPatternChange={(show, skip, start) => {
            const pa = pendingAddPlaceOnCircularRepeater();
            if (pa)
              setPendingAddPlaceOnCircularRepeater({
                ...pa,
                alternatingShow: show,
                alternatingSkip: skip,
                alternatingStart: start,
              });
            const pmod = pendingModifyPlaceOnCircularRepeater();
            if (pmod)
              setPendingModifyPlaceOnCircularRepeater({
                ...pmod,
                alternatingShow: show,
                alternatingSkip: skip,
                alternatingStart: start,
              });
          }}
          circularRepeaterAxisCount={
            (() => {
              const repId =
                pendingAddPlaceOnCircularRepeater()?.circularRepeaterId ??
                pendingModifyPlaceOnCircularRepeater()?.circularRepeaterId;
              if (!repId) return 1;
              return axes().filter(
                (a) =>
                  (a as { circularRepeaterId?: CircularRepeaterId })
                    .circularRepeaterId === repId,
              ).length;
            })()
          }
          bendAtEndsState={bendAtEndsState()}
          axisDirection={
            (transformChoice() === 'addAxis' ||
              transformChoice() === 'modifyAxis') &&
            (pendingAddAxis() ?? pendingModifyAxis())
              ? {
                  isBidirectional:
                    (pendingAddAxis() ?? pendingModifyAxis())
                      ?.isBidirectional ?? true,
                  onDirectionChange: (v: boolean) => {
                    const pa = pendingAddAxis();
                    if (pa) setPendingAddAxis({ ...pa, isBidirectional: v });
                    const pmod = pendingModifyAxis();
                    if (pmod)
                      setPendingModifyAxis({ ...pmod, isBidirectional: v });
                  },
                  isMirror:
                    (pendingAddAxis() ?? pendingModifyAxis())?.isMirror ?? false,
                  onMirrorChange: (v: boolean) => {
                    const pa = pendingAddAxis();
                    if (pa) setPendingAddAxis({ ...pa, isMirror: v });
                    const pmod = pendingModifyAxis();
                    if (pmod) setPendingModifyAxis({ ...pmod, isMirror: v });
                  },
                }
              : null
          }
          availableTransforms={availableTransformsList()}
          scale={scale()}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          canZoomIn={scale() < MAX_SCALE}
          canZoomOut={scale() > MIN_SCALE}
          mode={mode()}
          onTogglePan={togglePan}
          onResetDrawing={resetDrawing}
        />
      </div>
      {/* Middle pane: Canvas */}
      <div
        class={`${classes.paneCanvas} ${
          hasDrawingPaneSelected() &&
          (guideStep() === 'select' || guideStep() === 'transform')
            ? classes.canvasSelectedRing
            : ''
        }`}
      >
        <svg
          ref={svg}
          xmlns="http://www.w3.org/2000/svg"
          class={`${classes.canvasSvg} ${cursorClass()}`}
        >
          <title>Drawing canvas</title>
          <g
            transform={`translate(${translateX()} ${translateY()}) scale(${scale()})`}
          >
            {transformChoice() === 'rotate' &&
              guideStep() === 'execute' &&
              selectedPlaceId() &&
              (() => {
                const placesAbs = placesWithAbsolutePositions();
                const selectedPlace = placesAbs.find(
                  (p) => p.id === selectedPlaceId(),
                );
                if (!selectedPlace) return null;
                const groupId = (selectedPlace as PlaceLike).repeaterEchoGroupId;
                const placesToDraw =
                  groupId != null
                    ? placesAbs.filter(
                        (p) =>
                          (p as PlaceLike).repeaterEchoGroupId === groupId,
                      )
                    : [selectedPlace];
                return (
                  <g>
                    {placesToDraw.map((place) => {
                      const cx = place.absX;
                      const cy = place.absY;
                      const isSelected = place.id === selectedPlaceId();
                      const parentAxisId = (place as PlaceLike).parentAxisId;
                      const axis =
                        parentAxisId != null
                          ? axes().find((a) => a.id === parentAxisId)
                          : null;
                      const isRepeaterEcho =
                        axis != null &&
                        (axis as { circularRepeaterId?: CircularRepeaterId })
                          .circularRepeaterId != null;
                      const centerPlace =
                        axis != null
                          ? placesAbs.find((p) => p.id === axis.placeId)
                          : null;
                      const radialAngle =
                        isRepeaterEcho && centerPlace != null
                          ? Math.atan2(
                              cy - centerPlace.absY,
                              cx - centerPlace.absX,
                            )
                          : null;
                      const isAxisPlace = parentAxisId != null;
                      const theta =
                        isSelected
                          ? pendingRotate()?.angle ??
                            (place.absWorldAngle ?? radialAngle ?? 0)
                          : place.absWorldAngle ?? 0;
                      const dirX = isAxisPlace
                        ? Math.cos(theta)
                        : Math.sin(theta);
                      const dirY = isAxisPlace
                        ? Math.sin(theta)
                        : -Math.cos(theta);
                      const ex =
                        cx + ORIENTATION_AXIS_LENGTH * dirX;
                      const ey =
                        cy + ORIENTATION_AXIS_LENGTH * dirY;
                      const axisAngle = Math.atan2(dirY, dirX);
                      const cursor = lastCursorCanvas();
                      const tRaw = cursor
                        ? projectPointOntoAxis(
                            cursor.x,
                            cursor.y,
                            cx,
                            cy,
                            axisAngle,
                          )
                        : 0.8 * ORIENTATION_AXIS_LENGTH;
                      const t = Math.max(
                        0,
                        Math.min(ORIENTATION_AXIS_LENGTH, tRaw),
                      );
                      const handleX = cx + t * dirX;
                      const handleY = cy + t * dirY;
                      const arrowSize = 18;
                      const baseX = ex - arrowSize * dirX;
                      const baseY = ey - arrowSize * dirY;
                      const perp = 0.5 * arrowSize;
                      const perpX = -dirY;
                      const perpY = dirX;
                      const leftX = baseX + perp * perpX;
                      const leftY = baseY + perp * perpY;
                      const rightX = baseX - perp * perpX;
                      const rightY = baseY - perp * perpY;
                      const arrowD = `M ${ex} ${ey} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
                      const orientHandleSize = svgTokens.handleSize;
                      return (
                        <g key={place.id}>
                          <line
                            x1={cx}
                            y1={cy}
                            x2={ex}
                            y2={ey}
                            stroke={svgTokens.orientationAxisStroke}
                            stroke-width={
                              svgTokens.orientationAxisStrokeWidth
                            }
                            stroke-dasharray={
                              svgTokens.orientationAxisDasharray
                            }
                            style={svgTokens.pointerEventsNone}
                          />
                          <path
                            d={arrowD}
                            fill={svgTokens.orientationAxisFill}
                            style={svgTokens.pointerEventsNone}
                          />
                          {isSelected && (
                            <>
                              <rect
                                x={handleX - orientHandleSize / 2}
                                y={handleY - orientHandleSize / 2}
                                width={orientHandleSize}
                                height={orientHandleSize}
                                fill={svgTokens.handleFill}
                                style={svgTokens.pointerEventsNone}
                              />
                              <line
                                x1={cx}
                                y1={cy}
                                x2={ex}
                                y2={ey}
                                stroke="transparent"
                                stroke-width={72}
                                style={svgTokens.cursorGrab}
                              />
                            </>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })()}
            {(() => {
              const placesAbs = placesWithAbsolutePositions();
              const rect = svg?.getBoundingClientRect?.();
              const viewport: ViewportCanvas | null =
                rect != null
                  ? {
                      left: -translateX() / scale(),
                      top: -translateY() / scale(),
                      width: rect.width / scale(),
                      height: rect.height / scale(),
                    }
                  : null;
              const pa = pendingAddAxis();
              const pmod = pendingModifyAxis();
              const gs = guideStep();
              const tc = transformChoice();
              const showAxisHandle =
                gs === 'execute' &&
                (tc === 'addAxis' || tc === 'modifyAxis') &&
                (pa != null || pmod != null);
              const axesToDraw: Array<{
                id: AxisId | string;
                placeId: PlaceId;
                angle: number;
                isBidirectional: boolean;
                isMirror: boolean;
                circularRepeaterId?: CircularRepeaterId | null;
              }> = axes().map((axis) => {
                const ax = axis as { isMirror?: number | null };
                return {
                  id: axis.id,
                  placeId: axis.placeId,
                  angle:
                    pmod?.axisId === axis.id ? pmod.angle : Number(axis.angle),
                  isBidirectional:
                    pmod?.axisId === axis.id
                      ? pmod.isBidirectional
                      : axis.isBidirectional !== 0,
                  isMirror:
                    pmod?.axisId === axis.id
                      ? pmod.isMirror
                      : ax.isMirror === 1,
                  circularRepeaterId: (axis as { circularRepeaterId?: CircularRepeaterId })
                    .circularRepeaterId,
                };
              });
              if (pa)
                axesToDraw.push({
                  id: 'pending-axis',
                  placeId: pa.placeId,
                  angle: pa.angle,
                  isBidirectional: pa.isBidirectional,
                  isMirror: pa.isMirror,
                });
              return axesToDraw.map((axisLike) => {
                const geom = getAxisWorldGeometry(
                  {
                    id: axisLike.id as AxisId,
                    placeId: axisLike.placeId,
                    angle: axisLike.angle,
                  },
                  placesAbs,
                );
                const unidirectional = !axisLike.isBidirectional;
                const seg =
                  viewport != null
                    ? axisSegmentInViewport(
                        geom.originX,
                        geom.originY,
                        geom.worldAngle,
                        viewport,
                        100,
                        { unidirectional },
                      )
                    : {
                        x1: geom.originX,
                        y1: geom.originY,
                        x2: geom.originX,
                        y2: geom.originY,
                      };
                const isSelected =
                  typeof axisLike.id === 'string'
                    ? false
                    : axisLike.id === selectedAxisId();
                const isRepeaterSelected =
                  selectedCircularRepeaterId() != null &&
                  (axisLike as { circularRepeaterId?: CircularRepeaterId })
                    .circularRepeaterId === selectedCircularRepeaterId();
                const isActiveAxis =
                  showAxisHandle &&
                  ((pa != null && axisLike.id === 'pending-axis') ||
                    (pmod != null && axisLike.id === pmod.axisId));
                const segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
                const t1 = projectPointOntoAxis(
                  seg.x1,
                  seg.y1,
                  geom.originX,
                  geom.originY,
                  geom.worldAngle,
                );
                const t2 = projectPointOntoAxis(
                  seg.x2,
                  seg.y2,
                  geom.originX,
                  geom.originY,
                  geom.worldAngle,
                );
                const tMin = Math.min(t1, t2);
                const tMax = Math.max(t1, t2);
                const cursor = lastCursorCanvas();
                const tClamped = cursor
                  ? Math.max(
                      tMin,
                      Math.min(
                        tMax,
                        projectPointOntoAxis(
                          cursor.x,
                          cursor.y,
                          geom.originX,
                          geom.originY,
                          geom.worldAngle,
                        ),
                      ),
                    )
                  : (tMin + tMax) / 2;
                const axisHandleX =
                  geom.originX + tClamped * Math.cos(geom.worldAngle);
                const axisHandleY =
                  geom.originY + tClamped * Math.sin(geom.worldAngle);
                const axisHandleSize = svgTokens.handleSize;
                const offset = svgTokens.axisMirrorLineOffset;
                const perpX = -Math.sin(geom.worldAngle);
                const perpY = Math.cos(geom.worldAngle);
                return (
                  <g>
                    {axisLike.isMirror && (
                      <>
                        <line
                          x1={seg.x1 + offset * perpX}
                          y1={seg.y1 + offset * perpY}
                          x2={seg.x2 + offset * perpX}
                          y2={seg.y2 + offset * perpY}
                          stroke={svgTokens.axisMirrorLineStroke}
                          stroke-width={svgTokens.axisMirrorLineStrokeWidth}
                          style={svgTokens.pointerEventsNone}
                        />
                        <line
                          x1={seg.x1 - offset * perpX}
                          y1={seg.y1 - offset * perpY}
                          x2={seg.x2 - offset * perpX}
                          y2={seg.y2 - offset * perpY}
                          stroke={svgTokens.axisMirrorLineStroke}
                          stroke-width={svgTokens.axisMirrorLineStrokeWidth}
                          style={svgTokens.pointerEventsNone}
                        />
                      </>
                    )}
                    <line
                      x1={seg.x1}
                      y1={seg.y1}
                      x2={seg.x2}
                      y2={seg.y2}
                      stroke={
                        isSelected || isRepeaterSelected
                          ? svgTokens.placeSelectedStroke
                          : svgTokens.orientationAxisStroke
                      }
                      stroke-width={
                        isSelected || isRepeaterSelected
                          ? svgTokens.placeSelectedStrokeWidth
                          : svgTokens.orientationAxisStrokeWidth
                      }
                      stroke-dasharray={svgTokens.orientationAxisDasharray}
                      style={svgTokens.pointerEventsNone}
                    />
                    {isActiveAxis && segLen > 0 && (
                      <rect
                        x={axisHandleX - axisHandleSize / 2}
                        y={axisHandleY - axisHandleSize / 2}
                        width={axisHandleSize}
                        height={axisHandleSize}
                        fill={svgTokens.handleFill}
                        style={svgTokens.pointerEventsNone}
                      />
                    )}
                    {isRepeaterSelected &&
                      axisLike.circularRepeaterId != null &&
                      axisLike.id !== 'pending-axis' && (
                      (() => {
                        const axisNumber = circularRepeaterAxisNumber(
                          axisLike.id as AxisId,
                          axisLike.circularRepeaterId,
                          axes(),
                        );
                        if (axisNumber <= 0) return null;
                        const labelOffset = svgTokens.axisLabelOffset;
                        const distFromAxis = svgTokens.axisLabelDistanceFromAxis;
                        const cosA = Math.cos(geom.worldAngle);
                        const sinA = Math.sin(geom.worldAngle);
                        const labelX =
                          geom.originX +
                          labelOffset * cosA -
                          distFromAxis * sinA;
                        const labelY =
                          geom.originY +
                          labelOffset * sinA +
                          distFromAxis * cosA;
                        return (
                          <text
                            x={labelX}
                            y={labelY}
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-size={svgTokens.axisLabelFontSize}
                            fill={svgTokens.orientationAxisStroke}
                            style={svgTokens.pointerEventsNone}
                          >
                            {axisNumber}
                          </text>
                        );
                      })()
                    )}
                  </g>
                );
              });
            })()}
            {(() => {
              const segs = lineSegmentsWithPositions();
              const fullSegs = lineSegments();
              const bending = bendingFieldsWithPositions();
              return segs.map((seg) => {
                const full = fullSegs.find((s) => s.id === seg.id);
                const bendA = full
                  ? bending.find((b) => b.lineSegmentEndId === full.endAId)
                  : undefined;
                const bendB = full
                  ? bending.find((b) => b.lineSegmentEndId === full.endBId)
                  : undefined;
                const pathD = buildBentSegmentPath(
                  { x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 },
                  bendA,
                  bendB,
                );
                const isSelected = seg.id === selectedLineSegmentId();
                const isScaffolding = seg.isScaffolding === 1;
                const stroke = isSelected
                  ? svgTokens.lineSegmentSelectedStroke
                  : isScaffolding
                    ? svgTokens.lineSegmentScaffoldingStroke
                    : svgTokens.lineSegmentUnselectedStroke;
                const strokeWidth = isSelected
                  ? svgTokens.lineSegmentSelectedWidth
                  : isScaffolding
                    ? svgTokens.lineSegmentScaffoldingStrokeWidth
                    : svgTokens.lineSegmentUnselectedStrokeWidth;
                const dasharray = isScaffolding
                  ? svgTokens.lineSegmentScaffoldingDasharray
                  : undefined;
                return (
                  <g class="cursor-pointer" key={seg.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={stroke}
                      stroke-width={strokeWidth}
                      stroke-dasharray={dasharray}
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      stroke-width={LINE_SEGMENT_HIT_THRESHOLD * 2}
                    />
                  </g>
                );
              });
            })()}
            {(() => {
              const pal = pendingAddLine();
              if (!pal) return null;
              const startPlace = placesWithAbsolutePositions().find(
                (p) => p.id === pal.startPlaceId,
              );
              return (
                <line
                  x1={startPlace?.absX ?? pal.cursorX}
                  y1={startPlace?.absY ?? pal.cursorY}
                  x2={pal.cursorX}
                  y2={pal.cursorY}
                  stroke={svgTokens.pendingAddLineStroke}
                  stroke-width={svgTokens.pendingAddLineWidth}
                  stroke-dasharray={svgTokens.pendingAddLineDasharray}
                  style={svgTokens.pointerEventsNone}
                />
              );
            })()}
            {(() => {
              const pals = pendingAddLineSegment();
              if (!pals) return null;
              const cursor = lastCursorCanvas();
              if (!cursor) return null;
              const originPlace = placesWithAbsolutePositions().find(
                (p) => p.id === pals.originSelectedPlaceId,
              );
              if (!originPlace) return null;
              return (
                <line
                  x1={originPlace.absX}
                  y1={originPlace.absY}
                  x2={cursor.x}
                  y2={cursor.y}
                  stroke={svgTokens.pendingAddLineStroke}
                  stroke-width={svgTokens.pendingAddLineWidth}
                  stroke-dasharray={svgTokens.pendingAddLineDasharray}
                  style={svgTokens.pointerEventsNone}
                />
              );
            })()}
            {circularFieldsWithPositions().map((cf) => (
              <g>
                {/* Hit area so circle interior and edge are selectable */}
                <circle
                  cx={cf.centerX}
                  cy={cf.centerY}
                  r={cf.radius}
                  fill="transparent"
                  stroke="none"
                />
                <circle
                  cx={cf.centerX}
                  cy={cf.centerY}
                  r={cf.radius}
                  fill="none"
                  stroke={
                    cf.id === selectedCircularFieldId()
                      ? svgTokens.placeSelectedStroke
                      : svgTokens.circularFieldScaffoldingStroke
                  }
                  stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                  stroke-dasharray={svgTokens.circularFieldScaffoldingDasharray}
                  style={svgTokens.pointerEventsNone}
                />
              </g>
            ))}
            {bendingFieldsWithPositions().map((bf) => {
              const gs = guideStep();
              const tc = transformChoice();
              const isSelectedBending =
                bf.id === selectedBendingCircularFieldId();
              const showBendingHandle =
                gs === 'execute' &&
                isSelectedBending &&
                (tc === 'modifyBendingCircularField' || tc === 'bendAtEnds');
              const bendingHandleSize = svgTokens.handleSize;
              return (
                <g>
                  <circle
                    cx={bf.centerX}
                    cy={bf.centerY}
                    r={bf.radius}
                    fill="none"
                    stroke={
                      isSelectedBending
                        ? svgTokens.placeSelectedStroke
                        : svgTokens.circularFieldScaffoldingStroke
                    }
                    stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                    stroke-dasharray={
                      svgTokens.circularFieldScaffoldingDasharray
                    }
                    style={svgTokens.pointerEventsNone}
                  />
                  <line
                    x1={bf.centerX}
                    y1={bf.centerY}
                    x2={bf.endX}
                    y2={bf.endY}
                    stroke={
                      isSelectedBending
                        ? svgTokens.placeSelectedStroke
                        : svgTokens.circularFieldScaffoldingStroke
                    }
                    stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                    stroke-dasharray={
                      svgTokens.circularFieldRadiusLineDasharray
                    }
                    style={svgTokens.pointerEventsNone}
                  />
                  {showBendingHandle && (
                    <rect
                      x={bf.centerX - bendingHandleSize / 2}
                      y={bf.centerY - bendingHandleSize / 2}
                      width={bendingHandleSize}
                      height={bendingHandleSize}
                      fill={svgTokens.handleFill}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                </g>
              );
            })}
            {(() => {
              const pac = pendingAddCircularField();
              if (pac?.stage !== 'editing') return null;
              const place = placesWithAbsolutePositions().find(
                (p) => p.id === pac.placeId,
              );
              const centerX = place?.absX ?? 0;
              const centerY = place?.absY ?? 0;
              const isDraggingThis =
                draggingCircularFieldRadius() === pac.circularFieldId;
              const dragPos = radiusHandleDragPosition();
              const angle = pac.radiusHandleAngle ?? 0;
              const handleX =
                isDraggingThis && dragPos
                  ? dragPos.x
                  : centerX + pac.radius * Math.cos(angle);
              const handleY =
                isDraggingThis && dragPos
                  ? dragPos.y
                  : centerY + pac.radius * Math.sin(angle);
              const addCfHandleSize = svgTokens.handleSize;
              return (
                <g>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={handleX}
                    y2={handleY}
                    stroke={svgTokens.circularFieldScaffoldingStroke}
                    stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                    stroke-dasharray={
                      svgTokens.circularFieldRadiusLineDasharray
                    }
                  />
                  {guideStep() === 'execute' && (
                    <rect
                      x={handleX - addCfHandleSize / 2}
                      y={handleY - addCfHandleSize / 2}
                      width={addCfHandleSize}
                      height={addCfHandleSize}
                      fill={svgTokens.handleFill}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={handleX}
                    y2={handleY}
                    stroke="transparent"
                    stroke-width={CIRCULAR_FIELD_RADIUS_HANDLE_THRESHOLD * 2}
                    style={svgTokens.cursorGrab}
                  />
                </g>
              );
            })()}
            {(() => {
              const pmc = pendingModifyCircularField();
              if (!pmc) return null;
              const cf = circularFieldsWithPositions().find(
                (c) => c.id === pmc.circularFieldId,
              );
              if (!cf) return null;
              const centerX = cf.centerX;
              const centerY = cf.centerY;
              const isDraggingThis =
                draggingCircularFieldRadius() === pmc.circularFieldId;
              const dragPos = radiusHandleDragPosition();
              const angle =
                pmc.radiusHandleAngle ?? cf.radiusHandleAngle ?? 0;
              const handleX =
                isDraggingThis && dragPos
                  ? dragPos.x
                  : centerX + pmc.radius * Math.cos(angle);
              const handleY =
                isDraggingThis && dragPos
                  ? dragPos.y
                  : centerY + pmc.radius * Math.sin(angle);
              const cfHandleSize = svgTokens.handleSize;
              return (
                <g>
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={handleX}
                    y2={handleY}
                    stroke={svgTokens.circularFieldScaffoldingStroke}
                    stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                    stroke-dasharray={
                      svgTokens.circularFieldRadiusLineDasharray
                    }
                  />
                  {guideStep() === 'execute' && (
                    <rect
                      x={handleX - cfHandleSize / 2}
                      y={handleY - cfHandleSize / 2}
                      width={cfHandleSize}
                      height={cfHandleSize}
                      fill={svgTokens.handleFill}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={handleX}
                    y2={handleY}
                    stroke="transparent"
                    stroke-width={CIRCULAR_FIELD_RADIUS_HANDLE_THRESHOLD * 2}
                    style={svgTokens.cursorGrab}
                  />
                </g>
              );
            })()}
            {relationshipSegments().map((seg, i) => {
              const dx = seg.to.x - seg.from.x;
              const dy = seg.to.y - seg.from.y;
              const beamDx = 0.4 * dx;
              const beamDy = 0.4 * dy;
              const len = Math.hypot(dx, dy);
              const hw = len > 0 ? 1 : 0;
              const ux = len > 0 ? -dy / len : 0;
              const uy = len > 0 ? dx / len : 0;
              const p1 = { x: -hw * ux, y: -hw * uy };
              const p2 = { x: hw * ux, y: hw * uy };
              const p3 = { x: beamDx + hw * ux, y: beamDy + hw * uy };
              const p4 = { x: beamDx - hw * ux, y: beamDy - hw * uy };
              const d = `M ${p1.x} ${p1.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p2.x} ${p2.y} Z`;
              const travelDx = 0.6 * dx;
              const travelDy = 0.6 * dy;
              return (
                <g
                  transform={`translate(${seg.from.x} ${seg.from.y})`}
                  style={svgTokens.pointerEventsNone}
                >
                  <defs>
                    <linearGradient
                      id={`laser-grad-${i}`}
                      gradientUnits="objectBoundingBox"
                      x1="0"
                      y1="0.5"
                      x2="1"
                      y2="0.5"
                    >
                      <stop
                        offset="0"
                        stop-color={svgTokens.laserGradientLeading}
                      />
                      <stop
                        offset="1"
                        stop-color={svgTokens.laserGradientTrailing}
                      />
                    </linearGradient>
                  </defs>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    additive="sum"
                    values={`0 0; ${travelDx} ${travelDy}`}
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                  <path d={d} fill={`url(#laser-grad-${i})`} />
                </g>
              );
            })}
            {displayPlaces().map((item) => {
              const sid = selectedPlaceId();
              const echoGroupIds = selectedEchoGroupPlaceIds();
              const isSelected =
                item.id !== 'pending' &&
                (item.id === sid || echoGroupIds.has(item.id as PlaceId));
              const rel = relatedPlaceIds();
              const isParent =
                item.id !== 'pending' &&
                rel.parentId !== null &&
                item.id === rel.parentId;
              const isChild =
                item.id !== 'pending' && rel.descendantIds.includes(item.id);
              const pid = pendingDeletePlaceId();
              const tc = transformChoice();
              const gs = guideStep();
              const isPendingDelete =
                item.id !== 'pending' &&
                item.id === pid &&
                tc === 'delete' &&
                (gs === 'execute' || gs === 'complete');
              const handlePlaceId = moveHandlePlaceId();
              const isHandlePlace =
                item.id !== 'pending' &&
                item.id === handlePlaceId &&
                gs === 'execute' &&
                (tc === 'move' ||
                  tc === 'modifyPlaceOnCircularRepeater' ||
                  tc === 'rotate' ||
                  tc === 'addRelated' ||
                  tc === 'delete');
              const isAddPlaceOnCircularFieldHandle =
                item.id === PENDING_CIRCULAR_FIELD_PLACE &&
                gs === 'execute' &&
                tc === 'addPlaceOnCircularField';
              const isAddPlaceOnAxisHandle =
                item.id === PENDING_AXIS_PLACE &&
                gs === 'execute' &&
                tc === 'addPlaceOnAxis';
              const isScaffolding = item.isScaffolding !== 0;
              const stroke = isSelected
                ? svgTokens.placeSelectedStroke
                : isScaffolding
                  ? svgTokens.placeScaffoldingStroke
                  : svgTokens.placeUnselectedStroke;
              const strokeWidth = isSelected
                ? svgTokens.placeSelectedStrokeWidth
                : isScaffolding
                  ? svgTokens.placeScaffoldingStrokeWidth
                  : svgTokens.placeUnselectedStrokeWidth;
              const placeDasharray = isScaffolding
                ? svgTokens.placeScaffoldingDasharray
                : undefined;
              const xSize = CROSSHAIR_SIZE + 6;
              const handleSize = svgTokens.handleSize;
              return (
                <g class="cursor-pointer">
                  {isPendingDelete && (
                    <>
                      <line
                        x1={item.x - xSize}
                        y1={item.y - xSize}
                        x2={item.x + xSize}
                        y2={item.y + xSize}
                        stroke={svgTokens.deletePlaceholderStroke}
                        stroke-width={svgTokens.deletePlaceholderStrokeWidth}
                      />
                      <line
                        x1={item.x - xSize}
                        y1={item.y + xSize}
                        x2={item.x + xSize}
                        y2={item.y - xSize}
                        stroke={svgTokens.deletePlaceholderStroke}
                        stroke-width={svgTokens.deletePlaceholderStrokeWidth}
                      />
                    </>
                  )}
                  <line
                    x1={item.x - CROSSHAIR_SIZE}
                    y1={item.y}
                    x2={item.x + CROSSHAIR_SIZE}
                    y2={item.y}
                    stroke={stroke}
                    stroke-width={strokeWidth}
                    stroke-dasharray={placeDasharray}
                  />
                  <line
                    x1={item.x}
                    y1={item.y - CROSSHAIR_SIZE}
                    x2={item.x}
                    y2={item.y + CROSSHAIR_SIZE}
                    stroke={stroke}
                    stroke-width={strokeWidth}
                    stroke-dasharray={placeDasharray}
                  />
                  {(isHandlePlace ||
                    isAddPlaceOnCircularFieldHandle ||
                    isAddPlaceOnAxisHandle) &&
                    !isPendingDelete && (
                      <rect
                        x={item.x - handleSize / 2}
                        y={item.y - handleSize / 2}
                        width={handleSize}
                        height={handleSize}
                        fill={svgTokens.handleFill}
                        style={svgTokens.pointerEventsNone}
                      />
                    )}
                  {isSelected && !isPendingDelete && !isHandlePlace && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke={svgTokens.placeSelectedStroke}
                      stroke-width={svgTokens.placeSelectedStrokeWidth}
                      stroke-dasharray={svgTokens.placeSelectedCircleDasharray}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                  {isParent && !isPendingDelete && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke={svgTokens.placeParentStroke}
                      stroke-width={svgTokens.placeUnselectedStrokeWidth}
                      stroke-dasharray={svgTokens.placeRelationCircleDasharray}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                  {isChild && !isPendingDelete && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke={svgTokens.placeChildStroke}
                      stroke-width={svgTokens.placeUnselectedStrokeWidth}
                      stroke-dasharray={svgTokens.placeRelationCircleDasharray}
                      style={svgTokens.pointerEventsNone}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {/* Right pane: Drawing DNA */}
      <div class={classes.paneDna}>
        <DrawingDNAPane
          selectedAxisId={selectedAxisId()}
          onSelectAxis={(id) => {
            batch(() => {
              setSelectedAxisId(id);
              setSelectedPlaceId(null);
              setSelectedLineSegmentId(null);
              setSelectedCircularFieldId(null);
              setSelectedBendingCircularFieldId(null);
              setSelectedCircularRepeaterId(null);
              setHasDrawingPaneSelected(false);
              setGuideStep('transform');
            });
          }}
          selectedCircularRepeaterId={selectedCircularRepeaterId()}
          onSelectRepeater={(id) => {
            batch(() => {
              setSelectedCircularRepeaterId(id);
              setSelectedPlaceId(null);
              setSelectedLineSegmentId(null);
              setSelectedCircularFieldId(null);
              setSelectedBendingCircularFieldId(null);
              setSelectedAxisId(null);
              setHasDrawingPaneSelected(false);
              setGuideStep('transform');
            });
          }}
        />
      </div>
    </div>
  );
};

export default App;
