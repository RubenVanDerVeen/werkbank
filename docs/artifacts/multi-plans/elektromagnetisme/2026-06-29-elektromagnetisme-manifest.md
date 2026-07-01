# Elektromagnetisme Multi-Plan Manifest

- **Topic:** Elektromagnetisme course addition to werkbank (EM fields + HF + Antennas)
- **Date:** 2026-06-29
- **Outline:** `docs/artifacts/multi-plans/elektromagnetisme/2026-06-29-elektromagnetisme-outline.md`

15 plans: 1 foundation + 14 module sub-projects. All modules follow the
established pattern (pure `src/math/<x>.ts` + `src/modules/<id>/module.ts` +
one `src/registry.ts` line + presence-by-id smoke test + README/CHANGELOG).
Each module's `course` string is one of `Elektromagnetische Velden`,
`Hoogfrequenttechniek`, or `Antennes`; the new sections auto-append in
`src/ui/home.ts`.

## Integration branch

`feat/elektromagnetisme` — the branch all sub-branches merge into. The planner
committed the planning artifacts (outline, manifest, specs, plans) here. After
all sub-projects merge back and integration tests pass, the user reviews and
merges `feat/elektromagnetisme` to `main`.

## Plans

| ID | Course | Name | Branch | Plan file | Spec file | Depends on | Status |
|----|--------|------|--------|-----------|-----------|------------|--------|
| F  | (shared) | Smith chart + field plot + polar plot + TL math | `feat-em-foundation` | `plans/elektromagnetisme/2026-06-29-foundation.md` | `specs/elektromagnetisme/2026-06-29-foundation-design.md` | — | ready |
| SP-1  | Elektromagnetische Velden | Electrostatics | `feat-em-electrostatics` | `plans/elektromagnetisme/2026-06-29-electrostatics.md` | `specs/elektromagnetisme/2026-06-29-electrostatics-design.md` | F merged | ready |
| SP-2  | Elektromagnetische Velden | Magnetostatics | `feat-em-magnetostatics` | `plans/elektromagnetisme/2026-06-29-magnetostatics.md` | `specs/elektromagnetisme/2026-06-29-magnetostatics-design.md` | F merged | ready |
| SP-3  | Elektromagnetische Velden | Maxwell & Induction | `feat-em-maxwell-induction` | `plans/elektromagnetisme/2026-06-29-maxwell-induction.md` | `specs/elektromagnetisme/2026-06-29-maxwell-induction-design.md` | — | ready |
| SP-4  | Elektromagnetische Velden | EM Waves | `feat-em-em-waves` | `plans/elektromagnetisme/2026-06-29-em-waves.md` | `specs/elektromagnetisme/2026-06-29-em-waves-design.md` | F merged | ready |
| SP-5  | Elektromagnetische Velden | Plane-Wave Incidence | `feat-em-plane-wave-incidence` | `plans/elektromagnetisme/2026-06-29-plane-wave-incidence.md` | `specs/elektromagnetisme/2026-06-29-plane-wave-incidence-design.md` | — | ready |
| SP-6  | Elektromagnetische Velden | Rectangular Waveguides | `feat-em-waveguides` | `plans/elektromagnetisme/2026-06-29-waveguides.md` | `specs/elektromagnetisme/2026-06-29-waveguides-design.md` | F merged | ready |
| SP-7  | Hoogfrequenttechniek | TL Fundamentals | `feat-em-tl-fundamentals` | `plans/elektromagnetisme/2026-06-29-tl-fundamentals.md` | `specs/elektromagnetisme/2026-06-29-tl-fundamentals-design.md` | F merged | ready |
| SP-8  | Hoogfrequenttechniek | TL Input Impedance | `feat-em-tl-input-impedance` | `plans/elektromagnetisme/2026-06-29-tl-input-impedance.md` | `specs/elektromagnetisme/2026-06-29-tl-input-impedance-design.md` | F merged | ready |
| SP-9  | Hoogfrequenttechniek | Interactive Smith Chart | `feat-em-smith-chart` | `plans/elektromagnetisme/2026-06-29-smith-chart.md` | `specs/elektromagnetisme/2026-06-29-smith-chart-design.md` | F merged | ready |
| SP-10 | Hoogfrequenttechniek | Impedance Matching | `feat-em-impedance-matching` | `plans/elektromagnetisme/2026-06-29-impedance-matching.md` | `specs/elektromagnetisme/2026-06-29-impedance-matching-design.md` | F merged | ready |
| SP-11 | Hoogfrequenttechniek | S-Parameters & Two-Port | `feat-em-s-parameters` | `plans/elektromagnetisme/2026-06-29-s-parameters.md` | `specs/elektromagnetisme/2026-06-29-s-parameters-design.md` | F merged | ready |
| SP-12 | Antennes | Dipole Radiation | `feat-em-dipole-radiation` | `plans/elektromagnetisme/2026-06-29-dipole-radiation.md` | `specs/elektromagnetisme/2026-06-29-dipole-radiation-design.md` | F merged | ready |
| SP-13 | Antennes | Linear Antenna Arrays | `feat-em-antenna-arrays` | `plans/elektromagnetisme/2026-06-29-antenna-arrays.md` | `specs/elektromagnetisme/2026-06-29-antenna-arrays-design.md` | F merged | ready |
| SP-14 | Antennes | Link Budget & Radar | `feat-em-link-budget` | `plans/elektromagnetisme/2026-06-29-link-budget.md` | `specs/elektromagnetisme/2026-06-29-link-budget-design.md` | — | ready |

