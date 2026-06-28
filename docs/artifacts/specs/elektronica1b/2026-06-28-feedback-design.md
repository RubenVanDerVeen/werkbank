# Negative-Feedback Topologies — Module Design

- **Module ID:** `feedback`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Make the four negative-feedback topologies concrete: given an open-loop gain `A`
and a feedback factor `β`, compute the loop gain `T = Aβ`, the closed-loop gain
`Af = A/(1+T)`, the desensitivity factor `D = 1+T`, and how each topology
multiplies or divides the input/output resistance. A sweep plot shows `Af` and
sensitivity vs `β`.

## Scope

### In scope

- Four topologies: `series-shunt` (voltage), `shunt-series` (current),
  `series-series` (transconductance), `shunt-shunt` (transresistance).
- `T = A·β`, `D = 1+T`, `Af = A/D`.
- Resistance modification per mixing/sampling:
  - series mixing → `Zin·D`; shunt mixing → `Zin/D`.
  - shunt sampling (voltage out) → `Zout/D`; series sampling (current out) → `Zout·D`.
- Sweep: `Af` vs `β`.

### Out of scope (ponytail)

- Loop stability / phase margin (frequency-dependent `A`). `// ponytail: scalar A; stability is a later module`.
- Non-ideal feedback-network loading on `A`. `// ponytail: ideal β network`.
- Distortion/noise reduction figures (mention only).

## Requirements

### R1 — Inputs

- `topology` selector: the four names above (default `series-shunt`).
- `A` slider (10–100000, log-ish steps; default 1000).
- `beta` slider (0–1, step 0.001; default 0.01).
- `Zin` (0.1–1000 kΩ, default 10), `Zout` (0.01–100 kΩ, default 2).

### R2 — Readouts (3 sig figs)

- `T`, `D`, `Af`, `AfDb`.
- `Zin_f`, `Zout_f` (with the ×/÷ direction shown).

### R3 — Plot

`linePlot`: `Af` vs `β` over `0…0.05`, single series — shows gain falling and
flattening as feedback increases.

### R4 — Error handling

`D = 0` (i.e. `T = -1`) → `error: 1+Aβ = 0 (oscillation)`.

## Math / code layout

`src/math/feedback.ts`:

```
T  = A·β
D  = 1+T
Af = A/D
Zin_f, Zout_f per table:
  series-shunt : Zin·D, Zout/D
  shunt-series : Zin/D, Zout·D
  series-series: Zin·D, Zout·D
  shunt-shunt  : Zin/D, Zout/D
```

- `analyze(topology, A, beta, Zin, Zout) -> { T, D, Af, AfDb, Zin_f, Zout_f, zinDir, zoutDir }`
- `src/modules/feedback/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/feedback.test.ts`:

- `series-shunt, A=1000, β=0.01, Zin=10k, Zout=2k`:
  `T=10`, `D=11`, `Af≈90.9`, `Zin_f=110k`, `Zout_f≈0.1818k`.
- `shunt-shunt` same numbers: `Zin_f≈0.909k`, `Zout_f≈0.1818k`.
- `series-series` same numbers: `Zin_f=110k`, `Zout_f=22k`.
- Registry smoke: `feedback` present with `course = Elektronica1B`.

## UI/UX

- Inputs → plot → readouts. Icon: `β`.
- Card description: "Negative-feedback topologies: loop gain, closed-loop gain, Zin/Zout impact."

## Ponytail simplifications

- Scalar `A`, no frequency/stability. `// ponytail: scalar A`.
- Ideal `β` network, no loading. `// ponytail: ideal β network`.

## Future work

- Frequency-dependent `A(jω)` → loop gain, phase margin (couple to foundation).
- β-network loading correction.
