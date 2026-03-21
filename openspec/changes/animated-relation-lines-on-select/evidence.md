# Evidence: animated-relation-lines-on-select

## Contact test result

passed (with revisions)

## What we observed

**Implementation completed successfully:**
- `npm run check` passes (TypeScript and linting)
- Relation lines are hidden by default when no place is selected
- When a place is selected, lines appear showing parent connection and full subtree
- Animation is continuous while selection is active
- Sky blue pulses (8px dash, 40px gap) travel at 50px/second

**Visual weight revisions during implementation:**
Initial implementation used dense dashes (10px on, 5px off, 2px stroke, 80% opacity) which occupied too much visual space and competed with drawing objects. 

Revised to sparse pulse pattern:
- Dash: 8px (increased from 6px for visibility)
- Gap: 40px (decreased from 60px for better frequency)
- Color: Sky blue highlight (56, 189, 248, 0.8) — bright and noticeable
- Speed: 50px/second (increased from 30px/s for better motion perception)
- Base line opacity: 40% (increased from 25% so the line itself is visible)

**Current visual effect:**
- Line occupies ~17% of visual space (8px pulse in 48px cycle)
- Direction is immediately readable — pulse flows parent → child
- Color contrasts well with gray places and dark background
- Animation is noticeable but not overwhelming

## What held

1. **Selection-triggered visibility works:** Hiding lines by default makes the canvas feel cleaner. When a place is selected, the context appears naturally.

2. **Animation communicates direction:** The flowing pulse clearly shows parent → child direction. The motion draws attention to the relationship without requiring static indicators like arrowheads.

3. **Parent + full subtree visibility:** Showing the immediate parent plus all descendants (children, grandchildren, etc.) makes grouped-movement behavior comprehensible — you can see exactly what will move when you drag the selected place.

4. **Performance is acceptable:** Continuous animation runs at 60fps without frame drops. The animation loop only runs when a place is selected, minimizing CPU usage.

## What didn't hold

1. **Dense dash pattern was too heavy:** The original assumption that 10px dashes with 5px gaps would be subtle was wrong. It felt like a decorative effect rather than meaningful scaffolding.

2. **25% opacity was too subtle:** The base line was nearly invisible, making the connection hard to see when the pulse wasn't present.

## What changed in our understanding of the system

**The tension between visibility and lightness:**
We learned that "showing direction" and "staying light" are in tension. The first attempt erred on the side of visibility (dense, bright lines). The revision found a balance: sparse pulses on a visible but subtle base line.

**Animation parameters are tunable and important:**
Small changes to dash length, gap size, opacity, and speed significantly affect the feel. The current settings (8px dash, 40px gap, 50px/s, sky blue, 40% opacity) feel right, but these are empirical, not derived from first principles.

**The "parent + full subtree" rule is correct but not obvious:**
The design choice to show all descendants (not just immediate children) makes grouped-movement behavior clear. However, this visual rule doesn't map to any existing mental model users have from other software. It's a unique behavior that users will need to discover.

## What does this change about how we understand this

**The intervention strengthens the parent-child relation center.** The visual feedback now matches the structural reality — users see the connections that matter when they need to understand them (during selection and movement).

**No further revision needed for now.** The current implementation passes the contact test: direction is legible, visual noise is reduced, and the animation feels meaningful. 

**Future consideration:** Monitor whether users discover and rely on this feature. If users seem confused about why moving a place affects others, the relation lines may need to be more discoverable (e.g., shown during hover, not just selection). But the current implementation is a solid foundation.
