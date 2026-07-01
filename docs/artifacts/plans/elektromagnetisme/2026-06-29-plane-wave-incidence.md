# Plane-Wave Incidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `plane-wave-incidence` module: Snell's law, Fresnel
coefficients (s/pol and p/pol), critical and Brewster angles, and a
wave-amplitude position plot across a dielectric interface.

**Architecture:** Pure math in `src/math/incidence.ts` (angles in radians).
UI in `src/modules/plane-wave-incidence/module.ts` using `linePlot`. One line
in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-plane-wave-incidence-design.md`

> **No foundation dependency.** Registry smoke test asserts presence **by id**.

---

### Task 1: Incidence algebra

**Files:**
- Create: `src/math/incidence.ts`
- Create: `tests/math/incidence.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  snell,
  fresnelPerp,
  fresnelParallel,
  criticalAngle,
  brewsterAngle,
} from '../../src/math/incidence.ts';

const D = Math.PI / 180; // deg → rad

test('snell: air→glass, 30° → 19.471°', () => {
  const t2 = snell(1, 1.5, 30 * D);
  assert.ok(Math.abs(t2 - 19.471 * D) < 0.01 * D, `t2=${t2 / D}°`);
});

test('fresnelPerp: normal incidence → (n1−n2)/(n1+n2) = −0.2', () => {
  const g = fresnelPerp(1, 1.5, 0);
  assert.ok(Math.abs(g - -0.2) < 1e-9, `g=${g}`);
});

test('fresnelPerp: 30° → ≈ −0.2404', () => {
  const g = fresnelPerp(1, 1.5, 30 * D);
  assert.ok(Math.abs(g - -0.2404) < 1e-3, `g=${g}`);
});

test('fresnelParallel: at Brewster angle → 0', () => {
  const b = brewsterAngle(1, 1.5);
  const g = fresnelParallel(1, 1.5, b);
  assert.ok(Math.abs(g) < 1e-9, `g=${g}`);
});

test('brewsterAngle: air→glass → 56.31°', () => {
  const b = brewsterAngle(1, 1.5);
  assert.ok(Math.abs(b - 56.31 * D) < 0.01 * D, `b=${b / D}°`);
});

test('criticalAngle: glass→air → 41.81°, air→glass → null', () => {
  const c = criticalAngle(1.5, 1);
  assert.ok(c !== null && Math.abs(c - 41.81 * D) < 0.01 * D, `c=${c}`);
  assert.equal(criticalAngle(1, 1.5), null);
});

