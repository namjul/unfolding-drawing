## Context

### Current Tool Mode System

**State:** `tool: 'select' | 'addPlace'`

**Lifecycle:**
1. Default: `tool = 'select'`
2. User clicks "Stage place from canvas click" → `tool = 'addPlace'`
3. User clicks canvas → place created, `tool = 'select'`

**Behavioral impact:** Only one location checks tool mode (`PlaceCanvas.tsx:465`):
```typescript
if (props.tool() === 'addPlace' && ...) {
  props.onStageAddPlace(world.x, world.y);
} else if (isTap) {
  props.onSelectPlace(hitPlaceId); // null = deselect
}
```

**Current selection model:** `selectedPlaceId: string | null`
- `null` means "no place selected"
- Does not distinguish "canvas selected" from "nothing selected"
- Clicking empty canvas sets `selectedPlaceId = null`

**Current drag-to-move:** User selects place, drags it, move is staged automatically during drag.

**Current inspector panels:**
1. Observation
2. Tool (shows current mode + "Stage place" button)
3. Pending change
4. Selection (shows selected place details + delete button)
5. Viewport
6. History

### Constraints

- Must preserve existing commit/reject workflow
- Must preserve transformation recording
- Cannot break persisted data model
- Must work with Evolu's reactive queries
- Stage 2 (hierarchy) will extend this with "Add Related Place"

---

## Goals / Non-Goals

**Goals:**
- Remove implicit mode switching (tool mode)
- Make selection explicit and visible (canvas is selectable)
- Make transformations discoverable (panel shows available operations)
- Simplify interaction model (one path: select target → choose transformation → execute)
- Add visual feedback for canvas selection
- Support future hierarchy extensions

**Non-Goals:**
- Multi-selection (multiple places selected)
- Drag-and-drop reordering in inspector
- Undo/redo system
- Keyboard shortcuts (defer to Stage 10)
- Advanced selection modes (marquee, lasso)

---

## Decisions

### Decision 1: Explicit Selection Model

**Chosen:** Replace `selectedPlaceId: string | null` with `selectionTarget: SelectionTarget`
```typescript
type SelectionTarget = 
  | { kind: 'canvas' }
  | { kind: 'place'; placeId: string }
```

**Rationale:**
- Explicit "canvas selected" state enables showing "Add Place" as contextual action
- Backward compatible: provide `selectedPlaceId()` accessor returning `string | null`
- Type-safe: discriminated union prevents invalid states
- Extensible: future "connection selected" or "organizer selected" can be added

**Alternative considered:** Keep `null = canvas`, add separate `isCanvasSelected` boolean
- **Rejected:** Dual state tracking, possible inconsistency, less type-safe

---

### Decision 2: Awaiting Transformation Target State

**Chosen:** Add `awaitingTransformationTarget` signal to track intermediate state between button click and canvas click
```typescript
type AwaitingTransformationTarget = 
  | { kind: 'none' }
  | { kind: 'addPlace' }
  | { kind: 'movePlace'; placeId: string }
```

**Rationale:**
- Separates "what transformation user wants" from "what's pending commit"
- Canvas click handler checks this instead of tool mode
- Inspector can show "→ Click canvas to complete" message
- Clear state lifecycle: click button → awaiting → click canvas → pending → commit/reject

**Alternative considered:** Reuse pending transformation state
- **Rejected:** Pending = "already executed, awaiting commit"; Awaiting = "user clicked button, waiting for target"

---

### Decision 3: Keep Drag-to-Move with Awaiting State

**Chosen:** Move transformation initiated via button, completed via drag gesture.

**Rationale:**
- Direct manipulation feels more natural for spatial transformations
- User clicks "Move Place" button to enter move mode, then drags place to new location
- Awaiting state makes the interaction explicit (must click button first)
- Drag only works when awaiting movePlace (prevents accidental moves)
- Maintains familiar spatial interaction while adding intentionality
- Pan gesture remains (middle mouse / spacebar + drag)

**Alternative considered:** Remove drag, use button + canvas click
- **Rejected:** User preference for drag interaction for spatial positioning; less direct for move operations

---

### Decision 4: Auto-Reject Pending Transformations

**Chosen:** When user clicks transformation button while pending exists, auto-reject pending and start new transformation.

**Rationale:**
- Fluid workflow: no need to manually reject before trying new action
- Matches user intent: clicking new action implies canceling old one
- Reduces clicks and mental overhead
- Transformation buttons still disabled while awaiting (not while pending)

**Alternative considered:** Block transformation buttons when pending
- **Rejected:** Forces manual reject, interrupts flow

**Alternative considered:** Show warning dialog
- **Rejected:** Unnecessary friction for recoverable action

---

### Decision 5: Canvas Selection Highlight

**Chosen:** Draw 4px red border around canvas edges when canvas is selected.

**Visual spec:**
- Color: `Color(248, 113, 113, 1)` (same as place selection ring)
- Width: 4px (screen space, not scaled with viewport)
- Style: Solid line (not dashed)
- Position: Inset half border width from canvas edges
- Render: Screen space (after `canvas.restore()`, before next frame)

**Rationale:**
- Consistent with place selection (same color and prominence)
- Full border clearly indicates "canvas is the target"
- Screen-space rendering keeps border constant width regardless of zoom
- Simple to implement and understand

**Alternative considered:** Corner brackets only
- **Rejected:** Less clear, might be mistaken for UI chrome

**Alternative considered:** Different color (blue)
- **Rejected:** Inconsistent with place selection, creates color vocabulary confusion

---

