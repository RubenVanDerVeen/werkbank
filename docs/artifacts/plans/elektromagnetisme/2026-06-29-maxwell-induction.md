# Maxwell & Electromagnetic Induction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `maxwell-induction` module: Faraday's law, motional emf,
self/mutual inductance, displacement current, with a `Φ(t)`/`emf(t)` plot for a
sinusoidally varying `B` field.

**Architecture:** Pure math in `src/math/induction.ts`. UI in
`src/modules/maxwell-induction/module.ts` using `linePlot`. One line in
`src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-maxwell-induction-design.md`

> **No foundation dependency.** Registry smoke test asserts presence **by id**.

---

### Task 1: Induction math

**Files:**
- Create: `src/math/induction.ts`
- Create: `tests/math/induction.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  faradayEmf, motionalEmf, selfInductance, mutualInductance,
  displacementCurrent, inductionTimeSeries,
} from '../../src/math/induction.ts';

test('faradayEmf: N=100, B=0.5, A=0.01, θ=0, dBdt=2 → -2.0 V', () => {
  assert.ok(Math.abs(faradayEmf(100, 0.5, 0.01, 0, 2) - (-2.0)) < 1e-9);
});

test('faradayEmf: θ=π/2 → 0 (flux perpendicular to normal)', () => {
  assert.ok(Math.abs(faradayEmf(100, 0.5, 0.01, Math.PI / 2, 2)) < 1e-12);
});

test('motionalEmf: B=1, L=0.5, v=2 → 1.0 V', () => {
  assert.ok(Math.abs(motionalEmf(1, 0.5, 2) - 1.0) < 1e-9);
});

test('selfInductance: N=100, Φ=0.05, I=0.5 → 10 H', () => {
  assert.ok(Math.abs(selfInductance(100, 0.05, 0.5) - 10) < 1e-9);
});

test('mutualInductance: N2=200, Φ21=0.01, I1=0.2 → 10 H', () => {
  assert.ok(Math.abs(mutualInductance(200, 0.01, 0.2) - 10) < 1e-9);
});

test('displacementCurrent: ε₀=8.854e-12, dΦE/dt=1e12 → 8.854 A', () => {
  assert.ok(Math.abs(displacementCurrent(8.854e-12, 1e12) - 8.854) < 1e-6);
});

test('inductionTimeSeries: at t=0, Φ=0, emf=-N·A·cosθ·B·2πf', () => {
  const { phi, emf } = inductionTimeSeries(100, 0.5, 0.01, 0, 1, 1, 100);
  const p0 = phi[0]!;
  const e0 = emf[0]!;
  assert.ok(Math.abs(p0.y) < 1e-12, `phi[0]=${p0.y}`);
  assert.ok(Math.abs(e0.y + Math.PI) < 1e-6, `emf[0]=${e0.y}`);
});

test('selfInductance: I=0 throws', () => {
  assert.throws(() => selfInductance(100, 0.05, 0), /I = 0/);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/induction.ts`**

```ts
// Physical constants
export const EPS0 = 8.854187817e-12; // vacuum permittivity [F/m]
export const C = 299792458;           // speed of light [m/s]

// Faraday's law: emf = -N·dΦ/dt, Φ = B·A·cosθ
// ponytail: A and θ constant; only B varies → dΦ/dt = A·cosθ·dB/dt
// B is the instantaneous field (context); dBdt drives the emf
export function faradayEmf(N: number, B: number, A: number, theta: number, dBdt: number): number {
  return -N * A * Math.cos(theta) * dBdt;
}

// Motional emf: emf = B·L·v (conductor moving perpendicular to B)
export function motionalEmf(B: number, L: number, v: number): number {
  return B * L * v;
}

// Self-inductance: L = N·Φ / I
export function selfInductance(N: number, phi: number, I: number): number {
  if (I === 0) throw new Error('I = 0 (division by zero)');
  return (N * phi) / I;
}

// Mutual inductance: M = N₂·Φ₂₁ / I₁
export function mutualInductance(N2: number, phi21: number, I1: number): number {
  if (I1 === 0) throw new Error('I1 = 0 (division by zero)');
  return (N2 * phi21) / I1;
}

// Displacement current: Id = ε₀·dΦE/dt
export function displacementCurrent(eps0: number, dPhiE_dt: number): number {
  return eps0 * dPhiE_dt;
}

// Time series for sinusoidal B(t) = B_peak·sin(2πft)
// Returns Φ(t) and emf(t) for plotting
export function inductionTimeSeries(
  N: number, B_peak: number, A: number, theta: number, f: number,
  tMax: number, n: number,
): { phi: { x: number; y: number }[]; emf: { x: number; y: number }[] } {
  const w = 2 * Math.PI * f;
  const phi: { x: number; y: number }[] = [];
  const emf: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (tMax * i) / (n - 1);
    const B = B_peak * Math.sin(w * t);
    const dBdt = B_peak * w * Math.cos(w * t);
    phi.push({ x: t, y: B * A * Math.cos(theta) });
    emf.push({ x: t, y: -N * A * Math.cos(theta) * dBdt });
  }
  return { phi, emf };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/induction.ts tests/math/induction.test.ts
git commit -m "feat(math): electromagnetic induction — Faraday, motional emf, L, M, Id"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/maxwell-induction/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders `N, B, A, θ (deg), f`. On
  `update`: compute `Φ_peak`, `emf_peak` (via `faradayEmf`), `emf_rms`, `L`
  (at `I_ref=1 A`), `M` (k=1, N₂=N), `Id` (EM-wave `E=cB` derivation), and
  `linePlot` of `Φ(t)`/`emf(t)` over two periods. Static `<pre>` with Maxwell's
  integral-form equations. Mirror `feedback/module.ts` wiring.

```ts
import type { Module } from '../../module.ts';
import {
  faradayEmf, selfInductance, mutualInductance, displacementCurrent,
  inductionTimeSeries, EPS0, C,
} from '../../math/induction.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

