## 1. Type System and State Extensions

- [x] 1.1 Add `'addRelatedPlace'` to ToolMode union type in `src/drawing/types.ts`
- [x] 1.2 Add `addRelatedPlace` case to PendingTransformationState union type
- [x] 1.3 Update `createNoPendingTransformation` if needed for new transformation kind

## 2. Interaction State - Add Related Place Mode

- [x] 2.1 Add `enterAddRelatedPlaceMode()` method to InteractionState interface
- [x] 2.2 Implement `enterAddRelatedPlaceMode()` in `createInteractionState` - check that a place is selected before allowing mode entry
- [x] 2.3 Add `stageAddRelatedPlace(parentPlaceId, x, y)` method to InteractionState interface
- [x] 2.4 Implement `stageAddRelatedPlace` to create pending transformation with parentPlaceId set
- [x] 2.5 Update tool mode transition in `stageAddRelatedPlace` to return to 'select' after staging

## 3. Drawing Operations - Commit Related Place

- [x] 3.1 Add `'addRelatedPlace'` to transformation kind union in `recordTransformation`
- [x] 3.2 Add `case 'addRelatedPlace'` to `commitPending` switch statement
- [x] 3.3 Implement `addRelatedPlace` commit logic: insert place with parentPlaceId, record transformation with parent reference
- [x] 3.4 Ensure transformation payload includes `{ placeId, parentPlaceId, x, y }`

## 4. Canvas - Relationship Line Rendering

- [x] 4.1 Create helper function `renderRelationshipLines(canvas, places, selectedPlaceId)` in PlaceCanvas.tsx
- [x] 4.2 Implement logic to iterate through all places and find those with non-null parentPlaceId
- [x] 4.3 For each child place, find parent place and draw line from parent (x,y) to child (x,y)
- [x] 4.4 Use gray color `rgba(128, 128, 128, 0.4)` for default relationship lines
- [x] 4.5 Detect if parent or child is selected and use highlight color (cyan or brighter gray) for those lines
- [x] 4.6 Call `renderRelationshipLines` in render pass after grid but before places
- [x] 4.7 Handle draft places with parentPlaceId - render relationship line in draft/highlight color

## 5. Inspector - Add Related Place UI

- [x] 5.1 Add "Add Related Place" button to PlaceInspector toolbar
- [x] 5.2 Disable "Add Related Place" button when no place is selected
- [x] 5.3 Wire button to call `interaction.enterAddRelatedPlaceMode()`
- [x] 5.4 Show current tool mode in inspector (add label or visual indicator for 'addRelatedPlace' mode)
- [x] 5.5 Show guidance message when in 'addRelatedPlace' mode: "Click canvas to place child of [parent name]"

## 6. Inspector - Hierarchy Structure List

- [x] 6.1 Create new component or section in PlaceInspector for "Structure" list
- [x] 6.2 Implement function to derive hierarchy structure from places array (group by parentPlaceId)
- [x] 6.3 Render root places (parentPlaceId = null) with zero indentation
- [x] 6.4 Render child places indented beneath their parent
- [x] 6.5 Show parent name/ID alongside child place entries
- [x] 6.6 Show children count for places that have children
- [x] 6.7 Make place entries clickable to select that place
- [x] 6.8 Highlight currently selected place in structure list

## 7. Verification and Polish

- [x] 7.1 Test full workflow: select parent → enter add related mode → click canvas → commit → verify relationship line appears
- [x] 7.2 Test reject workflow: stage related place → reject → verify draft place and relationship line disappear
- [x] 7.3 Test hierarchy list updates after adding related place
- [x] 7.4 Test hierarchy list updates after deleting child place
- [x] 7.5 Test hierarchy list updates after deleting parent place (children become orphans or roots)
- [x] 7.6 Test relationship line highlighting when selecting parent vs child
- [x] 7.7 Verify existing Stage 1 workflows still work (free place add/move/delete)
- [x] 7.8 Verify transformation history shows 'addRelatedPlace' transformations with correct payload
