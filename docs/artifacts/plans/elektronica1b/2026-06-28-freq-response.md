# Amplifier Frequency Response Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `freq-response` module: single-stage CE/CS frequency response
(`fL`, `fH`, midband gain, Bode plot) via the Miller approximation.

**Architecture:** Pure math in `src/math/freqresp.ts`. UI in
`src/modules/freq-response/module.ts` using the foundation `bodePlot`. One line
in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `bodePlot`.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-freq-response-design.md`

> **Depends on foundation** (`src/math/complex.ts`, `src/ui/acplot.ts`). Start
> only after the foundation plan is merged.
> **Parallel-dispatch note:** the registry smoke test asserts the module is
> present **by id**, not by total module count.

---

### Task 1: Corner-frequency + midband math

**Files:**
- Create: `src/math/freqresp.ts`
- Create: `tests/math/freqresp.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/freqresp.ts';

const P = {
  gm_mS: 40, Rsig_kOhm: 0.6, Rin_kOhm: 2.5, RC_kOhm: 5, RL_kOhm: 10,
  Cpi_pF: 10, Cmu_pF: 2, C1_uF: 1, C2_uF: 1,
};

test('midband gain ≈ -133.3', () => {
  assert.ok(Math.abs(analyze(P).Amid - -133.3) < 0.5, `Amid=${analyze(P).Amid}`);
});
test('AmidDb ≈ 42.5', () => {
  assert.ok(Math.abs(analyze(P).AmidDb - 42.5) < 0.2, `dB=${analyze(P).AmidDb}`);
});
test('fH ≈ 1.18 MHz', () => {
  const fH = analyze(P).fH_Hz;
  assert.ok(Math.abs(fH - 1.18e6) / 1.18e6 < 0.02, `fH=${fH}`);
});
test('fL ≈ 51.3 Hz (input coupling dominates)', () => {
  const fL = analyze(P).fL_Hz;
  assert.ok(Math.abs(fL - 51.3) / 51.3 < 0.02, `fL=${fL}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/freqresp.ts`**

```ts
export interface FreqRespParams {
  gm_mS: number; Rsig_kOhm: number; Rin_kOhm: number; RC_kOhm: number; RL_kOhm: number;
  Cpi_pF: number; Cmu_pF: number; C1_uF: number; C2_uF: number;
}
export interface FreqRespResult {
  Amid: number; AmidDb: number; fL_Hz: number; fH_Hz: number; BW_Hz: number;
}

const par = (a: number, b: number) => (a * b) / (a + b);
const TWO_PI = 2 * Math.PI;

export function analyze(p: FreqRespParams): FreqRespResult {
  const RLp = par(p.RC_kOhm, p.RL_kOhm);
  const Amid = -p.gm_mS * RLp; // mS·kΩ = unitless
  const Cin = p.Cpi_pF + p.Cmu_pF * (1 + Math.abs(Amid)); // pF
  const Rth = par(p.Rsig_kOhm, p.Rin_kOhm); // kΩ
  const fH = 1e9 / (TWO_PI * Rth * Cin); // kΩ·pF → Hz
  const fL1 = 1e3 / (TWO_PI * (p.Rsig_kOhm + p.Rin_kOhm) * p.C1_uF); // kΩ·µF → Hz
  const fL2 = 1e3 / (TWO_PI * (p.RC_kOhm + p.RL_kOhm) * p.C2_uF);
  const fL = Math.max(fL1, fL2);
  return { Amid, AmidDb: 20 * Math.log10(Math.abs(Amid)), fL_Hz: fL, fH_Hz: fH, BW_Hz: fH - fL };
}

// Band-pass model points for the Bode plot.
export function bodePoints(p: FreqRespParams, n = 120): { omega: number; magDb: number; phaseDeg: number }[] {
  const { Amid, fL_Hz, fH_Hz } = analyze(p);
  const wL = TWO_PI * fL_Hz, wH = TWO_PI * fH_Hz;
  const lo = Math.log10(wL / 100), hi = Math.log10(wH * 100);
  const out: { omega: number; magDb: number; phaseDeg: number }[] = [];
  for (let i = 0; i < n; i++) {
    const w = 10 ** (lo + ((hi - lo) * i) / (n - 1));
    // H = Amid · (jw/wL)/(1+jw/wL) · 1/(1+jw/wH)
    const xL = w / wL, xH = w / wH;
    const lowMag = xL / Math.hypot(1, xL);
    const highMag = 1 / Math.hypot(1, xH);
    const mag = Math.abs(Amid) * lowMag * highMag;
    const phase = 180 + (90 - (Math.atan(xL) * 180) / Math.PI) - (Math.atan(xH) * 180) / Math.PI;
    out.push({ omega: w, magDb: 20 * Math.log10(mag), phaseDeg: phase });
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/freqresp.ts tests/math/freqresp.test.ts
git commit -m "feat(math): single-stage amplifier frequency response (fL/fH/Miller)"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/freq-response/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file**

```ts
import type { Module } from '../../module.ts';
import { analyze, bodePoints, type FreqRespParams } from '../../math/freqresp.ts';
import { bodePlot } from '../../ui/acplot.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const gm = slider('gm (mS)', 1, 100, 1, 40);
  const Rsig = slider('Rsig (kΩ)', 0, 10, 0.1, 0.6);
  const Rin = slider('Rin (kΩ)', 0.1, 50, 0.1, 2.5);
  const RC = slider('RC (kΩ)', 0.1, 20, 0.1, 5);
  const RL = slider('RL (kΩ)', 0.1, 100, 1, 10);
  const Cpi = slider('Cπ (pF)', 1, 100, 1, 10);
  const Cmu = slider('Cµ (pF)', 0.5, 20, 0.5, 2);
  const C1 = slider('C1 (µF)', 0.01, 10, 0.01, 1);
  const C2 = slider('C2 (µF)', 0.01, 10, 0.01, 1);
  const ws = [gm, Rsig, Rin, RC, RL, Cpi, Cmu, C1, C2];
  for (const w of ws) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const p: FreqRespParams = {
      gm_mS: gm.value(), Rsig_kOhm: Rsig.value(), Rin_kOhm: Rin.value(),
      RC_kOhm: RC.value(), RL_kOhm: RL.value(), Cpi_pF: Cpi.value(), Cmu_pF: Cmu.value(),
      C1_uF: C1.value(), C2_uF: C2.value(),
    };
    const r = analyze(p);
    if (!Number.isFinite(r.fH_Hz) || !Number.isFinite(r.fL_Hz)) {
      readouts.textContent = 'error: non-finite corner frequency'; return;
    }
    readouts.innerHTML = `
      <div><b>Amid:</b> ${r.Amid.toFixed(1)} (${r.AmidDb.toFixed(1)} dB)</div>
      <div><b>fL:</b> ${r.fL_Hz.toFixed(1)} Hz</div>
      <div><b>fH:</b> ${(r.fH_Hz / 1e3).toFixed(1)} kHz</div>
      <div><b>BW:</b> ${(r.BW_Hz / 1e3).toFixed(1)} kHz</div>`;
    bodePlot(plotHost, bodePoints(p));
  };

  for (const w of ws) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
  }
  update();
}

