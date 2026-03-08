# Architecture Analysis: Unfolding Drawing App

## Original Prompt

> This repository was partially vibecoded.
>
> Your task is to make it easier for both humans and AI models to extend.
>
> Identify:
>
> structural complexity
>
> unnecessary abstraction
>
> duplicated logic
>
> architectural smells
>
> Propose a simpler architecture.

---

## Understanding

This is a **drawing application** built with Solid.js + Evolu (local-first database), featuring complex geometric primitives (places, line segments, circular fields, axes, repeaters) with hierarchical relationships and transformation operations.

The codebase exhibits classic **"vibecoding" symptoms**: rapid feature addition without refactoring, resulting in a 5,700-line monolithic component with 48+ local signals managing intertwined state.

---

## TL;DR

**Current state:**
- 5,700-line App.tsx with 48+ signals managing UI, geometry, selection, and pending operations
- Tight coupling between UI state, domain logic, and rendering
- Redundant Evolu wrapper abstractions providing no value
- Complex state machines encoded implicitly across multiple signals
- Geometry calculations scattered throughout the UI layer

**Proposed architecture:**
- Extract domain layer (geometry, transformations, relationships)
- State machine for interaction modes (explicit, testable)
- Separate rendering from state management
- Remove unnecessary Evolu wrappers
- Domain-driven modules instead of feature soup

---

## Identified Issues

### 1. Structural Complexity

#### **Monolithic App.tsx (5,700 lines)**
**Evidence:** App.tsx:1-5686

The entire application lives in one component:
- Selection state (9 signals for different entity types)
- Pending operations (20+ signals for different transforms in progress)
- View/pan/zoom state (6 signals)
- Complex geometry calculations (600+ lines for position resolution)
- Event handlers inline
- Rendering logic mixed with state management

**Impact:** 
- Impossible to test in isolation
- Cannot reuse logic
- High cognitive load (must understand everything to change anything)
- Merge conflicts inevitable

#### **Implicit State Machines**
**Evidence:** App.tsx:107-467

State is managed across 48+ independent signals that must be coordinated:

```typescript
const [guideStep, setGuideStep] = createSignal<GuideStep>('observe');
const [transformChoice, setTransformChoice] = createSignal<TransformChoice>(null);
const [pendingAdd, setPendingAdd] = createSignal<{...} | null>(null);
const [pendingMove, setPendingMove] = createSignal<{...} | null>(null);
const [pendingRotate, setPendingRotate] = createSignal<{...} | null>(null);
// ... 40+ more signals
```

**Reality check:** These signals encode a state machine, but it's implicit. Valid states are never declared. Transitions happen via scattered `setX()` calls. Impossible to verify that invalid states (e.g., `pendingAdd` and `pendingMove` both active) never occur.

### 2. Unnecessary Abstraction

#### **Evolu Wrapper Layer**
**Evidence:** 
- `src/lib/evolu/createUseEvolu.ts` (16 lines)
- `src/lib/evolu/useEvolu.ts`
- `src/lib/evolu/EvoluContext.ts`
- `src/lib/evolu/EvoluProvider.tsx`

These files create a "typed hook" wrapper around Evolu that provides **zero value**:

```typescript
export const createUseEvolu = <S extends EvoluSchema>(
  _evolu: Evolu<S>,
): (() => Evolu<S>) => useEvolu as () => Evolu<S>;
```

This is just type casting with extra steps. The app could call `evolu` directly.

**Contact test:** Remove the wrapper. Does anything break that TypeScript wouldn't already catch? No.

#### **useQuery Hook**
**Evidence:** src/lib/useQuery.ts:9-38

38 lines to wrap Evolu's query subscription in a Solid signal. This is valid abstraction, but it's buried in a directory structure that suggests it's part of the "Evolu layer" when it's actually a Solid-specific adapter.

### 3. Duplicated Logic

#### **Position Calculation Repetition**
**Evidence:** App.tsx:604-753 and App.tsx:938-1397

The `getAbsolutePosition` function (150 lines) calculates world positions for places. Then `placesWithAbsolutePositions` (460 lines) does it again with additional overrides for pending operations.

Within `placesWithAbsolutePositions`, there are **three separate loops** that do essentially the same descendant propagation (lines 994-1068, 1077-1172, 1098-1171).

**Duplication pattern:**
```typescript
// Pattern appears 3 times with slight variations
const getPlaceDependency = (place: PlaceLike): PlaceId | null => {
  if (place.parentId != null) return place.parentId;
  if (place.parentAxisId != null) { /* find parent via axis */ }
  if (place.parentCircularFieldId != null) { /* find parent via field */ }
  return null;
};
let changed = true;
while (changed) { /* propagate changes to descendants */ }
```

