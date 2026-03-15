## Why

The current tool mode system requires users to enter a mode ("Add Place") before interacting with the canvas. This creates indirection and hides available actions. A selection + transformation model makes the interaction more explicit: select a target (canvas or place), then choose what to do with it. This aligns with the principle that "valid next actions must be visible without tool hunting."

## What Changes

- Remove tool mode concept (`ToolMode`, `tool()`, `enterAddPlaceMode`)
- Add explicit selection model: canvas is selectable, distinct from "no place selected"
- Add Selection Panel showing current target (canvas or place)
- Add Transformations Panel showing context-sensitive operations based on selection
- Canvas selected → "Add Place" button available
- Place selected → "Move Place", "Delete Place" buttons available
- Remove drag-to-move: all transformations initiated via buttons, completed via canvas click
- Add canvas selection highlight (red border) when canvas is selected
- Auto-reject pending transformations when starting a new one
- All transformations now explicit: click button → click canvas (except delete, which executes immediately)

**No breaking changes to data model.** Persistence and transformation recording unchanged.

## Capabilities

### New Capabilities

- `explicit-selection`: Canvas and places are both selectable targets with visual feedback
- `transformation-panel`: Context-sensitive transformation buttons based on current selection
- `awaiting-transformation`: State tracking between clicking transformation button and completing it on canvas
- `canvas-selection-highlight`: Visual border when canvas is selected

### Modified Capabilities

<!-- No existing capabilities have requirement changes - this is an interaction model redesign -->

## Impact

**Affected modules:**
- `src/drawing/types.ts` - remove ToolMode, add SelectionTarget and AwaitingTransformationTarget types
- `src/interaction-state.ts` - major refactor: remove tool mode, add selection/awaiting state, add auto-reject logic
- `src/canvas/PlaceCanvas.tsx` - remove drag-to-move, update click handler, add canvas selection border rendering
- `src/inspector/PlaceInspector.tsx` - remove Tool panel, add Selection + Transformations panels, restructure layout
- `src/App.tsx` - update prop wiring between components

**User interaction flow changes:**
- Old: Click "Stage place" button → tool mode changes → click canvas → place created
- New: Canvas selected by default → click "Add Place" → click canvas → place created
- Old: Select place → drag to move → commit
- New: Select place → click "Move Place" → click canvas for new position → commit
- Old: Select place → click "Stage delete" → commit
- New: Select place → click "Delete Place" → commit

**Visual changes:**
- Selection Panel shows "Canvas selected" or "Place: [name]"
- Transformations Panel shows only valid operations for current selection
- Canvas gets red border when selected (matching place selection ring color)
- Inspector panel order: Observation → Selection → Transformations → Pending change → Place Details → Viewport → History

**Removed:**
- Tool mode state management
- Drag-to-move gesture (replaced with button + click)
- Mode switching workflow
