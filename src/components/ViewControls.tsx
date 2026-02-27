import type { Component } from 'solid-js';
import { viewControls } from '../styles/tokens';

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
  onResetDrawing: () => void;
}

const ViewControls: Component<ViewControlsProps> = (props) => {
  const percentage = () => Math.round(props.scale * 100);
  const canReset = () => props.scale !== 1;

  return (
    <div class={viewControls.root}>
      <button
        type="button"
        class={viewControls.buttonPrimary}
        onClick={props.onZoomIn}
        disabled={!props.canZoomIn}
      >
        +
      </button>
      <button
        type="button"
        class={viewControls.buttonSecondary}
        onClick={props.onResetZoom}
        disabled={!canReset()}
        title="Reset zoom"
      >
        {percentage()}%
      </button>
      <button
        type="button"
        class={viewControls.buttonPrimary}
        onClick={props.onZoomOut}
        disabled={!props.canZoomOut}
      >
        −
      </button>
      <hr class={viewControls.divider} />
      <button
        type="button"
        class={
          props.mode === 'pan'
            ? viewControls.buttonActive
            : viewControls.buttonInactive
        }
        onClick={props.onTogglePan}
        title="Toggle pan mode (hold Space for temporary pan)"
      >
        Pan
      </button>
      <hr class={viewControls.divider} />
      <button
        type="button"
        class={viewControls.buttonReset}
        onClick={props.onResetDrawing}
        title="Reset drawing and start over"
      >
        Reset Drawing
      </button>
    </div>
  );
};

export default ViewControls;
