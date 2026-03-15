import { type Accessor, For, type ParentComponent, Show } from 'solid-js';
import type { Viewport } from '../canvas/viewport';
import type {
  DisplayPlace,
  PendingTransformationState,
  ToolMode,
  TransformationEntry,
} from '../drawing/types';

interface DrawingGuideProps {
  activePlace: Accessor<DisplayPlace | null>;
  canStageDelete: Accessor<boolean>;
  onCommitPendingChange: () => void;
  onEnterAddPlaceMode: () => void;
  onRejectPendingChange: () => void;
  onResetViewport: () => void;
  onStageDelete: () => void;
  operationMessage: Accessor<string | null>;
  pendingTransformation: Accessor<PendingTransformationState>;
  selectedPlaceId: Accessor<string | null>;
  tool: Accessor<ToolMode>;
  transformations: Accessor<ReadonlyArray<TransformationEntry>>;
  viewport: Accessor<Viewport>;
}

const describePendingTransformation = (
  pendingTransformation: PendingTransformationState,
) => {
  switch (pendingTransformation.kind) {
    case 'addPlace':
      return 'A new place is staged locally and not yet persisted.';
    case 'movePlace':
      return 'A place move is staged. Commit to persist, or reject to restore the last committed position.';
    case 'deletePlace':
      return 'A place is marked for deletion. Commit to persist the delete, or reject to keep it.';
    default:
      return 'No pending transformation.';
  }
};

const Button: ParentComponent<{ disabled?: boolean; onClick?: () => void }> = (
  props,
) => {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title="Reset drawing and start over (TBD)"
      class="px-3 py-1 bg-amber-200 rounded text-sm text-slate-900  disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none "
    >
      {props.children}
    </button>
  );
};

const Panel: ParentComponent<{ title: string }> = (props) => {
  return (
    <div class="border border-sky-200 rounded overflow-hidden">
      <div class="px-2 py-1.5 bg-sky-200 font-medium text-sm text-slate-700">
        {props.title}
      </div>
      <div class="border-t border-sky-200 px-2 py-2 bg-white">
        {props.children}
      </div>
    </div>
  );
};

const DrawingGuideProps = (props: DrawingGuideProps) => {
  return (
    <div class="space-y-4">
      <p class="text-xs uppercase tracking-[0.3em]">Grawing Guide</p>

      <Panel title="Observation">
        <div class="flex flex-col gap-2">
          <Button disabled={true}>Reset Drawing</Button>
          <Button onClick={props.onResetViewport}>Reset view</Button>
        </div>
        <p class="text-sm text-slate-600 mt-2">
          Look at the drawing. What would you like to do?
        </p>
      </Panel>

      <Panel title="Tool">
        <p class="mt-3">
          Current tool: {props.tool() === 'addPlace' ? 'Add place' : 'Select'}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button onClick={props.onEnterAddPlaceMode}>
            Stage place from canvas click
          </Button>
        </div>
      </Panel>

      <Panel title="Pending change">
        <p class="mt-3 leading-6">
          {describePendingTransformation(props.pendingTransformation())}
        </p>
        <div class="mt-3 flex flex-col gap-2">
          <Button
            disabled={props.pendingTransformation().kind === 'none'}
            onClick={props.onCommitPendingChange}
          >
            Commit change
          </Button>
          <Button
            disabled={props.pendingTransformation().kind === 'none'}
            onClick={props.onRejectPendingChange}
          >
            Reject change
          </Button>
        </div>

        <Show when={props.operationMessage()}>
          {(message) => <p class="mt-3 text-xs text-amber-900">{message()}</p>}
        </Show>
      </Panel>

      <Panel title="Selection">
        <Show
          when={props.activePlace()}
          fallback={
            <p class="mt-3 text-stone-400">Select a place to inspect it.</p>
          }
        >
          {(place) => (
            <div class="mt-3 space-y-2">
              <p>Id: {place().name ?? place().id}</p>
              <p>x: {Math.round(place().x)}</p>
              <p>y: {Math.round(place().y)}</p>
              <p>{place().isDraft ? 'Draft place' : 'Persisted place'}</p>
              <Show when={place().isMarkedForDeletion}>
                <p class="text-rose-300">Marked for deletion</p>
              </Show>
              <Button
                disabled={!props.canStageDelete()}
                onClick={props.onStageDelete}
              >
                {place().isDraft ? 'Reject draft place' : 'Stage delete'}
              </Button>
            </div>
          )}
        </Show>
      </Panel>

      <Panel title="Viewport">
        <p class="mt-3">Scale: {props.viewport().scale.toFixed(3)}x</p>
        <p class="mt-1">
          Offset: {Math.round(props.viewport().x)},{' '}
          {Math.round(props.viewport().y)}
        </p>
        <p class="mt-1">Selected: {props.selectedPlaceId() ?? 'none'}</p>
      </Panel>

      <Panel title="History">
        <div class="space-y-2">
          <For each={[...props.transformations()].reverse().slice(0, 8)}>
            {(transformation) => (
              <div class="bg-stone-200/70 p-3">
                <p class="text-sm text-stone-500">
                  #{transformation.sequence} {transformation.kind}
                </p>
                <p class="mt-1 text-xs text-stone-400">
                  {new Date(transformation.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </For>
        </div>
        <Show when={props.transformations().length === 0}>
          <p class="text-stone-400">No committed transformations yet.</p>
        </Show>
      </Panel>
    </div>
  );
};

export default DrawingGuideProps;
