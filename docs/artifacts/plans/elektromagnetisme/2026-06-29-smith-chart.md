# Interactive Smith Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `smith-chart` module: an interactive Smith chart with Z↔Γ
mapping, admittance mode, SWR/constant-r/constant-x circle overlays, and
click-to-set-Z, built on the foundation `smithChart` helper.

**Architecture:** Pure math in `src/math/smithmath.ts` (imports the `Complex`
type from `complex.ts`). UI in `src/modules/smith-chart/module.ts` using the
foundation `smithChart` + `tl.ts` helpers, plus SVG overlays for the SWR/r/x
circles. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, SVG overlays via `document.createElementNS`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-smith-chart-design.md`

> **Foundation dependency:** Requires `src/ui/smith.ts`, `src/math/tl.ts`,
> `src/math/complex.ts` from plan `2026-06-29-foundation.md` to be merged first.
> The foundation `smithChart` draws an SVG with `viewBox='0 0 360 360'` and the
> unit boundary circle centered at the viewBox center (`cx=180, cy=180, R=160`),
> `+Im` up. This module locates that geometry at runtime (see `smithGeom`).
> Registry smoke test asserts presence **by id**.

---

### Task 1: Smith-chart math

**Files:**
- Create: `src/math/smithmath.ts`
- Create: `tests/math/smithmath.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { admittanceFromImpedance, constantRCircle, constantXCircle } from '../../src/math/smithmath.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('admittanceFromImpedance: 1/50 = 0.02 S', () => {
  const y = admittanceFromImpedance({ re: 50, im: 0 });
  assert.ok(near(y.re, 0.02) && near(y.im, 0), JSON.stringify(y));
});
test('admittanceFromImpedance: 1/(1+j) = 0.5 - j0.5', () => {
  const y = admittanceFromImpedance({ re: 1, im: 1 });
  assert.ok(near(y.re, 0.5) && near(y.im, -0.5), JSON.stringify(y));
});
test('admittanceFromImpedance: 1/(j50) = -j0.02', () => {
  const y = admittanceFromImpedance({ re: 0, im: 50 });
  assert.ok(near(y.re, 0) && near(y.im, -0.02), JSON.stringify(y));
});
test('constantRCircle(1) -> center (0.5,0), radius 0.5', () => {
  const c = constantRCircle(1);
  assert.ok(near(c.cx, 0.5) && near(c.cy, 0) && near(c.radius, 0.5), JSON.stringify(c));
});
test('constantRCircle(0) -> unit boundary: center (0,0), radius 1', () => {
  const c = constantRCircle(0);
  assert.ok(near(c.cx, 0) && near(c.cy, 0) && near(c.radius, 1), JSON.stringify(c));
});
test('constantRCircle(2) -> center (2/3,0), radius 1/3', () => {
  const c = constantRCircle(2);
  assert.ok(near(c.cx, 2 / 3) && near(c.cy, 0) && near(c.radius, 1 / 3), JSON.stringify(c));
});
test('constantXCircle(1) -> center (1,1), radius 1', () => {
  const c = constantXCircle(1);
  assert.ok(near(c.cx, 1) && near(c.cy, 1) && near(c.radius, 1), JSON.stringify(c));
});
test('constantXCircle(-1) -> center (1,-1), radius 1', () => {
  const c = constantXCircle(-1);
  assert.ok(near(c.cx, 1) && near(c.cy, -1) && near(c.radius, 1), JSON.stringify(c));
});
test('constantXCircle(2) -> center (1,0.5), radius 0.5', () => {
  const c = constantXCircle(2);
  assert.ok(near(c.cx, 1) && near(c.cy, 0.5) && near(c.radius, 0.5), JSON.stringify(c));
});
test('constantXCircle(0) -> non-finite (real-axis degenerate, no circle)', () => {
  const c = constantXCircle(0);
  assert.ok(!Number.isFinite(c.cy) && !Number.isFinite(c.radius), JSON.stringify(c));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/smithmath.ts`**

```ts
import type { Complex } from './complex.ts';

export interface Circle {
  cx: number;
  cy: number;
  radius: number;
}

// Y = 1/Z (complex reciprocal). Inlined rather than cdiv({1,0}, z) so that Z=0
// deterministically yields NaN (1/0 = inf) instead of depending on cdiv's
// divide-by-zero path. ponytail: 1/(re + j im) = (re - j im) / (re^2 + im^2).
export function admittanceFromImpedance(z: Complex): Complex {
  const d = z.re * z.re + z.im * z.im;
  return { re: z.re / d, im: -z.im / d };
}

// Constant-resistance circle in the Gamma-plane for normalized resistance r (r >= 0).
// r = 0 is the outer unit-boundary circle.
export function constantRCircle(r: number): Circle {
  const d = 1 + r;
  return { cx: r / d, cy: 0, radius: 1 / d };
}

// Constant-reactance circle in the Gamma-plane for normalized reactance x.
// x = 0 is the real axis (degenerate); 1/0 = Infinity and the overlay helper
// skips non-finite radii. ponytail: no special-case / throw for the degenerate circle.
export function constantXCircle(x: number): Circle {
  return { cx: 1, cy: 1 / x, radius: 1 / Math.abs(x) };
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/smithmath.ts tests/math/smithmath.test.ts
git commit -m "feat(math): smith-chart admittance and constant-r/x circle geometry"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/smith-chart/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `src/modules/smith-chart/module.ts`:

```ts
import type { Module } from '../../module.ts';
import { cphaseDeg, type Complex } from '../../math/complex.ts';
import { zToGamma, gammaToZ, swr } from '../../math/tl.ts';
import { admittanceFromImpedance, constantRCircle, constantXCircle } from '../../math/smithmath.ts';
import { smithChart } from '../../ui/smith.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

function sig3(x: number): string {
  return Number.isFinite(x) ? x.toPrecision(3) : '∞';
}

function neg(g: Complex): Complex {
  return { re: -g.re, im: -g.im };
}

// Geometry of the unit Gamma circle in the rendered Smith SVG.
// ponytail: the foundation draws the unit boundary (and the r=0 grid circle)
// centered at the viewBox center; x-arcs have huge radii and sit off-center, so
// filtering to the viewBox-centered circle picks the boundary robustly without
// hardcoding 180/160 (which would break if the foundation is resized).
function smithGeom(svg: SVGSVGElement): { cx: number; cy: number; r: number } {
  const vb = svg.viewBox.baseVal;
  const vcx = vb.x + vb.width / 2;
  const vcy = vb.y + vb.height / 2;
  let best: { cx: number; cy: number; r: number } | null = null;
  for (const c of Array.from(svg.querySelectorAll('circle'))) {
    const cx = Number(c.getAttribute('cx'));
    const cy = Number(c.getAttribute('cy'));
    const r = Number(c.getAttribute('r'));
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) continue;
    if (Math.abs(cx - vcx) > 1 || Math.abs(cy - vcy) > 1) continue;
    if (!best || r > best.r) best = { cx, cy, r };
  }
  // ponytail: fallback (viewBox-inscribed) only if the foundation ever drops <circle>.
  return best ?? { cx: vcx, cy: vcy, r: Math.min(vb.width, vb.height) / 2 };
}

// Screen click -> Gamma in the chart plane (+Im up). Uses getScreenCTM so
// aspect ratio / preserveAspectRatio are handled correctly (no createSVGPoint).
function clickToGamma(e: MouseEvent, svg: SVGSVGElement, geom: { cx: number; cy: number; r: number }): Complex {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { re: 0, im: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { re: (p.x - geom.cx) / geom.r, im: -(p.y - geom.cy) / geom.r };
}

function setSlider(w: { el: HTMLElement }, val: number): void {
  const input = w.el.querySelector('input')!;
  const step = Number(input.step) || 1;
  const min = Number(input.min);
  const max = Number(input.max);
  input.value = String(Math.min(max, Math.max(min, Math.round(val / step) * step)));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function render(host: HTMLElement): void {
  const mode = selectWave('Mode', ['Impedance (Z)', 'Admittance (Y)'], 'Impedance (Z)');
  const Zre = slider('Z real (Ω)', 0, 500, 1, 50);
  const Zim = slider('Z imag (Ω)', -500, 500, 1, 0);
  const Z0 = slider('Z₀ (Ω)', 10, 200, 1, 50);
  for (const w of [mode, Zre, Zim, Z0]) host.appendChild(w.el);

  const chartHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(chartHost);
  host.appendChild(readouts);

  const sc = smithChart(chartHost, { z0: Z0.value(), title: 'Smith chart' });
  const svg = chartHost.querySelector('svg') as SVGSVGElement;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function overlays(g: Complex, isY: boolean): void {
    for (const o of Array.from(svg.querySelectorAll('[data-smith-overlay]'))) o.remove();
    const geom = smithGeom(svg);
    const circle = (gcx: number, gcy: number, gr: number, stroke: string, dash = '') => {
      if (!Number.isFinite(gr) || gr <= 0) return;
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', String(geom.cx + gcx * geom.r));
      c.setAttribute('cy', String(geom.cy - gcy * geom.r));
      c.setAttribute('r', String(gr * geom.r));
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', stroke);
      c.setAttribute('stroke-width', '1.2');
      if (dash) c.setAttribute('stroke-dasharray', dash);
      c.setAttribute('data-smith-overlay', '');
      svg.appendChild(c);
    };
    // constant-r / constant-x circles through the point (Z mode only).
    // ponytail: in Y mode the marker sits at the admittance (antipodal) position
    // and impedance circles would mislead - skip rather than reflect the grid.
    if (!isY) {
      const rc = constantRCircle(Zre.value() / Z0.value());
      const xc = constantXCircle(Zim.value() / Z0.value());
      circle(rc.cx, rc.cy, rc.radius, '#3b6b4f');
      circle(xc.cx, xc.cy, xc.radius, '#6b3b4f', '3 2');
    }
    // SWR circle (constant |Gamma|) - identical in both modes (|Gamma| is mode-independent).
    circle(0, 0, Math.hypot(g.re, g.im), '#b8860b');
  }

  const update = (): void => {
    const z0 = Z0.value();
    const Z: Complex = { re: Zre.value(), im: Zim.value() };
    const isY = mode.value().startsWith('Admittance');
    const g = zToGamma(Z, z0);
    const gmag = Math.hypot(g.re, g.im);
    overlays(g, isY);
    // Z mode feeds Z (plotted at Gamma). Y mode feeds the antipodal impedance so
    // the foundation plots the marker at -Gamma = the admittance position.
    const zFeed = isY ? gammaToZ(neg(g), z0) : Z;
    sc.update([{ z: zFeed, label: isY ? 'Y' : 'Z' }]);
    const Y = admittanceFromImpedance(Z);
    readouts.innerHTML = `
      <div><b>Γ:</b> ${sig3(g.re)} ${g.im >= 0 ? '+' : '−'} j${sig3(Math.abs(g.im))}</div>
      <div><b>|Γ|:</b> ${sig3(gmag)}, <b>∠Γ:</b> ${sig3(cphaseDeg(g))}°</div>
      <div><b>Z:</b> ${sig3(Z.re)} ${Z.im >= 0 ? '+' : '−'} j${sig3(Math.abs(Z.im))} Ω</div>
      <div><b>Y:</b> ${sig3(Y.re)} ${Y.im >= 0 ? '+' : '−'} j${sig3(Math.abs(Y.im))} S</div>
      <div><b>SWR:</b> ${sig3(gmag >= 1 ? Infinity : swr(g))}</div>
    `;
  };

  for (const w of [mode, Zre, Zim, Z0]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }

  svg.addEventListener('click', (e: MouseEvent) => {
    const z0 = Z0.value();
    const isY = mode.value().startsWith('Admittance');
    let g = clickToGamma(e, svg, smithGeom(svg));
    const mag = Math.hypot(g.re, g.im);
    if (mag > 1) g = { re: g.re / mag, im: g.im / mag }; // clamp to unit circle (passive)
    // Z mode: cursor Gamma = Gamma_Z(z). Y mode: cursor sits at the admittance
    // position (-Gamma_Z), so Gamma_Z = -g.
    const Z = gammaToZ(isY ? neg(g) : g, z0);
    setSlider(Zre, Z.re);
    setSlider(Zim, Z.im); // ponytail: two input events -> update() runs twice; cheap, idempotent
  });

  update();
}

export const module: Module = {
  id: 'smith-chart',
  title: 'Interactive Smith Chart',
  course: 'Hoogfrequenttechniek',
  description: 'Interactive Smith chart: Z↔Γ, admittance, SWR, constant-r/x circles.',
  icon: '◎',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add the import after the last
  module import (line 23) and append `smithChart` to the `modules` array:

```ts
import { module as smithChart } from './modules/smith-chart/module.ts';
```

```ts
export const modules: Module[] = [transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping, fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp, oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward, smithChart];
```

- [ ] **Step 3: Run tests** — `npm test` → PASS (math tests still green).
- [ ] **Step 4: Build** — `npm run build` → passes (type-check + bundle).

- [ ] **Step 5: Manual check** — `npm run dev`; open the `smith-chart` card:

  - Default `Z=50+j0, Z₀=50` → marker at chart center, `Γ=0`, `SWR=1`, no SWR
    ring (radius 0).
  - Set `Z real=100` → marker moves right to `Γ≈0.333`, SWR circle appears through
    it, `SWR=2`; the green r-circle and dashed x-circle (on the real axis) pass
    through the marker.
  - Set `Z imag=50` → marker moves into the upper half, `∠Γ≈` matches, the
    dashed x-circle is now a visible arc through the marker.
  - Toggle to `Admittance (Y)` → marker jumps to the antipode (lower half for
    `Z=50+j50`), `Y` readout shows `0.01 − j0.01 S`, SWR circle unchanged.
  - Click anywhere on the chart → `Z real` / `Z imag` sliders snap so the marker
    lands under the cursor (clamped inside the unit circle). Clicking the left
    edge (short) sets `Z≈0`; the right edge (open) saturates `Z real` at 500.

- [ ] **Step 6: Commit**

```sh
git add src/modules/smith-chart/module.ts src/registry.ts
git commit -m "feat(modules): interactive Smith chart with click-to-set and r/x/SWR overlays"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('smith-chart module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'smith-chart');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'smith-chart missing');
});
```

- [ ] **Step 2: README** — append:

```md
- **Interactive Smith Chart** — Z↔Γ, admittance, SWR, constant-r/x circles, click-to-set.
```

- [ ] **Step 3: CHANGELOG** — under `### Added`:

```md
- Interactive Smith Chart module: Z↔Γ mapping, admittance mode, SWR / constant-r / constant-x circle overlays, and click-to-set-Z.
```

- [ ] **Step 4: Run tests** — `npm test` → PASS (smoke assertion green).
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: smith-chart smoke test, README, changelog"
```
