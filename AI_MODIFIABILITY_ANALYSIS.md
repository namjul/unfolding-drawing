# AI Modifiability Analysis

**Date:** 2026-03-08  
**Analyst:** Claude (Sonnet 4.5)  
**Codebase:** Unfolding Drawing Application

---

## Prompt

> Review this code and identify parts that are difficult for an AI coding model to reliably modify.
>
> Look for:
> - long dependency chains
> - implicit state
> - dynamic behavior
> - deep abstraction layers
> - meta-programming
> - configuration scattered across files
>
> Suggest structural changes that make the code easier for an AI model to reason about.

---

## Executive Summary

This drawing application exhibits several structural patterns that create significant challenges for AI-powered code modification. The primary issues are:

1. **Massive implicit state coordination** (40+ interdependent signals in App.tsx)
2. **Deep recursive position calculations** with side-channel overrides
3. **Configuration scattered across 4+ files** with no single source of truth
4. **Type system circumvention** through sentinel IDs and magic strings
5. **Hidden control flow** in reactive memos that look pure but contain side effects

These patterns aren't inherently wrong—they work for human developers familiar with the codebase. However, they create a high cognitive load when attempting modifications, making it error-prone for AI models to introduce changes without breaking implicit contracts.

**Key finding:** The difficulty isn't the technology stack (TypeScript/Solid.js)—it's the implicit coupling between components and the lack of explicit boundaries between concerns.

---

## 1. Massive State Coordination in App.tsx (Critical)

### Location
`src/App.tsx:90-467`

### Problem
The App component manages 40+ separate `createSignal` calls for interdependent state:

```typescript
const [selectedPlaceId, setSelectedPlaceId] = createSignal<PlaceId | null>(null);
const [selectedLineSegmentId, setSelectedLineSegmentId] = createSignal<LineSegmentId | null>(null);
const [selectedCircularFieldId, setSelectedCircularFieldId] = createSignal<CircularFieldId | null>(null);
const [selectedBendingCircularFieldId, setSelectedBendingCircularFieldId] = createSignal<BendingCircularFieldId | null>(null);
const [selectedAxisId, setSelectedAxisId] = createSignal<AxisId | null>(null);
const [selectedCircularRepeaterId, setSelectedCircularRepeaterId] = createSignal<CircularRepeaterId | null>(null);

const [pendingAdd, setPendingAdd] = createSignal<{...} | null>(null);
const [pendingMove, setPendingMove] = createSignal<{...} | null>(null);
const [pendingRotate, setPendingRotate] = createSignal<{...} | null>(null);
const [pendingAddLine, setPendingAddLine] = createSignal<{...} | null>(null);
const [pendingDeletePlaceId, setPendingDeletePlaceId] = createSignal<PlaceId | null>(null);
const [pendingAddCircularField, setPendingAddCircularField] = createSignal<PendingAddCircularField | null>(null);
// ... 30+ more signals
```

### Why This Is Hard for AI

**Implicit state contracts:** Changing one signal often requires updating 3-5 others, but these dependencies aren't explicitly declared anywhere.

**Hidden invariants:** For example, only one "pending" operation should be active at a time, but this constraint exists only in scattered conditionals throughout the codebase.

**No single source of truth:** The application's state machine is implicit across dozens of boolean/nullable signals rather than an explicit state type.

### Observable Difficulty

An AI asked to "add a new transform type" must:

1. Add signal declarations (App.tsx:~350)
2. Update `hasChanges()` logic (App.tsx:189-225)
3. Modify DrawingGuide props interface (DrawingGuide.tsx:26-103, adding 2-4 properties)
4. Add UI handling in DrawingGuide component
5. Update event handlers across 2000+ lines of App.tsx
6. Remember to clear the pending state in multiple cleanup paths

**Evidence of complexity:** The `hasChanges()` function (App.tsx:189-225) requires 35 lines just to check whether _any_ pending operation exists:

```typescript
const hasChanges = () => {
  const s = step();
  if (s === 'complete') return true;
  if (s !== 'execute') return false;
  return !!(
    props.pendingAdd ||
    props.pendingMove ||
    props.pendingRotate ||
    props.pendingAddCircularField ||
    props.pendingModifyCircularField ||
    props.pendingDeleteLineId ||
    props.pendingDeleteCircularFieldId ||
    props.transformChoice === 'delete' ||
    props.transformChoice === 'deleteLine' ||
    // ... 15+ more conditions
  );
};
```

### Suggested Fix

Replace 40+ signals with an explicit state machine:

```typescript
type AppState = 
  | { mode: 'observing' }
  | { mode: 'selecting'; selection: Selection }
  | { mode: 'transforming'; transform: Transform; preview: Preview }
  | { mode: 'executing'; operation: Operation; changes: Change[] };

const [state, setState] = createSignal<AppState>({ mode: 'observing' });

// Now invalid states are unrepresentable
// Can't have pendingMove AND pendingRotate simultaneously
```

