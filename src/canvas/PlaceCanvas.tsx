import CanvasKitInit, {
  type Canvas,
  type CanvasKit,
  type Paint,
  type Surface,
} from 'canvaskit-wasm';
import canvaskitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import type { Accessor, Setter } from 'solid-js';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from 'solid-js';
import type {
  AwaitingTransformationTarget,
  DisplayPlace,
  PendingTransformationState,
  SelectionTarget,
} from '../drawing/types';
import type { PlaceId } from '../lib/evolu-db';
import { hitTestPlace } from './hitTest';
import { buildPlaceMap, getSubtreePlaceIds } from './parent-objects';
import { getPlaceLabel } from './scene';
import { screenToWorld, type Viewport, zoomViewportAt } from './viewport';

interface PaintSet {
  canvasGrid: Paint;
  draftPlace: Paint;
  hoverRing: Paint;
  place: Paint;
  selectedRing: Paint;
  stagedDelete: Paint;
  canvasSelectionBorder: Paint;
  relationshipLine: Paint;
  relationshipLineHighlight: Paint;
}

interface CanvasRuntime {
  canvasKit: CanvasKit;
  paints: PaintSet;
  surface: Surface;
}

interface PlaceCanvasProps {
  hoveredPlaceId: Accessor<string | null>;
  onSelectPlace: (target: SelectionTarget) => void;
  onStageAddPlace: (x: number, y: number) => boolean;
  onStageAddRelatedPlace: (x: number, y: number) => boolean;
  onStageMovePlace: (placeId: PlaceId, x: number, y: number) => boolean;
  onSurfaceSizeChange: Setter<{ width: number; height: number }>;
  onUpdateHoverPlace: Setter<string | null>;
  onUpdateMovePlace: (x: number, y: number) => void;
  pendingTransformation: Accessor<PendingTransformationState>;
  places: Accessor<ReadonlyArray<DisplayPlace>>;
  selectedPlaceId: Accessor<string | null>;
  selectionTarget: Accessor<SelectionTarget>;
  awaitingTransformationTarget: Accessor<AwaitingTransformationTarget>;
  onClearAwaitingTransformation: () => void;
  setViewport: Setter<Viewport>;
  viewport: Accessor<Viewport>;
}

const backgroundColor: number[] = [1, 1, 1, 1];
const wheelScaleFactor = 1.0015;
const dragThreshold = 4;

