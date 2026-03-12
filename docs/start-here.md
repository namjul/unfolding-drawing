# Docs Start Here

This is the entrypoint for the `docs/` folder.

The folder now has two roles:

- `blueprint/` for the new project starting from an empty repository
- `source-analysis/` for historical evidence from the earlier vibecoded project

## If you are starting the new project

Start here:

- [blueprint/start-here.md](./blueprint/start-here.md)

Then read:

1. [blueprint/minimal-core.md](./blueprint/minimal-core.md)
2. [blueprint/minimal-architecture.md](./blueprint/minimal-architecture.md)
3. [blueprint/incremental-rebuild-path.md](./blueprint/incremental-rebuild-path.md)

These documents are written to work without any old source files existing.

## If you need evidence from the earlier project

Use:

- [source-analysis/feature-surface.md](./source-analysis/feature-surface.md)
- [source-analysis/what-not-to-rebuild.md](./source-analysis/what-not-to-rebuild.md)

These documents are not the new starting point. They exist to preserve:

- what the earlier system implemented
- which complexity patterns should not be carried forward

## Working rule

Treat `blueprint/` as instructions.

Treat `source-analysis/` as evidence.

## Agent handoff

An agent starting from an empty repository should:

1. read `docs/blueprint/start-here.md`
2. read the blueprint documents in the recommended order
3. begin implementation with `docs/blueprint/milestone-00.md`
