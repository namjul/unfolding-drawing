# Gesture: animated-relation-lines-on-select

## Gesture type

strengthen

## What are we gesturing toward?

The **parent-child relation center** — the structural bond between places that currently exists in the data model (parentPlaceId field) and is always visible on canvas, but doesn't communicate its meaning effectively.

This center is alive: users actively create related places through the "Add Related Place" workflow, and the grouped-movement change made these relationships functional (children move with parents). But the visual representation hasn't evolved to match the structural importance.

⚠ **Dead structure check:** This is clearly alive. Users would notice if the parent-child relationship broke (grouped movement would fail). The relationship shapes how the drawing grows and behaves.

## Claim

When a place is selected, showing its parent-child relationships with animated direction indicators will:

1. **Make the structural meaning visible** — users will understand which place is parent and which is child without reading the inspector
2. **Reduce visual noise by default** — hiding relations until needed cleans up the canvas while preserving structural information
3. **Support the drawing-as-inquiry process** — seeing structure emerge helps users think about their drawing's organization

Specific prediction: Users will more quickly understand why moving a place also moves others (the grouped-movement behavior) because they'll see the visible connection at the moment of interaction.

## What made us do this?

**Raw observation:** The current implementation shows ALL relationship lines at ALL times. Every parent-child pair has a gray line connecting them. This creates visual clutter, especially as drawings grow.

**The noticing:** When I look at the canvas, the relationship lines compete with the places themselves for attention. But the lines aren't the drawing — they're scaffolding. They should support without dominating.

**Pattern:** Other drawing tools (Figma, Sketch) show structural relationships contextually. Constraints appear when you select. Groups show boundaries when active. The relation is always there in the data, but the visual representation is situational.

**The glossary clue:** The glossary says parent-child is an "unfolding relation" — it structures the drawing. The Drawing Pane is the "root Drawing Object." This suggests a layered structure where relations are foundational but not foreground.

## What are our load-bearing assumptions?

1. **Selection is the right trigger** — Users select places as their primary interaction mode. Showing relations on selection feels natural because the user has already indicated "I want to work with this place."

2. **Animation communicates direction** — A static line shows connection; an animated line shows flow. The direction from parent to child matters because it explains the grouped-movement behavior (parent moves, children follow).

3. **Scaffolding vs. drawing objects distinction exists** — Users can understand that relation lines are guides (like the places themselves are guide drawing objects according to the glossary) rather than part of their intentional drawing. This won't confuse them when we later add "line segment" drawing objects that ARE the drawing.

## Spec files this gesture touches

- specs/contextual-relation-display/spec.md — new capability for showing parent-child relations on selection
- specs/animated-direction-indicator/spec.md — new capability for animated direction visualization

## Co-variance: what else might this touch?

- **Inspector display** — Currently shows hierarchy list. Might need to coordinate with canvas relation display (highlight inspector entry when relations visible on canvas?)
- **Selection system** — Selection is the trigger, so this couples tightly to selection behavior
- **Canvas rendering** — Need CanvasKit animation capabilities, performance considerations for animated lines
- **Future line segment drawing objects** — Need clear visual distinction between relation lines (scaffolding, animated on selection) and drawn lines (persistent, static or styled by user)
- **Drawing Pane as root** — If we show parent relations, do we show the implicit relation to Drawing Pane for root places? Or is that too abstract?
