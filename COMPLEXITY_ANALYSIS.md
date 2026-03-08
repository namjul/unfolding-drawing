# Complexity Analysis Report

**Generated:** 2026-03-08
**Codebase:** unfolding-drawing-app
**Total TypeScript files:** 24
**Total lines of code:** ~10,532

---

## Overview

This analysis identifies unnecessary abstractions, duplicate logic, over-generalized patterns, unused features, and functions doing multiple responsibilities. Each issue explains why it increases cognitive load and proposes the simplest possible alternative.

---

## 1. Unnecessary Evolu Wrapper Abstraction

**Location:** `src/lib/evolu/*` (5 files, ~60 lines)

**Files:**
- `src/lib/evolu/index.ts`
- `src/lib/evolu/EvoluContext.ts`
- `src/lib/evolu/EvoluProvider.tsx`
- `src/lib/evolu/createUseEvolu.ts`
- `src/lib/evolu/useEvolu.ts`

**Issue:** The entire `evolu` directory wraps the Evolu library with a custom context provider and hook system that provides no additional value. The wrapper was likely copied from React patterns but adds needless indirection for Solid.

**Why it increases cognitive load:**
- Forces developers to understand both Evolu's API and this custom wrapper
- The `createUseEvolu` function takes `_evolu` parameter but ignores it (confusing)
- `EvoluProvider` wraps children in an extra `<div>` for no reason
- Comments reference "React Hook" in a Solid.js project
- Adds indirection: Evolu → custom context → useEvolu hook → usage

**Simplest alternative:**

**DELETE** the entire `src/lib/evolu` directory and:
1. Export Evolu instance directly from `evolu-db.ts`
2. Import `evolu` directly where needed instead of calling `useEvolu()`
3. Remove `<EvoluProvider>` wrapper from `index.tsx`

**Evidence for deletion:**
- `useEvolu()` is called ~14 times, all could use direct `evolu` import
- Zero customization or additional logic in the wrapper
- The wrapper violates "don't wrap what you don't own" unless adding value

**Impact:** Removes 5 files and ~60 lines of indirection with zero functional loss.

---

## 2. App.tsx: God Component (5686 lines)

**Location:** `src/App.tsx`

**Issue:** Single component with 58+ reactive signals doing multiple responsibilities:
- Canvas SVG rendering
- All pointer event handling (down, move, up, wheel, pinch)
- All transformation logic (20+ different operations)
- Selection state management (7+ different entity types)
- Pending state for ~20 different operations
- View controls (zoom, pan, translate)
- Database queries (8 different `useQuery` calls)
- Guide step orchestration
- Relationship calculations

