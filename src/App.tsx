import { createEventListener } from '@solid-primitives/event-listener';
import { createShortcut } from '@solid-primitives/keyboard';
import { createPerPointerListeners } from '@solid-primitives/pointer';
import { type Component, createSignal } from 'solid-js';
import ZoomControls from './components/ZoomControls';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;
const WHEEL_SCALE_FACTOR = 0.01;
const PINCH_SCALE_FACTOR = 0.01;

const App: Component = () => {
  // const _evoluContext = useEvolu();
  let svg!: SVGSVGElement;

  const [scale, setScale] = createSignal(1);
  const [translateX, setTranslateX] = createSignal(0);
  const [translateY, setTranslateY] = createSignal(0);

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

  // Keyboard shortcuts
  createShortcut(['='], zoomIn, { preventDefault: true });
  createShortcut(['+'], zoomIn, { preventDefault: true });
  createShortcut(['-'], zoomOut, { preventDefault: true });
  createShortcut(['0'], resetZoom, { preventDefault: true });

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

  // Pointer handling with pinch zoom support
  const pointers = new Map<number, { x: number; y: number }>();
  let prevPinchDist = 0;

  createPerPointerListeners({
    target: () => svg,
    pointerTypes: ['mouse', 'touch'],
    onDown({ x, y, pointerId }, onMove, onUp) {
      pointers.set(pointerId, { x, y });

      onMove((e) => {
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
        }
      });

      onUp(() => {
        pointers.delete(pointerId);
        if (pointers.size < 2) prevPinchDist = 0;
      });
    },
  });

  return (
    <div class="flex gap-2 h-screen p-2 *:min-w-0">
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">
        <ZoomControls
          scale={scale()}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          canZoomIn={scale() < MAX_SCALE}
          canZoomOut={scale() > MIN_SCALE}
        />
      </div>
      <svg
        ref={svg}
        xmlns="http://www.w3.org/2000/svg"
        class="p-2 basis-1/5 grow bg-sky-50"
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
