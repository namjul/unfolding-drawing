# Delta Specs: remove-auto-place-labels

## What behavior is being added?

No new behavior is being added.

## What behavior is changing?

Place rendering will no longer display auto-generated "Place N" text labels. The visual markers (dots/pins) remain unchanged and continue to render at place positions.

## What behavior is being removed?

The automatic generation and display of numeric place labels ("Place 1", "Place 2", etc.) that currently appear as dark pill-shaped badges near each place marker.

## What stays the same?

- Place markers (red dots/pins) continue to render at place positions
- Place connections (dotted lines between places) continue to render
- Place hit areas for selection, dragging, and interaction remain unchanged
- Spatial positioning and layout of places on canvas remain the same
- Any user-defined place names (if they exist in the data model) are preserved in data but not necessarily displayed
- Place creation, deletion, and connection gestures work the same way
