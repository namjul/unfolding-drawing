# Milestone 0

This milestone is a renderer and stack validation spike.

Its purpose is to reduce uncertainty before building the first real application core.

It is intentionally not production architecture. It is a bounded technical experiment.

## Aim

Validate that the chosen stack can support the planned drawing surface.

Specifically:

- Vite
- SolidJS
- CanvasKit

## Questions this milestone must answer

1. Does CanvasKit initialize cleanly in the chosen build setup?
2. Is the local development loop acceptable?
3. Can the renderer handle the expected scene density well enough to justify the choice?
4. Is custom hit testing manageable?
5. Does the renderer model still fit the blueprint architecture?

## In scope

- Vite application shell
- SolidJS application shell
- CanvasKit initialization
- one canvas surface
- generated test scene data
- pan
- zoom
- basic hit testing
- simple selection and highlight
- rough performance observations

## Out of scope

- Evolu integration
- real persistence
- full domain schema
- inspector UI
- commit/reject workflow
- transformation history
- production-quality module boundaries
- final scene graph design

## Suggested test scene

The spike should be able to generate and render:

- 2,000 places
- 20,000 to 50,000 visible connections

It should also support:

- pan and zoom
- hover or click hit testing
- selection highlight
- representative labels on a subset of places

## Success criteria

Milestone 0 is successful if:

- CanvasKit loads reliably in the Vite setup
- the app remains usable under the target synthetic scene
- pan and zoom feel acceptable
- selection and hit testing are implementable without architectural confusion
- no major stack blocker appears

## Failure signals

Milestone 0 should be treated as failed or inconclusive if:

- CanvasKit setup is unstable or awkward in the chosen build setup
- the dev loop becomes unreasonably slow or fragile
- hit testing becomes much more complex than expected
- text or overlay handling reveals a major mismatch
- performance is poor even in a stripped-down synthetic scene

## Output of this milestone

By the end of Milestone 0, the project should have:

- a working renderer spike
- a short written conclusion
- a clear go/no-go decision for the stack

That conclusion should answer:

- continue with CanvasKit as planned
- revise the canvas model
- or reconsider the renderer choice

## Relation to the rebuild path

Milestone 0 comes before the first real implementation milestone.

It exists to validate the stack and renderer so that Milestone 1 can focus on:

- persisted places
- selection
- move/delete
- commit/reject
- local persistence

without simultaneously carrying renderer uncertainty.
