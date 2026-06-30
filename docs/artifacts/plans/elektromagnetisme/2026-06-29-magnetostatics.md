# Magnetostatics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `magnetostatics` module: Biot-Savart (wire, loop, segment),
Ampère's law (solenoid, toroid), inductance, and magnetic reluctance, with a
2D B-field cross-section plot.

**Architecture:** Pure math in `src/math/magnetostatics.ts`. UI in
`src/modules/magnetostatics/module.ts` using the foundation's `fieldPlot`.
One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, SVG via `fieldPlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-magnetostatics-design.md`

> **Foundation dependency.** `src/ui/fieldplot.ts` is created by the
> Elektromagnetisme foundation plan (`2026-06-29-foundation.md`, Task 3).
> That plan must be merged before this one starts. Registry smoke test
> asserts presence **by id**.

---

### Task 1: Magnetostatics math

**Files:**
- Create: `src/math/magnetostatics.ts`
- Create: `tests/math/magnetostatics.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MU_0, wireField, wireField2D, loopField, segmentField,
  solenoidField, solenoidInductance, toroidField, toroidInductance,
  reluctance, flux,
} from '../../src/math/magnetostatics.ts';

const near = (a: number, b: number, rel = 1e-9) =>
  Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

test('MU_0 = 4π·1e-7', () => {
  assert.ok(near(MU_0, 4 * Math.PI * 1e-7));
});

test('wireField(1, 0.01) = 2e-5 T', () => {
  assert.ok(near(wireField(1, 0.01), 2e-5), `B=${wireField(1, 0.01)}`);
});

test('wireField(1, 0.02) = 1e-5 T (inverse r)', () => {
  assert.ok(near(wireField(1, 0.02), 1e-5));
});

test('wireField2D magnitude matches wireField', () => {
  const b = wireField2D(1, 0, 0, 0.01, 0);
  assert.ok(near(Math.hypot(b.Bx, b.By), wireField(1, 0.01)));
});

test('loopField(1, 0.1, 0) = μ₀/(2R) ≈ 6.283e-6 T', () => {
  assert.ok(near(loopField(1, 0.1, 0), MU_0 / 0.2));
});

test('segmentField(1, 0.01, -1, 1) → infinite-wire 2e-5/√1.0001', () => {
  assert.ok(near(segmentField(1, 0.01, -1, 1), 2e-5 / Math.sqrt(1.0001)));
});

test('solenoidField(1000, 1) = μ₀nI ≈ 1.257e-3 T', () => {
  assert.ok(near(solenoidField(1000, 1), MU_0 * 1000));
});

test('solenoidInductance(100, 1e-4, 0.1) = μ₀·10 ≈ 1.257e-5 H', () => {
  assert.ok(near(solenoidInductance(100, 1e-4, 0.1), MU_0 * 10));
});

test('toroidField(100, 1, 0.1) = 2e-4 T', () => {
  assert.ok(near(toroidField(100, 1, 0.1), 2e-4));
});

test('toroidInductance(100, 1e-4, 0.1) = 2e-6 H', () => {
  assert.ok(near(toroidInductance(100, 1e-4, 0.1), 2e-6));
});

test('reluctance(0.1, μ₀, 1e-4) ≈ 7.958e8 A/Wb', () => {
  assert.ok(near(reluctance(0.1, MU_0, 1e-4), 0.1 / (MU_0 * 1e-4)));
});

test('flux(100, 1, ℛ) = 100/ℛ ≈ 1.257e-7 Wb', () => {
  const R = reluctance(0.1, MU_0, 1e-4);
  assert.ok(near(flux(100, 1, R), 100 / R));
});

test('wireField throws on r <= 0', () => {
  assert.throws(() => wireField(1, 0));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/magnetostatics.ts`**

