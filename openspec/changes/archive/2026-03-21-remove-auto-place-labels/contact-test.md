# Contact Test: remove-auto-place-labels

## Evidence tier

proximal — direct observation of the canvas after label removal

## What would success look like?

- Places remain visually distinguishable through their marker dots and spatial positions
- Connection lines between places are clearly visible without label interference
- Canvas feels less cluttered; places read as "centers" through relationship, not text
- Can still select, drag, and interact with places normally (hit area unchanged)
- No confusion about which place is which when multiple exist on canvas

## What would falsify this claim?

- Places become indistinguishable when positioned close together
- Users (or observer) cannot identify which place to interact with without text labels
- Canvas interactions break because code was referencing label elements
- Tests fail because they depend on label text for place identification
- User-defined place names (if they exist) are also removed accidentally

## How will we check?

**hard:** Run existing test suite to catch any label-dependent assertions
**soft:** After implementation, manually interact with the canvas — create multiple places, connect them, drag them, verify the visual hierarchy holds without text

## When will we check?

Immediately after implementation, before commit.