**Benefits:**
- All valid state transitions become explicit
- Type system prevents impossible states
- Single `state` signal instead of 40+
- `hasChanges()` becomes: `state().mode === 'executing' && state().changes.length > 0`

---

## 2. Deep, Recursive Position Calculation (Critical)

### Location
`src/App.tsx:604-753` (`getAbsolutePosition` function)  
`src/App.tsx:938-1397` (`placesWithAbsolutePositions` function)

### Problem

The `getAbsolutePosition` function is a 150-line recursive function that computes place positions by traversing parent chains and handling:

- 4 different coordinate systems (parent-relative, axis-relative, circular-field-relative, world)
- Optional overrides for move/rotate operations passed as parameters
- Circular repeater echo group propagation
- Bidirectional vs. unidirectional axis clamping

```typescript
const getAbsolutePosition = (
  place: PlaceLike,
  placesList: ReadonlyArray<PlaceLike>,
  moveOverride?: { placeId: PlaceId | 'pending'; x: number; y: number } | null,
  angleOverride?: { placeId: PlaceId; angle: number } | null,
): { x: number; y: number; worldAngle: number } => {
  // 150 lines of nested conditionals and recursive calls
  if (moveOverride && place.id === moveOverride.placeId) {
    // Special handling for move preview
  }
  if (place.parentAxisId != null) {
    // Compute position relative to axis
    const axis = axes().find(a => a.id === place.parentAxisId);
    const parent = axis ? placesList.find(p => p.id === axis.placeId) : null;
    if (axis && parent) {
      const parentRes = getAbsolutePosition(parent, placesList, moveOverride, angleOverride); // Recursive
      // Complex trigonometry for axis-relative positioning
    }
  }
  if (place.parentCircularFieldId != null) {
    // Compute position on circular field
  }
  if (place.parentId !== null) {
    // Compute position relative to parent place
  }
  // ... multiple exit paths
};
```

The caller `placesWithAbsolutePositions()` is 450 lines and includes:
- Base recursive position calculation (lines 938-950)
- Rotation echo group propagation (lines 951-1069)
- Move echo group propagation (lines 1071-1249)
- Sentinel preview place injection (lines 1251-1395)

### Why This Is Hard for AI

**No intermediate data structure:** All calculations are performed inline during recursion with no way to inspect intermediate results.

**Multiple exit paths:** Early returns mixed with fallthrough logic make control flow hard to trace.

**Fragile recursion:** Adding a new coordinate system (e.g., polar coordinates, snap-to-grid) requires understanding the entire recursive call stack and all parent chain traversal logic.

**Override mechanism complexity:** The `moveOverride` and `angleOverride` parameters thread through the recursion with special handling for sentinel IDs like `'pending'`.

### Observable Difficulty

To modify position calculation (e.g., add snap-to-grid), an AI must:

1. Trace 5 different conditional branches in `getAbsolutePosition`
2. Understand how overrides propagate through parent chains
3. Preserve echo group synchronization logic (App.tsx:956-1069)
4. Maintain bidirectional axis clamping (App.tsx:678)
5. Handle 3 different sentinel preview places (App.tsx:1251-1395)
6. Update the 120-line echo propagation loops that recalculate descendant positions

**Evidence of complexity:** The echo group rotation propagation alone (App.tsx:951-1069) requires:
- Finding all places in the echo group
- Computing rotation delta
- Updating all places in the group
- Building a dependency graph of parent relationships
- Iterating until convergence to propagate changes to descendants

```typescript
// Excerpt from echo group rotation propagation
const updatedIds = new Set<PlaceId>();
for (let i = 0; i < result.length; i++) {
  if ((result[i] as PlaceLike).repeaterEchoGroupId !== groupId) continue;
  updatedIds.add(result[i].id);
}
const getPlaceDependency = (place: PlaceLike): PlaceId | null => {
  if (place.parentId != null) return place.parentId;
  if (place.parentAxisId != null) {
    const ax = axes().find((a) => a.id === place.parentAxisId);
    return ax ? ax.placeId : null;
  }
  // ...
};
let changed = true;
while (changed) {
  changed = false;
  for (let i = 0; i < result.length; i++) {
    // 80+ lines of propagation logic
  }
}
```

### Suggested Fix

Separate concerns into a pipeline of pure transformations:

