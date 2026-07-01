# Dipole Radiation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `dipole-radiation` module: Hertzian and half-wave dipole
radiation patterns with `Rr`, directivity, HPBW, `Prad`, and a polar plot.

**Architecture:** Pure math in `src/math/dipole.ts`. A minimal SVG polar plot
helper in `src/ui/polarplot.ts` (foundation prerequisite, currently absent).
UI in `src/modules/dipole-radiation/module.ts`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, custom SVG polar plot.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-dipole-radiation-design.md`

> **Foundation prerequisite:** `src/ui/polarplot.ts` does not yet exist.
> Task 0 scaffolds the minimal version this module needs. If a fuller
> foundation `polarplot.ts` lands separately, skip Task 0. Registry smoke test
> asserts presence **by id** under course `Antennes`.

---

### Task 0: Polar plot foundation helper

**Files:**
- Create: `src/ui/polarplot.ts`

> No unit test — DOM/SVG render helper, same convention as `src/ui/plots.ts`
> (`linePlot` has no unit test). Verified by `npm run build` (type-check) and
> the dipole module's registry smoke test (import chain).

- [ ] **Step 1: Create `src/ui/polarplot.ts`**

```ts
// ponytail: minimal SVG polar plot, no pan/zoom/animation. Re-renders on
// update (cheap for <2k points). Add diff-update / interactivity when a
// module needs it.
export interface PolarSample { theta: number; r: number }
export interface PolarSeries { label: string; samples: PolarSample[] }
export interface PolarOpts { title?: string; db?: boolean; half?: boolean }

const SVGNS = 'http://www.w3.org/2000/svg';
const DB_FLOOR = -40; // ponytail: radiation-pattern dB floor
const PALETTE = ['#1a1a1a', '#6b4f1d', '#3b6b4f', '#4f3b6b', '#6b3b4f'];

function colorFor(label: string): string {
  let h = 0; for (const c of label) h = (h * 31 + c.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

function normR(r: number, db: boolean): number {
  if (db) {
    const dbVal = 20 * Math.log10(Math.max(r, 1e-9));
    return Math.max((dbVal - DB_FLOOR) / (0 - DB_FLOOR), 0);
  }
  return r;
}

export function polarPlot(host: HTMLElement, series: PolarSeries[], opts: PolarOpts = {}): { update: (s: PolarSeries[]) => void } {
  host.innerHTML = '';
  const size = 360, cx = size / 2, cy = size / 2, R = size / 2 - 24;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));

  if (opts.title) {
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', String(cx)); t.setAttribute('y', '16');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-size', '12'); t.setAttribute('fill', '#888');
    t.textContent = opts.title;
    svg.appendChild(t);
  }

  const grid = document.createElementNS(SVGNS, 'g');
  grid.setAttribute('stroke', '#e5e0d2'); grid.setAttribute('fill', 'none');
  for (let i = 1; i <= 4; i++) {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(R * i / 4));
    grid.appendChild(c);
  }
  for (let a = 0; a < 360; a += 30) {
    const rad = a * Math.PI / 180;
    const l = document.createElementNS(SVGNS, 'line');
    l.setAttribute('x1', String(cx)); l.setAttribute('y1', String(cy));
    l.setAttribute('x2', String(cx + R * Math.cos(rad))); l.setAttribute('y2', String(cy - R * Math.sin(rad)));
    grid.appendChild(l);
  }
  svg.appendChild(grid);

  const drawSeries = (s: PolarSeries) => {
    // ponytail: half → keep only upper-half samples (θ ∈ [0, π]).
    const samples = opts.half ? s.samples.filter((p) => Math.sin(p.theta) >= -1e-9) : s.samples;
    const pts = samples.map((p) => {
      const nr = normR(p.r, !!opts.db);
      const x = cx + R * nr * Math.cos(p.theta);
      const y = cy - R * nr * Math.sin(p.theta);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const poly = document.createElementNS(SVGNS, 'polyline');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'rgba(0,0,0,0.05)');
    poly.setAttribute('stroke', colorFor(s.label));
    poly.setAttribute('stroke-width', '1.5');
    svg.appendChild(poly);
  };
  for (const s of series) drawSeries(s);
  host.appendChild(svg);

  return {
    update: (next: PolarSeries[]) => { host.innerHTML = ''; polarPlot(host, next, opts); },
  };
}
```

- [ ] **Step 2: Build (type-check + bundle)** — `npm run build` → passes.

- [ ] **Step 3: Commit**

```sh
git add src/ui/polarplot.ts
git commit -m "feat(ui): minimal SVG polar plot helper for radiation patterns"
```

---

### Task 1: Dipole radiation math

**Files:**
- Create: `src/math/dipole.ts`
- Create: `tests/math/dipole.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hertzianPattern, halfWavePattern, hertzianRr, halfWaveRr,
  directivity, directivityDbi, hpbw, radiatedPower,
} from '../../src/math/dipole.ts';

