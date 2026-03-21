# Design: animated-relation-lines-on-select

## Approach

**Two coordinated changes to PlaceCanvas.tsx:**

1. **Filter relation line visibility by selection state:** Draw only relationship lines connected to the currently selected place using "parent + full subtree" rule:
   - **Always show:** The line from the selected place's immediate parent (if it has one)
   - **Always show:** All lines in the selected place's subtree — every descendant at every depth (children, grandchildren, etc.)
   - **Never show:** Lines to grandparents, great-grandparents, or ancestors beyond immediate parent
   - **Never show:** Lines from unrelated places or siblings not in the selected subtree
   - When no place is selected (canvas selected), draw no relation lines at all

2. **Animate direction on visible lines:** For all relation lines that ARE drawn (the parent connection and entire descendant subtree), add animation indicating parent → child direction. Use a **sparse traveling pulse** — a small dash (6px) with large gap (60px) that moves along the line, occupying only ~9% of the visual space.

**Implementation sketch:**
- Modify `drawRelationshipLines()` in PlaceCanvas.tsx to accept `selectedPlaceId` parameter
- Build a set of place IDs in the selected place's subtree (recursive descent from selected place)
- Add condition: draw line if `place.id === selectedPlaceId` (parent connection) OR `parent.id` is in the subtree set (descendant connection)
- For visible lines, use CanvasKit's dash path effect with animated phase offset
- Animation driven by time-based phase shift, updated each frame via existing `queueDraw()` mechanism
- **Revised:** Sparse dash pattern (6px dash, 60px gap) with 1px stroke and 25% opacity for minimal visual weight

## Why this approach?

**Flowing dashed pattern chosen because:**
- **Proven in graphics:** Dashed line animation is a standard technique for showing flow/direction (used in subway maps, flow diagrams)
- **CanvasKit native support:** CanvasKit supports path dashes with controllable phase offset — no custom shader needed
- **Subtle but legible:** Motion catches attention without being visually loud; direction is readable at a glance
- **Performance safe:** Single numeric property (phase) changes per frame; no geometry recalculation

**Rejected alternatives:**
- **Traveling dots/particles:** Would require managing particle state, spawning/despawning — too complex for this scope
- **Gradient wipe:** Requires shader or complex gradient animation; overkill for simple direction indication
- **Pulse emanating from parent:** Direction less clear; could be interpreted as "activity" rather than "flow"
- **Arrowheads:** Static arrowheads would work but add visual weight; animation provides dynamic direction signal

**Selection-triggered approach chosen because:**
- **Natural fit:** User has already indicated "I care about this place" by selecting it
- **Discoverable:** Users will naturally see the effect when they interact with places
- **Non-modal:** Doesn't require entering a special mode or holding modifier keys
- **Consistent with grouped-movement:** Selection is already the trigger for move operations; keeping the same trigger reduces cognitive load

## What are our load-bearing assumptions about the approach?

1. **CanvasKit dash animation is performant:** We assume that updating a dash phase offset each frame won't cause frame drops on typical devices. If this proves false, we'll fall back to static lines or simpler animation.

2. **Direction is readable from flow animation:** We assume users can intuit that flowing dashes move from parent to child. If testing shows confusion, we may need to add arrowheads or try a different animation style.

3. **Parent + full subtree visibility provides grouped-movement clarity:** We assume showing the immediate parent plus ALL descendants makes the grouped-movement behavior fully comprehensible — users see "what controls me" (parent) and "what I control" (entire subtree). If this proves too visually noisy for deep hierarchies, we may need depth-limiting or progressive disclosure.

4. **No need to show root relation:** We assume not showing a relation line to the Drawing Pane for root places is acceptable (the Drawing Pane is an abstract container, not a visual object).

## Risks and trade-offs

**Risk: Animation could be distracting**
Even subtle animation adds motion to the canvas. Users focused on precise drawing might find it distracting. Mitigation: Keep animation slow and subtle; provide fallback to disable if needed (future consideration).

**Risk: Selection-only visibility might hide too much**
Users might lose track of which places are related to which when lines are hidden. The inspector shows hierarchy, but users might not look there. Mitigation: Monitor whether users seem confused; consider hover-as-preview if selection-only proves too hidden.