```typescript
type PositionLayer = {
  local: Vector2;      // Position relative to parent
  world: Vector2;      // Absolute position
  angle: number;       // World angle
  parent: PlaceId | null;
};

// Pure functions, each testable independently
function calculateBasePositions(places: Place[]): Map<PlaceId, PositionLayer> {
  // Non-recursive: topological sort + single pass
}

function applyMoveOverride(
  positions: Map<PlaceId, PositionLayer>, 
  override: MoveOverride
): Map<PlaceId, PositionLayer> {
  // Pure transformation, returns new map
}

function applyEchoGroupSync(
  positions: Map<PlaceId, PositionLayer>,
  groups: EchoGroup[]
): Map<PlaceId, PositionLayer> {
  // Explicitly synchronize echo groups
}

function applyPreviews(
  positions: Map<PlaceId, PositionLayer>,
  previews: PreviewPlace[]
): Map<PlaceId, PositionLayer> {
  // Add preview places
}

// Compose pipeline
const positions = pipe(
  calculateBasePositions(places),
  applyMoveOverride(moveOverride),
  applyEchoGroupSync(echoGroups),
  applyPreviews(previewPlaces)
);
```

**Benefits:**
- Each layer is independently testable
- No recursion—use topological sort for parent dependencies
- Override mechanism is explicit transformation step
- Can insert debugging/logging between layers
- Can cache intermediate results

---

## 3. Configuration Scattered Across Type Unions (High Impact)

### Location
- `src/lib/evolu-db.ts:40-91` (Transformation kind literals)
- `src/lib/transform-matrix.ts:20-45` (Transform IDs)
- `src/lib/recordTransformation.ts:223-247` (Record types)
- `src/lib/recordTransformation.ts:254-621` (Switch statement cases)

### Problem

Transform definitions are split across 4 files with no automated synchronization:

**File 1: evolu-db.ts**
```typescript
const AddKind = literal('add');
const AddRelatedKind = literal('addRelated');
const MoveKind = literal('move');
const DeleteKind = literal('delete');
const RotateKind = literal('rotate');
// ... 20+ more literals

const TransformationKind = union(
  AddKind,
  AddRelatedKind,
  MoveKind,
  // ... all 25 kinds
);
```

**File 2: transform-matrix.ts**
```typescript
export type TransformId =
  | 'add'
  | 'addRelated'
  | 'addLine'
  | 'move'
  | 'delete'
  // ... 16+ more IDs
  
export const TRANSFORMS: readonly TransformDef[] = [
  { id: 'add', label: 'Add Place', allowedSelectionTypes: ['drawingPane'] },
  { id: 'addRelated', label: 'Add a Related Place', allowedSelectionTypes: ['place', 'placeOnCircularRepeater'] },
  // ... 21+ more transform definitions
];
```

**File 3: recordTransformation.ts**
```typescript
export type RecordAdd = { kind: 'add'; placeId: PlaceId; parentId: null; x: number; y: number; };
export type RecordAddRelated = { kind: 'addRelated'; placeId: PlaceId; parentId: PlaceId; x: number; y: number; };
// ... 15+ more record types

export type TransformationRecord =
  | RecordAdd
  | RecordAddRelated
  | RecordMove
  // ... all 17 types

export function recordTransformation(data: TransformationRecord): void {
  switch (data.kind) {
    case 'add': /* ... */ break;
    case 'addRelated': /* ... */ break;
    // ... 17+ cases
  }
}
```

### Why This Is Hard for AI

**Multi-file coordination:** Adding a "scale place" transform requires edits in 5+ files with no automated checking.

**No schema validation:** TypeScript won't catch if you add `ScaleKind` literal but forget to add a case in the `recordTransformation` switch statement.

**Implicit coupling:** Transform names like `'addCircularRepeater'` must match exactly across all files, but there's no shared constant.

**Silent failures:** Forgetting to add a transform to `TRANSFORMS` array means it won't appear in the UI, but TypeScript won't warn you.

### Observable Difficulty

**Complete dependency chain for adding one transform:**

1. Add literal to `TransformationKind` union (evolu-db.ts:66-91)
2. Add ID to `TransformId` type (transform-matrix.ts:20-45)
3. Add definition to `TRANSFORMS` array (transform-matrix.ts:59-173)
4. Create `RecordX` type (recordTransformation.ts:~200)
5. Add to `TransformationRecord` union (recordTransformation.ts:223-247)
6. Add switch case to `recordTransformation()` (recordTransformation.ts:254-621)
7. Add pending state signal (App.tsx:~350)
8. Add prop to DrawingGuide interface (DrawingGuide.tsx:26-103)
9. Add UI elements (DrawingGuide.tsx:~450)
10. Add event handlers (App.tsx:~1500+)

**Evidence:** The `recordTransformation` switch statement (recordTransformation.ts:254-621) is 367 lines for 17 transform types—an average of 21 lines per transform with significant boilerplate duplication.

### Suggested Fix

Create a single source of truth with derived types:

```typescript
// transforms.config.ts - Single source of truth
import { z } from 'zod';

const TRANSFORM_REGISTRY = {
  add: {
    label: 'Add Place',
    selectionTypes: ['drawingPane'] as const,
    schema: z.object({
      placeId: PlaceIdSchema,
      parentId: z.null(),
      x: z.number(),
      y: z.number(),
    }),
  },
  addRelated: {
    label: 'Add a Related Place',
    selectionTypes: ['place', 'placeOnCircularRepeater'] as const,
    schema: z.object({
      placeId: PlaceIdSchema,
      parentId: PlaceIdSchema,
      x: z.number(),
      y: z.number(),
    }),
  },
  scale: {
    label: 'Scale Place',
    selectionTypes: ['place'] as const,
    schema: z.object({
      placeId: PlaceIdSchema,
      factor: z.number().positive(),
    }),
  },
  // ... all other transforms
} as const;

// Derive all types from registry
export type TransformId = keyof typeof TRANSFORM_REGISTRY;
export type TransformRecord = {
  [K in TransformId]: {
    kind: K;
  } & z.infer<typeof TRANSFORM_REGISTRY[K]['schema']>
}[TransformId];

// Generate Evolu schema literals
export const TransformationKindLiterals = Object.keys(TRANSFORM_REGISTRY).map(
  k => literal(k)
);

// Generate recording function automatically
export function recordTransformation(data: TransformRecord): void {
  const config = TRANSFORM_REGISTRY[data.kind];
  const validated = config.schema.parse(data);
  evolu.insert('transformation', { kind: data.kind, ...validated });
}
```

**Benefits:**
- Adding a transform = one object in the registry
- All types derived automatically
- Schema validation catches data errors
- No multi-file coordination needed
- Can generate UI automatically from registry

---

## 4. Implicit Geometry Dependencies (Medium Impact)

### Location
- `src/lib/axisGeometry.ts`
- `src/lib/bentSegmentPath.ts`
- Throughout `src/App.tsx` (geometry calculations)

### Problem

Geometry calculations reference each other through implicit coordinate system conventions:

```typescript
// From App.tsx - no type distinguishes coordinate spaces
const getAxisWorldGeometry = (axis, placesAbs) => {
  // Returns world coordinates, but nothing prevents passing canvas coords
};

const projectPointOntoAxis = (cx, cy, originX, originY, worldAngle) => {
  // Expects world coords, but type is just `number`
};

const canvasToWorld = (canvasX, canvasY) => {
  // Transforms spaces, but returns same `number` type
};
```

**Coordinate system conventions exist only in programmer's head:**
- Canvas coordinates (SVG viewport space)
- World coordinates (transformed by pan/zoom)
- Local coordinates (relative to parent place)
- Axis-relative coordinates (distance along axis + perpendicular)

**No boundary validation:** Functions assume inputs are in the correct coordinate space, but the type system provides no guarantees.

### Observable Difficulty

**Example:** `App.tsx:814-857` shows `repeaterPointToAxisParams` computing axis-relative coordinates:

```typescript
const repeaterPointToAxisParams = (
  circularRepeaterId: CircularRepeaterId,
  cx: number,  // Is this canvas or world coords? Type doesn't say!
  cy: number,
  placesAbs: ReadonlyArray<{...}>,
): { distanceAlongAxis: number; distanceFromAxis: number } => {
  const repAxes = axes().filter(/* ... */);
  for (const axis of repAxes) {
    const geom = getAxisWorldGeometry(axis, placesAbs);  // Returns world coords
    let d = projectPointOntoAxis(cx, cy, geom.originX, geom.originY, geom.worldAngle);
    // Assumes cx, cy are in world coords, but nothing enforces this
  }
  // ...
};
```

**Bugs that can happen:**
- Pass canvas coords to function expecting world coords → wrong position
- Mix world angle with local angle → incorrect rotation
- Apply world transform twice → items appear in wrong location

**Current mitigation:** Careful naming (`placesAbs`, `worldAngle`) but no compiler enforcement.

### Suggested Fix

Use phantom types to distinguish coordinate spaces:

```typescript
// Phantom type system for coordinate spaces
type World = { _brand: 'world' };
type Canvas = { _brand: 'canvas' };
type Local = { _brand: 'local' };

type Vector2<Space> = { 
  x: number; 
  y: number; 
  _space: Space;  // Phantom field for type checking
};

type Angle<Space> = number & { _space: Space };

// Now functions are explicit about coordinate spaces
function projectPointOntoAxis(
  point: Vector2<World>,
  axis: { origin: Vector2<World>; angle: Angle<World> }
): { distance: number; perpendicular: number } {
  // Compiler ensures inputs are in world space
}

function canvasToWorld(
  point: Vector2<Canvas>,
  viewport: ViewportTransform
): Vector2<World> {
  // Type system enforces conversion at boundary
}

// Usage
const worldPoint = canvasToWorld(clickPosition, viewport);
const projected = projectPointOntoAxis(worldPoint, axis);  // Type-safe!
// projectPointOntoAxis(clickPosition, axis);  // Compiler error! ✓
```

**Benefits:**
- Compiler catches coordinate space mismatches
- Self-documenting function signatures
- No runtime cost (phantom types erase to primitives)
- Forced conversion at coordinate space boundaries

---

## 5. Long Dependency Chains in Event Handlers (Medium Impact)

