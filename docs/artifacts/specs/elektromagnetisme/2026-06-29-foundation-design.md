# Elektromagnetisme Foundation — Smith Chart, Field Plot, Polar Plot, TL Math

- **Sub-project:** F (foundation)
- **Subject:** Elektromagnetisme (shared infrastructure across EM / HF / Antennas)
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Give the 14 Elektromagnetisme modules four shared, tested helpers:

1. A **Smith chart** SVG helper for the HF bucket (impedance/admittance mapping,
   reflection coefficient plotting, matching-network trajectories).
2. A **2D field plot** SVG helper for the EM-fields bucket (vector-field arrows
   + scalar-field contours / heat-map cells).
3. A **polar radiation-pattern** SVG helper for the antennas bucket.
4. A **transmission-line math** helper for the HF bucket (Z↔Γ, SWR, input Z,
   quarter-wave transformer).

The AC-frequency bucket already has `src/math/complex.ts` from the
Elektronica1B foundation — this foundation reuses it (no new complex layer).

## Scope

### In scope

- `src/ui/smith.ts` — `smithChart(host, opts)` SVG renderer with the unit
  `|Γ| = 1` circle, constant-resistance circles, constant-reactance arcs, and
  a list of `Γ`/`Z` points to plot; returns `{ update(points) }`.
- `src/ui/fieldplot.ts` — `fieldPlot(host, grid, opts)` SVG renderer drawing
  vector arrows on a 2D grid plus optional scalar heat-map cells (one color per
  magnitude bin); returns `{ update(grid) }`.
- `src/ui/polarplot.ts` — `polarPlot(host, series, opts)` SVG renderer drawing
  polar radiation patterns (linear or dB radial scale, full or half plane);
  returns `{ update(series) }`.
- `src/math/tl.ts` — TL algebra: `zToGamma`, `gammaToZ`, `swr`, `zinLossless`,
  `quarterWaveZ`.

### Out of scope (ponytail)

- Circuit-specific or antenna-specific math — each module owns its own
  `src/math/<x>.ts`.
- 3D field rendering — `fieldPlot` is 2D only. `// ponytail: 2D field slice only`.
- Admittance-chart mode in `smith.ts` — callers convert Y→Z themselves via
  `complex.ts` and plot as Z. `// ponytail: admittance via Z=1/Y in callers`.
- Lossy-line `zin` — only the lossless case is in the foundation; a later module
  can add `zinLossy(gamma, l)` if needed. `// ponytail: lossless Zin only`.
- Smith-chart interactive click handling — the `smith-chart` module owns
  interaction; the foundation only draws.

## Requirements

### R1 — Smith chart SVG helper

`smithChart(host: HTMLElement, opts: { z0?: number; title?: string } = {})`:

- Renders an SVG of default size 360×360 with:
  - Outer unit circle (`|Γ| = 1`), centered at (180,180), radius 160 in SVG
    coords.
  - A representative set of constant-r circles (r ∈ {0, 0.3, 1, 3}) and
    constant-x arcs (x ∈ {±0.3, ±1, ±3}). `// ponytail: sparse grid, full grid
    is noise on a 360px chart`.
  - Axes (real horizontal, imaginary vertical) drawn faint.
- Accepts a `points: { z: Complex; label?: string }[]` via the returned
  `update(points)` method; converts each `z` (normalized by `z0`, default 50 Ω)
  to `Γ = (z − 1)/(z + 1)` via `complex.ts`, plots it as a small filled dot with
  optional label.
- Returns `{ update(points) }`. Mirrors `svgPlot`'s structure (clear host,
  build SVG, return update handle).

### R2 — Field plot SVG helper

`fieldPlot(host: HTMLElement, grid: FieldGrid, opts: { title?: string; showMagnitude?: boolean } = {})`:

- `FieldGrid = { nx: number; ny: number; vectors: { x: number; y: number; vx: number; vy: number }[] }`
  — grid coordinates `(x, y)` in canvas units, with vector components `(vx, vy)`.
- Renders an SVG (default 360×360) with:
  - One arrow per grid point, drawn from `(x, y)` to `(x + s·vx, y + s·vy)`,
    where `s` auto-scales so the longest arrow fits one cell.
  - Optional heat-map cells colored by `|v|` (5 discrete bins, light-to-dark).
    `// ponytail: 5-bin magnitude heat map`.
