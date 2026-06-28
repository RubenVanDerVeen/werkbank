# Active Filters (Sallen-Key) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `active-filter` module: unity-gain Sallen-Key LP/HP and MFB BP
with `f0`, `Q`, and a magnitude/phase Bode plot.

**Architecture:** Pure math in `src/math/filter.ts` (assembles a `Tf`). UI in
`src/modules/active-filter/module.ts` using the foundation `bodePlot` and
`bode()`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `bodePlot`.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-active-filter-design.md`

> **Depends on foundation** (`complex.ts`, `acplot.ts`) and existing `tf.ts`/`bode.ts`.
> Start after the foundation plan is merged. Smoke test asserts presence **by id**.

---

### Task 1: Filter design math

**Files:**
- Create: `src/math/filter.ts`
- Create: `tests/math/filter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { design } from '../../src/math/filter.ts';
import { bode } from '../../src/math/bode.ts';

test('LP R=10k C=10nF → f0 ≈ 1592 Hz, Q = 0.5', () => {
  const d = design('LP', 10, 10, 10, 10);
  assert.ok(Math.abs(d.f0_Hz - 1591.5) / 1591.5 < 0.01, `f0=${d.f0_Hz}`);
  assert.ok(Math.abs(d.Q - 0.5) < 1e-3, `Q=${d.Q}`);
});
test('LP magnitude at f0 ≈ -6.0 dB (Q=0.5)', () => {
  const d = design('LP', 10, 10, 10, 10);
  const w0 = 2 * Math.PI * d.f0_Hz;
  const m = bode(d.tf, [{ omega: w0 }])[0]!.magDb;
  assert.ok(Math.abs(m - 20 * Math.log10(0.5)) < 0.1, `mag=${m}`);
});
test('HP R=10k C=10nF → f0 ≈ 1592 Hz', () => {
  assert.ok(Math.abs(design('HP', 10, 10, 10, 10).f0_Hz - 1591.5) / 1591.5 < 0.01);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/filter.ts`** (convert kΩ·nF → Ω·F inside)

```ts
import type { Tf } from './tf.ts';
export type FilterType = 'LP' | 'HP' | 'BP';
export interface FilterDesign { f0_Hz: number; Q: number; gain: number; tf: Tf; }

export function design(type: FilterType, R1_k: number, R2_k: number, C1_n: number, C2_n: number): FilterDesign {
  const R1 = R1_k * 1e3, R2 = R2_k * 1e3, C1 = C1_n * 1e-9, C2 = C2_n * 1e-9;
  const prod = R1 * R2 * C1 * C2;
  if (prod <= 0) throw new Error('invalid R/C values');
  const w0 = 1 / Math.sqrt(prod);
  let Q: number, tf: Tf, gain = 1;
  if (type === 'LP') {
    Q = Math.sqrt(prod) / (C2 * (R1 + R2));
    tf = { num: [w0 * w0], den: [1, w0 / Q, w0 * w0] };
  } else if (type === 'HP') {
    Q = Math.sqrt(prod) / (R2 * (C1 + C2));
    tf = { num: [1, 0, 0], den: [1, w0 / Q, w0 * w0] };
  } else { // BP (MFB-style biquad)
    Q = Math.sqrt(prod) / (C2 * (R1 + R2));
    tf = { num: [(w0 / Q), 0], den: [1, w0 / Q, w0 * w0] };
    gain = 1;
  }
  return { f0_Hz: w0 / (2 * Math.PI), Q, gain, tf };
}

export function bodePoints(type: FilterType, R1: number, R2: number, C1: number, C2: number, n = 160) {
  const d = design(type, R1, R2, C1, C2);
  const w0 = 2 * Math.PI * d.f0_Hz;
  const lo = Math.log10(w0 / 1000), hi = Math.log10(w0 * 1000);
  const pts: { omega: number }[] = [];
  for (let i = 0; i < n; i++) pts.push({ omega: 10 ** (lo + ((hi - lo) * i) / (n - 1)) });
  // bode() imported in the test/module; re-export points for the module to feed bode().
  return { design: d, omegas: pts };
}
```

> Note: the module calls `bode(d.tf, omegas)` (from `src/math/bode.ts`) to get the
> `{omega,magDb,phaseDeg}[]` for `bodePlot`. Keep `bodePoints` returning the `Tf`
> plus the omega grid so the math file has no UI import.

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/filter.ts tests/math/filter.test.ts
git commit -m "feat(math): Sallen-Key/MFB filter f0, Q, transfer function"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/active-filter/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Type', ['LP','HP','BP'], 'LP')`,
  sliders `R1, R2, C1, C2`. On `update`: `const { design: d, omegas } =
  bodePoints(type, ...)`, `const pts = bode(d.tf, omegas)`, render `f0`, `Q`
  readouts and `bodePlot(plotHost, pts)`. Mirror `fet-amp/module.ts` wiring.

```ts
import { bode } from '../../math/bode.ts';
import { bodePoints } from '../../math/filter.ts';
import { bodePlot } from '../../ui/acplot.ts';
// ...
export const module: Module = {
  id: 'active-filter',
  title: 'Active Filters',
  course: 'Elektronica1B',
  description: 'Sallen-Key / MFB 2nd-order filters: f0, Q, magnitude & phase.',
  icon: 'f0',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as activeFilter }
  from './modules/active-filter/module.ts';` and append `activeFilter`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/active-filter/module.ts src/registry.ts
git commit -m "feat(modules): Sallen-Key/MFB active-filter analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('active-filter module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'active-filter');
  assert.ok(m && m.course === 'Elektronica1B', 'active-filter missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; LP/HP/BP changes the Bode shape;
  `C` shifts `f0`.
- [ ] **Step 3: README** — append:
  `- **Active Filters** — Sallen-Key / MFB 2nd-order LP/HP/BP with f0, Q, and Bode plot.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Active Filters module: Sallen-Key LP/HP and MFB band-pass with f0, Q, and magnitude/phase Bode plot.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: active-filter smoke test, README, changelog"
```
