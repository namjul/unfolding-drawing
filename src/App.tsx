import type { Component } from 'solid-js';
import { createPerPointerListeners } from "@solid-primitives/pointer";
import { useEvolu } from './lib/evolu-db';

const App: Component = () => {
  const _evoluContext = useEvolu();

  let svg!: SVGSVGElement

  createPerPointerListeners({
    target: () => svg,
    pointerTypes: ["mouse", "touch"],
    onDown({ x, y, pointerId }, onMove, onUp) {
      console.log(x, y, pointerId);
      onMove(e => { console.log("move", e); });
      onUp(e => { console.log("up", e); });
    }
  });

  return (
    <div class="flex gap-2 h-screen p-2 *:min-w-0">
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">View Controls</div>
      <svg ref={svg} xmlns="http://www.w3.org/2000/svg" class="p-2 basis-1/5 grow bg-sky-50">
        <g></g>
      </svg>
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">
        Transformation Controls
      </div>
    </div>
  );
};

export default App;
