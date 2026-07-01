# Linear Antenna Arrays — Module Design

- **Module ID:** `antenna-arrays`
- **Course:** Antennes
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make the N-element uniform linear array (ULA) concrete: given N elements,
spacing `d`, and progressive phase shift `α`, compute and visualize the array
factor `AF(θ)`, its nulls, main-beam direction, broadside half-power
beamwidth, and grating-lobe onset. Optional pattern multiplication with an
isotropic or short-dipole element pattern.

## Scope

### In scope

- Uniform linear array: isotropic elements, uniform spacing `d`, uniform
  progressive phase `α`.
- Array factor `AF(θ) = sin(N·ψ/2) / (N·sin(ψ/2))`, `ψ = k·d·cos(θ) + α`,
  `k = 2π/λ`.
- Normalized `|AF|` (peak = 1 at the main beam).
- Nulls (interior, `0° < θ < 180°`), main-beam direction (scan angle),
  broadside HPBW, grating-lobe warning.
- Broadside (`α = 0`, max @ 90°) and endfire (`α = −k·d`, max @ 0°) presets;
  beam scanning via `α`.
- Pattern multiplication: `AF × element pattern` (isotropic = 1, short dipole =
  `|sin θ|`).
- Polar plot (half plane, `θ ∈ [0°,180°]`) via foundation `polarPlot`.

### Out of scope (ponytail)

- Non-uniform arrays (binomial, Chebyshev taper). `// ponytail: uniform only`.
- 2-D / planar arrays. `// ponytail: linear only`.
- Mutual coupling between elements. `// ponytail: isolated elements`.
- Frequency-dependent element pattern. `// ponytail: scalar λ`.
- Exact half-wave dipole element pattern; short-dipole `|sin θ|` used instead.

## Requirements

### R1 — Inputs

- `N` slider: 2–20, step 1, default 4.
- `d/λ` slider: 0.05–2, step 0.05, default 0.5.
- `α` slider: −180° to 180°, step 1, default 0°.
- `element` selector: `isotropic` | `dipole` (default `isotropic`).

### R2 — Readouts (3 sig figs)

- Main-beam direction (scanAngle) in degrees.
- Null positions in degrees (interior nulls).
- Broadside HPBW in degrees (approx).
- Grating-lobe warning when `d > λ`.

### R3 — Plot

`polarPlot` (half plane): AF pattern over `θ ∈ [0°,180°]`. When element ≠
isotropic, overlay element pattern and total (`AF × element`).

## Math / code layout

`src/math/arrays.ts` — λ-normalized (`λ = 1`, `k = 2π`):

```
arrayFactor(theta, N, d, alpha, k) -> normalized |AF|   (θ rad from array axis)
nulls(N, d, alpha, k)              -> interior null angles in degrees
broadsideHpbw(N, d, lambda)        -> HPBW degrees (broadside, α=0 approx)
scanAngle(N, d, alpha, k)          -> main-beam direction degrees
hasGratingLobe(d, lambda)          -> bool (d > λ)
elementPattern(theta, kind)        -> |sin θ| (dipole) | 1 (isotropic)
```

- `src/ui/polarplot.ts` — foundation polar plot (SVG).
- `src/modules/antenna-arrays/module.ts`.
- One import line in `src/registry.ts`.

## Tests

`tests/math/arrays.test.ts` (`λ = 1`, `k = 2π`):

- `arrayFactor(π/2, 4, 0.5, 0, 2π)` → `1.0` (broadside max).
- `arrayFactor(π/3, 4, 0.5, 0, 2π)` → `≈0` (null at 60°).
- `nulls(4, 0.5, 0, 2π)` → `[60, 120]`.
- `broadsideHpbw(4, 0.5, 1)` → `≈ 25.4°`.
- `scanAngle(4, 0.5, 0, 2π)` → `90` (broadside); `scanAngle(4, 0.5, -π, 2π)` →
  `0` (endfire); `scanAngle(4, 0.5, -π/2, 2π)` → `60` (steered to 60°).
- `hasGratingLobe(1.5, 1)` → `true`; `hasGratingLobe(0.5, 1)` → `false`.
- Registry smoke: `antenna-arrays` present with `course = Antennes`.

> **Note on null angles.** A broadside ULA (`N=4`, `d=λ/2`, `α=0`) has interior
> nulls at `θ = 60°` and `θ = 120°` measured from the array axis — the
> convention consistent with broadside max at `θ = 90°`,
> `arrayFactor(π/2,…) = 1`, and the `0.886·λ/(N·d)` HPBW. The brief's
> `[30°,150°]` would require a broadside-referenced angle convention, which
> conflicts with the other cases; this spec uses the array-axis convention
> throughout. `// ponytail: axis-referenced θ`.

## UI/UX

- Inputs → polar plot → readouts. Icon: `≡` (a linear array of elements).
- Card description: "Linear antenna arrays: array factor, beam scanning,
  nulls, HPBW, grating lobes."
- `θ` referenced from the array axis (broadside at 90°); plot is a half-plane
  polar diagram.

## Ponytail simplifications

- λ-normalized math (`λ = 1`). `// ponytail: λ=1`.
- Uniform array only. `// ponytail: uniform excitation`.
- Short-dipole element pattern `|sin θ|`; no half-wave dipole.
- Broadside HPBW formula shown as a rough figure when scanned.
  `// ponytail: HPBW is broadside-only`.
- Grating-lobe check is `d > λ` (broadside); scanned arrays get GLs earlier.
  `// ponytail: simple GL check`.
- `polarPlot` re-renders fully on update. `// ponytail: full re-render, ~180 pts`.

## Future work

- Chebyshev / binomial taper for sidelobe control.
- Planar (2-D) arrays.
- Half-wave dipole element pattern; mutual coupling.
- Scan-blindness / grating-lobe analysis for arbitrary scan angles.
