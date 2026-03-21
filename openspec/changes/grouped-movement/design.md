## Context

Stage 2 hierarchy (just completed) introduced parent-child relationships with:
- Visual relationship lines on canvas
- Structure inspector showing hierarchy
- `parentPlaceId` field in place records
- "Add Related Place" workflow

**Current limitation:** Places store absolute (x, y) coordinates regardless of parent relationship. Moving a parent leaves children at their original positions, breaking the visual and structural relationship.

**Architecture baseline:**
- `src/canvas/scene.ts` - `deriveDisplayPlaces()` computes `DisplayPlace[]` from `PersistedPlace[]` and pending transformations
- `src/interaction-state.ts` - Manages staging for add/move/delete operations
- `src/drawing-ops.ts` - Commits staged changes to Evolu database
- Canvas receives `DisplayPlace[]` and renders at world coordinates
- All coordinate manipulation currently happens in world space

## Goals / Non-Goals

**Goals:**
- Transform parent-child from visual-only to structural relationship
- Enable grouped movement: parent drag moves entire subtree
- Support independent child movement: adjust offset while preserving relationship
- Cascade delete: removing parent removes entire subtree
- Maintain reactivity: draft preview shows grouped movement before commit
- Work with arbitrary nesting depth (grandchildren, great-grandchildren, etc.)

**Non-Goals:**
- Migration for existing data (no active users, stage-2 just shipped)
- Performance optimization via caching (defer until measurement shows need)
- Reparenting UI (moving child to different parent - future capability)
- Breaking parent-child relationship (children always preserve relationship when moved)
- Multi-selection or group selection (Stage 9 scope)

## Decisions

### Decision 1: Relative vs Absolute Coordinate Model

**Chosen:** Dual interpretation based on `parentPlaceId` - root places use absolute coordinates, child places use offsets.

**Rationale:**
- Preserves structural meaning: children positioned *relative to* parent
- Single database update moves entire subtree (only parent coordinates change)
- No schema migration needed - interpretation changes, not data format
- Aligns with scene graph / transform hierarchy pattern from graphics engines
- Enables arbitrary nesting depth through recursive position computation

**Coordinate Semantics (CRITICAL - dual interpretation):**
```typescript
// Root place (parentPlaceId === null):
//   stored (x, y) = world coordinates (absolute canvas position)
// Child place (parentPlaceId !== null):
//   stored (x, y) = offset from parent's world position (relative)
//
// This is a DUAL INTERPRETATION: the meaning of (x, y) depends on parentPlaceId.
// Always use computeWorldPosition() to get world coordinates for display.
```

**Implementation:**
```typescript
/**
 * Compute world position for a place.
 * 
 * For root places: returns stored (x, y) directly.
 * For child places: recursively adds parent world position + child offset.
 * 
 * This function clarifies the dual interpretation of stored coordinates.
 */
function computeWorldPosition(
  place: PersistedPlace, 
  placeMap: Map<string, PersistedPlace>
): { x: number; y: number } {
  if (place.parentPlaceId === null) {
    // ROOT: stored (x, y) is already world coordinates
    return { x: place.x, y: place.y };
  }
  
  const parent = placeMap.get(place.parentPlaceId);
  if (!parent) {
    // ORPHAN: parent deleted, fallback to treating offset as world position
    return { x: place.x, y: place.y };
  }
  
  // CHILD: recursively compute parent world, then add child offset
  const parentWorld = computeWorldPosition(parent, placeMap);
  return {
    x: parentWorld.x + place.x,  // parent world + child offset
    y: parentWorld.y + place.y
  };
}
```

**Alternative considered:** Store world coordinates, compute and update all descendants on parent move.
- **Rejected:** Multiple database updates per parent move, verbose transformation history, doesn't scale with hierarchy depth

### Decision 2: Where to Compute World Positions

**Chosen:** In `deriveDisplayPlaces()` during display state derivation.

**Rationale:**
- Fits reactive architecture: computation happens when places change, not every frame
- `DisplayPlace` with world coordinates flows to canvas (canvas stays simple)
- Single computation point, easy to reason about
- SolidJS reactivity handles invalidation automatically

