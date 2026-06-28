# Elektronica1B Multi-Plan Manifest

- **Topic:** Elektronica1B course addition to werkbank
- **Date:** 2026-06-28
- **Outline:** `docs/artifacts/specs/elektronica1b/2026-06-28-elektronica1b-outline.md`

9 plans: 1 foundation + 8 module sub-projects. All modules follow the existing
`Elektronica1A` pattern (pure `src/math/<x>.ts` + `src/modules/<id>/module.ts` +
one `src/registry.ts` line + smoke test + README/CHANGELOG). The `Elektronica1B`
course string auto-appends in `src/ui/home.ts`.

## Plans

| ID | Name | Plan file | Spec file | Depends on | Status |
|----|------|-----------|-----------|------------|--------|
| F | Complex math + Bode plot | `plans/elektronica1b/2026-06-28-foundation.md` | `specs/elektronica1b/2026-06-28-foundation-design.md` | — | ready |
| SP-1 | Amplifier Frequency Response | `plans/elektronica1b/2026-06-28-freq-response.md` | `specs/elektronica1b/2026-06-28-freq-response-design.md` | F | ready |
| SP-2 | Cascaded / Multistage Amplifier | `plans/elektronica1b/2026-06-28-multistage.md` | `specs/elektronica1b/2026-06-28-multistage-design.md` | — | ready |
| SP-3 | Differential Amplifier | `plans/elektronica1b/2026-06-28-diff-amp.md` | `specs/elektronica1b/2026-06-28-diff-amp-design.md` | — | ready |
| SP-4 | Negative Feedback | `plans/elektronica1b/2026-06-28-feedback.md` | `specs/elektronica1b/2026-06-28-feedback-design.md` | — | ready |
| SP-5 | Active Filters (Sallen-Key) | `plans/elektronica1b/2026-06-28-active-filter.md` | `specs/elektronica1b/2026-06-28-active-filter-design.md` | F | ready |
| SP-6 | Sinusoidal Oscillators | `plans/elektronica1b/2026-06-28-oscillator.md` | `specs/elektronica1b/2026-06-28-oscillator-design.md` | F | ready |
| SP-7 | Power Amplifiers (A/B/AB) | `plans/elektronica1b/2026-06-28-power-amp.md` | `specs/elektronica1b/2026-06-28-power-amp-design.md` | — | ready |
| SP-8 | Comparator / Schmitt Trigger | `plans/elektronica1b/2026-06-28-comparator.md` | `specs/elektronica1b/2026-06-28-comparator-design.md` | — | ready |

Paths are relative to `docs/artifacts/`.

## Execution order

1. **F (foundation)** — one agent. Adds `src/math/complex.ts` + `src/ui/acplot.ts`
   and refactors `src/math/bode.ts`. No registry edit.
2. **After F is merged: SP-1 … SP-8 in parallel** — one cheaper agent per plan.
   - SP-2, SP-3, SP-4, SP-7, SP-8 have **no** dependency on F and may be
     dispatched immediately, in the same batch, if you prefer to start them
     before F lands.
   - SP-1, SP-5, SP-6 import the foundation — dispatch them only after F merges.

## Parallel-safety notes

- **Registry merges:** every module plan adds its own import line and appends its
  module to the `modules` array in `src/registry.ts`. Concurrent agents will
  conflict on this one file. Resolve by serializing the registry edits (each agent
  appends its own line) — trivial conflicts, append-only. The foundation makes
  **no** registry edit, so it never conflicts.
- **Smoke test:** each plan adds a **presence-by-id** assertion to
  `tests/smoke.test.ts` (e.g. `modules.find(x => x.id === '<id>')`), never an
  absolute module-count assertion — so parallel additions don't break each other.
- **README / CHANGELOG:** each plan appends one bullet; append-only, conflicts are
  trivial.
- **No shared math/UI conflict otherwise:** every module owns a distinct
  `src/math/<x>.ts` and `src/modules/<id>/` directory.

## Per-agent dispatch instructions

For each plan, send a fresh cheaper agent this prompt:

```
Read the plan at docs/artifacts/<plan path from the table>.
Implement it task-by-task using superpowers:subagent-driven-development
(or superpowers:executing-plans). Follow TDD exactly: write the failing test,
confirm it fails, implement, confirm it passes, then commit per the plan's
commit steps. Run `npm test` and `npm run build` before the final commit.
Do not edit files outside the plan's stated file list. When the registry,
smoke test, README, or CHANGELOG are touched, append only — do not reorder or
remove existing entries. Report back when all tasks are checked off.
```

Dispatch F first. After F's branch is merged, dispatch SP-1…SP-8 (one agent each).

## Integration checklist (after all plans done)

- [ ] Foundation merged: `src/math/complex.ts`, `src/ui/acplot.ts` present;
      `src/math/bode.ts` refactored; `tests/math/complex.test.ts` green.
- [ ] All 8 module plans report done.
- [ ] `src/registry.ts` imports and lists all 8 new modules (no duplicate/missing).
- [ ] `npm test` passes (all math tests + 8 presence-by-id smoke tests).
- [ ] `npm run build` passes (type-check + bundle).
- [ ] `npm run dev`: home page shows an **Elektronica1B** section with 8 cards;
      each card opens and its plot/readouts update live.
- [ ] Spot-check each module against its spec's reference values.
- [ ] `README.md` Modules list and `CHANGELOG.md` `[Unreleased] → Added` include
      all 8 modules + the foundation note.

## Handoff

Orchestrator stops here. No code written, no commits made (per AGENTS.md). The
user owns dispatch: copy the per-agent prompt above for each plan and send it to a
fresh cheaper agent, foundation first, then the eight modules in parallel.
