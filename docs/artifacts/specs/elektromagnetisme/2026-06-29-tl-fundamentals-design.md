# Transmission-Line Fundamentals — Module Design

- **Module ID:** `tl-fundamentals`
- **Course:** Hoogfrequenttechniek
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make the distributed LGC transmission-line model concrete: given per-unit-length
R, L, G, C and angular frequency ω, compute the (complex, generally lossy)
characteristic impedance Z₀, the propagation constant γ = α + jβ, the lossless
phase velocity, and whether the line satisfies the Heaviside distortionless
condition. A frequency sweep shows |Z₀| and phase(Z₀) flattening toward the
distortionless/lossless limit, with a lossy-vs-lossless Z₀ readout for contrast.

## Scope

### In scope

- Distributed LGC model: per-unit-length R (Ω/m), L (H/m), G (S/m), C (F/m).
- Characteristic impedance `Z₀ = sqrt((R + jωL)/(G + jωC))` — complex for lossy line.
- Propagation constant `γ = sqrt((R + jωL)(G + jωC))`; `α = Re(γ)`, `β = Im(γ)`.
- Lossless phase velocity `v = 1/sqrt(LC)` (reference readout) and lossy phase
  velocity `v = ω/β` from γ at the selected frequency.
- Distortionless (Heaviside) condition: `R/L = G/C` → `α = sqrt(RG)`,
  `β = ω·sqrt(LC)`, `Z₀ = sqrt(L/C)` (real, frequency-independent).
- Lossless special case: `R = G = 0` → `Z₀ = sqrt(L/C)`, `v = 1/sqrt(LC)`, `α = 0`.
- Sweep: |Z₀| and phase(Z₀) vs frequency (two single-axis plots).

### Out of scope (ponytail)

- Reflection Γ, input impedance Zin, SWR, λ/4 transformer — owned by `tl-input-impedance` and the foundation `tl.ts` reflection helpers. `// ponytail: this module computes Z₀/γ; reflection algebra is a downstream module`.
- Frequency-dependent LGC (dispersive dielectric). `// ponytail: constant LGC`.
- Skin-effect/proximity-effect variation of R with frequency (R is a slider, user varies it manually).
- Non-TEM lines, waveguide modes — `waveguides` module.
- Skin depth / intrinsic impedance of free space — `em-waves` module.

## Foundation dependency

The outline lists `tl.ts` (foundation) as a dependency. In practice `tl.ts`
exports reflection/input-Z primitives (`zToGamma`, `gammaToZ`, `swr`,
`zinLossless`, `quarterWaveZ`) that all take Z₀ as an *input*. This module
*produces* Z₀/γ from LGC — it is upstream of those helpers, not a consumer.
**No import of `tl.ts` is needed.** `// ponytail: self-contained on complex.ts;
tl.ts reflection helpers are downstream consumers of Z₀`. The module may
therefore run in parallel with the foundation plan; it only requires
`complex.ts` (already present from the Elektronica1B foundation).

## Requirements

### R1 — Inputs

- `R` slider (0–2 Ω/m, step 0.001; default 0).
- `L` slider (100–500 nH/m, step 1; default 250 → 250e-9 H/m).
- `G` slider (0–2 mS/m, step 0.001; default 0 → 0 S/m).
- `C` slider (50–200 pF/m, step 1; default 100 → 100e-12 F/m).
- `f0` slider (1–1000 MHz, step 1; default 100) — readout frequency.

> Defaults reproduce a 50 Ω lossless coax-like line: `sqrt(250e-9/100e-12) = 50`,
> `v = 1/sqrt(LC) = 2e8 m/s`. Dialing R and G up shows lossy departure.

### R2 — Readouts (3 sig figs)

At `f0`:
- `Z₀` = `re ± j·im` Ω, with `|Z₀| ∠ φ°`.
- `α` (Np/m), `β` (rad/m).
- `v_phase = ω/β` (m/s, lossy) and `v_lossless = 1/sqrt(LC)` (reference).
- `Z₀_lossless = sqrt(L/C)` (reference, real).
- `distortionless?` yes/no (from `isDistortionless`).

### R3 — Plot

