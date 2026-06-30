# Link Budget & Radar Equation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `link-budget` module: Friis transmission equation, EIRP,
free-space path loss, the monostatic radar equation, and fade margin, with a
received-power-vs-distance sweep.

**Architecture:** Pure math in `src/math/linkbudget.ts`. UI in
`src/modules/link-budget/module.ts` using `linePlot`. One line in `src/registry.ts`.

**Tech Stack:** Vanilla TypeScript, `node --test`, uPlot via `linePlot`.

**Spec:** `docs/artifacts/specs/elektromagnetisme/2026-06-29-link-budget-design.md`

> **No foundation dependency.** Uses only `linePlot` from `src/ui/plots.ts`.
> Registry smoke test asserts presence **by id** under course `Antennes`.

---

### Task 1: Link-budget algebra

**Files:**
- Create: `src/math/linkbudget.ts`
- Create: `tests/math/linkbudget.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friis, eirp, fspl, friisDbm, radarEq, fadeMargin, lambdaOf, C } from '../../src/math/linkbudget.ts';

test('eirp: Pt*Gt linear', () => {
  assert.ok(Math.abs(eirp(1, 100) - 100) < 1e-9, `eirp=${eirp(1, 100)}`);
});

test('fspl: 1 km @ 2.4 GHz ~= 100 dB', () => {
  const L = fspl(1000, 2.4e9);
  assert.ok(Math.abs(L - 100) < 0.1, `fspl=${L}`);
});

test('fspl: algebraic identity 20*log10(4*pi*R*f/C)', () => {
  const L = fspl(1000, 2.4e9);
  const ref = 20 * Math.log10((4 * Math.PI * 1000 * 2.4e9) / C);
  assert.ok(Math.abs(L - ref) < 1e-9, `L=${L} ref=${ref}`);
});

test('friisDbm: 0 dBm, 0 dBi, 0 dBi, 1 km, 2.4 GHz ~= -100 dBm', () => {
  const pr = friisDbm(0, 0, 0, 1000, 2.4e9);
  assert.ok(Math.abs(pr - (-100)) < 0.1, `pr=${pr}`);
});

test('friis (W) cross-checks friisDbm (dBm)', () => {
  const f = 2.4e9;
  const lam = lambdaOf(f);
  const prW = friis(1e-3, 1, 1, lam, 1000); // Pt=1mW, Gt=Gr=1 (0 dBi)
  const prDbm = 10 * Math.log10(prW / 1e-3);
  assert.ok(Math.abs(prDbm - friisDbm(0, 0, 0, 1000, f)) < 1e-6,
    `W->dBm=${prDbm} dB=${friisDbm(0, 0, 0, 1000, f)}`);
});

test('radarEq: 1 kW, G=1000 (30 dB), sigma=1 m^2, 10 GHz, 10 km', () => {
  const pr = radarEq(1000, 1000, 1, 0.03, 10000);
  assert.ok(Math.abs(pr - 4.5354e-14) < 1e-15, `pr=${pr}`);
});

test('fadeMargin: above and below sensitivity', () => {
  assert.ok(Math.abs(fadeMargin(-80, -100) - 20) < 1e-9);
  assert.ok(Math.abs(fadeMargin(-110, -100) - (-10)) < 1e-9);
});
```

- [ ] **Step 2: Run tests, verify they fail** — `npm test` → FAIL (module not found).

- [ ] **Step 3: Implement `src/math/linkbudget.ts`**

```ts
// ponytail: scalar, frequency-independent gains; vacuum FSPL, no atmospheric losses.

export const C = 2.99792458e8; // speed of light, m/s

export function lambdaOf(f: number): number {
  if (f <= 0) throw new Error('frequency must be positive');
  return C / f; // ponytail: vacuum wavelength; medium effects out of scope
}

export function eirp(pt: number, gt: number): number {
  return pt * gt; // W
}

export function friis(pt: number, gt: number, gr: number, lambda: number, R: number): number {
  if (R <= 0 || lambda <= 0) throw new Error('range/frequency must be positive');
  return pt * gt * gr * Math.pow(lambda / (4 * Math.PI * R), 2); // W
}

export function fspl(R: number, f: number): number {
  // ponytail: vacuum; no gaseous/rain absorption. 20*log10(4*pi*R*f/C) dB.
  if (R <= 0 || f <= 0) throw new Error('range/frequency must be positive');
  return 20 * Math.log10((4 * Math.PI * R * f) / C); // dB
}

export function friisDbm(ptDbm: number, gtDb: number, grDb: number, R: number, f: number): number {
  return ptDbm + gtDb + grDb - fspl(R, f); // dBm
}

export function radarEq(pt: number, G: number, sigma: number, lambda: number, R: number): number {
  if (R <= 0 || lambda <= 0) throw new Error('range/frequency must be positive');
  // ponytail: monostatic (Gt=Gr=G); no bistatic geometry.
  return (pt * G * G * sigma * lambda * lambda) / (Math.pow(4 * Math.PI, 3) * Math.pow(R, 4)); // W
}

export function fadeMargin(prDbm: number, sensitivityDbm: number): number {
  return prDbm - sensitivityDbm; // dB
}
```

