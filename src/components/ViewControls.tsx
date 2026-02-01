import type { Component } from 'solid-js';

type Mode = 'default' | 'pan';

interface ViewControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  mode: Mode;
  onTogglePan: () => void;
}

const ViewControls: Component<ViewControlsProps> = (props) => {
  const percentage = () => Math.round(props.scale * 100);
  const canReset = () => props.scale !== 1;

  return (
    <div class="flex flex-col gap-2">
      <button
        type="button"
        class="px-3 py-1 bg-sky-200 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed rounded"
        onClick={props.onZoomIn}
        disabled={!props.canZoomIn}
      >
        +
      </button>
      <button
        type="button"
        class="px-3 py-1 bg-sky-100 hover:bg-sky-200 disabled:cursor-default rounded text-sm"
        onClick={props.onResetZoom}
        disabled={!canReset()}
        title="Reset zoom"
      >
        {percentage()}%
      </button>
      <button
        type="button"
        class="px-3 py-1 bg-sky-200 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed rounded"
        onClick={props.onZoomOut}
        disabled={!props.canZoomOut}
      >
        −
      </button>
      <hr class="my-2 border-sky-300" />
      <button
        type="button"
        class={`px-3 py-1 rounded ${
          props.mode === 'pan'
            ? 'bg-sky-500 text-white'
            : 'bg-sky-200 hover:bg-sky-300'
        }`}
        onClick={props.onTogglePan}
        title="Toggle pan mode (hold Space for temporary pan)"
      >
        Pan
      </button>
    </div>
  );
};

export default ViewControls;
