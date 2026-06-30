# S-Parameters & Two-Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `s-parameters` module: two-port S→Z conversion, return/insertion
loss, transducer gain, stability (K, |Δ|), with Smith chart (S11/S22), Bode plot
(|S21| dB), and signal-flow-graph SVG.

**Architecture:** Pure math in `src/math/sparams.ts` (uses `complex.ts`). UI in
`src/modules/s-parameters/module.ts` using `smithChart`, `bodePlot`, `svgPlot`.
One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `bodePlot`, SVG via
`smithChart` + `svgPlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-s-parameters-design.md`

> **Foundation dependency:** Requires `src/ui/smith.ts` and `src/math/tl.ts`
> from the foundation plan, plus existing `src/ui/acplot.ts`. Registry smoke
> test asserts presence **by id**.

---

### Task 1: S-parameter conversions and metrics

**Files:**
- Create: `src/math/sparams.ts`
- Create: `tests/math/sparams.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sToZ, returnLoss, insertionLoss, transducerGain, isStable } from '../../src/math/sparams.ts';

const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

test('returnLoss |S11|=0.2 -> 14 dB', () => {
  assert.ok(near(returnLoss({ re: 0.2, im: 0 }), 13.98, 0.1));
});

test('insertionLoss |S21|=0.8 -> 1.94 dB', () => {
  assert.ok(near(insertionLoss({ re: 0.8, im: 0 }), 1.938, 0.01));
});

test('transducerGain |S21|=0.9 -> 0.92 dB', () => {
  assert.ok(near(transducerGain({ re: 0.9, im: 0 }), 0.915, 0.01));
});

test('sToZ ideal unilateral amplifier', () => {
  const z = sToZ(
    { S11: { re: 0, im: 0 }, S21: { re: 1, im: 0 }, S12: { re: 0, im: 0 }, S22: { re: 0, im: 0 } },
    50,
  );
  assert.ok(near(z.Z11.re, 50) && near(z.Z22.re, 50), `Z11=${z.Z11.re}, Z22=${z.Z22.re}`);
  assert.ok(near(z.Z21.re, 100), `Z21=${z.Z21.re}`);
  assert.ok(near(z.Z12.re, 0), `Z12=${z.Z12.re}`);
});

test('isStable unilateral (S12=0) -> stable', () => {
  const r = isStable(
    { S11: { re: 0.2, im: 0 }, S21: { re: 0.8, im: 0 }, S12: { re: 0, im: 0 }, S22: { re: 0.3, im: 0 } },
  );
  assert.ok(r.stable, `K=${r.K}, delta=${r.delta}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/sparams.ts`**

```ts
import type { Complex } from './complex.ts';
import { cadd, csub, cmul, cdiv, cabs, cscale } from './complex.ts';

export type SParams = { S11: Complex; S21: Complex; S12: Complex; S22: Complex };
export type ZParams = { Z11: Complex; Z12: Complex; Z21: Complex; Z22: Complex };

export function sToZ(s: SParams, z0: number): ZParams {
  const one: Complex = { re: 1, im: 0 };
  const denom = csub(
    cmul(csub(one, s.S11), csub(one, s.S22)),
    cmul(s.S12, s.S21),
  );
  const num11 = cadd(cmul(cadd(one, s.S11), csub(one, s.S22)), cmul(s.S12, s.S21));
  const num22 = cadd(cmul(csub(one, s.S11), cadd(one, s.S22)), cmul(s.S12, s.S21));
  const two: Complex = { re: 2, im: 0 };
  return {
    Z11: cscale(cdiv(num11, denom), z0),
    Z12: cscale(cdiv(cmul(two, s.S12), denom), z0),
    Z21: cscale(cdiv(cmul(two, s.S21), denom), z0),
    Z22: cscale(cdiv(num22, denom), z0),
  };
}

export function returnLoss(s11: Complex): number {
  return -20 * Math.log10(cabs(s11));
}

export function insertionLoss(s21: Complex): number {
  return -20 * Math.log10(cabs(s21));
}

export function transducerGain(s21: Complex): number {
  return 10 * Math.log10(cabs(s21) ** 2);
}

export function isStable(s: SParams): { K: number; delta: number; stable: boolean } {
  const delta = cabs(csub(cmul(s.S11, s.S22), cmul(s.S12, s.S21)));
  const s12s21 = cabs(cmul(s.S12, s.S21));
  const K = (1 - cabs(s.S11) ** 2 - cabs(s.S22) ** 2 + delta ** 2) / (2 * s12s21);
  // ponytail: unilateral (S12=0) -> s12s21=0 -> K=Inf -> stable
  const stable = s12s21 === 0 ? delta < 1 : K > 1 && delta < 1;
  return { K, delta, stable };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/sparams.ts tests/math/sparams.test.ts
git commit -m "feat(math): two-port S-parameter to Z conversion, loss/gain metrics, stability"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/s-parameters/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders for S11/S21/S12/S22 (re/im,
  −1..1), Z₀ (default 50), cutoff frequency fc for the single-pole S21(f)
  model. On `update`: compute `sToZ`, `returnLoss`, `insertionLoss`,
  `transducerGain`, `isStable`. Render `smithChart` with S11/S22 points,
  `bodePlot` with |S21(f)| dB and |S11(f)| dB vs frequency, `svgPlot` for a
  static signal-flow-graph (source→a1→[DUT]→b2→load with S-param labels).
  Readouts: RL, IL, Gt, K, |Δ|, stable?. Mirror `src/modules/feedback/module.ts`
  wiring.

```ts
export const module: Module = {
  id: 's-parameters',
  title: 'S-Parameters & Two-Port',
  course: 'Hoogfrequenttechniek',
  description: 'Two-port S-parameters: S→Z, return/insertion loss, transducer gain, stability.',
  icon: 'S',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as sParams }
  from './modules/s-parameters/module.ts';` and append `sParams`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/s-parameters/module.ts src/registry.ts
git commit -m "feat(modules): S-parameter two-port analyzer with Smith chart and Bode plot"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('s-parameters module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 's-parameters');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 's-parameters missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; changing S11 moves the point on
  the Smith chart; return loss and |S21| dB update live; stability indicator
  flips when S12 is increased.
- [ ] **Step 3: README** — append:
  `- **S-Parameters & Two-Port** — S→Z conversion, return/insertion loss, transducer gain, stability (K, |Δ|).`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- S-Parameters module: two-port S→Z, return/insertion loss, transducer gain, stability, Smith chart, Bode plot, flow graph.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: s-parameters smoke test, README, changelog"
```
