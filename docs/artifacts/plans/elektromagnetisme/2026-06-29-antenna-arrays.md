# Linear Antenna Arrays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `antenna-arrays` module: ULA array factor, nulls, beam
scanning, HPBW, and grating lobes, with a half-plane polar plot.

**Architecture:** Foundation polar plot in `src/ui/polarplot.ts`. Pure math in
`src/math/arrays.ts`. UI in `src/modules/antenna-arrays/module.ts` using
`polarPlot`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, SVG via `polarPlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-antenna-arrays-design.md`

> **Foundation dependency:** `src/ui/polarplot.ts` does not yet exist on disk;
> Task 1 creates it. Registry smoke test asserts presence **by id**.

---

### Task 1: Polar plot foundation

**Files:**
- Create: `src/ui/polarplot.ts`

> No unit test — pure DOM/SVG rendering helper (like `src/ui/plots.ts` has
> none). `// ponytail: no test for pure-DOM helper`; verified visually via the
> module in Task 3.

- [ ] **Step 1: Create `src/ui/polarplot.ts`**

```ts
import { svgPlot } from './plots.ts';

export interface PolarSample { theta: number; r: number; }
export interface PolarSeries { label: string; samples: PolarSample[]; }
export interface PolarOpts { title?: string; db?: boolean; half?: boolean; }

const R = 150;            // max radius (px)
const CX = 180, CY = 180; // svg center
const FLOOR_DB = 40;      // ponytail: fixed dB floor in db mode
const PALETTE = ['#1a1a1a', '#6b4f1d', '#3b6b4f'];

// map data r (0..1, or dB ≤ 0) → pixel radius
function toR(r: number, db: boolean): number {
  if (db) return Math.max(0, Math.min(1, (r + FLOOR_DB) / FLOOR_DB)) * R;
  return Math.max(0, Math.min(1, r)) * R;
}

export function polarPlot(host: HTMLElement, series: PolarSeries[], opts: PolarOpts = {}) {
  const half = opts.half ?? false;
  const db = opts.db ?? false;
  const spokes = half
    ? [0, Math.PI / 2, Math.PI]
    : [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];

  const draw = (svg: SVGSVGElement) => {
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (name: string, attrs: Record<string, string | number>) => {
      const e = document.createElementNS(ns, name);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      return e;
    };
    // grid rings
    for (let i = 1; i <= 4; i++) {
      svg.appendChild(mk('circle', {
        cx: CX, cy: CY, r: (R * i) / 4, fill: 'none', stroke: '#e5e0d2', 'stroke-width': 1,
      }));
    }
    // spokes
    for (const a of spokes) {
      svg.appendChild(mk('line', {
        x1: CX, y1: CY, x2: CX + R * Math.cos(a), y2: CY - R * Math.sin(a),
        stroke: '#e5e0d2', 'stroke-width': 1,
      }));
    }
    // series paths (theta in radians; θ=0 right, increasing CCW)
    series.forEach((s, idx) => {
      const stroke = PALETTE[idx % PALETTE.length]!;
      const pts = s.samples.map((p) => {
        const rr = toR(p.r, db);
        const x = CX + rr * Math.cos(p.theta);
        const y = CY - rr * Math.sin(p.theta);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      svg.appendChild(mk('polyline', {
        points: pts, fill: 'none', stroke, 'stroke-width': 1.5,
      }));
    });
    if (opts.title) {
      const t = mk('text', { x: 6, y: 14, 'font-size': 11, fill: '#888' });
      t.textContent = opts.title;
      svg.appendChild(t);
    }
  };

  svgPlot(host, draw, { w: 360, h: 360 });
  return {
    update(next: PolarSeries[]) {
      polarPlot(host, next, opts); // ponytail: full re-render, ~180 pts
    },
  };
}
```

- [ ] **Step 2: Build** — `npm run build` → passes (type-check + bundle).

- [ ] **Step 3: Commit**

```sh
git add src/ui/polarplot.ts
git commit -m "feat(ui): polar plot foundation (half/full plane, db option)"
```

---

### Task 2: Array-factor algebra (TDD)

