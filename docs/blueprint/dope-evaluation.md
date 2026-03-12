# Dope Evaluation

This document evaluates whether the new re-synthesis project should adopt `dope` as a project dependency or programming model reference.

Reference:

- <https://github.com/gordonbrander/dope>

## Short answer

- Use `dope` as a conceptual reference.
- Do not adopt `dope` as a foundational project dependency right now.
- A selective "copy it in and own it" use is more plausible than a package dependency.

## What `dope` is

`dope` is a small utility library for data-oriented programming. Its README describes it as utilities for:

- immutable data helpers
- deep getters and setters
- data schema validation
- optional/nullish helpers
- generator helpers
- functional polymorphism
- function composition

The project frames data-oriented programming around:

1. separating code from data
2. using generic data structures like arrays and plain objects
3. preferring immutability
4. separating schema from representation

## Why it is relevant

Those ideas line up well with the blueprint.

The blueprint already prefers:

- plain data
- plain functions
- explicit `drawing-state`
- explicit `drawing-ops`
- minimal abstraction
- no unnecessary class hierarchies

So `dope` is relevant because it reinforces the right programming style for this project.

## Where it fits well

### 1. Plain data orientation

The project should model:

- places
- connections
- organizers
- transformations

as plain data structures rather than class-heavy object systems.

This is strongly aligned with `dope`.

### 2. Function-first mutation model

The blueprint already says mutations should live in explicit domain operations.

That is compatible with `dope`'s preference for pure functions operating on generic data.

### 3. Scene graph thinking

OpenPencil's scene graph is relevant here: it uses explicit node data, explicit hit testing, and explicit traversal rather than DOM-owned object behavior.

That style is compatible with data-oriented thinking.

So `dope` is a good conceptual fit for:

- scene data as plain objects
- renderer logic as pure-ish transforms over that data
- explicit hit testing and traversal

## Where it does not fit strongly enough

### 1. It does not solve the project's hardest problems

The hard problems in this project are:

- CanvasKit rendering
- scene traversal
- hit testing
- redraw strategy
- persistence boundaries
- transformation semantics

`dope` does not provide solutions for those.

It is not:

- a scene graph library
- a renderer integration
- a persistence model
- a geometry system
- a CanvasKit helper layer

So adopting it does not meaningfully reduce the major technical risks.

### 2. Some utilities are too small to justify a new dependency

A number of `dope`'s utilities are very lightweight:

- `freeze`
- `compose`
- `maybe`
- deep `get` / `put`
- `singledispatch`

For this project, many of those are small enough that either:

- they are not needed
- they can be written locally if a real use appears

That makes the dependency cost harder to justify.

### 3. `singledispatch` is a risk in this architecture

The blueprint tries to keep mutation ownership obvious.

If `singledispatch` becomes a general way to route behavior by data shape or type, the code can become harder to trace:

- where does this mutation happen?
- which method is being called?
- what actually owns the operation?

That cuts against the blueprint's preference for direct, concrete operation functions.

### 4. `freeze` and deep immutability should not be assumed free

The project expects dense scenes and frequent interaction updates.

Aggressive freezing or deep immutable update patterns may become expensive in the hot path unless carefully scoped.

That does not make immutability wrong, but it means the project should be cautious about importing a utility set whose identity leans heavily on frozen immutable structures before measuring the cost.

## Best use of `dope` for this project

The best use is:

- adopt the principles
- do not adopt the library yet

There are two importantly different ways to use `dope`:

### 1. `dope` as a package dependency

This is **not** the current recommendation.

Why:

- it adds a project dependency without solving the main technical risks
- it risks introducing architectural indirection around small utilities
- several of its helpers are small enough to write locally when needed

### 2. `dope` in the shadcn-style sense

This means:

- copy only the pieces you need into the project
- keep them in local source
- adapt them freely
- delete or rewrite them when the project changes

This is much more plausible for the blueprint.

Why:

- it preserves the useful ideas without creating dependency gravity
- it keeps ownership local
- it avoids handing architectural control to a utility library
- it matches the blueprint's preference for plain data and plain functions

That means:

- use plain objects and arrays for scene data
- keep domain behavior in plain functions
- separate schema from representation
- avoid class-heavy designs
- avoid hidden mutation

Without committing to:

- `dope` as a core dependency
- `singledispatch` as an architectural pattern
- deep freeze as default runtime behavior

If `dope` is used in the shadcn-style ownership model, then the recommended usage is:

- copy only the smallest helpers that solve a current problem
- keep them local and boring
- do not copy the whole library into the project
- do not let the copied helpers become a hidden framework

## Recommendation

### Current recommendation

- Do not add `dope` to Milestone 0.
- Do not make `dope` part of the core stack.
- Treat `dope` as a style reference, not a required library.
- If useful, selectively vendor tiny helpers later instead of adding the dependency.

### Possible later use

Reconsider `dope` only if one of its utilities solves a specific, current problem better than a tiny local helper.

Examples:

- a real need for structural-sharing deep updates in local transient state
- a real need for a very small runtime contract helper
- a very narrow functional-dispatch use case that remains easier to understand than direct functions

Even then:

- adopt only the minimum needed
- do not let `dope` redefine the architecture

### Vendored-use recommendation

If the project adopts `dope` in the "copy it in and own it" sense, use it only for:

- tiny contract helpers
- tiny maybe/nullish helpers
- tiny immutable update helpers where they clearly simplify local code

Avoid vendoring by default:

- `singledispatch`
- deep freeze in hot paths
- broad generic deep-update machinery unless it clearly earns its place

## Contact tests

- If `dope` does not make `drawing-state` or `drawing-ops` simpler, do not add it.
- If `dope` introduces indirection around where mutations happen, do not add it.
- If `dope` is justified only by philosophical agreement rather than a current implementation need, do not add it.
- If a local helper is clearer than the library utility, prefer the local helper.
- If a vendored helper grows into an implicit framework, stop and simplify.

## Summary

`dope` is aligned with the blueprint as a programming style:

- plain data
- plain functions
- explicit operations
- minimal object ceremony

But it is not strong enough as a library fit to justify adoption at the core of the project.

For this project:

- use the ideas
- do not add the dependency by default
- prefer selective local vendoring over package adoption if a utility proves useful
- revisit only when a specific utility earns its place

## External references

- Dope repository: <https://github.com/gordonbrander/dope>
- OpenPencil scene graph: <https://openpencil.dev/reference/scene-graph>
