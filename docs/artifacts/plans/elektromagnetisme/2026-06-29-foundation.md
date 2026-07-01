# Elektromagnetisme Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four shared helpers for the Elektromagnetisme modules:
`src/math/tl.ts` (transmission-line algebra), `src/ui/smith.ts` (Smith chart
SVG), `src/ui/fieldplot.ts` (2D vector-field SVG), `src/ui/polarplot.ts` (polar
radiation-pattern SVG). Depended on by 11 of the 14 modules; the other 3
(`maxwell-induction`, `plane-wave-incidence`, `link-budget`) use only the
existing `linePlot` and may start in parallel with this foundation.

**Architecture:** Pure math in `src/math/tl.ts` (uses `complex.ts`). Three DOM
helpers in `src/ui/`, each mirroring `plots.ts`'s `svgPlot`/`linePlot` structure
(clear host, build SVG, return `{ update }`). No module, no registry entry.

**Tech Stack:** Vanilla TypeScript, `node --test`, SVG via `document.createElementNS`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-foundation-design.md`

> **Parallel-dispatch note:** This plan must finish and merge before any of
> `electrostatics`, `magnetostatics`, `em-waves`, `waveguides`,
> `tl-fundamentals`, `tl-input-impedance`, `smith-chart`, `impedance-matching`,
> `s-parameters`, `dipole-radiation`, `antenna-arrays` start. No registry
> edits, so no merge conflict with the standalone module plans.

---

### Task 1: Transmission-line math

**Files:**
- Create: `src/math/tl.ts`
- Create: `tests/math/tl.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zToGamma, gammaToZ, swr, zinLossless, quarterWaveZ } from '../../src/math/tl.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;
const nearC = (r: { re: number; im: number }, re: number, im: number, eps = 1e-9) =>
  near(r.re, re, eps) && near(r.im, im, eps);

