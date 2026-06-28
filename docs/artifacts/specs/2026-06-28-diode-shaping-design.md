# Diode Wave-Shaping — Module Design

- **Module ID:** `diode-shaping`
- **Course:** Elektronica1A
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Visualize how diode circuits reshape a time-varying input: clippers, clampers, and rectifiers. The student sees the input waveform and the output waveform on the same time axis, with key values (Vpeak, Vavg, Vripple) read out. The pedagogical payoff is *seeing* the diode's effect rather than algebra-ing it out.

## Scope

### In scope

- Five canonical topologies, selected by dropdown:
  1. **Series clipper** (positive peaks clipped at Vγ)
  2. **Biased shunt clipper** (clips above an adjustable Vbias)
  3. **Positive clamper** (adds DC so the most-negative peak sits at 0 V)
  4. **Half-wave rectifier** with resistive load
  5. **Peak rectifier** (half-wave + C-smoothing + R-load)
- Ideal diode model with adjustable constant Vγ (default 0.7 V). No Shockley equation.
- Sinusoidal input, adjustable amplitude and frequency.
- Two overlaid waveforms on one time axis: `v_in(t)` and `v_out(t)`.
- Readouts: Vpeak(out), Vavg (over one cycle), Vripple (peak-to-peak, peak-rectifier only).

### Out of scope (ponytail)

- Shockley exponential model. Constant Vγ is what the intro course uses. `// ponytail: constant Vγ, add Shockley when non-ideal region matters`.
- Full-wave bridge / center-tapped. Half-wave is the canonical starting topology; full-wave is a follow-on. Add when exam-prep demands it.
- Multi-diode clippers (e.g. two-diode slicer). Out for v1.
- Piecewise-linear diode with rd. Add as a toggle later.
- Non-sinusoidal inputs (square, triangle). Sinusoid covers the pedagogical core.
- Diode capacitance / reverse recovery. High-frequency phenomena, out of scope.

## Requirements

### R1 — Topology selector

`selectWave`-style dropdown with options: `series-clipper`, `biased-shunt-clipper`, `positive-clamper`, `half-wave-rect`, `peak-rect`. Default `series-clipper`.

### R2 — Inputs

| Input        | Range        | Default | Topologies                                          |
|--------------|--------------|---------|-----------------------------------------------------|
| `topology`   | (5 options)  | series  | All                                                 |
| `Vpeak_in`   | 1–20 V       | 10      | All                                                 |
| `f`          | 10–1000 Hz   | 50      | All                                                 |
| `Vγ`         | 0.3–0.9 V    | 0.7     | All (diode drop)                                    |
| `Vbias`      | 0–15 V       | 3       | biased-shunt-clipper only                           |
| `R`          | 0.1–100 kΩ   | 10      | clipper variants, half-wave-rect, peak-rect         |
| `C`          | 1–1000 µF    | 100     | positive-clamper, peak-rect                         |

Hidden inputs are not rendered when their topology doesn't use them.

### R3 — Readouts

Live, 3 significant figures:

- `Vpeak_out` (V) — maximum of v_out over one cycle.
- `Vavg` (V) — mean of v_out over one cycle.
- `Vripple_pp` (V) — peak-to-peak ripple (peak-rect only; hidden otherwise).

### R4 — Plot

A `linePlot` with two series on the same axes:

- `v_in(t)` — solid, palette color 0.
- `v_out(t)` — solid, palette color 1.
- x = time, two full cycles (so the periodicity is visible). 1000 samples per cycle.
- For the clamper, the input trace is shifted by the computed clamp offset so the user *sees* the level shift, not just the output.

### R5 — Waveform computation

For each topology, a pure function `shape(topology, params, tArray) -> { vin, vout }` computes the samples. Diode logic is explicit per-topology (no generic diode network solver — five hand-coded cases, ~10 lines each). `// ponytail: per-topology hand-coded diode logic, not a generic diode network solver`.

- `series-clipper`: vout = vin if vin > Vγ, else 0.
- `biased-shunt-clipper`: vout = min(vin, Vbias + Vγ). (Diode conducts when vin > Vbias + Vγ, clamping vout to that level.)
- `positive-clamper`: first cycle charges C to Vpeak_in - Vγ; subsequent cycles vout = vin + (Vpeak_in - Vγ). The simulation runs for 2 cycles; the first-cycle transient is shown.
- `half-wave-rect`: vout = max(vin - Vγ, 0).
- `peak-rect`: track capacitor voltage; on each input peak above `vcap + Vγ`, vcap charges to `vin - Vγ`; between peaks vcap decays as `vcap·exp(-t/(RC))`. Sample-by-sample integration with dt = T/1000.

### R6 — Error handling

If `R = 0` in peak-rect (would make the decay time constant zero), the readout shows `error: R must be > 0`. No exceptions escape `render`.

## Math / code layout

- `src/math/diode.ts` — pure functions:
  - `shape(topology, params, tArray) -> { vin: number[], vout: number[] }`
  - `metrics(vout, dt) -> { Vpeak_out, Vavg, Vripple_pp }`
- `src/modules/diode-shaping/module.ts` — UI, wiring, plot.
- One import line added to `src/registry.ts`.

## Tests

`tests/diode.test.ts`:

- `series-clipper`, Vpeak=10, Vγ=0.7: `Vpeak_out = 10`, `Vavg ≈ 2.81 V` (half-wave of (10·sin - 0.7) clipped at 0).
- `half-wave-rect`, Vpeak=10, Vγ=0.7: `Vavg ≈ 2.91 V` (textbook half-wave minus diode drop).
- `peak-rect`, Vpeak=10, Vγ=0.7, R=10k, C=100µF, f=50Hz: `Vripple_pp < 1 V` (sanity bound, not exact — the exact value depends on the integration).
- `positive-clamper`, Vpeak=10, Vγ=0.7: at t = T/2 (negative peak of vin), vout ≈ -Vγ (≈ -0.7 V). At t = 3T/4 (positive peak), vout ≈ 2·Vpeak - Vγ (≈ 19.3 V).
- Registry smoke test.

## UI/UX

- Layout: inputs column → plot → readouts. Same vertical flow as other modules.
- Topology dropdown at the top (most prominent — it changes the circuit).
- Icon: a diode schematic glyph `▶|` (two chars, fits card-icon pattern).
- Card description: "Clippers, clampers, rectifiers — see the waveform reshape."

## Ponytail simplifications

- Constant Vγ, not Shockley. `// ponytail: constant Vγ, add Shockley when non-ideal region matters`.
- Five hand-coded topology functions, no generic diode network solver. `// ponytail: per-topology logic, a generic solver is YAGNI for five cases`.
- Half-wave only; full-wave bridge out for v1. `// ponytail: half-wave is canonical, add bridge when exam prep needs it`.
- Sinusoidal input only. `// ponytail: sine only; square/triangle is a future toggle`.

## Future work (not in this spec)

- Full-wave bridge and center-tapped rectifiers.
- Shockley exponential diode model (toggle).
- Multi-diiple clippers (slicer, double-ended clipper).
- Square / triangle / arbitrary input waveform.
- Reverse-recovery / junction-capacitance effects for high-frequency work.
