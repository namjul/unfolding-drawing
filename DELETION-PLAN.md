# Code Deletion Plan: 30–50% Reduction

## Original Prompt

> Assume we want to remove 30–50% of the code without losing the main functionality.
>
> Identify:
> - optional features
> - duplicated features
> - premature abstractions
> - framework code that could be replaced with simple functions
>
> Propose a deletion plan.

---

## Understanding

The unfolding drawing app implements a sophisticated hierarchical drawing system with living systems principles. Core functionality is:
- Place-based drawing with parent-child relationships
- Line segments connecting places
- 4-step guided workflow (Observe → Select → Transform → Execute)
- Local-first persistence via Evolu

The codebase suffers from:
- One 5,686-line god component (App.tsx)
- Unnecessary abstraction layers
- Potentially overbuilt advanced features
- No usage data to validate complexity

## TL;DR

**Immediate deletions (15-20% reduction):**
- Remove Evolu wrapper abstraction (~60 lines)
- Inline recordTransformation (~500 lines)
- Delete test infrastructure with no tests (~50 lines)

**Evidence-based removals (additional 15-30%):**
- Remove low-usage advanced geometry features
- Simplify or remove debugging UI
- Consolidate duplicate code

**Total target: 30–50% reduction (3,100–5,200 lines) while preserving core drawing functionality**

---

## Deletion Plan

### Phase 1: Zero-Risk Deletions (Immediate) — ~600 lines (6%)

#### 1.1 Delete Evolu Wrapper Abstraction (~60 lines)

**Files to delete:**
- `src/lib/evolu/EvoluContext.ts`
- `src/lib/evolu/EvoluProvider.tsx`
- `src/lib/evolu/createUseEvolu.ts`
- `src/lib/evolu/useEvolu.ts`
- `src/lib/evolu/index.ts`

**Reason:** Pure indirection adding zero value. Contains React-specific comments in a SolidJS project.

**Migration:** Replace all imports from `./lib/evolu` with direct import from `@evolu/web`.

**Contact test:** Build succeeds, app launches, data persists.

**Co-variant changes:**
- Update `index.tsx` to import `evolu` directly
- Update `App.tsx` imports
- Remove `EvoluProvider` wrapper

---

#### 1.2 Inline recordTransformation (~500 lines)

**File to delete:**
- `src/lib/recordTransformation.ts` (622 lines)

**Reason:** Large switch statement with no shared logic between cases. Each case just calls `evolu.insert()` with different fields.

**Migration:** At each of ~20 call sites, replace:
```typescript
recordTransformation(evolu, { type: 'addPlace', placeId, x, y });
```

With direct insert:
```typescript
evolu.insert('transformation', { 
  type: S.Literal('addPlace'), 
  placeId, 
  x: S.Number(x), 
  y: S.Number(y) 
});
```

**Net savings:** ~400 lines after accounting for inline calls.

**Contact test:** TransformationsList still populates with history.

---

#### 1.3 Remove Test Infrastructure (~50 lines)

**Files to delete:**
- `test/` directory (empty or placeholder)
- Remove `brittle` from dependencies
- Remove test scripts from package.json

**Reason:** Test framework configured but zero tests exist. No contact with reality.

**Contact test:** Build and dev scripts still work.

---

### Phase 2: Evidence-Based Feature Removal — ~1,500–2,500 lines (15-25%)

**⚠️ Requires usage data contact test before proceeding.**

#### 2.1 Remove Circular Repeater System (~500 lines)

**Contact test needed first:**
Query transformation table for repeater-related operations:
```sql
SELECT type, COUNT(*) 
FROM transformation 
WHERE type IN ('addCircularRepeater', 'modifyCircularRepeater', 'deleteCircularRepeater', 'addPlaceOnCircularRepeater', 'modifyPlaceOnCircularRepeater')
GROUP BY type;
```

**If <5% of total transformations, remove:**
- Lines 3779-4013 in App.tsx (repeater modification logic)
- `circularRepeater` table from schema
- Repeater-related transform types
- Echo group management code
- Alternating pattern controls

**Reason:** Most complex feature (~500 lines). Radial repetition may be premature for current usage patterns.

**Alternative:** Keep simple "add circular repeater" but remove complex "modify repeater count" logic (~235 lines saved while keeping basic feature).

---

#### 2.2 Remove Bending Circular Fields (~1,300 lines)

**Contact test needed first:**
```sql
SELECT COUNT(*) FROM bendingCircularField;
```

**If zero or near-zero rows, remove:**
- `src/lib/bentSegmentPath.ts` (1,087 lines)
- `bendingCircularField` table
- Bend-related transforms in App.tsx (~200 lines)
- Bending UI controls

**Reason:** Complex tangent geometry for curved lines. Straight lines may suffice.

**Fallback:** Keep circular fields, remove only bending modification (keep static bends if any exist).

---

#### 2.3 Simplify or Remove DrawingDNAPane (~500 lines)

**Options:**

**Option A: Remove entirely** (~987 lines)
- Delete `DrawingDNAPane.tsx`, `DrawingObjectsList.tsx`, `TransformationsList.tsx`
- Remove DNA pane toggle from UI

**Option B: Keep minimal rename UI** (~200 lines saved)
- Keep simplified object list for renaming
- Remove TransformationsList (history view)
- Remove tree visualization complexity

**Reason:** Debugging tool, not essential for core drawing workflow.

**Contact test:** Can users complete drawing tasks without inspection pane?

---

#### 2.4 Remove Split Line Operation (~300 lines)

