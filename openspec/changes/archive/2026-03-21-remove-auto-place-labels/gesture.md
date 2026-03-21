# Gesture: remove-auto-place-labels

## Gesture type

dissolve

## What are we gesturing toward?

The auto-generated "Place N" text labels that render alongside place nodes on the canvas.

## Claim

Removing auto-generated "Place N" labels will reduce visual noise without degrading the user's ability to identify, interact with, or understand place centers. Places will remain distinguishable through their spatial positions and connection relationships.

## What made us do this?

Observation of the current canvas showing places with labels like "Place 1", "Place 2", "Place 3". The labels appear to be auto-generated identifiers rather than user-authored names. The visual markers (red dots) and spatial arrangement already distinguish places. The text labels add visual noise without conveying meaning — they identify places numerically rather than semantically.

## What are our load-bearing assumptions?

1. **Visual markers + spatial context are sufficient**: The red dot/pin markers combined with position and connection lines provide enough context to identify and distinguish places without text labels.

2. **Labels are auto-generated only**: These "Place N" labels are system-generated placeholders, not user-defined names. If users have given places meaningful names, those should be preserved and displayed differently.

3. **No functional dependency**: No canvas interactions (click, hover, drag) depend on the text label being present. The hit area and interaction target is the place marker itself.

## Spec files this gesture touches

- specs/place-labels/spec.md — removing auto-generated label rendering

## Co-variance: what else might this touch?

- Place rendering component (visual appearance)
- Canvas layout (less visual clutter)
- Any tests that assert on label text presence
- Data model clarity around place names vs identifiers
