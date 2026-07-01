# Electrostatics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `electrostatics` module: Coulomb superposition field plot with a
movable probe, Gauss-law E-field calculators (sphere/cylinder/plane), and the
three canonical capacitance formulas (plate/coax/sphere).

**Architecture:** Pure math in `src/math/electrostatics.ts`. UI in
`src/modules/electrostatics/module.ts` using `fieldPlot` (foundation) plus
`slider`/`selectWave` input helpers. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, `fieldPlot` from `src/ui/fieldplot.ts`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-electrostatics-design.md`

> **Foundation dependency:** `src/ui/fieldplot.ts` (`fieldPlot(host, grid, {title?, showMagnitude?})`).
> Registry smoke test asserts presence **by id**.

---

### Task 1: Electrostatics math

**Files:**
- Create: `src/math/electrostatics.ts`
- Create: `tests/math/electrostatics.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pointChargeField, pointChargePotential, superposeField, superposePotential,
  capacitance, gaussField,
} from '../../src/math/electrostatics.ts';

test('point charge field: 1nC at origin, obs (1,0) → Ex≈8.988, Ey=0', () => {
  const E = pointChargeField(1e-9, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(Math.abs(E.Ex - 8.988) < 0.01, `Ex=${E.Ex}`);
  assert.ok(Math.abs(E.Ey) < 1e-9, `Ey=${E.Ey}`);
});

test('point charge potential: 1nC at origin, obs (1,0) → V≈8.988', () => {
  const V = pointChargePotential(1e-9, { x: 0, y: 0 }, { x: 1, y: 0 });
  assert.ok(Math.abs(V - 8.988) < 0.01, `V=${V}`);
});

test('dipole superposition at midpoint: Ex≈17.975, V=0', () => {
  const charges = [{ q: 1e-9, at: { x: -1, y: 0 } }, { q: -1e-9, at: { x: 1, y: 0 } }];
  const E = superposeField(charges, { x: 0, y: 0 });
  assert.ok(Math.abs(E.Ex - 17.975) < 0.01, `Ex=${E.Ex}`);
  assert.ok(Math.abs(E.Ey) < 1e-9, `Ey=${E.Ey}`);
  const V = superposePotential(charges, { x: 0, y: 0 });
  assert.ok(Math.abs(V) < 1e-9, `V=${V}`);
});

test('observer coincident with charge throws', () => {
  assert.throws(() => pointChargeField(1, { x: 0, y: 0 }, { x: 0, y: 0 }));
});

test('capacitance: plate A=1e-4, d=1e-3 → ≈0.885 pF', () => {
  const C = capacitance('plate', { A: 1e-4, d: 1e-3 });
  assert.ok(Math.abs(C - 8.854e-13) < 1e-14, `C=${C}`);
});

test('capacitance: coax L=1, a=1e-3, b=2e-3 → ≈80.3 pF', () => {
  const C = capacitance('coax', { L: 1, a: 1e-3, b: 2e-3 });
  assert.ok(Math.abs(C - 8.027e-11) < 1e-12, `C=${C}`);
});

test('capacitance: sphere r=1 → ≈111.3 pF', () => {
  const C = capacitance('sphere', { r: 1 });
  assert.ok(Math.abs(C - 1.11265e-10) < 1e-14, `C=${C}`);
});

test('capacitance: coax b<a throws', () => {
  assert.throws(() => capacitance('coax', { L: 1, a: 2e-3, b: 1e-3 }));
});

test('gauss: sphere Q=1nC, r=1 → E≈8.988', () => {
  const E = gaussField('sphere', { Q: 1e-9 }, 1);
  assert.ok(Math.abs(E - 8.988) < 0.01, `E=${E}`);
});

test('gauss: cylinder λ=1nC/m, r=1 → E≈17.975', () => {
  const E = gaussField('cylinder', { lambda: 1e-9 }, 1);
  assert.ok(Math.abs(E - 17.975) < 0.01, `E=${E}`);
});

test('gauss: plane σ=1nC/m² → E≈56.47, independent of r', () => {
  const E1 = gaussField('plane', { sigma: 1e-9 }, 0.5);
  const E2 = gaussField('plane', { sigma: 1e-9 }, 10);
  assert.ok(Math.abs(E1 - E2) < 1e-9);
  assert.ok(Math.abs(E1 - 56.47) < 0.01, `E=${E1}`);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `src/math/electrostatics.ts`**

```ts
export const EPS0 = 8.854187817e-12;
export const K = 1 / (4 * Math.PI * EPS0); // ≈ 8.987551787e9

export interface Pt { x: number; y: number; }
export interface Vec { Ex: number; Ey: number; }
export interface Charge { q: number; at: Pt; }

export function pointChargeField(q: number, at: Pt, observer: Pt): Vec {
  const dx = observer.x - at.x;
  const dy = observer.y - at.y;
  const r2 = dx * dx + dy * dy;
  if (r2 === 0) throw new Error('observer coincides with charge');
  const f = K * q / (r2 * Math.sqrt(r2)); // k·q/r³
  return { Ex: f * dx, Ey: f * dy };
}

export function pointChargePotential(q: number, at: Pt, observer: Pt): number {
  const dx = observer.x - at.x;
  const dy = observer.y - at.y;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r === 0) throw new Error('observer coincides with charge');
  return K * q / r;
}

export function superposeField(charges: Charge[], observer: Pt): Vec {
  let Ex = 0, Ey = 0;
  for (const c of charges) {
    const E = pointChargeField(c.q, c.at, observer);
    Ex += E.Ex; Ey += E.Ey;
  }
  return { Ex, Ey };
}

export function superposePotential(charges: Charge[], observer: Pt): number {
  let V = 0;
  for (const c of charges) V += pointChargePotential(c.q, c.at, observer);
  return V;
}

export type CapType = 'plate' | 'coax' | 'sphere';

export function capacitance(type: CapType, p: { A?: number; d?: number; L?: number; a?: number; b?: number; r?: number }): number {
  switch (type) {
    case 'plate': {
      const d = p.d ?? 0;
      if (d <= 0) throw new Error('plate: d must be > 0');
      return EPS0 * (p.A ?? 0) / d;
    }
    case 'coax': {
      const a = p.a ?? 0, b = p.b ?? 0;
      if (b <= a) throw new Error('coax: b must be > a');
      return 2 * Math.PI * EPS0 * (p.L ?? 0) / Math.log(b / a);
    }
    case 'sphere':
      return 4 * Math.PI * EPS0 * (p.r ?? 0);
  }
}

export type GaussType = 'sphere' | 'cylinder' | 'plane';

export function gaussField(type: GaussType, p: { Q?: number; lambda?: number; sigma?: number }, r: number): number {
  switch (type) {
    case 'sphere': {
      if (r <= 0) throw new Error('r must be > 0');
      return K * (p.Q ?? 0) / (r * r);
    }
    case 'cylinder': {
      if (r <= 0) throw new Error('r must be > 0');
      return (p.lambda ?? 0) / (2 * Math.PI * EPS0 * r);
    }
    case 'plane':
      // ponytail: r unused; plane field is uniform, signature kept for consistency
      return (p.sigma ?? 0) / (2 * EPS0);
  }
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/electrostatics.ts tests/math/electrostatics.test.ts
git commit -m "feat(math): electrostatics — Coulomb, Gauss, capacitance"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/electrostatics/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — three stacked sections (field viz,
  capacitance, Gauss). Field viz: `selectWave` preset + `Charge scale` slider +
  `Probe x`/`Probe y` sliders → `fieldPlot` of a 15×15 grid (vectors capped for
  display) + `|E|`/`V` readout at the probe. Capacitance: `selectWave` type +
  geometry sliders (shown/hidden per type) → `C` in pF. Gauss: `selectWave`
  geometry + parameter sliders (shown/hidden) → `E` in V/m. Mirror
  `feedback/module.ts` wiring (append widgets, single `update()`, listeners on
  `input`/`change`).

```ts
import type { Module } from '../../module.ts';
import {
  superposeField, superposePotential, capacitance, gaussField,
  type Charge, type CapType, type GaussType,
} from '../../math/electrostatics.ts';
import { fieldPlot } from '../../ui/fieldplot.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

const RANGE = 5;
const NX = 15, NY = 15;
const VCAP = 50; // ponytail: capped arrow length; near-charge field diverges, clamp for readability

type Grid = { nx: number; ny: number; vectors: { x: number; y: number; vx: number; vy: number }[] };

function buildPreset(name: string): Charge[] {
  if (name === 'dipole') return [{ q: 1e-9, at: { x: -1, y: 0 } }, { q: -1e-9, at: { x: 1, y: 0 } }];
  if (name === 'quadrupole') return [
    { q: 1e-9, at: { x: 1, y: 1 } }, { q: -1e-9, at: { x: -1, y: 1 } },
    { q: -1e-9, at: { x: 1, y: -1 } }, { q: 1e-9, at: { x: -1, y: -1 } },
  ];
  if (name === 'capacitor') {
    const cs: Charge[] = [];
    for (let i = -3; i <= 3; i++) {
      cs.push({ q: 5e-10, at: { x: -2, y: i * 0.7 } });
      cs.push({ q: -5e-10, at: { x: 2, y: i * 0.7 } });
    }
    return cs;
  }
  return [{ q: 1e-9, at: { x: 0, y: 0 } }]; // single
}

function buildGrid(charges: Charge[]): Grid {
  const vectors: Grid['vectors'] = [];
  const step = (2 * RANGE) / (NX - 1);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = -RANGE + i * step;
    const y = -RANGE + j * step;
    let E = { Ex: 0, Ey: 0 };
    try { E = superposeField(charges, { x, y }); }
    catch { /* ponytail: grid point on a charge, leave zero */ }
    vectors.push({ x, y, vx: E.Ex, vy: E.Ey });
  }
  return { nx: NX, ny: NY, vectors };
}

function capVectors(grid: Grid): Grid {
  for (const v of grid.vectors) {
    const m = Math.hypot(v.vx, v.vy);
    if (m > VCAP) { const s = VCAP / m; v.vx *= s; v.vy *= s; }
  }
  return grid;
}

function sig3(x: number): string { return x.toPrecision(3); }

function render(host: HTMLElement) {
  // ---- Field viz ----
  const preset = selectWave('Preset', ['single', 'dipole', 'quadrupole', 'capacitor'], 'dipole');
  const qscale = slider('Charge scale', 0.1, 5, 0.1, 1);
  const probeX = slider('Probe x (m)', -RANGE, RANGE, 0.1, 0);
  const probeY = slider('Probe y (m)', -RANGE, RANGE, 0.1, 0);
  const fieldHost = document.createElement('div');
  const fieldReadout = document.createElement('div');
  for (const w of [preset, qscale, probeX, probeY]) host.appendChild(w.el);
  host.appendChild(fieldHost);
  host.appendChild(fieldReadout);

  // ---- Capacitance ----
  const capType = selectWave('Capacitance', ['plate', 'coax', 'sphere'], 'plate');
  const sA = slider('A (m²)', 1e-5, 1e-2, 1e-5, 1e-4);
  const sd = slider('d (m)', 1e-4, 1e-2, 1e-4, 1e-3);
  const sL = slider('L (m)', 0.1, 5, 0.1, 1);
  const sa = slider('a (m)', 1e-4, 5e-3, 1e-4, 1e-3);
  const sb = slider('b (m)', 2e-4, 1e-2, 1e-4, 2e-3);
  const sr = slider('r (m)', 0.01, 2, 0.01, 1);
  const capReadout = document.createElement('div');
  for (const w of [capType, sA, sd, sL, sa, sb, sr]) host.appendChild(w.el);
  host.appendChild(capReadout);

  // ---- Gauss ----
  const gType = selectWave('Gauss', ['sphere', 'cylinder', 'plane'], 'sphere');
  const gQ = slider('Q (C)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gL = slider('λ (C/m)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gS = slider('σ (C/m²)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gr = slider('r (m)', 0.01, 5, 0.01, 1);
  const gReadout = document.createElement('div');
  for (const w of [gType, gQ, gL, gS, gr]) host.appendChild(w.el);
  host.appendChild(gReadout);

  const update = () => {
    // Field
    const charges = buildPreset(preset.value()).map((c) => ({ q: c.q * qscale.value(), at: c.at }));
    fieldPlot(fieldHost, capVectors(buildGrid(charges)), { title: 'E-field' });
    try {
      const E = superposeField(charges, { x: probeX.value(), y: probeY.value() });
      const V = superposePotential(charges, { x: probeX.value(), y: probeY.value() });
      fieldReadout.innerHTML = `
        <div><b>|E| at probe:</b> ${sig3(Math.hypot(E.Ex, E.Ey))} V/m</div>
        <div><b>V at probe:</b> ${sig3(V)} V</div>
      `;
    } catch (e) {
      fieldReadout.textContent = `probe at charge: ${(e as Error).message}`;
    }
    // Capacitance
    const ct = capType.value() as CapType;
    sA.el.style.display = sd.el.style.display = ct === 'plate' ? 'block' : 'none';
    sL.el.style.display = sa.el.style.display = sb.el.style.display = ct === 'coax' ? 'block' : 'none';
    sr.el.style.display = ct === 'sphere' ? 'block' : 'none';
    try {
      const C = capacitance(ct, { A: sA.value(), d: sd.value(), L: sL.value(), a: sa.value(), b: sb.value(), r: sr.value() });
      capReadout.innerHTML = `<div><b>C:</b> ${sig3(C * 1e12)} pF</div>`;
    } catch (e) {
      capReadout.textContent = `error: ${(e as Error).message}`;
    }
    // Gauss
    const gt = gType.value() as GaussType;
    gQ.el.style.display = gt === 'sphere' ? 'block' : 'none';
    gL.el.style.display = gt === 'cylinder' ? 'block' : 'none';
    gS.el.style.display = gt === 'plane' ? 'block' : 'none';
    try {
      const Eg = gaussField(gt, { Q: gQ.value(), lambda: gL.value(), sigma: gS.value() }, gr.value());
      gReadout.innerHTML = `<div><b>E:</b> ${sig3(Eg)} V/m</div>`;
    } catch (e) {
      gReadout.textContent = `error: ${(e as Error).message}`;
    }
  };

  const all = [preset, qscale, probeX, probeY, capType, sA, sd, sL, sa, sb, sr, gType, gQ, gL, gS, gr];
  for (const w of all) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'electrostatics',
  title: 'Electrostatics',
  course: 'Elektromagnetische Velden',
  description: 'Coulomb superposition field plot, Gauss-law field calculators, and capacitance formulas.',
  icon: '⚡',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — `import { module as electrostatics }
  from './modules/electrostatics/module.ts';` and append `electrostatics`.

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/electrostatics/module.ts src/registry.ts
git commit -m "feat(modules): electrostatics — field plot, Gauss, capacitance"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('electrostatics module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'electrostatics');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'electrostatics missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching preset redraws the
  field; moving the probe updates `|E|`/`V`; switching capacitance type
  shows/hides the relevant geometry sliders and updates `C`; switching Gauss
  geometry updates `E` (plane `E` stays constant as `r` changes).
- [ ] **Step 3: README** — append:
  `- **Electrostatics** — Coulomb superposition field plot, Gauss-law field calculators, and capacitance formulas.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Electrostatics module: point-charge field/potential superposition, Gauss-law (sphere/cylinder/plane), and capacitance (plate/coax/sphere).`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: electrostatics smoke test, README, changelog"
```