**Alternative considered:** Compute in canvas during rendering.
- **Rejected:** Recomputes every frame (60fps), couples canvas to hierarchy logic

**Alternative considered:** Cached scene graph with manual invalidation.
- **Rejected:** Premature optimization - defer until measurement shows need

### Decision 3: Independent Child Movement Behavior

**Chosen:** Allow children to move independently, updating their offset while preserving relationship.

**Rationale:**
- Gives users flexibility to adjust spatial relationships
- Doesn't require "breaking" the parent-child relationship
- Natural for fine-tuning child positions relative to parent
- Matches expectation from design tools (Figma, Sketch, etc.)

**Scenario:**
```
Parent A at world (100, 100)
Child B at offset (+50, +50) → world (150, 150)

User drags B to world (200, 200)
Result: B's offset becomes (+100, +100)

User moves A to (150, 150)
Result: B now at world (250, 250) - offset preserved
```

**Alternative considered:** Moving child breaks relationship (sets `parentPlaceId = null`).
- **Rejected:** Destructive, loses structural information, requires rebuild

**Alternative considered:** Children can't be moved independently (rigid groups).
- **Rejected:** Too restrictive, doesn't allow fine-tuning

### Decision 4: Cascade Delete Scope

**Chosen:** Deleting a parent recursively deletes entire subtree (children, grandchildren, etc.).

**Rationale:**
- Structural consistency: parent-child is a containment relationship
- Prevents orphaned places with meaningless offsets
- Aligns with user expectation (deleting folder deletes contents)
- Transformation history records parent deletion; descendant deletions are implied

**Implementation:**
```typescript
// In drawing-ops.ts commitPending for deletePlace:
function deleteSubtree(placeId: PlaceId, places: ReadonlyArray<PersistedPlace>) {
  // Delete this place
  evolu.update('place', { id: placeId, isDeleted: true });
  
  // Find and delete all children
  const children = places.filter(p => p.parentPlaceId === placeId);
  for (const child of children) {
    deleteSubtree(child.id, places);  // Recursive
  }
}
```

**Alternative considered:** Convert children to roots (preserve world position, set `parentPlaceId = null`).
- **Rejected:** User deleted the parent intentionally; preserving children is surprising

**Alternative considered:** Block deletion if place has children.
- **Rejected:** Forces manual cleanup, tedious for deep hierarchies

### Decision 5: Draft Preview for Grouped Movement

**Chosen:** When staging a parent move, compute and show new world positions for all descendants in draft state.

**Rationale:**
- Immediate feedback about what will happen on commit
- Users see full result before committing
- Consistent with existing draft preview behavior
- No database changes until commit

**Implementation in `deriveDisplayPlaces()`:**
```typescript
case 'movePlace': {
  const movedPlaceId = pending.placeId;
  const delta = calculateDelta(movedPlaceId, pending.to, placeMap);
  
  // Apply delta to moved place and all descendants
  return nextPlaces.map(place => {
    if (isDescendantOf(place.id, movedPlaceId, placeMap)) {
      return { ...place, x: place.x + delta.x, y: place.y + delta.y };
    }
    return place;
  });
}
```

**Alternative considered:** Only show parent at new position, children remain at old positions until commit.
- **Rejected:** Misleading - doesn't show actual result of the operation

### Decision 6: Interaction Layer Data Access

**Chosen:** Pass `places` array to staging functions (`stageAddRelatedPlace`, `stageMovePlace`) via wrapper functions in App.tsx.

**Rationale:**
- Interaction layer needs parent positions to compute offsets
- App.tsx already has access to both persisted and display places
- Keeps canvas decoupled from data layer
- Clean separation: App.tsx orchestrates, interaction-state executes

**Implementation:**
```typescript
// In App.tsx:
const handleStageAddRelatedPlace = (x: number, y: number) => {
  return interaction.stageAddRelatedPlace(x, y, drawing.places());
};

const handleStageMovePlace = (placeId: PlaceId, x: number, y: number) => {
  return interaction.stageMovePlace(placeId, x, y, drawing.places());
};

// Pass to Canvas:
<Canvas onStageAddRelatedPlace={handleStageAddRelatedPlace} ... />
```