Paths are relative to `docs/artifacts/`.

> **Spec/plan layout note:** This outline and manifest live under
> `docs/artifacts/multi-plans/elektromagnetisme/`. Specs (`*-design.md`) live
> under `docs/artifacts/specs/elektromagnetisme/`; plans (`*.md`) live under
> `docs/artifacts/plans/elektromagnetisme/`. Each sub-project has a paired
> `*-design.md` (spec) and `*.md` (plan) of the same base name across the two
> folders.

## Execution order

1. **Planner** committed planning artifacts to `feat/elektromagnetisme` (done).
2. **F (foundation)** — one agent on `feat-em-foundation` (cut
   from `feat/elektromagnetisme`). Adds `src/ui/smith.ts`, `src/ui/fieldplot.ts`,
   `src/ui/polarplot.ts`, `src/math/tl.ts`. No registry edit. User merges the
   sub-branch back into `feat/elektromagnetisme`.
3. **After F is merged into `feat/elektromagnetisme`: SP-1 … SP-14 in parallel**
   — one cheaper agent per plan, each on its own `feat-em-<slug>`
   branch cut from `feat/elektromagnetisme` (which now contains the foundation).
   - SP-3, SP-5, SP-14 have **no** dependency on F and may be dispatched
     immediately alongside F, in the same batch.
   - The other 11 import foundation helpers — dispatch them only after the user
     merges `feat-em-foundation` into `feat/elektromagnetisme`.
   - Each agent merges its sub-branch back into `feat/elektromagnetisme` (user
     reviews and merges).
4. **After all sub-branches are merged into `feat/elektromagnetisme`** —
   integration verification on `feat/elektromagnetisme`. User reviews and merges
   `feat/elektromagnetisme` to `main`.

## Parallel-safety notes

- **Registry merges:** every module plan adds its own import line and appends its
  module to the `modules` array in `src/registry.ts`. Concurrent agents will
  conflict on this one file. Resolve by serializing the registry edits (each
  agent appends its own line) — trivial conflicts, append-only. The foundation
  makes **no** registry edit, so it never conflicts.
- **Smoke test:** each plan adds a **presence-by-id** assertion to
  `tests/smoke.test.ts` (e.g. `modules.find(x => x.id === '<id>')`), never an
  absolute module-count assertion — so parallel additions don't break each other.
- **README / CHANGELOG:** each plan appends one bullet; append-only, conflicts
  are trivial.