**Files:**
- Create: `tests/math/arrays.test.ts`
- Create: `src/math/arrays.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayFactor, nulls, broadsideHpbw, scanAngle, hasGratingLobe,
} from '../../src/math/arrays.ts';

const K = 2 * Math.PI; // λ = 1
const deg = (x: number) => (x * Math.PI) / 180;

test('broadside max: AF(90°) = 1 for N=4, d=λ/2, α=0', () => {
  assert.ok(Math.abs(arrayFactor(deg(90), 4, 0.5, 0, K) - 1) < 1e-9);
});

test('null at 60°: AF ≈ 0', () => {
  assert.ok(Math.abs(arrayFactor(deg(60), 4, 0.5, 0, K)) < 1e-6);
});

test('interior nulls of N=4, d=λ/2, α=0 are [60, 120]', () => {
  const n = nulls(4, 0.5, 0, K).map((x) => Math.round(x));
  assert.deepEqual(n, [60, 120]);
});

test('broadside HPBW N=4, d=λ/2 ≈ 25.4°', () => {
  assert.ok(Math.abs(broadsideHpbw(4, 0.5, 1) - 25.38) < 0.1);
});

test('scanAngle: α=0→90, α=-π→0, α=-π/2→60', () => {
  assert.ok(Math.abs(scanAngle(4, 0.5, 0, K) - 90) < 1e-9);
  assert.ok(Math.abs(scanAngle(4, 0.5, -Math.PI, K) - 0) < 1e-9);
  assert.ok(Math.abs(scanAngle(4, 0.5, -Math.PI / 2, K) - 60) < 1e-6);
});

test('grating lobe when d > λ', () => {
  assert.equal(hasGratingLobe(1.5, 1), true);
  assert.equal(hasGratingLobe(0.5, 1), false);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `src/math/arrays.ts`**

```ts
// Uniform linear array (ULA) array factor and derived quantities.
// ponytail: λ-normalized (λ=1) throughout; k = 2π/λ = 2π.

// Normalized array factor |AF(θ)|, peak = 1 at the main beam.
// θ in radians measured from the array axis (broadside at θ = π/2).
export function arrayFactor(theta: number, N: number, d: number, alpha: number, k: number): number {
  const psi = k * d * Math.cos(theta) + alpha;
  const num = Math.sin((N * psi) / 2);
  const den = N * Math.sin(psi / 2);
  if (Math.abs(den) < 1e-12) return 1; // ψ → 0 limit → main-beam maximum
  return Math.abs(num / den);
}