**Alternative considered:** Interaction layer accesses global places accessor.
- **Rejected:** Introduces coupling, breaks encapsulation

**Alternative considered:** Canvas computes offsets before calling staging.
- **Rejected:** Canvas shouldn't know about persistence layer details

### Decision 7: Shared Utility Location

**Chosen:** Create `src/canvas/parent-objects.ts` for shared parent-object utilities (`computeWorldPosition`, `buildPlaceMap`, `isDescendantOf`).

**Rationale:**
- Three modules need these functions (scene.ts, interaction-state.ts, drawing-ops.ts)
- Single source of truth for parent-child relationship logic
- Clear module purpose: parent-object traversal and coordinate computation
- Located in canvas/ since it's display-related (not persistence)
- Filename aligns with glossary term "Parent Drawing Object"

**Alternative considered:** Put in `src/drawing/` module.
- **Rejected:** More about display/computation than persistence

**Alternative considered:** Inline in each module.
- **Rejected:** Duplication, divergence risk

## Risks / Trade-offs

**[Risk]** Recursive `computeWorldPosition()` could hit stack limits with extremely deep hierarchies (>1000 levels).
→ **Mitigation:** Accept for now - Stage 2 scope assumes shallow hierarchies. Add iterative implementation if deep nesting becomes real use case.

**[Risk]** Computing world positions for every place on every reactive update could impact performance with large place counts.
→ **Mitigation:** Start without caching. Profile with realistic data (100-1000 places). Only optimize if measurement shows >16ms computation time.

**[Risk]** Orphaned places (parent deleted outside cascade delete flow) have offsets but no parent, render at incorrect positions.
→ **Mitigation:** Fallback in `computeWorldPosition()` treats orphans as roots (interpret offset as world coordinates). Not ideal but safe.

**[Trade-off]** No migration code means old absolute-coordinate children (if any existed) would render incorrectly.
→ **Accepted:** Stage 2 just shipped, no active users, no existing data to migrate.

**[Trade-off]** Transformation history only records parent move, descendant movement is implicit.
→ **Accepted:** Keeps history concise, relationship makes descendant movement obvious. Alternative (recording every moved place) creates noise.

**Implementation note:** When committing a parent move:
```typescript
// Only update parent in database
recordTransformation('movePlace', {
  placeId: parentId,
  from: { x: parentFromWorldX, y: parentFromWorldY },
  to: { x: parentToWorldX, y: parentToWorldY }
  // Children are NOT recorded - their movement is implicit via parent-child relationship
});
```

**Rationale:** The parent-child relationship defines the spatial structure. Recording every descendant move would:
- Create verbose, redundant history entries
- Obscure the actual user intent ("I moved the parent")
- Make undo/redo operations confusing (should undo move all children individually?)

**[Trade-off]** Children can't break relationship without deletion - no "detach from parent" operation.
→ **Accepted:** Defer to future "reparenting" capability if usage patterns show need.

## Migration Plan

Not applicable - no active users, no data migration needed.

**For future reference:** If data migration becomes necessary:
1. Detect places with `parentPlaceId !== null`
2. For each child, compute current world position
3. Get parent's world position
4. Convert to offset: `child.x -= parent.x; child.y -= parent.y`
5. Update place record with new offset values
6. Set version flag to prevent re-running

## Open Questions

**Q:** Should transformation history record world positions for descendants when parent moves, or only the parent move?
**Decision:** Only record parent move. Descendant movement is a consequence of the relationship, not independent transformations. Keeps history concise and meaningful.

**Q:** Should there be a way to "detach" a child from its parent (break relationship without deletion)?
**Decision:** No for this change. Defer to future "reparenting" capability. Current scope: relationships are created and preserved, deleted only via cascade.

**Q:** Performance threshold for implementing caching?
**Decision:** If world position computation exceeds 16ms (one frame budget) with realistic data, add memoization. Otherwise accept direct computation cost.
