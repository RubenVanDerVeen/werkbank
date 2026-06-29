# Werkbank

Static site hosting EE study tools (calculators + visualizers). One author. v1: Regeltechniek + Fourier + Vermelonselektronica (SMPS).

## Stack

- Vanilla TypeScript (strict), ES2022, ESM
- Vite 5 (`npm run dev`, `npm run build`)
- uPlot 1.6 for time-series plots; custom SVG for s-plane charts
- Node `node --test` for unit tests

## Module contract

Every file under `src/modules/<id>/module.ts` exports a single `Module`:

```ts
import type { Module } from '../module';
export const module: Module = { id, title, course, description, icon, render };
```

`registry.ts` imports each one. `main.ts` calls `render(host)` when a card is clicked.

**Adding a module:** create the folder + file, add one line to `registry.ts`.

## Build

- `npm run dev` — Vite dev server
- `npm run build` — type-check then bundle into `dist/`
- `npm test` — Node test runner over `tests/`

## Git

- No commit/push without explicit user instruction.
- Feature work on a branch: `git checkout -b feat/<short-slug>`. Merge back to `main` only after the user confirms.
- Commit messages: Conventional Commits 1.0.0.