test('hertzianPattern: max 1 at broadside, null at endfire', () => {
  assert.ok(Math.abs(hertzianPattern(Math.PI / 2) - 1) < 1e-9, 'broadside');
  assert.ok(hertzianPattern(0) < 1e-9, 'endfire 0');
  assert.ok(hertzianPattern(Math.PI) < 1e-9, 'endfire π'); // |sin π| ≈ 1e-16, not exact 0
});

test('halfWavePattern: max 1 at broadside, null at endfire (guarded 0/0)', () => {
  assert.ok(Math.abs(halfWavePattern(Math.PI / 2) - 1) < 1e-9, 'broadside');
  assert.ok(halfWavePattern(0) < 1e-9, 'endfire 0');
  assert.ok(halfWavePattern(Math.PI) < 1e-9, 'endfire π');
});

test('hertzianRr(0.1, 1.0) = 80π²·0.01 ≈ 7.8957', () => {
  assert.ok(Math.abs(hertzianRr(0.1, 1.0) - 80 * Math.PI ** 2 * 0.01) < 1e-6);
  assert.ok(Math.abs(hertzianRr(0.1, 1.0) - 7.8957) < 1e-3);
});

test('halfWaveRr = 73 Ω', () => {
  assert.equal(halfWaveRr(), 73);
});

test('directivity: hertzian 1.5, halfwave 1.64', () => {
  assert.ok(Math.abs(directivity('hertzian') - 1.5) < 1e-9);
  assert.ok(Math.abs(directivity('halfwave') - 1.64) < 1e-9);
});

test('directivityDbi: hertzian ≈ 1.76, halfwave ≈ 2.15', () => {
  assert.ok(Math.abs(directivityDbi('hertzian') - 10 * Math.log10(1.5)) < 1e-9);
  assert.ok(Math.abs(directivityDbi('hertzian') - 1.76) < 0.02);
  assert.ok(Math.abs(directivityDbi('halfwave') - 2.15) < 0.02);
});

test('hpbw: hertzian 90°, halfwave ≈ 78°', () => {
  assert.equal(hpbw('hertzian'), 90);
  assert.ok(Math.abs(hpbw('halfwave') - 78) < 1);
});

