# Plane-Wave Incidence — Module Design

- **Module ID:** `plane-wave-incidence`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make Snell's law and the Fresnel coefficients concrete: given two
non-magnetic dielectrics (`n₁`, `n₂`) and an incidence angle `θ₁`, compute the
refraction angle `θ₂`, the amplitude reflection coefficient `Γ` (perpendicular
s-pol or parallel p-pol), the power transmission `T = 1 − |Γ|²`, the critical
angle `θc` (total internal reflection) and the Brewster angle `θB`. A position
plot shows the incident, reflected, and transmitted wave amplitudes across the
interface.

## Scope

### In scope

- Two media, single flat interface, monochromatic plane wave.
- Snell's law: `n₁·sinθ₁ = n₂·sinθ₂`.
- Fresnel amplitude coefficients (non-magnetic, `μ₁ = μ₂`):
  - perpendicular (s): `Γ⊥ = (n₁cosθ₁ − n₂cosθ₂)/(n₁cosθ₁ + n₂cosθ₂)`
  - parallel (p): `Γ∥ = (n₂cosθ₁ − n₁cosθ₂)/(n₂cosθ₁ + n₁cosθ₂)`
- Power transmission `T = 1 − |Γ|²`.
- Total internal reflection: `θc = arcsin(n₂/n₁)` when `n₁ > n₂`.
- Brewster angle: `θB = arctan(n₂/n₁)` where `Γ∥ = 0`.
- Position plot: incident / reflected / transmitted field amplitudes.

### Out of scope (ponytail)

- Magnetic contrast (`μ₁ ≠ μ₂`). `// ponytail: non-magnetic media only`.
- Complex `Γ` phase in TIR (evanescent decay). `// ponytail: real-valued Γ; TIR signalled by NaN`.
- Multi-layer / thin-film interference. Single interface only.
- Frequency dispersion of `n`. Scalar, monochromatic.
- p-pol exact field-direction in the wave plot. `// ponytail: t = 1+Γ used for transmitted amplitude (exact for s-pol)`.

## Requirements

### R1 — Inputs

- `n₁` slider (1.00–2.50, step 0.01; default 1.00).
- `n₂` slider (1.00–2.50, step 0.01; default 1.50).
- `θ₁` slider (0–89°, step 0.1; default 30°).
- `polarization` selector: `perpendicular` / `parallel` (default `perpendicular`).

### R2 — Readouts (3 sig figs)

- `θ₂` (degrees; `— (TIR)` when total internal reflection).
- `Γ` (real value; `|Γ|=1 (TIR)` when total internal reflection).
- `T` (power transmission).
- `θc` (degrees; `—` when `n₁ ≤ n₂`).
- `θB` (degrees).
- Flags: `⚠ TIR` when `θ₁ ≥ θc`; `⚠ Brewster` when parallel and `|Γ| < 0.01`.

### R3 — Plot

`linePlot` over position `x ∈ [−12, 12]` (interface at `x = 0`), three series:

- **Incident** (medium 1, `x ≤ 0`): `E_i = cos(n₁·x)`.
- **Reflected** (medium 1, `x ≤ 0`): `E_r = Γ·cos(n₁·x)` (TIR → `Γ = 1`).
- **Transmitted** (medium 2, `x ≥ 0`): `E_t = (1+Γ)·cos(n₂·x)` (TIR → `0`).

Series are NaN outside their medium so uPlot draws a gap. `k = n` (`ω/c = 1`).

### R4 — Error handling

- `snell` returns `NaN` when `|sinθ₂| > 1` (TIR).
- `fresnelPerp` / `fresnelParallel` return `NaN` in TIR.
- `criticalAngle` returns `null` when `n₁ ≤ n₂`.
- UI detects `NaN` `Γ` → TIR state (`T = 0`, reflected amplitude = full).

## Math / code layout

`src/math/incidence.ts` (all angles in radians):

```
snell(n1, n2, theta1)        -> theta2 | NaN      // n1 sinθ1 = n2 sinθ2
fresnelPerp(n1, n2, theta1)  -> Gamma  | NaN      // s-pol
fresnelParallel(n1, n2, theta1) -> Gamma | NaN    // p-pol
criticalAngle(n1, n2)        -> thetaC | null      // arcsin(n2/n1), n1>n2
brewsterAngle(n1, n2)        -> thetaB             // arctan(n2/n1)
```

- `src/modules/plane-wave-incidence/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/incidence.test.ts` (angles in radians; `D = π/180`):

- `snell(1, 1.5, 30°)` → `θ₂ ≈ 19.471°`.
- `fresnelPerp(1, 1.5, 0)` → `Γ ≈ −0.2`.
- `fresnelPerp(1, 1.5, 30°)` → `Γ ≈ −0.2404`.
- `fresnelParallel(1, 1.5, brewsterAngle(1, 1.5))` → `Γ ≈ 0`.
- `brewsterAngle(1, 1.5)` → `θB ≈ 56.31°`.
- `criticalAngle(1.5, 1)` → `θc ≈ 41.81°`; `criticalAngle(1, 1.5)` → `null`.
- TIR: `snell(1.5, 1, 50°)` → `NaN`; `fresnelPerp(1.5, 1, 50°)` → `NaN`.
- Registry smoke: `plane-wave-incidence` present with `course = Elektromagnetische Velden`.

## UI/UX

- Inputs → plot → readouts. Icon: `θ`.
- Card description: "Snell's law, Fresnel coefficients, critical and Brewster angles at a dielectric interface."

## Ponytail simplifications

- Non-magnetic media (`μ₁ = μ₂`), `T = 1 − |Γ|²`. `// ponytail: non-magnetic`.
- Real-valued `Γ` only; TIR signalled by `NaN`, `|Γ| = 1` shown in UI. `// ponytail: no complex Γ phase`.
- Wave plot uses `t = 1 + Γ` for transmitted field amplitude (exact s-pol; p-pol field direction omitted). `// ponytail: t=1+Γ`.
- `k = n` (`ω/c = 1`), spatial axis in normalized units. `// ponytail: normalized k`.
- Evanescent field in TIR not plotted (transmitted → 0). `// ponytail: evanescent omitted`.

## Future work

- Complex `Γ` in TIR: plot evanescent decay envelope and phase.
- Multi-layer stack: thin-film interference, Fabry–Pérot.
- Power reflectance/transmittance sweep vs `θ₁` (classic Fresnel curves).
- Exact p-pol field amplitude and direction in the wave plot.
- Frequency-dependent `n(ω)` (dispersion).
