# What Not To Rebuild

This document captures the main complexity risks observed in the earlier vibecoded repository.

It is a negative filter for the rebuild, not a description of the new target architecture.

## Main risks to avoid carrying forward

### Duplicated functionality

- one conceptual transformation system described across too many files
- repeated query and subscription plumbing per entity family
- extra endpoint persistence for connections without a clearly necessary payoff

### Speculative abstractions

- wrapper layers around one concrete data store
- separate persistence models for every organizer variant without proof that they must stay separate
- a guide structure more elaborate than the essential workflow requires

### Dead or weak features

- unused dependencies
- weakly integrated flags that do not drive a major workflow
- tooling configuration with no active test surface

### Framework overuse

- a very large app component carrying too much state and behavior
- inspector components carrying domain logic directly
- switch-heavy transformation recording instead of concrete operation ownership
- more build-layer complexity than the rebuild needs

## How to use this document

Use it as a suspicion list during implementation:

- if a proposed rebuild choice resembles one of these patterns, stop and justify it
- if the justification depends only on future flexibility, reject it

## See also

- [feature-surface.md](./feature-surface.md) for the earlier implemented surface
- [../blueprint/start-here.md](../blueprint/start-here.md) for the actual starting point of the new project
