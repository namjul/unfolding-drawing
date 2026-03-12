# Blueprint Start Here

This is the starting point for a new implementation.

These documents assume an empty repository. They do not depend on any files, components, or module names from the earlier vibecoded project.

## Read these first

### 1. [minimal-core.md](./minimal-core.md)

Use this to understand:

- the irreducible domain concepts
- the minimum required data models
- the essential workflows

This defines what the system fundamentally is.

### 2. [minimal-architecture.md](./minimal-architecture.md)

Use this to understand:

- the smallest sensible module set
- explicit data flow
- what should remain unabstracted

This defines the simplest structure that can support the core.

### 3. [incremental-rebuild-path.md](./incremental-rebuild-path.md)

Use this to understand:

- how to start from nothing
- what to build first
- how to add features without losing coherence

This defines the build sequence.

### 3a. [milestone-00.md](./milestone-00.md)

Use this to understand:

- the renderer and stack validation spike
- what must be proven before the first real implementation milestone
- what is intentionally out of scope in the initial technical experiment

This defines the pre-core validation gate for the new project.

### 3b. [data-model.md](./data-model.md)

Use this to understand:

- the initial persisted schema
- what belongs in persisted state vs transient state
- IDs, ownership rules, and invariants

This defines the initial document contract for the new project.

### 3c. [canvas-model.md](./canvas-model.md)

Use this to understand:

- coordinate spaces
- viewport rules
- scene derivation
- hit testing and selection order

This defines the initial canvas/runtime contract for the new project.

### 3d. [milestone-01.md](./milestone-01.md)

Use this to understand:

- the first real implementation milestone after the renderer spike
- exact scope
- explicit non-goals
- done criteria

This defines the first coherent build target.

### 4. [tech-stack.md](./tech-stack.md)

Use this to understand:

- the current stack decision
- the choice to use CanvasKit for the drawing surface
- the decision not to add Yoga in phase 1

This defines the current stack direction for the new project.

### 5. [tech-stack-evaluation.md](./tech-stack-evaluation.md)

Use this to understand:

- renderer choice for the drawing surface
- why CanvasKit is the current default recommendation
- when Yoga is justified and when it is premature

This defines the current stack recommendation for the new project.

### 6. [build-system.md](./build-system.md)

Use this to understand:

- the build-system choice
- why Vite is the current recommendation
- when to reconsider Rsbuild

This defines the current build-system recommendation for the new project.

### 7. [dependency-triage.md](./dependency-triage.md)

Use this to understand:

- which candidate dependencies fit the current blueprint
- which packages belong in Milestone 0 or Milestone 1
- which packages should wait

This defines the current dependency filter for the new project.

### 8. [dope-evaluation.md](./dope-evaluation.md)

Use this to understand:

- whether data-oriented programming via `dope` fits the blueprint
- why `dope` is currently a style reference rather than a core dependency
- where a small later use might still make sense

This defines the current recommendation for `dope`.

## Optional historical context

If you need evidence from the earlier system rather than forward-looking guidance, use:

- [../source-analysis/feature-surface.md](../source-analysis/feature-surface.md)
- [../source-analysis/what-not-to-rebuild.md](../source-analysis/what-not-to-rebuild.md)

Those documents describe the old repository. They are not the starting point for the new project.

## Working rule

When building the new system, move in this order:

1. minimal core
2. minimal architecture
3. incremental rebuild path
4. milestone 0
5. data model
6. canvas model
7. milestone 1
8. tech stack
9. tech stack evaluation
10. build system
11. dependency triage
12. dope evaluation

Only go to `source-analysis/` when you need to confirm what the old system actually implemented or what complexity should be left behind.
