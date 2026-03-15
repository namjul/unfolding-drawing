import type { Accessor } from 'solid-js';
import { createSignal } from 'solid-js';
import type { PersistedPlace, TransformationEntry } from './drawing/types';
import type { InteractionState } from './interaction-state';
import { Json, useEvolu } from './lib/evolu-db';

interface CreateDrawingOpsProps {
  interaction: InteractionState;
  places: Accessor<ReadonlyArray<PersistedPlace>>;
  transformations: Accessor<ReadonlyArray<TransformationEntry>>;
}

export const createDrawingOps = ({
  interaction,
  places,
  transformations,
}: CreateDrawingOpsProps) => {
  const evolu = useEvolu();
  const [operationMessage, setOperationMessage] = createSignal<string | null>(
    null,
  );

  const getNextSequence = () => {
    const currentTransformations = transformations();
    const latestTransformation =
      currentTransformations[currentTransformations.length - 1];

    return (latestTransformation?.sequence ?? 0) + 1;
  };

  const recordTransformation = (
    kind: 'addPlace' | 'movePlace' | 'deletePlace',
    payload: object,
  ) => {
    const serializedPayloadResult = Json.from(JSON.stringify(payload));

    if (!serializedPayloadResult.ok) {
      setOperationMessage('Unable to serialize transformation payload.');
      return false;
    }

    const result = evolu.insert('transformation', {
      kind,
      payload: serializedPayloadResult.value,
      sequence: getNextSequence(),
      timestamp: Date.now(),
    });

    if (!result.ok) {
      setOperationMessage('Unable to record transformation history.');
      return false;
    }

    return true;
  };

  const commitPending = () => {
    const pending = interaction.pendingTransformation();

    if (pending.kind === 'none') {
      return;
    }

    switch (pending.kind) {
      case 'addPlace': {
        const result = evolu.insert('place', {
          angle: pending.place.angle,
          name: pending.place.name,
          parentPlaceId: pending.place.parentPlaceId,
          placementMode: pending.place.placementMode,
          x: pending.place.x,
          y: pending.place.y,
        });

        if (!result.ok) {
          setOperationMessage('Unable to commit the staged place.');
          return;
        }

        recordTransformation('addPlace', {
          placeId: result.value.id,
          x: pending.place.x,
          y: pending.place.y,
        });
        interaction.setSelectionTarget({
          kind: 'place',
          placeId: result.value.id,
        });
        interaction.setHoveredPlaceId(result.value.id);
        interaction.rejectPending();
        interaction.setSelectionTarget({
          kind: 'place',
          placeId: result.value.id,
        });
        setOperationMessage('Place committed to local persistence.');
        return;
      }
      case 'movePlace': {
        const result = evolu.update('place', {
          id: pending.placeId,
          x: pending.to.x,
          y: pending.to.y,
        });

        if (!result.ok) {
          setOperationMessage('Unable to commit the staged move.');
          return;
        }

        recordTransformation('movePlace', {
          from: pending.from,
          placeId: pending.placeId,
          to: pending.to,
        });
        interaction.rejectPending();
        interaction.setSelectionTarget({
          kind: 'place',
          placeId: pending.placeId,
        });
        interaction.setHoveredPlaceId(pending.placeId);
        setOperationMessage('Place move committed to local persistence.');
        return;
      }
      case 'deletePlace': {
        const deletedPlace =
          places().find((place) => place.id === pending.placeId) ?? null;
        const result = evolu.update('place', {
          id: pending.placeId,
          isDeleted: true,
        });

        if (!result.ok) {
          setOperationMessage('Unable to commit the staged deletion.');
          return;
        }

        recordTransformation('deletePlace', {
          placeId: pending.placeId,
          x: deletedPlace?.x ?? null,
          y: deletedPlace?.y ?? null,
        });
        interaction.rejectPending();
        interaction.setSelectionTarget({ kind: 'canvas' });
        interaction.setHoveredPlaceId(null);
        setOperationMessage('Place deletion committed to local persistence.');
      }
    }
  };

  return {
    commitPending,
    operationMessage,
  };
};
