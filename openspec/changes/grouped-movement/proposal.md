## Why

Parent-child relationships in Stage 2 currently only provide visual connection through relationship lines. When a parent place moves, children remain fixed at their original positions, breaking the structural relationship. This contradicts the meaning of hierarchy - parent-child relationships should preserve spatial structure during transformations.

## What Changes

- Implement relative coordinate system: children store offsets from parent, not absolute world positions
- Enable grouped movement: moving a parent automatically moves all descendants by the same delta
- Support independent child movement: children can adjust their offset while preserving the parent relationship
- Cascade delete: deleting a parent deletes all descendants recursively
- Update draft preview to show grouped movement before commit

**No breaking changes.** Existing root places (no parent) continue using absolute world coordinates.

## Capabilities

### New Capabilities

- `grouped-movement`: Moving a place with children moves the entire subtree together, preserving relative spatial relationships
- `relative-coordinates`: Child places store position as offset from parent rather than absolute world coordinates
- `cascade-delete`: Deleting a parent recursively deletes all descendant places

### Modified Capabilities

- `add-related-place`: When creating a related place, system must compute and store offset from parent's world position instead of absolute coordinates
- `hierarchy-visualization`: Relationship lines must render using computed world positions (parent world + child offset) instead of stored absolute coordinates

## Impact

**Affected modules:**
- `src/canvas/hierarchy.ts` (new) - Shared utilities for world position computation and hierarchy traversal
- `src/canvas/scene.ts` - World position derivation in `deriveDisplayPlaces()`, grouped movement preview
- `src/interaction-state.ts` - Offset calculation when staging related places and moves
- `src/drawing-ops.ts` - Offset storage when committing moves, cascade delete logic
- `src/App.tsx` - Pass places data to staging functions for offset computation

**Data model:**
- **Coordinate semantics (dual interpretation):**
  - Root places (`parentPlaceId === null`): stored `(x, y)` = absolute world coordinates
  - Child places (`parentPlaceId !== null`): stored `(x, y)` = offset from parent's world position
- **No schema migration needed** - existing data continues working (stage-2-hierarchy just completed, no active users)

**User interaction:**
- Moving parent place now moves all children together (grouped movement)
- Moving child independently updates its offset, preserving relationship
- Deleting parent deletes entire subtree
- Draft preview shows full result of grouped movement before commit

**Transformation history:**
- Parent moves are recorded explicitly in transformation history
- Children movements are **implicit** - they follow parent via relationship, not recorded as separate transformations
- Keeps history concise; descendant movement is implied by the parent-child relationship
