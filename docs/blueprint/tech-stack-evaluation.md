# Tech Stack Evaluation

This document evaluates the rendering stack for the new re-synthesis project.

It assumes the new project starts from the blueprint documents in this folder. It does not assume the earlier vibecoded codebase still exists.

## Question

Should the new project use:

- SVG
- CanvasKit
- CanvasKit plus Yoga

for the main drawing surface?

## Current design pressure

The blueprint assumes:

- a dedicated `canvas` module
- explicit hit testing
- explicit interaction state
- dense place/connection/organizer structures
- growth toward many visible relations

Those assumptions come from the intended system shape in:

- [minimal-core.md](./minimal-core.md)
- [minimal-architecture.md](./minimal-architecture.md)
- [incremental-rebuild-path.md](./incremental-rebuild-path.md)

The key technical risk is not "drawing one complex path." The risk is a scene with many visible relations, overlays, selections, previews, and repeated pan/zoom redraws.

## Reference project: OpenPencil

OpenPencil is a useful reference because it solves a closely related class of problem: a dense, scene-graph-driven editor with direct manipulation. OpenPencil documents:

- CanvasKit WASM as its rendering stack
- Yoga WASM as its auto-layout engine
- a flat scene graph with explicit hit testing and rectangle queries

That makes it a relevant reference for renderer choice, especially for relation-heavy scenes.

Useful references:

- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>
- OpenPencil architecture: <https://openpencil.dev/guide/architecture>
- OpenPencil scene graph: <https://openpencil.dev/reference/scene-graph>

Why the scene graph reference is relevant:

- it shows the kind of explicit node storage, reverse z-order hit testing, and rectangle selection logic that becomes necessary once the renderer is surface-based instead of DOM-per-shape
- it is directly relevant to the blueprint's assumption that `canvas` owns rendering and hit testing while `drawing-state` owns persistent scene data

## Option 1: SVG

### Strengths

- Simple to prototype
- Native browser DOM inspection
- Easy per-element event targeting
- Good for small to medium scenes
- Convenient label and text placement with browser text primitives

### Weaknesses

- Every visible object becomes a DOM/SVG node
- Large scenes increase DOM, style, paint, and compositing pressure
- Pan/zoom and selection overlays get more expensive as scene size grows
- Dense relation graphs are a particularly weak case because connections multiply visible elements rapidly

### Fit with the blueprint

SVG fits best if the scene stays small enough that DOM-backed rendering remains cheap.

It fits poorly if the system is expected to reach:

- thousands of visible places
- tens of thousands of visible connections
- frequent panning, zooming, marquee selection, and highlight overlays

### Recommendation for SVG

Use SVG only if the expected scene size remains modest and renderer simplicity is more important than scale headroom.

## Option 2: CanvasKit

### Strengths

- Skia running in WebAssembly
- Draws to a hardware-accelerated surface
- Better fit for dense vector scenes than DOM-per-shape rendering
- Good match for a scene-graph editor with explicit hit testing
- Better long-term fit for heavy overlays, many paths, and large redraw regions

### Costs

- Heavier startup and asset cost than SVG
- You must own hit testing
- You must own scene traversal and redraw strategy
- Shape-level browser DOM inspection is gone
- Text and editing overlays need more deliberate design

### Fit with the blueprint

CanvasKit fits the blueprint well because the blueprint already assumes:

- one dedicated canvas boundary
- explicit state ownership
- explicit hit testing
- explicit interaction-state-driven rendering

This means the architectural cost of moving away from DOM shapes is already accepted by the blueprint.

### Recommendation for CanvasKit

CanvasKit is the best default choice if dense relation rendering is a first-order concern.

## Option 3: CanvasKit plus Yoga

### What Yoga solves

Yoga is a layout engine, not a renderer.

It is useful when the domain includes:

- auto layout
- flex or grid-like child arrangement
- container-driven sizing and alignment semantics

### What Yoga does not solve

- path rendering
- line rendering
- connection density
- hit testing of arbitrary drawing geometry
- canvas performance problems

### Fit with the blueprint

The current blueprint core is:

- places
- connections
- organizers
- transformations
- selection
- memory

That does not require flexbox-style layout as a first-class capability.

### Recommendation for Yoga

Do not adopt Yoga in phase 1.

Add Yoga only if the document model grows to include:

- auto-layout frames
- container-driven arrangement rules
- flex/grid-like layout as a real domain feature

Until then, Yoga adds complexity without solving the main rendering problem.

## Recommended stack

### For the drawing surface

- Use CanvasKit

### For app chrome and inspector UI

- Use normal HTML/CSS UI

### For layout engines

- Do not add Yoga initially
- Revisit Yoga only when auto-layout semantics become part of the document model

## Why this is the recommendation

### 1. It matches the expected pressure

If the scene may grow into dense relation networks, renderer choice should optimize for scene scale early rather than waiting for SVG failure.

### 2. It matches the blueprint architecture

The blueprint already assumes explicit rendering, explicit state flow, and explicit hit testing. That makes CanvasKit a structural fit rather than a disruptive add-on.

### 3. It keeps the stack minimal

CanvasKit solves the rendering problem.

Yoga does not solve the rendering problem. It solves a layout problem that the current blueprint does not yet have.

## Recommended validation spike

Before locking the stack, build a renderer spike with:

- 2,000 places
- 20,000 to 50,000 visible connections
- pan and zoom
- marquee selection
- hover hit testing
- selected-node and selected-connection highlighting
- representative text labels on a subset of objects

Use the spike to answer:

- frame time during pan/zoom
- interaction latency during selection
- redraw cost under highlight and overlay changes
- text rendering quality
- implementation complexity of hit testing

## Decision rule

Choose SVG only if the spike or expected usage shows that:

- scenes remain modest
- DOM-based inspection materially improves development speed
- the project does not expect dense visible relation growth soon

Choose CanvasKit if:

- dense relation scenes are expected
- redraw-heavy interaction is central
- custom hit testing is acceptable

Choose Yoga only if:

- auto-layout becomes a real document feature

## Summary

For the new re-synthesis project:

- do not use SVG as the primary drawing renderer
- use CanvasKit for the drawing surface
- do not add Yoga yet
- keep Yoga as a later addition if layout semantics become first-class

This is the smallest stack that addresses the likely rendering bottleneck without importing a second engine for a problem the blueprint does not yet need.

## Source notes

- Skia CanvasKit documentation for renderer model and canvas surface behavior:
  - <https://docs.skia.org/docs/user/modules/canvaskit/>
  - <https://docs.skia.org/docs/user/modules/quickstart/>
- OpenPencil reference architecture:
  - <https://openpencil.dev/guide/tech-stack>
  - <https://openpencil.dev/guide/architecture>
  - <https://openpencil.dev/reference/scene-graph>
- Yoga scope and bindings:
  - <https://github.com/facebook/yoga>
  - <https://www.npmjs.com/package/yoga-layout>
