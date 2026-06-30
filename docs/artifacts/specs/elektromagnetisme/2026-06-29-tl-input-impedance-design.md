# TL Input Impedance, SWR & λ/4 Transformer — Design

- **Sub-project:** SP-8
- **Course:** Hoogfrequenttechniek
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Visualize how the input impedance of a lossless transmission line varies with
line length, load impedance, and characteristic impedance. Show the reflection
coefficient, SWR, and the λ/4 transformer match on the Smith chart.

## Scope

### In scope

- `src/math/tlinputz.ts` — Zin sweep vs line length, Vmax/Vmin positions.
- `src/modules/tl-input-impedance/module.ts` — sliders for ZL (re/im), Z₀, line
  length; `linePlot` for |Zin| vs length; `smithChart` for Γ locus; readouts.

### Out of scope (ponytail)

- Lossy line Zin — foundation `zinLossless` only. `// ponytail: lossless only`.
- Transient response — frequency-domain only.
- Multi-section transformers — single λ/4 only.

## Requirements

### R1 — Zin sweep

`zinSweep(zL: Complex, z0: number, betaLStart: number, betaLEnd: number, steps: number): { betaL: number; zin: Complex }[]`

Sweeps `zinLossless(zL, betaL, z0)` over `betaL ∈ [start, end]` in `steps`
points. Used by the `linePlot` and `smithChart` locus.

### R2 — Voltage extrema positions

`vmaxPosition(gamma: Complex): number` — distance in wavelengths from load to
first voltage maximum = `(1 − angle(Γ)/(2π)) / 2` (mod 0.5).

`vminPosition(gamma: Complex): number` — `vmaxPosition + 0.25` (mod 0.5).

### R3 — Module UI

- Sliders: ZL real (0–200 Ω), ZL imag (−100–100 Ω), Z₀ (10–200 Ω), line length
  (0–0.5 λ).
- `linePlot`: Re(Zin) and Im(Zin) vs line length (0–0.5 λ).
- `smithChart`: Zin locus as line length sweeps 0–0.5 λ, plus the load point.
- Readouts: Zin at current length, |Γ|, SWR, λ/4 Z₀', Vmax position, Vmin position.

## Math / code layout

- `src/math/tlinputz.ts` — sweep + extrema positions (uses `complex.ts` +
  foundation `tl.ts`).
- `src/modules/tl-input-impedance/module.ts` — UI wiring.

## Tests

`tests/math/tlinputz.test.ts`:

- `zinSweep({50,0}, 50, 0, Math.PI, 5)` → all points `{50,0}` (matched load,
  Zin constant).
- `zinSweep({0,0}, 50, 0, Math.PI, 5)` → first point `{0,0}` (short at l=0),
  mid point ≈ `{1e9, 0}` (open at λ/4, assert `re > 1e6`), last point `{0,0}`.
- `vmaxPosition({0.5, 0})` → `0.25` (Γ real positive, Vmax at λ/4 from load).
- `vminPosition({0.5, 0})` → `0.0` (Vmin at load for positive real Γ).

## UI/UX

One card in the Hoogfrequenttechniek section. Layout: sliders on left, Smith
chart + line plot stacked on right, readouts below.

## Ponytail simplifications

- Lossless only. `// ponytail: lossless Zin, add zinLossy if needed`.
- λ/4 transformer for real ZL only. `// ponytail: real ZL for λ/4`.
- 0–0.5 λ sweep range (one full cycle). `// ponytail: half-λ sweep covers one
  Zin rotation`.

## Future work

- Lossy line Zin with `zinLossy(gamma, l)`.
- Multi-section transformer design.