- [ ] **Step 4: Run tests, verify pass** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```sh
git add src/math/linkbudget.ts tests/math/linkbudget.test.ts
git commit -m "feat(math): Friis link budget, FSPL, radar equation, fade margin"
```

---

### Task 2: Module UI and registry wiring

**Files:**
- Create: `src/modules/link-budget/module.ts`
- Modify: `src/registry.ts`

- [ ] **Step 1: Create the module file** — `selectWave('Mode', ['link','radar'], 'link')`,
  sliders `Pt(dBm), Gt(dBi), Gr(dBi), f(MHz), R(km), σ(m²), Rx sens(dBm)`.
  On `update`: compute `λ = lambdaOf(fHz)`, `ptW = 1e-3·10^(ptDbm/10)`,
  `gtLin = 10^(gtDb/10)`, `eirpW = eirp(ptW, gtLin)`, `L = fspl(Rm, fHz)`. In
  `link` mode: `prDbm = friisDbm(...)`, `prW = friis(...)`, show the
  `Pt → +Gt → +Gr → −FSPL → Pr` waterfall. In `radar` mode:
  `prW = radarEq(ptW, gtLin, σ, λ, Rm)`, `prDbm = 10·log10(prW/1e-3)`, show the
  radar-equation one-liner. Fade margin readout flags `(link OK)` / `(link FAIL)`.
  Plot `Pr (dBm)` vs `R (km)` over `0.01…100` via 60 log-spaced points.
  Mirror `feedback/module.ts` wiring.

