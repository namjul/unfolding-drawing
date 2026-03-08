/**
 * Centralized style guide – Tailwind class composites and SVG/canvas visual constants.
 * Import { classes, svg, styles } from '../styles/tokens' (or relative path).
 */

export const classes = {
  // Layout
  appRoot: 'flex gap-2 h-screen p-2 *:min-w-0',
  pane: 'p-2 basis-1/5 shrink-0 max-w-80 bg-white flex flex-col overflow-auto',
  paneCanvas: 'p-2 basis-1/5 grow min-h-0 flex flex-col',
  canvasSelectedRing: 'ring-2 ring-green-500 ring-inset rounded',
  canvasSvg: 'flex-1 min-h-0 w-full bg-white touch-none',
  paneDna: 'p-2 basis-1/5 shrink-0 max-w-80 bg-white flex flex-col min-h-0',

  // Drawing guide
  guideRoot: 'flex flex-col gap-2',
  guideTitle: 'font-medium text-slate-700 mb-2',
  observationContainer: 'border border-sky-200 rounded overflow-hidden',
  observationHeader:
    'px-2 py-1.5 bg-sky-200 font-medium text-sm text-slate-700',
  observationBody: 'border-t border-sky-200 px-2 py-2 bg-white',
  guideContainer: 'rounded overflow-hidden border-2 transition-colors',
  guideContainerCurrent: 'border-green-500',
  guideContainerInactive: 'border-sky-200',
  guideHeaderButton:
    'w-full px-2 py-1.5 flex justify-between items-center text-sm hover:bg-sky-100 text-slate-700 text-left transition-colors',
  guideHeaderCurrent: 'bg-green-200 font-medium',
  guideHeaderInactive: 'bg-sky-50',
  guideHeaderSubtitle:
    'text-slate-500 text-xs shrink-0 ml-2 truncate max-w-[60%]',
  guideCollapseTransition:
    'grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
  guideBody: 'min-h-0 overflow-hidden',
  guideBodyBorder: 'border-t border-sky-200 px-2 py-2 bg-white',
  guideText: 'text-sm text-slate-600',
  guideTextMuted: 'text-xs text-slate-500 mt-2',
  buttonSelectCanvas:
    'mt-2 px-3 py-2 rounded text-sm text-left w-full bg-sky-100 hover:bg-sky-200',
  buttonSelectCanvasSelected:
    'mt-2 px-3 py-2 rounded text-sm text-left w-full bg-sky-400 text-white',
  buttonCancelSelection:
    'mt-2 block px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded',
  buttonTransformation:
    'px-3 py-2 rounded text-sm text-left bg-sky-100 hover:bg-sky-200',
  buttonTransformationSelected:
    'px-3 py-2 rounded text-sm text-left bg-sky-400 text-white',
  buttonKeep:
    'px-3 py-2 bg-sky-200 hover:bg-sky-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed',
  buttonDiscard:
    'px-3 py-2 bg-red-100 hover:bg-red-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed',
  buttonBackReset:
    'self-start px-3 py-1 text-xs text-slate-500 hover:text-slate-700',
  guideDetailsActions: 'mt-3 flex flex-col gap-2',
  guideDetailsActionsRow: 'flex gap-2',

  // Drawing DNA
  dnaRoot: 'flex flex-col h-full min-h-0',
  dnaTitle: 'font-medium text-slate-700 mb-2 shrink-0',
  dnaTabBar: 'flex border-b border-green-200 shrink-0',
  dnaTab: 'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
  dnaTabActive: 'border-green-500 text-green-700',
  dnaTabInactive: 'border-transparent text-slate-600 hover:text-slate-800',
  dnaContent: 'flex-1 min-h-0 overflow-auto',

  // Lists (Drawing Objects / Transformations)
  listRoot: 'flex flex-col gap-2',
  listEmpty: 'text-xs text-slate-500',
  listHeaderRow: 'px-2 py-1 bg-slate-200 rounded font-medium',
  listItem: 'px-2 py-1 bg-slate-100 rounded truncate',
  listItemPlaceButton:
    'w-full text-left cursor-pointer hover:bg-slate-200 rounded px-0.5 -mx-0.5',
  inputRename:
    'w-full px-1 py-0.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500',
  inputRenameError: 'text-xs text-red-600',
  listIndent0: 'pl-0',
  listIndent1: 'pl-4',
  listIndent2: 'pl-8',
  listIndent3: 'pl-12',
  listIndent4: 'pl-16',
  listIndent5: 'pl-20',
  listIndent6: 'pl-24',
  listIndent7: 'pl-28',
  listScaffoldingIndicator: 'w-4 shrink-0 text-slate-400 text-xs',
  listRowWithIndicator: 'flex items-center gap-1 min-w-0',
} as const;

