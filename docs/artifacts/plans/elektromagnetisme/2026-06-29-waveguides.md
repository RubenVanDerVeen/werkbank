# Rectangular Waveguides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `waveguides` module: rectangular-waveguide TE/TM cutoff, phase/group velocity, guide wavelength, TE10 field, and a transverse mode-pattern heat map.

**Architecture:** Pure math in `src/math/waveguides.ts`. UI in
`src/modules/waveguides/module.ts` using foundation `fieldPlot` (heat map) +
`linePlot` (dispersion). One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`, foundation `fieldPlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-waveguides-design.md`

> **Foundation dependency:** This plan imports `fieldPlot` from
> `src/ui/fieldplot.ts`, created by the foundation plan
> `2026-06-29-foundation.md` (Task 3). The foundation must merge first.
> Registry smoke test asserts presence **by id**.

---

### Task 1: Waveguide math

**Files:**
- Create: `src/math/waveguides.ts`
- Create: `tests/math/waveguides.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutoffFreq, phaseVelocity, groupVelocity, guideWavelength, te10Field, modeField } from '../../src/math/waveguides.ts';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const C = 3e8;
const A = 0.02286, B = 0.01016; // WR-90

test('WR-90 TE10 cutoff ≈ 6.56 GHz', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  assert.ok(near(fc, 6.562e9, 1e7), `fc=${fc}`);
});
test('TE20 cutoff = 2× TE10', () => {
  const fc10 = cutoffFreq(1, 0, A, B, C);
  const fc20 = cutoffFreq(2, 0, A, B, C);
  assert.ok(near(fc20, 2 * fc10), `fc20=${fc20}`);
});
test('TE01 > TE10 for a>b (TE10 dominant)', () => {
  const fc10 = cutoffFreq(1, 0, A, B, C);
  const fc01 = cutoffFreq(0, 1, A, B, C);
  assert.ok(fc01 > fc10, `fc01=${fc01} fc10=${fc10}`);
});
test('TE11 = TM11 cutoff (same formula) ≈ 16.16 GHz', () => {
  const fc = cutoffFreq(1, 1, A, B, C);
  assert.ok(near(fc, 1.6157e10, 1e7), `fc11=${fc}`);
});
test('phaseVelocity(10GHz, fc, c) > c; vg < c; vp·vg ≈ c²', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  const vp = phaseVelocity(10e9, fc, C);
  const vg = groupVelocity(10e9, fc, C);
  assert.ok(vp > C, `vp=${vp}`);
  assert.ok(vg < C, `vg=${vg}`);
  assert.ok(near(vp * vg, C * C, 1e6), `vp·vg=${vp * vg}`); // ponytail: eps 1e6, product ~9e16
});
test('guideWavelength(10GHz, fc, c) ≈ 3.98 cm', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  const lg = guideWavelength(10e9, fc, C);
  assert.ok(near(lg, 0.03975, 1e-3), `lg=${lg}`); // ~3.98 cm, λ0=3cm at 10GHz
});
test('phaseVelocity throws when f ≤ fc (evanescent)', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  assert.throws(() => phaseVelocity(fc, fc, C));
  assert.throws(() => phaseVelocity(fc * 0.5, fc, C));
});
test('te10Field: Ey peak at (a/2, 0), zero at wall (0, 0)', () => {
  const beta = (2 * Math.PI) / 0.03975;
  assert.ok(near(te10Field(A / 2, 0, A, beta, 1).Ey, 1), 'Ey peak');
  assert.ok(near(te10Field(0, 0, A, beta, 1).Ey, 0), 'Ey wall');
});
test('te10Field: Hz peaks at (0, λg/4); Ey = 0 there', () => {
  const beta = (2 * Math.PI) / 0.03975;
  const r = te10Field(0, Math.PI / (2 * beta), A, beta, 1);
  assert.ok(near(r.Ey, 0), `Ey=${r.Ey}`);
  assert.ok(r.Hz > 0, `Hz=${r.Hz}`); // peak shape (π/(aβ)·1·sin(π/2))
});
test('modeField TE10: Ex=0, |Ey| at peak (a/2, b/2)', () => {
  const r = modeField('TE10', A / 2, B / 2, A, B);
  assert.ok(near(r.Ex, 0), `Ex=${r.Ex}`);
  assert.ok(Math.abs(r.Ey) > 0.9 / A, `Ey=${r.Ey}`); // |1/a| ≈ 43.7
});
test('modeField TE20: second lobe (3a/4) opposite sign to first (a/4)', () => {
  const r1 = modeField('TE20', A / 4, B / 2, A, B);
  const r2 = modeField('TE20', (3 * A) / 4, B / 2, A, B);
  assert.ok(r1.Ey * r2.Ey < 0, `r1=${r1.Ey} r2=${r2.Ey}`);
});
test('modeField TE01: Ey=0, |Ex| at peak (a/2, b/2)', () => {
  const r = modeField('TE01', A / 2, B / 2, A, B);
  assert.ok(near(r.Ey, 0), `Ey=${r.Ey}`);
  assert.ok(Math.abs(r.Ex) > 0.9 / B, `Ex=${r.Ex}`); // |1/b| ≈ 98.4
});
test('modeField TM11: Ex, Ey finite, same sign at (a/4, b/4) (TM branch)', () => {
  const r = modeField('TM11', A / 4, B / 4, A, B);
  assert.ok(Number.isFinite(r.Ex) && Number.isFinite(r.Ey), `Ex=${r.Ex} Ey=${r.Ey}`);
  assert.ok(r.Ex > 0 && r.Ey > 0, `Ex=${r.Ex} Ey=${r.Ey}`); // (1/a)·0.5, (1/b)·0.5
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/waveguides.ts`**

```ts
export type Mode = 'TE10' | 'TE20' | 'TE01' | 'TE11' | 'TM11';

// fc = (c/2)·sqrt((m/a)² + (n/b)²). Mode-agnostic: TE & TM share the formula.
export function cutoffFreq(m: number, n: number, a: number, b: number, c: number): number {
  return (c / 2) * Math.sqrt((m / a) ** 2 + (n / b) ** 2);
}

// vp = c / sqrt(1 − (fc/f)²); superluminal above cutoff. Throws below cutoff.
export function phaseVelocity(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('phaseVelocity: f ≤ fc (evanescent)');
  return c / Math.sqrt(1 - r * r);
}

// vg = c · sqrt(1 − (fc/f)²); subluminal, vp·vg = c². Throws below cutoff.
export function groupVelocity(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('groupVelocity: f ≤ fc (evanescent)');
  return c * Math.sqrt(1 - r * r);
}

// λg = λ0 / sqrt(1 − (fc/f)²), λ0 = c/f. Throws below cutoff.
// ponytail: brief wrote guideWavelength(f, fc); +c needed (λg needs λ0 = c/f).
export function guideWavelength(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('guideWavelength: f ≤ fc (evanescent)');
  return c / f / Math.sqrt(1 - r * r);
}

// TE10 propagation field (t=0 real part). Ey is absolute; Hx, Hz are spatial
// shapes — absolute needs η_TE = ωμ/β, not in the signature.
// ponytail: Hx, Hz shapes; sign + relative structure (kc/β) correct.
export function te10Field(x: number, z: number, a: number, beta: number, E0: number): { Ey: number; Hx: number; Hz: number } {
  const sx = Math.sin((Math.PI * x) / a);
  const cx = Math.cos((Math.PI * x) / a);
  const cz = Math.cos(beta * z);
  const sz = Math.sin(beta * z);
  return {
    Ey: E0 * sx * cz,
    Hx: -sx * cz,                              // shape (÷ η_TE for absolute)
    Hz: (Math.PI / (a * beta)) * cx * sz,      // relative to Hx by kc/β = (π/a)/β
  };
}

// Transverse E-field pattern (real, signed) for the 5 selectable modes.
// fieldPlot auto-scales, so absolute amplitude is irrelevant; the Ex:Ey ratio is
// kept via (m/a):(n/b). Common jωμ/kc² (TE) / jβ/kc² (TM) factors are dropped.
// ponytail: pattern shape, not amplitude; single-digit m, n only.
export function modeField(mode: Mode, x: number, y: number, a: number, b: number): { Ex: number; Ey: number } {
  const pol = mode.slice(0, 2); // 'TE' | 'TM'
  const m = Number(mode[2]);
  const n = Number(mode[3]);
  const ax = (Math.PI * x) / a;
  const ay = (Math.PI * y) / b;
  if (pol === 'TE') {
    // Ex ∝ (n/b)·cos(mπx/a)·sin(nπy/b); Ey ∝ −(m/a)·sin(mπx/a)·cos(nπy/b)
    return {
      Ex: (n / b) * Math.cos(m * ax) * Math.sin(n * ay),
      Ey: -(m / a) * Math.sin(m * ax) * Math.cos(n * ay),
    };
  }
  // TM: Ex ∝ (m/a)·cos(mπx/a)·sin(nπy/b); Ey ∝ (n/b)·sin(mπx/a)·cos(nπy/b)
  return {
    Ex: (m / a) * Math.cos(m * ax) * Math.sin(n * ay),
    Ey: (n / b) * Math.sin(m * ax) * Math.cos(n * ay),
  };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/waveguides.ts tests/math/waveguides.test.ts
git commit -m "feat(math): rectangular waveguide cutoff, vp/vg, λg, TE10 field, mode patterns"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/waveguides/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Mode', ['TE10','TE20','TE01','TE11','TM11'], 'TE10')`, sliders `a (mm)`, `b (mm)`, `f (GHz)`. On `update`: derive `(m,n)` from the mode, compute `fc`, `vp`, `vg`, `λg` (guard `f ≤ fc`), render readouts + `fieldPlot` heat map of `modeField` over a 20×10 grid + `linePlot` `vp`/`vg` vs `f`. Mirror `feedback/module.ts` wiring. `c = 2.998e8` hardcoded (`// ponytail: vacuum only`).

```ts
import type { Module } from '../../module.ts';
import { cutoffFreq, phaseVelocity, groupVelocity, guideWavelength, modeField, type Mode } from '../../math/waveguides.ts';
import { fieldPlot } from '../../ui/fieldplot.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const C0 = 2.998e8; // ponytail: vacuum only, no dielectric slider

function sig3(x: number): string {
  return Number.isFinite(x) ? x.toPrecision(3) : '—';
}

function modeMN(mode: string): [number, number] {
  return [Number(mode[2]), Number(mode[3])];
}

function render(host: HTMLElement) {
  const mode = selectWave('Mode', ['TE10', 'TE20', 'TE01', 'TE11', 'TM11'], 'TE10');
  const a = slider('a (mm)', 5, 50, 0.1, 22.86);
  const b = slider('b (mm)', 2, 25, 0.1, 10.16);
  const f = slider('f (GHz)', 1, 30, 0.1, 10);
  for (const w of [mode, a, b, f]) host.appendChild(w.el);

  const fieldHost = document.createElement('div');
  const dispHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(fieldHost);
  host.appendChild(readouts);
  host.appendChild(dispHost);

  const update = () => {
    const m = mode.value() as Mode;
    const [mi, ni] = modeMN(m);
    const aM = a.value() / 1000; // mm → m
    const bM = b.value() / 1000;
    const fHz = f.value() * 1e9; // GHz → Hz
    const fc = cutoffFreq(mi, ni, aM, bM, C0);
    const above = fHz > fc;
    const vp = above ? phaseVelocity(fHz, fc, C0) : NaN;
    const vg = above ? groupVelocity(fHz, fc, C0) : NaN;
    const lg = above ? guideWavelength(fHz, fc, C0) : NaN;

    readouts.innerHTML = `
      <div><b>fc:</b> ${sig3(fc / 1e9)} GHz</div>
      <div><b>vp:</b> ${above ? sig3(vp / C0) + 'c' : '—'}</div>
      <div><b>vg:</b> ${above ? sig3(vg / C0) + 'c' : '—'}</div>
      <div><b>λg:</b> ${above ? sig3(lg * 100) + ' cm' : '—'}</div>
      <div><b>${above ? 'above cutoff' : 'BELOW CUTOFF (evanescent)'}</b></div>
    `;

    // Transverse |E| heat map (nx×ny grid; arrows = E-field direction).
    // ponytail: square canvas — waveguide aspect (a:b) not to scale, pattern only.
    const nx = 20, ny = 10;
    const vectors: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = (i / (nx - 1)) * aM;
        const y = (j / (ny - 1)) * bM;
        const { Ex, Ey } = modeField(m, x, y, aM, bM);
        vectors.push({ x: i, y: j, vx: Ex, vy: Ey });
      }
    }
    fieldPlot(fieldHost, { nx, ny, vectors }, { title: `${m} |E| (transverse)`, showMagnitude: true });

    // Dispersion: vp, vg (×c) vs f, swept above fc.
    const fLo = Math.max(fc * 1.05, 1e9);
    const fHi = Math.min(fc * 4, 30e9);
    if (fHi > fLo) {
      const N = 50;
      const vpSeries: { x: number; y: number }[] = [];
      const vgSeries: { x: number; y: number }[] = [];
      for (let i = 0; i < N; i++) {
        const ff = fLo + ((fHi - fLo) * i) / (N - 1);
        vpSeries.push({ x: ff / 1e9, y: phaseVelocity(ff, fc, C0) / C0 });
        vgSeries.push({ x: ff / 1e9, y: groupVelocity(ff, fc, C0) / C0 });
      }
      linePlot(dispHost, [
        { label: 'vp/c', data: vpSeries },
        { label: 'vg/c', data: vgSeries },
      ], { xLabel: 'f (GHz)', yLabel: 'v / c' });
    } else {
      dispHost.innerHTML = '<div style="color:#888">fc out of sweep range</div>';
    }
  };

  for (const w of [mode, a, b, f]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'waveguides',
  title: 'Rectangular Waveguides',
  course: 'Elektromagnetische Velden',
  description: 'Rectangular waveguides: TE/TM cutoff, phase/group velocity, TE10 field profile.',
  icon: 'TE',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as waveguides } from './modules/waveguides/module.ts';` and append `waveguides` to the `modules` array.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/waveguides/module.ts src/registry.ts
git commit -m "feat(modules): rectangular waveguide analyzer (cutoff, vp/vg, mode heat map)"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**

```ts
test('waveguides module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'waveguides');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'waveguides missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching mode reshapes the heat
  map (TE10 → single horizontal stripe, TE20 → two lobes with flipped arrows,
  TE01 → vertical arrows, TE11/TM11 → 2D quadrupole); raising `f` pulls
  `vp → c` from above and `vg → c` from below; setting `f` below `fc` shows
  "BELOW CUTOFF (evanescent)".
- [ ] **Step 3: README** — append:
  `- **Rectangular Waveguides** — TE/TM cutoff, phase/group velocity, guide wavelength, TE10 field profile.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Rectangular Waveguides module: TE/TM cutoff, vp/vg, λg, TE10 field, transverse mode-pattern heat map.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: waveguides smoke test, README, changelog"
```
