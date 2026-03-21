# Evidence: remove-auto-place-labels

## Contact test result

passed

## What we observed

**Code removal:**
- Deleted 36 lines from `PlaceCanvas.tsx`
- Removed `getPlaceLabel` import and function usage
- Removed `visibleLabels` memo (computation + culling logic for 80+ label positioning checks per frame)
- Removed label DOM overlay with Tailwind styling (dark pill badges with shadows)
- Removed unused SolidJS imports (`createMemo`, `For`)

**System response:**
- TypeScript compilation passed without errors
- Biome linter passed without issues
- No test failures (no tests existed asserting on labels)
- Place markers continue rendering at correct world positions
- Hit testing for place selection/dragging preserved
- Connection lines (relationships) preserved with animated dash effects
- Hover rings (cyan) and selection rings (red) continue to render

**Visual result:**
- Canvas renders with place markers only (18px circles)
- No text badges appearing near markers
- Reduced DOM nodes per place (removed overlay divs)
- Reduced computation per frame (removed label position calculations)

## What held

**All three load-bearing assumptions from gesture.md held true:**

1. **Visual markers + spatial context are sufficient** ✓
   - Places remain visually distinct through position and marker rendering
   - Connection lines provide relational context between places

2. **Labels are auto-generated only** ✓
   - The `getPlaceLabel` function had logic for user-defined names (`place.name`) but the canvas rendering used index-based labels for all visible places
   - User names in data model remain intact (function still exists in `scene.ts` for potential future use)

3. **No functional dependency** ✓
   - No code outside `PlaceCanvas.tsx` referenced labels
   - Hit testing targets marker positions, not label elements
   - No tests asserted on label presence

## What didn't hold

None. All assumptions validated through implementation.

## What changed in our understanding of the system

**Validated:** Labels were genuinely inert structure — removing them created zero compensating changes elsewhere. This confirms the original observation that "places don't need labels."

**Discovered:** The label system had two layers:
- Data layer: `getPlaceLabel()` supports user-defined names, auto-generated "Place N", and "Draft place" states
- Presentation layer: Only auto-generated labels were being displayed

The data layer remains valuable (user may name places meaningfully in future), but the presentation layer was emitting noise.

**Performance insight:** Label culling logic ran every frame checking 4 boundary conditions per place (`left >= -80`, `left <= width + 80`, `top >= -40`, `top <= height + 40`). Removal eliminates this per-frame computation.

## What does this change about how we understand this

The intervention holds. The canvas is cleaner. Places function as centers through their markers, positions, and relationships without requiring manufactured identifiers.

**Next step:** None required. This change is complete and can be archived.