```ts
// Magnetostatics: Biot-Savart, Ampère's law, inductance, reluctance.
export const MU_0 = 4 * Math.PI * 1e-7; // H/m, textbook exact value

// Infinite straight wire, B at perpendicular distance r (magnitude).
export function wireField(I: number, r: number): number {
  if (r <= 0) throw new Error('wireField: r must be > 0');
  return (MU_0 * I) / (2 * Math.PI * r);
}

// 2D field of an infinite wire (current +z) at (wx,wy), evaluated at (x,y).
export function wireField2D(I: number, wx: number, wy: number, x: number, y: number): { Bx: number; By: number } {
  const dx = x - wx, dy = y - wy;
  const rho2 = dx * dx + dy * dy;
  if (rho2 < 1e-12) return { Bx: 0, By: 0 };
  const k = (MU_0 * I) / (2 * Math.PI * rho2);
  return { Bx: -k * dy, By: k * dx };
}

// Circular loop on axis, B at distance z from center (loop radius R).
export function loopField(I: number, R: number, z: number): number {
  if (R <= 0) throw new Error('loopField: R must be > 0');
  const s = R * R + z * z;
  return (MU_0 * I * R * R) / (2 * s * Math.sqrt(s));
}

// Finite straight segment from (x1,0) to (x2,0), B at (0,d). Signed (+z).
export function segmentField(I: number, d: number, x1: number, x2: number): number {
  if (d <= 0) throw new Error('segmentField: d must be > 0');
  const f = (x: number) => x / Math.sqrt(x * x + d * d);
  return ((MU_0 * I) / (4 * Math.PI * d)) * (f(x2) - f(x1));
}

// Ideal long solenoid interior field. n = turns per unit length.
export function solenoidField(n: number, I: number): number {
  return MU_0 * n * I;
}

// Solenoid inductance: L = μ₀N²A/l.
export function solenoidInductance(N: number, A: number, l: number): number {
  if (l <= 0) throw new Error('solenoidInductance: l must be > 0');
  return (MU_0 * N * N * A) / l;
}

// Ideal toroid field at mean radius r: B = μ₀NI/(2πr).
export function toroidField(N: number, I: number, r: number): number {
  if (r <= 0) throw new Error('toroidField: r must be > 0');
  return (MU_0 * N * I) / (2 * Math.PI * r);
}

// Toroid inductance: L = μ₀N²A/(2πr).
export function toroidInductance(N: number, A: number, r: number): number {
  if (r <= 0) throw new Error('toroidInductance: r must be > 0');
  return (MU_0 * N * N * A) / (2 * Math.PI * r);
}

// Magnetic reluctance: ℛ = l/(μ·A).
export function reluctance(l: number, mu: number, A: number): number {
  if (mu <= 0 || A <= 0) throw new Error('reluctance: μ and A must be > 0');
  return l / (mu * A);
}

// Magnetic flux: Φ = NI/ℛ.
export function flux(N: number, I: number, rel: number): number {
  if (rel <= 0) throw new Error('flux: ℛ must be > 0');
  return (N * I) / rel;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/magnetostatics.ts tests/math/magnetostatics.test.ts
git commit -m "feat(math): magnetostatics Biot-Savart, Ampere, inductance, reluctance"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/magnetostatics/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Source', [wire, loop,
  solenoid, toroid], 'wire')`, sliders `I, R, n, N, l, r, A`. On `update`:
  build a 13×13 `FieldGrid` over a ±0.3 m window, call `fieldPlot`, then
  render `B` (and `L, ℛ, Φ` for inductor sources). Mirror `feedback/module.ts`
  wiring (re-call plot helper each update).

