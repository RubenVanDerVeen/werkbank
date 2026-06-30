# Dipole Radiation — Module Design

- **Module ID:** `dipole-radiation`
- **Course:** Antennes
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make the radiation pattern of the two canonical dipoles concrete: the
Hertzian (short) dipole `F(θ)=sin θ` and the half-wave dipole
`F(θ)=cos(π/2·cos θ)/sin θ`. A polar plot shows the normalized E-plane
pattern; readouts give the radiation resistance `Rr`, directivity `D`
(linear + dBi), half-power beamwidth (HPBW), and radiated power `Prad`.

## Scope

### In scope

- Two dipoles: `hertzian` (short, uniform current) and `halfwave`
  (sinusoidal current, l = λ/2).
- Normalized patterns `|F(θ)|` (max = 1 at broadside θ = π/2, null at
  endfire θ = 0, π).
- `Rr`: Hertzian `80π²(l/λ)²`; half-wave `≈ 73 Ω`.
- `D`: Hertzian `1.5` (1.76 dBi); half-wave `≈ 1.64` (2.15 dBi).
- `HPBW`: Hertzian `90°`; half-wave `≈ 78°`.
- `Prad = ½·I₀²·Rr`.
- Polar plot, linear or dB scale, E-plane θ ∈ [0, 2π].

### Out of scope (ponytail)

- Arbitrary length dipoles (only the two canonical currents). `// ponytail: two canonical dipoles; arbitrary l needs a current-distribution integral`.
- Reactance / input impedance `Xin` (only `Rr`). `// ponytail: Rr only; Xin needs King-Middleton terms`.
- Mutual impedance / array factor (single element). `// ponytail: single isolated dipole`.
- Near field / `1/r²` terms. `// ponytail: far-field only`.
- Ground-plane / image effects (free space). `// ponytail: free space`.

## Dependencies / Prerequisites

- **`src/ui/polarplot.ts`** — listed as a foundation helper but **not yet
  present** in the repo. This module's UI calls
  `polarPlot(host, series, { db, half })`. The implementation plan
  scaffolds a minimal SVG `polarplot.ts` as Task 0 so the plan is
  self-contained; if a full foundation `polarplot.ts` lands separately,
  skip Task 0.

## Requirements

### R1 — Inputs

- `type` selector: `hertzian` | `halfwave` (default `hertzian`).
- `l/λ` slider (0.01–0.5, step 0.01, default 0.1) — feeds the Hertzian `Rr`
  only (half-wave `Rr` is the fixed 73 Ω textbook value).
- `I₀` slider (0–10 A, step 0.01, default 1) — feeds `Prad`.
- `scale` selector: `linear` | `dB` (default `linear`) — polar radius scale.

### R2 — Readouts (3 sig figs)

- `Rr` (Ω).
- `D` linear and `D (dBi)`.
- `HPBW` (degrees).
- `Prad` (W) = `½·I₀²·Rr`.

### R3 — Plot

`polarPlot`: one series — the selected type's normalized `|F(θ)|` over
θ ∈ [0, 2π] (N ≈ 181). `db` option wired to the `scale` selector. Title
"E-plane pattern".

### R4 — Edge handling

- `halfWavePattern` at θ = 0 and θ = π is `0/0`; guard returns `0` (the
  limit is 0, the endfire null).
- dB scale at r = 0 → floor at −40 dB (radiation-pattern convention).

## Math / code layout

`src/math/dipole.ts`:

```
hertzianPattern(theta)   = |sin θ|                      // normalized, max 1 at broadside
halfWavePattern(theta)   = |cos(π/2·cos θ)/sin θ|       // already peaks at 1; guard sin θ→0 → 0
hertzianRr(l, λ)         = 80π²·(l/λ)²
halfWaveRr()             = 73                           // textbook ~73 Ω
directivity(type)        = hertzian ? 1.5 : 1.64       // linear D
directivityDbi(type)     = 10·log10(directivity(type))
hpbw(type)               = hertzian ? 90 : 78          // degrees
radiatedPower(I0, Rr)    = 0.5·I0²·Rr
```

- `DipoleType = 'hertzian' | 'halfwave'`.
- `src/modules/dipole-radiation/module.ts` using `polarPlot`.
- One import line in `src/registry.ts`.

## Tests

`tests/math/dipole.test.ts`:

- `hertzianPattern(π/2)` → `1.0` (broadside max).
- `hertzianPattern(0)` → `0` (endfire null).
- `hertzianPattern(π)` → `0`.
- `halfWavePattern(π/2)` → `1.0` (broadside max).
- `halfWavePattern(0)` → `0` (guarded 0/0).
- `halfWavePattern(π)` → `0` (guarded).
- `hertzianRr(0.1, 1.0)` → `≈ 7.8957` (i.e. `80π²·0.01`).
- `halfWaveRr()` → `73`.
- `directivity('hertzian')` → `1.5`.
- `directivity('halfwave')` → `≈ 1.64`.
- `directivityDbi('hertzian')` → `≈ 1.76`.
- `directivityDbi('halfwave')` → `≈ 2.15`.
- `hpbw('hertzian')` → `90`.
- `hpbw('halfwave')` → `≈ 78`.
- `radiatedPower(1, 73)` → `36.5`.
- Registry smoke: `dipole-radiation` present with `course = Antennes`.

## UI/UX

- Inputs → polar plot → readouts. Icon: `Θ`.
- Card description: "Hertzian and half-wave dipole radiation patterns:
  Rr, directivity, HPBW, Prad."

## Ponytail simplifications

- `D` and `HPBW` are textbook constants for the two canonical dipoles, not
  derived at runtime. `// ponytail: constants; derive from pattern integral if arbitrary dipoles added`.
- Two dipoles only, no arbitrary current distribution.
- `Rr` only, no `Xin`.
- Free space, far field, isolated element.

## Future work

- Arbitrary-length dipole: integrate the assumed current distribution for
  `F(θ)` and `Rr`.
- Input impedance `Zin = Rr + jXin` (King-Middleton).
- Array factor for 2-element / N-element arrays (couple to a new
  `array-factor` module).
- Ground-plane / image theory for a dipole over earth.
