# Transmission-Line Fundamentals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `tl-fundamentals` module: distributed LGC model, complex
characteristic impedance Z₀, propagation constant γ = α + jβ, lossless phase
velocity, and the Heaviside distortionless condition.

**Architecture:** Pure math in `src/math/tlfundamentals.ts` (imports `complex.ts`
only). UI in `src/modules/tl-fundamentals/module.ts` using `linePlot`. One line
in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-tl-fundamentals-design.md`

> **No `tl.ts` dependency.** The foundation's `tl.ts` exports reflection/input-Z
> helpers that take Z₀ as input; this module *produces* Z₀/γ from LGC. It is
> self-contained on `complex.ts` (already present from the Elektronica1B
> foundation). `// ponytail: may run in parallel with the foundation plan.`

---

### Task 1: LGC transmission-line math

**Files:**
- Create: `src/math/tlfundamentals.ts`
- Create: `tests/math/tlfundamentals.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  characteristicImpedance,
  propagationConstant,
  phaseVelocity,
  isDistortionless,
  losslessZ0,
} from '../../src/math/tlfundamentals.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const nearC = (z: { re: number; im: number }, re: number, im: number, eps = 1e-9) =>
  near(z.re, re, eps) && near(z.im, im, eps);

test('losslessZ0(250e-9, 100e-12) = 50', () => {
  assert.ok(near(losslessZ0(250e-9, 100e-12), 50), `Z0=${losslessZ0(250e-9, 100e-12)}`);
});

test('characteristicImpedance lossless -> 50 real', () => {
  const z = characteristicImpedance(0, 250e-9, 0, 100e-12, 1e9);
  assert.ok(nearC(z, 50, 0), JSON.stringify(z));
});

test('phaseVelocity(250e-9, 100e-12) = 2e8', () => {
  assert.ok(near(phaseVelocity(250e-9, 100e-12), 2e8), `v=${phaseVelocity(250e-9, 100e-12)}`);
});

test('propagationConstant lossless -> alpha=0, beta=5', () => {
  const r = propagationConstant(0, 250e-9, 0, 100e-12, 1e9);
  assert.ok(near(r.alpha, 0, 1e-9) && near(r.beta, 5, 1e-9), JSON.stringify(r));
});

test('isDistortionless true when R/L = G/C', () => {
  assert.equal(isDistortionless(2.5e-3, 250e-9, 1e-6, 100e-12), true);
});

test('isDistortionless false when R/L != G/C', () => {
  assert.equal(isDistortionless(1e-3, 250e-9, 1e-6, 100e-12), false);
});

test('distortionless line: Z0 real=50, alpha=sqrt(RG)=5e-5, beta=5', () => {
  const z = characteristicImpedance(2.5e-3, 250e-9, 1e-6, 100e-12, 1e9);
  assert.ok(nearC(z, 50, 0, 1e-6), JSON.stringify(z));
  const r = propagationConstant(2.5e-3, 250e-9, 1e-6, 100e-12, 1e9);
  assert.ok(near(r.alpha, 5e-5, 1e-7) && near(r.beta, 5, 1e-9), JSON.stringify(r));
});

test('lossy line: Z0 = 50.01 - j*1.00 (Z0^2 = 2500 - j100)', () => {
  const z = characteristicImpedance(10, 250e-9, 0, 100e-12, 1e9);
  assert.ok(near(z.re, 50.01, 0.02) && near(z.im, -1.0, 0.02), JSON.stringify(z));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/tlfundamentals.ts`**

```ts
import type { Complex } from './complex.ts';
import { cdiv, cmul } from './complex.ts';

// ponytail: local csqrt — complex.ts lacks it; promote there if a third caller appears.
function csqrt(z: Complex): Complex {
  const { re: a, im: b } = z;
  const r = Math.hypot(a, b);
  const u = Math.sqrt((r + a) / 2);
  // sign(0) -> +1 so the principal root has non-negative imaginary part.
  const v = (b < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (r - a) / 2));
  return { re: u, im: v };
}

// Z0 = sqrt((R + jωL) / (G + jωC)).
export function characteristicImpedance(R: number, L: number, G: number, C: number, omega: number): Complex {
  const num: Complex = { re: R, im: omega * L };
  const den: Complex = { re: G, im: omega * C };
  return csqrt(cdiv(num, den));
}

// γ = sqrt((R + jωL)(G + jωC)) = α + jβ.
export function propagationConstant(
  R: number, L: number, G: number, C: number, omega: number,
): { alpha: number; beta: number; gamma: Complex } {
  const zSeries: Complex = { re: R, im: omega * L };
  const yShunt: Complex = { re: G, im: omega * C };
  const gamma = csqrt(cmul(zSeries, yShunt));
  return { alpha: gamma.re, beta: gamma.im, gamma };
}

// Lossless phase velocity v = 1/sqrt(LC).
export function phaseVelocity(L: number, C: number): number {
  return 1 / Math.sqrt(L * C);
}

// Heaviside distortionless condition: R/L = G/C.
export function isDistortionless(R: number, L: number, G: number, C: number): boolean {
  // ponytail: relative tol 1e-6; physical components drift far more.
  const rl = R / L, gc = G / C;
  if (!Number.isFinite(rl) || !Number.isFinite(gc)) return false;
  return Math.abs(rl - gc) <= 1e-6 * Math.max(Math.abs(rl), Math.abs(gc), 1);
}

// Lossless Z0 = sqrt(L/C) (real).
export function losslessZ0(L: number, C: number): number {
  return Math.sqrt(L / C);
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/tlfundamentals.ts tests/math/tlfundamentals.test.ts
git commit -m "feat(math): transmission-line Z0, gamma, phase velocity, distortionless check"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/tl-fundamentals/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders `R (Ω/m)`, `L (nH/m)`,
  `G (mS/m)`, `C (pF/m)`, `f0 (MHz)`. On `update`: convert units, call
  `characteristicImpedance` / `propagationConstant` / `phaseVelocity` /
  `isDistortionless` / `losslessZ0`, render readouts at `f0`, and two `linePlot`s
  (|Z₀| and phase(Z₀)) log-spaced 1 MHz–1 GHz. Mirror `feedback/module.ts`
  wiring (append widgets, attach `input`/`change` listeners, call `update()`).

```ts
import type { Module } from '../../module.ts';
import {
  characteristicImpedance,
  propagationConstant,
  phaseVelocity,
  isDistortionless,
  losslessZ0,
} from '../../math/tlfundamentals.ts';
import { cabs, cphaseDeg } from '../../math/complex.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function logspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  const llo = Math.log10(lo), lhi = Math.log10(hi);
  for (let i = 0; i < n; i++) out.push(10 ** (llo + ((lhi - llo) * i) / (n - 1)));
  return out;
}

