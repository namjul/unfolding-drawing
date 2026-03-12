# Data-Oriented Programming

This document evaluates whether the new re-synthesis project should generally adopt a data-oriented-programming frame.

It is broader than the `dope` dependency question. The goal here is to decide how the project should think about data, behavior, and runtime structure across the blueprint.

## Short answer

- Adopt data-oriented programming as a default bias for document, scene, geometry, and transformation code.
- Do not treat data-oriented programming as a universal law for every layer.
- Use it strongly where the system benefits from plain data, explicit transforms, and explicit ownership.
- Use it selectively where UI behavior, CanvasKit integration, or local runtime pragmatics are clearer with narrower patterns.

## Aim

Strengthen the centers that matter most in this project:

- explicit document structure
- explicit mutation ownership
- explicit canvas/runtime behavior
- explicit persistence boundaries

The evaluation is about whether a data-oriented frame makes those centers clearer and more robust.

## What "general adoption" means here

For this project, data-oriented programming means:

- core state is represented as plain data
- behavior is implemented as plain functions over that data
- schema is explicit
- serialization is normal, not exceptional
- runtime queries are derived from data rather than hidden inside objects
- mutation ownership stays explicit

This does **not** require:

- universal immutability everywhere
- deep-freeze-by-default runtime behavior
- generic dispatch systems
- class bans as ideology
- forcing every UI concern into a data pipeline

## Why the frame fits this blueprint

The blueprint already prefers:

- `drawing-state` as plain persisted state
- `drawing-ops` as concrete mutation functions
- `interaction-state` as explicit transient state
- CanvasKit rendering with app-owned hit testing
- a derived runtime scene model
- minimal abstraction layers

That is already close to a data-oriented architecture.

This means the real question is not whether the project should become "data-oriented" in branding terms. It is whether the project should make that bias explicit and use it deliberately.

## Where data-oriented programming is strongly helpful

### 1. Document state

This is the strongest fit.

Persisted entities such as:

- `Place`
- `Connection`
- `Organizer`
- `Transformation`

should remain plain records with explicit IDs, ownership, and invariants.

Why it helps:

- serialization is straightforward
- Evolu persistence stays legible
- diffing and migration are easier
- document rules stay inspectable

If document state becomes behavior-heavy objects, persistence and schema evolution get harder to reason about.

### 2. Domain operations

This is also a strong fit.

Operations such as:

- `addPlace`
- `movePlace`
- `addConnection`
- `addOrganizer`
- `commitTransformation`

should stay as explicit functions over document state plus inputs.

Why it helps:

- mutation ownership is obvious
- testing is simpler
- commit and reject behavior stays traceable
- operation semantics do not disappear into methods distributed across many entity types

### 3. Scene derivation and hit testing

This is a strong fit for the canvas/runtime boundary.

The renderer should work from:

- document state
- interaction state
- derived scene items
- explicit hit-test results

Why it helps:

- scene traversal is inspectable
- hit testing can be tested as functions over world-space data
- CanvasKit integration stays explicit rather than magical

This is also where the OpenPencil scene-graph reference is useful: it shows the value of explicit scene data, explicit traversal, and explicit hit-test/query functions once the browser no longer owns shape identity.

Reference:

- `dope`: <https://github.com/gordonbrander/dope>
- OpenPencil scene graph: <https://openpencil.dev/reference/scene-graph>

### 4. Geometry and transformation payloads

This is another strong fit.

Geometry helpers should prefer:

- vectors
- rects
- bounds
- transform payloads
- placement records

as plain values passed through functions.

Why it helps:

- coordinate transforms stay composable
- geometry code is easier to test
- performance-sensitive code stays close to the data it uses

## Where data-oriented programming is selectively helpful

### 1. Interaction state

This should still be mostly plain data.

But some interaction flows may be easier to express with narrow state machines or explicit local controller logic.

Examples:

- drag lifecycle
- gesture lifecycle
- commit/reject flow
- inspector popover/menu behavior

So the recommendation is:

- keep the state itself data-oriented
- allow small pragmatic control structures around it when that is clearer

### 2. CanvasKit integration

The inputs and outputs should be data-oriented.

But the rendering boundary itself will still contain imperative code:

- draw passes
- surface lifecycle
- resource setup
- frame redraw coordination

That is normal.

The goal is not to eliminate imperative code. The goal is to keep imperative code at the edges and keep the state model explicit.

### 3. Inspector UI

The inspector should read and write explicit state.

But ordinary UI composition does not need to be forced into a data-oriented style beyond that.

Solid components, forms, and local UI behavior can remain straightforward as long as:

- they do not hide document mutations
- they do not create shadow copies of document state
- they do not obscure ownership

## Where a general DOP frame would be unhelpful

### 1. As ideology

If "data-oriented" becomes a blanket rule used to reject any local imperative code, the project will get worse.

This project still needs:

- renderer lifecycle code
- pointer handling
- resource setup
- local UI behavior

The contact test is simple:

- if enforcing DOP makes a module harder to explain, the principle is being overapplied

### 2. As generic indirection

Avoid turning DOP into:

- generic dispatch layers
- meta-programmed operation routing
- deep generic update systems everywhere
- universal helper pipelines

Those moves usually weaken the blueprint's explicitness instead of strengthening it.

### 3. As deep immutability dogma

The project expects dense scenes and frequent interaction updates.

Some hot paths may need careful handling of allocation and mutation pressure.

So the better rule is:

- prefer explicit data
- prefer predictable updates
- choose immutability tactically where it improves clarity

not:

- freeze everything
- copy everything
- assume cost does not matter

## Recommended project stance

### Adopt as a project-wide bias

Use data-oriented programming as the default lens for:

- persisted schema
- domain operations
- scene derivation
- hit testing
- geometry helpers
- transformation history

### Do not adopt as a universal law

Do not force it onto:

- every UI detail
- every local controller
- every renderer integration seam
- every performance-sensitive runtime path without measurement

### Practical rule

When deciding how to implement something, prefer the most explicit option among:

1. plain data
2. plain function over that data
3. small local imperative glue only where needed

That should be the default order of preference.

## Relationship to `dope`

This document is compatible with the current `dope` recommendation, but broader than it.

The current project stance is:

- adopt the useful data-oriented principles
- do not make `dope` a core dependency
- selectively vendor tiny helpers only when they solve a current problem

See:

- [dope-evaluation.md](./dope-evaluation.md)

## Contact tests

- If a proposed abstraction makes it harder to answer "where does this mutation happen?", it weakens the architecture.
- If a data-oriented representation makes persistence, testing, or scene queries simpler, it is probably helping.
- If a DOP rule forces awkward code at the renderer or UI boundary, it is overapplied.
- If two independent contributors can understand and change document operations without learning a hidden object protocol, the frame is helping.

## What would make this wrong

- The renderer hot path may require more specialized mutable runtime structures than this doc assumes.
- Some interaction flows may prove clearer with tighter local state-machine patterns than a plain data-first framing suggests.
- If the document model gains richer embedded behavior than currently expected, the plain-data bias may need revision in limited areas.

## Summary

Yes, the project should generally adopt a data-oriented-programming frame.

But the right version is:

- plain data for document and scene layers
- plain functions for mutations and queries
- imperative glue at the edges
- no ideology, no hidden framework, no generic indirection
