# Minimal Architecture

This document proposes the simplest architecture that can support the minimal core.

It is written for a fresh implementation. It does not assume the module boundaries of any earlier codebase.

## Aim

Keep the system small enough for humans and AI models to understand quickly while preserving explicit state ownership and explicit mutation flow.

## Design rule

A module exists only if removing it would make state, behavior, or rendering materially harder to follow.

## Minimal module set

### 1. `drawing-state`

Purpose:

- own persisted drawing data

Contains:

- places
- connections
- organizers
- transformation history

Responsibilities:

- load and save drawing state
- expose direct reads and direct writes on concrete data

Must not contain:

- UI logic
- geometry logic
- interaction gesture handling

### 2. `drawing-ops`

Purpose:

- own concrete domain mutations

Examples:

- `addPlace`
- `movePlace`
- `rotatePlace`
- `deletePlace`
- `addConnection`
- `splitConnection`
- `addOrganizer`
- `modifyOrganizer`
- `deleteOrganizer`

Responsibilities:

- validate inputs
- mutate `drawing-state`
- append transformation history on commit

Must not contain:

- speculative command frameworks
- plugin registries
- generalized operation dispatch beyond current needs

### 3. `interaction-state`

Purpose:

- own transient UI state

Contains:

- current selection
- current transform choice
- pending draft change
- viewport state
- interaction mode flags

Responsibilities:

- track what the user is doing right now
- keep draft state separate from persisted drawing state

### 4. `canvas`

Purpose:

- render the drawing and collect direct interaction

Responsibilities:

- render persisted state
- render pending previews
- perform hit testing
- surface direct contextual affordances such as selection highlights and transformation handles when needed
- translate pointer and keyboard input into updates to `interaction-state` and calls to `drawing-ops`

Notes:

- local geometry helpers can live next to the canvas
- do not introduce a separate rendering engine unless direct complexity forces it

### 5. `inspector`

Purpose:

- provide the non-canvas view of the same system

Contains:

- object tree
- history list
- controls

Responsibilities:

- display structure
- display history
- show the current action context and valid next steps
- expose selection, commit, reject, zoom, reset, and transform controls

## Explicit data flow

### Read flow

1. `drawing-state` exposes current persisted drawing.
2. `interaction-state` exposes current transient state.
3. `canvas` reads both.
4. `inspector` reads both.
5. UI is always a projection of these two sources.

### Write flow

1. A user action starts in `canvas` or `inspector`.
2. The action updates `interaction-state` first.
3. If the user commits:
   - one concrete function in `drawing-ops` is called
   - `drawing-ops` mutates `drawing-state`
   - `drawing-ops` records a transformation
   - `interaction-state` clears the draft
4. If the user rejects:
   - `interaction-state` clears the draft
   - `drawing-state` remains unchanged

### Rendering flow

- `drawing-state` + `interaction-state` -> `canvas`
- `drawing-state` + `interaction-state` -> `inspector`

## Guidance contract

The user must always be able to answer two questions from the current UI state:

- what is currently selected or being transformed
- what actions are valid next

This is a required behavior contract, not a requirement to build a separate guide framework.

Keep the implementation minimal:

- let `canvas` provide spatial affordances
- let `inspector` or controls provide explicit next-step guidance
- avoid adding a dedicated guide subsystem unless the simpler arrangement becomes unclear

## Minimal abstraction policy

Deliberately do not introduce:

- repository/service splits
- event buses
- command frameworks
- plugin architectures
- polymorphic tool systems
- entity-component systems
- separate domain-type and UI-type hierarchies unless current complexity forces them

Prefer:

- plain data
- plain functions
- direct imports
- concrete operation names

See also:

- [dope-evaluation.md](./dope-evaluation.md) for the current stance on data-oriented helper libraries and selective vendoring
- [data-oriented-programming.md](./data-oriented-programming.md) for the broader project stance on plain data, plain functions, and where that frame should stop

## Suggested file shape

```text
src/
  app.tsx

  drawing/
    state.ts
    ops.ts
    types.ts

  interaction/
    state.ts

  canvas/
    Canvas.tsx
    geometry.ts
    hitTest.ts

  inspector/
    Inspector.tsx
    ObjectTree.tsx
    HistoryList.tsx
    Controls.tsx
```

This is a starting point, not a law. Modules should split only when actual complexity forces it.

## Contact tests

- If two modules only call each other and cannot be explained separately, merge them.
- If a mutation requires touching multiple modules with no clear owner, the data flow is too implicit.
- If an abstraction is justified only by future flexibility, remove it.
- If a new contributor cannot answer "where does this mutation happen?" in one hop, the architecture is too complex.

## Summary

The minimal architecture is:

- one persisted state module
- one domain-operations module
- one transient interaction-state module
- one canvas module
- one inspector module

With one-way flow:

- input -> interaction-state -> drawing-ops on commit -> drawing-state -> rerender
