# Elektronica1B Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared complex-number layer (`src/math/complex.ts`), `Tf`-at-jω
evaluation, and a log-frequency Bode plot helper (`src/ui/acplot.ts`); refactor
`bode.ts` onto it. Depended on by `freq-response`, `active-filter`, `oscillator`.

**Architecture:** Pure math in `src/math/complex.ts`. DOM helper in
`src/ui/acplot.ts` mirroring `src/ui/plots.ts`. No module, no registry entry.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot.

**Spec:** `docs/artifacts/specs/elektronica1b/2026-06-28-foundation-design.md`

> **Parallel-dispatch note:** This plan must finish and merge before
> `freq-response`, `active-filter`, and `oscillator` start. No registry edits, so
> no merge conflict with the standalone module plans.

---

### Task 1: Complex arithmetic

**Files:**
- Create: `src/math/complex.ts`
- Create: `tests/math/complex.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cadd, csub, cmul, cdiv, cabs, cphaseDeg, fromPolar } from '../../src/math/complex.ts';

test('cmul (1+2j)(3+4j) = -5+10j', () => {
  const r = cmul({ re: 1, im: 2 }, { re: 3, im: 4 });
  assert.ok(Math.abs(r.re - -5) < 1e-9 && Math.abs(r.im - 10) < 1e-9, JSON.stringify(r));
});
test('cdiv 1/j = -j', () => {
  const r = cdiv({ re: 1, im: 0 }, { re: 0, im: 1 });
  assert.ok(Math.abs(r.re) < 1e-9 && Math.abs(r.im - -1) < 1e-9, JSON.stringify(r));
});
test('cabs(3+4j) = 5', () => { assert.ok(Math.abs(cabs({ re: 3, im: 4 }) - 5) < 1e-9); });
test('cphaseDeg(0+1j) = 90', () => { assert.ok(Math.abs(cphaseDeg({ re: 0, im: 1 }) - 90) < 1e-9); });
test('fromPolar(2,90) = 0+2j', () => {
  const r = fromPolar(2, 90);
  assert.ok(Math.abs(r.re) < 1e-9 && Math.abs(r.im - 2) < 1e-9, JSON.stringify(r));
});
void cadd; void csub;
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/complex.ts`**

```ts
export type Complex = { re: number; im: number };

export const cadd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a: Complex, b: Complex): Complex => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});
export const cscale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k });
export function cdiv(a: Complex, b: Complex): Complex {
  const d = b.re * b.re + b.im * b.im;
  if (d === 0) throw new Error('cdiv: division by zero');
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
export const cabs = (a: Complex): number => Math.hypot(a.re, a.im);
export const cphaseDeg = (a: Complex): number => (Math.atan2(a.im, a.re) * 180) / Math.PI;
export const fromPolar = (mag: number, phaseDeg: number): Complex => {
  const r = (phaseDeg * Math.PI) / 180;
  return { re: mag * Math.cos(r), im: mag * Math.sin(r) };
};
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/complex.ts tests/math/complex.test.ts
git commit -m "feat(math): complex-number arithmetic helper"
```

---

### Task 2: Tf-at-jω evaluation + bode.ts refactor

**Files:**
- Modify: `src/math/complex.ts`
- Modify: `tests/math/complex.test.ts`
- Modify: `src/math/bode.ts`

- [ ] **Step 1: Add failing tests**

```ts
import { evalTfAtJw, magPhaseAtJw } from '../../src/math/complex.ts';

test('H=1/(s+1) at w=1 → -3.01 dB, -45°', () => {
  const tf = { num: [1], den: [1, 1] };
  const { magDb, phaseDeg } = magPhaseAtJw(tf, 1);
  assert.ok(Math.abs(magDb - -3.0103) < 0.01, `magDb=${magDb}`);
  assert.ok(Math.abs(phaseDeg - -45) < 0.01, `phaseDeg=${phaseDeg}`);
});
void evalTfAtJw;
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement evaluation in `complex.ts`**

```ts
import type { Tf } from './tf.ts';

