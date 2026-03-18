import { createEffect, createMemo, createSignal } from 'solid-js';
import Canvas from './canvas/PlaceCanvas';
import { createViewportToFit } from './canvas/viewport';
import { createDrawingOps } from './drawing-ops';
import { useDrawingState } from './drawing-state';
import DrawingGuideProps from './inspector/PlaceInspector';
import { createInteractionState } from './interaction-state';
import type { PlaceId } from './lib/evolu-db';

const App = () => {
  const drawing = useDrawingState();
  const interaction = createInteractionState();
  const drawingOps = createDrawingOps({
    places: drawing.places,
    transformations: drawing.transformations,
    interaction,
  });

  const [surfaceSize, setSurfaceSize] = createSignal({ width: 0, height: 0 });
  let hasInitializedViewport = false;

  const displayPlaces = createMemo(() =>
    drawing.deriveDisplayPlaces(interaction.pendingTransformation()),
  );

  const selectedPlace = createMemo(() => {
    const selectedPlaceId = interaction.selectedPlaceId();

    return (
      displayPlaces().find((place) => place.id === selectedPlaceId) ?? null
    );
  });

  const canStageDelete = createMemo(() => {
    const selected = selectedPlace();
    const pending = interaction.pendingTransformation();

    if (!selected) {
      return false;
    }

    if (selected.isDraft) {
      return pending.kind === 'addPlace';
    }

    return pending.kind === 'none';
  });

  const resetViewport = () => {
    const size = surfaceSize();

    if (size.width === 0 || size.height === 0) {
      return;
    }

    interaction.setViewport(
      createViewportToFit(
        drawing.getDisplayBounds(displayPlaces()),
        size.width,
        size.height,
      ),
    );
  };

  const handleStageDelete = () => {
    const selected = selectedPlace();

    if (!selected) {
      return;
    }

    if (selected.isDraft) {
      interaction.rejectPending();
      return;
    }

    interaction.stageDeletePlace(selected.id as PlaceId);
  };

  createEffect(() => {
    const size = surfaceSize();

    if (!hasInitializedViewport && drawing.placesLoaded()) {
      if (size.width > 0 && size.height > 0) {
        hasInitializedViewport = true;
        resetViewport();
      }
    }
  });

  return (
    <main class="flex gap-2 h-screen p-2 *:min-w-0">
      <section class="p-2 basis-1/5 shrink-0 max-w-80 bg-white flex flex-col overflow-auto">
        <DrawingGuideProps
          activePlace={selectedPlace}
          canStageDelete={canStageDelete}
          onCommitPendingChange={drawingOps.commitPending}
          onRejectPendingChange={interaction.rejectPending}
          onResetDrawing={drawingOps.resetDrawing}
          onResetViewport={resetViewport}
          onStageDelete={handleStageDelete}
          operationMessage={drawingOps.operationMessage}
          pendingTransformation={interaction.pendingTransformation}
          selectedPlaceId={interaction.selectedPlaceId}
          selectionTarget={interaction.selectionTarget}
          awaitingTransformationTarget={
            interaction.awaitingTransformationTarget
          }
          onBeginAddPlace={interaction.beginAddPlace}
          onBeginMovePlace={interaction.beginMovePlace}
          transformations={drawing.transformations}
          viewport={interaction.viewport}
        />
      </section>
      <section class="basis-1/5 grow min-h-0 flex flex-col ">
        <Canvas
          hoveredPlaceId={interaction.hoveredPlaceId}
          onSelectPlace={interaction.setSelectionTarget}
          onStageAddPlace={interaction.stageAddPlace}
          onStageMovePlace={interaction.stageMovePlace}
          onSurfaceSizeChange={setSurfaceSize}
          onUpdateHoverPlace={interaction.setHoveredPlaceId}
          onUpdateMovePlace={interaction.updatePendingMove}
          pendingTransformation={interaction.pendingTransformation}
          places={displayPlaces}
          selectedPlaceId={interaction.selectedPlaceId}
          selectionTarget={interaction.selectionTarget}
          awaitingTransformationTarget={
            interaction.awaitingTransformationTarget
          }
          onClearAwaitingTransformation={
            interaction.clearAwaitingTransformationTarget
          }
          setViewport={interaction.setViewport}
          viewport={interaction.viewport}
        />
      </section>
      <section class="p-2 basis-1/5 shrink-0 max-w-80 bg-white flex flex-col min-h-0">
        <p class="text-xs uppercase tracking-[0.3em]">Drawing DNA</p>
      </section>
    </main>
  );

  // return (
  //   <main class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(180deg,_#111827_0%,_#020617_56%,_#0f172a_100%)] px-4 py-4 text-stone-100 md:px-6">
  //     <div class="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
  //       <PlaceInspector
  //         activePlace={selectedPlace}
  //         canStageDelete={canStageDelete}
  //         onCommitPendingChange={drawingOps.commitPending}
  //         onEnterAddPlaceMode={interaction.enterAddPlaceMode}
  //         onRejectPendingChange={interaction.rejectPending}
  //         onResetViewport={resetViewport}
  //         onStageDelete={handleStageDelete}
  //         operationMessage={drawingOps.operationMessage}
  //         pendingTransformation={interaction.pendingTransformation}
  //         selectedPlaceId={interaction.selectedPlaceId}
  //         tool={interaction.tool}
  //         transformations={drawing.transformations}
  //         viewport={interaction.viewport}
  //       />
  //
  //       <PlaceCanvas
  //         hoveredPlaceId={interaction.hoveredPlaceId}
  //         onSelectPlace={interaction.setSelectedPlaceId}
  //         onStageAddPlace={interaction.stageAddPlace}
  //         onStageMovePlace={interaction.stageMovePlace}
  //         onSurfaceSizeChange={setSurfaceSize}
  //         onUpdateHoverPlace={interaction.setHoveredPlaceId}
  //         onUpdateMovePlace={interaction.updatePendingMove}
  //         pendingTransformation={interaction.pendingTransformation}
  //         places={displayPlaces}
  //         selectedPlaceId={interaction.selectedPlaceId}
  //         setViewport={interaction.setViewport}
  //         tool={interaction.tool}
  //         viewport={interaction.viewport}
  //       />
  //     </div>
  //   </main>
  // );
};

export default App;
