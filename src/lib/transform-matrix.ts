import type { PlaceId } from './evolu-db';

export type SelectionType = 'drawingPane' | 'place';

export type TransformId = 'add' | 'addRelated' | 'move' | 'delete' | 'rotate';

export type TransformChoice = TransformId | null;

export interface TransformDef {
  id: TransformId;
  label: string;
  allowedSelectionTypes: readonly SelectionType[];
}

/**
 * Edit this array to add/remove transforms or change which selection types
 * each transform is available for.
 */
export const TRANSFORMS: readonly TransformDef[] = [
  { id: 'add', label: 'Add Place', allowedSelectionTypes: ['drawingPane'] },
  {
    id: 'addRelated',
    label: 'Add a Related Place',
    allowedSelectionTypes: ['place'],
  },
  { id: 'move', label: 'Move Place', allowedSelectionTypes: ['place'] },
  { id: 'delete', label: 'Delete Place', allowedSelectionTypes: ['place'] },
  { id: 'rotate', label: 'Rotate Place', allowedSelectionTypes: ['place'] },
];

/**
 * Maps current App selection state to a selection type.
 */
export function getSelectionType(
  hasDrawingPaneSelected: boolean,
  selectedPlaceId: PlaceId | null,
): SelectionType | null {
  if (hasDrawingPaneSelected) return 'drawingPane';
  if (selectedPlaceId) return 'place';
  return null;
}

/**
 * Returns transforms available for the given selection type.
 */
export function availableTransforms(
  selectionType: SelectionType | null,
): readonly TransformDef[] {
  if (!selectionType) return [];
  return TRANSFORMS.filter((t) =>
    t.allowedSelectionTypes.includes(selectionType),
  );
}
