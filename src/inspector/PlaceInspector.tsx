import { type Accessor, For, type ParentComponent, Show } from 'solid-js';
import type { Viewport } from '../canvas/viewport';
import type {
  AwaitingTransformationTarget,
  DisplayPlace,
  PendingTransformationState,
  SelectionTarget,
  TransformationEntry,
} from '../drawing/types';

interface DrawingGuideProps {
  activePlace: Accessor<DisplayPlace | null>;
  canStageDelete: Accessor<boolean>;
  onCommitPendingChange: () => void;
  onRejectPendingChange: () => void;
  onResetDrawing: () => void;
  onResetViewport: () => void;
  onStageDelete: () => void;
  operationMessage: Accessor<string | null>;
  pendingTransformation: Accessor<PendingTransformationState>;
  places: Accessor<ReadonlyArray<DisplayPlace>>;
  selectedPlaceId: Accessor<string | null>;
  selectionTarget: Accessor<SelectionTarget>;
  awaitingTransformationTarget: Accessor<AwaitingTransformationTarget>;
  onBeginAddPlace: () => void;
  onBeginAddRelatedPlace: () => void;
  onBeginMovePlace: () => void;
  onSelectPlace: (target: SelectionTarget) => void;
  transformations: Accessor<ReadonlyArray<TransformationEntry>>;
  viewport: Accessor<Viewport>;
}

const describePendingTransformation = (
  pendingTransformation: PendingTransformationState,
) => {
  switch (pendingTransformation.kind) {
    case 'addPlace':
      return 'A new place is staged locally and not yet persisted.';
    case 'addRelatedPlace':
      return 'A new related place is staged with parent relationship. Commit to persist, or reject to discard.';
    case 'movePlace':
      return 'A place move is staged. Commit to persist, or reject to restore the last committed position.';
    case 'deletePlace':
      return 'A place is marked for deletion. Commit to persist the delete, or reject to keep it.';
    default:
      return 'No pending transformation.';
  }
};

const Button: ParentComponent<{
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}> = (props) => {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
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
  const handleResetDrawing = () => {
    const confirmed = confirm('Delete all places? This cannot be undone.');
    if (confirmed) {
      props.onResetDrawing();
    }
  };

  return (
    <div class="space-y-4">
      <p class="text-xs uppercase tracking-[0.3em]">Grawing Guide</p>

      <Panel title="Observation">
        <div class="flex flex-col gap-2">
          <Button
            onClick={handleResetDrawing}
            title="Delete all places and return to empty canvas"
          >
            Reset Drawing
          </Button>
          <Button onClick={props.onResetViewport}>Reset view</Button>
        </div>
        <p class="text-sm text-slate-600 mt-2">
          Look at the drawing. What would you like to do?
        </p>
      </Panel>

      <Panel title="Selection">
        <p class="text-sm text-slate-600 mt-2">
          Select a drawing object on the canvas or the canvas.
        </p>
        <Show
          when={props.selectionTarget().kind === 'place'}
          fallback={<p class="mt-3 text-slate-600">Canvas selected</p>}
        >
          <Show
            when={props.activePlace()}
            fallback={
              <p class="mt-3 text-rose-400">Selected place not found</p>
            }
          >
            {(place) => (
              <div class="mt-3">
                <p class="font-medium">
                  {place().name ?? `Place ${place().id.slice(0, 8)}`}
                </p>
                <p class="text-xs text-slate-500 mt-1">
                  Position: ({Math.round(place().x)}, {Math.round(place().y)})
                </p>
              </div>
            )}
          </Show>
        </Show>
      </Panel>

      <Panel title="Transformations">
        <Show
          when={props.awaitingTransformationTarget().kind === 'addRelatedPlace'}
          fallback={
            <Show
              when={props.selectionTarget().kind === 'canvas'}
              fallback={
                <div class="mt-3 flex flex-col gap-2">
                  <Button
                    disabled={props.pendingTransformation().kind !== 'none'}
                    onClick={props.onBeginAddRelatedPlace}
                  >
                    Add Related Place
                  </Button>
                  <Button
                    disabled={props.pendingTransformation().kind !== 'none'}
                    onClick={props.onBeginMovePlace}
                  >
                    Move Place
                  </Button>
                  <Button
                    disabled={!props.canStageDelete()}
                    onClick={props.onStageDelete}
                  >
                    Delete Place
                  </Button>
                </div>
              }
            >
              <div class="mt-3 flex flex-col gap-2">
                <Button
                  disabled={props.pendingTransformation().kind !== 'none'}
                  onClick={props.onBeginAddPlace}
                >
                  Add Place
                </Button>
              </div>
            </Show>
          }
        >
          <div class="mt-3 text-amber-700">
            <p>Click canvas to place child of selected place</p>
          </div>
        </Show>
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

      <Panel title="Place Details">
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
              <Show when={place().parentPlaceId}>
                <p class="text-sky-600">
                  Parent: {place().parentPlaceId?.slice(0, 8)}
                </p>
              </Show>
            </div>
          )}
        </Show>
      </Panel>

      <Panel title="Structure">
        <div class="mt-3 space-y-1">
          <For
            each={props
              .places()
              .filter((p) => !p.isDraft && !p.isMarkedForDeletion)}
          >
            {(place) => {
              const isRoot = place.parentPlaceId === null;
              const childCount = props
                .places()
                .filter(
                  (p) =>
                    p.parentPlaceId === place.id &&
                    !p.isDraft &&
                    !p.isMarkedForDeletion,
                ).length;
              const isSelected = props.selectedPlaceId() === place.id;

              return (
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      props.onSelectPlace({ kind: 'place', placeId: place.id })
                    }
                    class={`w-full text-left px-2 py-1 text-sm rounded hover:bg-sky-100 ${
                      isSelected ? 'bg-sky-200 font-medium' : ''
                    } ${isRoot ? '' : 'pl-6'}`}
                  >
                    {place.name ?? `Place ${place.id.slice(0, 8)}`}
                    {childCount > 0 && (
                      <span class="text-xs text-slate-500 ml-2">
                        ({childCount} {childCount === 1 ? 'child' : 'children'})
                      </span>
                    )}
                  </button>
                </div>
              );
            }}
          </For>
          <Show
            when={
              props.places().filter((p) => !p.isDraft && !p.isMarkedForDeletion)
                .length === 0
            }
          >
            <p class="text-stone-400">No places yet.</p>
          </Show>
        </div>
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
