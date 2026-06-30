# Maxwell & Electromagnetic Induction — Module Design

- **Module ID:** `maxwell-induction`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make Faraday's law, Lenz's law, motional emf, self/mutual inductance, and the
displacement current concrete: given a time-varying `B` field through a coil,
compute the induced emf, plot `Φ(t)` and `emf(t)`, and read out `L`, `M`, and
`Id`. Maxwell's equations in integral form are shown as a static reference
display (not computed).

## Scope

### In scope

- Faraday's law: `emf = −N·dΦ/dt`, `Φ = B·A·cosθ` (uniform field, `A` and `θ`
  constant, only `B` varies).
- Motional emf: `emf = B·L·v`.
- Self-inductance: `L = N·Φ/I`.
- Mutual inductance: `M = N₂·Φ₂₁/I₁`.
- Displacement current: `Id = ε₀·dΦE/dt`.
- Time-series `Φ(t)` and `emf(t)` for sinusoidal `B(t) = B_peak·sin(2πft)`.
- Maxwell's equations integral form as static text readout.

### Out of scope (ponytail)

- Off-axis coil fields / non-uniform `B`. `// ponytail: uniform B through coil`.
- Reluctance-based `L` (covered by `magnetostatics` module).
- `B-H` curves / ferromagnetic saturation. `// ponytail: linear medium`.
- Differential-form Maxwell equations. `// ponytail: integral form only`.
- Capacitor geometry for `Id` — derived via EM-wave relation instead.

## Requirements

### R1 — Inputs

- `N` slider (1–1000 turns, step 1; default 100).
- `B` peak slider (0–5 T, step 0.01; default 0.5).
- `A` slider (0.001–0.1 m², step 0.001; default 0.01).
- `θ` slider (0–90 deg, step 1; default 0) — angle between `B` and coil normal.
- `f` slider (0.1–10 Hz, step 0.1; default 1) — frequency of `B` variation.

### R2 — Readouts (3 sig figs)

- `Φ peak` = `B·A·cosθ` (Wb).
- `emf peak` = `N·A·cosθ·B·2πf` (V).
- `emf rms` = `emf_peak / √2` (V).
- `L` = `N·Φ_peak / I_ref` (H), at `I_ref = 1 A`.
- `M` = `N₂·Φ₂₁ / I₁` (H), at `k = 1` (perfect coupling, `N₂ = N`, `Φ₂₁ = Φ_peak`).
- `Id` = `ε₀·dΦE/dt` (A), where `dΦE/dt = A·c·dB/dt_peak` (EM-wave relation
  `E = cB`). `// ponytail: EM-wave derivation; physical capacitor geometry is later`.
- Maxwell's equations (integral form) as static text block.

### R3 — Plot

`linePlot`: two series vs time over two periods (`tMax = 2/f`), 200 points:
- `Φ(t)` = `B_peak·sin(2πft)·A·cosθ` (Wb).
- `emf(t)` = `−N·A·cosθ·B_peak·2πf·cos(2πft)` (V).

### R4 — Error handling

`I = 0` → `selfInductance: I = 0`. `I₁ = 0` → `mutualInductance: I1 = 0`.
Slider ranges prevent `N ≤ 0`, `A ≤ 0`, `B < 0`, `f ≤ 0` at the UI level.

## Math / code layout

`src/math/induction.ts`:

```
EPS0 = 8.854187817e-12 F/m (vacuum permittivity)
C    = 299792458 m/s       (speed of light)

faradayEmf(N, B, A, theta, dBdt)        = -N·A·cos(theta)·dBdt
motionalEmf(B, L, v)                     = B·L·v
selfInductance(N, phi, I)                = N·phi / I       (throws if I=0)
mutualInductance(N2, phi21, I1)          = N2·phi21 / I1   (throws if I1=0)
displacementCurrent(eps0, dPhiE_dt)      = eps0·dPhiE_dt
inductionTimeSeries(N, Bpk, A, th, f, tMax, n) -> { phi: XY[], emf: XY[] }
  B(t)    = Bpk·sin(2πft)
  dB/dt   = Bpk·2πf·cos(2πft)
  Φ(t)    = B(t)·A·cos(th)
  emf(t)  = -N·A·cos(th)·dB/dt
```

- `src/modules/maxwell-induction/module.ts` — owns sliders, readouts, plot wiring.
- One import line in `src/registry.ts`.

## Tests

`tests/math/induction.test.ts` (relative tolerance 1e-9):

- `faradayEmf(100, 0.5, 0.01, 0, 2)` = `-2.0` V.
- `faradayEmf(100, 0.5, 0.01, π/2, 2)` ≈ `0` (flux perpendicular to normal).
- `motionalEmf(1, 0.5, 2)` = `1.0` V.
- `selfInductance(100, 0.05, 0.5)` = `10` H.
- `mutualInductance(200, 0.01, 0.2)` = `10` H.
- `displacementCurrent(8.854e-12, 1e12)` = `8.854` A.
- `inductionTimeSeries(100, 0.5, 0.01, 0, 1, 1, 100)`: at `t=0`,
  `phi[0].y = 0`, `emf[0].y = -π` (peak magnitude).
- `selfInductance(100, 0.05, 0)` throws `/I = 0/`.
- Registry smoke: `maxwell-induction` present with `course = Elektromagnetische Velden`.

## UI/UX

- Sliders → plot → readouts → Maxwell equations text block. Icon: `Φ`.
- Card description: "Faraday, Lenz, motional emf, self/mutual inductance, displacement current."

## Ponytail simplifications

- Uniform `B` through coil (no off-axis field). `// ponytail: uniform B`.
- `A` and `θ` constant (only `B` varies with time).
- `L` and `M` at `I_ref = 1 A` reference current. `// ponytail: reference current`.
- `M` with `k = 1` perfect coupling, `N₂ = N`. `// ponytail: k=1, N2=N`.
- `Id` via EM-wave relation `E = cB` (no capacitor geometry). `// ponytail: EM-wave Id`.
- Integral-form Maxwell as static text (no solver). `// ponytail: display only`.

## Future work

- Capacitor-geometry `Id` (plate area, separation, `dV/dt`).
- `k < 1` coupling coefficient slider for `M`.
- Non-sinusoidal `B(t)` waveforms (ramp, triangle, square).
- Differential-form Maxwell equations (curl operators).
- Live cursor on plot for instantaneous `emf(t)` readout.
