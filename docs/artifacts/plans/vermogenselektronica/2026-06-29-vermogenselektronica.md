# Vermogenselektronica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Vermogenselektronica course to werkbank: one shared converter math library and five SMPS modules (buck, boost, buck-boost, flyback, forward).

**Architecture:** Pure math in `src/math/converter.ts` (per-topology `design()` + `waveform()`). Each module follows the existing pid-tuner skeleton — sliders/polyInputs → readouts → uPlot line plot of one switching period. Five registry entries, one folder each. CCM-only in v1. No new dependencies.

**Tech Stack:** Vanilla TypeScript strict ES2022 ESM, Vite 5, uPlot 1.6, node `--test`.

**Spec:** `docs/artifacts/specs/vermogenselektronica/2026-06-29-vermogenselektronica-design.md`

---

## Phase 1: Math library

### Task 1: `converter.ts` with buck + boost, plus tests

**Files:**
- Create: `src/math/converter.ts`
- Create: `tests/math/converter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designBuck, designBoost, type SmpsInputs } from '../../src/math/converter.ts';

const base: SmpsInputs = { Vin: 24, Vout: 12, Iout: 2, fsw: 100e3, L: 47e-6, C: 22e-6, rdsOn: 0.05, vf: 0.7 };

test('buck: D = Vout/Vin (CCM)', () => {
  const d = designBuck(base);
  assert.ok(Math.abs(d.D - 0.5) < 1e-9, `D=${d.D}`);
});

test('buck: deltaIL when switch closed equals (Vin-Vout)*D/(L*fsw)', () => {
  const d = designBuck(base);
  const expected = (24 - 12) * 0.5 / (47e-6 * 100e3);
  assert.ok(Math.abs(d.deltaIL - expected) / expected < 1e-9, `deltaIL=${d.deltaIL} expected=${expected}`);
});

test('buck: deltaVout equals deltaIL / (8 * fsw * C)', () => {
  const d = designBuck(base);
  const expected = d.deltaIL / (8 * 100e3 * 22e-6);
  assert.ok(Math.abs(d.deltaVout - expected) / expected < 1e-9, `deltaVout=${d.deltaVout} expected=${expected}`);
});

test('boost: D = 1 - Vin/Vout (CCM)', () => {
  const d = designBoost(base);
  // Vin=24, Vout=12 → boost cannot hit Vout<Vin; use a valid combo:
  const d2 = designBoost({ ...base, Vin: 12, Vout: 24 });
  assert.ok(Math.abs(d2.D - 0.5) < 1e-9, `D=${d2.D}`);
  assert.throws(() => designBuck({ ...base, Vout: 36 }), /Vout>Vin/);
});

test('boost: deltaIL = Vin*D/(L*fsw)', () => {
  const d = designBoost({ ...base, Vin: 12, Vout: 24 });
  const expected = 12 * 0.5 / (47e-6 * 100e3);
  assert.ok(Math.abs(d.deltaIL - expected) / expected < 1e-9);
});

test('efficiency accounts for conduction loss', () => {
  // approximate: Pcond = IswRms^2 * RdsOn + IdAvg * Vf; not exact, just sane bounds
  const d = designBuck(base);
  assert.ok(d.efficiency > 0.5 && d.efficiency < 1.0, `eta=${d.efficiency}`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/math/converter.test.ts`
Expected: fail with "Cannot find module" (converter.ts does not exist yet).

- [ ] **Step 3: Implement `src/math/converter.ts` (buck + boost only)**

```ts
export interface SmpsInputs {
  Vin: number;
  Vout: number;
  Iout: number;
  fsw: number;
  L: number;
  C: number;
  rdsOn: number;
  vf: number;
}

export interface ConverterDesign {
  D: number;
  deltaIL: number;
  deltaVout: number;
  iLpeak: number;
  iLrms: number;
  iSwitchPeak: number;
  iSwitchRms: number;
  iDiodeAvg: number;
  efficiency: number;
}

function conductionLosses(d: { iSwitchRms: number; iDiodeAvg: number; rdsOn: number; vf: number }): number {
  return d.iSwitchRms ** 2 * d.rdsOn + d.iDiodeAvg * d.vf;
}

export function designBuck(inp: SmpsInputs): ConverterDesign {
  if (!(inp.Vin > 0 && inp.Vout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) {
    throw new Error('invalid input');
  }
  if (inp.Vout >= inp.Vin) throw new Error('buck requires Vout<Vin');
  const D = inp.Vout / inp.Vin;
  const deltaIL = (inp.Vin - inp.Vout) * D / (inp.L * inp.fsw);
  const deltaVout = deltaIL / (8 * inp.fsw * inp.C);
  const IL = inp.Iout;
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL * (1 - D);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (inp.Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export function designBoost(inp: SmpsInputs): ConverterDesign {
  if (!(inp.Vin > 0 && inp.Vout > 0 && inp.Vout > inp.Vin && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.rdsOn >= 0 && inp.vf >= 0)) {
    throw new Error('invalid input');
  }
  const D = 1 - inp.Vin / inp.Vout;
  const deltaIL = inp.Vin * D / (inp.L * inp.fsw);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw); // boost ripple is a simplified textbook form
  const IL = inp.Iout / (1 - D);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = inp.Iout;
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (inp.Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/math/converter.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/math/converter.ts tests/math/converter.test.ts
git commit -m "feat(smps): buck + boost math layer with tests"
```