export const module: Module = {
  id: 'freq-response',
  title: 'Amplifier Frequency Response',
  course: 'Elektronica1B',
  description: 'Single-stage amplifier frequency response: fL, fH, midband gain, Bode plot.',
  icon: 'fH',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add the import and append to the
  `modules` array:

```ts
import { module as freqResponse } from './modules/freq-response/module.ts';
// ...append `freqResponse` to the exported `modules` array.
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.

- [ ] **Step 4: Type-check and build** — `npm run build` → passes.

- [ ] **Step 5: Commit**

```sh
git add src/modules/freq-response/module.ts src/registry.ts
git commit -m "feat(modules): amplifier frequency-response analyzer"
```

---

### Task 3: Registry smoke test, manual check, docs

**Files:**
- Modify: `tests/smoke.test.ts`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add a presence-by-id smoke assertion** (parallel-safe — do not
  assert total count) in `tests/smoke.test.ts`:

```ts
test('freq-response module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'freq-response');
  assert.ok(m && m.course === 'Elektronica1B', 'freq-response missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`, open *Amplifier Frequency
  Response*. Confirm the Bode plot updates and `gm` raises midband gain while
  `Cµ` lowers `fH`. Stop the dev server.

- [ ] **Step 3: README** — append to `## Modules`:

```md
- **Amplifier Frequency Response** — single-stage fL/fH/midband gain with a Bode plot.
```

- [ ] **Step 4: CHANGELOG** — under `## [Unreleased]` → `### Added`:

```md
- Amplifier Frequency Response module: single-stage CE/CS fL, fH (Miller), midband gain, and Bode plot.
```

- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: freq-response smoke test, README, changelog"
```
