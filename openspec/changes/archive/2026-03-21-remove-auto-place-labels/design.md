# Design: remove-auto-place-labels

## Approach

Locate the place rendering component and remove the label rendering logic while preserving the place marker (dot/pin) rendering. This is a surgical removal of the label generation and display code without changing place positioning, hit areas, or connection rendering.

## Why this approach?

Direct removal is simplest because:
- The claim is that labels are inert — removing them shouldn't require replacement behavior
- Visual markers + spatial context already provide sufficient identification
- No need to add complexity (hover states, toggles) when the problem is noise reduction
- Dissolving dead structure is cleaner than managing it

Alternative considered: keeping labels but hiding by default, showing on hover. Rejected because it adds complexity (state management, hover detection) without solving the core problem — the labels don't carry meaning worth surfacing at all.

## What are our load-bearing assumptions about the approach?

1. **Labels are cleanly separable**: The label rendering code is distinct from marker rendering and can be removed independently without affecting markers or connections.

2. **No other dependencies**: No code outside the place component references these labels (e.g., no label-based selection logic, no tests asserting on label text).

3. **Single location**: Label rendering logic lives in one place (the place component) rather than being duplicated or scattered.

## Risks and trade-offs

- **Test breakage**: If tests assert on label presence or text content, they will fail and need updating. This is acceptable work if it happens.
- **User surprise**: If users have grown accustomed to the labels, their sudden absence might feel like a bug rather than cleanup. Contact test will verify if places remain usable.
- **Accessibility**: Screen readers might have used label text. Need to verify if places have alternative accessibility attributes.

## What we are not doing

- Not adding user-configurable label visibility settings (too much complexity for cleanup)
- Not removing place markers themselves (only the text labels)
- Not changing the data model or how places are stored
- Not modifying connection rendering or canvas layout logic
- Not implementing user-defined place names (out of scope for this dissolution)

## Known unknowns

- Exact location of place rendering code in the codebase
- Whether labels are rendered as a separate component or inline
- If there's any shared logic between label generation and marker rendering
- Presence of tests that assert on label text
- Whether user-defined place names exist and how they're distinguished from auto-generated ones

## Co-variance: what else might this touch?

- Place rendering component(s)
- Any stylesheets targeting place labels
- Tests asserting on place structure
- Canvas layout calculations (if label dimensions affected positioning, though unlikely)

## ⚠ Design warnings

### Responsiveness

After this change, users will still see immediate visual feedback when interacting with places — the markers remain and are the interaction targets. Removing labels doesn't introduce delay or ambiguity; it reduces visual noise.

### Continuity after correction

Not applicable — this is a removal intervention, not an interaction change. Undo/redo of place operations continues to work the same way.

### Exploratory capacity

Removing labels doesn't constrain exploration. Places remain discoverable through their markers and spatial relationships. No new constraints are introduced.
