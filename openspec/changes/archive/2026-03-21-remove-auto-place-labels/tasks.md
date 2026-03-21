# Tasks: remove-auto-place-labels

## Implementation

- [x] 1.1 Locate place rendering code in the codebase
  - Search for place component or place rendering logic
  - Identify where "Place" text or labels are generated

- [x] 1.2 Identify label rendering logic
  - Find the specific code that renders "Place N" text
  - Determine if it's a separate component or inline rendering
  - Note any CSS/styling associated with labels

- [x] 1.3 Remove auto-generated label rendering
  - Delete or disable the code that generates and displays "Place N" labels
  - Preserve place marker (dot/pin) rendering
  - Preserve connection line rendering

- [x] 1.4 Verify place markers remain functional
  - Check that place markers still render at correct positions
  - Verify hit areas for selection/dragging still work
  - Confirm connections between places remain visible

- [x] 1.5 Run tests and fix any label-dependent assertions
  - Run existing test suite
  - Update any tests that assert on label presence or text

- [x] 1.6 Perform contact test validation
  - Manually verify places remain distinguishable without labels
  - Confirm canvas interactions work normally
  - Check that visual hierarchy is preserved

## Co-variance notes

**Changes made:**

1. **Removed `getPlaceLabel` import** from `PlaceCanvas.tsx` (line 26) - function no longer needed
2. **Removed `createMemo` and `For` imports** from SolidJS - only used for label rendering
3. **Removed `visibleLabels` memo** (lines 93-112) - entire label computation and culling logic eliminated
4. **Removed label DOM overlay** (lines 727-741) - JSX that rendered label badges with styling:
   - `rounded-full border border-white/10 bg-slate-950/80`
   - `px-2 py-1 text-[11px] tracking-[0.18em] text-slate-200`
   - `shadow-[0_8px_20px_rgba(0,0,0,0.3)]`

**Preserved unchanged:**

- Place marker rendering via CanvasKit (`drawCircle` with 18px radius)
- Hover ring rendering (24px radius with cyan stroke)
- Selected ring rendering (30px radius with red stroke)
- Relationship line rendering with animated dashes
- Hit testing for place interactions
- All pointer event handlers (drag, pan, select)

**Assumptions validated:**

- Labels were cleanly separable from marker rendering ✓
- No other code dependencies on label elements ✓
- Place markers sufficient for identification ✓

## Load-bearing assumptions that didn't hold

None - all assumptions from design.md held true.