### Decision 6: Inspector Panel Order

**Chosen:** Observation → Selection → Transformations → Pending change → Place Details → Viewport → History

**Rationale:**
- Selection comes first in interaction flow (select target)
- Transformations immediately follow (choose action on target)
- Pending change shows result of action (staged transformation)
- Place Details provides extended info (separate concern from selection)
- Matches mental model: "what's selected → what can I do → what's staged → details"

**Alternative considered:** Put Selection at top (before Observation)
- **Rejected:** Observation panel provides context and reset actions, should stay at top

---

### Decision 7: Delete Transformation Behavior

**Chosen:** Delete executes immediately (no canvas click needed), stages deletion like current behavior.

**Rationale:**
- Delete has no target position (unlike add/move)
- Consistency: delete remains one-click action
- User expectation: "delete this place" doesn't need additional canvas input

**Move delete button:** From Place Details panel to Transformations panel.
- Groups all actions together
- Visible when place selected
- Transforms panel becomes single action hub

---

### Decision 8: Backward Compatibility for selectedPlaceId

**Chosen:** Provide `selectedPlaceId()` accessor that derives from `selectionTarget()`.

**Rationale:**
- Existing code reads `selectedPlaceId()` in many places
- Accessor maintains API contract
- Components that don't need selection model can keep using simple string | null

**Implementation:**
```typescript
const selectedPlaceId = () => {
  const target = selectionTarget();
  return target.kind === 'place' ? target.placeId : null;
};
```

---

## Risks / Trade-offs

**[Risk]** Two clicks for every transformation may feel slower than drag-to-move.
→ **Mitigation:** Accepted trade-off for clarity and discoverability. Stage 10 can add keyboard shortcuts if speed becomes issue.

**[Risk]** Auto-reject pending might surprise users if they click button accidentally.
→ **Mitigation:** Pending change panel always shows what's staged; user can visually confirm before committing.

**[Risk]** Canvas border might be distracting or visually noisy.
→ **Mitigation:** Border only appears when canvas selected; clicking any place removes it. If problematic, can reduce opacity or make border dashed.

**[Risk]** Removing drag-to-move might frustrate users accustomed to direct manipulation.
→ **Mitigation:** Button + click still feels direct (two interactions total). Matches existing add place workflow. Can revisit if user feedback demands drag.

**[Trade-off]** More state to manage (selection + awaiting) increases complexity.
→ **Accepted:** Explicit state reduces behavioral coupling and makes flow easier to reason about.

**[Trade-off]** Longer inspector (more panels) requires more scrolling.
→ **Accepted:** Panels are organized by interaction flow. Observation and Selection always visible at top. Can collapse panels in future if needed.

---

## Migration Plan

**This is a UI redesign with no data migration needed.**

**Deployment:**
1. Make changes in feature branch
2. Test all transformation workflows
3. Merge to main
4. Users see new interaction model immediately

**Rollback:**
- Git revert if critical issues found
- No data cleanup needed (persistence unchanged)

**User transition:**
- Existing staged transformations preserved (commit/reject still works)
- Existing persisted data unchanged
- Interaction pattern changes but mental model should transfer (select → act → commit)

---

## Implementation Notes

### Canvas Click Handler Refactor

**Current:**
```typescript
if (tool === 'addPlace' && ...) {
  onStageAddPlace(x, y);
} else if (isTap) {
  onSelectPlace(hitPlaceId); // null or string
}
```

**New:**
```typescript
const awaiting = awaitingTransformationTarget();

if (awaiting.kind === 'addPlace') {
  onStageAddPlace(x, y);
  clearAwaitingTransformation();
} else if (awaiting.kind === 'movePlace') {
  onStageMovePlace(awaiting.placeId, x, y);
  clearAwaitingTransformation();
} else {
  // Normal selection
  if (hitPlaceId) {
    onSelectPlace({ kind: 'place', placeId: hitPlaceId });
  } else {
    onSelectPlace({ kind: 'canvas' });
  }
}
```

### Drag-to-Move Removal

Find and remove in `PlaceCanvas.tsx`:
- Drag threshold check for place movement
- Call to `stageMovePlace` on drag start
- Call to `updatePendingMove` during drag continuation
- Keep pan drag (middle mouse / spacebar)

### Canvas Border Rendering

Render in screen space (outside world transform):
```typescript
if (selectionTarget().kind === 'canvas') {
  canvas.restore(); // Exit world space
  
  const size = canvasSize();
  const borderWidth = 4;
  const inset = borderWidth / 2;
  
  paints.canvasSelectionBorder.setStrokeWidth(borderWidth);
  
  // Draw 4 lines forming border
  canvas.drawLine(inset, inset, size.width - inset, inset, paint);
  canvas.drawLine(size.width - inset, inset, size.width - inset, size.height - inset, paint);
  canvas.drawLine(size.width - inset, size.height - inset, inset, size.height - inset, paint);
  canvas.drawLine(inset, inset, inset, size.height - inset, paint);
  
  canvas.save(); // Re-enter world space
  canvas.translate(viewport.x, viewport.y);
  canvas.scale(viewport.scale, viewport.scale);
}
```

---

## Open Questions

**Q:** Should there be a keyboard shortcut to select canvas?
**Decision:** Not in this change. Defer to Stage 10 (interaction refinement).

**Q:** Should canvas remain selected after committing a new place?
**Decision:** No. After committing add, new place becomes selected (existing behavior preserved).

**Q:** Should "awaiting transformation" timeout after inactivity?
**Decision:** No. User can click Reject or select different transformation to clear awaiting state.
