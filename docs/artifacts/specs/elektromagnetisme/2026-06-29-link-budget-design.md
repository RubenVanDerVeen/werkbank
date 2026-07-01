# Link Budget & Radar Equation — Module Design

- **Module ID:** `link-budget`
- **Course:** Antennes
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make the Friis transmission link and the monostatic radar equation concrete:
given a transmit power, antenna gains, frequency, and range, compute EIRP,
free-space path loss (FSPL), received power `Pr`, and the fade margin against a
receiver sensitivity. A sweep plot shows `Pr` (dBm) vs distance `R` on a
log-spaced axis, so the 1/R² (link) and 1/R⁴ (radar) falloffs are visible.

## Scope

### In scope

- Friis transmission equation: `Pr = Pt·Gt·Gr·(λ/(4πR))²` (W).
- EIRP: `Pt·Gt` (W) ⇔ `Pt(dBW) + Gt(dB)`.
- Free-space path loss: `L = 20·log10(4πR·f/c)` dB (vacuum, no absorption).
- Received power in dB: `Pr(dBm) = Pt(dBm) + Gt(dB) + Gr(dB) − FSPL(dB)`.
- Radar equation (monostatic, `Gt = Gr = G`):
  `Pr = Pt·G²·σ·λ² / ((4π)³·R⁴)` (W), `σ` = radar cross-section.
- Fade margin: `Pr(dBm) − sensitivity(dBm)`.
- Mode select: `link` (Friis) | `radar` (radar equation).
- Sweep: `Pr` (dBm) vs `R` over `0.01…100 km`, log-spaced samples.

### Out of scope (ponytail)

- Atmospheric/gaseous/rain absorption; foliage/building penetration.
  `// ponytail: vacuum FSPL only; loss budget is a later module`.
- Antenna radiation patterns / pointing loss. Gains are scalar `dBi`.
  `// ponytail: scalar gains, no pattern integration`.
- Atmospheric refraction / earth-curvature / multipath fading models.
  `// ponytail: free-space only; fade margin is a single scalar, not a statistical distribution`.
- Bistatic radar (`Gt ≠ Gr`, separate TX/RX range). Monostatic only.
- Bandwidth / noise figure / SNR (sensitivity slider is a fixed threshold).

## Requirements

### R1 — Inputs

- `mode` selector: `link` | `radar` (default `link`).
- `Pt` slider, transmit power in dBm: −20…60, step 1, default 10 (10 mW).
- `Gt` slider, TX gain in dBi: 0…30, step 0.5, default 0.
- `Gr` slider, RX gain in dBi: 0…30, step 0.5, default 0. (ignored in radar mode)
- `f` slider, frequency in MHz: 100…6000, step 10, default 2400 (2.4 GHz ISM).
- `R` slider, range in km: 0.01…100, step 0.01, default 1.
- `σ` slider, radar cross-section in m²: 0.001…100, step 0.001, default 1. (radar only)
- `Rx sens` slider, receiver sensitivity in dBm: −130…−60, step 1, default −100.

### R2 — Readouts (3 sig figs for linear, 2 dp for dB)

- `EIRP`: W and dBW.
- `FSPL`: dB.
- `Pr`: W and dBm.
- `Fade margin`: dB, with `(link OK)` if ≥ 0, else `(link FAIL)`.
- **Link waterfall:** `Pt → +Gt → +Gr → −FSPL → Pr` (dBm). Radar mode shows the
  radar-equation one-liner instead (no fake waterfall).

### R3 — Plot

`linePlot`: single series `Pr (dBm)` vs `R (km)` over `0.01…100 km`, 60
log-spaced points. X axis linear (log-spaced samples), Y axis `Pr (dBm)`.

### R4 — Error handling

`R ≤ 0`, `f ≤ 0`, `λ ≤ 0` → throw `Error('range/frequency must be positive')`.
`Pt < 0` W is allowed (just very small). Division by zero is impossible given the
guards, but `Math.log10` of a non-positive `Pr` yields `NaN`; the readout prints
`NaN` rather than crashing.

## Math / code layout

`src/math/linkbudget.ts`:

```
C       = 2.99792458e8         // speed of light, m/s
λOf(f)  = C / f                // vacuum wavelength
eirp(pt, gt)                   = pt · gt                         [W]
friis(pt, gt, gr, λ, R)        = pt·gt·gr·(λ/(4πR))²             [W]
fspl(R, f)                     = 20·log10(4π·R·f / C)            [dB]
friisDbm(ptDbm, gtDb, grDb, R, f) = ptDbm + gtDb + grDb − fspl(R,f)  [dBm]
radarEq(pt, G, σ, λ, R)        = pt·G²·σ·λ² / ((4π)³·R⁴)         [W]
fadeMargin(prDbm, sensDbm)     = prDbm − sensDbm                 [dB]
```

- `src/math/linkbudget.ts` — pure functions, no DOM.
- `src/modules/link-budget/module.ts` — UI: sliders + `linePlot` + readouts.
- One import line appended in `src/registry.ts`.

## Tests

`tests/math/linkbudget.test.ts`:

- `eirp(1, 100)` → `100` W (i.e. 20 dBW). tol 1e-9.
- `fspl(1000, 2.4e9)` → `≈ 100.0` dB. tol 0.1.
- `fspl` algebraic identity: `fspl(R, f)` equals `20·log10(4π·R·f / C)` to 1e-9.
- `friisDbm(0, 0, 0, 1000, 2.4e9)` → `≈ −100` dBm (Pt=1 mW, 0 dBi both ends, 1 km @ 2.4 GHz). tol 0.1.
- `friis` (W) cross-checks `friisDbm` (dBm): `10·log10(friis(1e-3,1,1,λ,1000)/1e-3)` ≈ `friisDbm(0,0,0,1000,2.4e9)` where `λ = λOf(2.4e9)`. tol 1e-6.
- `radarEq(1000, 1000, 1, 0.03, 10000)` → `≈ 4.5354e-14` W (1 kW, G=1000/30 dB, σ=1 m², λ=0.03 m / 10 GHz, R=10 km). tol 1e-15.
- `fadeMargin(−80, −100)` → `20` dB; `fadeMargin(−110, −100)` → `−10` dB. tol 1e-9.
- Registry smoke: `link-budget` present with `course = Antennes`.

Reference hand-calc (sanity):
- λ at 2.4 GHz = `C/f` = 0.12491 m; `4π·R·f/C = 4π·1000·2.4e9/2.998e8 ≈ 1.006e5`; `20·log10 ≈ 100.05` dB.
- Radar: `num = 1000·1e6·1·9e-4 = 9e5`; `den = (4π)³·1e16 ≈ 1.9844e19`; `Pr ≈ 4.5354e-14` W ⇔ `−103.4` dBm.

## UI/UX

- Inputs → plot → readouts. Icon: `⌖`.
- Card description: "Friis link budget, EIRP, FSPL, radar equation, fade margin: received power vs distance."
- Sliders for Pt/Gt/Gr/f/R/σ + Rx sensitivity + mode select.
- Mode `link`: Gr slider active, σ ignored, waterfall readout shown.
- Mode `radar`: σ active, Gr ignored, radar-equation one-liner readout; Pr drops
  40 dB/decade with R (visible on sweep vs 20 dB/decade for link).

## Ponytail simplifications

- Vacuum FSPL, no atmospheric/multipath losses. `// ponytail: vacuum FSPL`.
- Scalar `dBi` gains, no pattern/pointing. `// ponytail: scalar gains`.
- Fade margin is a single scalar threshold, not a statistical fade model.
  `// ponytail: scalar sensitivity, no Rayleigh/Rician`.
- Plot X axis is linear with log-spaced samples (no true uPlot log axis).
  `// ponytail: linear axis, log-spaced points`.
- Monostatic radar only (`Gt = Gr = G`). `// ponytail: monostatic`.

## Future work

- Atmospheric absorption (ITU-R P.676 gaseous, P.838 rain) added to FSPL.
- Statistical fade margin (Rayleigh/Rician/lognormal) → outage probability.
- Bistatic radar geometry (`Gt ≠ Gr`, `Rt ≠ Rr`).
- Noise figure + bandwidth → SNR-based sensitivity instead of fixed threshold.
- True log-x axis (uPlot plugin or custom SVG plot).
