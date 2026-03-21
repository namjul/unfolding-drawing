# Delta Spec: animated-direction-indicator

## What behavior is being added?

**Animated direction flow on relation lines:** When a relationship line is displayed (because a place is selected), the line includes animation that indicates the direction from parent to child. The animation flows "downstream" from the parent toward the child, making the hierarchy direction immediately legible.

**Motion as meaning:** The animation is not decorative — it serves the specific purpose of showing which place is "upstream" (parent) and which is "downstream" (child). A user should be able to determine the direction by watching the animation for a moment.

**Continuous subtle motion:** The animation loops continuously while the relation is visible, maintaining the directional signal without requiring user action to replay it.

## What behavior is changing?

**Current behavior:** Relationship lines are static gray lines with no indication of direction. Users cannot determine from the line alone which place is parent and which is child.

**New behavior:** Relationship lines that appear on selection include animated direction indicators. The animation style is TBD (dashed line flow, particle movement, gradient wipe, or pulse) but must clearly communicate direction from parent to child.

**Visual weight of relations:** Previously, relation lines were subtle static elements. With animation, they become more noticeable — this is intentional, but the animation should feel meaningful rather than distracting.

## What behavior is being removed?

**Static-only relation lines:** When relation lines are visible, they will no longer be completely static. They will include some form of motion indicating direction.

**Ambiguous direction:** Users will no longer need to guess or check the inspector to know which end of a relationship line is the parent.

## What stays the same?

- **Line geometry:** The path from parent to child (straight line between place positions) remains unchanged
- **Color scheme:** The line color and transparency settings remain consistent with current implementation
- **Canvas rendering pipeline:** Lines are still rendered via CanvasKit; animation is handled within the existing rendering framework
- **Performance baseline:** Animation should not degrade the 60fps target; if it does, animation complexity will be reduced rather than performance sacrificed
- **Accessibility of static state:** When no place is selected, there are no relation lines at all — no animation needed

## Animation approach (TBD in design phase)

The specific animation technique will be determined during design, but options include:
- Flowing dashed pattern moving parent → child
- Traveling dot or particle along the line
- Gradient wipe sweeping parent → child  
- Subtle pulse emanating from parent toward child
- Arrowhead fade-in at child end with directional emphasis

The chosen approach must satisfy: (1) clear direction communication, (2) not visually distracting, (3) performant at 60fps.