test('TIR: snell + fresnel return NaN above critical angle', () => {
  // glass→air, θc ≈ 41.81°; 50° exceeds it
  assert.ok(Number.isNaN(snell(1.5, 1, 50 * D)));
  assert.ok(Number.isNaN(fresnelPerp(1.5, 1, 50 * D)));
  assert.ok(Number.isNaN(fresnelParallel(1.5, 1, 50 * D)));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `src/math/incidence.ts`**

```ts
// Plane-wave incidence: Snell's law and Fresnel coefficients.
// All angles in radians. Non-magnetic media (μ₁ = μ₂).

export function snell(n1: number, n2: number, theta1: number): number {
  const s = (n1 / n2) * Math.sin(theta1);
  if (Math.abs(s) > 1) return NaN; // ponytail: TIR → NaN; complex θ₂ not represented
  return Math.asin(s);
}

export function fresnelPerp(n1: number, n2: number, theta1: number): number {
  // Γ⊥ = (n1 cosθ1 − n2 cosθ2) / (n1 cosθ1 + n2 cosθ2)
  const theta2 = snell(n1, n2, theta1);
  if (Number.isNaN(theta2)) return NaN; // ponytail: TIR → |Γ|=1 but complex; signal via NaN
  const c1 = Math.cos(theta1), c2 = Math.cos(theta2);
  return (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
}

export function fresnelParallel(n1: number, n2: number, theta1: number): number {
  // Γ∥ = (n2 cosθ1 − n1 cosθ2) / (n2 cosθ1 + n1 cosθ2)
  const theta2 = snell(n1, n2, theta1);
  if (Number.isNaN(theta2)) return NaN;
  const c1 = Math.cos(theta1), c2 = Math.cos(theta2);
  return (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
}

export function criticalAngle(n1: number, n2: number): number | null {
  if (n1 <= n2) return null; // no TIR when entering a denser medium
  return Math.asin(n2 / n1);
}

export function brewsterAngle(n1: number, n2: number): number {
  return Math.atan(n2 / n1);
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/incidence.ts tests/math/incidence.test.ts
git commit -m "feat(math): Snell's law and Fresnel coefficients for dielectric interface"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/plane-wave-incidence/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders `n₁, n₂, θ₁`, select
  `polarization`. On `update`: compute `θ₂`, `Γ`, `T`, `θc`, `θB`; flag TIR
  (`isNaN(Γ)`) and Brewster (`parallel` and `|Γ| < 0.01`); `linePlot` three
  series (incident / reflected / transmitted) over `x ∈ [−12, 12]`, NaN outside
  each medium. Mirror `feedback/module.ts` wiring.

```ts
import type { Module } from '../../module.ts';
import {
  snell,
  fresnelPerp,
  fresnelParallel,
  criticalAngle,
  brewsterAngle,
} from '../../math/incidence.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const D = Math.PI / 180; // deg → rad

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const n1 = slider('n₁', 1, 2.5, 0.01, 1);
  const n2 = slider('n₂', 1, 2.5, 0.01, 1.5);
  const theta = slider('θ₁ (°)', 0, 89, 0.1, 30);
  const pol = selectWave('Polarization', ['perpendicular', 'parallel'], 'perpendicular');
  for (const w of [n1, n2, theta, pol]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const a = n1.value(), b = n2.value(), th = theta.value() * D;
    const perp = pol.value() === 'perpendicular';
    const theta2 = snell(a, b, th);
    const gamma = perp ? fresnelPerp(a, b, th) : fresnelParallel(a, b, th);
    const tir = Number.isNaN(gamma);
    const T = tir ? 0 : 1 - gamma * gamma;
    const tc = criticalAngle(a, b);
    const tb = brewsterAngle(a, b);

    let flags = '';
    if (tir) flags += ' ⚠ TIR';
    if (!perp && !tir && Math.abs(gamma) < 0.01) flags += ' ⚠ Brewster';

    readouts.innerHTML = `
      <div><b>θ₂:</b> ${Number.isNaN(theta2) ? '— (TIR)' : sig3(theta2 / D) + '°'}</div>
      <div><b>Γ:</b> ${tir ? '|Γ|=1 (TIR)' : sig3(gamma)}</div>
      <div><b>T:</b> ${sig3(T)}${flags}</div>
      <div><b>θc:</b> ${tc === null ? '—' : sig3(tc / D) + '°'}</div>
      <div><b>θB:</b> ${sig3(tb / D) + '°'}</div>
    `;

    // Wave amplitudes vs position. Interface at x=0: medium 1 (x≤0), medium 2 (x≥0).
    const xs = linspace(-12, 12, 400);
    const k1 = a, k2 = b; // ponytail: ω/c = 1, so k = n
    const gPlot = tir ? 1 : gamma; // ponytail: TIR → full reflection |Γ|=1
    const tAmp = tir ? 0 : 1 + gamma; // ponytail: field transmission t=1+Γ (exact s-pol)
    const incident = xs.map((x) => ({ x, y: x <= 0 ? Math.cos(k1 * x) : NaN }));
    const reflected = xs.map((x) => ({ x, y: x <= 0 ? gPlot * Math.cos(k1 * x) : NaN }));
    const transmitted = xs.map((x) => ({ x, y: x >= 0 ? tAmp * Math.cos(k2 * x) : NaN }));
    linePlot(
      plotHost,
      [
        { label: 'Incident', data: incident },
        { label: 'Reflected', data: reflected },
        { label: 'Transmitted', data: transmitted },
      ],
      { xLabel: 'position', yLabel: 'E (a.u.)' },
    );
  };

  for (const w of [n1, n2, theta, pol]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'plane-wave-incidence',
  title: 'Plane-Wave Incidence',
  course: 'Elektromagnetische Velden',
  description: 'Snell\'s law, Fresnel coefficients, critical and Brewster angles at a dielectric interface.',
  icon: 'θ',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add the import after the last
  module import and append `planeWaveIncidence` to the `modules` array:

```ts
import { module as planeWaveIncidence } from './modules/plane-wave-incidence/module.ts';
```

```ts
export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp, oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward, planeWaveIncidence];
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/plane-wave-incidence/module.ts src/registry.ts
git commit -m "feat(modules): plane-wave incidence analyzer with wave-amplitude plot"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** — append to `tests/smoke.test.ts`:

```ts
test('plane-wave-incidence module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'plane-wave-incidence');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'plane-wave-incidence missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; raising `θ₁` past `θc` (set
  `n₁=1.5`, `n₂=1`, `θ₁>42°`) flips the readout to TIR and zeroes the
  transmitted wave; switching to `parallel` shows `⚠ Brewster` near `θB`.

- [ ] **Step 3: README** — append:
  `- **Plane-Wave Incidence** — Snell's law, Fresnel coefficients, critical and Brewster angles.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Plane-Wave Incidence module: Snell's law, Fresnel reflection/transmission, TIR and Brewster angle.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: plane-wave-incidence smoke test, README, changelog"
```
