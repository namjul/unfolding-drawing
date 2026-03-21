# Contact Test: animated-relation-lines-on-select

## Evidence tier

proximal

## What would success look like?

**Observable success indicators:**

1. **Direction is immediately legible** — When selecting a parent place, I (or anyone I show this to) can instantly see which places are its children without reading text labels or checking the inspector

2. **Visual clutter reduction is perceptible** — When no place is selected, the canvas feels cleaner than before; when I mentally compare "before" (all lines visible) vs "after" (lines hidden), the "after" state is clearly less noisy

3. **Grouped movement becomes comprehensible** — When I drag a parent place and its children follow, the animated lines that appeared on selection make it obvious *why* the children are moving — I can see the connection at the moment of action

4. **Animation feels meaningful, not decorative** — The direction animation doesn't feel like "effects for effects' sake" but actually helps me understand the relationship flow from parent to child

## What would falsify this claim?

**Observations that would prove the claim false:**

1. **Direction remains unclear** — Even with the animated line, I still can't tell which place is parent and which is child without reading the inspector or memorizing the hierarchy

2. **Animation is distracting** — The animated line draws too much attention, feels like "noise" itself, or competes with the place I'm trying to select or move

3. **Hiding lines breaks understanding** — When lines are hidden by default, I lose track of which places are related to which; the clean canvas actually makes the drawing *harder* to understand

4. **Users ignore the animation** — People I show this to don't notice the animation at all, or they notice it but it doesn't change how they understand the structure

5. **Performance or rendering issues** — The animation causes lag, frame drops, or visual glitches that make the interaction feel broken rather than enhanced

## How will we check?

**Soft check (immediate):**
- Build minimal implementation showing animated line on selection
- Use it myself for 15-20 minutes creating and moving related places
- Check: Can I see direction? Does it feel helpful or distracting?

**Medium check (validation):**
- Show the implementation to 2-3 people who haven't seen it
- Ask them to: (a) identify which place is parent, (b) predict what will happen when they move it
- Check: Do they correctly identify relationships without being told?

**Hard check (usage pattern):**
- If implemented: Check that the code works without errors (npm run check passes)
- Observe: When I use the app for actual drawing, do I rely on the relation lines or ignore them?

## When will we check?

**Immediate:** Within 1 day of creating a minimal working implementation (animated dashed line or particle flow on selection)

**Validation:** Within 1 week of implementation, after showing to 2-3 people

**Ongoing:** If the feature stays in the app, notice whether I (as the developer using my own tool) actually find myself using the relation lines or whether I ignore them

**Revision trigger:** If the "falsify" observations appear (direction unclear, animation distracting, etc.), this becomes a revision event — the claim was wrong and the approach needs to change.
