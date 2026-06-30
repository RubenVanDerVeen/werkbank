# Electromagnetic Waves — Module Design

- **Module ID:** `em-waves`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make plane-wave propagation concrete: given a medium (μ, ε, σ) and frequency,
compute the intrinsic impedance η, the propagation constant γ = α + jβ, the skin
depth δ, the phase velocity v, and the time-average Poynting magnitude ⟨S⟩. A
snapshot plot shows Ex(z) and Ey(z) at t = 0 for linear / circular / elliptical
polarization, with the e^(−αz) envelope visible in lossy media.

## Scope

### In scope

- Plane wave `E(z,t) = E₀·e^(−αz)·cos(ωt − βz)`, snapshot at `t = 0`.
- `η = sqrt(μ/ε)`; free space `η₀ ≈ 376.73 Ω`.
- Propagation constant `γ = α + jβ` from the **exact** `γ² = (jωμ)(σ + jωε) =
  −ω²με + jωμσ` — reduces to lossless (`α=0`), low-loss
  (`α = (σ/2)·sqrt(μ/ε)`), and good-conductor (`α = β = sqrt(ωμσ/2)`) regimes.
- Skin depth `δ = sqrt(2/(ωμσ))` (good conductor).
- Phase velocity `v = 1/sqrt(με)`; free space `c ≈ 2.998e8`.
- Time-average Poynting `⟨S⟩ = E₀²/(2η)`.
- Polarization types: linear, circular (equal amplitude, 90° phase), elliptical
  (unequal amplitude).
- Medium presets: free space, lossy dielectric, good conductor (copper).

### Out of scope (ponytail)

- Oblique incidence / reflection-transmission at interfaces. `// ponytail: SP-5 plane-wave-incidence owns this`.
- Waveguide / cavity modes. `// ponytail: SP-6 waveguides owns this`.
- Anisotropic media (μ, ε tensors) — scalar μ, ε only. `// ponytail: isotropic media only`.
- Frequency dispersion `ε(ω)`, `μ(ω)` — constant values per medium. `// ponytail: non-dispersive`.
- Transient turn-on — steady-state phasor only. `// ponytail: steady state only`.
- Animated time evolution — static `t = 0` snapshot. `// ponytail: no animation`.

## Requirements

### R1 — Inputs

- `medium` selector: `free space` / `lossy dielectric` / `good conductor`
  (default `free space`). Each preset bundles `(mur, epsr, sigma)`:
  - `free space`: `mur=1, epsr=1, sigma=0`.
  - `lossy dielectric`: `mur=1, epsr=4, sigma=0.01`.
  - `good conductor`: `mur=1, epsr=1, sigma=5.8e7` (copper).
- `polarization` selector: `linear` / `circular` / `elliptical` (default `linear`).
- `f` slider: 0.01–100 GHz (step 0.01, default 1).
- `E₀` slider: 1–1000 V/m (step 1, default 100).

### R2 — Readouts (3 sig figs)

- `η` (Ω), `α` (Np/m), `β` (rad/m), `δ` (µm, or `∞` when `σ = 0`).
- `v` (m/s), `⟨S⟩` (W/m²).

### R3 — Plot

`linePlot`: Ex(z) and Ey(z) at `t = 0` over `z ∈ [0, zmax]`, 200 samples.
`zmax = 5·δ` when `δ < λ` (lossy: show the decay), else `4·λ` (lossless: show
~4 cycles), where `λ = 2π/β`. Exponential envelope `e^(−αz)` is implicit in the
sampled values. Ey amplitude: `0` (linear), `1·E₀` (circular), `0.5·E₀`
(elliptical).

### R4 — Error handling

None required — all formulas are defined for `σ ≥ 0`, `ω > 0`, `μ, ε > 0`.
`σ = 0` ⇒ `δ = ∞` (readout shows `∞`, plot uses `4·λ` branch).

## Math / code layout

`src/math/emwaves.ts` — pure functions, no DOM, SI units throughout:

| Fn | Definition |
|----|------------|
| `intrinsicImpedance(mu, eps)` | `sqrt(mu/eps)` |
| `propagationConst(omega, mu, eps, sigma)` | `{ alpha, beta }` from `γ² = −ω²με + jωμσ`: `mag = hypot(a,b)`, `alpha = sqrt(max(0,(mag+a)/2))`, `beta = sqrt(max(0,(mag−a)/2))` |
| `skinDepth(omega, mu, sigma)` | `sigma ≤ 0 ? Infinity : sqrt(2/(omega·mu·sigma))` |
| `phaseVelocity(mu, eps)` | `1/sqrt(mu·eps)` |
| `poyntingAvg(E0, eta)` | `E0²/(2·eta)` |

Constants exported: `MU0 = 4π·1e−7`, `EPS0 = 8.8541878128e−12`.

- `src/modules/em-waves/module.ts` (uses `linePlot` + `selectWave` + `slider`).
- One import line appended in `src/registry.ts`.

## Tests

`tests/math/emwaves.test.ts`:

- `intrinsicImpedance(MU0, EPS0)` → `376.73` Ω (±0.01).
- `phaseVelocity(MU0, EPS0)` → `2.998e8` m/s (±1e5).
- `skinDepth(2π·1e9, MU0, 5.8e7)` → `2.09e-6` m = 2.09 µm (±0.01 µm), copper @ 1 GHz.
- `propagationConst(2π·1e9, MU0, EPS0, 0)` → `alpha=0`, `beta = ω·sqrt(MU0·EPS0) ≈ 20.96` rad/m (±1e-3).
- `propagationConst(2π·1e9, MU0, EPS0, 5.8e7)` → `alpha ≈ beta ≈ 1/skinDepth ≈ 4.785e5` (±1e3).
- `poyntingAvg(100, 376.73)` → `13.27` W/m² (±0.01).
- Registry smoke: `em-waves` present with `course = Elektromagnetische Velden`.

## UI/UX

- Inputs → plot → readouts. Icon: `λ`.
- Card description: "Plane-wave propagation: η, γ, skin depth, Poynting vector, polarization."

## Ponytail simplifications

- Exact `γ` via real `sqrt` (no complex-sqrt dependency); reproduces the spec's
  low-loss `α = (σ/2)·sqrt(μ/ε)` when `σ ≪ ωε` and stays correct for good
  conductors. `// ponytail: closed-form real sqrt, no complex.sqrt`.
- σ coupled to medium preset — no standalone σ slider. `// ponytail: σ via preset, spans 9 decades, linear slider useless; text-input upgrade deferred`.
- Single Ex/Ey plot; `B = E/v` shown as a readout, not a second curve. `// ponytail: one plot path, B as readout`.
- Elliptical = 0.5× amplitude (hardcoded ratio). `// ponytail: elliptical ratio fixed at 0.5`.
- `t = 0` snapshot only. `// ponytail: no animation`.

## Future work

- Animated time evolution (`t` slider or `requestAnimationFrame` loop).
- Standalone σ text input (polyInput) for continuous conductivity sweep across
  the three regimes.
- 3D polarization-ellipse visualization (would use `svgPlot` or a 3D helper).
- Frequency dispersion `ε(ω)`, `μ(ω)` — couple to a material database.
