# AGENTS.md

## Purpose of This File

This document guides AI agents contributing to this repository.

It encodes how to **understand**, **reason about**, and **intervene in** this system. It is not a checklist, nor a set of hard rules. It is a generative guide for making changes that increase coherence, adaptability, and life in the system.

Agents should treat this file as a source of orientation before proposing or applying any non-trivial change.

---

## What This System Is

This system is a living, unfolding drawing environment.

It is not primarily a graphics editor or a static canvas. It is a place where meaning, structure, and form emerge through interaction. Drawing is treated as a way of thinking and sensing relationships, not merely as mark-making.

The system itself is understood as a living structure composed of interacting centers. Features, data structures, and interactions are not independent parts but participants in an evolving whole.

All changes should be approached as interventions in a living system rather than as isolated feature additions.

---

## Core Domain Idea

The core domain idea is the formation, transformation, and stabilization of living centers through drawing.

A center is any region, gesture, or structure that:
- Attracts attention
- Organizes surrounding elements
- Gains strength through repeated interaction

Drawing actions are acts that create, modify, or dissolve centers. Meaning is not fully specified in advance; it emerges through use, feedback, and iteration.

The system should support:
- Incremental and reversible actions
- Immediate, legible feedback
- The gradual emergence of form rather than upfront specification

Agents should assume that understanding follows interaction, not the other way around.

---

## High-Level Domain Building Blocks

These are conceptual building blocks. They describe *what the system is made of* at a domain level, not how it is implemented.

### Centers

Centers are focal points of meaning and organization. They may be persistent or temporary, visible or implicit.

Centers gain strength when:
- They are referenced by other centers
- They support coherent action
- They invite continued use

Agents should prefer strengthening existing centers over introducing new, competing ones.

### Fields

Fields are the relational context in which centers exist. They include spatial layout, temporal sequence, and interaction history.

Fields are active participants. They shape what kinds of centers can form and how they relate to one another.

### Gestures

Gestures are time-based actions (drawing, dragging, modifying) that operate on fields to create or transform centers.

Gestures should be:
- Legible
- Reversible
- Sensitive to context and scale

### Feedback Loops

Every gesture should produce feedback that informs the next action.

Feedback loops are how the system and the user think together. They are central to the system’s capacity to evolve through use.

### Persistence and Memory

The system remembers past actions not just as data, but as structure.

Persistence should reinforce meaningful centers without freezing form too early. Agents should prefer representations that allow reinterpretation and continued unfolding.

---

## Ontological and Design Commitments

This project is guided by the following commitments:

- Living structure over static optimization
- Unfolding over assembly
- Exactness in service of aliveness
- Wear, iteration, and use as design principles
- Co-variance: changes propagate through relationships

Agents should optimize for coherence and adaptability rather than completeness or scale.

---

## Agent Decision Heuristics

When making or proposing changes, agents should:

1. Look for living centers
   Identify existing centers and consider how a change strengthens or weakens them.

2. Favor unfolding over replacement
   Modify incrementally unless there is clear evidence of dead structure.

3. Treat deletion as progress
   Removing unused abstractions or redundant features is encouraged.

4. Preserve feedback
   Avoid changes that obscure cause-and-effect or delay user understanding.

5. Prefer clarity over cleverness
   If a solution is harder to read than the problem it solves, reconsider it.

---

## Back-Loop and Collapse-Aware Design

This system assumes conditions of constraint rather than abundance.

Accordingly:
- Prefer fewer dependencies over richer ecosystems
- Prefer local clarity over global optimization
- Prefer designs that continue to function when features are removed

Agents may recommend:
- Simplification
- Collapse of abstractions
- Reversal of previously added complexity

Regression, when it restores coherence, is a valid and often desirable move.

---

## Repository Guidelines

### Project Structure & Module Organization

- Frontend lives in `src/` with Solid entry points `index.tsx` and `App.tsx`
- UI styles start at `src/index.css` (Tailwind v4 import)
- Evolu data layer lives in `src/lib/evolu*`; schema and provider wiring are in `evolu-db.ts`
- Build artifacts and generated CSS land in `dist/`
- Tooling configuration:
  - `rsbuild.config.ts` for bundling and PostCSS
  - `biome.json` for linting and formatting
  - `tsconfig.json` with strict mode enabled

### Build, Test, and Development Commands

- `npm run dev`: runs Rsbuild dev server with HMR and Tailwind CLI in watch mode
- `npm run prod`: production bundle and minified Tailwind output
- `npm run check` / `npm run format`: Biome linting and formatting
- `npm test`: runs Brittle tests in `test/*.test.js` or `.ts`

---

## Coding Style & Naming Conventions

- TypeScript strict mode is enforced; avoid `any`
- Solid components use PascalCase; hooks and helpers use camelCase
- Keep components focused on UI; delegate state and data logic to `lib` modules
- Follow Biome defaults: spaces for indentation, single quotes, organized imports
- Use descriptive names for Evolu schema fields
- Prefer Tailwind utilities over inline styles

---

## Co-Variant Change Rules

- Evolu schema changes must be reflected in consuming UI and relevant tests
- Interaction or gesture changes should be evaluated alongside state semantics
- Visual changes should reinforce hierarchy and affordance, not decoration
- Avoid changes that isolate modules conceptually, even if technically valid

Agents should consider how a change propagates through the system, not just where it is applied.

---

## Testing Guidelines

- Use Brittle (`import test from 'brittle'`)
- Name test files `test/<feature>.test.js` or `.ts`
- Group related cases and use deterministic data
- Pay particular attention to pointer interactions and persistence behavior

---

## Commit & Pull Request Guidelines

- Commit messages: short, present-tense imperatives
- Pull requests should include:
  - A concise summary
  - Linked issues where applicable
  - Screenshots or gifs for UI changes
  - Notes on tests run
- Keep PRs scoped and avoid committing generated files unless necessary

---

## Security & Configuration Tips

- Evolu can sync remotely; set `syncUrl` in `src/lib/evolu-db.ts` when targeting a server
- Do not commit secrets or private URLs
- Avoid editing generated files in `dist/` by hand
- Keep dependencies up to date via npm

---

## Anti-Patterns

Agents should avoid:
- Premature abstraction
- Configuration before behavior stabilizes
- Optimizing for scale before patterns of use are visible
- Treating patterns as rules rather than observations
- Reducing exploratory capacity in the name of precision

---

## How Agents Should Reason About Drawing

Agents should treat drawing as inquiry, not execution.

When modifying drawing-related code:
- Ask what new centers this enables
- Ask which centers it weakens or removes
- Prefer designs that allow users to discover structure through action

If a change increases precision but reduces exploratory capacity, it should be treated with caution.

---

## Closing Note

Every contribution to this repository participates in shaping a small world.

Agents are not external operators but participants in the unfolding process. Changes
should increase coherence, invite use, and allow the system to continue becoming more
itself over time.

