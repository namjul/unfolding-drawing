# Build System Evaluation

This document evaluates the build-system choice for the new re-synthesis project.

It is written from the blueprint perspective: an empty repository, a CanvasKit-based drawing surface, explicit state ownership, and a relatively small number of top-level architectural modules.

## Question

Which build system should the new project use?

Primary options considered:

- Vite
- Rsbuild

## Current project pressures

The blueprint assumes:

- a client-heavy application
- a dedicated canvas renderer
- explicit interaction and drawing state
- CanvasKit as the main drawing surface
- normal HTML/CSS inspector and application chrome

That means the build system mainly needs to do these things well:

- fast local iteration
- clean Solid integration
- reliable WASM asset handling
- low configuration overhead

## Recommendation

- Use **Vite** as the build system.

## Why Vite is the default choice

### 1. It fits the project shape

This is a frontend-heavy editor, not a server-rendered application.

The blueprint needs:

- a browser-first development loop
- fast HMR
- low-friction TypeScript and CSS handling
- a simple path to running a CanvasKit-based client application

Vite is a strong default for that shape.

### 2. It fits SolidJS well

Solid is commonly used with Vite, and the pairing is a standard path with low setup complexity.

That matters here because the project already has enough architectural complexity in:

- CanvasKit rendering
- scene traversal
- hit testing
- explicit interaction state

The build system should stay simple.

### 3. It is a good fit for CanvasKit

CanvasKit brings:

- JavaScript bootstrap code
- WASM asset loading
- asynchronous initialization

Vite is a good fit for modern ESM frontend applications with WASM assets. That lowers the chance that the build system itself becomes a source of avoidable complexity.

### 4. It aligns with the reference project

OpenPencil uses Vite in a CanvasKit and Yoga based editor stack.

That does not prove Vite is correct for this project, but it is good evidence that Vite is a viable build-system choice for this class of application.

## Why not Rsbuild by default

Rsbuild is a serious option and may be worth revisiting later.

But for this project, the deciding factor should be coherence, not benchmark ambition.

Reasons not to choose Rsbuild as the default right now:

- it is less standard than Vite for the current Solid-first blueprint
- the project already has enough non-trivial complexity in the renderer and interaction model
- adding a less familiar build layer increases cognitive load without yet solving a measured problem

## When to revisit Rsbuild

Revisit Rsbuild only if there is real evidence that Vite is not sufficient.

Examples:

- startup time becomes a recurring development bottleneck
- HMR becomes unstable under real project size
- production bundling becomes a measurable pain point
- CanvasKit and other heavy client assets expose limitations that matter in practice

Until then, switching build systems would be speculative.

## Practical decision

For the new project:

- choose Vite now
- do not choose Rsbuild now
- reconsider only after measured build or dev-performance pressure appears

## Contact test

Validate this choice with a small project spike that includes:

- Solid application shell
- CanvasKit initialization
- one canvas surface
- one inspector pane
- hot reload during canvas work
- production build output check

If Vite struggles with:

- CanvasKit WASM loading
- HMR stability
- development ergonomics
- production bundling

then revisit the build-system choice.

## Summary

The current recommendation is:

- **Vite** for the build system

Because it is the simpler and more coherent default for:

- SolidJS
- CanvasKit
- a client-side editor architecture
- an explicitly minimal blueprint

## External references

- Vite guide: <https://vite.dev/guide/>
- Rsbuild getting started: <https://rsbuild.rs/guide/start/>
- OpenPencil tech stack: <https://openpencil.dev/guide/tech-stack>
