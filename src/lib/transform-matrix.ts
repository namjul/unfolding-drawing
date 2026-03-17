import type {
  AxisId,
  BendingCircularFieldId,
  CircularFieldId,
  CircularRepeaterId,
  LineSegmentId,
  PlaceId,
} from './evolu-db';

export type SelectionType =
  | 'drawingPane'
  | 'place'
  | 'placeOnCircularRepeater'
  | 'lineSegment'
  | 'circularField'
  | 'bendingCircularField'
  | 'axis'
  | 'circularRepeater';

export type TransformId =
  | 'add'
  | 'addRelated'
  | 'addLine'
  | 'addCircularField'
  | 'addAxis'
  | 'addPlaceOnAxis'
  | 'addPlaceOnCircularField'
  | 'addCircularRepeater'
  | 'addPlaceOnCircularRepeater'
  | 'bendAtEnds'
  | 'move'
  | 'moveCircularField'
  | 'modifyCircularField'
  | 'modifyAxis'
  | 'modifyCircularRepeater'
  | 'modifyPlaceOnCircularRepeater'
  | 'modifyBendingCircularField'
  | 'delete'
  | 'deleteAxis'
  | 'deleteLine'
  | 'deleteCircularField'
  | 'deleteCircularRepeater'
  | 'deleteBendingCircularField'
  | 'splitLine'
  | 'rotate'
  | 'addLineSegment';

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
    allowedSelectionTypes: ['place', 'placeOnCircularRepeater'],
  },
  { id: 'addLine', label: 'Add Line', allowedSelectionTypes: ['place'] },
  {
    id: 'addLineSegment',
    label: 'Add Line Segment',
    allowedSelectionTypes: ['placeOnCircularRepeater'],
  },
  {
    id: 'addCircularField',
    label: 'Add Circular Field',
    allowedSelectionTypes: ['drawingPane', 'place', 'placeOnCircularRepeater'],
  },
  {
    id: 'addAxis',
    label: 'Add Axis',
    allowedSelectionTypes: ['place', 'placeOnCircularRepeater'],
  },
  {
    id: 'addPlaceOnAxis',
    label: 'Add Place to axis',
    allowedSelectionTypes: ['axis'],
  },
  {
    id: 'addPlaceOnCircularField',
    label: 'Add place on circular field',
    allowedSelectionTypes: ['circularField'],
  },
  {
    id: 'addCircularRepeater',
    label: 'Add Circular Repeater',
    allowedSelectionTypes: ['place', 'placeOnCircularRepeater'],
  },
  {
    id: 'addPlaceOnCircularRepeater',
    label: 'Add place on repeater',
    allowedSelectionTypes: ['circularRepeater'],
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
  {
    id: 'modifyAxis',
    label: 'Modify Axis',
    allowedSelectionTypes: ['axis'],
  },
  {
    id: 'modifyCircularRepeater',
    label: 'Modify Circular Repeater',
    allowedSelectionTypes: ['circularRepeater'],
  },
  {
    id: 'modifyPlaceOnCircularRepeater',
    label: 'Move Place',
    allowedSelectionTypes: ['placeOnCircularRepeater'],
  },
  {
    id: 'delete',
    label: 'Delete Place',
    allowedSelectionTypes: ['place', 'placeOnCircularRepeater'],
  },
  {
    id: 'deleteAxis',
    label: 'Delete Axis',
    allowedSelectionTypes: ['axis'],
  },
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
    id: 'deleteCircularRepeater',
    label: 'Delete Circular Repeater',
    allowedSelectionTypes: ['circularRepeater'],
  },
  {
    id: 'modifyBendingCircularField',
    label: 'Modify bending field',
    allowedSelectionTypes: ['bendingCircularField'],
  },
  {
    id: 'deleteBendingCircularField',
    label: 'Delete bending field',
    allowedSelectionTypes: ['bendingCircularField'],
  },
  {
    id: 'splitLine',
    label: 'Split line segment',
    allowedSelectionTypes: ['lineSegment'],
  },
  {
    id: 'rotate',
    label: 'Rotate Place',
    allowedSelectionTypes: ['place', 'placeOnCircularRepeater'],
  },
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
  selectedAxisId: AxisId | null,
  selectedCircularRepeaterId: CircularRepeaterId | null,
): SelectionType | null {
  if (hasDrawingPaneSelected) return 'drawingPane';
  if (selectedPlaceId) return 'place';
  if (selectedLineSegmentId) return 'lineSegment';
  if (selectedCircularFieldId) return 'circularField';
  if (selectedBendingCircularFieldId) return 'bendingCircularField';
  if (selectedAxisId) return 'axis';
  if (selectedCircularRepeaterId) return 'circularRepeater';
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