#### **Axis Projection Duplication**
**Evidence:** App.tsx:804-856 and App.tsx:860-936

`repeaterPointToAxisParams` and `repeaterPointToSnappedWorld` are nearly identical functions (both project points onto repeater axes), differing only in return type.

### 4. Architectural Smells

#### **God Object: `placesWithAbsolutePositions`**
**Evidence:** App.tsx:938-1397 (460 lines)

This computed value tries to do everything:
- Calculate positions for all places
- Apply pending move overrides
- Apply pending rotate overrides
- Handle echo group propagation (repeaters)
- Insert synthetic preview places for pending operations
- Recursively propagate changes through dependency graph

This is **four different responsibilities** in one function.

#### **Mixed Abstraction Levels**
**Evidence:** App.tsx:598-753 vs App.tsx:15-59

Compare:
- High-level imports: `DrawingDNAPane`, `DrawingGuide`, `ViewportCanvas`
- Low-level math: `rotateBy`, `Math.cos`, axis projections
- Database queries: `useQuery(allPlacesQuery)`
- SVG rendering concerns: `PLACE_RADIUS`, `CROSSHAIR_SIZE`

All in the same file, same scope.

#### **Implicit Dependencies**
**Evidence:** App.tsx throughout

Functions reference closure variables without declaring dependencies:

```typescript
const isCircularFieldOnlyChild = (cfId: CircularFieldId | null): boolean => {
  // References: circularFields(), places(), lineSegmentEnds() from closure
  // Not passed as parameters, not declared as deps
}
```

This breaks testability and makes refactoring dangerous.

#### **Fat Schema, Weak Types**
**Evidence:** src/lib/evolu-db.ts:94-172

The `transformation` table has 21 columns, most nullable, because it's a union type stored as a wide table:

```typescript
transformation: {
  kind: TransformationKind,  // discriminant
  placeId: PlaceId,
  parentId: nullOr(PlaceId),
  x: nullOr(FiniteNumber),
  lineSegmentId: nullOr(LineSegmentId),
  lineSegmentId2: nullOr(LineSegmentId),
  lineSegmentId3: nullOr(LineSegmentId),
  // ... 14 more nullable fields
}
```

**Mythology risk:** "This is how Evolu schemas work." Reality: Evolu supports multiple tables. This design makes every transformation query fetch 21 columns even when only 3 are relevant.

#### **Naming Inconsistency**
**Evidence:** src/lib/evolu-db.ts:40-92

Transformation kinds use multiple naming schemes:
- `AddKind`, `MoveKind`, `DeleteKind` (noun)
- `addLine`, `deleteLine` (verb + noun)
- `addCircularField`, `modifyCircularField` (verb + full noun)
- `modifyPlaceOnCircularRepeater` (verb + context + noun)

No coherent pattern.

---

## Proposed Simpler Architecture

### Core Principle

**Separate what changes from how it changes from what it looks like.**

- **Domain layer:** What exists (places, segments, fields) and what's possible (transformations, relationships)
- **State layer:** Current mode, selection, pending operations (explicit state machine)
- **View layer:** Rendering and user input

### Proposed Structure

```
src/
  domain/
    entities/
      Place.ts          # Place type, creation, validation
      LineSegment.ts
      CircularField.ts
      Axis.ts
      Repeater.ts
    
    geometry/
      positions.ts      # World position calculation (pure)
      projections.ts    # Axis projection, snapping
      relationships.ts  # Parent/child traversal
    
    transformations/
      operations.ts     # Operation definitions
      apply.ts          # Applying operations to entities
    
  state/
    interaction.ts      # State machine: Idle | Selecting | Transforming | Executing
    selection.ts        # What's selected (single source of truth)
    pending.ts          # Preview state for active operation
  
  ui/
    App.tsx             # Orchestration only (<200 lines)
    canvas/
      DrawingCanvas.tsx
      PlaceRenderer.tsx
      LineRenderer.tsx
    
    panels/
      Guide.tsx
      ObjectsList.tsx
    
  persistence/
    schema.ts           # Evolu schema
    queries.ts          # Query definitions
    sync.ts             # useQuery wrapper (Solid-specific)
```

### Key Simplifications

#### 1. **Domain Layer: Pure Functions**

**Before (App.tsx:604-753):**
```typescript
const getAbsolutePosition = (
  place: PlaceLike,
  placesList: ReadonlyArray<PlaceLike>,
  moveOverride?: {...} | null,
  angleOverride?: {...} | null,
): { x: number; y: number; worldAngle: number } => {
  // 150 lines referencing axes(), circularFields() from closure
}
```

