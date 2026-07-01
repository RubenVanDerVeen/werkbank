# Magnetostatics — Module Design

- **Module ID:** `magnetostatics`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make Biot-Savart and Ampère's law concrete: given a current and geometry,
compute the B-field for an infinite wire, a circular loop on axis, a finite
straight segment, an ideal solenoid and toroid; then derive inductance `L`,
magnetic reluctance `ℛ`, and flux `Φ = NI/ℛ`. A 2D vector-field plot shows
the B-field arrows in cross-section for each source.

## Scope

### In scope

- Biot-Savart: infinite wire `B = μ₀I/(2πr)`, loop on axis
  `B = μ₀IR²/(2(R²+z²)^(3/2))`, finite straight segment at a point.
- Ampère's law: ideal solenoid `B = μ₀nI` (interior), ideal toroid
  `B = μ₀NI/(2πr)`.
- Inductance: solenoid `L = μ₀N²A/l`, toroid `L = μ₀N²A/(2πr)`.
- Magnetic reluctance `ℛ = l/(μ·A)`, flux `Φ = NI/ℛ`.
- 2D field-plot cross-section for wire, loop, solenoid, toroid.

### Out of scope (ponytail)

- Off-axis loop field (elliptic integrals). `// ponytail: on-axis only; off-axis is a later toggle`.
- Ferromagnetic cores (`μᵣ ≠ 1`). `// ponytail: air core (μ₀); μᵣ slider is a later toggle`.
- Fringing / edge effects for solenoid and toroid. `// ponytail: ideal infinite/long geometries`.
- Mutual inductance (covered by `maxwell-induction`).

## Requirements

### R1 — Inputs

- `source` selector: `wire | loop | solenoid | toroid` (default `wire`).
- `I` slider (0.1–10 A, step 0.1; default 1).
- `R` slider (0.01–1 m, step 0.01; default 0.1) — loop radius / solenoid radius.
- `n` slider (10–5000 turns/m, step 10; default 1000) — solenoid turn density.
- `N` slider (1–500 turns, step 1; default 100) — solenoid/toroid turns.
- `l` slider (0.01–1 m, step 0.01; default 0.1) — solenoid length.
- `r` slider (0.02–1 m, step 0.01; default 0.1) — wire distance / toroid mean radius.
- `A` slider (0.1–50 cm², step 0.1; default 1) — cross-section for L/ℛ.

### R2 — Readouts (3 sig figs)

- `B` at the characteristic point of the selected source:
  - wire → at distance `r`; loop → on axis at `z=0`; solenoid → interior;
    toroid → at mean radius `r`.
- `L`, `ℛ`, `Φ` shown only for inductor sources (`solenoid`, `toroid`);
  `ℛ` uses `μ = μ₀` (air core).

### R3 — Plot

`fieldPlot`: 2D cross-section vector arrows (with magnitude heat-map) over a
fixed ±0.3 m window, 13×13 grid. Per source:
- `wire`: circulating field around origin.
- `loop`: two opposite point currents at `(±R, 0)` (edge-on cross-section).
- `solenoid`: uniform axial field inside the rectangle `|x|<R, |y|<l/2`.
- `toroid`: circulating field in the annulus around mean radius `r`.

### R4 — Error handling

`r ≤ 0`, `R ≤ 0`, `l ≤ 0`, `A ≤ 0`, `μ ≤ 0`, `ℛ ≤ 0` → throw with a clear
message (e.g. `wireField: r must be > 0`).

## Math / code layout

`src/math/magnetostatics.ts`:

```
MU_0 = 4π·1e-7 H/m (textbook exact)
wireField(I, r)              = μ₀I/(2πr)
wireField2D(I, wx, wy, x, y) → {Bx, By}   // infinite wire (current +z) at (wx,wy)
loopField(I, R, z)           = μ₀IR²/(2(R²+z²)^(3/2))
segmentField(I, d, x1, x2)   = μ₀I/(4πd)·[x/√(x²+d²)]_{x1}^{x2}
solenoidField(n, I)          = μ₀nI
solenoidInductance(N, A, l) = μ₀N²A/l
toroidField(N, I, r)        = μ₀NI/(2πr)
toroidInductance(N, A, r)   = μ₀N²A/(2πr)
reluctance(l, μ, A)         = l/(μ·A)
flux(N, I, ℛ)               = NI/ℛ
```

- `src/modules/magnetostatics/module.ts` — owns the grid-builder + readouts.
- One import line in `src/registry.ts`.

## Tests

`tests/math/magnetostatics.test.ts` (relative tolerance 1e-9):

- `MU_0 = 4π·1e-7`.
- `wireField(1, 0.01)` = `2e-5` T; `wireField(1, 0.02)` = `1e-5` T.
- `wireField2D(1, 0, 0, 0.01, 0)` magnitude = `wireField(1, 0.01)`.
- `loopField(1, 0.1, 0)` = `μ₀/(2R) = μ₀/0.2 ≈ 6.283e-6` T.
- `segmentField(1, 0.01, -1, 1)` = `2e-5/√1.0001 ≈ 1.9999e-5` T (→ infinite wire).
- `solenoidField(1000, 1)` = `μ₀nI ≈ 1.257e-3` T.
- `solenoidInductance(100, 1e-4, 0.1)` = `μ₀·10 ≈ 1.257e-5` H.
- `toroidField(100, 1, 0.1)` = `2e-4` T.
- `toroidInductance(100, 1e-4, 0.1)` = `2e-6` H.
- `reluctance(0.1, μ₀, 1e-4)` ≈ `7.958e8` A/Wb.
- `flux(100, 1, ℛ)` = `100/ℛ` ≈ `1.257e-7` Wb.
- Registry smoke: `magnetostatics` present with `course = Elektromagnetische Velden`.

## UI/UX

- Select → sliders → field plot → readouts. Icon: `⊙`.
- Card description: "Biot-Savart, Ampère law, inductance, magnetic reluctance."

## Ponytail simplifications

- On-axis loop field only. `// ponytail: on-axis only`.
- Air core (`μ = μ₀`), no `μᵣ`. `// ponytail: air core`.
- Ideal long solenoid / thin toroid, no fringing. `// ponytail: ideal geometries`.
- Loop cross-section via two opposite point currents (not the full off-axis field).
- `B` at characteristic point, not live cursor (`fieldPlot` has no mouse callback).
- Fixed ±0.3 m plot window; large geometries clip.

## Future work

- Off-axis loop field via elliptic integrals (toggle).
- `μᵣ` slider for ferromagnetic cores → non-linear `B-H` curve.
- Live cursor readout (`fieldPlot` mouse callback).
- Mutual inductance (couple to `maxwell-induction`).