**State explosion:**
```typescript
// Just some of the 58+ signals:
const [scale, setScale] = createSignal(1);
const [translateX, setTranslateX] = createSignal(0);
const [translateY, setTranslateY] = createSignal(0);
const [mode, setMode] = createSignal<Mode>('default');
const [prevMode, setPrevMode] = createSignal<Mode>('default');
const [isPanning, setIsPanning] = createSignal(false);
const [guideStep, setGuideStep] = createSignal<GuideStep>('observe');
const [selectedPlaceId, setSelectedPlaceId] = createSignal<PlaceId | null>(null);
const [selectedLineSegmentId, setSelectedLineSegmentId] = createSignal<LineSegmentId | null>(null);
const [selectedCircularFieldId, setSelectedCircularFieldId] = createSignal<CircularFieldId | null>(null);
const [selectedBendingCircularFieldId, setSelectedBendingCircularFieldId] = createSignal<BendingCircularFieldId | null>(null);
const [selectedAxisId, setSelectedAxisId] = createSignal<AxisId | null>(null);
const [selectedCircularRepeaterId, setSelectedCircularRepeaterId] = createSignal<CircularRepeaterId | null>(null);
const [transformChoice, setTransformChoice] = createSignal<TransformChoice>(null);
const [hasDrawingPaneSelected, setHasDrawingPaneSelected] = createSignal(false);
const [pendingAdd, setPendingAdd] = createSignal<{...} | null>(null);
const [pendingMove, setPendingMove] = createSignal<{...} | null>(null);
const [pendingDeletePlaceId, setPendingDeletePlaceId] = createSignal<PlaceId | null>(null);
const [pendingRotate, setPendingRotate] = createSignal<{...} | null>(null);
const [pendingAddLine, setPendingAddLine] = createSignal<{...} | null>(null);
const [pendingDeleteLineId, setPendingDeleteLineId] = createSignal<LineSegmentId | null>(null);
const [pendingAddCircularField, setPendingAddCircularField] = createSignal<PendingAddCircularField | null>(null);
const [pendingModifyCircularField, setPendingModifyCircularField] = createSignal<{...} | null>(null);
const [pendingDeleteCircularFieldId, setPendingDeleteCircularFieldId] = createSignal<CircularFieldId | null>(null);
const [draggingCircularFieldRadius, setDraggingCircularFieldRadius] = createSignal<CircularFieldId | null>(null);
const [pendingMoveBendingCircularField, setPendingMoveBendingCircularField] = createSignal<BendingCircularFieldId | null>(null);
const [draggingBendingCircularFieldRadius, setDraggingBendingCircularFieldRadius] = createSignal<BendingCircularFieldId | null>(null);
const [pendingDeleteBendingCircularFieldId, setPendingDeleteBendingCircularFieldId] = createSignal<BendingCircularFieldId | null>(null);
const [bendAtEndsDirty, setBendAtEndsDirty] = createSignal(false);
const [pendingBendAtEndsAdded, setPendingBendAtEndsAdded] = createSignal<Array<{...}>>([]);
const [pendingBendAtEndsDeleted, setPendingBendAtEndsDeleted] = createSignal<Array<{...}>>([]);
const [pendingSplitLine, setPendingSplitLine] = createSignal<PendingSplitLine | null>(null);
const [pendingAddAxis, setPendingAddAxis] = createSignal<{...} | null>(null);
const [pendingModifyAxis, setPendingModifyAxis] = createSignal<{...} | null>(null);
const [pendingDeleteAxisId, setPendingDeleteAxisId] = createSignal<AxisId | null>(null);
const [pendingAddPlaceOnAxis, setPendingAddPlaceOnAxis] = createSignal<{...} | null>(null);
const [draggingAxisAngle, setDraggingAxisAngle] = createSignal(false);
const [draggingPlaceOnAxis, setDraggingPlaceOnAxis] = createSignal<AxisId | null>(null);
const [pendingAddPlaceOnCircularField, setPendingAddPlaceOnCircularField] = createSignal<{...} | null>(null);
const [draggingPlaceOnCircularField, setDraggingPlaceOnCircularField] = createSignal<CircularFieldId | null>(null);
const [pendingAddCircularRepeater, setPendingAddCircularRepeater] = createSignal<{...} | null>(null);
const [pendingModifyCircularRepeater, setPendingModifyCircularRepeater] = createSignal<{...} | null>(null);
const [pendingAddPlaceOnCircularRepeater, setPendingAddPlaceOnCircularRepeater] = createSignal<{...} | null>(null);
const [pendingModifyPlaceOnCircularRepeater, setPendingModifyPlaceOnCircularRepeater] = createSignal<{...} | null>(null);
const [pendingDeleteCircularRepeaterId, setPendingDeleteCircularRepeaterId] = createSignal<CircularRepeaterId | null>(null);
const [draggingPlaceOnCircularRepeater, setDraggingPlaceOnCircularRepeater] = createSignal<CircularRepeaterId | null>(null);
const [lastCursorCanvas, setLastCursorCanvas] = createSignal<{x: number; y: number} | null>(null);
// ... and more
```

**Why it increases cognitive load:**
- Impossible to reason about state changes (58 signals = 58 potential sources of change)
- Multiple `pending*` signals track parallel workflows that can interfere
- Mixing UI concerns with business logic with data access
- Cannot understand one feature without reading through thousands of lines
- Every change risks breaking unrelated functionality
- Testing requires mocking the entire world

**Example of multiple responsibilities in one function:**

`bendAtEndsState` createMemo (lines 219-338) does:
- Query validation
- State computation
- UI label generation
- Event handler definition
- Database mutations
- Pending state tracking

**Simplest alternative:**

Split into focused components and composable hooks:

