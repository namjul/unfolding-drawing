## 1. Type System Updates

- [x] 1.1 Remove `export type ToolMode = 'select' | 'addPlace'` from `src/drawing/types.ts`
- [x] 1.2 Add `SelectionTarget` type to `src/drawing/types.ts`: `{ kind: 'canvas' } | { kind: 'place'; placeId: string }`
- [x] 1.3 Add `AwaitingTransformationTarget` type to `src/drawing/types.ts`: `{ kind: 'none' } | { kind: 'addPlace' } | { kind: 'movePlace'; placeId: string }`

## 2. Interaction State - Remove Tool Mode

- [x] 2.1 Delete `const [tool, setTool] = createSignal<ToolMode>('select')` line in `src/interaction-state.ts`
- [x] 2.2 Delete `enterAddPlaceMode()` function (lines 52-58) in `src/interaction-state.ts`
- [x] 2.3 Remove `tool: () => ToolMode` from InteractionState interface
- [x] 2.4 Remove `enterAddPlaceMode: () => void` from InteractionState interface
- [x] 2.5 Remove all `setTool('select')` calls (lines 78, 106, 132, 142)

## 3. Interaction State - Add Selection Target

- [x] 3.1 Replace `selectedPlaceId` signal with `selectionTarget` signal initialized to `{ kind: 'canvas' }` in `src/interaction-state.ts`
- [x] 3.2 Add `setSelectionTarget` setter
- [x] 3.3 Create backward-compatible `selectedPlaceId()` accessor that derives from `selectionTarget()`
- [x] 3.4 Update all internal `setSelectedPlaceId(id)` calls to use `setSelectionTarget(id ? { kind: 'place', placeId: id } : { kind: 'canvas' })`
- [x] 3.5 Add `selectionTarget()` and `setSelectionTarget()` to return object and interface

## 4. Interaction State - Add Awaiting Transformation State

- [x] 4.1 Add `awaitingTransformationTarget` signal initialized to `{ kind: 'none' }` in `src/interaction-state.ts`
- [x] 4.2 Implement `beginAddPlace()`: auto-reject if pending, set awaiting to `{ kind: 'addPlace' }`
- [x] 4.3 Implement `beginMovePlace()`: check selection is place, auto-reject if pending, set awaiting to `{ kind: 'movePlace', placeId }`
- [x] 4.4 Implement `clearAwaitingTransformationTarget()`: set awaiting to `{ kind: 'none' }`
- [x] 4.5 Update `rejectPending()` to call `clearAwaitingTransformationTarget()`
- [x] 4.6 Add `awaitingTransformationTarget`, `beginAddPlace`, `beginMovePlace`, `clearAwaitingTransformationTarget` to return object and interface

## 5. Interaction State - Add Auto-Reject to Delete

- [x] 5.1 Update `stageDeletePlace()` to check if pending exists and call `rejectPending()` before staging deletion

## 6. Canvas - Update Props Interface

- [x] 6.1 Remove `tool: Accessor<ToolMode>` from PlaceCanvasProps in `src/canvas/PlaceCanvas.tsx`
- [x] 6.2 Add `selectionTarget: Accessor<SelectionTarget>` to PlaceCanvasProps
- [x] 6.3 Add `awaitingTransformationTarget: Accessor<AwaitingTransformationTarget>` to PlaceCanvasProps
- [x] 6.4 Add `onClearAwaitingTransformation: () => void` to PlaceCanvasProps
- [x] 6.5 Change `onSelectPlace` signature from `Setter<string | null>` to `(target: SelectionTarget) => void`

## 7. Canvas - Update Click Handler

- [x] 7.1 Replace tool mode check with awaiting transformation check in click handler (around line 464-472)
- [x] 7.2 If awaiting is 'addPlace', call `onStageAddPlace(x, y)` and `onClearAwaitingTransformation()`
- [x] 7.3 If awaiting is 'movePlace', call `onStageMovePlace(placeId, x, y)` and `onClearAwaitingTransformation()`
- [x] 7.4 If awaiting is 'none', perform normal selection: if hitPlaceId, call `onSelectPlace({ kind: 'place', placeId: hitPlaceId })`, else call `onSelectPlace({ kind: 'canvas' })`

