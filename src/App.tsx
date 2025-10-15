import type { Component } from 'solid-js';

const App: Component = () => {
  return (
    <div class="flex gap-2 h-screen p-2">
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">View Controls</div>
      <canvas class="p-2 basis-1/5 grow  bg-sky-50"></canvas>
      <div class="p-2 basis-1/25 grow max-w-100 bg-sky-50">Transformation Controls</div>
    </div>
  );
};

export default App;