```
src/
  canvas/
    CanvasView.tsx          # SVG rendering only (~300 lines)
    useCanvasState.ts       # Zoom, pan, viewport transforms (~100 lines)

  selection/
    useSelection.ts         # Selection state (7 entity types, ~150 lines)

  interactions/
    usePointerHandlers.ts   # Pointer event coordination (~200 lines)

  transformations/
    useAddPlace.ts          # ~50-100 lines each
    useMovePlace.ts
    useRotatePlace.ts
    useAddLine.ts
    useDeleteLine.ts
    useSplitLine.ts
    useAddCircularField.ts
    useModifyCircularField.ts
    useAddAxis.ts
    useModifyAxis.ts
    useBendAtEnds.ts
    useAddPlaceOnAxis.ts
    useAddCircularRepeater.ts
    useModifyCircularRepeater.ts
    # Each transformation in its own file

  queries/
    useDrawingQueries.ts    # Centralize all useQuery calls (~80 lines)
```

**Refactoring principles:**
- Each module has ONE responsibility
- Each module manages 3-8 signals maximum
- Each module is independently testable
- Compose modules together in App.tsx which becomes ~500 lines of orchestration

**Impact:** 5686 lines → ~15 modules of 50-500 lines each, dramatically improved comprehensibility.

---

## 3. Over-Generalized `recordTransformation` Pattern

**Location:** `src/lib/recordTransformation.ts` (622 lines)

**Issue:** Massive discriminated union type with 20+ transformation types all funneling through a single `recordTransformation` function that switches on `kind`:

```typescript
export type TransformationPayload =
  | RecordAdd
  | RecordAddRelated
  | RecordMove
  | RecordDelete
  | RecordRotate
  | RecordAddLine
  | RecordDeleteLine
  | RecordAddCircularField
  | RecordModifyCircularField
  | RecordDeleteCircularField
  | RecordAddBendingCircularField
  | RecordModifyBendingCircularField
  | RecordDeleteBendingCircularField
  | RecordSplitLine
  | RecordAddAxis
  | RecordModifyAxis
  | RecordDeleteAxis
  | RecordAddPlaceOnAxis
  | RecordAddPlaceOnCircularField
  | RecordAddCircularRepeater
  | RecordModifyCircularRepeater
  | RecordDeleteCircularRepeater
  | RecordAddPlaceOnCircularRepeater
  | RecordModifyPlaceOnCircularRepeater;
```

Then a giant switch statement:

```typescript
export function recordTransformation(payload: TransformationPayload): void {
  switch (payload.kind) {
    case 'add': {
      evolu.insert('transformation', { ... });
      break;
    }
    case 'addRelated': {
      evolu.insert('transformation', { ... });
      break;
    }
    // ... 20+ more cases
  }
}
```

**Why it increases cognitive load:**
- Forces every transformation to conform to the same structure even when unrelated
- The switch statement couples all transformations - changing one requires understanding all
- Type discriminated unions obscure what data is actually needed for each case
- File comment admits the problem: _"Audit: each transform in transform-matrix.ts must have a corresponding recording path"_ - this is a code smell indicating the abstraction creates maintenance burden
- Adding new transformation requires:
  1. Define new type
  2. Add to union
  3. Add case to switch
  4. Ensure consistency with transform-matrix.ts
- No actual shared logic between cases - each just calls `evolu.insert` with different fields

**Simplest alternative:**

**DELETE** the abstraction entirely. Each transformation should directly call `evolu.insert('transformation', {...})` where it happens.

**Before:**
```typescript
// In some handler
recordTransformation({
  kind: 'move',
  placeId: id,
  parentId: parent,
  x: newX,
  y: newY,
});

// In recordTransformation.ts
case 'move': {
  evolu.insert('transformation', {
    kind: 'move',
    placeId: payload.placeId,
    // ... etc
  });
  break;
}
```

**After:**
```typescript
// In the handler - direct and clear
evolu.insert('transformation', {
  kind: String1000('move'),
  placeId: id,
  parentId: parent,
  x: newX,
  y: newY,
});
```

