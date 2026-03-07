import type { Accessor, Component } from 'solid-js';
import { createEffect, createSignal } from 'solid-js';
import type {
  AxisId,
  BendingCircularFieldId,
  CircularFieldId,
  CircularRepeaterId,
  LineSegmentId,
  PlaceId,
} from '../lib/evolu-db';
import type { TransformChoice } from '../lib/transform-matrix';
import { classes, collapseContentStyle } from '../styles/tokens';
import ViewControls from './ViewControls';

export type GuideStep =
  | 'observe'
  | 'select'
  | 'transform'
  | 'execute'
  | 'complete';

export type { TransformChoice };

type Mode = 'default' | 'pan';

interface DrawingGuideProps {
  step: Accessor<GuideStep>;
  selectedPlaceId: PlaceId | null;
  selectedLineSegmentId: LineSegmentId | null;
  selectedCircularFieldId: CircularFieldId | null;
  selectedBendingCircularFieldId: BendingCircularFieldId | null;
  selectedAxisId: AxisId | null;
  selectedCircularRepeaterId: CircularRepeaterId | null;
  transformChoice: TransformChoice;
  onStepObserve: () => void;
  onStepSelect: () => void;
  onRequestStep?: (step: GuideStep) => void;
  onCancelSelection?: () => void;
  onSelectCanvas: () => void;
  onTransformChoice: (choice: TransformChoice) => void;
  onCommit: () => void;
  onReject: () => void;
  onReset: () => void;
  hasDrawingPaneSelected: boolean;
  pendingAdd: boolean;
  pendingMove: boolean;
  pendingRotate: boolean;
  pendingAddLine: boolean;
  pendingAddCircularField: boolean;
  pendingModifyCircularField: boolean;
  pendingDeleteLineId: boolean;
  pendingDeleteCircularFieldId: boolean;
  pendingDeleteBendingCircularFieldId: boolean;
  pendingMoveBendingCircularField: boolean;
  draggingBendingCircularFieldRadius: boolean;
  pendingBendAtEndsDirty: boolean;
  pendingSplitLine: boolean;
  pendingAddAxis: boolean;
  pendingModifyAxis: boolean;
  pendingDeleteAxisId: boolean;
  pendingAddPlaceOnAxis: boolean;
  pendingAddPlaceOnCircularField: boolean;
  pendingAddCircularRepeater: boolean;
  pendingModifyCircularRepeater: boolean;
  pendingAddPlaceOnCircularRepeater: boolean;
  pendingModifyPlaceOnCircularRepeater: boolean;
  pendingDeleteCircularRepeaterId: boolean;
  circularRepeaterCount: number;
  onRepeaterCountChange: (count: number) => void;
  bendAtEndsState: {
    endALabel: string;
    endBLabel: string;
    hasBendAtA: boolean;
    hasBendAtB: boolean;
    onToggleBendAtA: () => void;
    onToggleBendAtB: () => void;
  } | null;
  axisDirection: {
    isBidirectional: boolean;
    onDirectionChange: (isBidirectional: boolean) => void;
  } | null;
  availableTransforms: readonly {
    id: NonNullable<TransformChoice>;
    label: string;
  }[];
  // ViewControls props for Observation container
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

const DrawingGuide: Component<DrawingGuideProps> = (props) => {
  const step = (): GuideStep => props.step();

  const [selectionExpanded, setSelectionExpanded] = createSignal(true);
  const [transformationExpanded, setTransformationExpanded] =
    createSignal(true);
  const [detailsExpanded, setDetailsExpanded] = createSignal(true);

  // Sync expand/collapse to step when step() changes
  createEffect(() => {
    const s = step();
    if (s === 'observe' || s === 'select') {
      setSelectionExpanded(true);
      setTransformationExpanded(false);
      setDetailsExpanded(false);
    } else if (s === 'transform') {
      setSelectionExpanded(false);
      setTransformationExpanded(true);
      setDetailsExpanded(false);
    } else if (s === 'execute' || s === 'complete') {
      setSelectionExpanded(false);
      setTransformationExpanded(false);
      setDetailsExpanded(true);
    }
  });

  const currentStepPane = (): 'selection' | 'transformation' | 'details' => {
    const s = step();
    if (s === 'observe' || s === 'select') return 'selection';
    if (s === 'transform') return 'transformation';
    return 'details';
  };

  const selectionSubtitle = () => {
    if (props.hasDrawingPaneSelected) return 'Canvas (Drawing Pane)';
    if (props.selectedPlaceId) return 'Place';
    if (props.selectedLineSegmentId) return 'Line segment';
    if (props.selectedCircularFieldId) return 'Circular field';
    if (props.selectedBendingCircularFieldId) return 'Bending field';
    if (props.selectedAxisId) return 'Axis';
    if (props.selectedCircularRepeaterId) return 'Circular repeater';
    return 'Select the object you want to change?';
  };

  const transformationSubtitle = () => {
    if (props.transformChoice === 'add') return 'Add Place';
    if (props.transformChoice === 'addRelated') return 'Add a Related Place';
    if (props.transformChoice === 'addLine') return 'Add Line';
    if (props.transformChoice === 'move') return 'Move Place';
    if (props.transformChoice === 'moveCircularField')
      return 'Move Circular Field';
    if (props.transformChoice === 'modifyCircularField')
      return 'Modify Circular Field';
    if (props.transformChoice === 'delete') return 'Delete Place';
    if (props.transformChoice === 'deleteLine') return 'Delete Line';
    if (props.transformChoice === 'deleteCircularField')
      return 'Delete Circular Field';
    if (props.transformChoice === 'rotate') return 'Rotate Place';
    if (props.transformChoice === 'addCircularField')
      return 'Add Circular Field';
    if (props.transformChoice === 'bendAtEnds') return 'Bend at ends';
    if (props.transformChoice === 'modifyBendingCircularField')
      return 'Modify bending field';
    if (props.transformChoice === 'deleteBendingCircularField')
      return 'Delete bending field';
    if (props.transformChoice === 'addAxis') return 'Add Axis';
    if (props.transformChoice === 'modifyAxis') return 'Modify Axis';
    if (props.transformChoice === 'deleteAxis') return 'Delete Axis';
    if (props.transformChoice === 'addPlaceOnAxis') return 'Add place on axis';
    if (props.transformChoice === 'addPlaceOnCircularField')
      return 'Add place on circular field';
    if (props.transformChoice === 'addCircularRepeater')
      return 'Add Circular Repeater';
    if (props.transformChoice === 'modifyCircularRepeater')
      return 'Modify Circular Repeater';
    if (props.transformChoice === 'deleteCircularRepeater')
      return 'Delete Circular Repeater';
    if (props.transformChoice === 'addPlaceOnCircularRepeater')
      return 'Add place on repeater';
    if (props.transformChoice === 'modifyPlaceOnCircularRepeater')
      return 'Move Place';
    return 'Select the change you want to make.';
  };

  const hasChanges = () => {
    const s = step();
    if (s === 'complete') return true;
    if (s !== 'execute') return false;
    return !!(
      props.pendingAdd ||
      props.pendingMove ||
      props.pendingRotate ||
      props.pendingAddCircularField ||
      props.pendingModifyCircularField ||
      props.pendingDeleteLineId ||
      props.pendingDeleteCircularFieldId ||
      props.transformChoice === 'delete' ||
      props.transformChoice === 'deleteLine' ||
      props.transformChoice === 'deleteCircularField' ||
      props.pendingDeleteBendingCircularFieldId ||
      props.pendingMoveBendingCircularField ||
      props.draggingBendingCircularFieldRadius ||
      props.pendingBendAtEndsDirty ||
      props.transformChoice === 'deleteBendingCircularField' ||
      (props.transformChoice === 'bendAtEnds' &&
        (props.pendingMoveBendingCircularField ||
          props.draggingBendingCircularFieldRadius)) ||
      (props.transformChoice === 'addLine' && !props.pendingAddLine) ||
      props.pendingSplitLine ||
      props.pendingAddAxis ||
      props.pendingModifyAxis ||
      props.pendingDeleteAxisId ||
      props.pendingAddPlaceOnAxis ||
      props.pendingAddPlaceOnCircularField ||
      props.pendingAddCircularRepeater ||
      props.pendingModifyCircularRepeater ||
      props.pendingAddPlaceOnCircularRepeater ||
      props.pendingModifyPlaceOnCircularRepeater ||
      props.pendingDeleteCircularRepeaterId
    );
  };

  return (
    <div class={classes.guideRoot}>
      <h3 class={classes.guideTitle}>Drawing Guide</h3>

      {/* Container 1 – Observation: always visible, no collapse */}
      <div class={classes.observationContainer}>
        <div class={classes.observationHeader}>Observation</div>
        <div class={classes.observationBody}>
          <ViewControls
            scale={props.scale}
            onZoomIn={props.onZoomIn}
            onZoomOut={props.onZoomOut}
            onResetZoom={props.onResetZoom}
            canZoomIn={props.canZoomIn}
            canZoomOut={props.canZoomOut}
            mode={props.mode}
            onTogglePan={props.onTogglePan}
            onResetDrawing={props.onResetDrawing}
          />
          <p class={`${classes.guideText} mt-2`}>
            Look at the drawing. What would you like to do?
          </p>
        </div>
      </div>

      {/* Container 2 – Selection */}
      <div
        class={classes.guideContainer}
        classList={{
          [classes.guideContainerCurrent]: currentStepPane() === 'selection',
          [classes.guideContainerInactive]: currentStepPane() !== 'selection',
        }}
      >
        <button
          type="button"
          class={classes.guideHeaderButton}
          classList={{
            [classes.guideHeaderCurrent]: currentStepPane() === 'selection',
            [classes.guideHeaderInactive]: currentStepPane() !== 'selection',
          }}
          onClick={() => {
            const next = !selectionExpanded();
            setSelectionExpanded(next);
            if (next) {
              setTransformationExpanded(false);
              setDetailsExpanded(false);
              props.onRequestStep?.('select');
            }
          }}
        >
          <span class="font-medium">Selection</span>
          <span class={classes.guideHeaderSubtitle}>{selectionSubtitle()}</span>
          <span class="shrink-0 ml-1">{selectionExpanded() ? '▼' : '▶'}</span>
        </button>
        <div
          class={classes.guideCollapseTransition}
          style={collapseContentStyle(selectionExpanded())}
        >
          <div class={classes.guideBody}>
            <div class={classes.guideBodyBorder}>
              <p class={classes.guideText}>
                Select a drawing object on the canvas or
              </p>
              <button
                type="button"
                class={
                  props.hasDrawingPaneSelected
                    ? classes.buttonSelectCanvasSelected
                    : classes.buttonSelectCanvas
                }
                onClick={props.onSelectCanvas}
              >
                select canvas
              </button>
              <p class={classes.guideTextMuted}>
                — or click a Place or a line segment on the canvas to select it.
              </p>
              {(props.hasDrawingPaneSelected ||
                props.selectedPlaceId ||
                props.selectedLineSegmentId ||
                props.selectedCircularFieldId ||
                props.selectedBendingCircularFieldId ||
                props.selectedAxisId ||
                props.selectedCircularRepeaterId) && (
                <button
                  type="button"
                  class={classes.buttonCancelSelection}
                  onClick={() => props.onCancelSelection?.()}
                >
                  Cancel selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container 3 – Transformation */}
      <div
        class={classes.guideContainer}
        classList={{
          [classes.guideContainerCurrent]:
            currentStepPane() === 'transformation',
          [classes.guideContainerInactive]:
            currentStepPane() !== 'transformation',
        }}
      >
        <button
          type="button"
          class={classes.guideHeaderButton}
          classList={{
            [classes.guideHeaderCurrent]:
              currentStepPane() === 'transformation',
            [classes.guideHeaderInactive]:
              currentStepPane() !== 'transformation',
          }}
          onClick={() => {
            const next = !transformationExpanded();
            setTransformationExpanded(next);
            if (next) {
              setSelectionExpanded(false);
              setDetailsExpanded(false);
              props.onRequestStep?.('transform');
            }
          }}
        >
          <span class="font-medium">Transformation</span>
          <span class={classes.guideHeaderSubtitle}>
            {transformationSubtitle()}
          </span>
          <span class="shrink-0 ml-1">
            {transformationExpanded() ? '▼' : '▶'}
          </span>
        </button>
        <div
          class={classes.guideCollapseTransition}
          style={collapseContentStyle(transformationExpanded())}
        >
          <div class={classes.guideBody}>
            <div class={classes.guideBodyBorder}>
              <p class={classes.guideText}>Choose a transformation:</p>
              <div class="flex flex-col gap-1 mt-2">
                {props.availableTransforms.map((t) => (
                  <button
                    type="button"
                    class={
                      props.transformChoice === t.id
                        ? classes.buttonTransformationSelected
                        : classes.buttonTransformation
                    }
                    onClick={() => props.onTransformChoice(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Container 4 – Transformation Details */}
      <div
        class={classes.guideContainer}
        classList={{
          [classes.guideContainerCurrent]: currentStepPane() === 'details',
          [classes.guideContainerInactive]: currentStepPane() !== 'details',
        }}
      >
        <button
          type="button"
          class={classes.guideHeaderButton}
          classList={{
            [classes.guideHeaderCurrent]: currentStepPane() === 'details',
            [classes.guideHeaderInactive]: currentStepPane() !== 'details',
          }}
          onClick={() => {
            const next = !detailsExpanded();
            setDetailsExpanded(next);
            if (next) {
              setSelectionExpanded(false);
              setTransformationExpanded(false);
              props.onRequestStep?.('execute');
            }
          }}
        >
          <span class="font-medium">Transformation Details</span>
          <span class="shrink-0 ml-1">{detailsExpanded() ? '▼' : '▶'}</span>
        </button>
        <div
          class={classes.guideCollapseTransition}
          style={collapseContentStyle(detailsExpanded())}
        >
          <div class={classes.guideBody}>
            <div class={classes.guideBodyBorder}>
              {step() === 'execute' && (
                <>
                  {(props.transformChoice === 'add' ||
                    props.transformChoice === 'addRelated') && (
                    <p class={classes.guideText}>
                      {props.transformChoice === 'addRelated'
                        ? 'Click to add a related Place (child of selected). Drag to reposition.'
                        : 'Click anywhere on the canvas to add a Place. Drag to reposition.'}
                    </p>
                  )}
                  {props.transformChoice === 'move' && (
                    <p class={classes.guideText}>
                      Drag the selected Place to move it.
                    </p>
                  )}
                  {props.transformChoice === 'delete' && (
                    <p class={classes.guideText}>This place will be deleted.</p>
                  )}
                  {props.transformChoice === 'addLine' && (
                    <p class={classes.guideText}>
                      Click on a place or the canvas to place the other end. If
                      you placed a new place, drag it to reposition.
                    </p>
                  )}
                  {props.transformChoice === 'deleteLine' && (
                    <p class={classes.guideText}>This line will be deleted.</p>
                  )}
                  {props.transformChoice === 'rotate' && (
                    <p class={classes.guideText}>
                      Drag the orientation axis to rotate. Related places will
                      rotate around this place.
                    </p>
                  )}
                  {props.transformChoice === 'addCircularField' && (
                    <p class={classes.guideText}>
                      Set center (click canvas or use existing place), then drag
                      the radius handle to resize. Keep or discard when done.
                    </p>
                  )}
                  {props.transformChoice === 'moveCircularField' && (
                    <p class={classes.guideText}>
                      Click inside the circle and drag to move its center (the
                      parent place). Keep or discard when done.
                    </p>
                  )}
                  {props.transformChoice === 'modifyCircularField' && (
                    <p class={classes.guideText}>
                      Drag the radius handle to change the circle size. Keep or
                      discard when done.
                    </p>
                  )}
                  {props.transformChoice === 'deleteCircularField' && (
                    <p class={classes.guideText}>
                      The circular field will be removed. Keep to confirm or
                      discard to cancel.
                    </p>
                  )}
                  {props.transformChoice === 'modifyBendingCircularField' && (
                    <p class={classes.guideText}>
                      Drag the circle center to move the bending field, or drag
                      the radius handle (opposite the line end) to change its
                      radius. Keep or discard when done.
                    </p>
                  )}
                  {props.transformChoice === 'deleteBendingCircularField' && (
                    <p class={classes.guideText}>
                      The bending field will be removed. Keep to confirm or
                      discard to cancel.
                    </p>
                  )}
                  {(props.transformChoice === 'addAxis' ||
                    props.transformChoice === 'modifyAxis') &&
                    props.axisDirection && (
                      <>
                        <p class={classes.guideText}>
                          Drag the axis to set its orientation. Choose whether
                          the axis extends in both directions or one direction
                          only.
                        </p>
                        <div class="mt-3 flex flex-col gap-2">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="axis-direction"
                              checked={props.axisDirection.isBidirectional}
                              onChange={() =>
                                props.axisDirection?.onDirectionChange(true)
                              }
                              class="rounded-full border-slate-300"
                            />
                            <span class="text-sm">Both directions</span>
                          </label>
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="axis-direction"
                              checked={!props.axisDirection.isBidirectional}
                              onChange={() =>
                                props.axisDirection?.onDirectionChange(false)
                              }
                              class="rounded-full border-slate-300"
                            />
                            <span class="text-sm">One direction</span>
                          </label>
                        </div>
                      </>
                    )}
                  {(props.transformChoice === 'addCircularRepeater' ||
                    props.transformChoice === 'modifyCircularRepeater') && (
                    <>
                      <p class={classes.guideText}>
                        {props.transformChoice === 'addCircularRepeater'
                          ? 'Set the number of axes (repetitions) that will emanate from the place.'
                          : 'Change the number of axes.'}
                      </p>
                      <div class="mt-3 flex items-center gap-2">
                        <label class="text-sm" for="repeater-count">
                          Number of axes
                        </label>
                        <input
                          id="repeater-count"
                          type="number"
                          min={2}
                          max={24}
                          value={props.circularRepeaterCount}
                          onInput={(e) => {
                            const n = Number(
                              (e.target as HTMLInputElement).value,
                            );
                            if (Number.isFinite(n))
                              props.onRepeaterCountChange(n);
                          }}
                          class="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </>
                  )}
                  {(props.transformChoice === 'addPlaceOnCircularRepeater' ||
                    props.transformChoice ===
                      'modifyPlaceOnCircularRepeater') && (
                    <p class={classes.guideText}>
                      {props.transformChoice === 'addPlaceOnCircularRepeater'
                        ? 'Click to set position; drag to move. Keep to add a place on every axis.'
                        : 'Drag any echo to move all together.'}
                    </p>
                  )}
                  {props.transformChoice === 'deleteCircularRepeater' && (
                    <p class={classes.guideText}>
                      The circular repeater and its axes will be removed. Keep
                      to confirm or discard to cancel.
                    </p>
                  )}
                  {props.transformChoice === 'bendAtEnds' &&
                    props.bendAtEndsState && (
                      <>
                        <p class={classes.guideText}>
                          Turn on bending at one or both ends. When on, a
                          circular field appears at that end; move or resize it
                          to bend the line.
                        </p>
                        <div class="mt-3 flex flex-col gap-2">
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={props.bendAtEndsState.hasBendAtA}
                              onChange={() =>
                                props.bendAtEndsState?.onToggleBendAtA()
                              }
                              class="rounded border-slate-300"
                            />
                            <span class="text-sm">
                              Bend at {props.bendAtEndsState.endALabel}
                            </span>
                          </label>
                          <label class="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={props.bendAtEndsState.hasBendAtB}
                              onChange={() =>
                                props.bendAtEndsState?.onToggleBendAtB()
                              }
                              class="rounded border-slate-300"
                            />
                            <span class="text-sm">
                              Bend at {props.bendAtEndsState.endBLabel}
                            </span>
                          </label>
                        </div>
                      </>
                    )}
                </>
              )}

              {(step() === 'execute' || step() === 'complete') && (
                <div class={classes.guideDetailsActions}>
                  <div class={classes.guideDetailsActionsRow}>
                    <button
                      type="button"
                      class={classes.buttonKeep}
                      disabled={!hasChanges()}
                      onClick={props.onCommit}
                    >
                      keep the changes
                    </button>
                    <button
                      type="button"
                      class={classes.buttonDiscard}
                      disabled={!hasChanges()}
                      onClick={props.onReject}
                    >
                      discard the changes
                    </button>
                  </div>
                  <button
                    type="button"
                    class={classes.buttonBackReset}
                    onClick={props.onReset}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {step() !== 'execute' && step() !== 'complete' && (
                <p class="text-sm text-slate-500">
                  Select a transformation above, then follow the guidance here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingGuide;
