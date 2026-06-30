# Impedance Matching Networks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `impedance-matching` module: L-networks (both solutions,
auto-selected topology), λ/4 transformer, and single-stub matching, each shown
as a load → intermediate → matched trajectory on the Smith chart.

**Architecture:** Pure math in `src/math/matching.ts` (imports `complex.ts` +
foundation `tl.ts`). UI in `src/modules/impedance-matching/module.ts` using the
foundation `smithChart` helper. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript (strict, ES2022, ESM), `node --test`,
foundation SVG Smith chart.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-impedance-matching-design.md`

> **Dependency:** The foundation plan `2026-06-29-foundation.md` must be merged
> first — it provides `src/math/tl.ts` (`zToGamma`, `gammaToZ`, `swr`,
> `zinLossless`, `quarterWaveZ`) and `src/ui/smith.ts` (`smithChart`). This plan
> imports them and does not redefine them.

> **Parallel-safety:** This plan appends one import line to `src/registry.ts`,
> one presence-by-id assertion to `tests/smoke.test.ts`, and one bullet each to
> `README.md` / `CHANGELOG.md` — all append-only. Conflicts with concurrent
> module plans are trivial.

---

### Task 1: Matching algebra (L-network, λ/4, single-stub)

**Files:**
- Create: `src/math/matching.ts`
- Create: `tests/math/matching.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lNetwork, applyLNetwork, quarterWaveMatch, singleStub } from '../../src/math/matching.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('quarterWaveMatch(100,50) -> sqrt(5000) = 70.7107', () => {
  const z0t = quarterWaveMatch({ re: 100, im: 0 }, 50);
  assert.ok(near(z0t, 70.71067811865476, 1e-6), `z0t=${z0t}`);
});

test('quarterWaveMatch throws on complex load', () => {
  assert.throws(() => quarterWaveMatch({ re: 50, im: 1 }, 50), /must be real/);
});

test('lNetwork ZL=50+j100, z0=50, f=1GHz: sol1 shunt C 2.546pF + series L 15.915nH, q=0', () => {
  const r = lNetwork({ re: 50, im: 100 }, 50, 1e9);
  assert.ok(near(r.q, 0), `q=${r.q}`);
  assert.equal(r.solutions.length, 2);
  const s0 = r.solutions[0]!;
  assert.equal(s0.order, 'shunt-series');
  assert.equal(s0.shunt.kind, 'C');
  assert.ok(near(s0.shunt.value, 2.5464790894703254e-12, 1e-15), `C=${s0.shunt.value}`);
  assert.equal(s0.series.kind, 'L');
  assert.ok(near(s0.series.value, 1.5915494309189538e-8, 1e-12), `L=${s0.series.value}`);
  const zin = applyLNetwork({ re: 50, im: 100 }, 50, s0, 1e9);
  assert.ok(near(zin.re, 50, 1e-6) && near(zin.im, 0, 1e-6), `zin=${JSON.stringify(zin)}`);
});

test('lNetwork ZL=50+j100 sol2 degenerate: shunt null, series C 1.5915pF', () => {
  const r = lNetwork({ re: 50, im: 100 }, 50, 1e9);
  const s1 = r.solutions[1]!;
  assert.equal(s1.shunt.kind, null);
  assert.equal(s1.series.kind, 'C');
  assert.ok(near(s1.series.value, 1.5915494309189532e-12, 1e-15), `C=${s1.series.value}`);
});

test('lNetwork ZL=100, z0=50: q=1, sol1 shunt C 1.592pF + series L 7.958nH', () => {
  const r = lNetwork({ re: 100, im: 0 }, 50, 1e9);
  assert.ok(near(r.q, 1), `q=${r.q}`);
  const s0 = r.solutions[0]!;
  assert.equal(s0.shunt.kind, 'C');
  assert.ok(near(s0.shunt.value, 1.5915494309189534e-12, 1e-15));
  assert.equal(s0.series.kind, 'L');
  assert.ok(near(s0.series.value, 7.957747154594767e-9, 1e-12));
});

test('singleStub ZL=100, z0=50: d≈{0.152,0.348}λ, lShort≈{0.152,0.348}λ, lOpen≈{0.098,0.402}λ', () => {
  const r = singleStub({ re: 100, im: 0 }, 50);
  assert.equal(r.solutions.length, 2, `n=${r.solutions.length}`);
  const ds = r.solutions.map((s) => s.d_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ds[0]! - 0.152) < 0.01, `d0=${ds[0]}`);
  assert.ok(Math.abs(ds[1]! - 0.348) < 0.01, `d1=${ds[1]}`);
  const ls = r.solutions.map((s) => s.lShort_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ls[0]! - 0.152) < 0.01 && Math.abs(ls[1]! - 0.348) < 0.01, `lShort=${ls}`);
  const los = r.solutions.map((s) => s.lOpen_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(los[0]! - 0.098) < 0.01 && Math.abs(los[1]! - 0.402) < 0.01, `lOpen=${los}`);
});

