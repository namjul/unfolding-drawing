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
  type BendCircle,
  buildBentSegmentPath,
  distanceFromPointToBentPath,
} from './lib/bentSegmentPath';
import {
  getRelatedPlaceIds,
  getRelationshipSegments,
} from './lib/drawingRelations';
import {
  allBendingCircularFieldsQuery,
  allCircularFieldsQuery,
  allLineSegmentEndsQuery,
  allLineSegmentsQuery,
  allPlacesQuery,
  allTransformationsQuery,
  type BendingCircularFieldId,
  type CircularFieldId,
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

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;
const WHEEL_SCALE_FACTOR = 0.01;
const PINCH_SCALE_FACTOR = 0.01;

type Mode = 'default' | 'pan';

const PLACE_RADIUS = 8;
const CROSSHAIR_SIZE = 10;

const App: Component = () => {
  const evolu = useEvolu();
  const placesRows = useQuery(allPlacesQuery);
  const transformationsRows = useQuery(allTransformationsQuery);
  const lineSegmentEndsRows = useQuery(allLineSegmentEndsQuery);
  const lineSegmentsRows = useQuery(allLineSegmentsQuery);
  const circularFieldsRows = useQuery(allCircularFieldsQuery);
  const bendingCircularFieldsRows = useQuery(allBendingCircularFieldsQuery);
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

  const availableTransformsList = createMemo(() => {
    const selectionType = getSelectionType(
      hasDrawingPaneSelected(),
      selectedPlaceId(),
      selectedLineSegmentId(),
      selectedCircularFieldId(),
      selectedBendingCircularFieldId(),
    );
    const list = getAvailableTransforms(selectionType);
    if (selectionType !== 'circularField') return list;
    const cfId = selectedCircularFieldId();
    return list.filter(
      (t) => t.id !== 'moveCircularField' || isCircularFieldOnlyChild(cfId),
    );
  });

  const [bendAtEndsDirty, setBendAtEndsDirty] = createSignal(false);

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
        if (bendAtA) {
          evolu.update('bendingCircularField', {
            id: bendAtA.id,
            isDeleted: true,
          });
        } else {
          const { offsetX, offsetY } = offsetForEndA();
          evolu.insert('bendingCircularField', {
            lineSegmentEndId: endAId,
            radius,
            offsetX,
            offsetY,
          });
        }
        setBendAtEndsDirty(true);
      },
      onToggleBendAtB: () => {
        if (bendAtB) {
          evolu.update('bendingCircularField', {
            id: bendAtB.id,
            isDeleted: true,
          });
        } else {
          const { offsetX, offsetY } = offsetForEndB();
          evolu.insert('bendingCircularField', {
            lineSegmentEndId: endBId,
            radius,
            offsetX,
            offsetY,
          });
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
        isNewPlace: boolean;
      };
  const [pendingAddCircularField, setPendingAddCircularField] =
    createSignal<PendingAddCircularField | null>(null);
  const [pendingModifyCircularField, setPendingModifyCircularField] =
    createSignal<{
      circularFieldId: CircularFieldId;
      placeId: PlaceId;
      radius: number;
    } | null>(null);
  const [pendingDeleteCircularFieldId, setPendingDeleteCircularFieldId] =
    createSignal<CircularFieldId | null>(null);
  const [draggingCircularFieldRadius, setDraggingCircularFieldRadius] =
    createSignal<CircularFieldId | null>(null);
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

  const places = () => placesRows();
  const lineSegmentEnds = () => lineSegmentEndsRows();
  const lineSegments = () => lineSegmentsRows();
  const circularFields = () => circularFieldsRows();
  const bendingCircularFields = () => bendingCircularFieldsRows();

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
        setGuideStep('transform');
      });
    }
  });

  function nextPlaceName(
    placesList: ReadonlyArray<{ name: string | null }>,
  ): string {
    const placeNumPattern = /^Place (\d+)$/;
    let max = 0;
    for (const p of placesList) {
      const name = p.name?.trim();
      if (!name) continue;
      const m = placeNumPattern.exec(name);
      if (m && m[1] != null) max = Math.max(max, Number.parseInt(m[1], 10));
    }
    return `Place ${max + 1}`;
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
    x: number | null;
    y: number | null;
    angle?: number | null;
  };

  const rotateBy = (angle: number, dx: number, dy: number) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  };

  const getAbsolutePosition = (
    place: PlaceLike,
    placesList: ReadonlyArray<PlaceLike>,
    moveOverride?: {
      placeId: PlaceId | 'pending';
      x: number;
      y: number;
    } | null,
    angleOverride?: { placeId: PlaceId; angle: number } | null,
  ): { x: number; y: number; worldAngle: number } => {
    if (moveOverride && place.id === moveOverride.placeId) {
      const localAngle = place.angle ?? 0;
      let worldAngle = localAngle;
      if (place.parentId !== null) {
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
      return { x: moveOverride.x, y: moveOverride.y, worldAngle };
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

  const placesWithAbsolutePositions = () => {
    const pl = places();
    const pm = pendingMove();
    const pr = pendingRotate();
    const moveOverride =
      pm && pm.placeId !== 'pending'
        ? { placeId: pm.placeId, x: pm.x, y: pm.y }
        : null;
    const angleOverride = pr ? { placeId: pr.placeId, angle: pr.angle } : null;
    return pl.map((p) => {
      const abs = getAbsolutePosition(p, pl, moveOverride, angleOverride);
      return { ...p, absX: abs.x, absY: abs.y, absWorldAngle: abs.worldAngle };
    });
  };

  const relatedPlaceIds = createMemo(() =>
    getRelatedPlaceIds(selectedPlaceId(), places()),
  );

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
    placesWithAbsolutePositions().find((p) => isPlaceAt(cx, cy, p));

  const lineSegmentsWithPositions = (): LineSegmentWithPositions[] => {
    const pl = places();
    const ends = lineSegmentEnds();
    const segs = lineSegments();
    const pm = pendingMove();
    const pr = pendingRotate();
    const moveOverride =
      pm && pm.placeId !== 'pending'
        ? { placeId: pm.placeId, x: pm.x, y: pm.y }
        : null;
    const angleOverride = pr ? { placeId: pr.placeId, angle: pr.angle } : null;
    const getPlaceAbs = (placeId: PlaceId) => {
      const place = pl.find((p) => p.id === placeId);
      if (!place) return null;
      const abs = getAbsolutePosition(place, pl, moveOverride, angleOverride);
      return { x: abs.x, y: abs.y };
    };
    return segs
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

  const isPointNearRadiusHandle = (
    px: number,
    py: number,
    centerX: number,
    centerY: number,
    radius: number,
    threshold = CIRCULAR_FIELD_RADIUS_HANDLE_THRESHOLD,
  ) => Math.hypot(px - (centerX + radius), py - centerY) <= threshold;

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

  const ORIENTATION_AXIS_LENGTH = 120;
  const isPointNearAxis = (
    px: number,
    py: number,
    cx: number,
    cy: number,
    angle: number,
    threshold = 36,
  ) => {
    const ex = cx + ORIENTATION_AXIS_LENGTH * Math.sin(angle);
    const ey = cy - ORIENTATION_AXIS_LENGTH * Math.cos(angle);
    const dx = ex - cx;
    const dy = ey - cy;
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
        setHasDrawingPaneSelected(false);
      } else {
        const lineHit = findLineSegmentAtCursor(cx, cy);
        if (lineHit) {
          setSelectedLineSegmentId(lineHit);
          setSelectedPlaceId(null);
          setSelectedCircularFieldId(null);
          setSelectedBendingCircularFieldId(null);
          setHasDrawingPaneSelected(false);
        } else {
          const cfHit = findCircularFieldAt(cx, cy);
          if (cfHit) {
            setSelectedCircularFieldId(cfHit);
            setSelectedPlaceId(null);
            setSelectedLineSegmentId(null);
            setSelectedBendingCircularFieldId(null);
            setHasDrawingPaneSelected(false);
          } else {
            const bfHit = findBendingCircularFieldAt(cx, cy);
            if (bfHit) {
              setSelectedBendingCircularFieldId(bfHit);
              setSelectedPlaceId(null);
              setSelectedLineSegmentId(null);
              setSelectedCircularFieldId(null);
              setHasDrawingPaneSelected(false);
            } else {
              setSelectedPlaceId(null);
              setSelectedLineSegmentId(null);
              setSelectedCircularFieldId(null);
              setSelectedBendingCircularFieldId(null);
              setHasDrawingPaneSelected(true);
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

    if (gs === 'execute' && tc === 'move' && hit) {
      if (hit.id === selectedPlaceId()) {
        setPendingMove({
          placeId: hit.id,
          x: hit.absX,
          y: hit.absY,
        });
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

    if (gs === 'execute' && tc === 'moveBendingCircularField') {
      const bfId = selectedBendingCircularFieldId();
      if (bfId) {
        const bf = bendingFieldsWithPositions().find((b) => b.id === bfId);
        if (bf) {
          const dist = Math.hypot(cx - bf.centerX, cy - bf.centerY);
          if (dist <= bf.radius + BENDING_FIELD_HIT_THRESHOLD) {
            setPendingMoveBendingCircularField(bfId);
          }
        }
      }
    }

    if (gs === 'execute' && tc === 'modifyBendingCircularField') {
      const bfId = selectedBendingCircularFieldId();
      if (bfId) {
        const bf = bendingFieldsWithPositions().find((b) => b.id === bfId);
        if (
          bf &&
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
      }
    }

    if (gs === 'execute' && tc === 'rotate') {
      const selId = selectedPlaceId();
      if (selId) {
        const place = placesWithAbsolutePositions().find((p) => p.id === selId);
        if (place) {
          const theta = pendingRotate()?.angle ?? place.absWorldAngle ?? 0;
          if (isPointNearAxis(cx, cy, place.absX, place.absY, theta)) {
            setPendingRotate({
              placeId: selId,
              angle: theta,
            });
          }
        }
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
    if (pm && guideStep() === 'execute' && mode() === 'default') {
      if (pm.placeId === 'pending' && pa) {
        setPendingAdd({ ...pa, x: cx, y: cy });
        setPendingMove({ placeId: 'pending', x: cx, y: cy });
      } else if (
        transformChoice() === 'move' ||
        transformChoice() === 'moveCircularField' ||
        transformChoice() === 'addLine' ||
        (transformChoice() === 'addCircularField' &&
          pac?.stage === 'editing' &&
          pac.isNewPlace &&
          pm.placeId === pac.placeId)
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
        const angle = Math.atan2(cx - place.absX, place.absY - cy);
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
        evolu.update('circularField', { id: draggingCf, radius });
        setPendingAddCircularField({ ...pac, radius });
      } else if (pmc && pmc.circularFieldId === draggingCf) {
        const place = placesWithAbsolutePositions().find(
          (p) => p.id === pmc.placeId,
        );
        const centerX = place?.absX ?? 0;
        const centerY = place?.absY ?? 0;
        const dist = Math.hypot(cx - centerX, cy - centerY);
        const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, dist);
        evolu.update('circularField', { id: draggingCf, radius });
        setPendingModifyCircularField({ ...pmc, radius });
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
    }
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
      setSelectedPlaceId(null);
      setSelectedLineSegmentId(null);
      setSelectedCircularFieldId(null);
      setSelectedBendingCircularFieldId(null);
      setHasDrawingPaneSelected(false);
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
    if (choice === 'addCircularField') {
      if (hasDrawingPaneSelected()) {
        setPendingAddCircularField({ stage: 'placing' });
      } else {
        const placeId = selectedPlaceId();
        if (placeId) {
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
    setSelectedPlaceId(null);
    setSelectedLineSegmentId(null);
    setSelectedCircularFieldId(null);
    setSelectedBendingCircularFieldId(null);
    setHasDrawingPaneSelected(false);
  };

  const handleCancelSelection = () => {
    setSelectedPlaceId(null);
    setSelectedLineSegmentId(null);
    setSelectedCircularFieldId(null);
    setSelectedBendingCircularFieldId(null);
    setHasDrawingPaneSelected(false);
    setTransformChoice(null);
    setGuideStep('select');
  };

  const handleCommit = () => {
    const add = pendingAdd();
    const move = pendingMove();
    const rot = pendingRotate();
    const del = pendingDeletePlaceId();
    const placesList = places();

    let insertedPlaceId: PlaceId | null = null;
    if (add) {
      let x = add.x;
      let y = add.y;
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
        }
      }
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
      setPendingAdd(null);
    }

    if (move) {
      const placeId =
        move.placeId === 'pending' ? insertedPlaceId : move.placeId;
      if (placeId) {
        const place = placesList.find((p) => p.id === placeId);
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
        evolu.update('place', {
          id: placeId,
          x,
          y,
        });
        recordTransformation({
          kind: 'move',
          placeId,
          parentId: parentIdForMove,
          x,
          y,
        });
      }
      setPendingMove(null);
    }

    if (del) {
      evolu.update('place', { id: del, isDeleted: true });
      recordTransformation({ kind: 'delete', placeId: del });
      setPendingDeletePlaceId(null);
    }

    if (rot) {
      const rotatedPlace = placesList.find((p) => p.id === rot.placeId);
      let storedAngle = rot.angle;
      if (rotatedPlace?.parentId) {
        const parent = placesList.find((p) => p.id === rotatedPlace.parentId);
        if (parent) {
          const parentRes = getAbsolutePosition(parent, placesList);
          storedAngle = rot.angle - parentRes.worldAngle;
        }
      }
      evolu.update('place', { id: rot.placeId, angle: storedAngle });
      recordTransformation({
        kind: 'rotate',
        placeId: rot.placeId,
        angle: storedAngle,
      });
      setPendingRotate(null);
    }

    const delLine = pendingDeleteLineId();
    if (delLine) {
      const seg = lineSegments().find((s) => s.id === delLine);
      if (seg && seg.endAId != null && seg.endBId != null) {
        const endA = lineSegmentEnds().find((e) => e.id === seg.endAId);
        const placeIdForDelete =
          endA?.placeId ??
          lineSegmentEnds().find((e) => e.id === seg.endBId)?.placeId;
        if (placeIdForDelete != null) {
          recordTransformation({
            kind: 'deleteLine',
            placeId: placeIdForDelete,
            lineSegmentId: delLine,
          });
        }
        evolu.update('lineSegment', { id: delLine, isDeleted: true });
        evolu.update('lineSegmentEnd', { id: seg.endAId, isDeleted: true });
        evolu.update('lineSegmentEnd', { id: seg.endBId, isDeleted: true });
      }
      setPendingDeleteLineId(null);
    }

    const pac = pendingAddCircularField();
    if (pac?.stage === 'editing') {
      evolu.update('circularField', {
        id: pac.circularFieldId,
        radius: pac.radius,
      });
      if (pac.isNewPlace) {
        const move = pendingMove();
        const place = placesList.find((p) => p.id === pac.placeId);
        const finalX = move?.placeId === pac.placeId ? move.x : (place?.x ?? 0);
        const finalY = move?.placeId === pac.placeId ? move.y : (place?.y ?? 0);
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
      setPendingAddCircularField(null);
    }

    const pmc = pendingModifyCircularField();
    if (pmc) {
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

    setPendingMoveBendingCircularField(null);
    const pdbId = pendingDeleteBendingCircularFieldId();
    if (pdbId) {
      evolu.update('bendingCircularField', { id: pdbId, isDeleted: true });
      setPendingDeleteBendingCircularFieldId(null);
    }

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
      const pal = pendingAddLine();
      if (
        pal &&
        guideStep() === 'execute' &&
        transformChoice() === 'addLine' &&
        mode() === 'default'
      ) {
        const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
        setPendingAddLine({ ...pal, cursorX: cx, cursorY: cy });
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
              tc === 'moveCircularField' ||
              tc === 'addLine' ||
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
            tc === 'moveBendingCircularField') ||
          (draggingBendingCircularFieldRadius() != null &&
            gs === 'execute' &&
            tc === 'modifyBendingCircularField');
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
            setGuideStep('transform');
          }}
          onTransformChoice={handleTransformChoice}
          onCommit={handleCommit}
          onReject={handleReject}
          onReset={resetGuide}
          hasDrawingPaneSelected={hasDrawingPaneSelected()}
          pendingAdd={!!pendingAdd()}
          pendingMove={!!pendingMove()}
          pendingRotate={!!pendingRotate()}
          pendingAddLine={!!pendingAddLine()}
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
          bendAtEndsState={bendAtEndsState()}
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
                const place = placesWithAbsolutePositions().find(
                  (p) => p.id === selectedPlaceId(),
                );
                if (!place) return null;
                const theta =
                  pendingRotate()?.angle ?? place.absWorldAngle ?? 0;
                const cx = place.absX;
                const cy = place.absY;
                const ex = cx + ORIENTATION_AXIS_LENGTH * Math.sin(theta);
                const ey = cy - ORIENTATION_AXIS_LENGTH * Math.cos(theta);
                const arrowSize = 18;
                const baseX = ex - arrowSize * Math.sin(theta);
                const baseY = ey + arrowSize * Math.cos(theta);
                const perp = 0.5 * arrowSize;
                const leftX = baseX + perp * Math.cos(theta);
                const leftY = baseY + perp * Math.sin(theta);
                const rightX = baseX - perp * Math.cos(theta);
                const rightY = baseY - perp * Math.sin(theta);
                const arrowD = `M ${ex} ${ey} L ${leftX} ${leftY} L ${rightX} ${rightY} Z`;
                return (
                  <g>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={ex}
                      y2={ey}
                      stroke={svgTokens.orientationAxisStroke}
                      stroke-width={svgTokens.orientationAxisStrokeWidth}
                      stroke-dasharray={svgTokens.orientationAxisDasharray}
                      style={svgTokens.pointerEventsNone}
                    />
                    <path
                      d={arrowD}
                      fill={svgTokens.orientationAxisFill}
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
                  </g>
                );
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
                  <g class="cursor-pointer">
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
            {bendingFieldsWithPositions().map((bf) => (
              <g>
                <circle
                  cx={bf.centerX}
                  cy={bf.centerY}
                  r={bf.radius}
                  fill="none"
                  stroke={
                    bf.id === selectedBendingCircularFieldId()
                      ? svgTokens.placeSelectedStroke
                      : svgTokens.circularFieldScaffoldingStroke
                  }
                  stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                  stroke-dasharray={svgTokens.circularFieldScaffoldingDasharray}
                  style={svgTokens.pointerEventsNone}
                />
                <line
                  x1={bf.centerX}
                  y1={bf.centerY}
                  x2={bf.endX}
                  y2={bf.endY}
                  stroke={
                    bf.id === selectedBendingCircularFieldId()
                      ? svgTokens.placeSelectedStroke
                      : svgTokens.circularFieldScaffoldingStroke
                  }
                  stroke-width={svgTokens.circularFieldScaffoldingStrokeWidth}
                  stroke-dasharray={svgTokens.circularFieldRadiusLineDasharray}
                  style={svgTokens.pointerEventsNone}
                />
              </g>
            ))}
            {(() => {
              const pac = pendingAddCircularField();
              if (pac?.stage !== 'editing') return null;
              const place = placesWithAbsolutePositions().find(
                (p) => p.id === pac.placeId,
              );
              const centerX = place?.absX ?? 0;
              const centerY = place?.absY ?? 0;
              const handleX = centerX + pac.radius;
              const handleY = centerY;
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
              const handleX = centerX + pmc.radius;
              const handleY = centerY;
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
              const rel = relatedPlaceIds();
              const isSelected = item.id !== 'pending' && item.id === sid;
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
                  {isSelected && !isPendingDelete && (
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
        <DrawingDNAPane />
      </div>
    </div>
  );
};

export default App;
