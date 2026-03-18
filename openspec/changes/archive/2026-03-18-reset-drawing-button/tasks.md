## 1. Type System - Add Reset Transformation Kind

- [x] 1.1 Add `'resetDrawing'` to transformation kind union in `src/drawing-ops.ts` recordTransformation function signature

## 2. Drawing Operations - Implement Reset Function

- [x] 2.1 Add `resetDrawing()` method to return object in `createDrawingOps`
- [x] 2.2 Implement pending transformation check and auto-reject if pending
- [x] 2.3 Get current places list from `places()` accessor
- [x] 2.4 Iterate through all places and call `evolu.update('place', { id: place.id, isDeleted: true })` for each
- [x] 2.5 Call `recordTransformation('resetDrawing', { placeCount: places.length, timestamp: Date.now() })`
- [x] 2.6 Clear selection: `interaction.setSelectedPlaceId(null)` and `interaction.setHoveredPlaceId(null)`
- [x] 2.7 Set operation message: "Drawing reset - all places deleted"

## 3. Inspector UI - Wire Reset Button

- [x] 3.1 Add `onResetDrawing: () => void` to `DrawingGuideProps` interface in PlaceInspector.tsx
- [x] 3.2 Create `handleResetDrawing` function that shows `confirm()` dialog with message "Delete all places? This cannot be undone."
- [x] 3.3 If confirmed, call `props.onResetDrawing()`
- [x] 3.4 Remove `disabled={true}` from Reset Drawing button at line 77
- [x] 3.5 Add `onClick={handleResetDrawing}` to Reset Drawing button
- [x] 3.6 Update button title attribute to describe actual behavior

## 4. App Integration - Connect Reset to Drawing Ops

- [x] 4.1 In App.tsx, get `resetDrawing` from `drawingOps` return value
- [x] 4.2 Pass `onResetDrawing={drawingOps.resetDrawing}` to PlaceInspector component
- [x] 4.3 Verify DrawingGuideProps interface matches new prop

## 5. Verification

- [x] 5.1 Test reset with multiple places - verify all places disappear from canvas
- [x] 5.2 Test reset with pending add - verify draft place is rejected before reset
- [x] 5.3 Test reset with pending move - verify move is rejected before reset
- [x] 5.4 Test reset with pending delete - verify delete is rejected before reset
- [x] 5.5 Test cancel dialog - verify places remain unchanged
- [x] 5.6 Test confirm dialog - verify all places deleted
- [x] 5.7 Verify transformation history shows "resetDrawing" entry after reset
- [x] 5.8 Verify placeCount in transformation payload is correct
- [x] 5.9 Verify viewport (zoom/pan) unchanged after reset
- [x] 5.10 Verify selection cleared after reset
- [x] 5.11 Test reset with empty drawing - verify no errors, transformation still recorded