**Benefits:**
- Removes 622 lines of indirection
- Each transformation's recording is colocated with its logic
- No need to maintain type unions or switch statements
- Impossible to forget to add a case (it's right there)
- Clearer what data each transformation actually needs

**Contact test:** Does removing `recordTransformation` and calling `evolu.insert` directly at call sites reduce total lines of code and improve local reasoning? Yes.

**Impact:** Delete 622-line file, inline calls at ~20-30 call sites (net reduction ~400-500 lines).

---

## 4. Duplicate Type Definitions

**Location:** Multiple files

**Issue:** Same types defined identically in multiple places:

### Duplicate: `Mode` type

**Defined in:**
- `src/App.tsx:78` → `type Mode = 'default' | 'pan';`
- `src/components/DrawingGuide.tsx:24` → `type Mode = 'default' | 'pan';`
- `src/components/ViewControls.tsx:3` → `type Mode = 'default' | 'pan';`

### Duplicate: Place/geometry types

- `PlaceWithAxis` in `DrawingObjectsList.tsx:27-38` duplicates fields from database schema
- `PlaceWithAbs` likely duplicated across multiple geometry modules
- `ViewportCanvas` type likely duplicates canvas coordinate logic

**Why it increases cognitive load:**
- Cannot tell if types are intentionally different or accidentally duplicated
- Changes to one don't propagate to others (drift over time)
- Searching for usage finds multiple definitions
- Violates DRY (Don't Repeat Yourself)

**Simplest alternative:**

Define once at highest common usage point:

```typescript
// src/lib/types.ts (or src/types.ts)
export type Mode = 'default' | 'pan';

// Then import everywhere:
import type { Mode } from '../lib/types';
```

For geometry types, consolidate:

```typescript
// src/lib/geometry-types.ts
export type Point = { x: number; y: number };
export type PlaceWithPosition = {
  id: PlaceId;
  absX: number;
  absY: number;
  absWorldAngle: number;
};
// etc.
```

**Impact:** Remove ~30-50 lines of duplicate definitions, single source of truth for shared types.

---

## 5. `useQuery` Wrapper

**Location:** `src/lib/useQuery.ts` (38 lines)

**Issue:** Wraps Evolu's query system with custom refresh logic and signal management:

```typescript
export function useQuery<R extends Row>(query: Query<R>) {
  const evolu = useEvolu();
  const [rows, setRows] = createSignal<QueryRows<R>>([] as QueryRows<R>);

  const refresh = (): Promise<void> =>
    evolu
      .loadQuery(query)
      .then((loaded) => {
        setRows(loaded);
      })
      .catch(() => {}); // Swallows errors!

  createEffect(() => {
    let unsub: (() => void) | undefined;
    evolu
      .loadQuery(query)
      .then((loaded) => {
        setRows(loaded);
        unsub = evolu.subscribeQuery(query)(() => {
          setRows(evolu.getQueryRows(query) as QueryRows<R>);
        });
      })
      .catch(() => {}); // Swallows errors!
    return () => {
      unsub?.();
    };
  });

  return { rows, refresh };
}
```

**Why it increases cognitive load:**
- Evolu already provides reactive queries - this wrapper may be fighting the library
- The `refresh` function returns `Promise<void>` that catches and **swallows all errors**
- Called 8+ times in App.tsx alone - all queries go through this indirection
- Creates double subscription: `loadQuery` + `subscribeQuery`
- Error swallowing makes debugging impossible

**Questions to investigate:**
1. Does Evolu already provide this functionality natively?
2. Why is double subscription needed?
3. Why are errors swallowed?
4. Is the `refresh` function ever called?

**Evaluation needed:**
- Check Evolu documentation for reactive query hooks
- If Evolu provides equivalent: **DELETE** and use built-in
- If Evolu doesn't provide equivalent: Keep but:
  - Document why double subscription is necessary
  - Remove error swallowing or at least log errors
  - Add TypeScript strict error handling

**Contact test:** Does removing `useQuery` and using Evolu's queries directly reduce lines of code without breaking functionality?

**Impact:** Potentially delete 38-line wrapper + 8+ call sites if Evolu has built-in solution.

---

## 6. Unused or Over-Specified Features

**Location:** Various files

### 6a. `lineSegmentEndName.ts` - Unnecessary Truncation?

**Location:** `src/lib/lineSegmentEndName.ts` (15 lines)

**Issue:**
```typescript
const MAX_LENGTH = 1000;

export function lineSegmentEndDisplayName(
  segmentName: string,
  placeName: string,
): string {
  const seg = (segmentName ?? '').trim() || 'Line segment';
  const place = (placeName ?? '').trim() || 'Place';
  const raw = `${seg} ends at ${place}`;
  return raw.length > MAX_LENGTH ? raw.slice(0, MAX_LENGTH) : raw;
}
```

**Question:** Is truncation ever needed?

**Contact test needed:**
- Search codebase for names exceeding ~100 characters
- Check if DB schema actually enforces 1000 char limit
- If no names ever approach limit: delete truncation logic

**Simplest alternative if unused:**
```typescript
export function lineSegmentEndDisplayName(
  segmentName: string,
  placeName: string,
): string {
  const seg = segmentName?.trim() || 'Line segment';
  const place = placeName?.trim() || 'Place';
  return `${seg} ends at ${place}`;
}
```

**Impact:** Remove 2-3 lines if truncation never triggers.

---

### 6b. `bentSegmentPath.ts` - Complex Geometry (1087 lines)

**Location:** `src/lib/bentSegmentPath.ts`

**Issue:** Very complex geometry calculations for bending line segments around circular fields:
- `outerCommonTangentPoints` (lines 126-173) - 8 parameters, nested loops, complex math
- Multiple tangent algorithms
- Arc sweep calculations
- Distance computations

**Questions:**
1. Are ALL these algorithms actually used?
2. Could simpler approximations work for the use case?
3. Is the "smooth double-bend" feature (outer common tangents) ever used?

**Contact tests needed:**
- Grep for usage of `outerCommonTangentPoints` - if unused, delete
- Check if simpler straight-line or single-arc bends would suffice
- Measure: do users actually create scenarios requiring complex tangent math?

**Potential simplification:**
If analysis shows only simple arcs are used, could reduce from 1087 lines to ~200-300 lines.

**Impact:** Potentially delete 500-800 lines if complex tangent math is unused.

---

### 6c. DrawingObjectsList - Over-Complex Tree Rendering?

**Location:** `src/components/DrawingObjectsList.tsx` (925 lines)

**Issue:**
- Recursive tree rendering with depth tracking
- `listIndentClasses` supports multiple indent levels
- Complex hierarchy traversal

**Questions:**
1. Are all tree levels used in practice?
2. What's the typical/maximum depth?
3. Could this be simplified to a flat or 2-level list?

**Contact test needed:**
- Check actual usage: do users create deep hierarchies?
- Measure: what's the 95th percentile depth?
- If depth rarely exceeds 2-3 levels, simplify

**Potential simplification:**
If trees are shallow, replace recursive rendering with simpler 2-level structure.

**Impact:** Potentially reduce from 925 lines to ~300-400 lines.

---

## 7. Complex Prop Passing

**Location:** `src/components/DrawingGuide.tsx` props interface (lines 26-103)

**Issue:** DrawingGuide accepts 40+ props:

```typescript
interface DrawingGuideProps {
  // Selection props (7)
  step: Accessor<GuideStep>;
  selectedPlaceId: PlaceId | null;
  selectedLineSegmentId: LineSegmentId | null;
  selectedCircularFieldId: CircularFieldId | null;
  selectedBendingCircularFieldId: BendingCircularFieldId | null;
  selectedAxisId: AxisId | null;
  selectedCircularRepeaterId: CircularRepeaterId | null;

  // Transform state (1)
  transformChoice: TransformChoice;

  // Callbacks (10)
  onStepObserve: () => void;
  onStepSelect: () => void;
  onRequestStep?: (step: GuideStep) => void;
  onCancelSelection?: () => void;
  onSelectCanvas: () => void;
  onTransformChoice: (choice: TransformChoice) => void;
  onCommit: () => void;
  onReject: () => void;
  onReset: () => void;
  onRepeaterCountChange: (count: number) => void;

  // Boolean flags for pending states (20+)
  hasDrawingPaneSelected: boolean;
  pendingAdd: boolean;
  pendingMove: boolean;
  pendingRotate: boolean;
  pendingAddLine: boolean;
  pendingAddCircularField: boolean;
  pendingModifyCircularField: boolean;
  pendingDeleteLineId: boolean;
  pendingDeleteCircularFieldId: boolean;
  pendingDeleteBendingCircularFieldId: boolean;
  pendingMoveBendingCircularField: boolean;
  draggingBendingCircularFieldRadius: boolean;
  pendingBendAtEndsDirty: boolean;
  pendingSplitLine: boolean;
  pendingAddAxis: boolean;
  pendingModifyAxis: boolean;
  pendingDeleteAxisId: boolean;
  pendingAddPlaceOnAxis: boolean;
  pendingAddPlaceOnCircularField: boolean;
  pendingAddCircularRepeater: boolean;
  pendingModifyCircularRepeater: boolean;
  pendingAddPlaceOnCircularRepeater: boolean;
  pendingModifyPlaceOnCircularRepeater: boolean;
  pendingDeleteCircularRepeaterId: boolean;

  // Complex state objects (3)
  bendAtEndsState: { ... } | null;
  axisDirection: { ... } | null;
  alternatingPattern: { ... } | null;

  // More derived state (5)
  availableTransforms: readonly {...}[];
  circularRepeaterCount: number;
  circularRepeaterAxisCount: number;

  // ViewControls passthrough (9)
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  mode: Mode;
  onTogglePan: () => void;
  onResetDrawing: () => void;
}
```

**Why it increases cognitive load:**
- Cannot understand component without understanding all 40+ props
- Passing booleans derived from `signal() !== null` creates redundant state representations
- Parent component (App.tsx) must track and pass all this data
- Any change to internal state requires new prop
- Props interface is larger than many entire components

**Code smell:** Many boolean props are derived:
```typescript
// In App.tsx
<DrawingGuide
  pendingAdd={pendingAdd() !== null}
  pendingMove={pendingMove() !== null}
  pendingRotate={pendingRotate() !== null}
  // ... 20 more times
/>
```

**Simplest alternative:**

**Option 1: Group related props**

```typescript
interface SelectionState {
  placeId: PlaceId | null;
  lineSegmentId: LineSegmentId | null;
  circularFieldId: CircularFieldId | null;
  bendingCircularFieldId: BendingCircularFieldId | null;
  axisId: AxisId | null;
  circularRepeaterId: CircularRepeaterId | null;
  hasDrawingPane: boolean;
}

interface PendingOperations {
  add: boolean;
  move: boolean;
  rotate: boolean;
  addLine: boolean;
  // ... etc, or even better: single enum of current operation
}

interface GuideActions {
  onStepObserve: () => void;
  onStepSelect: () => void;
  onCommit: () => void;
  onReject: () => void;
  // ... etc
}

interface DrawingGuideProps {
  step: Accessor<GuideStep>;
  selection: SelectionState;
  pending: PendingOperations;
  actions: GuideActions;
  viewControls: ViewControlsProps;
  transformChoice: TransformChoice;
  availableTransforms: readonly {...}[];
  // 7 grouped props instead of 40+ flat props
}
```

**Option 2: Split component**

Better approach - split DrawingGuide into smaller components:

```
DrawingGuide.tsx (orchestrator, ~100 lines)
├── SelectionPanel.tsx (~150 lines)
├── TransformationPanel.tsx (~200 lines)
├── ExecutionPanel.tsx (~150 lines)
└── ViewControls.tsx (already exists)
```

Each sub-component takes 5-10 props instead of 40+.

**Option 3: Pass signals directly**

Instead of deriving booleans, pass the signals:

```typescript
interface DrawingGuideProps {
  // Pass the signal, let component derive boolean
  pendingAdd: Accessor<PendingAddState | null>;
  // Instead of: pendingAdd: boolean;
}
```

**Impact:** Reduce props from 40+ to ~10 by grouping or ~5-10 per component by splitting.

---

## Summary: Recommended Actions

### High Confidence - Delete Immediately

| Issue | Files | Lines Saved | Risk |
|-------|-------|-------------|------|
| Delete Evolu wrapper | `src/lib/evolu/*` (5 files) | ~60 | None - pure indirection |
| Delete duplicate `Mode` type | 2 definitions | ~4 | None - consolidate to one |
| Delete `recordTransformation` | `recordTransformation.ts` | ~400-500 net | None - inline at call sites |

**Total immediate savings: ~460-560 lines, zero functional loss**

---

### Medium Confidence - Investigate Then Delete

| Issue | Files | Potential Savings | Action |
|-------|-------|-------------------|--------|
| `useQuery` wrapper | `useQuery.ts` | ~38 + call sites | Check if Evolu has built-in alternative |
| Unused geometry in bentSegmentPath | `bentSegmentPath.ts` | ~500-800 | Grep for usage, delete unused functions |
| Name truncation | `lineSegmentEndName.ts` | ~2-3 | Check if ever triggered, simplify if not |

**Potential savings: 540-840 lines after verification**

---

### High Priority - Refactor

| Issue | Current | Target | Impact |
|-------|---------|--------|--------|
| Split App.tsx | 5686 lines, 58 signals | 15 modules of 50-500 lines, 3-8 signals each | Massive cognitive load reduction |
| Simplify DrawingGuide props | 40+ props | 10 grouped props OR split into 3-4 components | Much easier to understand |
| Consolidate duplicate types | 3+ definitions each | 1 definition | Single source of truth |

---

## Cognitive Load Metrics

### Current State

| Metric | Value | Assessment |
|--------|-------|------------|
| Largest file | 5,686 lines | Unmaintainable |
| Reactive signals in one component | 58+ | Untrackable |
| Props on one component | 40+ | Incomprehensible |
| Wrapper layers for Evolu | 3 (Evolu → context → hook → usage) | Unnecessary |
| Lines in `recordTransformation` | 622 | Pure boilerplate |
| Duplicate type definitions | 3+ per type | Drift risk |

### After Cleanup (Estimated)

| Metric | Current | After | Improvement |
|--------|---------|-------|-------------|
| Largest file | 5,686 lines | ~500 lines | 91% reduction |
| Signals per module | 58+ | 3-8 | Locally reasonable |
| Props per component | 40+ | 5-15 | Comprehensible |
| Wrapper layers | 3 | 0-1 | Direct usage |
| Total lines of code | 10,532 | ~9,000 | 15% reduction |
| Comprehensibility | Low | High | Qualitative win |

---

## Contact Tests for Validation

Before deleting or refactoring, run these tests:

### For Evolu wrapper deletion:
```bash
# Count uses of useEvolu
grep -r "useEvolu()" src/ | wc -l
# Replace with direct evolu import - if no tests fail, wrapper was pure overhead
```

### For recordTransformation deletion:
```bash
# Count call sites
grep -r "recordTransformation" src/ | wc -l
# Inline at each site - if total lines decrease, abstraction was net negative
```

### For bentSegmentPath unused code:
```bash
# Check if outerCommonTangentPoints is used
grep -r "outerCommonTangentPoints" src/
# If not found outside definition file: delete
```

### For useQuery wrapper:
```bash
# Check Evolu docs for native reactive queries
# If exists: replace all useQuery calls with native API
# If total code decreases: wrapper was unnecessary
```

---

## Appendix: Complexity Anti-Patterns Observed

1. **Wrapper for the sake of wrapping** - Evolu wrapper adds zero value
2. **Premature abstraction** - `recordTransformation` forces unrelated code into same shape
3. **God object** - App.tsx does everything
4. **Boolean explosion** - 20+ pending flags instead of single state enum
5. **Prop drilling to extreme** - 40+ props passed through components
6. **DRY violation** - Types defined multiple times
7. **Error swallowing** - `useQuery` catches and ignores all errors
8. **Feature speculation** - Complex geometry that may be unused

---

## Next Steps

1. **Start with deletions** (low risk, high impact):
   - Delete `src/lib/evolu/*`
   - Delete `recordTransformation.ts`
   - Consolidate duplicate types

2. **Verify and delete**:
   - Audit `bentSegmentPath.ts` usage
   - Check if `useQuery` needed
   - Verify truncation in `lineSegmentEndName`

3. **Refactor incrementally**:
   - Extract one transformation from App.tsx to separate module
   - Validate approach works
   - Repeat for remaining transformations
   - Extract canvas/selection/queries

4. **Simplify components**:
   - Group DrawingGuide props or split component
   - Extract ViewControls passthrough

---

**End of Analysis**

---

## Appendix: Analysis Prompt

This analysis was generated using the following prompt:

```
Analyze this code with the goal of reducing complexity.

Identify:

unnecessary abstractions

duplicate logic

over-generalized patterns

unused features

functions doing multiple responsibilities

For each issue:

explain why it increases cognitive load

propose the simplest possible alternative

Prefer deleting code over refactoring when possible.
```
