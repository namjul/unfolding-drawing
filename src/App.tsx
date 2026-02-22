import { createEventListener } from '@solid-primitives/event-listener';
import { createShortcut } from '@solid-primitives/keyboard';
import { createPerPointerListeners } from '@solid-primitives/pointer';
import { batch, type Component, createMemo, createSignal } from 'solid-js';
import type { GuideStep, TransformChoice } from './components/DrawingGuide';
import DrawingGuide from './components/DrawingGuide';
import DrawingObjectsList from './components/DrawingObjectsList';
import TransformationsList from './components/TransformationsList';
import ViewControls from './components/ViewControls';
import {
  getRelatedPlaceIds,
  getRelationshipSegments,
} from './lib/drawingRelations';
import {
  allPlacesQuery,
  allTransformationsQuery,
  type PlaceId,
  useEvolu,
} from './lib/evolu-db';
import {
  availableTransforms as getAvailableTransforms,
  getSelectionType,
} from './lib/transform-matrix';
import { useQuery } from './lib/useQuery';

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
  const [transformChoice, setTransformChoice] =
    createSignal<TransformChoice>(null);
  const [hasDrawingPaneSelected, setHasDrawingPaneSelected] =
    createSignal(false);

  const availableTransformsList = createMemo(() => {
    const selectionType = getSelectionType(
      hasDrawingPaneSelected(),
      selectedPlaceId(),
    );
    return getAvailableTransforms(selectionType);
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

  const places = () => placesRows();

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
      const baseAngle =
        angleOverride?.placeId === place.id
          ? angleOverride.angle
          : (place.angle ?? 0);
      return { x: moveOverride.x, y: moveOverride.y, worldAngle: baseAngle };
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
    return {
      x: parentRes.x + rotated.x,
      y: parentRes.y + rotated.y,
      worldAngle: parentWorldAngle + placeEffectiveAngle,
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
      return { ...p, absX: abs.x, absY: abs.y };
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

    if (gs === 'select') {
      if (hit) {
        setSelectedPlaceId(hit.id);
        setHasDrawingPaneSelected(false);
      } else {
        setSelectedPlaceId(null);
        setHasDrawingPaneSelected(true);
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

    if (gs === 'execute' && tc === 'move' && hit) {
      if (hit.id === selectedPlaceId()) {
        setPendingMove({
          placeId: hit.id,
          x: hit.absX,
          y: hit.absY,
        });
      }
    }

    if (gs === 'execute' && tc === 'rotate') {
      const selId = selectedPlaceId();
      if (selId) {
        const place = placesWithAbsolutePositions().find((p) => p.id === selId);
        if (place) {
          const theta = pendingRotate()?.angle ?? place.angle ?? 0;
          if (isPointNearAxis(cx, cy, place.absX, place.absY, theta)) {
            setPendingRotate({
              placeId: selId,
              angle: theta,
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
    if (pm && guideStep() === 'execute' && mode() === 'default') {
      const { x: cx, y: cy } = screenToCanvas(e.clientX, e.clientY);
      if (pm.placeId === 'pending' && pa) {
        setPendingAdd({ ...pa, x: cx, y: cy });
        setPendingMove({ placeId: 'pending', x: cx, y: cy });
      } else if (transformChoice() === 'move') {
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
  };

  const handlePointerUp = () => {
    // No auto-advance; user clicks Continue to go to Complete
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
      setSelectedPlaceId(null);
      setHasDrawingPaneSelected(false);
    });
  };

  const handleTransformChoice = (choice: TransformChoice) => {
    setTransformChoice(choice);
  };

  const handleStepTransformToExecute = () => {
    const choice = transformChoice();
    if (choice === 'delete' && selectedPlaceId()) {
      setPendingDeletePlaceId(selectedPlaceId());
    }
    setGuideStep('execute');
  };

  const handleStepExecuteToComplete = () => {
    setGuideStep('complete');
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
      const r = evolu.insert('place', {
        parentId: add.parentId,
        x,
        y,
      });
      if (r.ok) {
        insertedPlaceId = r.value.id;
        evolu.insert('transformation', {
          kind: 'add',
          placeId: r.value.id,
          parentId: add.parentId,
          x,
          y,
        });
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
        evolu.insert('transformation', {
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
      evolu.insert('transformation', {
        kind: 'delete',
        placeId: del,
        parentId: null,
        x: null,
        y: null,
      });
      setPendingDeletePlaceId(null);
    }

    if (rot) {
      evolu.update('place', { id: rot.placeId, angle: rot.angle });
      evolu.insert('transformation', {
        kind: 'rotate',
        placeId: rot.placeId,
        parentId: null,
        x: null,
        y: null,
        angle: rot.angle,
      });
      setPendingRotate(null);
    }

    resetGuide();
  };

  const handleReject = () => {
    resetGuide();
  };

  const resetDrawing = () => {
    for (const p of places()) {
      evolu.update('place', { id: p.id, isDeleted: true });
    }
    for (const t of transformationsRows()) {
      evolu.update('transformation', { id: t.id, isDeleted: true });
    }
    resetGuide();
    resetZoom();
  };

  const displayPlaces = () => {
    const result: Array<{ id: PlaceId | 'pending'; x: number; y: number }> = [];
    const pm = pendingMove();
    const pa = pendingAdd();
    const placesData = placesWithAbsolutePositions();

    for (const p of placesData) {
      const overridden = pm && pm.placeId === p.id;
      result.push({
        id: p.id,
        x: overridden ? pm.x : p.absX,
        y: overridden ? pm.y : p.absY,
      });
    }
    if (pa) {
      result.push({
        id: 'pending',
        x: pa.x,
        y: pa.y,
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
        const shouldDrag =
          (pm &&
            gs === 'execute' &&
            (tc === 'move' ||
              ((tc === 'add' || tc === 'addRelated') &&
                pm.placeId === 'pending'))) ||
          (pr && gs === 'execute' && tc === 'rotate');
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
    <div class="flex gap-2 h-screen p-2 *:min-w-0">
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">
        <ViewControls
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
      <div
        class={`p-2 basis-1/5 grow min-h-0 flex flex-col ${
          hasDrawingPaneSelected() && guideStep() === 'select'
            ? 'ring-2 ring-sky-500 ring-inset rounded'
            : ''
        }`}
      >
        <svg
          ref={svg}
          xmlns="http://www.w3.org/2000/svg"
          class={`flex-1 min-h-0 w-full bg-sky-50 touch-none ${cursorClass()}`}
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
                const theta = pendingRotate()?.angle ?? place.angle ?? 0;
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
                      stroke="black"
                      stroke-width={2}
                      stroke-dasharray="6 3"
                      style={{ 'pointer-events': 'none' }}
                    />
                    <path
                      d={arrowD}
                      fill="black"
                      style={{ 'pointer-events': 'none' }}
                    />
                    <line
                      x1={cx}
                      y1={cy}
                      x2={ex}
                      y2={ey}
                      stroke="transparent"
                      stroke-width={72}
                      style={{ cursor: 'grab' }}
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
                  style={{ 'pointer-events': 'none' }}
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
                      <stop offset="0" stop-color="#0ea5e9" />
                      <stop offset="1" stop-color="#f0f9ff" />
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
              const stroke = isSelected ? 'darkorange' : 'coral';
              const strokeWidth = isSelected ? 3 : 2;
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
                        stroke="red"
                        stroke-width={3}
                      />
                      <line
                        x1={item.x - xSize}
                        y1={item.y + xSize}
                        x2={item.x + xSize}
                        y2={item.y - xSize}
                        stroke="red"
                        stroke-width={3}
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
                  />
                  <line
                    x1={item.x}
                    y1={item.y - CROSSHAIR_SIZE}
                    x2={item.x}
                    y2={item.y + CROSSHAIR_SIZE}
                    stroke={stroke}
                    stroke-width={strokeWidth}
                  />
                  {isSelected && !isPendingDelete && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke="darkorange"
                      stroke-width={3}
                      stroke-dasharray="6 3"
                      style={{ 'pointer-events': 'none' }}
                    />
                  )}
                  {isParent && !isPendingDelete && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke="#0ea5e9"
                      stroke-width={2}
                      stroke-dasharray="4 4"
                      style={{ 'pointer-events': 'none' }}
                    />
                  )}
                  {isChild && !isPendingDelete && (
                    <circle
                      cx={item.x}
                      cy={item.y}
                      r={CROSSHAIR_SIZE + 6}
                      fill="none"
                      stroke="#10b981"
                      stroke-width={2}
                      stroke-dasharray="4 4"
                      style={{ 'pointer-events': 'none' }}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50 flex flex-col gap-4 overflow-auto">
        <DrawingGuide
          step={guideStep}
          selectedPlaceId={selectedPlaceId()}
          transformChoice={transformChoice()}
          onStepObserve={resetGuide}
          onStepSelect={() => setGuideStep('select')}
          onStepSelectToTransform={() => setGuideStep('transform')}
          onStepTransformToExecute={handleStepTransformToExecute}
          onStepExecuteToComplete={handleStepExecuteToComplete}
          onSelectCanvas={() => {
            setHasDrawingPaneSelected(true);
            setSelectedPlaceId(null);
          }}
          onTransformChoice={handleTransformChoice}
          onCommit={handleCommit}
          onReject={handleReject}
          onReset={resetGuide}
          hasDrawingPaneSelected={hasDrawingPaneSelected()}
          pendingAdd={!!pendingAdd()}
          pendingMove={!!pendingMove()}
          pendingRotate={!!pendingRotate()}
          availableTransforms={availableTransformsList()}
        />
        <hr class="border-sky-300" />
        <DrawingObjectsList />
        <TransformationsList />
      </div>
    </div>
  );
};

export default App;
