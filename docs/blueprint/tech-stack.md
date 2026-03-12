# Tech Stack

This document records the current stack choice for the new re-synthesis project.

It is the short decision document. For the longer renderer comparison and rationale, see [tech-stack-evaluation.md](./tech-stack-evaluation.md).

## Current choices

### Application framework

- SolidJS

Why:

- small reactive model
- direct state ownership fits the blueprint architecture
- good fit for explicit canvas plus inspector composition

### Build system

- Vite

Decision:

- Use Vite as the build system.

Why:

- good fit for a client-heavy Solid application
- lower configuration overhead than heavier alternatives
- good fit for CanvasKit and WASM asset loading
- keeps the build layer simpler while the renderer and interaction model carry the main complexity

References:

- Vite guide: <https://vite.dev/guide/>
- Rsbuild getting started: <https://rsbuild.rs/guide/start/>
- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>

### Persistence

- Evolu

Decision:

- Use Evolu for persistence and local-first drawing state.

Why:

- the blueprint requires persisted drawing state and transformation memory
- Evolu matches the local-first direction already chosen for the project
- it keeps persistence as part of the application model rather than a remote-first service dependency

What this means:

- drawing state is persisted through Evolu
- transformation history is persisted through Evolu
- persistence remains part of `drawing-state`, not a separate application layer

### Main drawing renderer

- CanvasKit

Decision:

- Use CanvasKit as the primary renderer for the drawing surface.

Why:

- better fit than SVG for dense relation-heavy scenes
- better long-term headroom for many visible connections, overlays, and redraws
- matches the blueprint assumption that hit testing and canvas interaction are explicit application responsibilities

What this means:

- the drawing surface is not DOM-per-shape
- hit testing is implemented in the app
- scene traversal and redraw strategy are implemented in the app
- canvas rendering is a first-class subsystem, not a thin view layer

References:

- Skia CanvasKit overview: <https://docs.skia.org/docs/user/modules/canvaskit/>
- Skia CanvasKit quickstart: <https://docs.skia.org/docs/user/modules/quickstart/>
- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>
- OpenPencil architecture: <https://openpencil.dev/guide/architecture>
- OpenPencil scene graph: <https://openpencil.dev/reference/scene-graph>

Why the OpenPencil scene graph reference matters:

- it shows the kind of renderer boundary that tends to emerge once the canvas is no longer DOM-per-shape
- it makes hit testing, z-order traversal, and rectangle selection explicit
- it is a useful reference for the `canvas` and `drawing-state` split in the blueprint, even though the new project does not need to copy OpenPencil's full model

### UI behavior layer

- ZagJS

Decision:

- Use ZagJS for structured UI behavior where state machines materially improve clarity.

Why:

- it keeps complex UI behavior explicit
- it is a good fit for inspector controls, menus, popovers, and multi-step UI interactions
- it separates interaction logic from presentational components

Constraint:

- do not introduce ZagJS where plain Solid state is clearer
- use it for real UI behavior complexity, not by default for every interaction

### Inspector and application UI

- HTML/CSS UI
- Solid components
- Ark UI components where appropriate
- Tailwind CSS for styling

Why:

- keeps forms, controls, text inputs, and inspector panels simple
- avoids forcing all interface concerns into the canvas renderer
- preserves the already-chosen UI stack for application chrome and inspector surfaces

### Layout engine

- No Yoga in phase 1

Decision:

- Do not include Yoga in the initial stack.

Why:

- Yoga solves layout, not drawing
- the current blueprint does not require auto-layout as a first-class document feature
- adding Yoga now would add complexity without addressing the main rendering pressure

Add Yoga later only if the document model grows to include:

- auto-layout frames
- container-driven arrangement rules
- flex/grid-like layout semantics as a real domain feature

References:

- Yoga project: <https://github.com/facebook/yoga>
- Yoga package: <https://www.npmjs.com/package/yoga-layout>
- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>
- OpenPencil scene graph layout section: <https://openpencil.dev/reference/scene-graph>

## Layering

- persistence -> Evolu
- behavior -> ZagJS where UI state machines are justified
- view -> SolidJS
- drawing surface -> CanvasKit
- styling -> Tailwind CSS plus Ark UI

### Blueprint alignment

- `drawing-state` persists through Evolu
- `drawing-ops` own concrete domain mutations
- `interaction-state` owns transient editing and viewport state
- `canvas` owns CanvasKit rendering and hit testing
- `inspector` uses Solid components and chosen UI tooling over the same state

## Rules

- Do not use SVG as the primary renderer.
- Use Evolu for persisted drawing state.
- Use SolidJS for application structure.
- Do not add Yoga until layout semantics become a real feature.
- Keep the canvas renderer separate from the inspector UI.
- Keep rendering, hit testing, and interaction ownership explicit.
- Prefer plain data and plain functions over framework-heavy indirection.
- Use ZagJS when UI behavior complexity warrants it, not as blanket ceremony.

## Decision summary

The current stack direction is:

- Vite for the build system
- SolidJS for application structure
- Evolu for persistence
- CanvasKit for the drawing surface
- ZagJS for complex UI behavior where needed
- Tailwind CSS plus Ark UI for inspector and chrome
- no Yoga initially

## Related documents

- [start-here.md](./start-here.md)
- [minimal-architecture.md](./minimal-architecture.md)
- [incremental-rebuild-path.md](./incremental-rebuild-path.md)
- [build-system.md](./build-system.md)
- [tech-stack-evaluation.md](./tech-stack-evaluation.md)
- [dope-evaluation.md](./dope-evaluation.md)
- [data-oriented-programming.md](./data-oriented-programming.md)

Use [dope-evaluation.md](./dope-evaluation.md) for the current stance on data-oriented programming helpers and why `dope` is treated as a style reference or selective vendored utility source rather than a core dependency.

Use [data-oriented-programming.md](./data-oriented-programming.md) for the broader decision to treat plain data and plain functions as the default frame for document and scene code.

## External references

- Skia CanvasKit overview: <https://docs.skia.org/docs/user/modules/canvaskit/>
- Skia CanvasKit quickstart: <https://docs.skia.org/docs/user/modules/quickstart/>
- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>
- OpenPencil architecture: <https://openpencil.dev/guide/architecture>
- OpenPencil scene graph: <https://openpencil.dev/reference/scene-graph>
- Yoga project: <https://github.com/facebook/yoga>
- Yoga package: <https://www.npmjs.com/package/yoga-layout>

## LLM documentation links

- Evolu:
  - <https://www.evolu.dev/llms.txt>
  - <https://www.evolu.dev/llms-full.txt>
- SolidJS:
  - <https://docs.solidjs.com/llms.txt>
  - <https://docs.solidjs.com/llms-full.txt>
- ZagJS:
  - <https://zagjs.com/llms.txt>
  - <https://zagjs.com/llms-full.txt>
- Ark UI:
  - <https://ark-ui.com/docs/ai/llms.txt>
