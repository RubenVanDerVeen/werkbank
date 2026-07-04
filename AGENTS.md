# Werkbank: Agent Context

Context for AI coding agents (opencode, Codex, Cursor, Aider, GitHub Copilot, Hermes). Claude Code reads `CLAUDE.md` → `@AGENTS.md`. Auto-loaded each session. Start here.

## Overview

Static site hosting EE study tools (calculators + visualizers). One author. Modules: Regeltechniek, Fourier, Elektronica1A/B, Vermogenselektronica (SMPS), Elektromagnetisme, Hoogfrequenttechniek, Antennes. v1: 36 modules.

## Stack

- Vanilla TypeScript (strict), ES2022, ESM.
- Vite 5 (`npm run dev`, `npm run build`).
- uPlot 1.6 for time-series; custom SVG for s-plane, Smith, polar, field plots.
- Node `node --test` for unit tests.

## Module contract

Every `src/modules/<id>/module.ts` exports a single `Module`:

```ts
import type { Module } from '../module';
export const module: Module = { id, title, course, description, icon, render };
```

`src/registry.ts` imports each one; `src/main.ts` calls `render(host)` when a card is clicked. Icons are inline SVG strings.

## Adding features, modules, or components

When you add a new module, update every catalog that lists the existing set in the same commit:

- `src/registry.ts`: the live module import + array entry.
- `README.md` → "What's inside": human-readable module list grouped by course.
- `CHANGELOG.md` → `[Unreleased] / ### Added`: one bullet per module.
- `docs/artifacts/specs/YYYY-MM-DD-<id>-design.md` + `docs/artifacts/plans/YYYY-MM-DD-<id>-plan.md`: only when the module is non-trivial (per the existing pattern).

Red flags (any one = stop and fix before committing):

- The module folder exists but `registry.ts` has no import for it.
- README lists a course group but the new module is missing from that group.
- CHANGELOG `[Unreleased]` did not get a new bullet.
- Spec/plan pair created but `registry.ts` did not get the new entry, or vice versa.

## Build

- `npm run dev` — Vite dev server.
- `npm run build` — type-check (`tsc --noEmit`) then bundle to `dist/`.
- `npm test` — Node test runner over `tests/`.

## Git & workflow

- **No commit/push without explicit user instruction.** Default: every commit waits for the user.
- **Carve-out: spec/plan-driven execution.** When a spec (`docs/artifacts/specs/`) and a referencing plan (`docs/artifacts/plans/`) are both approved and the agent is currently executing that plan, the agent commits on its own volition at the boundaries the plan specifies. Outside an approved plan, the default rule applies.
- Feature work on a branch: `git checkout -b feat/<short-slug>`. Merge back to `main` only after the user confirms.
- Commit messages: Conventional Commits 1.0.0.

## Artifacts

Specs, plans, and reviews live in `docs/artifacts/{specs,plans,reviews}/` (filename: `YYYY-MM-DD-<topic>-<type>.md`). Multi-plan topics use a `<topic>/` subfolder + `docs/artifacts/multi-plans/<topic>/` for outline/manifest. When delegating to `brainstorming` / `writing-plans` or GSD, name the canonical path explicitly; never let a `docs/superpowers/` or `.planning/` directory land in this repo.

## Knowledge graph (graphify)

`graphify-out/` holds a queryable code graph (AST-only, no LLM, refreshed by a post-commit hook). For architecture / cross-file / "what touches X" questions, query it before grepping: `graphify query "<question>"` (~1–2K tokens). Name a concrete file or symbol; abstract prose anchors on doc headings instead of code. Stale graph → `graphify update .` (~30 s).