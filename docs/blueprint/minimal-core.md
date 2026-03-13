# Minimal Core

This document defines the smallest system that can still support the intended feature surface.

It is written for a fresh implementation, not for the current repository layout.

## Aim

Preserve the essential behavior of the drawing system while keeping the domain as small and explicit as possible.

## Cross-cutting product requirements

- The system must provide continuous contextual guidance so the user can tell where they are and what they can do next.
- The exact UI form of that guidance is not fixed. It may live in inspector controls, canvas affordances, or a small dedicated guide surface.
- Transformation history is part of the first usable persistent editor. Replay or animation UI can wait, but committed intervention must be recorded from the start.

## Core domain concepts

### 1. Place

- A persistent focal point in the drawing
- Can be named, selected, moved, rotated, related, and used as an anchor for other structures

Why core:

- Without places, the system loses its primary centers

Contact test:

- If the system can still support persistent center creation, selection, and transformation without places, then `Place` is not core. It cannot.

### 2. Connection

- An explicit relation between places
- Can be created, deleted, split, named, and shaped

Why core:

- The system includes explicit relations, not only hierarchy

Contact test:

- If explicit lines can be removed without weakening the system’s relational structure, then `Connection` is not core. That would contradict the intended surface.

### 3. Organizer

- A structure that arranges places or connections without replacing them
- Variants:
  - axis
  - circular field
  - bend
  - repeater

Why core:

- These are the field structures that create higher-order organization

Contact test:

- If axis, circular, bend, and repeater behavior can all be removed without collapsing structured placement, then organizers are not core. They are.

### 4. Placement mode

- The rule that determines how a place is positioned
- Modes:
  - free placement
  - relative to a parent place
  - relative to an axis
  - relative to a circular field
  - relative to a repeater

Why core:

- The same place can participate in different organizational contexts

Contact test:

- If all placement can be reduced to absolute `x/y` without losing important behavior, placement mode is not core. It is.

### 5. Transformation

- A committed change to drawing state
- Examples:
  - add
  - move
  - rotate
  - delete
  - connect
  - split
  - add organizer
  - modify organizer

Why core:

- The system is not only stateful; it is built around legible intervention

Contact test:

- If the system can keep staged editing, commit/reject, and history without explicit transformations, then this concept is not core. It cannot.

### 6. Selection and focus

- The current target of action
- The current view focus over the drawing

Why core:

- Editing is target-based and spatial

Contact test:

- If users can perform the intended edits without explicit target or focus state, this is not core. They cannot.

### 7. Memory

- Persisted current drawing state
- Persisted record of committed changes

Why core:

- The system remembers structure and intervention, not only immediate gestures

Contact test:

- If the intended system still works with only ephemeral state, then memory is not core. It does not.

## Required data models

### Persisted models

#### Place

Minimum fields:

- `id`
- `name?`
- `x`
- `y`
- `angle?`
- `parentPlaceId?`
- `placementType`
- placement parameters for organizer-relative positioning

#### Connection

Minimum fields:

- `id`
- `name?`
- `placeAId`
- `placeBId`
- optional shape metadata if needed for splitting or bend attachment

#### Organizer

Minimum fields:

- `id`
- `type`
- owner reference
- type-specific parameters

Type-specific parameters include:

- axis angle and directionality
- circle radius
- bend parameters
- repeater count and pattern

#### Transformation

Minimum fields:

- `id`
- `kind`
- affected entities
- parameters needed to describe the committed change
- order or timestamp

### Transient runtime models

#### SelectionState

- current target
- current transformation choice

#### PendingTransformationState

- draft change before commit or reject

#### ViewportState

- scale
- translation
- interaction mode

## Essential workflows

### 1. Observe and navigate

- inspect the drawing
- zoom
- pan
- establish focus

### 2. Select a target

- select canvas, place, connection, or organizer
- derive which transformations are valid

### 3. Create or modify a center

- add place
- add related place
- move place
- rotate place
- delete place

### 4. Create or modify a relation

- add connection
- delete connection
- split connection

### 5. Apply an organizer

- add, modify, or delete an axis
- add, modify, or delete a circular field
- add, modify, or delete a bend
- add, modify, or delete a repeater
- place objects relative to those organizers

### 6. Preview, commit, or reject

- stage a transformation
- preview it
- commit or reject it
- persist the result if committed

### 7. Inspect structure and history

- inspect object structure
- inspect committed transformations

## What is not part of the minimal core

- a particular UI layout
- a fixed guide UI or wizard implementation
- a particular framework wrapper stack
- separate persistence models for every organizer variant
- specialized endpoint entities unless proven necessary

## V1 modeling note

The current blueprint intentionally collapses parts of the older glossary ontology into a flatter implementation model.

That means v1 does **not** require:

- every persisted entity to participate in one universal parent-object tree
- separate endpoint entities for connections
- scaffolding-only visibility semantics to be encoded in the base persisted model

Promote those concepts back into the implementation contract only if current evidence shows the flatter model is insufficient.

## Summary

The smallest viable system contains:

- places
- connections
- organizers
- transformations
- selection
- pending change state
- viewport state
- persistence

Everything else should justify itself through a current need, not future flexibility.
