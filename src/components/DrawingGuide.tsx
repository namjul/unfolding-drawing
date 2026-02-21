import type { Accessor, Component } from 'solid-js';
import type { PlaceId } from '../lib/evolu-db';

export type GuideStep =
  | 'observe'
  | 'select'
  | 'transform'
  | 'execute'
  | 'complete';

export type TransformChoice = 'add' | 'move' | 'delete' | null;

interface DrawingGuideProps {
  step: Accessor<GuideStep>;
  selectedPlaceId: PlaceId | null;
  transformChoice: TransformChoice;
  onStepObserve: () => void;
  onStepSelect: () => void;
  onStepSelectToTransform?: () => void;
  onStepTransformToExecute?: () => void;
  onStepExecuteToComplete?: () => void;
  onSelectCanvas: () => void;
  onTransformChoice: (choice: TransformChoice) => void;
  onCommit: () => void;
  onReject: () => void;
  onReset: () => void;
  hasDrawingPaneSelected: boolean;
  pendingAdd: boolean;
  pendingMove: boolean;
}

const PHASES = [
  { id: 'observe' as const, label: '1. Observe' },
  { id: 'select' as const, label: '2. Select' },
  { id: 'transform' as const, label: '3. Transform' },
  { id: 'execute' as const, label: '4. Execute / Complete' },
] as const;

