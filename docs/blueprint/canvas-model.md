# Canvas Model

This document defines the initial canvas/runtime model for the new re-synthesis project.

It is a blueprint contract for the rendering and interaction boundary. It is not a low-level renderer implementation spec.

## Aim

Make the CanvasKit layer explicit enough that implementation does not invent:

- scene structure
- coordinate rules
- hit-test rules
- selection order
- redraw ownership

on the fly.

## Core idea

The canvas is a surface renderer over explicit scene data.

That means:

- the app owns scene data
- the app owns hit testing
- the app owns traversal
- the app owns redraw policy

The browser does not own shape identity.

## Coordinate spaces

The runtime should distinguish three coordinate spaces.

### 1. World space

Used for persisted document geometry.

Includes:

- place positions
- connection geometry
- organizer geometry

This is the canonical spatial model for the document.

### 2. Viewport space

World space after pan and zoom are applied.

Used for:

- rendering transforms
- view-dependent visibility

### 3. Screen space

Pointer and DOM event coordinates.

Used for:

- pointer events
- DOM overlays
- text/input overlays if needed later

## View transform

The initial viewport model should be:

```ts
type ViewportState = {
  scale: number
  translateX: number
  translateY: number
}
```

Rules:

- pointer coordinates are converted from screen space to world space before hit testing
- rendering occurs in viewport space derived from world space plus the current viewport transform
- world coordinates remain independent of current zoom level

## Scene model

The renderer should consume an explicit scene list derived from persisted document state.

Minimum logical scene item kinds:

- place
- connection
- organizer
- overlay

Recommended logical shape:

```ts
type SceneItem =
  | { kind: 'place'; id: PlaceId; bounds: Rect; z: number }
  | { kind: 'connection'; id: ConnectionId; bounds: Rect; z: number }
  | { kind: 'organizer'; id: OrganizerId; bounds: Rect; z: number }
  | { kind: 'overlay'; id: string; bounds: Rect; z: number }
```

This does not have to be stored persistently. It is a runtime render model.

## Scene derivation

The runtime should derive scene items from:

- persisted document state
- transient interaction state

Examples:

- selected place highlight
- hover highlight
- pending transform preview
- marquee rectangle

Derived scene data must not become a hidden second source of truth.

## Future scene index

The project may eventually need a dedicated runtime scene index.

That would be justified for:

- hit testing
- rectangle selection
- visibility queries
- z-order traversal
- shared render and interaction queries

If introduced, it should be:

- derived from persisted document state
- read-only from the perspective of the renderer and interaction layer
- separate from mutation ownership

That means it should support queries like:

```ts
interface SceneIndex {
  getItem(id: string): SceneItem | null
  getVisibleItems(viewport: ViewportState): SceneItem[]
  hitTest(point: Vector): HitTarget | null
  getItemsInRect(rect: Rect): HitTarget[]
}
```

What it should **not** become:

- the place where document mutations happen
- a generalized object system with hidden write behavior
- a replacement for `drawing-ops`

Why this matters:

- some editor architectures, including OpenPencil, use a broader scene-graph interface that mixes structure, mutation, and queries
- this blueprint intentionally keeps those concerns separate
- if a scene index appears later, it should remain a runtime query layer rather than a second mutable document model

Contact test:

- introduce a scene index only when hit testing, rectangle queries, or traversal logic are being duplicated or becoming hard to explain

## Hit-test contract

Hit testing should operate on world-space pointer coordinates.

Minimum hit-test results:

```ts
type HitTarget =
  | { kind: 'place'; id: PlaceId }
  | { kind: 'connection'; id: ConnectionId }
  | { kind: 'organizer'; id: OrganizerId }
  | { kind: 'canvas' }
```

Rules:

- hit testing is explicit and app-owned
- hit testing uses scene order and selection priority, not DOM event targeting
- the hit-test result is what drives selection state

## Selection priority

Initial selection priority should be explicit.

Recommended order:

1. place
2. organizer handle or organizer
3. connection
4. canvas

Reason:

- places are the primary centers
- organizer interactions are often more precise than broad connection selection
- canvas remains the fallback target

This can be revised later if interaction evidence suggests a different order.

## Redraw model

Initial redraw model should be simple:

- full-surface redraw on state change

Why:

- simpler to reason about during Milestone 0 and Milestone 1
- avoids premature caching complexity

Later optimization may introduce:

- visibility culling
- dirty-region redraw
- cached layers

But only after real measurement pressure appears.

## Render passes

The initial renderer should think in passes, even if implemented in one draw function.

Recommended pass order:

1. base organizers
2. base connections
3. places
4. labels
5. selection and hover overlays
6. pending transformation previews
7. marquee or transient interaction overlays

This keeps z-order explicit.

## Interaction ownership

The canvas owns:

- pointer-to-world conversion
- hit testing
- drag handling
- hover tracking
- viewport gestures
- rendering of transient previews

The inspector owns:

- forms
- history list
- selection controls
- transform choice controls

This boundary should remain explicit.

## Text and overlays

Text labels rendered on the canvas are part of the scene.

Interactive text editing overlays, if needed later, should be treated as a separate screen-space overlay system rather than as ordinary canvas scene items.

Do not design full text editing into the initial canvas contract.

## Milestone 0 scope for this model

Milestone 0 needs only:

- world coordinates
- viewport transform
- scene derivation for generated places and connections
- hit testing for places and connections
- full redraw on state change

It does not need:

- final scene graph architecture
- final caching strategy
- final text-editing overlay model

## Contact tests

- If two implementers would choose different coordinate spaces or hit-test ownership from this doc, the model is too vague.
- If selection priority remains implicit in renderer code, the model is too vague.
- If redraw logic requires premature optimization before Milestone 1, the model is too specific.

## Summary

The canvas model is:

- world-space document geometry
- viewport transform for pan/zoom
- explicit derived scene items
- explicit app-owned hit testing
- explicit selection priority
- simple full redraw first

That is the minimum runtime contract needed for CanvasKit-based implementation.
