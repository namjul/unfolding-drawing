# Milestone 1

This milestone is the first real implementation milestone after Milestone 0.

Milestone 0 validates the stack and renderer.

Milestone 1 builds the first coherent application core.

## Aim

Implement the smallest usable persistent drawing system that matches the blueprint.

## Must already be true before starting

Milestone 0 should have established:

- Vite works for the project
- SolidJS works with the chosen shell
- CanvasKit initializes reliably
- a synthetic scene can be rendered
- basic pan, zoom, and hit testing are viable

If those are still uncertain, do not start Milestone 1 yet.

## Scope

Milestone 1 includes:

- persisted places
- place selection
- add place
- move place
- delete place
- commit or reject pending place changes
- local persistence
- minimal inspector controls needed for the above

## Stack for this milestone

- Vite
- SolidJS
- Evolu
- CanvasKit
- Tailwind CSS for minimal chrome

Optional only if clearly helpful:

- `valibot` for schema validation

Do not broaden the stack during this milestone unless a blocker appears.

## Required entities

- `Place`
- `Transformation`

Milestone 1 does **not** require:

- connections
- organizers
- repeater behavior
- Yoga
- collaboration

## Required runtime state

- `SelectionState`
- `PendingTransformationState`
- `ViewportState`

## Required user-visible behaviors

### 1. Observe

- user can see the canvas
- user can pan and zoom

### 2. Add place

- user can create a place on the canvas
- a new place becomes visible immediately

### 3. Select place

- user can select a place by pointer interaction
- the selection is visually legible

### 4. Move place

- user can drag a place
- the move is staged before commit

### 5. Delete place

- user can mark a place for deletion
- deletion remains staged before commit

### 6. Commit or reject

- user can commit a staged change
- user can reject a staged change
- committed state persists locally

### 7. History

- every committed place change records a transformation entry

## Explicit non-goals

Not part of Milestone 1:

- related places or hierarchy
- explicit connections
- circular fields
- axes
- bends
- repeaters
- rich inspector tree
- advanced labels
- text editing
- Yoga
- AI features
- Tauri packaging
- collaboration

## Minimal module expectation

Milestone 1 should still fit the blueprint module set:

- `drawing-state`
- `drawing-ops`
- `interaction-state`
- `canvas`
- `inspector`

Do not split further unless complexity forces it.

## Done criteria

Milestone 1 is done when:

- a place can be created, selected, moved, and deleted
- changes are staged before commit
- commit persists changes locally
- reject restores the pre-draft state
- transformation history records committed place operations
- the app remains coherent and understandable

## Failure signals

Milestone 1 should be considered off track if:

- persistence and transient draft state become mixed
- the location of mutations becomes hard to explain
- canvas code starts owning document persistence logic
- the stack expands beyond the current milestone without a concrete reason
- hierarchy or connection work begins before place editing is stable

## Contact tests

- If a new contributor cannot answer where place mutation happens, the milestone is too implicit.
- If commit/reject behavior cannot be described in one short paragraph, the draft model is too unclear.
- If place state cannot round-trip through persistence cleanly, the data model is not yet stable.

## Summary

Milestone 1 is:

- the first coherent persistent place editor
- not yet a full relational drawing system
- not yet a connection or organizer system

It exists to make the center of the system real before introducing higher-order structure.