const sig3 = (x: number): string => x.toPrecision(3);

function render(host: HTMLElement) {
  const R = slider('R (Ω/m)', 0, 2, 0.001, 0);
  const L = slider('L (nH/m)', 100, 500, 1, 250);
  const G = slider('G (mS/m)', 0, 2, 0.001, 0);
  const C = slider('C (pF/m)', 50, 200, 1, 100);
  const f0 = slider('f0 (MHz)', 1, 1000, 1, 100);
  const ws = [R, L, G, C, f0];
  for (const w of ws) host.appendChild(w.el);

  const magHost = document.createElement('div');
  const phaseHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(magHost);
  host.appendChild(phaseHost);
  host.appendChild(readouts);

  const update = () => {
    // Convert displayed units to SI.
    const r = R.value();                       // Ω/m
    const l = L.value() * 1e-9;                // H/m
    const g = G.value() * 1e-3;                // S/m
    const c = C.value() * 1e-12;               // F/m
    const f = f0.value() * 1e6;                 // Hz
    const omega = 2 * Math.PI * f;

    const z0 = characteristicImpedance(r, l, g, c, omega);
    const pc = propagationConstant(r, l, g, c, omega);
    const vLossless = phaseVelocity(l, c);
    const vPhase = pc.beta !== 0 ? omega / pc.beta : NaN;
    const z0Lossless = losslessZ0(l, c);
    const dist = isDistortionless(r, l, g, c);

    readouts.innerHTML = `
      <div><b>Z₀:</b> ${sig3(z0.re)} ${z0.im >= 0 ? '+' : '−'} j·${sig3(Math.abs(z0.im))} Ω &nbsp;(|Z₀|=${sig3(cabs(z0))} ∠ ${cphaseDeg(z0).toFixed(2)}°)</div>
      <div><b>α:</b> ${sig3(pc.alpha)} Np/m &nbsp;&nbsp;<b>β:</b> ${sig3(pc.beta)} rad/m</div>
      <div><b>v_phase (ω/β):</b> ${Number.isFinite(vPhase) ? sig3(vPhase) : '—'} m/s</div>
      <div><b>v_lossless (1/√LC):</b> ${sig3(vLossless)} m/s</div>
      <div><b>Z₀_lossless (√(L/C)):</b> ${sig3(z0Lossless)} Ω</div>
      <div><b>distortionless?:</b> ${dist ? 'yes (R/L = G/C)' : 'no'}</div>
    `;

    const fs = logspace(1e6, 1e9, 60);
    const mag = fs.map((ff) => {
      const w = 2 * Math.PI * ff;
      return { x: ff / 1e6, y: cabs(characteristicImpedance(r, l, g, c, w)) };
    });
    const ph = fs.map((ff) => {
      const w = 2 * Math.PI * ff;
      return { x: ff / 1e6, y: cphaseDeg(characteristicImpedance(r, l, g, c, w)) };
    });
    linePlot(magHost, [{ label: '|Z₀|', data: mag }], { xLabel: 'f (MHz)', yLabel: '|Z₀| (Ω)' });
    linePlot(phaseHost, [{ label: 'phase(Z₀)', data: ph }], { xLabel: 'f (MHz)', yLabel: 'phase (°)' });
  };

  for (const w of ws) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'tl-fundamentals',
  title: 'Transmission-Line Fundamentals',
  course: 'Hoogfrequenttechniek',
  description: 'Distributed LGC line: Z₀, γ=α+jβ, phase velocity, distortionless condition.',
  icon: 'Z₀',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as tlFundamentals }
  from './modules/tl-fundamentals/module.ts';` and append `tlFundamentals`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/tl-fundamentals/module.ts src/registry.ts
git commit -m "feat(modules): transmission-line fundamentals (Z0, gamma, distortionless)"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('tl-fundamentals module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'tl-fundamentals');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'tl-fundamentals missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; with R=G=0 the readout shows
  `Z₀ = 50 Ω` (lossless) and `distortionless? yes`; raising R alone (G=0) makes
  Z₀ complex with negative phase and flips `distortionless?` to no; setting
  `G = R·C/L` restores `distortionless? yes` and Z₀ returns to real ~50.

- [ ] **Step 3: README** — append:
  `- **Transmission-Line Fundamentals** — distributed LGC line: Z₀, γ=α+jβ, phase velocity, distortionless condition.`

- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Transmission-Line Fundamentals module: characteristic impedance, propagation constant, phase velocity, and Heaviside distortionless check for the LGC distributed model.`

- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: tl-fundamentals smoke test, README, changelog"
```