const PlaceCanvas = (props: PlaceCanvasProps) => {
  let canvasElement: HTMLCanvasElement | undefined;
  let viewportHost: HTMLDivElement | undefined;

  let runtime: CanvasRuntime | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let drawFrameId: number | null = null;
  let drawQueued = false;
  let canvasKitPromise: Promise<CanvasKit> | null = null;
  let activePointerId: number | null = null;
  let isSpaceHeld = false;
  let dragDistance = 0;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let panOrigin: Viewport | null = null;
  let activeDragMode: 'pan' | 'move' | 'idle' = 'idle';
  let moveCandidateId: PlaceId | null = null;
  const moveOffset = { x: 0, y: 0 };
  let dashPhase = 0; // Animation phase for relationship line dash effect

  const [status, setStatus] = createSignal('Loading CanvasKit...');
  const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 });

  const visibleLabels = createMemo(() => {
    const currentViewport = props.viewport();
    const size = canvasSize();

    return props
      .places()
      .map((place, index) => ({
        id: place.id,
        label: getPlaceLabel(place, index),
        left: place.x * currentViewport.scale + currentViewport.x,
        top: place.y * currentViewport.scale + currentViewport.y,
      }))
      .filter(
        (label) =>
          label.left >= -80 &&
          label.left <= size.width + 80 &&
          label.top >= -40 &&
          label.top <= size.height + 40,
      );
  });

  const queueDraw = () => {
    if (!runtime || drawQueued) {
      return;
    }

    const activeRuntime = runtime;
    drawQueued = true;
    drawFrameId = window.requestAnimationFrame((timestamp) => {
      drawFrameId = null;
      drawQueued = false;

      if (runtime !== activeRuntime) {
        return;
      }

      // Update dash animation phase (50px per second)
      dashPhase = (timestamp / 1000) * 50;

      drawScene(activeRuntime.surface.getCanvas());
      activeRuntime.surface.flush();

      // Continue animation loop if a place is selected (relation lines need animation)
      const selectedPlaceId = props.selectedPlaceId();
      if (selectedPlaceId) {
        queueDraw();
      }
    });
  };

  const deleteRuntime = () => {
    if (!runtime) {
      return;
    }

    if (drawFrameId !== null) {
      window.cancelAnimationFrame(drawFrameId);
      drawFrameId = null;
    }

    drawQueued = false;
    runtime.surface.delete();
    runtime.paints.canvasGrid.delete();
    runtime.paints.draftPlace.delete();
    runtime.paints.hoverRing.delete();
    runtime.paints.place.delete();
    runtime.paints.selectedRing.delete();
    runtime.paints.stagedDelete.delete();
    runtime.paints.canvasSelectionBorder.delete();
    runtime.paints.relationshipLine.delete();
    runtime.paints.relationshipLineHighlight.delete();
    runtime = null;
  };

  const createPaints = (canvasKit: CanvasKit): PaintSet => {
    const canvasGrid = new canvasKit.Paint();
    canvasGrid.setAntiAlias(true);
    canvasGrid.setStyle(canvasKit.PaintStyle.Stroke);
    canvasGrid.setColor(canvasKit.Color(71, 85, 105, 40 / 255));

    const place = new canvasKit.Paint();
    place.setAntiAlias(true);
    place.setStyle(canvasKit.PaintStyle.Fill);
    place.setColor(canvasKit.Color(226, 232, 240, 1));

    const draftPlace = new canvasKit.Paint();
    draftPlace.setAntiAlias(true);
    draftPlace.setStyle(canvasKit.PaintStyle.Fill);
    draftPlace.setColor(canvasKit.Color(251, 191, 36, 0.95));

    const stagedDelete = new canvasKit.Paint();
    stagedDelete.setAntiAlias(true);
    stagedDelete.setStyle(canvasKit.PaintStyle.Fill);
    stagedDelete.setColor(canvasKit.Color(239, 68, 68, 0.55));

    const hoverRing = new canvasKit.Paint();
    hoverRing.setAntiAlias(true);
    hoverRing.setStyle(canvasKit.PaintStyle.Stroke);
    hoverRing.setColor(canvasKit.Color(56, 189, 248, 1));

    const selectedRing = new canvasKit.Paint();
    selectedRing.setAntiAlias(true);
    selectedRing.setStyle(canvasKit.PaintStyle.Stroke);
    selectedRing.setColor(canvasKit.Color(248, 113, 113, 1));

    const canvasSelectionBorder = new canvasKit.Paint();
    canvasSelectionBorder.setAntiAlias(true);
    canvasSelectionBorder.setStyle(canvasKit.PaintStyle.Stroke);
    canvasSelectionBorder.setColor(canvasKit.Color(248, 113, 113, 1));

    const relationshipLine = new canvasKit.Paint();
    relationshipLine.setAntiAlias(true);
    relationshipLine.setStyle(canvasKit.PaintStyle.Stroke);
    relationshipLine.setColor(canvasKit.Color(128, 128, 128, 0.4)); // Visible but subtle 40% opacity

    const relationshipLineHighlight = new canvasKit.Paint();
    relationshipLineHighlight.setAntiAlias(true);
    relationshipLineHighlight.setStyle(canvasKit.PaintStyle.Stroke);
    relationshipLineHighlight.setColor(canvasKit.Color(56, 189, 248, 0.8));

    return {
      canvasGrid,
      draftPlace,
      hoverRing,
      place,
      selectedRing,
      stagedDelete,
      canvasSelectionBorder,
      relationshipLine,
      relationshipLineHighlight,
    };
  };

  // const drawGrid = (
  //   canvas: Canvas,
  //   canvasKit: CanvasKit,
  //   viewport: Viewport,
  //   size: { width: number; height: number },
  // ) => {
  //   const gridSpacing = 120;
  //   const worldMin = screenToWorld(viewport, 0, 0);
  //   const worldMax = screenToWorld(viewport, size.width, size.height);
  //   const startX = Math.floor(worldMin.x / gridSpacing) * gridSpacing;
  //   const startY = Math.floor(worldMin.y / gridSpacing) * gridSpacing;
  //   const endX = Math.ceil(worldMax.x / gridSpacing) * gridSpacing;
  //   const endY = Math.ceil(worldMax.y / gridSpacing) * gridSpacing;
  //
  //   runtime?.paints.canvasGrid.setStrokeWidth(1 / viewport.scale);
  //
  //   for (let x = startX; x <= endX; x += gridSpacing) {
  //     canvas.drawLine(
  //       x,
  //       worldMin.y,
  //       x,
  //       worldMax.y,
  //       runtime?.paints.canvasGrid ?? new canvasKit.Paint(),
  //     );
  //   }
  //
  //   for (let y = startY; y <= endY; y += gridSpacing) {
  //     canvas.drawLine(
  //       worldMin.x,
  //       y,
  //       worldMax.x,
  //       y,
  //       runtime?.paints.canvasGrid ?? new canvasKit.Paint(),
  //     );
  //   }
  // };

  const drawRelationshipLines = (
    canvas: Canvas,
    places: ReadonlyArray<DisplayPlace>,
    selectedPlaceId: string | null,
    viewport: Viewport,
  ) => {
    if (!runtime) {
      return;
    }

    // If no place is selected, don't draw any relation lines
    if (!selectedPlaceId) {
      return;
    }

    // Build place map and subtree set for filtering
    const placeMap = buildPlaceMap(places);
    const subtreeIds = getSubtreePlaceIds(selectedPlaceId, placeMap);

    for (const place of places) {
      if (place.parentPlaceId === null) {
        continue;
      }

      const parent = places.find((p) => p.id === place.parentPlaceId);
      if (!parent) {
        continue;
      }

      // Filter: draw line only if place is selected (parent connection)
      // OR if parent is in the selected place's subtree (descendant connection)
      const shouldDraw =
        place.id === selectedPlaceId || subtreeIds.has(parent.id);

      if (!shouldDraw) {
        continue;
      }

      // Use highlight paint for better visibility of direction indicator
      const paint = runtime.paints.relationshipLineHighlight;
      paint.setStrokeWidth(1 / viewport.scale);

      // Apply sparse animated dash effect to show direction (parent -> child)
      // Pattern: 6px visible pulse, 60px gap - occupies only ~9% of the line
      const path = new runtime.canvasKit.Path();
      path.moveTo(parent.x, parent.y);
      path.lineTo(place.x, place.y);
      const dashedPath = runtime.canvasKit.PathEffect.MakeDash(
        [8, 40], // 8px dash, 40px gap - balanced pulse frequency
        dashPhase, // animated phase offset
      );
      paint.setPathEffect(dashedPath);

      canvas.drawPath(path, paint);

      // Clean up
      path.delete();
      dashedPath?.delete();
    }
  };

  const drawScene = (canvas: Canvas) => {
    if (!runtime) {
      return;
    }

    const currentViewport = props.viewport();
    const selectedPlaceId = props.selectedPlaceId();
    const hoveredPlaceId = props.hoveredPlaceId();
    const currentPlaces = props.places();
    // const currentSize = canvasSize();

    canvas.clear(backgroundColor);
    canvas.save();
    canvas.translate(currentViewport.x, currentViewport.y);
    canvas.scale(currentViewport.scale, currentViewport.scale);
    // drawGrid(canvas, runtime.canvasKit, currentViewport, currentSize);

    drawRelationshipLines(
      canvas,
      currentPlaces,
      selectedPlaceId,
      currentViewport,
    );

    for (const place of currentPlaces) {
      const fillPaint = place.isMarkedForDeletion
        ? runtime.paints.stagedDelete
        : place.isDraft
          ? runtime.paints.draftPlace
          : runtime.paints.place;

      canvas.drawCircle(place.x, place.y, 18, fillPaint);

      if (place.id === hoveredPlaceId) {
        runtime.paints.hoverRing.setStrokeWidth(5 / currentViewport.scale);
        canvas.drawCircle(place.x, place.y, 24, runtime.paints.hoverRing);
      }

      if (place.id === selectedPlaceId) {
        runtime.paints.selectedRing.setStrokeWidth(7 / currentViewport.scale);
        canvas.drawCircle(place.x, place.y, 30, runtime.paints.selectedRing);
      }
    }

    canvas.restore();

    // Draw canvas selection border when canvas is selected
    const selectionTarget = props.selectionTarget();
    if (selectionTarget.kind === 'canvas') {
      const size = canvasSize();
      const borderWidth = 4;
      const inset = borderWidth / 2;

      runtime.paints.canvasSelectionBorder.setStrokeWidth(borderWidth);

      // Draw 4 lines forming border
      canvas.drawLine(
        inset,
        inset,
        size.width - inset,
        inset,
        runtime.paints.canvasSelectionBorder,
      );
      canvas.drawLine(
        size.width - inset,
        inset,
        size.width - inset,
        size.height - inset,
        runtime.paints.canvasSelectionBorder,
      );
      canvas.drawLine(
        size.width - inset,
        size.height - inset,
        inset,
        size.height - inset,
        runtime.paints.canvasSelectionBorder,
      );
      canvas.drawLine(
        inset,
        inset,
        inset,
        size.height - inset,
        runtime.paints.canvasSelectionBorder,
      );
    }
  };

  const resizeSurface = async (width: number, height: number) => {
    if (!canvasElement || width === 0 || height === 0) {
      return;
    }

    if (!canvasKitPromise) {
      canvasKitPromise = CanvasKitInit({ locateFile: () => canvaskitWasmUrl });
    }

    const canvasKit = await canvasKitPromise;
    canvasElement.width = width;
    canvasElement.height = height;
    deleteRuntime();

    const surface =
      canvasKit.MakeWebGLCanvasSurface(canvasElement) ??
      canvasKit.MakeSWCanvasSurface(canvasElement);

    if (!surface) {
      setStatus('Canvas surface creation failed.');
      return;
    }

    runtime = { canvasKit, paints: createPaints(canvasKit), surface };
    setStatus('Canvas ready.');
    queueDraw();
  };

  const getWorldPoint = (clientX: number, clientY: number) => {
    if (!viewportHost) {
      return null;
    }

    const rect = viewportHost.getBoundingClientRect();
    return screenToWorld(
      props.viewport(),
      clientX - rect.left,
      clientY - rect.top,
    );
  };

  const updateHover = (clientX: number, clientY: number) => {
    if (!viewportHost || activeDragMode !== 'idle') {
      return;
    }

    const world = getWorldPoint(clientX, clientY);

    if (!world) {
      return;
    }

    props.onUpdateHoverPlace(
      hitTestPlace(
        props.places(),
        world.x,
        world.y,
        28 / props.viewport().scale,
      ),
    );
  };

  const handleWheel = (event: WheelEvent) => {
    if (!viewportHost) {
      return;
    }

    event.preventDefault();
    const rect = viewportHost.getBoundingClientRect();
    const originX = event.clientX - rect.left;
    const originY = event.clientY - rect.top;
    const amount = Math.exp(-event.deltaY * Math.log(wheelScaleFactor));

    props.setViewport((current) =>
      zoomViewportAt(current, amount, originX, originY),
    );
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!canvasElement) {
      return;
    }

    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    const world = getWorldPoint(event.clientX, event.clientY);

    if (!world) {
      return;
    }

    const hitPlaceId = hitTestPlace(
      props.places(),
      world.x,
      world.y,
      28 / props.viewport().scale,
    );
    const hitPlace =
      props.places().find((place) => place.id === hitPlaceId) ?? null;

    activePointerId = event.pointerId;
    dragDistance = 0;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    panOrigin = props.viewport();
    activeDragMode = event.button === 1 || isSpaceHeld ? 'pan' : 'idle';
    moveCandidateId = null;

    if (hitPlace) {
      props.onSelectPlace({ kind: 'place', placeId: hitPlace.id });
    }

    // If awaiting move transformation, prepare for drag
    const awaiting = props.awaitingTransformationTarget();
    if (
      awaiting.kind === 'movePlace' &&
      hitPlace &&
      hitPlace.id === awaiting.placeId &&
      activeDragMode !== 'pan'
    ) {
      moveCandidateId = hitPlace.id as PlaceId;
      moveOffset.x = hitPlace.x - world.x;
      moveOffset.y = hitPlace.y - world.y;
    }

    canvasElement.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      updateHover(event.clientX, event.clientY);
      return;
    }

    const deltaX = event.clientX - pointerStartX;
    const deltaY = event.clientY - pointerStartY;
    dragDistance = Math.max(dragDistance, Math.hypot(deltaX, deltaY));

    if (activeDragMode === 'pan' && panOrigin) {
      props.setViewport({
        ...panOrigin,
        x: panOrigin.x + deltaX,
        y: panOrigin.y + deltaY,
      });
      return;
    }

    // Handle move place dragging when awaiting movePlace
    if (moveCandidateId && dragDistance >= dragThreshold) {
      const world = getWorldPoint(event.clientX, event.clientY);
      const currentPlace = props
        .places()
        .find((place) => place.id === moveCandidateId);

      if (!world || !currentPlace || currentPlace.isDraft) {
        return;
      }

      // Stage the move if not already staged
      if (props.pendingTransformation().kind === 'none') {
        const didStageMove = props.onStageMovePlace(
          moveCandidateId,
          currentPlace.x,
          currentPlace.y,
        );

        if (!didStageMove) {
          return;
        }
      }

      activeDragMode = 'move';
      props.onUpdateMovePlace(world.x + moveOffset.x, world.y + moveOffset.y);
      return;
    }

    updateHover(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!canvasElement || activePointerId !== event.pointerId) {
      return;
    }

    canvasElement.releasePointerCapture(event.pointerId);

    const world = getWorldPoint(event.clientX, event.clientY);
    const isTap = dragDistance < dragThreshold;

    if (world && activeDragMode === 'idle') {
      const hitPlaceId = hitTestPlace(
        props.places(),
        world.x,
        world.y,
        28 / props.viewport().scale,
      );

      const awaiting = props.awaitingTransformationTarget();

      if (awaiting.kind === 'addPlace' && isTap) {
        props.onStageAddPlace(world.x, world.y);
        props.onClearAwaitingTransformation();
      } else if (awaiting.kind === 'addRelatedPlace' && isTap) {
        props.onStageAddRelatedPlace(world.x, world.y);
        props.onClearAwaitingTransformation();
      } else if (awaiting.kind === 'movePlace' && isTap) {
        props.onStageMovePlace(awaiting.placeId, world.x, world.y);
      } else if (isTap) {
        if (hitPlaceId) {
          props.onSelectPlace({ kind: 'place', placeId: hitPlaceId });
        } else {
          props.onSelectPlace({ kind: 'canvas' });
        }
      }
    }

    activePointerId = null;
    activeDragMode = 'idle';
    moveCandidateId = null;
    panOrigin = null;
    dragDistance = 0;
    updateHover(event.clientX, event.clientY);
  };

  const handlePointerLeave = () => {
    if (activeDragMode === 'idle') {
      props.onUpdateHoverPlace(null);
    }
  };

  onMount(() => {
    if (!viewportHost) {
      return;
    }

    const updateSize = () => {
      if (!viewportHost) {
        return;
      }

      const nextSize = {
        width: Math.round(viewportHost.clientWidth),
        height: Math.round(viewportHost.clientHeight),
      };

      setCanvasSize(nextSize);
      props.onSurfaceSizeChange(nextSize);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeld = true;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeld = false;
      }
    };

    updateSize();
    resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(viewportHost);
    viewportHost.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    onCleanup(() => {
      viewportHost?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver?.disconnect();
      deleteRuntime();
    });
  });

  createEffect(() => {
    const size = canvasSize();

    if (size.width > 0 && size.height > 0) {
      void resizeSurface(size.width, size.height);
    }
  });

  createEffect(() => {
    props.places();
    props.viewport();
    props.selectedPlaceId();
    props.hoveredPlaceId();
    props.pendingTransformation();
    queueDraw();
  });

  return (
    <section class="relative flex-1 min-h-0 w-full bg-white overflow-hidden">
      <div class="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-2 text-xs uppercase tracking-[0.3em]">
        <span>{status()}</span>
      </div>

      <div
        ref={viewportHost}
        class="relative h-[72vh] min-h-[38rem] w-full overflow-hidden lg:h-full"
      >
        <canvas
          ref={canvasElement}
          class="absolute inset-0 h-full w-full touch-none"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerLeave}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        <div class="pointer-events-none absolute inset-0">
          <For each={visibleLabels()}>
            {(label) => (
              <div
                class="absolute -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/80 px-2 py-1 text-[11px] tracking-[0.18em] text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                style={{
                  left: `${label.left}px`,
                  top: `${label.top}px`,
                }}
              >
                {label.label}
              </div>
            )}
          </For>
        </div>
      </div>
    </section>
  );
};

export default PlaceCanvas;