Two `linePlot`s stacked (top: `|Z₀|` vs f in MHz; bottom: `phase(Z₀)°` vs f),
log-spaced 1 MHz–1 GHz, 60 points. `// ponytail: two single-axis plots over one
shared-axis plot; avoids Ω/° axis clash for barely more code`.

### R4 — Error handling

`β = 0` (degenerate, e.g. C = 0) → `v_phase` readout shows `—` (guard, no throw).
`L = 0` or `C = 0` → `phaseVelocity` / `losslessZ0` would divide by zero; sliders
floored above 0 prevent this without extra code.

## Math / code layout

`src/math/tlfundamentals.ts` (imports `complex.ts` only):

```
num   = R + jωL
den   = G + jωC
Z₀    = sqrt(num / den)                      # complex
γ     = sqrt(num · den)  = α + jβ            # α=Re, β=Im
v     = 1/sqrt(LC)                           # lossless
Z₀_ll = sqrt(L/C)                            # lossless, real
distortionless ⟺ R/L = G/C                  # rel. tol 1e-6
```

- `characteristicImpedance(R, L, G, C, omega) -> Complex`
- `propagationConstant(R, L, G, C, omega) -> { alpha, beta, gamma }`
- `phaseVelocity(L, C) -> number` (lossless reference)
- `isDistortionless(R, L, G, C) -> boolean`
- `losslessZ0(L, C) -> number`
- Local `csqrt(z)` helper — `complex.ts` lacks a complex sqrt. `// ponytail:
  local csqrt; promote to complex.ts if a third caller appears`.

- `src/modules/tl-fundamentals/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/tlfundamentals.test.ts` — concrete expected values (verified by hand):

- `losslessZ0(250e-9, 100e-12)` → `50` (Ω). `sqrt(2500)`.
- `characteristicImpedance(0, 250e-9, 0, 100e-12, 1e9)` → `{re: 50, im: 0}`
  (lossless, Z₀ real).
- `phaseVelocity(250e-9, 100e-12)` → `2e8` (m/s). `1/sqrt(2.5e-17) = 1/(5e-9)`.
- `propagationConstant(0, 250e-9, 0, 100e-12, 1e9)` → `{alpha: 0, beta: 5}`.
  Lossless `γ = jω·sqrt(LC) = j·1e9·5e-9 = j5`.
- `isDistortionless(2.5e-3, 250e-9, 1e-6, 100e-12)` → `true`. `R/L = 1e4 = G/C`.
- `isDistortionless(1e-3, 250e-9, 1e-6, 100e-12)` → `false`. `R/L=4e3 ≠ G/C=1e4`.
- Distortionless line at `ω=1e9`: `characteristicImpedance(2.5e-3, 250e-9, 1e-6,
  100e-12, 1e9)` → `{re: 50, im: 0}` (Z₀ real, = sqrt(L/C)). And
  `propagationConstant(...same...)` → `{alpha: 5e-5, beta: 5}`. `α=sqrt(RG)=sqrt(2.5e-9)=5e-5`,
  `β=ω·sqrt(LC)=5` (same as lossless — the point of distortionless).
- Lossy (not distortionless): `characteristicImpedance(10, 250e-9, 0, 100e-12,
  1e9)` → `re ≈ 50.01`, `im ≈ -1.00` (within 0.02). `Z₀² = 2500 - j100`.
- Registry smoke: `tl-fundamentals` present with `course = Hoogfrequenttechniek`.

## UI/UX

- Inputs → two plots (stacked) → readouts. Icon: `Z₀`.
- Card description: "Distributed LGC line: Z₀, γ=α+jβ, phase velocity, distortionless condition."

## Ponytail simplifications

- No `tl.ts` import — this module produces Z₀/γ; `tl.ts` reflection helpers consume
  Z₀. `// ponytail: self-contained on complex.ts`.
- Constant LGC (no dispersive dielectric). `// ponytail: constant LGC`.
- Two single-axis plots over a shared-axis combined plot (Ω/° clash).
- Local `csqrt` rather than promoting to `complex.ts` now (one caller).

## Future work

- Feed Z₀ into `tl.ts` reflection helpers for a combined Z₀ + Γ view (once
  `tl-input-impedance` lands).
- Frequency-dependent R(f) for skin effect (R ∝ sqrt(f) on a real conductor).
- Surface-wave / non-TEM corrections (move to `waveguides`).