- **No shared math/UI conflict otherwise:** every module owns a distinct
  `src/math/<x>.ts` and `src/modules/<id>/` directory. The foundation owns the
  four shared helpers (`smith.ts`, `fieldplot.ts`, `polarplot.ts`, `tl.ts`) and
  is merged before any module that needs them starts.

## Git workflow

Per AGENTS.md, all feature work runs on a branch and only the user merges to
`main`. The hierarchical flow:

```
main
 └── feat/elektromagnetisme              ← integration branch (planning artifacts here)
 └── feat-em-foundation                  ← cut from feat/elektromagnetisme, merged back
 └── feat-em-electrostatics              ← cut from feat/elektromagnetisme (post-foundation), merged back
 └── feat-em-magnetostatics              ← ...
 └── ... (14 sub-branches total — flat-named to avoid git ref conflicts with the integration branch)
```

Each dispatched agent:

1. Cuts its named sub-branch off `feat/elektromagnetisme`:
   `git checkout feat/elektromagnetisme && git checkout -b <branch from the table>`.
2. Commits per the plan's commit steps (Conventional Commits 1.0.0).
3. Does **not** merge to `main` or `feat/elektromagnetisme` — reports back when
   all tasks are checked off and tests pass.
4. The user reviews the sub-branch and merges it into `feat/elektromagnetisme`.

After all 15 sub-branches are merged into `feat/elektromagnetisme`, the user
runs the integration checklist, reviews, and merges `feat/elektromagnetisme` to
`main`.

## Per-agent dispatch instructions

For each plan, send a fresh cheaper agent this prompt:

```
Read the plan at docs/artifacts/plans/elektromagnetisme/<plan file from the table>.
First, cut your sub-branch off the integration branch:
  git checkout feat/elektromagnetisme
  git checkout -b <branch from the table>
Implement it task-by-task using superpowers:subagent-driven-development
(or superpowers:executing-plans). Follow TDD exactly: write the failing test,
confirm it fails, implement, confirm it passes, then commit per the plan's
commit steps. Run `npm test` and `npm run build` before the final commit.
Do not edit files outside the plan's stated file list. When the registry,
smoke test, README, or CHANGELOG are touched, append only — do not reorder or
remove existing entries. Do not merge to feat/elektromagnetisme or main —
report back when all tasks are checked off and the user will review and merge.
```

Dispatch F first. After the user merges `feat-em-foundation`
into `feat/elektromagnetisme`, dispatch SP-1…SP-14 (one agent each). SP-3, SP-5,
SP-14 may be dispatched alongside F (no foundation dependency).

## Integration checklist (after all sub-branches merged into `feat/elektromagnetisme`)

- [ ] Foundation merged: `src/ui/smith.ts`, `src/ui/fieldplot.ts`,
      `src/ui/polarplot.ts`, `src/math/tl.ts` present; `tests/math/tl.test.ts`
      green.
- [ ] All 14 module sub-branches merged into `feat/elektromagnetisme`.
- [ ] `src/registry.ts` imports and lists all 14 new modules (no
      duplicate/missing).
- [ ] `npm test` passes (all math tests + 14 presence-by-id smoke tests).
- [ ] `npm run build` passes (type-check + bundle).
- [ ] `npm run dev`: home page shows three new sections —
      **Elektromagnetische Velden** (6 cards), **Hoogfrequenttechniek** (5 cards),
      **Antennes** (3 cards); each card opens and its plot/readouts update live.
- [ ] Spot-check each module against its spec's reference values.
- [ ] `README.md` Modules list and `CHANGELOG.md` `[Unreleased] → Added` include
      all 14 modules + the foundation note.
- [ ] User reviews `feat/elektromagnetisme` and merges to `main`.

## Handoff

Orchestrator stops here. No code written, no commits made by the orchestrator
beyond the planning artifacts (per AGENTS.md). The user owns dispatch: copy the
per-agent prompt above for each plan and send it to a fresh cheaper agent.
Foundation first, then the fourteen modules in parallel. Each agent works on its
named sub-branch off `feat/elektromagnetisme` and reports back for the user to
review and merge.