test('singleStub ZL=50+j100, z0=50: d≈{0.25,0.375}λ, lShort≈{0.0738,0.4262}λ', () => {
  const r = singleStub({ re: 50, im: 100 }, 50);
  assert.equal(r.solutions.length, 2);
  const ds = r.solutions.map((s) => s.d_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ds[0]! - 0.250) < 0.01 && Math.abs(ds[1]! - 0.375) < 0.01, `d=${ds}`);
  const ls = r.solutions.map((s) => s.lShort_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ls[0]! - 0.0738) < 0.01 && Math.abs(ls[1]! - 0.4262) < 0.01, `lShort=${ls}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL
  (`Cannot find module '../../src/math/matching.ts'`).

- [ ] **Step 3: Implement `src/math/matching.ts`**

```ts
import type { Complex } from './complex.ts';
import { cadd, cmul, cdiv } from './complex.ts';
import { zinLossless } from './tl.ts';

export type ElementKind = 'L' | 'C' | null;
export interface Element {
  kind: ElementKind;
  value: number; // L: Henry, C: Farad, null: 0
}

export interface LSolution {
  order: 'shunt-series' | 'series-shunt';
  shunt: Element;
  series: Element;
}
export interface LResult {
  solutions: LSolution[];
  q: number;
}

const EPS = 1e-9;

// series reactance X (ohms): X>0 -> L=X/w, X<0 -> C=-1/(w*X), X~0 -> absent.
function seriesEl(X: number, w: number): Element {
  if (Math.abs(X) < EPS) return { kind: null, value: 0 };
  return X > 0 ? { kind: 'L', value: X / w } : { kind: 'C', value: -1 / (w * X) };
}
// shunt susceptance B (siemens): B>0 -> C=B/w, B<0 -> L=-1/(w*B), B~0 -> absent.
function shuntEl(B: number, w: number): Element {
  if (Math.abs(B) < EPS) return { kind: null, value: 0 };
  return B > 0 ? { kind: 'C', value: B / w } : { kind: 'L', value: -1 / (w * B) };
}

function reactanceOf(e: Element, w: number): number {
  if (e.kind === null) return 0;
  return e.kind === 'L' ? w * e.value : -1 / (w * e.value);
}
function susceptanceOf(e: Element, w: number): number {
  if (e.kind === null) return 0;
  return e.kind === 'C' ? w * e.value : -1 / (w * e.value);
}

// L-network: match ZL to real Z0. Two solutions; topology auto-selected by
// Re(ZL) vs Z0. Q = sqrt(R_high/R_low - 1).
export function lNetwork(zL: Complex, z0: number, f: number): LResult {
  const w = 2 * Math.PI * f;
  const RL = zL.re, XL = zL.im;
  const GL = RL / (RL * RL + XL * XL);
  const BL = -XL / (RL * RL + XL * XL);
  const solutions: LSolution[] = [];

  if (RL >= z0) {
    // shunt-then-series: shunt Bp across load -> Re(Zp)=z0, series Xs cancels Im(Zp).
    const disc = GL * (1 / z0 - GL);
    if (disc < 0) return { solutions, q: NaN };
    const sq = Math.sqrt(disc);
    for (const s of [1, -1]) {
      const Bp = -BL + s * sq;
      const Bsum = BL + Bp; // = s*sq
      const den = GL * GL + Bsum * Bsum; // = GL/z0 by construction
      const Xs = Bsum / den; // = -Im(Zp)
      solutions.push({ order: 'shunt-series', shunt: shuntEl(Bp, w), series: seriesEl(Xs, w) });
    }
  } else {
    // series-then-shunt: series Xs -> Re(1/Z1)=1/z0, shunt Bp cancels Im(1/Z1).
    const disc = RL * (z0 - RL);
    const sq = Math.sqrt(disc);
    for (const s of [1, -1]) {
      const Xs = -XL + s * sq;
      const Z1im = XL + Xs;
      const Bp = Z1im / (RL * z0);
      solutions.push({ order: 'series-shunt', series: seriesEl(Xs, w), shunt: shuntEl(Bp, w) });
    }
  }
  const q = Math.sqrt(Math.max(RL, z0) / Math.min(RL, z0) - 1);
  return { solutions, q };
}

// Zin after applying an L-network solution (for |Γ| readout + Smith trajectory).
export function applyLNetwork(zL: Complex, z0: number, sol: LSolution, f: number): Complex {
  const w = 2 * Math.PI * f;
  const Xs = reactanceOf(sol.series, w);
  const Bp = susceptanceOf(sol.shunt, w);
  if (sol.order === 'shunt-series') {
    let Zp = zL;
    if (sol.shunt.kind !== null) {
      const Zsh: Complex = { re: 0, im: -1 / Bp }; // impedance of shunt admittance jBp
      Zp = cdiv(cmul(zL, Zsh), cadd(zL, Zsh));
    }
    return cadd(Zp, { re: 0, im: Xs });
  }
  const Z1 = cadd(zL, { re: 0, im: Xs });
  if (sol.shunt.kind === null) return Z1;
  const Zsh: Complex = { re: 0, im: -1 / Bp };
  return cdiv(cmul(Z1, Zsh), cadd(Z1, Zsh));
}

// λ/4 transformer characteristic impedance for a REAL load: Z0' = sqrt(z0 * Re(zL)).
// Throws if Im(zL) != 0 (cancel reactance first). The foundation quarterWaveZ
// gives Z0'^2/zL = z0 as the consistency check.
export function quarterWaveMatch(zL: Complex, z0: number): number {
  if (Math.abs(zL.im) > 1e-9) throw new Error('quarterWaveMatch: zL must be real (cancel reactance first)');
  if (zL.re <= 0) throw new Error('quarterWaveMatch: Re(zL) must be positive');
  return Math.sqrt(z0 * zL.re);
}

export interface StubSolution {
  d_wl: number; // distance from load, wavelengths (0 < d < 0.5)
  lShort_wl: number; // short-circuited stub length, wavelengths
  lOpen_wl: number; // open-circuited stub length, wavelengths
}
export interface StubResult {
  solutions: StubSolution[];
}

// ponytail: 5000-point sweep + tolerance, not closed form. Closed form exists
// (Gamma rotation) but the sweep is robust for complex ZL and cheap; upgrade
// only if performance matters (it won't).
export function singleStub(zL: Complex, z0: number): StubResult {
  const N = 5000;
  const tol = 0.005;
  const found: StubSolution[] = [];
  for (let i = 1; i < N; i++) {
    const d_wl = i / (2 * N); // 0 < d < 0.5 lambda
    const beta_d = 2 * Math.PI * d_wl;
    const t = Math.tan(beta_d);
    if (!isFinite(t)) continue;
    const Zd = zinLossless(zL, beta_d, z0);
    const Yd = cdiv({ re: 1, im: 0 }, Zd);
    const yRe = Yd.re * z0; // normalized conductance
    const yIm = Yd.im * z0; // normalized susceptance
    if (Math.abs(yRe - 1) < tol && Math.abs(yIm) < 1e3) {
      const b = yIm;
      let lShort = Math.atan(1 / b) / (2 * Math.PI); // cot(bl)=b -> tan(bl)=1/b
      if (lShort < 0) lShort += 0.5;
      let lOpen = Math.atan(-b) / (2 * Math.PI); // tan(bl)=-b
      if (lOpen < 0) lOpen += 0.5;
      found.push({ d_wl, lShort_wl: lShort, lOpen_wl: lOpen });
    }
  }
  // dedupe by 0.01 lambda
  const uniq: StubSolution[] = [];
  for (const s of found) {
    if (!uniq.some((u) => Math.abs(u.d_wl - s.d_wl) < 0.01)) uniq.push(s);
  }
  return { solutions: uniq };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/matching.ts tests/math/matching.test.ts
git commit -m "feat(math): L-network, lambda/4, and single-stub impedance matching"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/impedance-matching/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file**

```ts
import type { Module } from '../../module.ts';
import type { Complex } from '../../math/complex.ts';
import { cabs } from '../../math/complex.ts';
import { zToGamma, zinLossless } from '../../math/tl.ts';
import { lNetwork, applyLNetwork, quarterWaveMatch, singleStub, type LSolution, type ElementKind } from '../../math/matching.ts';
import { smithChart, type SmithPoint } from '../../ui/smith.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function sig3(x: number): string {
  return x.toPrecision(3);
}
function fmtEl(kind: ElementKind, value: number): string {
  if (kind === null) return '—';
  return kind === 'L' ? `${sig3(value * 1e9)} nH` : `${sig3(value * 1e12)} pF`;
}

function render(host: HTMLElement) {
  const matchType = selectWave('Match type', ['L-network', 'λ/4 transformer', 'Single-stub'], 'L-network');
  const ZLre = slider('ZL re (Ω)', 1, 500, 1, 100);
  const ZLim = slider('ZL im (Ω)', -200, 200, 1, 0);
  const Z0 = slider('Z0 (Ω)', 10, 200, 1, 50);
  const fMHz = slider('f (MHz)', 100, 5000, 10, 1000);
  for (const w of [matchType, ZLre, ZLim, Z0, fMHz]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const smith = smithChart(plotHost, { title: 'Match trajectory' });

  const update = () => {
    const zL: Complex = { re: ZLre.value(), im: ZLim.value() };
    const z0 = Z0.value();
    const f = fMHz.value() * 1e6;
    const gammaBefore = cabs(zToGamma(zL, z0));
    const pts: SmithPoint[] = [{ z: zL, label: 'ZL' }];
    let html = `<div><b>|Γ| before:</b> ${sig3(gammaBefore)}</div>`;
    try {
      if (matchType.value() === 'L-network') {
        const r = lNetwork(zL, z0, f);
        html += `<div><b>Q:</b> ${sig3(r.q)}</div>`;
        r.solutions.forEach((s: LSolution, i: number) => {
          const zin = applyLNetwork(zL, z0, s, f);
          if (i === 0) pts.push({ z: zin, label: 'Z (sol 1)' });
          html += `<div><b>Sol ${i + 1}</b> (${s.order}): shunt ${fmtEl(s.shunt.kind, s.shunt.value)}, series ${fmtEl(s.series.kind, s.series.value)} → |Γ|=${sig3(cabs(zToGamma(zin, z0)))}</div>`;
        });
      } else if (matchType.value() === 'λ/4 transformer') {
        const z0t = quarterWaveMatch(zL, z0);
        html += `<div><b>Z0' (λ/4):</b> ${sig3(z0t)} Ω</div>`;
      } else {
        const r = singleStub(zL, z0);
        r.solutions.forEach((s, i) => {
          if (i === 0) pts.push({ z: zinLossless(zL, 2 * Math.PI * s.d_wl, z0), label: 'Z(d)' });
          html += `<div><b>Sol ${i + 1}</b>: d=${sig3(s.d_wl)}λ, lShort=${sig3(s.lShort_wl)}λ, lOpen=${sig3(s.lOpen_wl)}λ</div>`;
        });
      }
    } catch (e) {
      html += `<div>error: ${(e as Error).message}</div>`;
    }
    pts.push({ z: { re: z0, im: 0 }, label: 'Z0' });
    smith.update(pts);
    readouts.innerHTML = html;
  };

  for (const w of [matchType, ZLre, ZLim, Z0, fMHz]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'impedance-matching',
  title: 'Impedance Matching',
  course: 'Hoogfrequenttechniek',
  description: 'Impedance matching: L-networks, λ/4 transformer, single-stub — with Smith-chart trajectory.',
  icon: 'Γ',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — append the import (after the
  `smpsForward` import line) and append `impedanceMatching` to the `modules`
  array.

```ts
import { module as impedanceMatching } from './modules/impedance-matching/module.ts';
```

```ts
export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp, oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward, impedanceMatching];
```

- [ ] **Step 3: Run tests** — `npm test` → PASS (math tests still green; the new
  module imports cleanly via the registry smoke test).
- [ ] **Step 4: Build** — `npm run build` → type-check + bundle pass.
- [ ] **Step 5: Commit**

```sh
git add src/modules/impedance-matching/module.ts src/registry.ts
git commit -m "feat(modules): impedance-matching analyzer with Smith trajectory"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** — append to `tests/smoke.test.ts`:

```ts
test('impedance-matching module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'impedance-matching');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'impedance-matching missing');
});
```

- [ ] **Step 2: Run tests** — `npm test` → PASS (new smoke assertion green).

- [ ] **Step 3: README** — append a new course section after the Vermogenselektronica
  block (append-only; if a parallel agent already added the heading, append only
  the bullet under it):

```md
**Hoogfrequenttechniek — high-frequency techniques**

- **Impedance Matching** — L-networks, λ/4 transformer, and single-stub matching with a Smith-chart match trajectory.
```

- [ ] **Step 4: CHANGELOG** — under `## [Unreleased]` → `### Added`:

```md
- Impedance Matching module: L-networks, λ/4 transformer, single-stub matching with Smith-chart trajectory (Hoogfrequenttechniek).
```

- [ ] **Step 5: Manual check** — `npm run dev`; switching match type swaps the
  readouts; dragging `ZL im` off zero and selecting `λ/4 transformer` shows the
  `must be real` error; the Smith chart plots `ZL → intermediate → Z0` (center).

- [ ] **Step 6: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: impedance-matching smoke test, README, changelog"
```