test('radiatedPower(1, 73) = 36.5 W', () => {
  assert.ok(Math.abs(radiatedPower(1, 73) - 36.5) < 1e-9);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `src/math/dipole.ts`**

```ts
export type DipoleType = 'hertzian' | 'halfwave';

// Normalized |F(θ)|, max = 1 at broadside (θ = π/2).
export function hertzianPattern(theta: number): number {
  return Math.abs(Math.sin(theta));
}

// Normalized |cos(π/2·cos θ)/sin θ|; already peaks at 1 at θ = π/2.
// ponytail: guard sin θ → 0 (endfire nulls at 0 and π); the limit is 0.
export function halfWavePattern(theta: number): number {
  const s = Math.sin(theta);
  if (Math.abs(s) < 1e-9) return 0;
  return Math.abs((Math.cos((Math.PI / 2) * Math.cos(theta))) / s);
}

// Hertzian radiation resistance: 80π²(l/λ)² [Ω].
export function hertzianRr(length: number, wavelength: number): number {
  return 80 * Math.PI * Math.PI * (length / wavelength) ** 2;
}

// Half-wave radiation resistance: textbook ≈ 73 Ω.
// ponytail: constant; arbitrary-length needs the full current integral.
export function halfWaveRr(): number {
  return 73;
}

// Directivity D (linear).
// ponytail: textbook constants for the two canonical dipoles; derive from the
// pattern integral (4π/ΩA) if arbitrary dipoles are added.
export function directivity(type: DipoleType): number {
  return type === 'hertzian' ? 1.5 : 1.64;
}

// Directivity in dBi = 10·log10(D).
export function directivityDbi(type: DipoleType): number {
  return 10 * Math.log10(directivity(type));
}

// Half-power beamwidth [degrees].
// ponytail: textbook constants; derive numerically from |F|² = ½ if needed.
export function hpbw(type: DipoleType): number {
  return type === 'hertzian' ? 90 : 78;
}

// Radiated power: Prad = ½·I₀²·Rr.
export function radiatedPower(I0: number, Rr: number): number {
  return 0.5 * I0 * I0 * Rr;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/dipole.ts tests/math/dipole.test.ts
git commit -m "feat(math): dipole radiation patterns, Rr, directivity, HPBW, Prad"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/dipole-radiation/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create `src/modules/dipole-radiation/module.ts`**

Inputs: `type` selector (`hertzian`/`halfwave`), `l/λ` and `I₀` sliders,
`scale` selector (`linear`/`dB`). On `update`: pick `Rr` (Hertzian uses
`hertzianRr(lOverLambda, 1)` — passing the ratio as length with λ = 1; half-wave
uses the fixed 73 Ω), render readouts `Rr`, `D` (`directivity` +
`directivityDbi`), `HPBW`, `Prad` (`radiatedPower`), and re-render the polar
plot with 181 samples over θ ∈ [0, 2π]. `db` option follows the `scale`
selector. Mirror `feedback/module.ts` wiring (re-call the plot helper each
update; it clears its own host).

```ts
import type { Module } from '../../module.ts';
import {
  hertzianPattern, halfWavePattern, hertzianRr, halfWaveRr,
  directivity, directivityDbi, hpbw, radiatedPower, type DipoleType,
} from '../../math/dipole.ts';
import { polarPlot } from '../../ui/polarplot.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function sig3(x: number): string { return x.toPrecision(3); }

function patternFor(type: DipoleType, theta: number): number {
  return type === 'hertzian' ? hertzianPattern(theta) : halfWavePattern(theta);
}

function render(host: HTMLElement) {
  const type = selectWave('Type', ['hertzian', 'halfwave'], 'hertzian');
  const lOverLambda = slider('l/λ', 0.01, 0.5, 0.01, 0.1);
  const I0 = slider('I₀ (A)', 0, 10, 0.01, 1);
  const scale = selectWave('Scale', ['linear', 'dB'], 'linear');
  for (const w of [type, lOverLambda, I0, scale]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const samples = (t: DipoleType) => {
    const N = 181;
    const out: { theta: number; r: number }[] = [];
    for (let i = 0; i < N; i++) {
      const th = (2 * Math.PI * i) / (N - 1);
      out.push({ theta: th, r: patternFor(t, th) });
    }
    return out;
  };

  const update = () => {
    const t = type.value() as DipoleType;
    const Rr = t === 'hertzian' ? hertzianRr(lOverLambda.value(), 1) : halfWaveRr();
    const D = directivity(t);
    readouts.innerHTML = `
      <div><b>Rr:</b> ${sig3(Rr)} Ω</div>
      <div><b>D:</b> ${sig3(D)} (${directivityDbi(t).toFixed(2)} dBi)</div>
      <div><b>HPBW:</b> ${hpbw(t)}°</div>
      <div><b>Prad:</b> ${sig3(radiatedPower(I0.value(), Rr))} W</div>
    `;
    const series = [{ label: t, samples: samples(t) }];
    polarPlot(plotHost, series, { title: 'E-plane pattern', db: scale.value() === 'dB' });
  };

  for (const w of [type, lOverLambda, I0, scale]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'dipole-radiation',
  title: 'Dipole Radiation',
  course: 'Antennes',
  description: 'Hertzian and half-wave dipole radiation patterns: Rr, directivity, HPBW, Prad.',
  icon: 'Θ',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add the import after the last
  module import and append `dipoleRadiation` to the `modules` array.

```ts
import { module as dipoleRadiation } from './modules/dipole-radiation/module.ts';
```

```ts
export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp, oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward, dipoleRadiation];
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/dipole-radiation/module.ts src/registry.ts
git commit -m "feat(modules): dipole radiation analyzer with polar plot"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** — append to `tests/smoke.test.ts`:

```ts
test('dipole-radiation module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'dipole-radiation');
  assert.ok(m && m.course === 'Antennes', 'dipole-radiation missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching `Type` swaps the
  polar pattern (Hertzian `sin θ` figure-8 vs half-wave narrower lobe);
  raising `l/λ` scales the Hertzian `Rr` (and `Prad`) quadratically; raising
  `I₀` scales `Prad`; toggling `Scale` → `dB` flattens the lobes and floors
  the nulls at −40 dB.

- [ ] **Step 3: README** — after the **Vermogenselektronica** section block,
  before `## Develop`, add a new course section:

```
**Antennes — antennas**

- **Dipole Radiation** — Hertzian and half-wave patterns: Rr, directivity, HPBW, Prad on a polar plot.
```

- [ ] **Step 4: CHANGELOG** — under `### Added` in `## [Unreleased]`, append:

```
- Dipole Radiation module: Hertzian and half-wave patterns with Rr, directivity, HPBW, Prad and a polar plot.
- Internal: polar plot helper (`src/ui/polarplot.ts`) for radiation-pattern modules.
```

- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: dipole-radiation smoke test, README, changelog"
```