**Contact test needed:**
```sql
SELECT COUNT(*) FROM transformation WHERE type = 'splitLine';
```

**If <5% of line operations, remove:**
- Split line UI controls
- `src/lib/splitLineHierarchy.ts`
- Split logic in App.tsx

**Reason:** Complex async operation. Users can delete one line and add two new lines instead.

**Alternative:** Keep if data shows frequent usage.

---

#### 2.5 Remove Axes System (~400 lines)

**Contact test needed:**
```sql
SELECT COUNT(*) FROM axis;
```

**If near-zero, remove:**
- `axis` table
- `src/lib/axisGeometry.ts` (153 lines)
- Axis-related transforms
- Place-on-axis positioning

**Reason:** Orientational guides may not be essential if unused.

---

### Phase 3: Consolidation & Deduplication — ~100-200 lines (1-2%)

#### 3.1 Consolidate Type Definitions

**Create:** `src/lib/types.ts`

**Consolidate:**
- `Mode` type (defined 3x)
- Selection types
- Geometry types
- Transform types

**Files affected:** App.tsx, DrawingGuide.tsx, ViewControls.tsx, transform-matrix.ts

**Savings:** ~50-100 lines via deduplication.

---

#### 3.2 Extract Inline Utilities

**Replace repeated patterns with shared functions:**
- Distance calculations (appears multiple times)
- Angle normalization
- Coordinate transformations

**Savings:** ~50-100 lines.

---

### Phase 4: God Component Refactoring — ~1,000-2,000 lines perceived (20-40%)

**Note:** This doesn't delete code but makes the largest file manageable. Counts toward "effective reduction" in complexity.

#### 4.1 Extract from App.tsx (5,686 lines → ~500 lines)

**Create focused modules:**

1. **`src/lib/canvas/CanvasRenderer.tsx`** (~800 lines)
   - SVG rendering logic
   - Visual feedback (scaffolding, handles, relationships)

2. **`src/lib/canvas/PointerHandlers.ts`** (~1,200 lines)
   - `handlePointerDown`, `handlePointerMove`, `handlePointerUp`
   - Dragging state management

3. **`src/lib/transforms/PlaceTransforms.ts`** (~400 lines)
   - Add, move, delete, rotate place operations

4. **`src/lib/transforms/LineTransforms.ts`** (~300 lines)
   - Add, delete line operations

5. **`src/lib/transforms/FieldTransforms.ts`** (~400 lines)
   - Circular field operations

6. **`src/lib/transforms/RepeaterTransforms.ts`** (~500 lines)
   - Circular repeater (if kept)

7. **`src/lib/state/ViewState.ts`** (~200 lines)
   - Zoom, pan, translate signals

8. **`src/lib/state/SelectionState.ts`** (~300 lines)
   - All selection signals and logic

9. **`src/lib/state/PendingOperations.ts`** (~400 lines)
   - All pending* operation signals

10. **`src/lib/geometry/CoordinateSystem.ts`** (~500 lines)
    - `placesWithAbsolutePositions` and hierarchy logic

**Remaining App.tsx:** ~500 lines of orchestration

**Effect:** 91% reduction in largest file size, improved navigability.

---

## Summary Table

| Phase | Deletions | Lines Saved | Risk | Evidence Needed |
|-------|-----------|-------------|------|-----------------|
| 1: Zero-risk | Evolu wrapper, recordTransformation, tests | ~600 (6%) | None | No |
| 2: Features | Repeater, bending, DNA pane, split, axes | ~1,500-2,500 (15-25%) | Medium | Yes |
| 3: Consolidation | Type deduplication, shared utilities | ~100-200 (1-2%) | Low | No |
| 4: Refactoring | Extract App.tsx modules | ~0 actual, massive perceived | Low | No |
| **Total** | | **~2,200-3,300 lines (22-33%)** | | |

**With aggressive Phase 2:** Could reach 40-50% reduction if most advanced features prove unused.

---

## Contact Tests Required Before Phase 2

```sql
-- Usage frequency analysis
SELECT type, COUNT(*) as usage_count,
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM transformation), 2) as percentage
FROM transformation
GROUP BY type
ORDER BY usage_count DESC;

-- Feature presence check
SELECT 'Repeaters' as feature, COUNT(*) as count FROM circularRepeater
UNION ALL
SELECT 'Bending Fields', COUNT(*) FROM bendingCircularField
UNION ALL
SELECT 'Axes', COUNT(*) FROM axis
UNION ALL
SELECT 'Circular Fields', COUNT(*) FROM circularField;

-- Recent usage (last 30 days if timestamps available)
SELECT type, COUNT(*) 
FROM transformation 
WHERE createdAt > datetime('now', '-30 days')
GROUP BY type;
```

**Decision rule:** Features with <5% usage frequency AND low presence in database should be candidates for removal.

---

## Revision Criteria

**After Phase 1 implementation:**
- Does app still launch? 
- Can users draw places and lines?
- Does undo/redo work?
- Is data persisted?

**After Phase 2 (per feature):**
- Are remaining features still accessible?
- Do users report missing functionality?
- Did we preserve core "living structure" drawing metaphor?

**Success = functionality preserved, codebase 30-50% smaller, App.tsx <1000 lines.**

**Unknown:** Whether users actually rely on advanced geometry features. Must gather evidence before Phase 2.

---

## Next Steps

1. Execute Phase 1 deletions (zero risk)
2. Instrument app to gather usage data
3. Run contact test queries after 2-4 weeks
4. Decide on Phase 2 deletions based on evidence
5. Extract App.tsx modules incrementally
