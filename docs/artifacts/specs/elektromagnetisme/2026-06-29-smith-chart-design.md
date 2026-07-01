# Interactive Smith Chart — Module Design

- **Module ID:** `smith-chart`
- **Course:** Hoogfrequenttechniek
- **Date:** 2026-06-29
- **Status:** proposed
- **Outline slot:** SP-9 in `2026-06-29-elektromagnetisme-outline.md`

## Goal

Make the Smith chart tangible as an interactive instrument: type or click a load
impedance `Z`, see its reflection coefficient `Γ`, SWR, admittance `Y`, and the
constant-resistance / constant-reactance / SWR circles that pass through it; flip
to admittance mode to read `Y` directly. Built on the foundation `smithChart`
SVG helper, this module adds the interaction layer (click-to-set, overlays).

## Dependencies

- **Foundation plan `2026-06-29-foundation.md` must be merged first.** This
  module imports, and does not redefine:
  - `src/ui/smith.ts` → `smithChart(host, {z0?, title?})` returning
    `{update(points: {z: Complex; label?}[])}`.
  - `src/math/tl.ts` → `zToGamma(z, z0)`, `gammaToZ(g, z0)`, `swr(g)`.
  - `src/math/complex.ts` → `Complex`, `cphaseDeg`.
- No other module's `src/math/<x>.ts` is touched.

## Scope

### In scope

- Z↔Γ mapping (via foundation `zToGamma` / `gammaToZ`).
- Admittance `Y = 1/Z` (this module's `admittanceFromImpedance`); Y mode plots the
  marker at the admittance (antipodal) position on the impedance grid.
- Constant-resistance circle through the point: center `(r/(1+r), 0)`, radius
  `1/(1+r)` in the Γ-plane (`constantRCircle`).
- Constant-reactance circle through the point: center `(1, 1/x)`, radius
  `1/|x|` (`constantXCircle`).
- SWR circle through the point (constant `|Γ|`), using foundation `swr`.
- Click on the chart → Γ at the cursor → Z → sliders update.
- Mode toggle (Z / Y), sliders for `Z_re`, `Z_im`, `Z₀`.
- Readouts: Γ (re/im, |Γ|, ∠°), Z, Y, SWR.

### Out of scope (ponytail)

- **Admittance GRID** (rotated constant-g/b circles) — Y mode reuses the
  impedance grid and places the marker at the antipode, no redrawn grid.
  `// ponytail: Y mode = antipodal marker on the impedance grid, no admittance grid.`
- **Frequency-dependent / lossy Z** — `Z` is one complex number, no `jω` sweep.
- **Matching-network synthesis** — that is the `impedance-matching` module (SP-10).
- **Drag-to-move / marker animation** — click-to-set only.
- **Multi-point trajectories** — single load point; trajectories are SP-10's job.
- **Noise / stability circles** (amplifier design) — later.

## Requirements

### R1 — Inputs

- `mode` selector: `Impedance (Z)` | `Admittance (Y)` (default `Impedance (Z)`).
- `Z real` slider (0–500 Ω, step 1, default 50).
- `Z imag` slider (−500–500 Ω, step 1, default 0).
- `Z₀` slider (10–200 Ω, step 1, default 50).

### R2 — Readouts (3 sig figs)

- `Γ`: re ± j·im.
- `|Γ|` and `∠Γ` (degrees, via `cphaseDeg`).
- `Z`: re ± j·im (Ω).
- `Y`: re ± j·im (S), via `admittanceFromImpedance`.
- `SWR`, via foundation `swr`; shows `∞` when `|Γ| ≥ 1` (foundation `swr` throws
  at `|Γ| = 1`, so the UI guards the call).

### R3 — Plot

`smithChart(host, { z0: Z₀, title: 'Smith chart' })` (foundation). This module
adds SVG overlays (tagged `data-smith-overlay`, cleared each update):

- the current-point marker comes from the foundation's own `update([{z, label}])`
  dot+label (no duplicate marker drawn);
- **SWR circle** (constant `|Γ|`), drawn in both modes;
- **constant-r circle** (green) and **constant-x circle** (dashed) through the
  point, drawn in Z mode only.

Y mode feeds the foundation the antipodal impedance `gammaToZ(−Γ, Z₀)` so its
dot lands at `−Γ` = the admittance position; the impedance r/x circles are
suppressed in Y mode (they would mislead there).

### R4 — Click interaction

A click on the chart SVG maps screen → Γ via `getScreenCTM().inverse()` and the
unit-circle geometry extracted from the rendered SVG (the boundary `<circle>`
centered at the viewBox center). `|Γ| > 1` clicks are clamped to the unit circle
(passive region). Z mode interprets the cursor as `Γ_Z`; Y mode as the admittance
position `−Γ_Z`. The resulting `Z` writes back into the `Z_re` / `Z_im` sliders.

### R5 — Error handling

- `|Γ| ≥ 1` (short / open / pure reactance) → SWR readout shows `∞` (foundation
  `swr` throw guarded); other readouts remain finite (Z=0 → Y=∞ shown as `∞`).
- No throws in this module's own math (`constantXCircle(0)` returns `Infinity`;
  the overlay helper skips non-finite radii).

