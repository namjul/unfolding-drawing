import type { LineSegmentId, PlaceId } from './evolu-db';

export type SelectionType = 'drawingPane' | 'place' | 'lineSegment';

export type TransformId =
  | 'add'
  | 'addRelated'
  | 'addLine'
  | 'move'
  | 'delete'
  | 'deleteLine'
  | 'rotate';

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
  { id: 'addLine', label: 'Add Line', allowedSelectionTypes: ['place'] },
  { id: 'move', label: 'Move Place', allowedSelectionTypes: ['place'] },
  { id: 'delete', label: 'Delete Place', allowedSelectionTypes: ['place'] },
  {
    id: 'deleteLine',
    label: 'Delete Line',
    allowedSelectionTypes: ['lineSegment'],
  },
  { id: 'rotate', label: 'Rotate Place', allowedSelectionTypes: ['place'] },
];

/**
 * Maps current App selection state to a selection type.
 */
export function getSelectionType(
  hasDrawingPaneSelected: boolean,
  selectedPlaceId: PlaceId | null,
  selectedLineSegmentId: LineSegmentId | null,
): SelectionType | null {
  if (hasDrawingPaneSelected) return 'drawingPane';
  if (selectedPlaceId) return 'place';
  if (selectedLineSegmentId) return 'lineSegment';
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