```ts
import type { Module } from '../../module.ts';
import {
  MU_0, wireField, wireField2D, loopField,
  solenoidField, solenoidInductance, toroidField, toroidInductance,
  reluctance, flux,
} from '../../math/magnetostatics.ts';
import { fieldPlot, type FieldGrid } from '../../ui/fieldplot.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const HALF = 0.3; // m, plot half-window
const NG = 13;

function sig3(x: number): string {
  return x.toPrecision(3);
}

// ponytail: loop cross-section = two opposite point currents at (±R, 0).
function buildGrid(
  source: string, I: number, R: number, n: number, Nt: number, l: number, r: number, A: number,
): FieldGrid {
  const vectors: { x: number; y: number; vx: number; vy: number }[] = [];
  for (let iy = 0; iy < NG; iy++) {
    for (let ix = 0; ix < NG; ix++) {
      const px = -HALF + (2 * HALF * ix) / (NG - 1);
      const py = -HALF + (2 * HALF * iy) / (NG - 1);
      let Bx = 0, By = 0;
      if (source === 'wire') {
        const b = wireField2D(I, 0, 0, px, py);
        Bx = b.Bx; By = b.By;
      } else if (source === 'loop') {
        const a = wireField2D(I, R, 0, px, py);
        const b = wireField2D(-I, -R, 0, px, py);
        Bx = a.Bx + b.Bx; By = a.By + b.By;
      } else if (source === 'solenoid') {
        // ponytail: ideal solenoid, uniform axial (y) field inside rectangle.
        if (Math.abs(px) < R && Math.abs(py) < l / 2) By = solenoidField(n, I);
      } else { // toroid
        const rho = Math.hypot(px, py);
        const a = Math.sqrt(A / Math.PI);
        if (rho > r - a && rho < r + a && rho > 1e-9) {
          const B = toroidField(Nt, I, rho);
          Bx = (-B * py) / rho; By = (B * px) / rho;
        }
      }
      vectors.push({ x: ix, y: iy, vx: Bx, vy: By });
    }
  }
  return { nx: NG, ny: NG, vectors };
}

function render(host: HTMLElement) {
  const source = selectWave('Source', ['wire', 'loop', 'solenoid', 'toroid'], 'wire');
  const I = slider('I (A)', 0.1, 10, 0.1, 1);
  const R = slider('R (m)', 0.01, 1, 0.01, 0.1);
  const n = slider('n (turns/m)', 10, 5000, 10, 1000);
  const Nt = slider('N (turns)', 1, 500, 1, 100);
  const l = slider('l (m)', 0.01, 1, 0.01, 0.1);
  const r = slider('r (m)', 0.02, 1, 0.01, 0.1);
  const A = slider('A (cm²)', 0.1, 50, 0.1, 1);
  for (const w of [source, I, R, n, Nt, l, r, A]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const s = source.value();
    const Iv = I.value(), Rv = R.value(), nv = n.value(), Nv = Nt.value();
    const lv = l.value(), rv = r.value(), Av = A.value() * 1e-4; // cm² → m²

    fieldPlot(plotHost, buildGrid(s, Iv, Rv, nv, Nv, lv, rv, Av), { showMagnitude: true });

    let B = 0, L = 0, Rel = 0;
    let isInd = false;
    if (s === 'wire') {
      B = wireField(Iv, rv);
    } else if (s === 'loop') {
      B = loopField(Iv, Rv, 0);
    } else if (s === 'solenoid') {
      B = solenoidField(nv, Iv);
      L = solenoidInductance(Nv, Av, lv);
      Rel = reluctance(lv, MU_0, Av);
      isInd = true;
    } else { // toroid
      B = toroidField(Nv, Iv, rv);
      L = toroidInductance(Nv, Av, rv);
      Rel = reluctance(2 * Math.PI * rv, MU_0, Av);
      isInd = true;
    }
    readouts.innerHTML = `
      <div><b>B:</b> ${sig3(B)} T</div>
      ${isInd ? `<div><b>L:</b> ${sig3(L)} H</div>
      <div><b>ℛ:</b> ${sig3(Rel)} A/Wb</div>
      <div><b>Φ (NI/ℛ):</b> ${sig3(flux(Nv, Iv, Rel))} Wb</div>` : ''}
    `;
  };

  for (const w of [source, I, R, n, Nt, l, r, A]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'magnetostatics',
  title: 'Magnetostatics',
  course: 'Elektromagnetische Velden',
  description: 'Biot-Savart, Ampère law, inductance, magnetic reluctance.',
  icon: '⊙',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — append one import and one entry:

```ts
import { module as magnetostatics } from './modules/magnetostatics/module.ts';
```
and append `magnetostatics` to the `modules` array.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/magnetostatics/module.ts src/registry.ts
git commit -m "feat(modules): magnetostatics analyzer with B-field cross-section plot"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('magnetostatics module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'magnetostatics');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'magnetostatics missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching `Source` redraws the
  field plot (circulating for wire/toroid, dipole for loop, uniform for
  solenoid); raising `I` strengthens arrows; `solenoid`/`toroid` show `L`,
  `ℛ`, `Φ`.
- [ ] **Step 3: README** — append:
  `- **Magnetostatics** — Biot-Savart, Ampère law, inductance, magnetic reluctance.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Magnetostatics module: Biot-Savart (wire, loop, segment), Ampère (solenoid, toroid), inductance, reluctance, flux, with a 2D B-field cross-section plot.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: magnetostatics smoke test, README, changelog"
```