test('zToGamma matched load -> 0', () => {
  assert.ok(nearC(zToGamma({ re: 50, im: 0 }, 50), 0, 0), JSON.stringify(zToGamma({ re: 50, im: 0 }, 50)));
});
test('zToGamma short -> -1', () => {
  assert.ok(nearC(zToGamma({ re: 0, im: 0 }, 50), -1, 0));
});
test('zToGamma open -> +1', () => {
  assert.ok(nearC(zToGamma({ re: 1e9, im: 0 }, 50), 1, 1e-6));
});
test('gammaToZ round-trip -> 50', () => {
  assert.ok(nearC(gammaToZ({ re: 0, im: 0 }, 50), 50, 0));
});
test('swr |Γ|=0.5 -> 3', () => {
  assert.ok(near(swr({ re: 0.5, im: 0 }), 3));
});
test('zinLossless short at λ/8 -> j*Z0*tan(π/4) = j*50', () => {
  const z = zinLossless({ re: 0, im: 0 }, Math.PI / 4, 50);
  assert.ok(nearC(z, 0, 50), `zin=${JSON.stringify(z)}`);
});
test('quarterWaveZ(100,50) -> 25', () => {
  assert.ok(near(quarterWaveZ(100, 50), 25));
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module missing).

- [ ] **Step 3: Implement `src/math/tl.ts`**

```ts
import type { Complex } from './complex.ts';
import { cadd, csub, cmul, cdiv, cscale, cabs } from './complex.ts';

// Γ = (Z - Z0) / (Z + Z0), with Z0 real.
export function zToGamma(z: Complex, z0: number): Complex {
  const z0c: Complex = { re: z0, im: 0 };
  return cdiv(csub(z, z0c), cadd(z, z0c));
}

// Z = Z0 * (1 + Γ) / (1 - Γ), with Z0 real.
export function gammaToZ(g: Complex, z0: number): Complex {
  const one: Complex = { re: 1, im: 0 };
  return cscale(cdiv(cadd(one, g), csub(one, g)), z0);
}

export function swr(g: Complex): number {
  const m = cabs(g);
  if (m === 1) throw new Error('swr: |Γ| = 1 (infinite SWR)');
  return (1 + m) / (1 - m);
}

// Lossless line: Zin = Z0 * (zL + j tan(βl)) / (Z0 + j zL tan(βl)).
export function zinLossless(zL: Complex, betaL: number, z0: number): Complex {
  const t = Math.tan(betaL);
  const jt: Complex = { re: 0, im: t };
  const num = cadd(zL, jt);
  const z0c: Complex = { re: z0, im: 0 };
  const den = cadd(z0c, cmul(zL, jt));
  return cscale(cdiv(num, den), z0);
}

// Quarter-wave transformer match: Zin = Z0² / zL (zL real).
export function quarterWaveZ(zL: number, z0: number): number {
  if (zL === 0) throw new Error('quarterWaveZ: zL = 0');
  return (z0 * z0) / zL;
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/tl.ts tests/math/tl.test.ts
git commit -m "feat(math): transmission-line Z<->Gamma, SWR, lossless Zin, lambda/4 transformer"
```

---

### Task 2: Smith chart SVG helper

**Files:**
- Create: `src/ui/smith.ts`

- [ ] **Step 1: Implement `src/ui/smith.ts`** (DOM-only; verified by build)

```ts
import type { Complex } from '../math/complex.ts';
import { cadd, csub, cdiv, cscale } from '../math/complex.ts';

export type SmithPoint = { z: Complex; label?: string };

const SVGNS = 'http://www.w3.org/2000/svg';
const R_GRID = [0, 0.3, 1, 3];
const X_GRID = [0.3, 1, 3];

export function smithChart(host: HTMLElement, opts: { z0?: number; title?: string } = {}) {
  const z0 = opts.z0 ?? 50;
  host.innerHTML = '';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 360');
  svg.setAttribute('width', '360');
  svg.setAttribute('height', '360');
  const cx = 180, cy = 180, R = 160;

  const line = (x1: number, y1: number, x2: number, y2: number, stroke = '#888', w = 0.5) => {
    const el = document.createElementNS(SVGNS, 'line');
    el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
    el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
    el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', String(w));
    svg.appendChild(el);
  };
  const circle = (ox: number, oy: number, r: number, stroke = '#bbb', w = 0.5) => {
    const el = document.createElementNS(SVGNS, 'circle');
    el.setAttribute('cx', String(ox)); el.setAttribute('cy', String(oy));
    el.setAttribute('r', String(r));
    el.setAttribute('fill', 'none'); el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', String(w));
    svg.appendChild(el);
  };
  // ponytail: sparse Smith grid (4 r-circles, 3 x-arcs each side).
  // r-circle: center (r/(1+r), 0), radius 1/(1+r) in normalized Γ coords.
  for (const r of R_GRID) {
    const ox = r / (1 + r), rad = 1 / (1 + r);
    circle(cx + ox * R, cy, rad * R);
  }
  // x-arc: circle through Γ=1 with center (1, 1/x) in normalized coords.
  for (const x of X_GRID) {
    for (const s of [1, -1]) {
      const ox = 1, oy = s / x, rad = 1 / Math.abs(x);
      circle(cx + ox * R, cy - oy * R, rad * R);
    }
  }
  line(cx - R, cy, cx + R, cy, '#ccc', 0.5); // real axis
  line(cx, cy - R, cx, cy + R, '#ccc', 0.5); // imag axis
  circle(cx, cy, R, '#444', 1); // outer unit circle

  const dots: SVGGElement[] = [];
  host.appendChild(svg);
  return {
    update(points: SmithPoint[]) {
      for (const d of dots) d.remove();
      dots.length = 0;
      for (const p of points) {
        const zn = cscale(p.z, 1 / z0);
        const one: Complex = { re: 1, im: 0 };
        const g = cdiv(csub(zn, one), cadd(zn, one));
        const px = cx + g.re * R, py = cy - g.im * R;
        const dot = document.createElementNS(SVGNS, 'circle');
        dot.setAttribute('cx', String(px)); dot.setAttribute('cy', String(py));
        dot.setAttribute('r', '3'); dot.setAttribute('fill', '#1a1a1a');
        svg.appendChild(dot);
        if (p.label) {
          const t = document.createElementNS(SVGNS, 'text');
          t.setAttribute('x', String(px + 5)); t.setAttribute('y', String(py - 5));
          t.setAttribute('font-size', '10'); t.setAttribute('fill', '#1a1a1a');
          t.textContent = p.label;
          svg.appendChild(t);
          dots.push(t);
        }
        dots.push(dot);
      }
    },
  };
}
```

- [ ] **Step 2: Type-check and build** — `npm run build` → passes.

- [ ] **Step 3: Commit**

```sh
git add src/ui/smith.ts
git commit -m "feat(ui): SVG Smith chart helper (sparse r/x grid, point plot)"
```

---

### Task 3: Field plot SVG helper

**Files:**
- Create: `src/ui/fieldplot.ts`

- [ ] **Step 1: Implement `src/ui/fieldplot.ts`** (DOM-only; verified by build)

```ts
export type FieldGrid = {
  nx: number;
  ny: number;
  vectors: { x: number; y: number; vx: number; vy: number }[];
};

const SVGNS = 'http://www.w3.org/2000/svg';
// ponytail: 5-bin magnitude heat map.
const HEAT = ['#f5f5f5', '#d8d8d8', '#a8a8a8', '#787878', '#484848'];

export function fieldPlot(host: HTMLElement, grid: FieldGrid, opts: { title?: string; showMagnitude?: boolean } = {}) {
  host.innerHTML = '';
  const W = 360, H = 360, pad = 20;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  host.appendChild(svg);

  const draw = (g: FieldGrid) => {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const cellW = (W - 2 * pad) / g.nx;
    const cellH = (H - 2 * pad) / g.ny;
    const maxMag = Math.max(1e-9, ...g.vectors.map((v) => Math.hypot(v.vx, v.vy)));
    const cellScale = Math.min(cellW, cellH);
    if (opts.showMagnitude) {
      for (const v of g.vectors) {
        const m = Math.hypot(v.vx, v.vy) / maxMag;
        const bin = Math.min(HEAT.length - 1, Math.floor(m * HEAT.length));
        const rect = document.createElementNS(SVGNS, 'rect');
        rect.setAttribute('x', String(pad + v.x * cellW - cellW / 2));
        rect.setAttribute('y', String(pad + v.y * cellH - cellH / 2));
        rect.setAttribute('width', String(cellW));
        rect.setAttribute('height', String(cellH));
        rect.setAttribute('fill', HEAT[bin]!);
        svg.appendChild(rect);
      }
    }
    for (const v of g.vectors) {
      const x0 = pad + v.x * cellW, y0 = pad + v.y * cellH;
      const len = cellScale * 0.45 * (Math.hypot(v.vx, v.vy) / maxMag);
      const ang = Math.atan2(v.vy, v.vx);
      const x1 = x0 + len * Math.cos(ang), y1 = y0 - len * Math.sin(ang);
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', String(x0)); ln.setAttribute('y1', String(y0));
      ln.setAttribute('x2', String(x1)); ln.setAttribute('y2', String(y1));
      ln.setAttribute('stroke', '#1a1a1a'); ln.setAttribute('stroke-width', '1');
      ln.setAttribute('marker-end', 'url(#arrow)');
      svg.appendChild(ln);
    }
  };

  const defs = document.createElementNS(SVGNS, 'defs');
  defs.innerHTML = '<marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#1a1a1a"/></marker>';
  svg.appendChild(defs);

  draw(grid);
  return { update(next: FieldGrid) { draw(next); } };
}
```

- [ ] **Step 2: Type-check and build** — `npm run build` → passes.

- [ ] **Step 3: Commit**

```sh
git add src/ui/fieldplot.ts
git commit -m "feat(ui): 2D SVG field-plot helper (vector arrows + magnitude heat map)"
```

---

### Task 4: Polar plot SVG helper

**Files:**
- Create: `src/ui/polarplot.ts`

- [ ] **Step 1: Implement `src/ui/polarplot.ts`** (DOM-only; verified by build)

```ts
export type PolarSample = { theta: number; r: number };
export type PolarSeries = { label: string; samples: PolarSample[] };

const SVGNS = 'http://www.w3.org/2000/svg';
const PALETTE = ['#1a1a1a', '#6b4f1d', '#3b6b4f', '#4f3b6b', '#6b3b4f'];

export function polarPlot(
  host: HTMLElement,
  series: PolarSeries[],
  opts: { title?: string; db?: boolean; half?: boolean } = {},
) {
  host.innerHTML = '';
  const W = 360, H = 360, cx = 180, cy = 180, R = 150;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  host.appendChild(svg);

  const rings = opts.db ? [0, -10, -20, -30] : [0, 0.25, 0.5, 0.75, 1];
  for (const ring of rings) {
    const c = document.createElementNS(SVGNS, 'circle');
    const r = (opts.db ? Math.max(0, ring + 40) / 40 : ring) * R;
    c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy));
    c.setAttribute('r', String(r));
    c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#ccc');
    c.setAttribute('stroke-width', '0.5');
    svg.appendChild(c);
  }
  // spokes every 30 degrees (or every 30 in half-plane)
  const step = opts.half ? Math.PI / 6 : Math.PI / 6;
  const end = opts.half ? Math.PI : 2 * Math.PI;
  for (let a = 0; a <= end + 1e-9; a += step) {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('x1', String(cx)); ln.setAttribute('y1', String(cy));
    ln.setAttribute('x2', String(cx + R * Math.cos(a)));
    ln.setAttribute('y2', String(cy - R * Math.sin(a)));
    ln.setAttribute('stroke', '#eee'); ln.setAttribute('stroke-width', '0.5');
    svg.appendChild(ln);
  }

  const draw = (s: PolarSeries[]) => {
    // Remove only plotted series, keep grid.
    Array.from(svg.querySelectorAll<SVGPathElement>('[data-series]')).forEach((p) => p.remove());
    let rMax = 1;
    if (opts.db) {
      for (const ser of s) for (const sm of ser.samples) if (sm.r > rMax) rMax = sm.r;
    } else {
      for (const ser of s) for (const sm of ser.samples) if (sm.r > rMax) rMax = sm.r;
    }
    s.forEach((ser, i) => {
      const color = PALETTE[i % PALETTE.length]!;
      const d = ser.samples.map((sm, j) => {
        const rr = (opts.db ? Math.max(0, sm.r + 40) / 40 : sm.r / rMax) * R;
        const x = cx + rr * Math.cos(sm.theta);
        const y = cy - rr * Math.sin(sm.theta);
        return `${j === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('data-series', '');
      svg.appendChild(path);
    });
  };

  draw(series);
  return { update(next: PolarSeries[]) { draw(next); } };
}
```

- [ ] **Step 2: Type-check and build** — `npm run build` → passes.

- [ ] **Step 3: Commit**

```sh
git add src/ui/polarplot.ts
git commit -m "feat(ui): polar radiation-pattern SVG helper (linear or dB, full or half plane)"
```

---

### Task 5: Changelog

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add an internal note** under `## [Unreleased]` → `### Added`:

```md
- Internal: transmission-line math helper (`src/math/tl.ts`), Smith chart SVG helper (`src/ui/smith.ts`), 2D field-plot SVG helper (`src/ui/fieldplot.ts`), and polar radiation-pattern SVG helper (`src/ui/polarplot.ts`) for the Elektromagnetisme modules.
```

- [ ] **Step 2: Commit**

```sh
git add CHANGELOG.md
git commit -m "docs: changelog for Elektromagnetisme foundation helpers"
```
