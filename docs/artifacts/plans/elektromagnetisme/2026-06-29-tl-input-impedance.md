# TL Input Impedance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `tl-input-impedance` module: Zin vs line length, SWR, |Γ|, λ/4
transformer, voltage extrema, with Smith chart locus and line plot.

**Architecture:** Pure math in `src/math/tlinputz.ts` (uses foundation `tl.ts` +
`complex.ts`). UI in `src/modules/tl-input-impedance/module.ts` using `linePlot`
+ `smithChart`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`, SVG via
`smithChart`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-tl-input-impedance-design.md`

> **Foundation dependency:** Requires `src/math/tl.ts` and `src/ui/smith.ts`
> from the foundation plan. Registry smoke test asserts presence **by id**.

---

### Task 1: Zin sweep and voltage extrema

**Files:**
- Create: `src/math/tlinputz.ts`
- Create: `tests/math/tlinputz.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zinSweep, vmaxPosition, vminPosition } from '../../src/math/tlinputz.ts';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

test('zinSweep matched load -> constant 50', () => {
  const pts = zinSweep({ re: 50, im: 0 }, 50, 0, Math.PI, 5);
  for (const p of pts) {
    assert.ok(near(p.zin.re, 50, 1e-6) && near(p.zin.im, 0, 1e-6), JSON.stringify(p));
  }
});

test('zinSweep short -> open at lambda/4', () => {
  const pts = zinSweep({ re: 0, im: 0 }, 50, 0, Math.PI, 5);
  assert.ok(near(pts[0]!.zin.re, 0, 1e-6), 'short at l=0');
  assert.ok(pts[2]!.zin.re > 1e6, `open at lambda/4: ${pts[2]!.zin.re}`);
  assert.ok(near(pts[4]!.zin.re, 0, 1e-3), 'short at lambda/2');
});

test('vmaxPosition Gamma=+0.5 -> 0.25', () => {
  assert.ok(near(vmaxPosition({ re: 0.5, im: 0 }), 0.25));
});

test('vminPosition Gamma=+0.5 -> 0', () => {
  assert.ok(near(vminPosition({ re: 0.5, im: 0 }), 0, 1e-6));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL.

- [ ] **Step 3: Implement `src/math/tlinputz.ts`**

```ts
import type { Complex } from './complex.ts';
import { cphaseDeg } from './complex.ts';
import { zinLossless } from './tl.ts';

export function zinSweep(
  zL: Complex, z0: number, betaLStart: number, betaLEnd: number, steps: number,
): { betaL: number; zin: Complex }[] {
  const out: { betaL: number; zin: Complex }[] = [];
  const dt = (betaLEnd - betaLStart) / (steps - 1);
  for (let i = 0; i < steps; i++) {
    const betaL = betaLStart + i * dt;
    out.push({ betaL, zin: zinLossless(zL, betaL, z0) });
  }
  return out;
}

// ponytail: positions in wavelengths, assumes |Gamma| < 1
export function vmaxPosition(gamma: Complex): number {
  const angleDeg = cphaseDeg(gamma);
  const pos = (1 - angleDeg / 360) / 2;
  return ((pos % 0.5) + 0.5) % 0.5;
}

export function vminPosition(gamma: Complex): number {
  return (vmaxPosition(gamma) + 0.25) % 0.5;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/tlinputz.ts tests/math/tlinputz.test.ts
git commit -m "feat(math): TL input impedance sweep and voltage extrema positions"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/tl-input-impedance/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — sliders for ZL re/im, Z₀, line
  length (0–0.5 λ). On `update`: compute `zinLossless(zL, 2π·length, z0)`,
  `zToGamma(zL, z0)`, `swr(gamma)`, `quarterWaveZ(zL.re, z0)` (if zL.im ≈ 0),
  `vmaxPosition`/`vminPosition`. Render `linePlot` with Re(Zin) and Im(Zin) vs
  length (0–0.5 λ from `zinSweep`), `smithChart` with the Zin locus + load
  point. Readouts: Zin, |Γ|, SWR, λ/4 Z₀', Vmax/Vmin. Mirror
  `src/modules/feedback/module.ts` wiring.

```ts
export const module: Module = {
  id: 'tl-input-impedance',
  title: 'TL Input Impedance',
  course: 'Hoogfrequenttechniek',
  description: 'Input impedance vs line length, SWR, reflection coefficient, λ/4 transformer.',
  icon: 'Zᵢ',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as tlInputZ }
  from './modules/tl-input-impedance/module.ts';` and append `tlInputZ`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/tl-input-impedance/module.ts src/registry.ts
git commit -m "feat(modules): TL input impedance analyzer with Smith chart locus"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('tl-input-impedance module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'tl-input-impedance');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'tl-input-impedance missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; sweeping line length rotates Zin
  on the Smith chart; matched load (ZL=Z₀) stays at center.
- [ ] **Step 3: README** — append:
  `- **TL Input Impedance** — input impedance vs line length, SWR, reflection coefficient, λ/4 transformer.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- TL Input Impedance module: Zin sweep, SWR, |Γ|, voltage extrema, λ/4 transformer with Smith chart locus.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: tl-input-impedance smoke test, README, changelog"
```
