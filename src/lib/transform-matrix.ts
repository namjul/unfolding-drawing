import type {
  BendingCircularFieldId,
  CircularFieldId,
  LineSegmentId,
  PlaceId,
} from './evolu-db';

export type SelectionType =
  | 'drawingPane'
  | 'place'
  | 'lineSegment'
  | 'circularField'
  | 'bendingCircularField';

export type TransformId =
  | 'add'
  | 'addRelated'
  | 'addLine'
  | 'addCircularField'
  | 'bendAtEnds'
  | 'move'
  | 'moveCircularField'
  | 'moveBendingCircularField'
  | 'modifyCircularField'
  | 'modifyBendingCircularField'
  | 'delete'
  | 'deleteLine'
  | 'deleteCircularField'
  | 'deleteBendingCircularField'
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
  {
    id: 'addCircularField',
    label: 'Add Circular Field',
    allowedSelectionTypes: ['drawingPane', 'place'],
  },
  {
    id: 'bendAtEnds',
    label: 'Bend at ends',
    allowedSelectionTypes: ['lineSegment'],
  },
  { id: 'move', label: 'Move Place', allowedSelectionTypes: ['place'] },
  {
    id: 'moveCircularField',
    label: 'Move Circular Field',
    allowedSelectionTypes: ['circularField'],
  },
  {
    id: 'modifyCircularField',
    label: 'Modify Circular Field',
    allowedSelectionTypes: ['circularField'],
  },
  { id: 'delete', label: 'Delete Place', allowedSelectionTypes: ['place'] },
  {
    id: 'deleteLine',
    label: 'Delete Line',
    allowedSelectionTypes: ['lineSegment'],
  },
  {
    id: 'deleteCircularField',
    label: 'Delete Circular Field',
    allowedSelectionTypes: ['circularField'],
  },
  {
    id: 'moveBendingCircularField',
    label: 'Move bending field',
    allowedSelectionTypes: ['bendingCircularField'],
  },
  {
    id: 'modifyBendingCircularField',
    label: 'Modify bending field radius',
    allowedSelectionTypes: ['bendingCircularField'],
  },
  {
    id: 'deleteBendingCircularField',
    label: 'Delete bending field',
    allowedSelectionTypes: ['bendingCircularField'],
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
  selectedCircularFieldId: CircularFieldId | null,
  selectedBendingCircularFieldId: BendingCircularFieldId | null,
): SelectionType | null {
  if (hasDrawingPaneSelected) return 'drawingPane';
  if (selectedPlaceId) return 'place';
  if (selectedLineSegmentId) return 'lineSegment';
  if (selectedCircularFieldId) return 'circularField';
  if (selectedBendingCircularFieldId) return 'bendingCircularField';
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