const DrawingGuide: Component<DrawingGuideProps> = (props) => {
  const step = (): GuideStep => props.step();

  const stepToPhase = () => {
    const s = step();
    if (s === 'observe') return 'observe';
    if (s === 'select') return 'select';
    if (s === 'transform') return 'transform';
    if (s === 'execute' || s === 'complete') return 'execute';
    return 'observe';
  };

  const currentPhase = stepToPhase;

  const collapsedSummary = (phaseId: (typeof PHASES)[number]['id']) => {
    if (phaseId === 'observe')
      return currentPhase() !== 'observe' ? 'Continued' : null;
    if (phaseId === 'select') {
      if (props.hasDrawingPaneSelected) return 'Canvas (Drawing Pane)';
      if (props.selectedPlaceId) return 'Place';
      return null;
    }
    if (phaseId === 'transform') {
      if (props.transformChoice === 'add') return 'Add Place';
      if (props.transformChoice === 'move') return 'Move Place';
      if (props.transformChoice === 'delete') return 'Delete Place';
      return null;
    }
    if (phaseId === 'execute') {
      if (step() === 'complete') return 'Commit / Reject';
      if (step() === 'execute') {
        if (props.transformChoice === 'add') return 'Click to add';
        if (props.transformChoice === 'move') return 'Drag to move';
        if (props.transformChoice === 'delete') return 'Confirm delete';
      }
      return null;
    }
    return null;
  };

  return (
    <div class="flex flex-col gap-1">
      <h3 class="font-medium text-slate-700 mb-2">Drawing Guide</h3>

      {PHASES.map((p) => {
        const cp = currentPhase();
        const isExpanded = cp === p.id;
        const summary = collapsedSummary(p.id);
        const isPast =
          (p.id === 'observe' && cp !== 'observe') ||
          (p.id === 'select' && ['transform', 'execute'].includes(cp)) ||
          (p.id === 'transform' && cp === 'execute');

        return (
          <div
            class="border border-sky-200 rounded overflow-hidden"
            classList={{ 'bg-sky-50/50': isPast }}
          >
            <div
              class={`px-2 py-1.5 flex justify-between items-center text-sm ${
                isExpanded ? 'bg-sky-200 font-medium' : 'bg-sky-50'
              } ${isPast ? 'text-slate-500' : 'text-slate-700'}`}
            >
              <span>{p.label}</span>
              {!isExpanded && summary && (
                <span class="text-xs text-slate-500 ml-2">— {summary}</span>
              )}
            </div>
            <div
              class="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out items-start"
              style={{
                'grid-template-rows': isExpanded ? 'auto' : '0fr',
              }}
            >
              <div class="min-h-0 overflow-hidden">
                <div class="border-t border-sky-200 px-2 py-2 bg-white">
                  {p.id === 'observe' && (
                    <div class="flex flex-col gap-2">
                      <p class="text-sm text-slate-600">
                        Look at the drawing. What would you like to do?
                      </p>
                      <button
                        type="button"
                        class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                        onClick={props.onStepSelect}
                      >
                        Continue — Select
                      </button>
                    </div>
                  )}

                  {p.id === 'select' && (
                    <div class="flex flex-col gap-2">
                      <p class="text-sm text-slate-600">
                        Choose what to select:
                      </p>
                      <div class="flex flex-col gap-2">
                        <button
                          type="button"
                          class={`px-3 py-2 rounded text-sm text-left ${
                            props.hasDrawingPaneSelected
                              ? 'bg-sky-400 text-white'
                              : 'bg-sky-100 hover:bg-sky-200'
                          }`}
                          onClick={props.onSelectCanvas}
                        >
                          Select Canvas (Drawing Pane)
                        </button>
                        <p class="text-xs text-slate-500">— or —</p>
                        <p class="text-sm text-slate-600">
                          Click a Place on the canvas to select it.
                        </p>
                      </div>
                      {(props.hasDrawingPaneSelected ||
                        props.selectedPlaceId) && (
                        <button
                          type="button"
                          class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                          onClick={() => props.onStepSelectToTransform?.()}
                        >
                          Continue
                        </button>
                      )}
                      <button
                        type="button"
                        class="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                        onClick={props.onReset}
                      >
                        Back
                      </button>
                    </div>
                  )}

                  {p.id === 'transform' && (
                    <div class="flex flex-col gap-2">
                      <p class="text-sm text-slate-600">
                        Choose a transformation:
                      </p>
                      <div class="flex flex-col gap-1">
                        <button
                          type="button"
                          class={`px-3 py-2 rounded text-sm text-left ${
                            props.transformChoice === 'add'
                              ? 'bg-sky-400 text-white'
                              : 'bg-sky-100 hover:bg-sky-200'
                          }`}
                          onClick={() => props.onTransformChoice('add')}
                          disabled={
                            !props.hasDrawingPaneSelected &&
                            !props.selectedPlaceId
                          }
                        >
                          Add Place
                        </button>
                        <button
                          type="button"
                          class={`px-3 py-2 rounded text-sm text-left ${
                            props.transformChoice === 'move'
                              ? 'bg-sky-400 text-white'
                              : 'bg-sky-100 hover:bg-sky-200'
                          }`}
                          onClick={() => props.onTransformChoice('move')}
                          disabled={!props.selectedPlaceId}
                        >
                          Move Place
                        </button>
                        <button
                          type="button"
                          class={`px-3 py-2 rounded text-sm text-left ${
                            props.transformChoice === 'delete'
                              ? 'bg-sky-400 text-white'
                              : 'bg-sky-100 hover:bg-sky-200'
                          }`}
                          onClick={() => props.onTransformChoice('delete')}
                          disabled={!props.selectedPlaceId}
                        >
                          Delete Place
                        </button>
                      </div>
                      {props.transformChoice && (
                        <button
                          type="button"
                          class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                          onClick={() => props.onStepTransformToExecute?.()}
                        >
                          Continue
                        </button>
                      )}
                      <button
                        type="button"
                        class="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                        onClick={props.onReset}
                      >
                        Back
                      </button>
                    </div>
                  )}

                  {p.id === 'execute' && step() === 'execute' && (
                    <div class="flex flex-col gap-2">
                      {props.transformChoice === 'add' && (
                        <>
                          <p class="text-sm text-slate-600">
                            Click anywhere on the canvas to add a Place. Drag to
                            reposition. Continue when ready.
                          </p>
                          {props.pendingAdd ? (
                            <button
                              type="button"
                              class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                              onClick={() => props.onStepExecuteToComplete?.()}
                            >
                              Continue
                            </button>
                          ) : null}
                        </>
                      )}
                      {props.transformChoice === 'move' && (
                        <>
                          <p class="text-sm text-slate-600">
                            Drag the selected Place to move it. Continue when
                            ready.
                          </p>
                          {props.pendingMove ? (
                            <button
                              type="button"
                              class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                              onClick={() => props.onStepExecuteToComplete?.()}
                            >
                              Continue
                            </button>
                          ) : null}
                        </>
                      )}
                      {props.transformChoice === 'delete' && (
                        <>
                          <p class="text-sm text-slate-600">
                            This place will be deleted. Continue to confirm.
                          </p>
                          <button
                            type="button"
                            class="px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm"
                            onClick={() => props.onStepExecuteToComplete?.()}
                          >
                            Continue
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        class="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                        onClick={props.onReset}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {p.id === 'execute' && step() === 'complete' && (
                    <div class="flex flex-col gap-2">
                      <p class="text-sm text-slate-600">
                        Complete the transformation:
                      </p>
                      <div class="flex gap-2">
                        <button
                          type="button"
                          class="px-3 py-2 bg-green-200 hover:bg-green-300 rounded text-sm"
                          onClick={props.onCommit}
                        >
                          Commit
                        </button>
                        <button
                          type="button"
                          class="px-3 py-2 bg-red-100 hover:bg-red-200 rounded text-sm"
                          onClick={props.onReject}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DrawingGuide;
