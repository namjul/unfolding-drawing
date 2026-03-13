import { type Accessor, For, Show } from 'solid-js';
import type { Viewport } from '../canvas/viewport';
import type {
  DisplayPlace,
  PendingTransformationState,
  ToolMode,
  TransformationEntry,
} from '../drawing/types';

interface PlaceInspectorProps {
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

const PlaceInspector = (props: PlaceInspectorProps) => {
  return (
    <section class="rounded-[28px] border border-stone-800/80 bg-stone-950/75 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
      <div class="space-y-4">
        <div>
          <p class="text-xs uppercase tracking-[0.3em] text-amber-300/70">
            Milestone 1
          </p>
          <h1 class="mt-2 font-serif text-3xl text-stone-50">
            Persistent Place Core
          </h1>
          <p class="mt-3 text-sm leading-6 text-stone-300">
            Evolu-backed places with staged add, move, delete, commit, reject,
            and committed transformation history.
          </p>
        </div>

        <div class="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-sm text-stone-300">
          <p class="text-xs uppercase tracking-[0.24em] text-stone-500">Tool</p>
          <p class="mt-3">
            Current tool: {props.tool() === 'addPlace' ? 'Add place' : 'Select'}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full bg-amber-300 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-amber-200"
              onClick={props.onEnterAddPlaceMode}
            >
              Stage place from canvas click
            </button>
            <button
              type="button"
              class="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50"
              onClick={props.onResetViewport}
            >
              Reset view
            </button>
          </div>
        </div>

        <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
          <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
            Pending change
          </p>
          <p class="mt-3 leading-6">
            {describePendingTransformation(props.pendingTransformation())}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full bg-sky-300 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={props.pendingTransformation().kind === 'none'}
              onClick={props.onCommitPendingChange}
            >
              Commit change
            </button>
            <button
              type="button"
              class="rounded-full border border-stone-700 px-4 py-2 text-sm text-stone-200 transition hover:border-stone-500 hover:text-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={props.pendingTransformation().kind === 'none'}
              onClick={props.onRejectPendingChange}
            >
              Reject change
            </button>
          </div>
          <Show when={props.operationMessage()}>
            {(message) => (
              <p class="mt-3 text-xs text-amber-200">{message()}</p>
            )}
          </Show>
        </div>

        <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
          <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
            Selection
          </p>
          <Show
            when={props.activePlace()}
            fallback={
              <p class="mt-3 text-stone-400">Select a place to inspect it.</p>
            }
          >
            {(place) => (
              <div class="mt-3 space-y-2">
                <p class="text-lg text-stone-50">
                  {place().name ?? place().id}
                </p>
                <p>x: {Math.round(place().x)}</p>
                <p>y: {Math.round(place().y)}</p>
                <p>{place().isDraft ? 'Draft place' : 'Persisted place'}</p>
                <Show when={place().isMarkedForDeletion}>
                  <p class="text-rose-300">Marked for deletion</p>
                </Show>
                <button
                  type="button"
                  class="mt-2 rounded-full border border-rose-500/50 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!props.canStageDelete()}
                  onClick={props.onStageDelete}
                >
                  {place().isDraft ? 'Reject draft place' : 'Stage delete'}
                </button>
              </div>
            )}
          </Show>
        </div>

        <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
          <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
            Viewport
          </p>
          <p class="mt-3">Scale: {props.viewport().scale.toFixed(3)}x</p>
          <p class="mt-1">
            Offset: {Math.round(props.viewport().x)},{' '}
            {Math.round(props.viewport().y)}
          </p>
          <p class="mt-1">Selected: {props.selectedPlaceId() ?? 'none'}</p>
        </div>

        <div class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-sm text-stone-300">
          <p class="text-xs uppercase tracking-[0.24em] text-stone-500">
            History
          </p>
          <div class="mt-3 space-y-2">
            <For each={[...props.transformations()].reverse().slice(0, 8)}>
              {(transformation) => (
                <div class="rounded-xl border border-stone-800 bg-stone-950/70 p-3">
                  <p class="text-sm text-stone-100">
                    #{transformation.sequence} {transformation.kind}
                  </p>
                  <p class="mt-1 text-xs text-stone-400">
                    {new Date(transformation.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </For>
            <Show when={props.transformations().length === 0}>
              <p class="text-stone-400">No committed transformations yet.</p>
            </Show>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlaceInspector;
