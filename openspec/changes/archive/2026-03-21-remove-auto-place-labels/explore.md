# Explore: remove-auto-place-labels

## What we are noticing

Places in the drawing environment currently render with auto-generated labels like "Place 1", "Place 2", "Place 3", etc. These labels are positioned near each place node and displayed in dark pill-shaped containers.

From observation of the current canvas state:
- Each place has a visual marker (red dot/pin) that already distinguishes it spatially
- Dotted connection lines between places establish relational context
- The auto-generated "Place N" text adds visual noise without conveying meaningful information
- The labels appear to be system-generated rather than user-authored

## What we don't understand

- How are place labels currently generated? Is there a naming convention in the data model?
- Do users ever interact with these labels (click, edit, reference them)?
- Are there user-defined place names that should be preserved separately from auto-generated ones?
- What code currently renders these labels and how tightly coupled is it to the place rendering logic?
- Would removing labels affect any accessibility concerns or screen reader behavior?

## What we want to poke at

**Smallest investigation:**
1. Locate the place rendering code in the codebase
2. Identify where "Place N" labels are generated (likely a string template or auto-incrementing counter)
3. Temporarily remove the label rendering while keeping the visual marker
4. Observe whether the places remain identifiable through position and connections alone

**Code exploration:**
- Search for "Place" string rendering in components
- Check if there's a `name` or `label` field on place data structures
- Look for any tests that assert on label presence

## What would make this worth a full intervention

If we find that:
- The labels are purely decorative/system-generated with no user input
- The visual markers + spatial context + connections are sufficient for identification
- No functionality depends on these labels (no click handlers, no search, no referencing)

Then this qualifies as removing inert structure — a valid dissolution that increases coherence by reducing noise without loss of meaning.

If we discover user-defined labels exist and are meaningful, we would need to separate those from auto-generated ones rather than removing all labels.