// Interior null angles (degrees) strictly in (0°, 180°).
export function nulls(N: number, d: number, alpha: number, k: number): number[] {
  const kd = k * d;
  if (kd === 0) return []; // ponytail: degenerate d=0 guard
  const out: number[] = [];
  for (let m = 1; m < N; m++) {
    for (const s of [1, -1]) {
      const psi = (s * 2 * Math.PI * m) / N;
      const cosTheta = (psi - alpha) / kd;
      if (Math.abs(cosTheta) < 1 - 1e-9) {
        const theta = (Math.acos(cosTheta) * 180) / Math.PI;
        if (theta > 1e-6 && theta < 180 - 1e-6) out.push(theta);
      }
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

// Broadside half-power beamwidth in degrees (approx; valid for α = 0).
export function broadsideHpbw(N: number, d: number, lambda: number): number {
  return ((0.886 * lambda) / (N * d)) * (180 / Math.PI);
}

// Main-beam direction (degrees) from progressive phase α.
// ψ = 0 → cos θ₀ = -α/(k·d). N unused (geometry-only), kept per spec API.
export function scanAngle(N: number, d: number, alpha: number, k: number): number {
  void N; // ponytail: N unused for scan direction; kept in signature per spec
  const denom = k * d;
  if (denom === 0) return 90;
  const cosTheta = -alpha / denom;
  if (cosTheta > 1) return 0;
  if (cosTheta < -1) return 180;
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Grating lobes appear (broadside) when d > λ.
export function hasGratingLobe(d: number, lambda: number): boolean {
  return d > lambda; // ponytail: broadside-only GL check; scanned arrays GL earlier
}

// Element pattern: isotropic = 1, short dipole = |sin θ|.
export function elementPattern(theta: number, kind: 'isotropic' | 'dipole'): number {
  return kind === 'isotropic' ? 1 : Math.abs(Math.sin(theta)); // ponytail: short-dipole only
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/arrays.ts tests/math/arrays.test.ts
git commit -m "feat(math): uniform linear array factor, nulls, HPBW, scan angle"
```

---

### Task 3: Module UI and registry wiring

**Files:**
- Create: `src/modules/antenna-arrays/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create `src/modules/antenna-arrays/module.ts`**

```ts
import type { Module } from '../../module.ts';
import {
  arrayFactor, nulls, broadsideHpbw, scanAngle, hasGratingLobe, elementPattern,
} from '../../math/arrays.ts';
import { polarPlot } from '../../ui/polarplot.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

type ElKind = 'isotropic' | 'dipole';

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const N = slider('N', 2, 20, 1, 4);
  const dLambda = slider('d/λ', 0.05, 2, 0.05, 0.5);
  const alphaDeg = slider('α (°)', -180, 180, 1, 0);
  const element = selectWave('Element', ['isotropic', 'dipole'], 'isotropic');
  for (const w of [N, dLambda, alphaDeg, element]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const LAMBDA = 1;        // ponytail: λ-normalized
  const K = (2 * Math.PI) / LAMBDA;
  const SAMPLES = 180;     // 1° per sample over [0, π]

  const update = () => {
    const n = Math.round(N.value());
    const d = dLambda.value() * LAMBDA;
    const alpha = (alphaDeg.value() * Math.PI) / 180;
    const kind = element.value() as ElKind;

    const thetas: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) thetas.push((Math.PI * i) / SAMPLES);

    const afSamples = thetas.map((t) => ({ theta: t, r: arrayFactor(t, n, d, alpha, K) }));
    const series = [{ label: 'AF', samples: afSamples }];
    if (kind !== 'isotropic') {
      const elSamples = thetas.map((t) => ({ theta: t, r: elementPattern(t, kind) }));
      const totSamples = thetas.map((t) => ({
        theta: t,
        r: arrayFactor(t, n, d, alpha, K) * elementPattern(t, kind),
      }));
      series.push({ label: 'element', samples: elSamples });
      series.push({ label: 'total', samples: totSamples });
    }
    polarPlot(plotHost, series, { half: true, title: 'Array factor' });

    const beam = scanAngle(n, d, alpha, K);
    const nul = nulls(n, d, alpha, K);
    const hpbw = broadsideHpbw(n, d, LAMBDA); // ponytail: broadside approx shown when scanned
    const gl = hasGratingLobe(d, LAMBDA);
    readouts.innerHTML = `
      <div><b>Main beam:</b> ${sig3(beam)}°</div>
      <div><b>Nulls:</b> ${nul.map((x) => sig3(x) + '°').join(', ') || '—'}</div>
      <div><b>HPBW (broadside ≈):</b> ${sig3(hpbw)}°</div>
      <div><b>Grating lobes:</b> ${gl ? 'yes (d > λ)' : 'no'}</div>
    `;
  };

  for (const w of [N, dLambda, alphaDeg, element]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'antenna-arrays',
  title: 'Linear Antenna Arrays',
  course: 'Antennes',
  description: 'Linear antenna arrays: array factor, beam scanning, nulls, HPBW, grating lobes.',
  icon: '≡',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — add the import after the
  `smps-forward` line, and append `antennaArrays` to the `modules` array.

```ts
import { module as antennaArrays } from './modules/antenna-arrays/module.ts';
```

```ts
export const modules: Module[] = [
  transferFn, pidTuner, routhHurwitz, fourierSeries, bjtAmp, bjtDc, diodeShaping,
  fetAmp, opamp, multistage, diffAmp, feedback, freqResponse, activeFilter, powerAmp,
  oscillator, comparator, smpsBuck, smpsBoost, smpsBuckBoost, smpsFlyback, smpsForward,
  antennaArrays,
];
```

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes.
- [ ] **Step 5: Commit**

```sh
git add src/modules/antenna-arrays/module.ts src/registry.ts
git commit -m "feat(modules): linear antenna array analyzer with polar plot"
```

---

### Task 4: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion** — append to `tests/smoke.test.ts`:

```ts
test('antenna-arrays module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'antenna-arrays');
  assert.ok(m && m.course === 'Antennes', 'antenna-arrays missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; sweeping `α` steers the main
  beam; raising `N` narrows it and adds nulls; pushing `d/λ` past 1 raises the
  grating-lobe warning; selecting `dipole` overlays the element pattern.

- [ ] **Step 3: README** — append:
  `- **Linear Antenna Arrays** — array factor, beam scanning, nulls, HPBW, grating lobes.`

- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Linear Antenna Arrays module: ULA array factor, beam scanning, nulls, HPBW, grating lobes, pattern multiplication.`

- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: antenna-arrays smoke test, README, changelog"
```
