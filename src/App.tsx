import { createEventListener } from '@solid-primitives/event-listener';
import { createShortcut } from '@solid-primitives/keyboard';
import { createPerPointerListeners } from '@solid-primitives/pointer';
import { batch, type Component, createSignal, For } from 'solid-js';
import type { GuideStep, TransformChoice } from './components/DrawingGuide';
import DrawingGuide from './components/DrawingGuide';
import DrawingObjectsList from './components/DrawingObjectsList';
import TransformationsList from './components/TransformationsList';
import ViewControls from './components/ViewControls';
import {
  allPlacesQuery,
  allTransformationsQuery,
  type PlaceId,
  useEvolu,
} from './lib/evolu-db';
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

  const places = () => placesRows();
  const isPlaceAt = (
    px: number,
    py: number,
    place: { x: number | null; y: number | null },
  ) => Math.hypot(px - (place.x ?? 0), py - (place.y ?? 0)) <= PLACE_RADIUS * 2;

  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = svg.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cx = (x - translateX()) / scale();
    const cy = (y - translateY()) / scale();
    return { x: cx, y: cy };
  };

  const findPlaceAt = (cx: number, cy: number) =>
    places().find((p) => isPlaceAt(cx, cy, p));

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

    if (gs === 'execute' && tc === 'add') {
      const pa = pendingAdd();
      if (pa && isPlaceAt(cx, cy, { x: pa.x, y: pa.y })) {
        setPendingMove({ placeId: 'pending' as PlaceId, x: pa.x, y: pa.y });
        return;
      }
      const parentId = hasDrawingPaneSelected() ? null : selectedPlaceId();
      setPendingAdd({ x: cx, y: cy, parentId });
      return;
    }

    if (gs === 'execute' && tc === 'move' && hit) {
      if (hit.id === selectedPlaceId()) {
        setPendingMove({
          placeId: hit.id,
          x: hit.x ?? 0,
          y: hit.y ?? 0,
        });
      }
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    const pm = pendingMove();
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
    const del = pendingDeletePlaceId();

    let insertedPlaceId: PlaceId | null = null;
    if (add) {
      const r = evolu.insert('place', {
        parentId: add.parentId,
        x: add.x,
        y: add.y,
      });
      if (r.ok) {
        insertedPlaceId = r.value.id;
        evolu.insert('transformation', {
          kind: 'add',
          placeId: r.value.id,
          parentId: add.parentId,
          x: add.x,
          y: add.y,
        });
      }
      setPendingAdd(null);
    }

    if (move) {
      const placeId =
        move.placeId === 'pending' ? insertedPlaceId : move.placeId;
      if (placeId) {
        evolu.update('place', {
          id: placeId,
          x: move.x,
          y: move.y,
        });
        evolu.insert('transformation', {
          kind: 'move',
          placeId,
          parentId: null,
          x: move.x,
          y: move.y,
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
    const placesData = places();

    for (const p of placesData) {
      const overridden = pm && pm.placeId === p.id;
      result.push({
        id: p.id,
        x: overridden ? pm.x : (p.x ?? 0),
        y: overridden ? pm.y : (p.y ?? 0),
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
        const shouldDrag =
          pm &&
          gs === 'execute' &&
          (tc === 'move' || (tc === 'add' && pm.placeId === 'pending'));
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
            <For each={displayPlaces()}>
              {(item) => {
                const sid = selectedPlaceId();
                const isSelected = item.id !== 'pending' && item.id === sid;
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
                        r={CROSSHAIR_SIZE + 4}
                        fill="none"
                        stroke="darkorange"
                        stroke-width={2}
                        stroke-dasharray="4 2"
                      />
                    )}
                  </g>
                );
              }}
            </For>
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
        />
        <hr class="border-sky-300" />
        <DrawingObjectsList />
        <TransformationsList />
      </div>
    </div>
  );
};

export default App;