**After (domain/geometry/positions.ts):**
```typescript
export function worldPosition(
  place: Place,
  places: ReadonlyMap<PlaceId, Place>,
  axes: ReadonlyMap<AxisId, Axis>,
  fields: ReadonlyMap<CircularFieldId, CircularField>,
): WorldPosition {
  // Pure function, explicit dependencies, easily testable
  // Returns single concern: final position
}

export function applyPreview(
  positions: ReadonlyMap<PlaceId, WorldPosition>,
  preview: MovePreview | RotatePreview,
): ReadonlyMap<PlaceId, WorldPosition> {
  // Separate concern: applying preview overrides
}
```

**Benefits:**
- Testable without Solid
- No hidden dependencies
- Single responsibility
- Can memoize independently

#### 2. **Explicit State Machine**

**Before (App.tsx:107-467 - 48 signals):**
```typescript
const [guideStep, setGuideStep] = createSignal<GuideStep>('observe');
const [transformChoice, setTransformChoice] = createSignal<TransformChoice>(null);
const [pendingAdd, setPendingAdd] = createSignal<{...} | null>(null);
const [pendingMove, setPendingMove] = createSignal<{...} | null>(null);
// ... 44 more
```

**After (state/interaction.ts):**
```typescript
export type InteractionState =
  | { mode: 'idle' }
  | { mode: 'selecting'; hovered: EntityId | null }
  | { mode: 'transforming'; operation: OperationId; selection: Selection }
  | { mode: 'executing'; operation: Operation; preview: Preview }

export function transition(
  state: InteractionState,
  event: InteractionEvent,
): InteractionState {
  // All transitions in one place
  // Impossible states ruled out by types
}
```

**Benefits:**
- Valid states are explicit
- Transitions are centralized
- Type system prevents invalid states
- Can visualize as state diagram
- Easy to add logging/debugging

#### 3. **Remove Evolu Wrapper**

**Before:**
- 5 files in `src/lib/evolu/`
- Custom context, provider, hook factory

**After:**
- Use `evolu` directly from `schema.ts`
- Keep only `useQuery` helper (rename to `useEvoluQuery` for clarity)

**Evidence this works:** The wrapper provides no runtime value, only type narrowing that TypeScript already does.

#### 4. **Normalize Geometry Calculations**

**Before:** 
- `getAbsolutePosition` (150 lines)
- `placesWithAbsolutePositions` (460 lines)
- Three duplicate descent loops

**After:**
```typescript
// domain/geometry/positions.ts

// 1. Build dependency graph (once)
export function buildDependencyGraph(
  places: Place[],
  axes: Axis[],
  fields: CircularField[],
): DependencyGraph { ... }

// 2. Topological sort (once)
export function sortPlacesByDependency(
  graph: DependencyGraph
): PlaceId[] { ... }

// 3. Calculate positions in order (once per place)
export function calculatePositions(
  sortedIds: PlaceId[],
  places: Map<PlaceId, Place>,
  dependencies: DependencyGraph,
): Map<PlaceId, WorldPosition> { ... }

// 4. Apply preview (separate concern)
export function applyPreview(
  positions: Map<PlaceId, WorldPosition>,
  preview: Preview,
): Map<PlaceId, WorldPosition> { ... }
```

**Contact test:** Current implementation recalculates the entire dependency graph on every render. Proposed version caches the graph, only recalculating when entities change. Performance should improve measurably (can benchmark).

#### 5. **Split Transformation Schema**

**Before (evolu-db.ts:150-171):**
```typescript
transformation: {
  id: TransformationId,
  kind: TransformationKind,  // 24 possible values
  placeId: PlaceId,
  parentId: nullOr(PlaceId),
  x: nullOr(FiniteNumber),
  // ... 16 more nullable columns
}
```

**After:**
```typescript
// Option A: Single table with JSON blob (simpler queries)
transformation: {
  id: TransformationId,
  kind: TransformationKind,
  entityId: String1000,  // polymorphic reference
  data: String1000,      // JSON payload
}

// Option B: Separate tables (type-safe queries)
placeTransformation: { id, kind: PlaceTransformKind, placeId, x, y, angle }
lineTransformation: { id, kind: LineTransformKind, lineSegmentId, ... }
// etc.
```

**Trade-off:** Option A is simpler (one table, one query), Option B is more "correct" (leverages SQL types). Given Evolu's local-first nature and small data volumes, **Option A is recommended**.

#### 6. **Domain-Driven Modules**

**Before:**
- `lib/bentSegmentPath.ts` (1,087 lines)
- `lib/recordTransformation.ts` (622 lines)
- `lib/axisGeometry.ts` (153 lines)

