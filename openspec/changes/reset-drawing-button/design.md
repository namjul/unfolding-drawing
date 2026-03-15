## Context

Currently, the PlaceInspector has a disabled "Reset Drawing" button at line 77. The button exists but has no functionality wired up.

Current deletion mechanism:
- Places are marked as deleted via `evolu.update('place', { id, isDeleted: true })`
- Deleted places remain in the database but are filtered from queries
- Each deletion records a transformation entry

The system uses Evolu for local-first persistence with soft deletes (isDeleted flag). There's no existing bulk operation to clear all places at once.

## Goals / Non-Goals

**Goals:**
- Enable users to clear all places and start fresh within a session
- Prevent accidental data loss with confirmation
- Preserve application state (viewport, tool mode, pending changes handling)
- Follow existing architectural patterns for mutations

**Non-Goals:**
- Hard delete from Evolu database (keep using soft deletes)
- Undo functionality for reset (too complex for this change)
- Export/backup before reset (future enhancement)
- Clearing transformation history (preserve as permanent record)

## Decisions

### Decision 1: Soft Delete vs Hard Delete

**Chosen:** Soft delete all places (set `isDeleted: true` on all place records).

**Rationale:**
- Consistent with existing `deletePlace` operation
- Evolu's CRDT model works better with soft deletes for sync
- Preserves data integrity - places remain in database, just filtered from queries
- Future undo/recovery becomes possible
- Aligns with Evolu best practices

**Alternative considered:** Hard delete via Evolu's delete API
- **Rejected:** More destructive, harder to sync across devices, breaks transformation history references

### Decision 2: Transformation History Handling

**Chosen:** Record a single `resetDrawing` transformation entry, preserve all existing transformation history.

**Rationale:**
- Transformation log is a permanent audit trail of all actions
- Seeing "reset" in history helps users understand timeline
- Preserves context of what was done before reset
- Enables future analytics or replay functionality

**Alternative considered:** Clear all transformations when resetting
- **Rejected:** Loses valuable history, breaks the append-only log principle

### Decision 3: Confirmation Dialog Approach

**Chosen:** Use browser's native `confirm()` dialog.

**Rationale:**
- Simple, no additional UI components needed
- Blocks execution until user decides (synchronous)
- Familiar UX pattern
- Stage 1/2 scope doesn't require custom modals

**Alternative considered:** Custom modal component
- **Rejected:** Over-engineering for current scope; defer to Stage 9 (full inspector) if richer UI needed

### Decision 4: Pending Transformation Handling

**Chosen:** Reject any pending transformation before resetting, or block reset if transformation pending.

**Rationale:**
- Prevents confusion about what happens to staged changes
- Maintains clear semantics: commit or reject before resetting
- Consistent with "one pending transformation at a time" pattern

**Implementation:** Check if `pendingTransformation().kind !== 'none'`, if so either auto-reject or show message "Commit or reject pending change first"

**Alternative considered:** Auto-commit pending changes before reset
- **Rejected:** Surprising behavior; user might not want to commit

### Decision 5: Selection and Viewport State

**Chosen:** Clear selection, preserve viewport (zoom/pan position).

**Rationale:**
- Selecting nothing makes sense when there are no places
- Preserving viewport avoids disorienting jump
- User can manually reset viewport with existing "Reset view" button if desired

## Risks / Trade-offs

**[Risk]** User accidentally clicks "Reset Drawing" and loses work.
→ **Mitigation:** Confirmation dialog with clear message: "Delete all places? This cannot be undone."

**[Risk]** Soft-deleting many places could clutter the database over time.
→ **Mitigation:** Acceptable for Stage 1/2 scope. Future optimization could add database compaction or hard-delete threshold.

**[Risk]** Resetting with pending transformation might confuse users.
→ **Mitigation:** Either auto-reject pending changes or block reset with clear message.

**[Trade-off]** Native `confirm()` dialog is less polished than custom UI.
→ **Accepted:** Simplicity over polish for Stage 1/2. Can enhance in Stage 9 if needed.

**[Trade-off]** No undo for reset operation.
→ **Accepted:** Confirmation dialog is sufficient safeguard. Full undo system is out of scope.

## Implementation Approach

**In `drawing-ops.ts`:**
```typescript
const resetDrawing = () => {
  if (interaction.pendingTransformation().kind !== 'none') {
    interaction.rejectPending();
  }
  
  const currentPlaces = places();
  
  for (const place of currentPlaces) {
    evolu.update('place', {
      id: place.id,
      isDeleted: true
    });
  }
  
  recordTransformation('resetDrawing', {
    placeCount: currentPlaces.length,
    timestamp: Date.now()
  });
  
  interaction.setSelectedPlaceId(null);
  interaction.setHoveredPlaceId(null);
};
```

**In `PlaceInspector.tsx`:**
```typescript
const handleResetDrawing = () => {
  const confirmed = confirm('Delete all places? This cannot be undone.');
  if (confirmed) {
    props.onResetDrawing();
  }
};

<Button onClick={handleResetDrawing}>Reset Drawing</Button>
```

## Open Questions

**Q:** Should reset also clear the transformation history?
**Decision:** No, preserve transformation history as permanent record. Record "resetDrawing" entry instead.

**Q:** Should we auto-reject pending changes or block reset?
**Decision:** Auto-reject is simpler and follows principle of "reset clears everything."
