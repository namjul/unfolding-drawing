# Explore: animated-relation-lines-on-select

## What we are noticing

The parent-child relationship between places is currently always visible as static relationship lines on the canvas. However, according to the glossary, this relationship is an "unfolding relation" — it structures the drawing but isn't itself a drawing object that should always be visible.

The current implementation shows relationship lines for ALL parent-child pairs at all times. This creates visual noise and distracts from the actual drawing objects (the places themselves).

When a user selects a place, we want to reveal the structural relationships contextually — showing only the relevant relations for the selected place and its immediate family (parent and children). This would make the relation visible when it matters, hidden when it doesn't.

Direction matters: we need to show which place is the parent and which is the child. Static lines don't communicate direction clearly.

## What we don't understand

- What is the right visual treatment for revealing these relations? A line? An arrow? Something more subtle?
- What animation style best communicates "direction from parent to child" without being distracting?
- Should the animation be continuous (looping) or triggered (plays once on selection)?
- How do we handle the distinction between "scaffolding" (structural/guide elements) and actual drawing objects when displaying relations?
- When exactly should relations appear? On hover? On explicit selection? On some other interaction?
- Should we show the entire lineage (ancestors and descendants) or just immediate parent/children?
- How will this interact with future "line segment" drawing objects that ARE drawing objects, not just relations?

## What we want to poke at

1. **Sketch 3-5 visual approaches** on paper or ASCII:
   - Simple animated dashed line flowing from parent to child
   - Particle/dots traveling along the line
   - Gradient wipe along the line direction
   - Subtle pulse emanating from parent toward child
   - Arrowhead appearing at child end with fade-in

2. **Review existing implementations** in other drawing tools (Figma's constraint indicators, Sketch's group indicators, etc.) to see patterns for showing structural relationships contextually

3. **Code spike**: Try implementing one simple approach (animated dashed line) in PlaceCanvas.tsx to see how it feels with the CanvasKit rendering pipeline

4. **Test the interaction model**: When should it trigger?
   - Option A: Hover on place shows relations immediately
   - Option B: Selection only (click to see)
   - Option C: Hold modifier key to reveal
   - Option D: Some combination

## What would make this worth a full intervention

- **If** we find a visual approach that clearly communicates parent-child direction without adding visual clutter
- **If** we determine the right interaction trigger (selection vs hover vs other) that feels natural and discoverable
- **If** we can articulate why this particular animation/rendering style fits the "living structure" philosophy of the system
- **If** we can distinguish clearly between "relation lines" (scaffolding, contextually visible) and "line segments" (actual drawing objects, always visible when persisted)

The exit condition: We can describe an observable difference between "relations hidden" and "relations visible" states that strengthens the drawing experience rather than adding noise.