```ts
import type { Module } from '../../module.ts';
import { eirp, friis, friisDbm, fspl, radarEq, fadeMargin, lambdaOf } from '../../math/linkbudget.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function logspace(lo: number, hi: number, n: number): number[] {
  // ponytail: geometric spacing on a linear-axis plot; no true log axis.
  const out: number[] = [];
  const a = Math.log10(lo), b = Math.log10(hi);
  for (let i = 0; i < n; i++) out.push(10 ** (a + ((b - a) * i) / (n - 1)));
  return out;
}

function sig3(x: number): string {
  return x.toPrecision(3);
}

const MHZ = 1e6, KM = 1000, DBM0 = 1e-3;

function render(host: HTMLElement) {
  const mode = selectWave('Mode', ['link', 'radar'], 'link');
  const Pt = slider('Pt (dBm)', -20, 60, 1, 10);
  const Gt = slider('Gt (dBi)', 0, 30, 0.5, 0);
  const Gr = slider('Gr (dBi)', 0, 30, 0.5, 0);
  const f = slider('f (MHz)', 100, 6000, 10, 2400);
  const R = slider('R (km)', 0.01, 100, 0.01, 1);
  const sigma = slider('σ (m²)', 0.001, 100, 0.001, 1);
  const sens = slider('Rx sens (dBm)', -130, -60, 1, -100);
  for (const w of [mode, Pt, Gt, Gr, f, R, sigma, sens]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const dbmFromW = (w: number) => 10 * Math.log10(w / DBM0);

  const update = () => {
    const m = mode.value();
    const ptDbm = Pt.value();
    const gtDb = Gt.value();
    const grDb = Gr.value();
    const fHz = f.value() * MHZ;
    const Rm = R.value() * KM;
    const lam = lambdaOf(fHz);
    const ptW = DBM0 * 10 ** (ptDbm / 10);
    const gtLin = 10 ** (gtDb / 10);

    let prW: number, prDbm: number;
    try {
      const eirpW = eirp(ptW, gtLin);
      const L = fspl(Rm, fHz);
      if (m === 'link') {
        prW = friis(ptW, gtLin, 10 ** (grDb / 10), lam, Rm);
        prDbm = friisDbm(ptDbm, gtDb, grDb, Rm, fHz);
        const fm = fadeMargin(prDbm, sens.value());
        readouts.innerHTML = `
          <div><b>EIRP:</b> ${sig3(eirpW)} W (${(10 * Math.log10(eirpW)).toFixed(2)} dBW)</div>
          <div><b>FSPL:</b> ${L.toFixed(2)} dB</div>
          <div><b>Pr:</b> ${sig3(prW)} W (${prDbm.toFixed(2)} dBm)</div>
          <div><b>Fade margin:</b> ${fm.toFixed(2)} dB ${fm >= 0 ? '(link OK)' : '(link FAIL)'}</div>
          <div class="mono" style="margin-top:6px;font-size:12px;color:#555;">Pt ${ptDbm} dBm → +Gt ${gtDb} → +Gr ${grDb} → −FSPL ${L.toFixed(2)} dB → Pr ${prDbm.toFixed(2)} dBm</div>
        `;
      } else {
        prW = radarEq(ptW, gtLin, sigma.value(), lam, Rm);
        prDbm = dbmFromW(prW);
        const fm = fadeMargin(prDbm, sens.value());
        readouts.innerHTML = `
          <div><b>Pr:</b> ${sig3(prW)} W (${prDbm.toFixed(2)} dBm)</div>
          <div><b>Fade margin:</b> ${fm.toFixed(2)} dB ${fm >= 0 ? '(link OK)' : '(link FAIL)'}</div>
          <div class="mono" style="margin-top:6px;font-size:12px;color:#555;">Pr = Pt·G²·σ·λ² / ((4π)³·R⁴) → ${prDbm.toFixed(2)} dBm</div>
        `;
      }
    } catch (e) {
      readouts.textContent = `error: ${(e as Error).message}`;
      return;
    }

    const rs = logspace(0.01, 100, 60); // km
    const sweep = rs.map((rk) => {
      const rmi = rk * KM;
      const p = m === 'link'
        ? friisDbm(ptDbm, gtDb, grDb, rmi, fHz)
        : dbmFromW(radarEq(ptW, gtLin, sigma.value(), lam, rmi));
      return { x: rk, y: p };
    });
    linePlot(plotHost, [{ label: 'Pr (dBm)', data: sweep }], { xLabel: 'R (km)', yLabel: 'Pr (dBm)' });
  };

  for (const w of [mode, Pt, Gt, Gr, f, R, sigma, sens]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'link-budget',
  title: 'Link Budget & Radar',
  course: 'Antennes',
  description: 'Friis link budget, EIRP, FSPL, radar equation, fade margin: received power vs distance.',
  icon: '⌖',
  render,
};
```

- [ ] **Step 2: Wire into `src/registry.ts`** — append the import
  `import { module as linkBudget } from './modules/link-budget/module.ts';` and
  append `linkBudget` to the `modules` array (append-only).

- [ ] **Step 3: Run tests** — `npm test` → PASS.
- [ ] **Step 4: Build** — `npm run build` → passes (type-check + bundle).
- [ ] **Step 5: Commit**

```sh
git add src/modules/link-budget/module.ts src/registry.ts
git commit -m "feat(modules): link budget and radar equation analyzer"
```

---

### Task 3: Smoke test + docs

**Files:**
- Modify: `tests/smoke.test.ts`, `README.md`, `CHANGELOG.md`

- [ ] **Step 1: Presence-by-id smoke assertion**:

```ts
test('link-budget module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'link-budget');
  assert.ok(m && m.course === 'Antennes', 'link-budget missing');
});
```

- [ ] **Step 2: Manual check** — `npm run dev`; switching `Mode` between `link`
  and `radar` changes the readout; in link mode the waterfall line appears, in
  radar mode the equation one-liner appears. Raising `R` lowers `Pr`; the sweep
  falls ~20 dB/decade in link mode, ~40 dB/decade in radar mode. Fade margin
  flips to `(link FAIL)` when `Pr` drops below `Rx sens`.
- [ ] **Step 3: README** — append under the Antennes section:
  `- **Link Budget & Radar** — Friis equation, EIRP, FSPL, radar equation, fade margin: received power vs distance.`
- [ ] **Step 4: CHANGELOG** — under `### Added`:
  `- Link Budget & Radar module: Friis transmission, EIRP, FSPL, monostatic radar equation, fade margin with Pr-vs-distance sweep.`
- [ ] **Step 5: Commit**

```sh
git add tests/smoke.test.ts README.md CHANGELOG.md
git commit -m "docs+test: link-budget smoke test, README, changelog"
```
