# Comparator & Schmitt Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `comparator` module: inverting/non-inverting Schmitt-trigger
thresholds, hysteresis, and the hysteresis transfer loop.

**Architecture:** Pure math in `src/math/schmitt.ts`. UI in
`src/modules/comparator/module.ts` using `linePlot`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-comparator-design.md`

> **No foundation dependency.** Registry smoke test asserts presence **by id**.

---

### Task 1: Threshold + hysteresis-loop math

**Files:**
- Create: `src/math/schmitt.ts`
- Create: `tests/math/schmitt.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/schmitt.ts';

test('inverting R1=R2=10k Vsat=12 → VT±=±6, H=12', () => {
  const r = analyze('Inverting', { R1_kOhm: 10, R2_kOhm: 10, Vsat: 12, Vref: 0 });
  assert.ok(Math.abs(r.VTp - 6) < 1e-9 && Math.abs(r.VTn - -6) < 1e-9, JSON.stringify(r));
  assert.ok(Math.abs(r.H - 12) < 1e-9, `H=${r.H}`);
});
test('non-inverting R1=10k R2=20k Vsat=12 → VT±=±6', () => {
  const r = analyze('Non-inverting', { R1_kOhm: 10, R2_kOhm: 20, Vsat: 12, Vref: 0 });
  assert.ok(Math.abs(r.VTp - 6) < 1e-9 && Math.abs(r.VTn - -6) < 1e-9, JSON.stringify(r));
});
test('inverting Vref=2 → VT+=7, VT-=-5', () => {
  const r = analyze('Inverting', { R1_kOhm: 10, R2_kOhm: 10, Vsat: 12, Vref: 2 });
  assert.ok(Math.abs(r.VTp - 7) < 1e-9 && Math.abs(r.VTn - -5) < 1e-9, JSON.stringify(r));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/schmitt.ts`**

```ts
export type SchmittConfig = 'Inverting' | 'Non-inverting';
export interface SchmittParams { R1_kOhm: number; R2_kOhm: number; Vsat: number; Vref: number; }
export interface SchmittResult { VTp: number; VTn: number; H: number; }
export type XY = { x: number; y: number }[];

export function analyze(config: SchmittConfig, p: SchmittParams): SchmittResult {
  let VTp: number, VTn: number;
  if (config === 'Inverting') {
    const denom = p.R1_kOhm + p.R2_kOhm;
    if (denom === 0) throw new Error('invalid divider');
    const k = p.R1_kOhm / denom;
    const offset = (p.Vref * p.R2_kOhm) / denom;
    VTp = offset + p.Vsat * k;
    VTn = offset - p.Vsat * k;
  } else {
    if (p.R2_kOhm === 0) throw new Error('invalid divider');
    const k = p.R1_kOhm / p.R2_kOhm;
    VTp = p.Vsat * k; // + Vref·(1+k) when Vref≠0; v1 uses Vref=0 reference
    VTn = -p.Vsat * k;
  }
  return { VTp, VTn, H: VTp - VTn };
}

// Hysteresis loop: rising-input branch and falling-input branch.
export function loop(config: SchmittConfig, p: SchmittParams, n = 200): { rising: XY; falling: XY } {
  const { VTp, VTn } = analyze(config, p);
  const span = Math.max(Math.abs(VTp), Math.abs(VTn)) * 1.5 + 1;
  const hi = p.Vsat, lo = -p.Vsat;
  const rising: XY = [], falling: XY = [];
  let s = lo; // state on rising sweep starts low (for inverting, output high below VTn — see note)
  for (let i = 0; i < n; i++) {
    const vin = -span + (2 * span * i) / (n - 1);
    if (config === 'Inverting') { if (vin > VTp) s = lo; else if (vin < VTn) s = hi; }
    else { if (vin > VTp) s = hi; else if (vin < VTn) s = lo; }
    rising.push({ x: vin, y: s });
  }
  s = hi;
  for (let i = n - 1; i >= 0; i--) {
    const vin = -span + (2 * span * i) / (n - 1);
    if (config === 'Inverting') { if (vin > VTp) s = lo; else if (vin < VTn) s = hi; }
    else { if (vin > VTp) s = hi; else if (vin < VTn) s = lo; }
    falling.push({ x: vin, y: s });
  }
  return { rising, falling };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/schmitt.ts tests/math/schmitt.test.ts
git commit -m "feat(math): Schmitt-trigger thresholds and hysteresis loop"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/comparator/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Config', ['Inverting',
  'Non-inverting'], 'Inverting')`, sliders `R1, R2, Vsat, Vref`. On `update`:
  call `analyze`, render `VT+`, `VT−`, `H`, and `linePlot` the two `loop`
  branches (`rising`, `falling`). Mirror `diode-shaping`/`fet-amp` wiring.

```ts
export const module: Module = {
  id: 'comparator',
  title: 'Comparator & Schmitt Trigger',
  course: 'Elektronica1B',
  description: 'Op-amp Schmitt trigger: thresholds, hysteresis, transfer loop.',
  icon: 'ST',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as comparator }
  from './modules/comparator/module.ts';` and append `comparator`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/comparator/module.ts src/registry.ts
git commit -m "feat(modules): comparator / Schmitt-trigger analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('comparator module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'comparator');
  assert.ok(m && m.course === 'Elektronica1B', 'comparator missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; the loop plot shows the two
  switching branches; widening `R1`/`R2` ratio changes the hysteresis width.
- [ ] **Step 3: README** — append:
  `- **Comparator & Schmitt Trigger** — thresholds, hysteresis, and the transfer loop.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Comparator & Schmitt Trigger module: inverting/non-inverting thresholds, hysteresis, and transfer-loop plot.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: comparator smoke test, README, changelog"
```