## Math / code layout

`src/math/smithmath.ts` (pure, imports `complex.ts` type only):

```
admittanceFromImpedance(z) -> 1/z   // (re - j im)/(re² + im²); Z=0 -> NaN (1/0 = ∞)
constantRCircle(r)          -> { cx: r/(1+r), cy: 0, radius: 1/(1+r) }   // r >= 0; r=0 is the boundary
constantXCircle(x)          -> { cx: 1, cy: 1/x, radius: 1/|x| }          // x=0 -> Infinity (real axis)
```

- `src/modules/smith-chart/module.ts` — sliders + mode toggle + `smithChart` +
  click/overlay interaction + readouts.
- One import line appended to `src/registry.ts`.

## Tests

`tests/math/smithmath.test.ts` (`node:test`, tolerance `1e-9`):

- `admittanceFromImpedance({re:50, im:0})` → `{re:0.02, im:0}`.
- `admittanceFromImpedance({re:1, im:1})` → `{re:0.5, im:−0.5}`.
- `admittanceFromImpedance({re:0, im:50})` → `{re:0, im:−0.02}`.
- `constantRCircle(1)` → `{cx:0.5, cy:0, radius:0.5}`.
- `constantRCircle(0)` → `{cx:0, cy:0, radius:1}` (the unit boundary).
- `constantRCircle(2)` → `{cx:2/3, cy:0, radius:1/3}`.
- `constantXCircle(1)` → `{cx:1, cy:1, radius:1}`.
- `constantXCircle(−1)` → `{cx:1, cy:−1, radius:1}`.
- `constantXCircle(2)` → `{cx:1, cy:0.5, radius:0.5}`.
- `constantXCircle(0)` → non-finite `cy` and `radius` (real-axis degenerate).
- Registry smoke: `smith-chart` present with `course === 'Hoogfrequenttechniek'`.

Click geometry and overlay drawing are DOM-side and verified by manual
click-through (Task 2), not unit-tested — same split as the `feedback` module.

## UI/UX

- Inputs → Smith chart → readouts. Icon: `◎`.
- Card description: "Interactive Smith chart: Z↔Γ, admittance, SWR, constant-r/x circles."
- Geometry coupling is documented in-code (`smithGeom`): the foundation draws
  the unit boundary centered at the viewBox center, so the module locates it at
  runtime rather than hardcoding `180/160`.

## Ponytail simplifications

- Y mode = antipodal marker on the impedance grid; no admittance grid redrawn.
- r/x highlight circles drawn in Z mode only.
- `constantXCircle(0)` returns `Infinity` (no special-case / throw); the overlay
  helper skips non-finite radii.
- `admittanceFromImpedance` inlined (not `cdiv`) so `Z=0` deterministically yields
  NaN rather than depending on `cdiv`'s divide-by-zero path.
- Click → Γ via `DOMPoint` + `getScreenCTM` (no deprecated `createSVGPoint`).
- Unit-circle geometry derived at runtime (no hardcoded `180/160`).
- Single point, no trajectory / sweep (SP-10's role).

## Future work

- Admittance grid (rotated constant-g/b circles) as a true Y-mode chart.
- Drag-to-move the marker (pointer events) in addition to click-to-set.
- Frequency-swept `Z(jω)` of an RLC load, plotted as a trajectory.
- Noise / stability circles for RF amplifier design.
- Export the current point as a normalized impedance / reflection coefficient.
