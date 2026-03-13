# Incremental Rebuild Path

This document defines a rebuild sequence starting from an empty repository.

Each step must produce a working, coherent system. No step should exist only to prepare for a later one.

## Aim

Build the smallest working core first, then extend it incrementally while preserving explicit state ownership and coherent interaction.

## Standard for every stage

Each stage must end with:

- a working app
- one clear interaction center
- one visible explanation of what the user can do next
- no unused abstraction
- one smallest next step that extends the current system rather than replacing it

## Guidance rule

The concrete guide UI can stay minimal at every stage.

What cannot be deferred is the guidance behavior:

- current selection or focus must be legible
- current draft state must be legible
- valid next actions must be visible without tool hunting

## Milestone 0: Renderer and stack spike

Outcome:

- validate the build system and renderer before building the first real core
- confirm that CanvasKit works acceptably with the chosen setup

Add:

- Vite application shell
- SolidJS application shell
- CanvasKit initialization
- generated synthetic scene
- pan and zoom
- basic hit testing
- simple selection and highlight

Do not add yet:

- Evolu integration
- real persistence
- full schema
- inspector
- commit/reject
- production architecture refinements

Why coherent:

- it reduces renderer uncertainty before the first real milestone
- it keeps stack validation inside the planned rebuild path rather than as an informal side experiment

Failure test:

- if CanvasKit setup, hit testing, or rendering performance is already weak in the spike, the project should not proceed as if the renderer decision were settled

## Stage 0: Runnable shell

Outcome:

- the app starts
- one canvas region renders
- one inspector region renders

Add:

- app entry
- minimal `drawing-state`
- minimal `interaction-state`
- minimal `drawing-ops`
- placeholder canvas and inspector

Do not add yet:

- persistence
- history
- organizer variants
- advanced geometry

Why coherent:

- it establishes the future shape of the system without inventing unused complexity

## Stage 1: Minimal working core

Outcome:

- add, select, move, and delete places
- stage changes
- commit or reject them
- persist place state locally
- record committed transformations and show minimal history

Add:

- `Place`
- `Transformation`
- local persistence
- `SelectionState`
- `PendingTransformationState`
- `addPlace`
- `movePlace`
- `deletePlace`
- `commit`
- `reject`
- history recording on commit
- minimal history list

Why coherent:

- this is the smallest system that already expresses persistent center formation and revision
- it remembers intervention from the first persistent milestone instead of treating history as optional later

Failure test:

- if users cannot create and revise persistent places, the system is still below viable core

## Stage 2: Hierarchy

Outcome:

- add related places
- show parent/child relationships
- inspect a simple place list or tree

Add:

- `parentPlaceId`
- `addRelatedPlace`
- relationship highlighting
- simple structure list

Why coherent:

- the system now supports structured growth, not just isolated marks

## Stage 3: Explicit relations

Outcome:

- connect places with lines
- select and delete connections

Add:

- `Connection`
- `addConnection`
- `deleteConnection`
- line rendering
- connection selection

Why coherent:

- the drawing becomes a graph rather than only a hierarchy

## Stage 4: Circular field

Outcome:

- add a circular field anchored at a place
- add places on the circular field
- modify and delete the field

Add:

- organizer variant: circular field
- placement mode: circular
- organizer operations for create, modify, delete
- place-on-field operation

Why coherent:

- this is the first true field behavior and introduces structured placement cleanly

## Stage 5: Axis

Outcome:

- add an axis anchored at a place
- add places on that axis
- change axis directionality
- delete the axis

Add:

- organizer variant: axis
- placement mode: axis
- axis operations

Why coherent:

- the system now supports both circular and linear organization

## Stage 6: Split connection

Outcome:

- split a connection by inserting a place

Add:

- `splitConnection`
- minimal shape metadata if needed

Why coherent:

- explicit relations become editable structure rather than fixed links

## Stage 7: Bend organizer

Outcome:

- bend a connection at one or both ends
- modify and delete bend behavior

Add:

- organizer variant: bend
- bend operations
- bend rendering

Why coherent:

- organizer behavior now applies to relations as well as place-owned structures

## Stage 8: Repeater

Outcome:

- create repeated axes around a place
- place repeated places on the repeater
- modify count and pattern

Add:

- organizer variant: repeater
- placement mode: repeater
- repeater operations
- alternating pattern support

Why coherent:

- repeater is the most complex organizer and should appear only after simpler organizers are stable

## Stage 9: Full inspector

Outcome:

- inspect places, connections, organizers, and history from one coherent inspector
- selection can start from inspector or canvas

Add:

- richer object tree
- richer history list
- bidirectional selection sync

Why coherent:

- the reflective side of the system catches up to the full drawing surface

## Stage 10: Interaction refinement

Outcome:

- wheel zoom
- pinch zoom
- temporary pan mode
- stronger hit testing
- clearer previews and transitions

Add:

- gesture refinement
- viewport polish
- selection and preview polish

Why coherent:

- these improve fluency without changing the ontology

## Module growth rule

Introduce modules only when current complexity forces them.

Start with:

- `drawing-state`
- `drawing-ops`
- `interaction-state`
- `canvas`
- `inspector`

Add local geometry helpers only when organizer and connection rendering need them.

Do not introduce:

- command frameworks
- event buses
- plugin systems
- generalized tool registries
- unused adapter layers

## Coherence rules

### 1. Keep one dominant interaction center per stage

- early stages: place editing
- middle stages: relation and organizer editing
- later stages: inspection and fluency

### 2. Close the loop at every stage

- user acts
- system stages or previews
- user commits or rejects
- result persists if committed
- result is visible

### 3. Avoid dead structure

- no model without visible use
- no abstraction without current pressure
- no stage that exists only as preparation

### 4. Preserve explicit data flow

- input -> interaction-state -> drawing-ops -> drawing-state -> rerender

## Short rebuild order

0. renderer and stack spike
1. runnable shell
2. persistent places with commit/reject
3. hierarchy
4. explicit relations
5. circular field
6. axis
7. split connection
8. bend organizer
9. repeater
10. full inspector
11. interaction refinement

That order keeps the system coherent while adding complexity only when the previous center is already stable.
