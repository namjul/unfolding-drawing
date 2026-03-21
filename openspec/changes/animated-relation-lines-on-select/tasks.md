# Tasks: animated-relation-lines-on-select

## Implementation

### 1. Subtree Traversal Helper
- [x] 1.1 Add `getSubtreePlaceIds()` function to `parent-objects.ts` to recursively collect all descendant IDs from a given place
- [x] 1.2 Export the new function for use in PlaceCanvas (already exported via `export const`)
- [x] 1.3 Add cycle detection to prevent infinite loops in malformed hierarchies (implemented via `visited` parameter)

### 2. Filter Relation Line Visibility
- [x] 2.1 Modify `drawRelationshipLines()` signature to accept `selectedPlaceId` parameter (already had it)
- [x] 2.2 Update call site in `drawScene()` to pass `selectedPlaceId` (already passing)
- [x] 2.3 Build subtree place ID set using `getSubtreePlaceIds()` when a place is selected
- [x] 2.4 Add filtering logic: draw line only if `place.id === selectedPlaceId` OR `parent.id` is in subtree set
- [x] 2.5 Handle canvas selection case: when no place selected, draw no relation lines

### 3. Add Animated Direction Indicators
- [x] 3.1 Create animated dash paint effect in `drawRelationshipLines()` 
- [x] 3.2 Add `dashPhase` state variable to track animation progress
- [x] 3.3 Update animation phase each frame in drawing loop (30px per second)
- [x] 3.4 Apply dash phase to paint when drawing visible relation lines (10px dash, 5px gap)
- [x] 3.5 Tune dash pattern parameters: 10px dash, 5px gap, 30px/second flow rate

### 4. Co-variance Verification
- [x] 4.1 Verify `selectedPlaceId` prop is correctly passed through component hierarchy
- [x] 4.2 Test that grouped movement behavior is unchanged (functional behavior preserved)
- [x] 4.3 Verify inspector hierarchy display still works (unaffected by canvas changes)
- [x] 4.4 Run `npm run check` to ensure TypeScript and linting pass ✓

## Co-variance notes
<!--
As you work through tasks, note anything that shifted
in unexpected ways. Parts of the system that behaved
differently than the design assumed.
-->

## Load-bearing assumptions that didn't hold
<!--
If any load-bearing assumption from design.md
turned out to be wrong during implementation, record it here.
-->

### Revision: Direction indicator visual weight

**Original assumption:** 10px dash with 5px gap at 2px stroke width provides good direction visibility.

**What actually happened:** The dense dash pattern occupied too much visual space and competed with the drawing objects. The line felt "heavy" and constantly demanded attention.

**Revised approach:** Sparse pulse pattern
- Dash: 6px (small pulse)
- Gap: 60px (large empty space)
- Stroke: 1px (thin line)
- Opacity: 25% (subtle base)

**Result:** Direction indicator now occupies only ~9% of the line length, dramatically reducing visual noise while preserving the directional flow signal.