Files named after implementation details ("bent segment path") rather than domain concepts.

**After:**
```
domain/
  rendering/
    paths.ts           # SVG path generation (includes bent segments)
  
  transformations/
    record.ts          # Recording to persistence layer
    operations.ts      # Operation definitions
  
  geometry/
    axes.ts            # Axis projections, snapping
    positions.ts       # World position calculations
```

**Benefits:**
- Discoverable by domain concept, not implementation
- Clear what depends on what
- Can split large files by responsibility

---

## Migration Strategy

### Phase 1: Extract Domain (No UI Changes)
1. Create `domain/entities` with types (extract from schema)
2. Create `domain/geometry/positions.ts`, move `getAbsolutePosition` → `worldPosition`
3. Test against existing behavior
4. Update App.tsx to use new functions (should be drop-in replacement)

**Contact test:** UI behaves identically. No visual changes.

### Phase 2: Normalize Position Calculation
1. Implement dependency graph + topological sort
2. Replace `placesWithAbsolutePositions` with cached version
3. Benchmark: should be faster

**Contact test:** Performance improves. Correctness verified by existing tests.

### Phase 3: State Machine
1. Define `InteractionState` type
2. Implement `transition` function
3. Create adapter: convert 48 signals → single state signal
4. Verify behavior unchanged
5. Remove old signals incrementally

**Contact test:** All interactions work identically.

### Phase 4: Split App.tsx
1. Extract rendering into `canvas/` components
2. Extract panels into `panels/`
3. App.tsx becomes orchestration layer

**Contact test:** UI unchanged. File structure cleaner.

### Phase 5: Remove Evolu Wrapper
1. Replace `useEvolu()` with `evolu` direct calls
2. Delete wrapper files
3. Keep `useQuery` → rename `useEvoluQuery`

**Contact test:** Code compiles, runtime behavior unchanged.

---

## Complexity Metrics

### Current
- **App.tsx:** 5,686 lines
- **Signals:** 48+
- **Functions in App scope:** ~30
- **Longest function:** `placesWithAbsolutePositions` (460 lines)
- **Test coverage:** Unknown (likely low due to coupling)
- **Cyclomatic complexity:** Very high (nested conditionals throughout)

### After Refactor (Estimated)
- **App.tsx:** <200 lines (orchestration only)
- **State signals:** 1 (state machine) + 3-5 (view state: scale, translate, mode)
- **Domain modules:** 10-15 pure functions (each <100 lines)
- **Longest function:** <150 lines
- **Test coverage:** Can reach >80% on domain layer (pure functions)
- **Cyclomatic complexity:** Low in domain layer, constrained in state machine

---

## Risks & Unknowns

### **Unknown: Actual Usage Patterns**
**Question:** How often do users create complex hierarchies (places → axes → repeaters → fields)? If rare, simpler position calculation might suffice.

**Contact test:** Add telemetry for entity counts and hierarchy depth. If 90% of drawings have <10 places with 0 hierarchy, optimize for that.

### **Unknown: Evolu Schema Migration Path**
**Question:** Can we change the `transformation` schema without losing existing data?

**Contact test:** Evolu documentation on migrations. May need to keep wide schema for backward compatibility.

### **Assumption: Pending Operations Are Exclusive**
**Claim:** At most one pending operation is active at a time.

**Contact test:** Search codebase for simultaneous sets of different `pending*` signals. If found, state machine needs parallel states.

---

## Questions for Clarification

Before proceeding, need to know:

1. **Scope:** Should this refactor preserve 100% of existing functionality, or can we simplify some features?

2. **Timeline:** Is this a "burn it down and rebuild" or "gradual extraction while maintaining working app"?

3. **Tests:** Are there any existing tests beyond the `test/*.test.js` files? What's the current coverage?

4. **Usage data:** Do you have analytics on which transformations are actually used? Can we simplify the operation set?

5. **Evolu commitment:** Is the Evolu dependency negotiable, or is local-first sync a hard requirement?

---

## Summary

**Current architecture:** Feature soup in a 5,700-line component with implicit state machines and duplicated geometry calculations.

**Core problem:** Lack of separation between domain logic, state management, and UI rendering.

**Proposed fix:** Extract domain layer (pure functions), explicit state machine, separate rendering. Remove unnecessary Evolu wrappers.

**Expected outcome:**
- 70% reduction in App.tsx lines
- Testable domain logic
- Clear state transitions
- Faster position calculations (caching)
- Easier to extend (add operations, entities)

**Next step:** Choose migration strategy (big-bang vs incremental) and validate assumptions via contact tests.