---

### Task 2: Add buck-boost, flyback, forward to converter.ts

**Files:**
- Modify: `src/math/converter.ts`
- Modify: `tests/math/converter.test.ts`

- [ ] **Step 1: Add failing tests for the three remaining topologies**

Append to `tests/math/converter.test.ts`:

```ts
import { designBuckBoost, designFlyback, designForward } from '../../src/math/converter.ts';

test('buckboost: D = |Vout|/(|Vout|+Vin) when Vout = -Vout_target', () => {
  // Buck-boost inverts polarity; treat Vout as magnitude of negative rail.
  const d = designBuckBoost({ ...base, Vin: 12, Vout: 12 }); // |-12| = 12
  assert.ok(Math.abs(d.D - 12 / (12 + 12)) < 1e-9, `D=${d.D}`);
});

test('flyback: D = Vout / (Vin * n) where n=Ns/Np', () => {
  const d = designFlyback({ ...base, Vin: 24, Vout: 12, turnsRatio: 0.5 }); // n=0.5
  assert.ok(Math.abs(d.D - 12 / (24 * 0.5)) < 1e-9, `D=${d.D}`);
});

test('forward: D = Vout*n / Vin (n=Ns/Np) and clamps to 0.45', () => {
  const d = designForward({ ...base, Vin: 24, Vout: 12, turnsRatio: 1 });
  assert.ok(Math.abs(d.D - 0.5) < 1e-9);
  // clamp kicks in below
  const d2 = designForward({ ...base, Vin: 24, Vout: 24, turnsRatio: 1 });
  assert.ok(d2.D === 0.45, `clamp D=${d2.D}`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/math/converter.test.ts`
Expected: 3 new tests fail (`designBuckBoost`, `designFlyback`, `designForward` not exported).

- [ ] **Step 3: Add the three topology functions**

Add to `src/math/converter.ts` (below `designBoost`):

```ts
export function designBuckBoost(inp: SmpsInputs): ConverterDesign {
  const Vin = inp.Vin, Vout = inp.Vout; // Vout = |Vout_magnitude|
  if (!(Vin > 0 && Vout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0)) throw new Error('invalid input');
  const D = Vout / (Vout + Vin);
  const IL = inp.Iout * (Vin + Vout) / Vin;
  const deltaIL = Vin * D / (inp.L * inp.fsw);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL * (1 - D);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export interface IsolatedInputs extends SmpsInputs { turnsRatio: number; }

export function designFlyback(inp: IsolatedInputs): ConverterDesign {
  const { Vin, Vout } = inp;
  if (!(Vin > 0 && Vout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.turnsRatio > 0)) throw new Error('invalid input');
  const n = inp.turnsRatio; // Ns/Np
  const D = Vout / (Vin * n);
  if (!(D > 0 && D < 1)) throw new Error('D out of range; check turnsRatio');
  const ILp = (inp.Iout * (1 + D)) / (n * (1 - D));
  const deltaIL = Vin * D / (inp.L * inp.fsw);
  const iSwitchPeak = ILp + deltaIL / 2;
  const iLrms = Math.sqrt(ILp * ILp + (deltaIL * deltaIL) / 12);
  const iDiodeAvg = inp.Iout;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const deltaVout = inp.Iout * D / (inp.C * inp.fsw);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak: iSwitchPeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}

export function designForward(inp: IsolatedInputs): ConverterDesign {
  const { Vin, Vout } = inp;
  if (!(Vin > 0 && Vout > 0 && inp.fsw > 0 && inp.L > 0 && inp.C > 0 && inp.turnsRatio > 0)) throw new Error('invalid input');
  const n = inp.turnsRatio;
  const D = Math.min(0.45, (Vout * n) / Vin);
  const IL = inp.Iout;
  const deltaIL = (Vin - Vout / n) * D / (inp.L * inp.fsw);
  const iLpeak = IL + deltaIL / 2;
  const iLrms = Math.sqrt(IL * IL + (deltaIL * deltaIL) / 12);
  const iSwitchPeak = iLpeak;
  const iSwitchRms = iLrms * Math.sqrt(D);
  const iDiodeAvg = IL;
  const deltaVout = deltaIL / (8 * inp.fsw * inp.C);
  const eta = 1 - conductionLosses({ iSwitchRms, iDiodeAvg, rdsOn: inp.rdsOn, vf: inp.vf }) / (Vout * inp.Iout);
  return { D, deltaIL, deltaVout, iLpeak, iLrms, iSwitchPeak, iSwitchRms, iDiodeAvg, efficiency: Math.max(0, Math.min(1, eta)) };
}
```