const I_REF = 1; // ponytail: reference current for L/M readouts

const MAXWELL_EQUATIONS = `∮ E·dl  = −dΦ_B/dt              (Faraday)
∮ B·dl  = μ₀(I + ε₀·dΦ_E/dt)     (Ampère-Maxwell)
∮ E·dA  = Q/ε₀                   (Gauss E)
∮ B·dA  = 0                      (Gauss B)`;

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const N = slider('N (turns)', 1, 1000, 1, 100);
  const B = slider('B peak (T)', 0, 5, 0.01, 0.5);
  const A = slider('A (m²)', 0.001, 0.1, 0.001, 0.01);
  const thetaDeg = slider('θ (deg)', 0, 90, 1, 0);
  const f = slider('f (Hz)', 0.1, 10, 0.1, 1);
  for (const s of [N, B, A, thetaDeg, f]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  const eqBlock = document.createElement('pre');
  eqBlock.textContent = MAXWELL_EQUATIONS;
  host.appendChild(plotHost);
  host.appendChild(readouts);
  host.appendChild(eqBlock);

  const update = () => {
    const n = N.value();
    const bPk = B.value();
    const a = A.value();
    const theta = thetaDeg.value() * Math.PI / 180;
    const freq = f.value();
    const omega = 2 * Math.PI * freq;
    const dBdt_peak = bPk * omega;
    const phi_peak = bPk * a * Math.cos(theta);
    const emf_peak = Math.abs(faradayEmf(n, bPk, a, theta, dBdt_peak));
    const emf_rms = emf_peak / Math.sqrt(2);
    const L = selfInductance(n, phi_peak, I_REF);
    // ponytail: k=1, N2=N, phi21=phi_peak → M=L
    const M = mutualInductance(n, phi_peak, I_REF);
    // ponytail: EM-wave relation E=cB → dΦE/dt = A·c·dB/dt
    const dPhiE_dt = a * C * dBdt_peak;
    const Id = displacementCurrent(EPS0, dPhiE_dt);

    readouts.innerHTML = `
      <div><b>Φ peak:</b> ${sig3(phi_peak)} Wb</div>
      <div><b>emf peak:</b> ${sig3(emf_peak)} V</div>
      <div><b>emf rms:</b> ${sig3(emf_rms)} V</div>
      <div><b>L (I=${I_REF} A):</b> ${sig3(L)} H</div>
      <div><b>M (k=1, N₂=N):</b> ${sig3(M)} H</div>
      <div><b>Id (E=cB):</b> ${sig3(Id)} A</div>
    `;
    const tMax = 2 / freq; // two periods
    const { phi, emf } = inductionTimeSeries(n, bPk, a, theta, freq, tMax, 200);
    linePlot(plotHost, [
      { label: 'Φ (Wb)', data: phi },
      { label: 'emf (V)', data: emf },
    ], { xLabel: 't (s)', yLabel: '' });
  };

  for (const s of [N, B, A, thetaDeg, f]) {
    const el = s.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'maxwell-induction',
  title: 'Maxwell & Induction',
  course: 'Elektromagnetische Velden',
  description: 'Faraday, Lenz, motional emf, self/mutual inductance, displacement current.',
  icon: 'Φ',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add import and append to `modules` array:

```ts
import { module as maxwellInduction } from './modules/maxwell-induction/module.ts';
```

Append `maxwellInduction` to the `modules` array (after `smpsForward`).

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/maxwell-induction/module.ts src/registry.ts
git commit -m "feat(modules): Maxwell & electromagnetic induction analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** — append to `tests/smoke.test.ts`:

```ts
test('maxwell-induction module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'maxwell-induction');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'maxwell-induction missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; raising `B` or `f` increases
  `emf peak`; raising `θ` toward 90° drives `emf` to 0; `Φ(t)` and `emf(t)` are
  90° out of phase on the plot.
- [ ] **Step 3: README** — append:
  `- **Maxwell & Induction** — Faraday, Lenz, motional emf, self/mutual inductance, displacement current.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Maxwell & Induction module: Faraday's law, motional emf, self/mutual inductance, displacement current with Φ(t)/emf(t) plot.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: maxwell-induction smoke test, README, changelog"
```
