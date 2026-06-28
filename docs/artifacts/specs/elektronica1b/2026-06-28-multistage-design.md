# Cascaded / Multistage Amplifier — Module Design

- **Module ID:** `multistage`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Show how a 2–3 stage cascade combines: each stage's gain is reduced by loading
from the next stage's input resistance, the overall gain is the product, and the
overall bandwidth shrinks below the narrowest stage. Bar/line readout of per-stage
loaded gains plus overall `Av` and `BW`.

## Scope

### In scope

- 2 or 3 stages, each described by `{Av0, Rin, Rout, fH}`.
- Inter-stage loading: stage `k` drives stage `k+1`'s `Rin`; the last stage drives
  `RL`. Loaded gain `Av_k = Av0_k · load/(Rout_k + load)`.
- Overall gain `Av = ∏ Av_k`.
- Overall bandwidth `BW = 1/√(Σ 1/fH_k²)` (root-sum-of-inverse-squares).

### Out of scope (ponytail)

- Low-frequency `fL` interaction. `// ponytail: high-end BW only for v1`.
- Identical-pole exact bandwidth-shrink factor `√(2^{1/n}−1)`; the RSS-inverse
  approximation is used for arbitrary, unequal `fH`. `// ponytail: RSS-inverse BW approx`.
- Input/output resistance of the whole cascade (could add later).

## Requirements

### R1 — Inputs

- `nStages` selector: `2` / `3` (default 2).
- Per stage `i`: `Av0_i` slider (−50…50), `Rin_i` (0.1–50 kΩ), `Rout_i`
  (0.1–50 kΩ), `fH_i` (0.01–100 MHz). Stage-3 inputs hidden when `nStages = 2`.
- `RL` (0.1–100 kΩ, default 2).

### R2 — Readouts (3 sig figs)

- Per-stage loaded gain `Av_k`.
- Overall `Av` and `AvDb`.
- Overall `BW` (Hz / MHz).

### R3 — Plot

`linePlot`: bars/markers of per-stage loaded gain vs stage index, plus a second
series of the unloaded `Av0` for comparison. (Reuse `linePlot`; no foundation
dependency.)

### R4 — Error handling

`Rout + load = 0` → readout `error: zero loading resistance`.

## Math / code layout

`src/math/multistage.ts`:

```
Av_k  = Av0_k · load_k/(Rout_k + load_k),  load_k = (k<last) ? Rin_{k+1} : RL
Av    = ∏ Av_k
BW    = 1/√(Σ 1/fH_k²)
```

- `analyze(stages, RL_kOhm) -> { AvTotal, AvTotalDb, BW_Hz, stageGains }`
- `src/modules/multistage/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/multistage.test.ts`:

- Two identical stages `Av0=-10, Rin=2k, Rout=5k, fH=1e6`, `RL=2k`:
  per-stage loaded `≈ -2.857`, `AvTotal ≈ 8.16`, `AvTotalDb ≈ 18.2`,
  `BW ≈ 7.07e5 Hz`.
- Registry smoke: `multistage` present with `course = Elektronica1B`.

## UI/UX

- Inputs → plot → readouts. Icon: `Πk` (or `xN`).
- Card description: "Cascaded amplifier: inter-stage loading, overall gain, bandwidth shrink."

## Ponytail simplifications

- High-end BW only. `// ponytail: high-end BW only`.
- RSS-inverse BW approximation. `// ponytail: BW = 1/√(Σ 1/fH²)`.

## Future work

- Cascade input/output resistance.
- Low-frequency corner interaction.
- Pull per-stage `fH` from the `freq-response` module.
