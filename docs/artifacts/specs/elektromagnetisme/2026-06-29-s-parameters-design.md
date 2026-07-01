# S-Parameters & Two-Port Networks — Design

- **Sub-project:** SP-11
- **Course:** Hoogfrequenttechniek
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Visualize two-port S-parameters: S11/S22 on the Smith chart, |S21|/|S11| in dB
vs frequency, and compute return loss, insertion loss, transducer gain, and
stability (Rollett K, |Δ|).

## Scope

### In scope

- `src/math/sparams.ts` — S→Z conversion, return/insertion loss, transducer
  gain, stability factor.
- `src/modules/s-parameters/module.ts` — sliders for S11/S21/S12/S22 (re/im),
  frequency; `smithChart` for S11/S22; `bodePlot` for |S21| dB; signal-flow-graph
  SVG; readouts.

### Out of scope (ponytail)

- S→ABCD, S→Y full conversion — Z conversion only, others are formula display.
  `// ponytail: S→Z only, ABCD/Y are readout formulas`.
- Noise figure, intermodulation — amplifier small-signal only.
- Multi-port (>2) S-parameters.

## Requirements

### R1 — S→Z conversion

`sToZ(s: SParams, z0: number): { Z11: Complex; Z12: Complex; Z21: Complex; Z22: Complex }`

Where `SParams = { S11: Complex; S21: Complex; S12: Complex; S22: Complex }`.

```
Z11 = Z₀·((1+S11)(1−S22) + S12·S21) / ((1−S11)(1−S22) − S12·S21)
Z12 = Z₀·(2·S12) / denominator
Z21 = Z₀·(2·S21) / denominator
Z22 = Z₀·((1−S11)(1+S22) + S12·S21) / denominator
```

denominator = `(1−S11)(1−S22) − S12·S21`

### R2 — Scalar metrics

- `returnLoss(s11: Complex): number` — `−20·log10(|S11|)`.
- `insertionLoss(s21: Complex): number` — `−20·log10(|S21|)`.
- `transducerGain(s21: Complex): number` — `10·log10(|S21|²)` (dB).

### R3 — Stability

`isStable(s: SParams): { K: number; delta: number; stable: boolean }`

- `delta = |S11·S22 − S12·S21|` (scalar magnitude).
- `K = (1 − |S11|² − |S22|² + |delta|²) / (2·|S12·S21|)`.
- `stable = K > 1 && |delta| < 1`.

### R4 — Module UI

- Sliders: S11 re/im, S21 re/im, S12 re/im, S22 re/im (all −1..1), Z₀
  (default 50), frequency range for the Bode plot.
- `smithChart`: plot S11 and S22 points (label "S11", "S22").
- `bodePlot`: |S21| dB and |S11| dB vs frequency. For a simple model, make
  S-params frequency-dependent via a single-pole low-pass: `S21(f) = S21₀ /
  (1 + j·f/fc)` with a slider for fc.
- `svgPlot`: simple signal-flow-graph — source node → a1 → [S] → b2 → load, with
  labeled S-params on the edges.
- Readouts: return loss, insertion loss, transducer gain, K, |Δ|, stable?

## Math / code layout

- `src/math/sparams.ts` — conversions + metrics (uses `complex.ts`).
- `src/modules/s-parameters/module.ts` — UI (uses `smithChart`, `bodePlot`,
  `svgPlot`).

## Tests

`tests/math/sparams.test.ts`:

- `returnLoss({0.2, 0})` → `14.0` dB (−20·log10(0.2) = 13.98).
- `insertionLoss({0.8, 0})` → `1.94` dB (−20·log10(0.8) = 1.938).
- `transducerGain({0.9, 0})` → `0.915` dB (10·log10(0.81) = 0.915).
- `sToZ({S11:{0,0}, S21:{1,0}, S12:{0,0}, S22:{0,0}}, 50)` → Z11=50, Z22=50,
  Z21=100, Z12=0 (ideal unilateral amplifier).
- `isStable` for S12=0 (unilateral) → stable (K=∞, delta=|S11·S22|).

## UI/UX

One card in the Hoogfrequenttechniek section. Layout: S-param sliders on left,
Smith chart + Bode plot + flow graph stacked on right, readouts below.

## Ponytail simplifications

- S→Z only, no S→Y/ABCD computation. `// ponytail: S→Z only, formulas for Y/ABCD`.
- Single-pole frequency model for S21. `// ponytail: single-pole S21(f)`.
- Flow graph is static SVG, not interactive. `// ponytail: static flow graph`.

## Future work

- Full S→Y, S→ABCD, S→T conversions.
- Noise circles, gain contours on Smith chart.
- Multi-port S-parameters.