## 8. Canvas - Adapt Drag-to-Move for Awaiting State

- [x] 8.1 Find drag threshold detection logic for place movement (around lines 374-420)
- [x] 8.2 Update drag setup to only work when awaiting movePlace transformation
- [x] 8.3 Keep `stageMovePlace` and `updatePendingMove` calls during drag for awaiting mode
- [x] 8.4 Clear awaiting state after drag completes
- [x] 8.5 Verify pan drag (middle mouse / spacebar) still works

## 9. Canvas - Add Canvas Selection Border Rendering

- [x] 9.1 Add `canvasSelectionBorder: Paint` to PaintSet interface
- [x] 9.2 Create `canvasSelectionBorder` paint in `createPaints()`: anti-alias, stroke, color RGB(248, 113, 113)
- [x] 9.3 Add `canvasSelectionBorder` to return object in `createPaints()`
- [x] 9.4 Add `runtime.paints.canvasSelectionBorder.delete()` in `deleteRuntime()`
- [x] 9.5 In `drawScene()`, after rendering places and before final `canvas.restore()`, check if `selectionTarget().kind === 'canvas'`
- [x] 9.6 If canvas selected: call `canvas.restore()` to exit world space
- [x] 9.7 Draw 4 border lines using `canvasSize()` dimensions, 4px width, inset 2px from edges
- [x] 9.8 Call `canvas.save()`, `canvas.translate()`, `canvas.scale()` to re-enter world space

## 10. Inspector - Update Props Interface

- [x] 10.1 Remove `tool: Accessor<ToolMode>` from DrawingGuideProps in `src/inspector/PlaceInspector.tsx`
- [x] 10.2 Remove `onEnterAddPlaceMode: () => void` from DrawingGuideProps
- [x] 10.3 Add `selectionTarget: Accessor<SelectionTarget>` to DrawingGuideProps
- [x] 10.4 Add `awaitingTransformationTarget: Accessor<AwaitingTransformationTarget>` to DrawingGuideProps
- [x] 10.5 Add `onBeginAddPlace: () => void` to DrawingGuideProps
- [x] 10.6 Add `onBeginMovePlace: () => void` to DrawingGuideProps

## 11. Inspector - Remove Tool Panel

- [x] 11.1 Delete "Tool" Panel (lines 85-94 showing current tool and "Stage place from canvas click" button)

## 12. Inspector - Add Selection Panel

- [x] 12.1 Insert new "Selection" Panel after "Observation" panel (before "Pending change")
- [x] 12.2 Use `Show` to check if `selectionTarget().kind === 'place'`
- [x] 12.3 If canvas selected (fallback): display "Canvas selected" text
- [x] 12.4 If place selected: get `activePlace()`, display place name/ID and coordinates
- [x] 12.5 Handle case where selected place not found: display "Selected place not found"

## 13. Inspector - Add Transformations Panel

- [x] 13.1 Insert new "Transformations" Panel after "Selection" panel (before "Pending change")
- [x] 13.2 Use `Show` to check if `selectionTarget().kind === 'canvas'`
- [x] 13.3 If canvas selected: render "Add Place" button, disabled when `pendingTransformation().kind !== 'none'`, onClick calls `onBeginAddPlace`
- [x] 13.4 If place selected (fallback): render "Move Place" button (disabled when pending), onClick calls `onBeginMovePlace`
- [x] 13.5 If place selected: render "Delete Place" button (disabled via `canStageDelete()`), onClick calls `onStageDelete`
- [x] 13.6 Add `Show` to display "→ Click canvas to complete transformation" when `awaitingTransformationTarget().kind !== 'none'`

## 14. Inspector - Rename Selection Panel to Place Details

- [x] 14.1 Change existing "Selection" Panel title (line 120) to "Place Details"
- [x] 14.2 Remove "Stage delete" button from Place Details panel (lines 136-141) - now in Transformations panel

## 15. App.tsx - Update PlaceCanvas Props

