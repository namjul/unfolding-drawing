# Data Model

This document defines the initial persisted and transient data model for the new re-synthesis project.

It is a blueprint contract for implementation. It is not a promise that every field is final forever. It defines the minimum concrete shape needed to start building coherently.

## Aim

Provide a clear schema boundary for:

- persisted drawing state
- persisted transformation history
- transient interaction state

The goal is to prevent drift in `drawing-state` and `drawing-ops`.

## Design rules

- Persist only document state and committed history.
- Keep transient interaction state out of persistence.
- Use plain objects and arrays.
- Use stable IDs for all persisted entities.
- Prefer explicit ownership over inferred relationships.

## Persisted entities

### 1. Place

A persistent center in the drawing.

Required fields:

- `id: PlaceId`
- `name: string | null`
- `x: number`
- `y: number`
- `angle: number | null`
- `parentPlaceId: PlaceId | null`
- `placementMode: 'free' | 'relativeToParent' | 'onAxis' | 'onCircularField' | 'onRepeater'`

Optional placement fields:

- `axisPlacement: { organizerId: OrganizerId; distanceAlong: number; distanceFrom: number } | null`
- `circularPlacement: { organizerId: OrganizerId; angle: number } | null`
- `repeaterPlacement: { organizerId: OrganizerId; axisIndex: number; distanceAlong: number; distanceFrom: number; patternGroupId: string | null } | null`

Invariants:

- `id` is globally unique within the document.
- `parentPlaceId` must be `null` or refer to another existing place.
- Only one placement payload may be active at a time, and it must match `placementMode`.
- `x` and `y` always exist even when placement is organizer-relative; they represent resolved world coordinates.

Why resolved coordinates are stored:

- the canvas and hit testing need direct world-space positions
- organizer-relative placement still needs a fast render-time position

### 2. Connection

An explicit relation between two places.

Required fields:

- `id: ConnectionId`
- `name: string | null`
- `placeAId: PlaceId`
- `placeBId: PlaceId`

Optional shape fields:

- `shape: { kind: 'straight' } | { kind: 'bent'; bendAOrganizerId: OrganizerId | null; bendBOrganizerId: OrganizerId | null }`

Invariants:

- both place references must exist
- a connection cannot reference the same place at both ends unless self-connections are explicitly allowed later
- bend references, if present, must refer to organizers of type `bend`

### 3. Organizer

A structure that arranges places or connections without replacing them.

Required fields:

- `id: OrganizerId`
- `type: 'axis' | 'circularField' | 'bend' | 'repeater'`
- `owner: { kind: 'place'; placeId: PlaceId } | { kind: 'connection'; connectionId: ConnectionId; end: 'A' | 'B' | 'both' }`

Type-specific payloads:

- axis:
  - `{ angle: number; bidirectional: boolean }`
- circular field:
  - `{ radius: number }`
- bend:
  - `{ radius: number; offsetX: number; offsetY: number }`
- repeater:
  - `{ count: number; pattern: { show: number; skip: number; start: number } | null }`

Invariants:

- owner must exist
- payload must match `type`
- `bend` organizers must be owned by connections
- `axis`, `circularField`, and `repeater` organizers must be owned by places
- repeater `count` must be a positive integer

### 4. Transformation

A committed change to document state.

Required fields:

- `id: TransformationId`
- `kind: TransformationKind`
- `timestamp: number`
- `sequence: number`
- `payload: object`

Minimum `kind` set for initial implementation:

- `addPlace`
- `movePlace`
- `deletePlace`
- `addRelatedPlace`
- `addConnection`
- `deleteConnection`
- `splitConnection`
- `addOrganizer`
- `modifyOrganizer`
- `deleteOrganizer`

Invariants:

- transformations are append-only records
- `sequence` is monotonic within a document
- payload must contain enough information to describe the committed action

## IDs

The implementation may choose any concrete ID format, but the contract requires:

- `PlaceId`
- `ConnectionId`
- `OrganizerId`
- `TransformationId`

Requirements:

- stable once created
- unique within the document
- serializable as strings

Recommended:

- opaque string IDs

Avoid:

- array index identity
- renderer-local IDs
- position-derived IDs

## Persisted document shape

The minimum persisted document can be represented as:

```ts
type DocumentState = {
  places: Place[]
  connections: Connection[]
  organizers: Organizer[]
  transformations: Transformation[]
}
```

This is a logical contract, not a mandated storage format.

## Transient runtime state

These do **not** belong in persistence.

### SelectionState

- selected target
- current transform choice

### PendingTransformationState

- draft mutation before commit or reject

### ViewportState

- scale
- translation
- interaction mode

### Pointer and gesture state

- hover target
- drag state
- pinch state
- marquee selection state

## Ownership rules

- Places may own axes, circular fields, and repeaters.
- Connections may own bends.
- Places may reference parent places.
- Connections may reference places.
- Transformations may reference any persisted entity needed to describe a committed change.

Ownership should always be explicit. Do not infer organizer ownership indirectly from geometry.

## Non-goals for this model

Not included yet:

- collaborative CRDT state
- text editing objects
- auto-layout frames
- style systems beyond simple labels and visual properties
- import/export metadata

Those can be added later only when a real feature requires them.

## Contact tests

- If two independent implementations would create incompatible persisted shapes from this doc, the model is too vague.
- If organizer ownership still has to be guessed at runtime, the model is too vague.
- If transient editing state starts leaking into persistence, the model is too broad.

## Summary

Persist:

- places
- connections
- organizers
- transformations

Do not persist:

- selection
- drafts
- viewport
- pointer state

That is the minimum concrete schema boundary for the new implementation.