// Complex Horner over highest-power-first real coefficients, evaluated at jω.
function evalPolyAtJw(coef: number[], omega: number): Complex {
  let acc: Complex = { re: 0, im: 0 };
  const s: Complex = { re: 0, im: omega };
  for (const c of coef) acc = cadd(cmul(acc, s), { re: c, im: 0 });
  return acc;
}

export function evalTfAtJw(tf: Tf, omega: number): Complex {
  return cdiv(evalPolyAtJw(tf.num, omega), evalPolyAtJw(tf.den, omega));
}

export function magPhaseAtJw(tf: Tf, omega: number): { magDb: number; phaseDeg: number } {
  const h = evalTfAtJw(tf, omega);
  return { magDb: 20 * Math.log10(cabs(h)), phaseDeg: cphaseDeg(h) };
}
```

- [ ] **Step 4: Refactor `src/math/bode.ts`** to use `magPhaseAtJw`; delete
  `evalPolyAtRealCoef` and the dead first computation. Final content:

```ts
import type { Tf } from './tf.ts';
import { magPhaseAtJw } from './complex.ts';

export type BodePoint = { omega: number; magDb: number; phaseDeg: number };

export function bode(sys: Tf, points: { omega: number }[]): BodePoint[] {
  return points.map(({ omega }) => ({ omega, ...magPhaseAtJw(sys, omega) }));
}
```

- [ ] **Step 5: Run tests, verify pass** — `npm test` → PASS (new test + existing `bode.test.ts` still green).

- [ ] **Step 6: Commit**

```sh
git add src/math/complex.ts src/math/bode.ts tests/math/complex.test.ts
git commit -m "feat(math): evaluate Tf at jω; refactor bode onto complex helper"
```

---

### Task 3: Bode plot helper

**Files:**
- Create: `src/ui/acplot.ts`

- [ ] **Step 1: Implement `src/ui/acplot.ts`** (DOM-only; verified by build)

```ts
import uPlot from 'uplot';
if (typeof document !== 'undefined') { void import('uplot/dist/uPlot.min.css'); }

export type BodePlotPoint = { omega: number; magDb: number; phaseDeg: number };

export function bodePlot(host: HTMLElement, points: BodePlotPoint[], opts: { title?: string } = {}) {
  host.innerHTML = '';
  const freqs = points.map((p) => p.omega / (2 * Math.PI));
  const mag = points.map((p) => p.magDb);
  const phase = points.map((p) => p.phaseDeg);
  const mk = (label: string, ys: number[], yLabel: string) => {
    const div = document.createElement('div');
    host.appendChild(div);
    return new uPlot({
      width: host.clientWidth || 600,
      height: 180,
      title: opts.title && label === 'Magnitude' ? opts.title : '',
      scales: { x: { time: false, distr: 3 } }, // log-frequency
      axes: [{ label: 'f (Hz)' }, { label: yLabel }],
      series: [{}, { label, stroke: '#1a1a1a', width: 1.5 }],
    }, [freqs, ys], div);
  };
  const pm = mk('Magnitude', mag, 'dB');
  const pp = mk('Phase', phase, 'deg');
  return {
    update(next: BodePlotPoint[]) {
      const f = next.map((p) => p.omega / (2 * Math.PI));
      pm.setData([f, next.map((p) => p.magDb)]);
      pp.setData([f, next.map((p) => p.phaseDeg)]);
    },
  };
}
```

- [ ] **Step 2: Type-check and build** — `npm run build` → passes.

- [ ] **Step 3: Commit**

```sh
git add src/ui/acplot.ts
git commit -m "feat(ui): log-frequency Bode (magnitude/phase) plot helper"
```

---

### Task 4: Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add an internal note** under `## [Unreleased]` → `### Added`:

```md
- Internal: complex-number math helper (`src/math/complex.ts`) and log-frequency Bode plot helper (`src/ui/acplot.ts`) for the Elektronica1B AC modules.
```

- [ ] **Step 2: Commit**

```sh
git add CHANGELOG.md
git commit -m "docs: changelog for Elektronica1B complex/Bode foundation"
```