- [x] 15.1 Remove `tool={interaction.tool}` prop from PlaceCanvas
- [x] 15.2 Add `selectionTarget={interaction.selectionTarget}` prop to PlaceCanvas
- [x] 15.3 Add `awaitingTransformationTarget={interaction.awaitingTransformationTarget}` prop to PlaceCanvas
- [x] 15.4 Add `onClearAwaitingTransformation={interaction.clearAwaitingTransformationTarget}` prop to PlaceCanvas
- [x] 15.5 Change `onSelectPlace={interaction.setSelectedPlaceId}` to `onSelectPlace={interaction.setSelectionTarget}`

## 16. App.tsx - Update PlaceInspector Props

- [x] 16.1 Remove `tool={interaction.tool}` prop from PlaceInspector
- [x] 16.2 Remove `onEnterAddPlaceMode={interaction.enterAddPlaceMode}` prop from PlaceInspector
- [x] 16.3 Add `selectionTarget={interaction.selectionTarget}` prop to PlaceInspector
- [x] 16.4 Add `awaitingTransformationTarget={interaction.awaitingTransformationTarget}` prop to PlaceInspector
- [x] 16.5 Add `onBeginAddPlace={interaction.beginAddPlace}` prop to PlaceInspector
- [x] 16.6 Add `onBeginMovePlace={interaction.beginMovePlace}` prop to PlaceInspector

## 17. Testing - Selection Behavior

- [ ] 17.1 Test canvas selected by default on app start
- [ ] 17.2 Test clicking empty canvas area selects canvas (Selection Panel shows "Canvas selected")
- [ ] 17.3 Test clicking place selects place (Selection Panel shows place name/id)
- [ ] 17.4 Test canvas border appears when canvas selected
- [ ] 17.5 Test canvas border disappears when place selected
- [ ] 17.6 Test place selection ring appears when place selected

## 18. Testing - Add Place Workflow

- [ ] 18.1 Test canvas selected → "Add Place" button visible in Transformations Panel
- [ ] 18.2 Test click "Add Place" → awaiting message appears
- [ ] 18.3 Test click canvas → draft place created at click position
- [ ] 18.4 Test awaiting message disappears after canvas click
- [ ] 18.5 Test pending change panel shows staged add
- [ ] 18.6 Test commit creates place, reject removes draft

## 19. Testing - Move Place Workflow

- [ ] 19.1 Test place selected → "Move Place" button visible in Transformations Panel
- [ ] 19.2 Test click "Move Place" → awaiting message appears
- [ ] 19.3 Test click canvas → move staged to new position
- [ ] 19.4 Test awaiting message disappears after canvas click
- [ ] 19.5 Test pending change panel shows staged move
- [ ] 19.6 Test commit updates position, reject restores original

## 20. Testing - Delete Place Workflow

- [ ] 20.1 Test place selected → "Delete Place" button visible in Transformations Panel
- [ ] 20.2 Test click "Delete Place" → deletion staged immediately (no canvas click)
- [ ] 20.3 Test pending change panel shows staged deletion
- [ ] 20.4 Test commit deletes place, reject keeps place

## 21. Testing - Auto-Reject Behavior

- [ ] 21.1 Test pending add exists → click "Move Place" → pending add rejected, awaiting move
- [ ] 21.2 Test pending move exists → click "Add Place" → pending move rejected, awaiting add
- [ ] 21.3 Test pending add exists → click "Delete Place" → pending add rejected, deletion staged

## 22. Testing - Canvas Border Rendering

- [ ] 22.1 Test border is 4px wide, red color RGB(248, 113, 113)
- [ ] 22.2 Test border width constant when zooming in/out
- [ ] 22.3 Test border does not block place selection near edges
- [ ] 22.4 Test border does not block canvas click near edges

## 23. Testing - Drag Removal

- [ ] 23.1 Test dragging place does NOT move it (drag-to-move removed)
- [ ] 23.2 Test middle-mouse drag still pans viewport
- [ ] 23.3 Test spacebar + drag still pans viewport

## 24. Testing - Edge Cases

- [ ] 24.1 Test deleting selected place → canvas becomes selected
- [ ] 24.2 Test reset drawing → canvas becomes selected
- [ ] 24.3 Test awaiting transformation → reject pending → awaiting cleared
- [ ] 24.4 Test transformation buttons disabled when pending exists
- [ ] 24.5 Test Place Details panel shows selected place info (separate from Selection panel)
