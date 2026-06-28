# Sinusoidal Oscillators — Module Design

- **Module ID:** `oscillator`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Compute the oscillation frequency `f0` and the Barkhausen gain condition for the
three classic sinusoidal oscillators: Wien-bridge, RC phase-shift, and LC
(Colpitts / Hartley). A loop-gain magnitude/phase plot shows the frequency where
the phase condition is met.

## Scope

### In scope

- **Wien-bridge:** `f0 = 1/(2πRC)`, gain condition `Av ≥ 3`.
- **Phase-shift (3-section RC):** `f0 = 1/(2πRC√6)`, gain `|Av| ≥ 29`.
- **Colpitts:** `f0 = 1/(2π√(L·Cs))`, `Cs = C1C2/(C1+C2)`, gain `≥ C2/C1`.
- **Hartley:** `f0 = 1/(2π√((L1+L2)C))`, gain `≥ L2/L1`.
- Loop-gain Bode plot around `f0` (where used).

### Out of scope (ponytail)

- Amplitude stabilization (AGC, diode/thermistor limiting). `// ponytail: gain condition only`.
- Crystal oscillators. `// ponytail: RC/LC only`.
- Start-up transient simulation. `// ponytail: steady-state f0 + condition`.

## Requirements

### R1 — Inputs

- `type` selector: `Wien` / `Phase-shift` / `Colpitts` / `Hartley` (default `Wien`).
- `R`, `C` shown for Wien/Phase-shift (`R` 0.1–100 kΩ def 10; `C` 0.1–1000 nF def 10).
- `L`, `C1`, `C2` shown for Colpitts (`L` 0.01–100 mH def 1; `C` 0.1–1000 nF).
- `L1`, `L2`, `C` shown for Hartley.
- Irrelevant inputs hidden per type.

### R2 — Readouts (3 sig figs)

- `f0` (Hz / kHz).
- Required gain (`Av_min`) and, for Colpitts/Hartley, the C- or L-ratio.

### R3 — Plot

For Wien/Phase-shift: `bodePlot` of the feedback network `β(jω)` (or loop gain
with `Av_min`) over `f0/100 … f0·100`, marking the `f0` crossing. For LC types:
the magnitude peak near `f0` (optional; readouts are primary).

### R4 — Error handling

Non-positive `L`/`C` under the square root → `error: invalid L/C values`.

## Math / code layout

`src/math/oscillator.ts` (SI conversions inside):

```
Wien:        f0 = 1/(2π·R·C),            AvMin = 3
Phase-shift: f0 = 1/(2π·R·C·√6),         AvMin = 29
Colpitts:    Cs = C1·C2/(C1+C2); f0 = 1/(2π·√(L·Cs)); ratio = C2/C1
Hartley:     f0 = 1/(2π·√((L1+L2)·C));   ratio = L2/L1
```

- `analyze(type, params) -> { f0_Hz, AvMin, ratio? }`
- `betaPoints(type, R, C) -> {omega,magDb,phaseDeg}[]` for Wien/Phase-shift via
  `complex.ts` (Wien `β = 1/(3 + j(ωRC − 1/(ωRC)))`).
- `src/modules/oscillator/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/oscillator.test.ts`:

- Wien `R=10k, C=10nF`: `f0 ≈ 1591.5 Hz`, `AvMin = 3`.
- Phase-shift `R=10k, C=10nF`: `f0 ≈ 649.7 Hz`, `AvMin = 29`.
- Colpitts `L=1mH, C1=C2=10nF`: `Cs=5nF`, `f0 ≈ 71.18 kHz`.
- Hartley `L1=L2=1mH, C=10nF`: `f0 ≈ 35.59 kHz`.
- Registry smoke: `oscillator` present with `course = Elektronica1B`.

## UI/UX

- Inputs → plot → readouts. Icon: `~`.
- Card description: "Wien / phase-shift / Colpitts / Hartley oscillators: f0 and gain condition."

## Ponytail simplifications

- Gain condition only, no amplitude stabilization. `// ponytail: Barkhausen condition only`.
- RC/LC only, no crystal. `// ponytail: RC/LC types`.

## Future work

- Amplitude-stabilization network design.
- Crystal-oscillator type.
