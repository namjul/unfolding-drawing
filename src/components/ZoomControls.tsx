import type { Component } from 'solid-js';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
}

const ZoomControls: Component<ZoomControlsProps> = (props) => {
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
    </div>
  );
};

export default ZoomControls;