- Returns `{ update(grid) }`. Used by electrostatics (E-field),
  magnetostatics (B-field), em-waves (E/B snapshot), waveguides (mode profile).

### R3 — Polar plot SVG helper

`polarPlot(host: HTMLElement, series: { label: string; samples: { theta: number; r: number }[] }[], opts: { title?: string; db?: boolean; half?: boolean } = {})`:

- Renders an SVG (default 360×360) with concentric grid circles at
  `r = 0, 0.25, 0.5, 0.75, 1.0` of the max radius (or 0, −10, −20, −30 dB if
  `db: true`).
- Plots each series as a closed polyline in polar coordinates
  (`x = cx + R·r·cos θ`, `y = cy − R·r·sin θ`).
- `half: true` restricts to `θ ∈ [0, π]` (half-plane, common for azimuth
  patterns).
- Returns `{ update(series) }`. Used by dipole-radiation and antenna-arrays.
  (`link-budget` uses only `linePlot` for Pr vs distance; it does not depend on
  the foundation.)

### R4 — Transmission-line math

`src/math/tl.ts` — pure functions, no DOM:

| Fn | Definition |
|----|------------|
| `zToGamma(z, z0)` | `Γ = (z − z0)/(z + z0)` via `complex.ts` |
| `gammaToZ(g, z0)` | `Z = z0 · (1 + Γ)/(1 − Γ)` |
| `swr(g)` | `(1 + \|Γ\|)/(1 − \|Γ\|)`; throws on `\|Γ\| = 1` |
| `zinLossless(zL, betaL, z0)` | `Z0 · (zL + j·Z0·tan(βl))/(Z0 + j·zL·tan(βl))` |
| `quarterWaveZ(zL, z0)` | `Z0² / zL` (the λ/4 transformer match) |

All `z`/`Z` values are `Complex` from `src/math/complex.ts`. `z0` and real loads
are passed as `Complex` via `{ re: x, im: 0 }` — convenience wrappers are the
caller's job (`// ponytail: no Real wrapper, callers pass {re,im:0}`).

## Math / code layout

- `src/ui/smith.ts` — SVG Smith chart (uses `complex.ts`).
- `src/ui/fieldplot.ts` — SVG field plot.
- `src/ui/polarplot.ts` — SVG polar plot.
- `src/math/tl.ts` — TL algebra (uses `complex.ts`).

## Tests

`tests/math/tl.test.ts`:

- `zToGamma({50,0}, 50)` → `{0,0}` (matched load, Γ = 0).
- `zToGamma({0,0}, 50)` → `{−1,0}` (short, Γ = −1).
- `zToGamma({1e9,0}, 50)` → `{1,0}` (≈ open, Γ ≈ +1).
- `gammaToZ({0,0}, 50)` → `{50,0}` (round-trip).
- `swr({0.5,0})` → `3` (|Γ|=0.5 → SWR = 3).
- `zinLossless({0,0}, Math.PI/4, 50)` → `{0, 50}` (short at λ/8 → `j·Z0·tan(π/4) = j·50`).
- `quarterWaveZ(100, 50)` → `25` (Z0²/zL = 2500/100 = 25).

Smith/field/polar helpers are DOM-only — covered by `npm run build`, not unit
tests.

## UI/UX

No user-facing module. This is internal infrastructure; no card, no registry
entry. CHANGELOG gets an internal note only.

## Ponytail simplifications

- Sparse Smith grid (4 r-circles, 3 x-arcs). `// ponytail: sparse Smith grid`.
- 2D field plot only. `// ponytail: 2D field slice, no 3D`.
- 5-bin magnitude heat map. `// ponytail: 5 magnitude bins`.
- Lossless `zin` only. `// ponytail: lossless Zin, add zinLossy if needed`.
- No Real-wrapper convenience fns; callers pass `{re,im:0}`. `// ponytail: no
  Real wrapper`.
- No interactive click handling in `smithChart` — the `smith-chart` module owns
  it. `// ponytail: foundation draws only`.

## Future work

- A lossy `zinLossy(gamma, l)` if a later HF module needs it.
- A denser Smith grid (or zoom/pan) if the `smith-chart` module's UX calls for
  it — extend in that module, not the foundation.
- A 3D field renderer would be a separate helper; not needed for v1.
