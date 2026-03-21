## 1. Shared Parent Objects Utilities

- [x] 1.1 Create `src/canvas/parent-objects.ts` module file
- [x] 1.2 Implement `buildPlaceMap()` helper to create Map from places array
- [x] 1.3 Implement `computeWorldPosition()` recursive function for position calculation
  - **Note:** Uses dual interpretation: roots use world coords, children use offsets
  - Includes cycle detection and orphan fallback
- [x] 1.4 Implement `isDescendantOf()` helper for parent-child traversal
  - Includes cycle detection to prevent infinite loops
- [x] 1.5 Implement `getDescendants()` helper to get all descendants of a place
- [x] 1.6 Add explicit comments explaining coordinate semantics (root vs child)

## 2. Display Layer - World Position Computation

- [x] 2.1 Import parent-objects utilities in `src/canvas/scene.ts`
- [x] 2.2 Modify `deriveDisplayPlaces()` to build place map
- [x] 2.3 Update place mapping to compute world positions using `computeWorldPosition()`
- [x] 2.4 Add `case 'addRelatedPlace'` to handle draft related places with offset → world conversion
- [x] 2.5 Modify `case 'movePlace'` to calculate delta and apply to all descendants
- [x] 2.6 Implement `isDescendantOf()` usage to detect which places should move with parent
- [x] 2.7 Update `getDisplayBounds()` to use computed world positions (if needed)

## 3. Interaction Layer - Offset Calculation for Staging

- [x] 3.1 Import parent-objects utilities in `src/interaction-state.ts`
- [x] 3.2 Add `places` parameter to `stageAddRelatedPlace()` signature in InteractionState interface
- [x] 3.3 Modify `stageAddRelatedPlace()` implementation to accept places parameter
- [x] 3.4 In `stageAddRelatedPlace()`, build place map and compute parent's world position
- [x] 3.5 Calculate offset: `(clickX - parentWorldX, clickY - parentWorldY)`
- [x] 3.6 Store offset in draft place coordinates instead of world position
- [x] 3.7 Add `places` parameter to `stageMovePlace()` signature in InteractionState interface
- [x] 3.8 Modify `stageMovePlace()` implementation to accept places parameter
- [x] 3.9 In `stageMovePlace()`, compute original world position for "from" coordinate
- [x] 3.10 Keep "to" as world position (user's target click location)

## 4. Operations Layer - Offset Storage and Cascade Delete

- [x] 4.1 Import parent-objects utilities in `src/drawing-ops.ts`
- [x] 4.2 Modify `commitPending()` for `movePlace` case to detect if place has parent
- [x] 4.3 If moving child, compute parent's world position and convert target to offset before storing
- [x] 4.4 If moving root, store world position directly (no conversion)
- [x] 4.5 Verify `addRelatedPlace` case stores offset (should already be correct from staging)
- [x] 4.6 Implement cascade delete using `getDescendants()` helper
- [x] 4.7 Modify `commitPending()` for `deletePlace` case to delete entire subtree
- [x] 4.8 Ensure all descendants are marked as deleted (via getDescendants)
- [x] 4.9 Update `deriveDisplayPlaces()` for `deletePlace` to mark all descendants for deletion in preview

## 5. App Layer - Wire Places Data to Staging

- [x] 5.1 In `src/App.tsx`, create `handleStageAddRelatedPlace` wrapper function
- [x] 5.2 Wrapper calls `interaction.stageAddRelatedPlace(x, y, drawing.places())`
- [x] 5.3 Pass `handleStageAddRelatedPlace` to Canvas instead of direct `interaction.stageAddRelatedPlace`
- [x] 5.4 Create `handleStageMovePlace` wrapper function
- [x] 5.5 Wrapper calls `interaction.stageMoveMovePlace(placeId, x, y, drawing.places())`
- [x] 5.6 Pass `handleStageMovePlace` to Canvas instead of direct `interaction.stageMovePlace`

## 6. Verification - Grouped Movement

- [ ] 6.1 Test: Create root place, create child, move root - verify child follows
- [ ] 6.2 Test: Create root, create multiple children, move root - verify all children follow
- [ ] 6.3 Test: Create 3-level hierarchy (root > child > grandchild), move root - verify all descendants follow
- [ ] 6.4 Test: Move parent (staged), verify draft preview shows children at new positions
- [ ] 6.5 Test: Move parent (staged), commit - verify only parent coordinates updated in database
- [ ] 6.6 Test: Move parent (staged), reject - verify all places return to original positions

## 7. Verification - Independent Child Movement

- [ ] 7.1 Test: Create parent at (100,100), child at offset (+50,+50)
- [ ] 7.2 Test: Move child to world (200,200) - verify offset updates to (+100,+100)
- [ ] 7.3 Test: Move parent to (150,150) - verify child now at world (250,250)
- [ ] 7.4 Test: Move grandchild independently - verify offset from parent updates, hierarchy preserved

## 8. Verification - Cascade Delete

- [ ] 8.1 Test: Create parent with children, delete parent - verify all children deleted
- [ ] 8.2 Test: Create 3-level hierarchy, delete root - verify entire subtree deleted
- [ ] 8.3 Test: Stage parent deletion - verify draft shows parent and all descendants marked for deletion
- [ ] 8.4 Test: Stage parent deletion, reject - verify entire subtree restored
- [ ] 8.5 Test: Delete childless place - verify only that place deleted, siblings unaffected

## 9. Verification - Coordinate System

- [ ] 9.1 Test: Create root place - verify stored coords = world coords
- [ ] 9.2 Test: Create related place - verify stored coords = offset from parent
- [ ] 9.3 Test: Verify relationship lines render correctly with computed world positions
- [ ] 9.4 Test: Move parent - verify relationship lines update to follow draft positions
- [ ] 9.5 Test: Verify Stage 1 free place workflow unchanged (no parent, absolute coords)

## 10. Verification - Edge Cases

- [ ] 10.1 Test: Orphaned place (parent deleted) - verify renders at stored position (fallback to absolute)
- [ ] 10.2 Test: Deep hierarchy (5+ levels) - verify world position computation works
- [ ] 10.3 Test: Transformation history records world positions (not offsets) for human readability
