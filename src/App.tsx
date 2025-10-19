import type { Component } from 'solid-js';
import { useContext } from 'solid-js';
import { useEvolu } from './lib/evolu-db';

const App: Component = () => {
  const _evoluContext = useEvolu();

  return (
    <div class="flex gap-2 h-screen p-2 *:min-w-0">
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">View Controls</div>
      <svg class="p-2 basis-1/5 grow bg-sky-50">
        <g></g>
      </svg>
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">
        Transformation Controls
      </div>
    </div>
  );
};

export default App;
