import CanvasKitInit, {
  type Canvas,
  type CanvasKit,
  type Paint,
  type Surface,
} from 'canvaskit-wasm';
import canvaskitWasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { hitTestPlace } from './canvas/hitTest';
import { createSyntheticScene, getVisibleLabelIds } from './canvas/spikeScene';
import {
  createViewportToFit,
  screenToWorld,
  type Viewport,
  zoomViewportAt,
} from './canvas/viewport';

interface PaintSet {
  connection: Paint;
  place: Paint;
  hover: Paint;
  selected: Paint;
}

interface CanvasRuntime {
  canvasKit: CanvasKit;
  surface: Surface;
  paints: PaintSet;
}

const scene = createSyntheticScene();
const wheelScaleFactor = 1.0015;
const panThreshold = 4;
const backgroundColor: number[] = [13 / 255, 18 / 255, 31 / 255, 1];

const App = () => {
  let canvasElement: HTMLCanvasElement | undefined;
  let viewportHost: HTMLDivElement | undefined;

  let runtime: CanvasRuntime | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let drawQueued = false;
  let drawFrameId: number | null = null;
  let canvasKitPromise: Promise<CanvasKit> | null = null;
  let activePointerId: number | null = null;
  let dragDistance = 0;
  let panOrigin: Viewport | null = null;
  let pointerStartX = 0;
  let pointerStartY = 0;
  let isSpaceHeld = false;
  let hasInitializedViewport = false;

  const [status, setStatus] = createSignal('Loading CanvasKit...');
  const [viewport, setViewport] = createSignal<Viewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [canvasSize, setCanvasSize] = createSignal({ width: 0, height: 0 });
  const [selectedPlaceId, setSelectedPlaceId] = createSignal<string | null>(
    null,
  );
  const [hoveredPlaceId, setHoveredPlaceId] = createSignal<string | null>(null);
  const [isPanning, setIsPanning] = createSignal(false);

  const activePlaceId = createMemo(() => hoveredPlaceId() ?? selectedPlaceId());
  const activePlace = createMemo(() => {
    const placeId = activePlaceId();

    return placeId ? (scene.placeIndex.get(placeId) ?? null) : null;
  });

  const visibleLabels = createMemo(() => {
    const currentViewport = viewport();
    const size = canvasSize();

    return getVisibleLabelIds(scene, currentViewport.scale)
      .map((placeId) => scene.placeIndex.get(placeId))
      .filter((place): place is NonNullable<typeof place> => Boolean(place))
      .map((place) => ({
        id: place.id,
        label: place.label,
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
    drawFrameId = window.requestAnimationFrame(() => {
      drawFrameId = null;
      drawQueued = false;
      if (runtime !== activeRuntime) {
        return;
      }

      drawScene(activeRuntime.surface.getCanvas());
      activeRuntime.surface.flush();
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
    runtime.paints.connection.delete();
    runtime.paints.place.delete();
    runtime.paints.hover.delete();
    runtime.paints.selected.delete();
    runtime = null;
  };

  const createPaints = (canvasKit: CanvasKit): PaintSet => {
    const connection = new canvasKit.Paint();
    connection.setAntiAlias(true);
    connection.setStyle(canvasKit.PaintStyle.Stroke);
    connection.setColor(canvasKit.Color(102, 126, 234, 110 / 255));

    const place = new canvasKit.Paint();
    place.setAntiAlias(true);
    place.setStyle(canvasKit.PaintStyle.Fill);
    place.setColor(canvasKit.Color(248, 250, 252, 1));

    const hover = new canvasKit.Paint();
    hover.setAntiAlias(true);
    hover.setStyle(canvasKit.PaintStyle.Stroke);
    hover.setColor(canvasKit.Color(251, 191, 36, 1));

    const selected = new canvasKit.Paint();
    selected.setAntiAlias(true);
    selected.setStyle(canvasKit.PaintStyle.Stroke);
    selected.setColor(canvasKit.Color(248, 113, 113, 1));

    return { connection, place, hover, selected };
  };

  const drawScene = (canvas: Canvas) => {
    if (!runtime) {
      return;
    }

    const currentViewport = viewport();
    const selectedId = selectedPlaceId();
    const hoveredId = hoveredPlaceId();

    canvas.clear(backgroundColor);
    canvas.save();
    canvas.translate(currentViewport.x, currentViewport.y);
    canvas.scale(currentViewport.scale, currentViewport.scale);

    runtime.paints.connection.setStrokeWidth(1.2 / currentViewport.scale);
    for (const connection of scene.connections) {
      const from = scene.placeIndex.get(connection.fromId);
      const to = scene.placeIndex.get(connection.toId);

      if (!from || !to) {
        continue;
      }

      canvas.drawLine(from.x, from.y, to.x, to.y, runtime.paints.connection);
    }

    for (const place of scene.places) {
      canvas.drawCircle(place.x, place.y, 7, runtime.paints.place);

      if (place.id === hoveredId) {
        runtime.paints.hover.setStrokeWidth(6 / currentViewport.scale);
        canvas.drawCircle(place.x, place.y, 13, runtime.paints.hover);
      }

      if (place.id === selectedId) {
        runtime.paints.selected.setStrokeWidth(8 / currentViewport.scale);
        canvas.drawCircle(place.x, place.y, 18, runtime.paints.selected);
      }
    }

    canvas.restore();
  };

  const resizeSurface = async (width: number, height: number) => {
    if (!canvasElement || width === 0 || height === 0) {
      return;
    }

    if (!canvasKitPromise) {
      canvasKitPromise = CanvasKitInit({
        locateFile: () => canvaskitWasmUrl,
      });
    }

    const canvasKit = await canvasKitPromise;
    canvasElement.width = width;
    canvasElement.height = height;
    deleteRuntime();

    const surface =
      canvasKit.MakeWebGLCanvasSurface(canvasElement) ??
      canvasKit.MakeSWCanvasSurface(canvasElement);

    if (!surface) {
      setStatus('CanvasKit surface creation failed.');
      return;
    }

    const paints = createPaints(canvasKit);
    runtime = { canvasKit, surface, paints };
    setStatus(
      `CanvasKit ready. ${scene.places.length} places and ${scene.connections.length} connections loaded.`,
    );
    queueDraw();
  };

  const resetView = () => {
    const size = canvasSize();

    if (size.width === 0 || size.height === 0) {
      return;
    }

    setViewport(createViewportToFit(scene.bounds, size.width, size.height));
  };

  const updateHover = (clientX: number, clientY: number) => {
    if (!viewportHost || isPanning()) {
      return;
    }

    const rect = viewportHost.getBoundingClientRect();
    const world = screenToWorld(
      viewport(),
      clientX - rect.left,
      clientY - rect.top,
    );
    const nextHoverId = hitTestPlace(
      scene,
      world.x,
      world.y,
      24 / viewport().scale,
    );
    setHoveredPlaceId(nextHoverId);
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

    setViewport((current) => zoomViewportAt(current, amount, originX, originY));
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!canvasElement || !viewportHost) {
      return;
    }

    if (event.button !== 0 && event.button !== 1) {
      return;
    }

    activePointerId = event.pointerId;
    dragDistance = 0;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    panOrigin = viewport();
    setIsPanning(event.button === 1 || isSpaceHeld);
    canvasElement.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!viewportHost) {
      return;
    }

    if (activePointerId === event.pointerId && panOrigin) {
      const deltaX = event.clientX - pointerStartX;
      const deltaY = event.clientY - pointerStartY;
      dragDistance = Math.max(dragDistance, Math.hypot(deltaX, deltaY));

      if (isPanning()) {
        setViewport({
          ...panOrigin,
          x: panOrigin.x + deltaX,
          y: panOrigin.y + deltaY,
        });
        return;
      }
    }

    updateHover(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!canvasElement || !viewportHost) {
      return;
    }

    if (activePointerId !== event.pointerId) {
      return;
    }

    canvasElement.releasePointerCapture(event.pointerId);

    if (!isPanning() && dragDistance < panThreshold) {
      const rect = viewportHost.getBoundingClientRect();
      const world = screenToWorld(
        viewport(),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
      const hitId = hitTestPlace(
        scene,
        world.x,
        world.y,
        24 / viewport().scale,
      );
      setSelectedPlaceId(hitId);
    }

    activePointerId = null;
    panOrigin = null;
    dragDistance = 0;
    setIsPanning(false);
    updateHover(event.clientX, event.clientY);
  };

  const handlePointerLeave = () => {
    if (!isPanning()) {
      setHoveredPlaceId(null);
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
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeld = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        isSpaceHeld = false;
        setIsPanning(false);
      }
    };

    updateSize();
    resetView();
    resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(viewportHost);

    viewportHost.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    onCleanup(() => {
      viewportHost?.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      resizeObserver?.disconnect();
      deleteRuntime();
    });
  });

  createEffect(() => {
    const size = canvasSize();

    if (size.width > 0 && size.height > 0) {
      void resizeSurface(size.width, size.height);
      if (!hasInitializedViewport) {
        hasInitializedViewport = true;
        setViewport(createViewportToFit(scene.bounds, size.width, size.height));
      }
    }
  });

  createEffect(() => {
    viewport();
    selectedPlaceId();
    hoveredPlaceId();
    queueDraw();
  });

  return (
    <main class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.22),_transparent_28%),linear-gradient(180deg,_#111827_0%,_#020617_56%,_#0f172a_100%)] px-4 py-4 text-stone-100 md:px-6">
      <div class="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section class="rounded-[28px] border border-stone-800/80 bg-stone-950/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div class="space-y-4">
            <div>
              <p class="text-xs uppercase tracking-[0.3em] text-amber-300/70">
                Milestone 0
              </p>
              <h1 class="mt-2 font-serif text-3xl text-stone-50">
                Renderer Spike
              </h1>
              <p class="mt-3 text-sm leading-6 text-stone-300">
                Vite + Solid + CanvasKit with a dense synthetic scene, explicit
                pan and zoom, and place-level hit testing.
              </p>
            </div>

            <div class="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-300">
              <p>{status()}</p>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
                  Places
                </p>
                <p class="mt-2 text-2xl text-stone-50">{scene.places.length}</p>
              </div>
              <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
                <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
                  Connections
                </p>
                <p class="mt-2 text-2xl text-stone-50">
                  {scene.connections.length}
                </p>
              </div>
            </div>

            <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
              <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
                Controls
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-amber-200"
                  onClick={resetView}
                >
                  Reset view
                </button>
                <button
                  type="button"
                  class="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                  onClick={() => {
                    const size = canvasSize();
                    setViewport((current) =>
                      zoomViewportAt(
                        current,
                        1.2,
                        size.width / 2,
                        size.height / 2,
                      ),
                    );
                  }}
                >
                  Zoom in
                </button>
                <button
                  type="button"
                  class="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
                  onClick={() => {
                    const size = canvasSize();
                    setViewport((current) =>
                      zoomViewportAt(
                        current,
                        1 / 1.2,
                        size.width / 2,
                        size.height / 2,
                      ),
                    );
                  }}
                >
                  Zoom out
                </button>
              </div>
              <p class="mt-3 text-xs leading-5 text-stone-400">
                Wheel to zoom. Hold Space or use the middle mouse button to pan.
                Click a place to select it.
              </p>
            </div>

            <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
              <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
                Viewport
              </p>
              <p class="mt-3">Scale: {viewport().scale.toFixed(3)}x</p>
              <p class="mt-1">
                Offset: {Math.round(viewport().x)}, {Math.round(viewport().y)}
              </p>
              <p class="mt-1">Labels: {visibleLabels().length}</p>
            </div>

            <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
              <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
                Active place
              </p>
              <Show
                when={activePlace()}
                fallback={
                  <p class="mt-3 text-stone-400">
                    Hover or select a place on the canvas.
                  </p>
                }
              >
                {(place) => (
                  <div class="mt-3 space-y-1">
                    <p class="text-lg text-stone-50">{place().label}</p>
                    <p>x: {Math.round(place().x)}</p>
                    <p>y: {Math.round(place().y)}</p>
                    <p>ring: {place().ring}</p>
                  </div>
                )}
              </Show>
            </div>
          </div>
        </section>

        <section class="relative overflow-hidden rounded-[32px] border border-sky-500/20 bg-[#040b17] shadow-[0_32px_100px_rgba(15,23,42,0.7)]">
          <div class="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/8 bg-slate-950/75 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-300 backdrop-blur">
            <span>CanvasKit surface</span>
            <span>{isPanning() ? 'Panning' : 'Selection'}</span>
          </div>

          <div
            ref={viewportHost}
            class="relative h-[70vh] min-h-[38rem] w-full overflow-hidden lg:h-full"
          >
            <canvas
              ref={canvasElement}
              class="absolute inset-0 h-full w-full touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
            />

            <div class="pointer-events-none absolute inset-0">
              <For each={visibleLabels()}>
                {(label) => (
                  <div
                    class="absolute -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/75 px-2 py-1 text-[11px] tracking-[0.2em] text-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
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
      </div>
    </main>
  );
};

export default App;
