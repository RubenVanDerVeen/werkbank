# Sinusoidal Oscillators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `oscillator` module: Wien, phase-shift, Colpitts, and Hartley
oscillation frequency and Barkhausen gain condition.

**Architecture:** Pure math in `src/math/oscillator.ts`. UI in
`src/modules/oscillator/module.ts` using the foundation `bodePlot` (Wien/
phase-shift β network). One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `bodePlot`.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-oscillator-design.md`

> **Depends on foundation** (`complex.ts`, `acplot.ts`). Start after the foundation
> plan is merged. Smoke test asserts presence **by id**.

---

### Task 1: Oscillator frequency + gain-condition math

**Files:**
- Create: `src/math/oscillator.ts`
- Create: `tests/math/oscillator.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/oscillator.ts';

test('Wien R=10k C=10nF → f0 ≈ 1591.5 Hz, AvMin=3', () => {
  const r = analyze('Wien', { R_kOhm: 10, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 1591.5) / 1591.5 < 0.01, `f0=${r.f0_Hz}`);
  assert.ok(r.AvMin === 3, `AvMin=${r.AvMin}`);
});
test('Phase-shift R=10k C=10nF → f0 ≈ 649.7 Hz, AvMin=29', () => {
  const r = analyze('Phase-shift', { R_kOhm: 10, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 649.7) / 649.7 < 0.01, `f0=${r.f0_Hz}`);
  assert.ok(r.AvMin === 29, `AvMin=${r.AvMin}`);
});
test('Colpitts L=1mH C1=C2=10nF → f0 ≈ 71.18 kHz', () => {
  const r = analyze('Colpitts', { L_mH: 1, C1_nF: 10, C2_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 71176) / 71176 < 0.01, `f0=${r.f0_Hz}`);
});
test('Hartley L1=L2=1mH C=10nF → f0 ≈ 35.59 kHz', () => {
  const r = analyze('Hartley', { L1_mH: 1, L2_mH: 1, C_nF: 10 });
  assert.ok(Math.abs(r.f0_Hz - 35588) / 35588 < 0.01, `f0=${r.f0_Hz}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/oscillator.ts`**

```ts
export type OscType = 'Wien' | 'Phase-shift' | 'Colpitts' | 'Hartley';
export interface OscParams {
  R_kOhm?: number; C_nF?: number;            // Wien / Phase-shift
  L_mH?: number; C1_nF?: number; C2_nF?: number; // Colpitts
  L1_mH?: number; L2_mH?: number;            // Hartley (with C_nF)
}
export interface OscResult { f0_Hz: number; AvMin: number; ratio?: number; }

const TWO_PI = 2 * Math.PI;

export function analyze(type: OscType, p: OscParams): OscResult {
  if (type === 'Wien') {
    const R = (p.R_kOhm ?? 0) * 1e3, C = (p.C_nF ?? 0) * 1e-9;
    return { f0_Hz: 1 / (TWO_PI * R * C), AvMin: 3 };
  }
  if (type === 'Phase-shift') {
    const R = (p.R_kOhm ?? 0) * 1e3, C = (p.C_nF ?? 0) * 1e-9;
    return { f0_Hz: 1 / (TWO_PI * R * C * Math.sqrt(6)), AvMin: 29 };
  }
  if (type === 'Colpitts') {
    const L = (p.L_mH ?? 0) * 1e-3, C1 = (p.C1_nF ?? 0) * 1e-9, C2 = (p.C2_nF ?? 0) * 1e-9;
    const Cs = (C1 * C2) / (C1 + C2);
    if (L * Cs <= 0) throw new Error('invalid L/C values');
    return { f0_Hz: 1 / (TWO_PI * Math.sqrt(L * Cs)), AvMin: C2 / C1, ratio: C2 / C1 };
  }
  // Hartley
  const L1 = (p.L1_mH ?? 0) * 1e-3, L2 = (p.L2_mH ?? 0) * 1e-3, C = (p.C_nF ?? 0) * 1e-9;
  if ((L1 + L2) * C <= 0) throw new Error('invalid L/C values');
  return { f0_Hz: 1 / (TWO_PI * Math.sqrt((L1 + L2) * C)), AvMin: L1 / L2, ratio: L1 / L2 };
}

// Wien feedback-network β(jω) = 1 / (3 + j(ωRC − 1/(ωRC))) — for the Bode plot.
export function wienBetaPoints(R_kOhm: number, C_nF: number, n = 160) {
  const R = R_kOhm * 1e3, C = C_nF * 1e-9;
  const w0 = 1 / (R * C);
  const lo = Math.log10(w0 / 100), hi = Math.log10(w0 * 100);
  const out: { omega: number; magDb: number; phaseDeg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = 10 ** (lo + ((hi - lo) * i) / (n - 1));
    const x = w * R * C;
    const reDen = 3, imDen = x - 1 / x;
    const mag = 1 / Math.hypot(reDen, imDen);
    const phase = -(Math.atan2(imDen, reDen) * 180) / Math.PI;
    out.push({ omega: w, magDb: 20 * Math.log10(mag), phaseDeg: phase });
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/oscillator.ts tests/math/oscillator.test.ts
git commit -m "feat(math): Wien/phase-shift/Colpitts/Hartley oscillator f0 + gain"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/oscillator/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Type', ['Wien','Phase-shift',
  'Colpitts','Hartley'], 'Wien')` plus sliders `R, C, L, C1, C2, L1, L2`, showing
  only the inputs each type needs (toggle `style.display` in `update`, like
  `fet-amp`). On `update`: build the right `OscParams`, call `analyze`, render
  `f0` and `AvMin`/`ratio`. For Wien (and optionally phase-shift) draw
  `bodePlot(plotHost, wienBetaPoints(R, C))`; for LC types show a short note that
  the plot applies to RC types. Mirror `fet-amp/module.ts` wiring.

```ts
export const module: Module = {
  id: 'oscillator',
  title: 'Sinusoidal Oscillators',
  course: 'Elektronica1B',
  description: 'Wien / phase-shift / Colpitts / Hartley oscillators: f0 and gain condition.',
  icon: '~',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as oscillator }
  from './modules/oscillator/module.ts';` and append `oscillator`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/oscillator/module.ts src/registry.ts
git commit -m "feat(modules): sinusoidal oscillator analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('oscillator module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'oscillator');
  assert.ok(m && m.course === 'Elektronica1B', 'oscillator missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching type swaps inputs and
  `f0`; Wien β-plot shows the phase-zero crossing at `f0`.
- [ ] **Step 3: README** — append:
  `- **Sinusoidal Oscillators** — Wien, phase-shift, Colpitts, Hartley: f0 and gain condition.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Sinusoidal Oscillators module: Wien, phase-shift, Colpitts, and Hartley f0 with Barkhausen gain condition.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: oscillator smoke test, README, changelog"
```
