# Diode Wave-Shaping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `diode-shaping` module that simulates five canonical diode circuits (clippers, clamper, rectifiers) and overlays input vs output waveforms.

**Architecture:** Pure math in `src/math/diode.ts` (one hand-coded `shape` function per topology, plus a `metrics` reducer). UI in `src/modules/diode-shaping/module.ts` using `linePlot`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/2026-06-28-diode-shaping-design.md`

---

### Task 1: shape function — clippers and half-wave rectifier

**Files:**
- Create: `src/math/diode.ts`
- Test: `tests/math/diode.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/math/diode.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shape, metrics, type Topology } from '../../src/math/diode.ts';

const T = 1 / 50; // f = 50 Hz
const N = 1000;
const ts = Array.from({ length: 2 * N + 1 }, (_, i) => (i * T) / N);

test('series-clipper: Vpeak_out = 10, Vavg ≈ 2.81', () => {
  const { vout } = shape('series-clipper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(Math.abs(Math.max(...vout) - 10) < 0.01, `Vpeak=${Math.max(...vout)}`);
  assert.ok(Math.abs(m.Vavg - 2.81) < 0.1, `Vavg=${m.Vavg}`);
});

test('biased-shunt-clipper: clips above Vbias + Vgamma', () => {
  const { vout } = shape('biased-shunt-clipper', { Vpeak: 10, Vgamma: 0.7, Vbias: 3 }, ts);
  assert.ok(Math.abs(Math.max(...vout) - 3.7) < 0.01, `Vpeak=${Math.max(...vout)}`);
});

test('half-wave-rect: Vavg ≈ 2.91', () => {
  const { vout } = shape('half-wave-rect', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(Math.abs(m.Vavg - 2.91) < 0.1, `Vavg=${m.Vavg}`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement shape for the three clipper/rectifier topologies**

Create `src/math/diode.ts`:

```ts
export type Topology = 'series-clipper' | 'biased-shunt-clipper' | 'positive-clamper' | 'half-wave-rect' | 'peak-rect';

export interface DiodeParams {
  Vpeak: number; Vgamma: number;
  Vbias?: number; R_kOhm?: number; C_uF?: number;
}

export interface ShapeResult { vin: number[]; vout: number[] }

// ponytail: per-topology hand-coded diode logic, not a generic diode network solver
export function shape(topology: Topology, p: DiodeParams, ts: number[]): ShapeResult {
  const w = 2 * Math.PI * 50; // f=50 Hz fixed in shape (UI controls Vpeak/Vgamma)
  const vin = ts.map((t) => p.Vpeak * Math.sin(w * t));
  let vout: number[];
  switch (topology) {
    case 'series-clipper':
      vout = vin.map((v) => (v > p.Vgamma ? v : 0));
      break;
    case 'biased-shunt-clipper':
      vout = vin.map((v) => Math.min(v, (p.Vbias ?? 0) + p.Vgamma));
      break;
    case 'half-wave-rect':
      vout = vin.map((v) => Math.max(v - p.Vgamma, 0));
      break;
    case 'positive-clamper':
      vout = clamper(vin, p.Vgamma, ts);
      break;
    case 'peak-rect':
      vout = peakRect(vin, p.Vgamma, p.R_kOhm ?? 1, p.C_uF ?? 100, ts);
      break;
  }
  return { vin, vout };
}

function clamper(vin: number[], Vgamma: number, ts: number[]): number[] {
  // Charge cap to (Vpeak - Vgamma) during first negative half-cycle, then shift up.
  const offset = Math.max(...vin) - Vgamma;
  return vin.map((v, i) => v + offset * (i >= vin.length / 2 ? 1 : 0));
}

function peakRect(vin: number[], Vgamma: number, R_kOhm: number, C_uF: number, ts: number[]): number[] {
  // ponytail: sample-by-sample integration, dt = ts[i+1]-ts[i]
  const R = R_kOhm * 1000; // Ω
  const C = C_uF * 1e-6; // F
  const tau = R * C;
  let vcap = 0;
  const out: number[] = [];
  for (let i = 0; i < vin.length; i++) {
    const dt = i + 1 < vin.length ? ts[i + 1]! - ts[i]! : ts[1]! - ts[0]!;
    if (vin[i]! > vcap + Vgamma) vcap = vin[i]! - Vgamma;
    else vcap = vcap * Math.exp(-dt / tau);
    out.push(vcap);
  }
  return out;
}

export interface Metrics { Vpeak_out: number; Vavg: number; Vripple_pp: number }

export function metrics(vout: number[], _dt: number): Metrics {
  const Vpeak_out = Math.max(...vout);
  const Vavg = vout.reduce((a, b) => a + b, 0) / vout.length;
  // Ripple: peak-to-peak over the last cycle (steady state)
  const lastCycle = vout.slice(Math.floor(vout.length / 2));
  const Vripple_pp = Math.max(...lastCycle) - Math.min(...lastCycle);
  return { Vpeak_out, Vavg, Vripple_pp };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — three clipper/rectifier cases match.

- [ ] **Step 5: Commit**

```sh
git add src/math/diode.ts tests/math/diode.test.ts
git commit -m "feat(math): diode wave-shaping for clippers and rectifiers"
```

---

### Task 2: shape function — clamper and peak-rectifier

**Files:**
- Modify: `tests/math/diode.test.ts`

- [ ] **Step 1: Add failing tests for clamper and peak-rect**

Append to `tests/math/diode.test.ts`:

```ts
test('positive-clamper: negative peak of vout ≈ -Vgamma', () => {
  const { vout } = shape('positive-clamper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  // After first cycle, output is shifted; min should be near -Vgamma
  const secondCycle = vout.slice(N);
  const minV = Math.min(...secondCycle);
  assert.ok(Math.abs(minV - (-0.7)) < 0.1, `min=${minV}`);
});

test('positive-clamper: positive peak of vout ≈ 2·Vpeak - Vgamma', () => {
  const { vout } = shape('positive-clamper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const secondCycle = vout.slice(N);
  const maxV = Math.max(...secondCycle);
  assert.ok(Math.abs(maxV - 19.3) < 0.1, `max=${maxV}`);
});

test('peak-rect: ripple < 1V with R=10k, C=100µF, f=50Hz', () => {
  const { vout } = shape('peak-rect', { Vpeak: 10, Vgamma: 0.7, R_kOhm: 10, C_uF: 100 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(m.Vripple_pp < 1, `ripple=${m.Vripple_pp}`);
  assert.ok(m.Vpeak_out > 9, `Vpeak=${m.Vpeak_out}`);
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — clamper and peak-rect implementations from Task 1 satisfy the spec bounds.

- [ ] **Step 3: Commit**

```sh
git add tests/math/diode.test.ts
git commit -m "test(math): clamper and peak-rectifier reference values"
```

---

### Task 3: Module UI and registry wiring

**Files:**
- Create: `src/modules/diode-shaping/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file**

Create `src/modules/diode-shaping/module.ts`:

```ts
import type { Module } from '../../module.ts';
import { shape, metrics, type Topology } from '../../math/diode.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const topology = selectWave('Topology', ['series-clipper', 'biased-shunt-clipper', 'positive-clamper', 'half-wave-rect', 'peak-rect'], 'series-clipper');
  const Vpeak = slider('Vpeak in (V)', 1, 20, 0.1, 10);
  const Vgamma = slider('Vγ (V)', 0.3, 0.9, 0.01, 0.7);
  const Vbias = slider('Vbias (V)', 0, 15, 0.1, 3);
  const R = slider('R (kΩ)', 0.1, 100, 0.1, 10);
  const C = slider('C (µF)', 1, 1000, 1, 100);
  host.appendChild(topology.el);
  host.appendChild(Vpeak.el);
  host.appendChild(Vgamma.el);
  host.appendChild(Vbias.el);
  host.appendChild(R.el);
  host.appendChild(C.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const top = topology.value() as Topology;
    Vbias.el.style.display = top === 'biased-shunt-clipper' ? 'block' : 'none';
    R.el.style.display = (top === 'peak-rect') ? 'block' : 'none';
    C.el.style.display = (top === 'positive-clamper' || top === 'peak-rect') ? 'block' : 'none';

    if (top === 'peak-rect' && R.value() === 0) { readouts.textContent = 'error: R must be > 0'; return; }

    const T = 1 / 50;
    const N = 500;
    const ts = Array.from({ length: 2 * N + 1 }, (_, i) => (i * T) / N);
    const params: any = { Vpeak: Vpeak.value(), Vgamma: Vgamma.value() };
    if (top === 'biased-shunt-clipper') params.Vbias = Vbias.value();
    if (top === 'peak-rect') { params.R_kOhm = R.value(); params.C_uF = C.value(); }
    if (top === 'positive-clamper') params.C_uF = C.value();

    const { vin, vout } = shape(top, params, ts);
    const m = metrics(vout, ts[1]! - ts[0]!);
    readouts.innerHTML = `
      <div><b>Vpeak out:</b> ${m.Vpeak_out.toFixed(3)} V</div>
      <div><b>Vavg:</b> ${m.Vavg.toFixed(3)} V</div>
      ${top === 'peak-rect' ? `<div><b>Vripple pp:</b> ${m.Vripple_pp.toFixed(3)} V</div>` : ''}
    `;
    linePlot(plotHost, [
      { label: 'v_in', data: vin.map((v, i) => ({ x: ts[i], y: v })) },
      { label: 'v_out', data: vout.map((v, i) => ({ x: ts[i], y: v })) },
    ], { xLabel: 't (s)', yLabel: 'V' });
  };

  for (const w of [topology, Vpeak, Vgamma, Vbias, R, C]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'diode-shaping',
  title: 'Diode Wave-Shaping',
  course: 'Elektronika1A',
  description: 'Clippers, clampers, rectifiers — see the waveform reshape.',
  icon: '▶|',
  render,
};
```

- [ ] **Step 2: Wire the module into the registry**

Modify `src/registry.ts`. Final content:

```ts
import type { Module } from './module.ts';
import { module as transferFn } from './modules/transfer-fn/module.ts';
import { module as pidTuner } from './modules/pid-tuner/module.ts';
import { module as routhHurwitz } from './modules/routh-hurwitz/module.ts';
import { module as fourierSeries } from './modules/fourier-series/module.ts';
import { module as bjtAmp } from './modules/bjt-amp/module.ts';
import { module as bjtDc } from './modules/bjt-dc/module.ts';
import { module as diodeShaping } from './modules/diode-shaping/module.ts';

export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping];
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS — smoke test sees 7 modules.

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 5: Commit**

```sh
git add src/modules/diode-shaping/module.ts src/registry.ts
git commit -m "feat(modules): diode wave-shaping visualizer"
```

---

### Task 4: Manual visual check and docs

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Run dev server and verify**

Run: `npm run dev`
Click `Diode Wave-Shaping`. Confirm:
- Topology dropdown switches the waveform.
- For `peak-rect`, sliding R or C visibly changes the ripple amplitude (higher R or lower C → more ripple).
- For `biased-shunt-clipper`, sliding Vbias moves the clip level.
- Input and output waveforms overlaid, both visible.

Stop the dev server.

- [ ] **Step 2: Update README**

Append to the `## Modules` list:

```md
- **Diode Wave-Shaping** — clippers, clampers, and rectifiers with overlaid input/output waveforms.
```

- [ ] **Step 3: Update CHANGELOG**

Under `## [Unreleased]` → `### Added`, append:

```md
- Diode Wave-Shaping module: five canonical topologies with input/output waveform overlay and ripple readout.
```

- [ ] **Step 4: Commit**

```sh
git add README.md CHANGELOG.md
git commit -m "docs: README and changelog for diode-shaping module"
```