**Trade-off: Less "at a glance" structural understanding**
With all lines visible, you could see the entire hierarchy shape immediately. With filtered visibility, you lose that global view. Accepted trade-off: Local clarity over global visibility; the inspector preserves global view for those who need it.

**Risk: CanvasKit dash effects might not work as expected**
CanvasKit's dash path effects have specific requirements. We might hit edge cases (very short lines, very long lines, scaled viewports). Mitigation: Test with various place arrangements; adjust dash pattern parameters as needed.

## What we are not doing

- **Not animating lines on hover:** Only selection triggers visibility; hover stays reserved for other interactions (like the upcoming cursor/gesture work)
- **Not showing relation lines for the Drawing Pane:** Root places have no visible parent connection; the Drawing Pane remains an implicit container
- **Not changing inspector hierarchy display:** The inspector continues to show full hierarchy; this change is canvas-only
- **Not adding animation controls:** No user preferences for animation speed or style in this iteration; we pick one subtle approach and ship it
- **Not animating all lines:** Only lines connected to selected place get animation; we don't animate every line in the drawing
- **Not showing ancestors beyond immediate parent:** We show the parent connection but not grandparents, great-grandparents, etc.
- **Not showing root-to-canvas relation (future consideration):** According to the glossary, the Drawing Pane is the parent of all root places. Currently we don't show this relation visually. Future consideration: show a subtle indicator (special highlight, viewport-edge connection, or distinct visual treatment) for root places to acknowledge their relation to the canvas itself, making the parent-subtree rule consistent at all levels.

## Known unknowns

- ~~**Optimal dash pattern parameters:** How long should dashes be? How much gap? How fast should they flow? We'll need to tune these by feel.~~ **RESOLVED:** Revised to sparse pulse pattern (6px dash, 60px gap) to reduce visual weight. Base line opacity reduced to 25% with 1px stroke.
- **Subtree traversal performance:** Building the descendant set requires walking the entire subtree. For very deep hierarchies (>100 places in subtree), this could impact frame time. May need optimization if profiling shows issues.
- **Behavior during place drag:** When dragging a selected parent and children follow, should relation lines animate differently? Stay visible? These are animation state questions to resolve during implementation.
- **Interaction with future line segment drawing objects:** How will we visually distinguish animated relation lines (scaffolding) from user-drawn line segments (actual drawing)? May need different color, weight, or animation style.
- **Performance on low-end devices:** CanvasKit animation might perform differently on various hardware. We may need adaptive animation (disable on slow devices) if frame drops occur.

## Co-variance: what else might this touch?

- **SelectionTarget state:** The component already receives `selectedPlaceId`; we just need to ensure the filtering logic uses it correctly
- **Drawing loop timing:** Animation requires consistent frame timing; may need to verify `queueDraw()` behavior with animation
- **Paint configuration:** Will need to create or modify Paint objects to support dashed paths with animated phase
- **Viewport scaling:** Dash appearance should remain consistent at different zoom levels (dash length in screen pixels, not world pixels)
- **Inspector coordination:** Future consideration: highlight inspector hierarchy entry when canvas shows relation lines to reinforce the connection

## ⚠ Design warnings

### Responsiveness
The animation must not interfere with the core drawing interactions (selecting, moving places). If the animation causes lag or makes the cursor feel unresponsive, we've harmed the core experience for a secondary feature. The animation phase calculation must be lightweight and non-blocking.

### Continuity after correction
If a user accidentally selects the wrong place, they can click elsewhere or the canvas to clear selection. The relation lines should disappear smoothly (next frame), allowing them to continue their intended workflow without visual residue. The "hide all lines on canvas selection" state must be clean and immediate.

### Exploratory capacity
This intervention doesn't restrict what users can do — it only changes visual feedback. Users can still create any hierarchy, move any place, discover any structure. However, if the animation is too attention-grabbing, it might inadvertently guide users toward noticing structure over making marks. We must ensure the animation serves inquiry ("what's connected to this?") without demanding attention.