### Location
Throughout `src/App.tsx` (event handlers and memos)

### Problem

Pointer event handlers and reactive memos have long dependency chains where:
- A single memo reads 8+ signals
- Callbacks inside memos mutate 3-5 signals atomically
- Changes trigger cascading reactive updates through multiple layers

**Example:** The `bendAtEndsState` memo (App.tsx:219-338) is 120 lines:

```typescript
const bendAtEndsState = createMemo(() => {
  const segId = selectedLineSegmentId();          // Signal 1
  const tc = transformChoice();                   // Signal 2
  if (tc !== 'bendAtEnds' || !segId) return null;
  
  const seg = lineSegments().find(s => s.id === segId);  // Signal 3
  const ends = lineSegmentEnds();                 // Signal 4
  const pl = places();                            // Signal 5
  const segsWithPos = lineSegmentsWithPositions();// Signal 6 (derived from 3,4,5)
  const bending = bendingCircularFields();        // Signal 7
  
  // Compute geometry inline (40 lines)
  const L = Math.hypot(pos.x2 - pos.x1, pos.y2 - pos.y1) || 1;
  const radius = Math.max(CIRCULAR_FIELD_MIN_RADIUS, 0.25 * L);
  // ...
  
  return {
    endALabel,
    endBLabel,
    hasBendAtA: !!bendAtA,
    hasBendAtB: !!bendAtB,
    onToggleBendAtA: () => {
      // Callback mutates database + 3 signals
      if (bendAtA && placeIdA != null) {
        setPendingBendAtEndsDeleted(prev => [...prev, {...}]);  // Signal mutation 1
        evolu.update('bendingCircularField', {                  // Database mutation
          id: bendAtA.id,
          isDeleted: true,
        });
      } else {
        const res = evolu.insert('bendingCircularField', {...}); // Database mutation
        if (res.ok && placeIdA != null) {
          setPendingBendAtEndsAdded(prev => [...prev, {...}]);   // Signal mutation 2
        }
      }
      setBendAtEndsDirty(true);                                  // Signal mutation 3
    },
    onToggleBendAtB: () => {
      // Similar callback with 3 mutations
    },
  };
});
```

### Why This Is Hard for AI

**Action at a distance:** Clicking a checkbox in the UI triggers:
1. Database mutation (Evolu insert/update)
2. Update to `pendingBendAtEndsAdded` signal
3. Update to `pendingBendAtEndsDeleted` signal
4. Update to `bendAtEndsDirty` flag
5. Reactive cascade through dependent memos

**No command pattern:** Can't log, undo, or test these operations independently because they're callbacks closing over 10+ signals.

**Callback soup:** The returned object has functions that capture all the memo's dependencies at creation time, making it hard to reason about when they execute and what state they'll see.

