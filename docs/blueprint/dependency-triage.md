# Dependency Triage

This document filters candidate dependencies against the current blueprint.

It combines two package lists and sorts them by:

- phase of likely relevance
- fit with the blueprint
- risk of unnecessary complexity

## Rule

A dependency should be added only when it supports a current milestone or a current blueprint decision.

Do not add packages only because they may become useful later.

## Phase 0: renderer and stack spike

These are the strongest candidates for Milestone 0.

### Use now

- `canvaskit-wasm`
  - directly required by the CanvasKit renderer choice
- `tailwindcss`
  - useful for minimal inspector and app shell styling
- `@tailwindcss/vite`
  - fits the current Vite build-system choice

### Optional in Phase 0

- `valibot`
  - useful if you want early runtime validation for spike config or synthetic scene input

## Phase 1: first real implementation

These become relevant once the project moves beyond the renderer spike into the first coherent core.

### Strong candidates

- `culori`
  - useful if color becomes part of rendering, theming, palettes, or perceptual interpolation
- `fflate`
  - useful if file import/export or compressed snapshots appear early

### Maybe

- `nanoevents`
  - only if a very small event emitter is needed in a tightly scoped way
  - do not let this become a general event bus

### Layout engine

- `yoga-layout`

Use only if the document model gains:

- auto-layout frames
- container-driven arrangement rules
- flex/grid-like layout as a real feature

Yoga is not needed for the current blueprint core or Milestone 0.

### Desktop application packaging

- `@tauri-apps/api`
- `@tauri-apps/plugin-dialog`
- `@tauri-apps/plugin-fs`
- `@tauri-apps/plugin-opener`

Use only if the project intentionally becomes a Tauri desktop app.

### UI growth

- `tailwind-merge`
- `tailwind-variants`

Use only when the inspector and chrome become complex enough that Tailwind composition needs extra structure.

## Programming-model reference

- `dope`

Use [dope-evaluation.md](./dope-evaluation.md) for the current recommendation.

Current stance:

- do not add `dope` as a core dependency
- selective local vendoring may be appropriate later
- use its ideas more than its package boundary

## Contact tests

- If a package does not support the current milestone, do not add it.
- If a package introduces a new architectural pattern not present in the blueprint, do not add it by default.
- If a package duplicates an already-chosen stack decision, reject it unless the blueprint changes.
- If a package is justified only by possible future need, postpone it.
