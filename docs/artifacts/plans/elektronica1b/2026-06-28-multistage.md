# Cascaded / Multistage Amplifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `multistage` module: inter-stage loading, overall gain, and
bandwidth shrink for a 2–3 stage cascade.

**Architecture:** Pure math in `src/math/multistage.ts`. UI in
`src/modules/multistage/module.ts` using `linePlot`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-multistage-design.md`

> **No foundation dependency.** May run immediately, in parallel with the other
> modules. Registry smoke test asserts presence **by id**, not total count.

---

### Task 1: Cascade math

**Files:**
- Create: `src/math/multistage.ts`
- Create: `tests/math/multistage.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, type Stage } from '../../src/math/multistage.ts';

const stages: Stage[] = [
  { Av0: -10, Rin_kOhm: 2, Rout_kOhm: 5, fH_Hz: 1e6 },
  { Av0: -10, Rin_kOhm: 2, Rout_kOhm: 5, fH_Hz: 1e6 },
];

test('two identical stages: loaded stage gain ≈ -2.857', () => {
  const r = analyze(stages, 2);
  assert.ok(Math.abs(r.stageGains[0]! - -2.857) < 0.01, `g0=${r.stageGains[0]}`);
});
test('overall gain ≈ 8.16', () => {
  assert.ok(Math.abs(analyze(stages, 2).AvTotal - 8.163) < 0.01);
});
test('overall BW ≈ 707 kHz', () => {
  const bw = analyze(stages, 2).BW_Hz;
  assert.ok(Math.abs(bw - 7.071e5) / 7.071e5 < 0.01, `BW=${bw}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/multistage.ts`**

```ts
export interface Stage { Av0: number; Rin_kOhm: number; Rout_kOhm: number; fH_Hz: number; }
export interface MultiResult { AvTotal: number; AvTotalDb: number; BW_Hz: number; stageGains: number[]; }

export function analyze(stages: Stage[], RL_kOhm: number): MultiResult {
  const stageGains: number[] = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]!;
    const load = i < stages.length - 1 ? stages[i + 1]!.Rin_kOhm : RL_kOhm;
    stageGains.push(s.Av0 * (load / (s.Rout_kOhm + load)));
  }
  const AvTotal = stageGains.reduce((a, b) => a * b, 1);
  const invSq = stages.reduce((a, s) => a + 1 / (s.fH_Hz * s.fH_Hz), 0);
  const BW_Hz = 1 / Math.sqrt(invSq);
  return { AvTotal, AvTotalDb: 20 * Math.log10(Math.abs(AvTotal)), BW_Hz, stageGains };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/multistage.ts tests/math/multistage.test.ts
git commit -m "feat(math): multistage cascade gain and bandwidth"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/multistage/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders for 2–3 stages (stage-3 inputs
  hidden when `nStages=2`), `RL`, and a `selectWave('Stages', ['2','3'], '2')`.
  On `update`: build the `Stage[]`, call `analyze`, render per-stage loaded gains
  and overall `Av`/`BW` into `readouts`, and `linePlot` the loaded vs unloaded
  per-stage gains (x = stage index). Mirror `fet-amp/module.ts` wiring (gather
  widgets, append, attach `input`/`change` listeners, call `update()`).

```ts
export const module: Module = {
  id: 'multistage',
  title: 'Cascaded Amplifier',
  course: 'Elektronica1B',
  description: 'Cascaded amplifier: inter-stage loading, overall gain, bandwidth shrink.',
  icon: 'xN',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add `import { module as multistage }
  from './modules/multistage/module.ts';` and append `multistage` to `modules`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/multistage/module.ts src/registry.ts
git commit -m "feat(modules): cascaded multistage amplifier analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** in `tests/smoke.test.ts`:

```ts
test('multistage module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'multistage');
  assert.ok(m && m.course === 'Elektronica1B', 'multistage missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`, toggle 2↔3 stages; confirm loaded
  gains drop below unloaded and BW falls below the narrowest stage.
- [ ] **Step 3: README** — append:
  `- **Cascaded Amplifier** — inter-stage loading, overall gain, and bandwidth shrink.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Cascaded Amplifier module: inter-stage loading, overall gain, and bandwidth shrink for 2–3 stages.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: multistage smoke test, README, changelog"
```
