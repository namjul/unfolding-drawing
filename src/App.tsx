import { createEventListener } from '@solid-primitives/event-listener';
import { createShortcut } from '@solid-primitives/keyboard';
import { createPerPointerListeners } from '@solid-primitives/pointer';
import { type Component, createSignal } from 'solid-js';
import ViewControls from './components/ViewControls';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;
const WHEEL_SCALE_FACTOR = 0.01;
const PINCH_SCALE_FACTOR = 0.01;

type Mode = 'default' | 'pan';

const App: Component = () => {
  // const _evoluContext = useEvolu();
  let svg!: SVGSVGElement;

  const [scale, setScale] = createSignal(1);
  const [translateX, setTranslateX] = createSignal(0);
  const [translateY, setTranslateY] = createSignal(0);

  // Mode state for pan
  const [mode, setMode] = createSignal<Mode>('default');
  const [prevMode, setPrevMode] = createSignal<Mode>('default');
  const [isPanning, setIsPanning] = createSignal(false);

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

  // Keyboard shortcuts for zoom
  createShortcut(['='], zoomIn, { preventDefault: true });
  createShortcut(['+'], zoomIn, { preventDefault: true });
  createShortcut(['-'], zoomOut, { preventDefault: true });
  createShortcut(['0'], resetZoom, { preventDefault: true });

  // Spacebar hold for temporary pan mode
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

  // Spacebar release restores previous mode
  createEventListener(document, 'keyup', (e) => {
    if (e.code === 'Space') {
      setMode(prevMode());
    }
  });

  // Wheel zoom
  createEventListener(
    () => svg,
    'wheel',
    (e) => {
      e.preventDefault();
      zoomBy(-e.deltaY * WHEEL_SCALE_FACTOR, e.clientX, e.clientY);
    },
    { passive: false },
  );

  // Pointer handling with pinch zoom and pan support
  const pointers = new Map<number, { x: number; y: number }>();
  let prevPinchDist = 0;

  createPerPointerListeners({
    target: () => svg,
    pointerTypes: ['mouse', 'touch'],
    onDown({ x, y, pointerId }, onMove, onUp) {
      pointers.set(pointerId, { x, y });

      if (mode() === 'pan' && pointers.size === 1) {
        setIsPanning(true);
      }

      onMove((e) => {
        const prev = pointers.get(e.pointerId);
        pointers.set(e.pointerId, { x: e.x, y: e.y });

        if (pointers.size === 2) {
          // Pinch zoom
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
          // Pan drag
          const dx = e.x - prev.x;
          const dy = e.y - prev.y;
          setTranslateX(translateX() + dx);
          setTranslateY(translateY() + dy);
        }
      });

      onUp(() => {
        pointers.delete(pointerId);
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
        />
      </div>
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        class={`p-2 basis-1/5 grow bg-sky-50 touch-none ${cursorClass()}`}
      >
        <title>Drawing canvas</title>
        <g
          transform={`translate(${translateX()} ${translateY()}) scale(${scale()})`}
        >
          <circle cx="200" cy="200" r="50" fill="coral" />
        </g>
      </svg>
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">
        Transformation Controls
      </div>
    </div>
  );
};

export default App;
