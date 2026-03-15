## Context

Stage 1 established the core place editing workflow:
- Places are created via `stageAddPlace` → `commitPending` → `evolu.insert('place')`
- All operations follow staging pattern: stage → modify → commit/reject
- `drawing-ops.ts` owns persistence; `interaction-state.ts` owns transient state
- Canvas renders three place states: normal, draft (amber), deletion-staged (red overlay)
- `parentPlaceId` field exists in schema but is currently always `null`

Stage 2 extends this pattern to support hierarchical relationships. The blueprint explicitly states:
> "add related places, show parent/child relationships, inspect simple structure"

Current architecture cleanly separates concerns:
- **Interaction layer**: `interaction-state.ts` manages tool modes and pending transformations
- **Operation layer**: `drawing-ops.ts` commits changes and records transformation history
- **Rendering layer**: `PlaceCanvas.tsx` derives display state from persisted + pending
- **Inspection layer**: `PlaceInspector.tsx` shows selection, controls, and history

## Goals / Non-Goals

**Goals:**
- Extend staging workflow to support parent-referenced place creation
- Make parent-child relationships visually legible on canvas
- Enable users to see and navigate hierarchy in inspector
- Preserve existing Stage 1 operations unchanged (no breaking changes)
- Follow existing architectural patterns for consistency

**Non-Goals:**
- Complex tree manipulation (reparenting, drag-and-drop in tree)
- Multi-level relationship rendering (only direct parent-child)
- Auto-layout or constraint-based positioning
- Connection objects (those come in Stage 3)
- Circular field or axis organizers (Stages 4-5)

## Decisions

### Decision 1: Extend Staging Pattern vs Separate Flow

**Chosen:** Extend existing `stageAddPlace` with optional parent parameter.

**Rationale:**
- Minimizes new concepts - users already understand staging
- Reuses commit/reject infrastructure
- Keeps `drawing-ops.commitPending` as single mutation point
- Aligns with blueprint principle: "extend rather than replace"

**Alternative considered:** Create separate `stageAddRelatedPlace` function.
- **Rejected:** Would duplicate staging logic and split the mental model of "adding places"

### Decision 2: Tool Mode - New Mode vs Mode Parameter

**Chosen:** Add new tool mode `'addRelatedPlace'` alongside existing `'select'` and `'addPlace'`.

**Rationale:**
- Clear visual affordance when in "add related" mode
- Inspector can show current tool mode and required context (parent must be selected)
- Prevents accidental related place creation
- Follows existing `enterAddPlaceMode` pattern

**Alternative considered:** Use `'addPlace'` mode but check if parent is selected.
- **Rejected:** Less explicit; harder to give clear user feedback about what will happen on click

### Decision 3: Relationship Visualization Approach

**Chosen:** Render straight lines from parent center to child center in a dedicated render pass between base places and overlays.

**Rationale:**
- Simple and clear visual representation
- Matches Stage 3 connection rendering (establishes pattern early)
- Doesn't interfere with selection or hover rings
- Can be rendered in single pass through all places

**Alternatives considered:**
1. **Highlight parent when child selected** - Rejected: doesn't show structure when nothing selected
2. **Tree layout with connecting brackets** - Rejected: too visually complex, conflicts with free positioning
3. **Subtle background grouping regions** - Rejected: unclear boundaries, occlusion issues

**Visual specification:**
- Line from parent `(x, y)` to child `(x, y)`
- Gray color (`rgba(128, 128, 128, 0.4)`) to avoid competing with selection/hover
- Render behind places but above grid
- When parent or child is selected, highlight their relationship line (brighter gray or cyan)

### Decision 4: Inspector Structure Display

**Chosen:** Flat list with indentation for children, not a collapsible tree.

**Rationale:**
- Stage 2 goal is "simple structure list" (per blueprint)
- Flat list easier to implement and understand
- Indentation shows hierarchy clearly for shallow trees
- Defer tree widget complexity until Stage 9 (full inspector)
- Matches transformation history list pattern (simple scrolling list)

**Alternative considered:** Full collapsible tree widget.
- **Rejected:** Over-engineered for Stage 2 scope; introduces state management for expand/collapse

**Display format:**
```
Places:
  - Place 1 (root)
    - Place 2 (child of 1)
    - Place 3 (child of 1)
  - Place 4 (root)
```

### Decision 5: Transformation Recording

**Chosen:** Record `addRelatedPlace` as distinct transformation kind with `parentPlaceId` in payload.

**Rationale:**
- Makes parent relationship explicit in history
- Allows future replay or undo to preserve structure
- Differentiates intentional hierarchy from accidental positioning

**Payload shape:**
```typescript
{
  placeId: string,
  parentPlaceId: string,
  x: number,
  y: number
}
```

## Risks / Trade-offs

**[Risk]** Rendering relationship lines for large hierarchies could impact performance.
→ **Mitigation:** Stage 2 assumes small graphs (per blueprint). Defer viewport culling and render optimization to later stages when measurement shows need.

**[Risk]** Users may expect reparenting or tree editing, which Stage 2 doesn't provide.
→ **Mitigation:** Inspector clearly shows hierarchy as read-only list. Document that parent is set at creation time. Future stages can add reparenting if usage shows demand.

**[Risk]** Visual relationship lines may clutter canvas when many places have parents.
→ **Mitigation:** Use subtle gray; only highlight when parent or child is selected. If clutter appears in practice, add toggle to show/hide relationship lines.

**[Trade-off]** Flat list with indentation breaks down for deep hierarchies (>3 levels).
→ **Accepted:** Stage 2 scope is "simple structure"; blueprint doesn't require deep tree support yet. Stage 9 full inspector can introduce collapsible tree if needed.

**[Trade-off]** New tool mode adds UI complexity (one more button/mode to explain).
→ **Accepted:** Explicitness is worth the complexity. Clear modes prevent confusion about what will happen on click.

## Migration Plan

Not applicable - Stage 2 is additive, no breaking changes to existing persisted data or user workflows.

**Rollout approach:**
1. Implement `stageAddRelatedPlace` and tool mode infrastructure
2. Add relationship rendering to canvas
3. Add inspector hierarchy list
4. Add UI controls to inspector

Each step preserves existing functionality - Stage 1 workflows continue working throughout.

## Open Questions

**Q:** Should relationship lines show direction (e.g., arrow from parent to child)?
**Decision:** No for Stage 2. Simple line is sufficient. Direction can be inferred from inspector hierarchy list. Revisit if user testing shows confusion about parent vs child.

**Q:** Should selecting a parent automatically highlight all its children?
**Decision:** Not for Stage 2. Keep selection simple (one place at a time). Multi-selection and relationship-based selection is Stage 9+ scope.

**Q:** Should there be a keyboard shortcut to enter "add related place" mode?
**Decision:** Defer. Stage 2 focuses on establishing the capability; interaction refinement is Stage 10 scope.