- [ ] **Step 4: Run all converter tests**

Run: `npm test -- tests/math/converter.test.ts`
Expected: all 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/math/converter.ts tests/math/converter.test.ts
git commit -m "feat(smps): buckboost + flyback + forward math"
```

---

### Task 3: Add `waveform()` helper for plot data

**Files:**
- Modify: `src/math/converter.ts`
- Modify: `tests/math/converter.test.ts`

- [ ] **Step 1: Write a failing test for `waveform`**

Append to `tests/math/converter.test.ts`:

```ts
import { waveform } from '../../src/math/converter.ts';

test('waveform: buck returns N samples covering [0, T]', () => {
  const w = waveform('buck', { ...base }, 64);
  assert.equal(w.length, 64);
  assert.equal(w[0]!.t, 0);
  assert.ok(Math.abs(w[63]!.t - 1 / 100e3) < 1e-12);
});

test('waveform: buck Vswitch is Vin during on (0..DT) and 0 during off', () => {
  const w = waveform('buck', { ...base }, 100);
  const D = 0.5, T = 1 / 100e3;
  for (const p of w) {
    if (p.t < D * T) assert.ok(Math.abs(p.vSwitch - base.Vin) < 1e-6, `vSwitch at on=${p.vSwitch}`);
    else assert.ok(Math.abs(p.vSwitch) < 1e-6, `vSwitch at off=${p.vSwitch}`);
  }
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- tests/math/converter.test.ts`
Expected: 2 new tests fail (`waveform` not exported).

- [ ] **Step 3: Implement `waveform`**

Add to `src/math/converter.ts`:

```ts
export type Topology = 'buck' | 'boost' | 'buckboost' | 'flyback' | 'forward';

export function waveform(top: Topology, inp: SmpsInputs, n = 128): { t: number; vSwitch: number; iL: number }[] {
  const T = 1 / inp.fsw;
  const d = top === 'buck' ? designBuck(inp) : top === 'boost' ? designBoost(inp)
           : top === 'buckboost' ? designBuckBoost(inp) : top === 'flyback' ? designFlyback(inp as IsolatedInputs)
           : designForward(inp as IsolatedInputs);
  const IL = (top === 'flyback') ? inp.Iout / inp.turnsRatio : (top === 'boost' || top === 'buckboost') ? inp.Iout / (1 - d.D) : inp.Iout;
  const { D } = d;
  const out: { t: number; vSwitch: number; iL: number }[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * T;
    const on = t < D * T;
    const fracOn = on ? t / (D * T) : (t - D * T) / ((1 - D) * T);
    let vSwitch: number;
    if (top === 'buck') vSwitch = on ? inp.Vin : 0;
    else if (top === 'boost') vSwitch = on ? 0 : inp.Vout + inp.vf;
    else if (top === 'buckboost') vSwitch = on ? inp.Vin : 0;
    else vSwitch = on ? inp.Vin : 0; // flyback/forward: simplified — switch sees Vin during on
    const iL = on ? IL - d.deltaIL / 2 + d.deltaIL * fracOn : IL + d.deltaIL / 2 - d.deltaIL * fracOn;
    out.push({ t, vSwitch, iL });
  }
  return out;
}
```

- [ ] **Step 4: Run all converter tests**

Run: `npm test -- tests/math/converter.test.ts`
Expected: all 11 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/math/converter.ts tests/math/converter.test.ts
git commit -m "feat(smps): waveform helper for one switching period"
```

---

## Phase 2: Five module files

> All five modules follow the same skeleton. Each task below is independent — do them in any order after Phase 1.

### Task 4: `smps-buck` module

**Files:**
- Create: `src/modules/smps-buck/module.ts`

- [ ] **Step 1: Implement the module**

```ts
import type { Module } from '../../module.ts';
import { designBuck, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 1, 100, 0.5, 24);
  const vout = slider('Vout (V)', 1, 50, 0.5, 12);
  const iout = slider('Iout (A)', 0.1, 10, 0.1, 2);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('L (µH)', 1, 1000, 1, 47);
  const C = slider('C (µF)', 1, 1000, 1, 22);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
    };
    let d;
    try { d = designBuck(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('buck', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iL (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)}</div>
      <div><b>ΔiL:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>ΔVout:</b> ${(d.deltaVout * 1e3).toFixed(2)} mV</div>
      <div><b>Isw,peak:</b> ${d.iSwitchPeak.toFixed(2)} A</div>
      <div><b>Isw,rms:</b> ${d.iSwitchRms.toFixed(2)} A</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-buck', title: 'Buck Converter', course: 'Vermogenselektronica',
  description: 'Step-down SMPS: duty, ripple, currents, efficiency.',
  icon: '↓', render,
};
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/smps-buck/module.ts
git commit -m "feat(smps): buck converter module"
```

---

### Task 5: `smps-boost` module

**Files:**
- Create: `src/modules/smps-boost/module.ts`

- [ ] **Step 1: Implement the module**

```ts
import type { Module } from '../../module.ts';
import { designBoost, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 1, 50, 0.5, 12);
  const vout = slider('Vout (V)', 2, 100, 0.5, 24);
  const iout = slider('Iout (A)', 0.1, 10, 0.1, 1);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('L (µH)', 1, 1000, 1, 47);
  const C = slider('C (µF)', 1, 1000, 1, 22);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
    };
    let d;
    try { d = designBoost(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('boost', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iL (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)}</div>
      <div><b>ΔiL:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>ΔVout:</b> ${(d.deltaVout * 1e3).toFixed(2)} mV</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-boost', title: 'Boost Converter', course: 'Vermogenselektronica',
  description: 'Step-up SMPS: duty, ripple, currents, efficiency.',
  icon: '↑', render,
};
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/smps-boost/module.ts
git commit -m "feat(smps): boost converter module"
```

---

### Task 6: `smps-buckboost` module

**Files:**
- Create: `src/modules/smps-buckboost/module.ts`

- [ ] **Step 1: Implement the module**

```ts
import type { Module } from '../../module.ts';
import { designBuckBoost, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 1, 50, 0.5, 12);
  const vout = slider('|Vout| (V)', 2, 50, 0.5, 12);
  const iout = slider('Iout (A)', 0.1, 10, 0.1, 1);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('L (µH)', 1, 1000, 1, 47);
  const C = slider('C (µF)', 1, 1000, 1, 22);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
    };
    let d;
    try { d = designBuckBoost(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('buckboost', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iL (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)}</div>
      <div><b>ΔiL:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
      <div><i>Output polarity is inverted.</i></div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-buckboost', title: 'Buck-Boost (inverting)', course: 'Vermogenselektronica',
  description: 'Inverting SMPS: Vout magnitude, duty, ripple, efficiency.',
  icon: '±', render,
};
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/smps-buckboost/module.ts
git commit -m "feat(smps): buck-boost (inverting) module"
```

---

### Task 7: `smps-flyback` module

**Files:**
- Create: `src/modules/smps-flyback/module.ts`

- [ ] **Step 1: Implement the module**

```ts
import type { Module } from '../../module.ts';
import { designFlyback, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 5, 100, 0.5, 24);
  const vout = slider('Vout (V)', 1, 50, 0.5, 12);
  const iout = slider('Iout (A)', 0.1, 5, 0.1, 1);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('Lp (µH)', 10, 1000, 5, 100);
  const C = slider('C (µF)', 1, 1000, 1, 47);
  const n = slider('Ns/Np', 0.1, 5, 0.1, 0.5);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, n, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
      turnsRatio: n.value(),
    };
    let d;
    try { d = designFlyback(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('flyback', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iLp (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)}</div>
      <div><b>ΔiLp:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, n, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-flyback', title: 'Flyback Converter', course: 'Vermogenselektronica',
  description: 'Isolated SMPS: turns ratio, duty, ripple, efficiency.',
  icon: '🔌', render,
};
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/smps-flyback/module.ts
git commit -m "feat(smps): flyback converter module"
```

---

### Task 8: `smps-forward` module

**Files:**
- Create: `src/modules/smps-forward/module.ts`

- [ ] **Step 1: Implement the module**

```ts
import type { Module } from '../../module.ts';
import { designForward, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 5, 200, 0.5, 48);
  const vout = slider('Vout (V)', 1, 50, 0.5, 12);
  const iout = slider('Iout (A)', 0.1, 10, 0.1, 2);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('L (µH)', 1, 1000, 1, 47);
  const C = slider('C (µF)', 1, 1000, 1, 22);
  const n = slider('Ns/Np', 0.1, 2, 0.05, 0.5);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, n, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
      turnsRatio: n.value(),
    };
    let d;
    try { d = designForward(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('forward', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iL (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)} <i>(clamped to 0.45 max)</i></div>
      <div><b>ΔiL:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>ΔVout:</b> ${(d.deltaVout * 1e3).toFixed(2)} mV</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, n, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-forward', title: 'Forward Converter', course: 'Vermogenselektronica',
  description: 'Isolated SMPS (non-flying): D clamp, duty, ripple, efficiency.',
  icon: '→', render,
};
```

- [ ] **Step 2: Type-check and build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/modules/smps-forward/module.ts
git commit -m "feat(smps): forward converter module"
```

---

## Phase 3: Wire it up

### Task 9: Register all five modules

**Files:**
- Modify: `src/registry.ts`

- [ ] **Step 1: Add the five imports and entries**

Replace the contents of `src/registry.ts` with:

```ts
import type { Module } from './module.ts';
import { module as transferFn } from './modules/transfer-fn/module.ts';
import { module as pidTuner } from './modules/pid-tuner/module.ts';
import { module as routhHurwitz } from './modules/routh-hurwitz/module.ts';
import { module as fourierSeries } from './modules/fourier-series/module.ts';
import { module as bjtAmp } from './modules/bjt-amp/module.ts';
import { module as bjtDc } from './modules/bjt-dc/module.ts';
import { module as diodeShaping } from './modules/diode-shaping/module.ts';
import { module as fetAmp } from './modules/fet-amp/module.ts';
import { module as opamp } from './modules/opamp/module.ts';
import { module as multistage } from './modules/multistage/module.ts';
import { module as diffAmp } from './modules/diff-amp/module.ts';
import { module as feedback } from './modules/feedback/module.ts';
import { module as freqResponse } from './modules/freq-response/module.ts';
import { module as activeFilter } from './modules/active-filter/module.ts';
import { module as powerAmp } from './modules/power-amp/module.ts';
import { module as oscillator } from './modules/oscillator/module.ts';
import { module as comparator } from './modules/comparator/module.ts';
import { module as smpsBuck } from './modules/smps-buck/module.ts';
import { module as smpsBoost } from './modules/smps-boost/module.ts';
import { module as smpsBuckBoost } from './modules/smps-buckboost/module.ts';
import { module as smpsFlyback } from './modules/smps-flyback/module.ts';
import { module as smpsForward } from './modules/smps-forward/module.ts';

export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp, oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward];
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: passes; new cards render in the home grid (verify by running `npm run dev` and clicking each new card).

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass (smoke + math).

- [ ] **Step 4: Commit**

```bash
git add src/registry.ts
git commit -m "feat(smps): register all five converter modules"
```

---

### Task 10: README + AGENTS.md course list

**Files:**
- Modify: `README.md` (if it lists courses)
- Modify: `AGENTS.md`

- [ ] **Step 1: Check whether README lists courses**

Run: `rg -n "Regeltechniek|Elektronica" README.md AGENTS.md`
If neither file mentions course names, skip to Step 3.

- [ ] **Step 2: Add Vermogenselektronica to the courses list** (only if Step 1 found references)

Example edit for AGENTS.md (line ~7):
```
- v1: Regeltechniek + Fourier
+ v1: Regeltechniek + Fourier + Vermogenselektronica (SMPS)
```

- [ ] **Step 3: Build one more time as sanity check**

Run: `npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: list Vermogenselektronica course"
```

---

## Verification

- [ ] All five SMPS modules render and respond to slider input.
- [ ] Each module's readouts update on slider change.
- [ ] Changing Vin/Vout outside validity shows an error message, not a crash.
- [ ] `npm test` passes (smoke + all math).
- [ ] `npm run build` passes.
- [ ] The home grid shows the five new Vermogenselektronica cards.
