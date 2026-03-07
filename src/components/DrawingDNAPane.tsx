import type { Component } from 'solid-js';
import { createSignal } from 'solid-js';
import type { AxisId, CircularRepeaterId } from '../lib/evolu-db';
import { classes } from '../styles/tokens';
import DrawingObjectsList from './DrawingObjectsList';
import TransformationsList from './TransformationsList';

type TabId = 'objects' | 'transformations';

interface DrawingDNAPaneProps {
  selectedAxisId?: AxisId | null | undefined;
  onSelectAxis?: ((id: AxisId) => void) | undefined;
  selectedCircularRepeaterId?: CircularRepeaterId | null | undefined;
  onSelectRepeater?: ((id: CircularRepeaterId) => void) | undefined;
}

const DrawingDNAPane: Component<DrawingDNAPaneProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal<TabId>('objects');

  return (
    <div class={classes.dnaRoot}>
      <h3 class={classes.dnaTitle}>Drawing DNA</h3>
      <div class={classes.dnaTabBar}>
        <button
          type="button"
          class={`${classes.dnaTab} ${
            activeTab() === 'objects'
              ? classes.dnaTabActive
              : classes.dnaTabInactive
          }`}
          onClick={() => setActiveTab('objects')}
        >
          Drawing Objects
        </button>
        <button
          type="button"
          class={`${classes.dnaTab} ${
            activeTab() === 'transformations'
              ? classes.dnaTabActive
              : classes.dnaTabInactive
          }`}
          onClick={() => setActiveTab('transformations')}
        >
          Transformations
        </button>
      </div>
      <div class={classes.dnaContent}>
        {activeTab() === 'objects' && (
          <DrawingObjectsList
            selectedAxisId={props.selectedAxisId}
            onSelectAxis={props.onSelectAxis}
            selectedCircularRepeaterId={props.selectedCircularRepeaterId}
            onSelectRepeater={props.onSelectRepeater}
          />
        )}
        {activeTab() === 'transformations' && <TransformationsList />}
      </div>
    </div>
  );
};

export default DrawingDNAPane;