export const listIndentClasses = [
  classes.listIndent0,
  classes.listIndent1,
  classes.listIndent2,
  classes.listIndent3,
  classes.listIndent4,
  classes.listIndent5,
  classes.listIndent6,
  classes.listIndent7,
] as const;

// ViewControls
export const viewControls = {
  root: 'flex flex-col gap-2',
  buttonPrimary:
    'px-3 py-1 bg-sky-200 hover:bg-sky-300 disabled:opacity-40 disabled:cursor-not-allowed rounded',
  buttonSecondary:
    'px-3 py-1 bg-sky-100 hover:bg-sky-200 disabled:cursor-default rounded text-sm',
  buttonActive: 'px-3 py-1 rounded bg-sky-500 text-white',
  buttonInactive: 'px-3 py-1 rounded bg-sky-200 hover:bg-sky-300',
  buttonReset: 'px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded text-sm',
  divider: 'my-2 border border-sky-300',
} as const;

// SVG / canvas visual constants
export const svg = {
  // Place markers
  placeUnselectedStroke: '#999999',
  placeSelectedStroke: 'darkorange',
  placeParentStroke: '#0ea5e9',
  placeChildStroke: '#10b981',
  placeUnselectedStrokeWidth: 1,
  placeSelectedStrokeWidth: 3,
  placeSelectedCircleDasharray: '6 3',
  placeRelationCircleDasharray: '4 4',

  // Orientation axis
  orientationAxisStroke: '#999999',
  orientationAxisStrokeWidth: 1,
  orientationAxisDasharray: '4 4',
  orientationAxisFill: 'black',

  // Axis number label (when repeater selected)
  axisLabelFontSize: 16,
  axisLabelOffset: 80,
  /** Distance from the axis line (perpendicular) so the label sits beside the axis. */
  axisLabelDistanceFromAxis: 14,

  // Line segments
  lineSegmentUnselectedStroke: '#374151',
  lineSegmentSelectedStroke: 'darkorange',
  lineSegmentUnselectedStrokeWidth: 2,
  lineSegmentSelectedWidth: 3,

  // Scaffolding (places and line segments)
  placeScaffoldingStroke: '#999999',
  placeScaffoldingStrokeWidth: 1,
  placeScaffoldingDasharray: '4 4',
  lineSegmentScaffoldingStroke: '#374151',
  lineSegmentScaffoldingStrokeWidth: 2,
  lineSegmentScaffoldingDasharray: '6 3',

  // Circular field (scaffolding)
  circularFieldScaffoldingStroke: '#999999',
  circularFieldScaffoldingStrokeWidth: 1,
  circularFieldScaffoldingDasharray: '4 4',
  circularFieldRadiusLineDasharray: '4 4',

  // Pending add line
  pendingAddLineStroke: '#374151',
  pendingAddLineWidth: 2,
  pendingAddLineDasharray: '4 4',

  // Laser beam (relationship lines)
  laserGradientLeading: '#0ea5e9',
  laserGradientTrailing: '#f0f9ff',

  // Delete placeholder
  deletePlaceholderStroke: 'red',
  deletePlaceholderStrokeWidth: 3,

  // Handle (grip cue for transformations)
  handleFill: 'green',
  handleSize: 6,

  // Inline style objects for SVG elements
  pointerEventsNone: { 'pointer-events': 'none' as const },
  cursorGrab: { cursor: 'grab' as const },
} as const;

/** Returns inline style for collapsible content (grid-template-rows). */
export function collapseContentStyle(expanded: boolean): {
  'grid-template-rows': string;
} {
  return { 'grid-template-rows': expanded ? 'auto' : '0fr' };
}