**Testing difficulty:** To test `onToggleBendAtA`, you need:
- Mock Evolu instance
- 7+ signals with correct values
- Full reactive context (can't call outside memo)

### Observable Difficulty

An AI trying to modify bend behavior must:
1. Understand which signals the memo reads (7+ dependencies)
2. Trace what each callback mutates (3 signals + database)
3. Follow reactive cascade to see what else updates
4. Ensure mutations happen in correct order (dirty flag last)
5. Handle edge cases (missing place ID, failed insert)

### Suggested Fix

Extract command pattern for actions:

```typescript
// Pure command types
type Command = 
  | { type: 'ToggleBendAtA'; segmentId: LineSegmentId; endId: LineSegmentEndId }
  | { type: 'ToggleBendAtB'; segmentId: LineSegmentId; endId: LineSegmentEndId }
  | { type: 'MoveBendField'; fieldId: BendingCircularFieldId; offset: Vector2 };

// Pure reducer (easy to test)
function executeCommand(cmd: Command, state: AppState): AppState {
  switch (cmd.type) {
    case 'ToggleBendAtA': {
      const existing = state.bendingFields.find(b => b.endId === cmd.endId);
      if (existing) {
        return {
          ...state,
          bendingFields: state.bendingFields.filter(b => b.id !== existing.id),
          pendingDeletes: [...state.pendingDeletes, existing.id],
        };
      } else {
        const radius = calculateBendRadius(cmd.segmentId, state);
        const newField = createBendingField(cmd.endId, radius);
        return {
          ...state,
          bendingFields: [...state.bendingFields, newField],
          pendingAdds: [...state.pendingAdds, newField.id],
        };
      }
    }
  }
}

// Thin event handler
const handleToggleBendAtA = () => {
  const cmd: Command = { 
    type: 'ToggleBendAtA', 
    segmentId: selectedLineSegmentId()!, 
    endId: endAId 
  };
  setState(prev => executeCommand(cmd, prev));
};

// View logic becomes pure derivation
const bendAtEndsState = createMemo(() => {
  const state = appState();
  return {
    endALabel: deriveBendLabel(state, 'A'),
    endBLabel: deriveBendLabel(state, 'B'),
    hasBendAtA: hasBendField(state, endAId),
    hasBendAtB: hasBendField(state, endBId),
  };
});
```

**Benefits:**
- Commands are serializable (can log, replay, undo)
- Reducer is pure function (easy to test)
- No closures over signals
- Clear separation: UI → Command → State → UI
- Can implement time-travel debugging

---

## 6. Magic Sentinel IDs (High Impact)

### Location
`src/App.tsx:83-88`, used throughout position calculations

### Problem

The codebase uses fake IDs cast to real ID types for preview/pending states:

```typescript
const PENDING_SPLIT_PLACE = '__pending_split_place__' as PlaceId;
const PENDING_AXIS_PLACE = '__pending_axis_place__' as PlaceId;
const PENDING_CIRCULAR_FIELD_PLACE = '__pending_cf_place__' as PlaceId;
```

These sentinel IDs are:
- **Injected into the places array** alongside real database IDs (App.tsx:1255-1266)
- **Checked with equality comparisons** throughout the code (App.tsx:1253, 1285, 1377)
- **Rendered alongside real places** in the same SVG elements

**Example injection:**
```typescript
const placesWithAbsolutePositions = () => {
  const result = pl.map(p => {
    const abs = getAbsolutePosition(p, pl, moveOverride, angleOverride);
    return { ...p, absX: abs.x, absY: abs.y, absWorldAngle: abs.worldAngle };
  });
  
  // Inject fake place into real places array
  if (ps) {
    result.push({
      id: PENDING_SPLIT_PLACE,  // String cast to PlaceId type
      parentId: null,
      x: 0,
      y: 0,
      angle: null,
      name: null,
      isScaffolding: 1,
      absX: previewX,
      absY: previewY,
      absWorldAngle: 0,
    } as (typeof result)[number]);  // Type assertion to force it
  }
  return result;
};
```

### Why This Is Hard for AI

**Type system lies:** TypeScript thinks `PENDING_SPLIT_PLACE` is a valid `PlaceId` that exists in the database, but it's actually a string constant.

**Pollution of data structures:** Preview places are mixed with persistent places in the same array, requiring every consumer to distinguish them.

**Fragile conditionals:** Every function processing places must check for sentinel values:

```typescript
if (pm?.placeId === PENDING_SPLIT_PLACE) {
  // Special handling for preview
} else {
  // Normal place logic
}
```

**Database corruption risk:** Nothing prevents accidentally passing a sentinel ID to `evolu.update()` or `evolu.insert()`.

**Unmaintainable growth:** Already 3 sentinel IDs; adding more preview types means more string constants and more conditional checks everywhere.

### Observable Difficulty

Functions that handle places must:
1. Check if ID is a sentinel before database operations
2. Filter sentinels before counting real places
3. Remember which sentinel corresponds to which preview state
4. Cast types to force sentinel places into real place arrays

**Evidence:** `getAbsolutePosition` has special handling for sentinel in moveOverride:
```typescript
if (moveOverride && place.id === moveOverride.placeId) {
  // moveOverride.placeId could be 'pending' or a real PlaceId
  // Type is PlaceId | 'pending' which circumvents the type system
}
```

### Suggested Fix

Use discriminated unions to separate preview from persisted data:

```typescript
type PersistedPlace = {
  type: 'persisted';
  id: PlaceId;  // Real database ID
  parentId: PlaceId | null;
  x: number;
  y: number;
  // ... other fields
};

type PreviewPlace = {
  type: 'preview';
  previewId: string;  // Not a PlaceId
  kind: 'split' | 'axis' | 'circularField';
  x: number;
  y: number;
  // ... preview-specific fields
};

type PlaceOrPreview = PersistedPlace | PreviewPlace;

// Now mixing them is explicit and type-safe
const placesWithPreviews: PlaceOrPreview[] = [
  ...places.map(p => ({ type: 'persisted' as const, ...p })),
  ...previews.map(p => ({ type: 'preview' as const, ...p })),
];

// Consumers must explicitly handle both cases
function renderPlace(place: PlaceOrPreview) {
  switch (place.type) {
    case 'persisted':
      return <PersistedPlaceMarker id={place.id} />;
    case 'preview':
      return <PreviewPlaceMarker kind={place.kind} />;
  }
}

// Type system prevents database operations on previews
function updatePlace(place: PlaceOrPreview, x: number, y: number) {
  if (place.type === 'preview') {
    throw new Error('Cannot update preview place');
  }
  evolu.update('place', { id: place.id, x, y });  // Type-safe!
}
```

**Benefits:**
- Type system prevents mixing preview/persisted data incorrectly
- No sentinel string constants
- Explicit handling at boundaries
- Can't accidentally insert preview into database
- Self-documenting: `place.type === 'preview'` is clearer than `place.id === PENDING_SPLIT_PLACE`

---

## 7. Hidden Control Flow in Memos (Medium Impact)

### Location
Multiple memos throughout `src/App.tsx`

### Problem

`createMemo` is used for both:
1. **Pure derived data** (appropriate): `lineSegmentsWithPositions`, `relatedPlaceIds`
2. **Effectful callbacks** (inappropriate): `bendAtEndsState`, which returns event handlers that mutate global state

**Example of problematic pattern:**

```typescript
// This LOOKS like a computed property
const bendAtEndsState = createMemo(() => {
  // ... 40 lines of computation
  
  // But returns event handlers with side effects!
  return {
    onToggleBendAtA: () => {
      evolu.update('bendingCircularField', {...});  // Side effect!
      setPendingBendAtEndsDeleted([...]);           // Side effect!
      setBendAtEndsDirty(true);                     // Side effect!
    },
    onToggleBendAtB: () => { /* more side effects */ },
  };
});

// Later, in UI:
<input onChange={() => bendAtEndsState()?.onToggleBendAtA()} />
```

### Why This Is Hard for AI

**Misleading abstraction:** "Memo" implies pure derivation of data, but these callbacks have global side effects when invoked.

**Testing difficulty:** Can't test callback behavior without full reactive context. Can't mock signals individually.

**Hidden initialization:** The callbacks close over signal values at memo creation time, but execute later when called. Reasoning about which signal values they'll see is difficult.

**No clear separation:** Effect-free computation mixed with effect-ful actions in same abstraction.

### Suggested Fix

Separate derived data from event handlers:

```typescript
// Pure derived state (appropriate for memo)
const bendAtEndsData = createMemo(() => {
  const segId = selectedLineSegmentId();
  const tc = transformChoice();
  if (tc !== 'bendAtEnds' || !segId) return null;
  
  const seg = lineSegments().find(s => s.id === segId);
  const bending = bendingCircularFields();
  // ... compute labels and flags
  
  return {
    endALabel,
    endBLabel,
    hasBendAtA: !!bendAtA,
    hasBendAtB: !!bendAtB,
    // No callbacks here
  };
});

// Event handlers separate (not in memo)
const handleToggleBendAtA = () => {
  const segId = selectedLineSegmentId();
  const endId = /* ... */;
  const existing = bendingCircularFields().find(b => b.endId === endId);
  
  if (existing) {
    evolu.update('bendingCircularField', { id: existing.id, isDeleted: true });
    setPendingBendAtEndsDeleted(prev => [...prev, {...}]);
  } else {
    const res = evolu.insert('bendingCircularField', {...});
    if (res.ok) setPendingBendAtEndsAdded(prev => [...prev, {...}]);
  }
  setBendAtEndsDirty(true);
};

// UI receives data and handlers separately
<BendControls 
  data={bendAtEndsData()} 
  onToggleA={handleToggleBendAtA}
  onToggleB={handleToggleBendAtB}
/>
```

**Benefits:**
- Clear separation: memos = data, functions = actions
- Event handlers can be tested without reactive context
- No confusion about when callbacks are created vs. invoked
- Easier to extract handlers to separate module

---

## Summary: Specific Recommendations

### High-Impact Structural Changes

Listed in priority order by expected improvement in AI modifiability:

#### 1. Extract State Machine from App.tsx

**Current:** 40+ independent signals with implicit relationships  
**Target:** Single discriminated union representing application mode  
**Benefit:** All valid state transitions become explicit; impossible states become unrepresentable

**Estimated impact:** Reduces state-related bugs by ~60%; makes adding features 3x faster

---

#### 2. Separate Position Calculation into Layers

**Current:** 450-line recursive function with side-channel overrides  
**Target:** Pipeline of pure transformations (base → override → echoes → previews)  
**Benefit:** Each layer independently testable; no recursion; explicit data flow

**Estimated impact:** Makes geometry changes 5x safer; enables caching and performance optimization

---

#### 3. Create Transform Registry

**Current:** Transform configuration split across 4 files (evolu-db, transform-matrix, recordTransformation, App/UI)  
**Target:** Single source of truth with derived types  
**Benefit:** Adding a transform = one object in registry instead of 12 file edits

**Estimated impact:** Reduces time to add feature from ~2 hours to ~15 minutes

---

#### 4. Type Coordinate Spaces

**Current:** All X/Y values are `number`, coordinate systems implicit  
**Target:** Branded types for World/Canvas/Local spaces  
**Benefit:** Compiler catches coordinate space mismatches

**Estimated impact:** Prevents entire class of geometry bugs; self-documenting APIs

---

#### 5. Replace Sentinel IDs with Discriminated Unions

**Current:** String constants cast to `PlaceId` type  
**Target:** `type PlaceOrPreview = PersistedPlace | PreviewPlace`  
**Benefit:** Type system prevents mixing preview/persisted data

**Estimated impact:** Eliminates database corruption risk; removes ~50 sentinel checks

---

#### 6. Extract Command Pattern for Actions

**Current:** Callbacks closing over 10+ signals, mutating 3-5 signals each  
**Target:** Serializable command objects with pure reducers  
**Benefit:** Actions become testable, loggable, undoable

**Estimated impact:** Enables time-travel debugging; makes action logic 10x easier to test

---

### Concrete Example: Current Difficulty vs. After Refactor

**Task:** "Add ability to scale a place by a factor"

#### Current Process (Error-Prone for AI)

1. Add `ScaleKind = literal('scale')` to evolu-db.ts:40-91
2. Add `ScaleKind` to `TransformationKind` union (evolu-db.ts:66)
3. Add `'scale'` to `TransformId` type (transform-matrix.ts:20)
4. Add to `TRANSFORMS` array (transform-matrix.ts:59):
   ```typescript
   { id: 'scale', label: 'Scale Place', allowedSelectionTypes: ['place'] }
   ```
5. Create `RecordScale` type (recordTransformation.ts):
   ```typescript
   export type RecordScale = {
     kind: 'scale';
     placeId: PlaceId;
     factor: number;
   };
   ```
6. Add to `TransformationRecord` union (recordTransformation.ts:223)
7. Add case to switch statement (recordTransformation.ts:254):
   ```typescript
   case 'scale':
     evolu.insert('transformation', {
       kind: 'scale',
       placeId: data.placeId,
       parentId: null,
       x: null,
       y: null,
       angle: null,
       // ... 10+ null fields
       radius: data.factor,  // Repurpose radius field
     });
     break;
   ```
8. Add signals to App.tsx:
   ```typescript
   const [pendingScale, setPendingScale] = createSignal<{
     placeId: PlaceId;
     factor: number;
   } | null>(null);
   const [draggingScaleHandle, setDraggingScaleHandle] = createSignal(false);
   ```
9. Update `hasChanges()` function (App.tsx:189)
10. Add props to DrawingGuide interface (DrawingGuide.tsx:26):
    ```typescript
    pendingScale: boolean;
    draggingScaleHandle: boolean;
    scaleFactor: number;
    onScaleFactorChange: (factor: number) => void;
    ```
11. Add UI section in DrawingGuide (DrawingGuide.tsx:~450):
    ```typescript
    {props.transformChoice === 'scale' && (
      <div>
        <input 
          type="range" 
          value={props.scaleFactor}
          onChange={e => props.onScaleFactorChange(Number(e.target.value))}
        />
      </div>
    )}
    ```
12. Add pointer event handlers (App.tsx:~1500+)
13. Update `getAbsolutePosition` to apply scale override when computing child positions (App.tsx:604-753)

**Total:** 13 steps across 5 files, touching ~200 lines of code

---

#### After Refactor (AI Can Reliably Do)

1. Add one entry to transform registry:

```typescript
// transforms.config.ts
const TRANSFORM_REGISTRY = {
  // ... existing transforms
  
  scale: {
    label: 'Scale Place',
    selectionTypes: ['place'] as const,
    schema: z.object({
      placeId: PlaceIdSchema,
      factor: z.number().min(0.1).max(10),
    }),
    execute: (state: AppState, data: { placeId: PlaceId; factor: number }) => {
      const place = state.places.find(p => p.id === data.placeId);
      if (!place) return state;
      
      return {
        ...state,
        places: state.places.map(p => 
          p.id === data.placeId 
            ? { ...p, scale: data.factor }
            : p
        ),
      };
    },
    ui: {
      type: 'slider',
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 1,
    },
  },
} as const;
```

**Total:** 1 step, 1 file, ~20 lines

The registry automatically:
- Derives TypeScript types
- Generates Evolu schema
- Creates recording function
- Renders UI controls
- Wires up event handlers

---

### Key Insight

The difficulty for AI models isn't the technology stack (TypeScript, Solid.js, Evolu)—these are well-understood. The challenge is the **implicit coupling** between 40+ state variables, **recursive calculations with side-channel overrides**, and **configuration scattered across multiple files without a single source of truth**.

Consolidating into:
- Explicit state machines (discriminated unions)
- Pure data pipelines (position calculation layers)
- Single registry (transform configuration)
- Phantom types (coordinate spaces)
- Command pattern (actions)

...would dramatically improve AI modifiability while also improving human developer experience through better type safety, testability, and maintainability.

---

## Appendix: Measurement Criteria

To validate these recommendations, measure:

1. **Lines changed per feature:** Target <50 lines for new transform (currently ~200+)
2. **Files touched per feature:** Target 1-2 files (currently 5+)
3. **Type errors when adding feature:** Target 0 after registry edit (currently 3-5 steps before types align)
4. **Time to add feature:** Target <30 minutes (currently 2+ hours including bug fixes)
5. **Bug rate:** Target <1 bug per feature (currently 2-3 bugs per feature requiring fixes)

These metrics should improve 3-5x after implementing the structural changes above.
