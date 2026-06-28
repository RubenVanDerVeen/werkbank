# Op-Amp Circuits — Module Design

- **Module ID:** `opamp`
- **Course:** Elektronica1A
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Calculator for the standard ideal-op-amp configurations. Shows the closed-form gain, the input/output impedance, and a transfer characteristic (Vout vs Vin) that includes the saturation at ±Vcc. The pedagogical payoff is seeing the linear region bounded by the supply rails — the one thing the ideal-formula `Av = -Rf/R1` hides.

## Scope

### In scope

- Five configurations, selected by dropdown:
  1. **Inverting** (R1, Rf)
  2. **Non-inverting** (R1, R2 = Rg)
  3. **Voltage follower** (no resistors)
  4. **Summing** (inverting, 2 inputs with independent R1, R2, common Rf)
  5. **Difference** (R1, R2, R3, R4)
- Ideal op-amp model: A = ∞, Zin = ∞, Zout = 0. Saturation modeled as a hard clip at ±Vcc.
- Transfer characteristic plot: Vout vs Vin (or, for summing/difference, Vout vs V1 with V2 fixed).
- Readouts: Av (or the transfer expression), Zin, Vout at the current Vin.
- Saturation indicator: a readout that says `linear` or `saturated (+)` / `saturated (-)`.

### Out of scope (ponytail)

- Non-ideal op-amp effects: finite GBW, slew rate, offset voltage, bias currents, noise. A whole other module's worth; add a `opamp-nonideal` module if the course goes there.
- Active filters (integrator, differentiator, Sallen-Key). Frequency-domain; belongs with `transfer-fn` or its own module.
- Instrumentation amplifier. Three-op-amp composite; add when exam-prep needs it.
- Oscillators / comparators / Schmitt trigger. Different op-amp application class.
- Multiple inputs beyond 2 for the summing amplifier. Two inputs covers the pedagogical concept.

## Requirements

### R1 — Configuration selector

`selectWave`-style dropdown with options: `inverting`, `non-inverting`, `follower`, `summing`, `difference`. Default `inverting`.

### R2 — Inputs

Resistor inputs shown/hidden based on configuration. Each is a slider 0.1–1000 kΩ.

| Input   | Default | Configurations                                       |
|---------|---------|------------------------------------------------------|
| `config`| inverting | All                                                |
| `R1`    | 10 kΩ   | inverting, non-inverting (as Rg), summing (in1), difference (in1 & in2 share R1=R3) |
| `R2`    | 10 kΩ   | summing (in2), difference (R2=R4)                    |
| `Rf`    | 100 kΩ  | inverting, summing                                   |
| `Rg`    | 1 kΩ    | non-inverting                                        |
| `Vcc`   | 15 V    | All (supply rail; slider 5–24 V)                     |
| `Vin`   | 1 V     | All except summing/difference (those use V1, V2)     |
| `V1`    | 1 V     | summing, difference                                  |
| `V2`    | 0.5 V   | summing, difference                                  |

For `difference`, the matched-resistor case (R1=R3, R2=R4) is assumed; the slider exposes only R1 and R2. `// ponytail: matched-resistor difference amp only; general 4-resistor form adds no pedagogy`.

For `follower`, no resistor inputs are shown.

### R3 — Readouts

Live, 3 significant figures:

- `Av` (dimensionless) or, for summing/difference, the `Vout` expression as a string (e.g. `Vout = -Rf·(V1/R1 + V2/R2)`).
- `Vout` (V) — the actual output at the current Vin (or V1/V2), **after saturation**.
- `Zin` (kΩ) — ∞ for non-inverting/follower, R1 for inverting/summing, 2·R1 for difference (matched).
- `region` — `linear`, `saturated (+)`, or `saturated (-)` (colored badge: green / red / red).

### R4 — Plot

A `linePlot` with one series:

- x = Vin, range `-2·Vcc/|Av|` to `+2·Vcc/|Av|` (so the saturation knees are visible on both sides). For summing/difference, x = V1 with V2 fixed at its slider value; x range scaled similarly.
- y = Vout, with hard saturation at ±Vcc.
- The plot visually shows the linear region and the two saturation plateaus.

For the follower, Av = 1, so the x range is `-2·Vcc` to `+2·Vcc` and the saturation is the whole story.

### R5 — Saturation logic

`Vout_ideal = Av·Vin` (or the configuration's specific formula). `Vout = clamp(Vout_ideal, -Vcc, +Vcc)`. `region = linear` if `|Vout_ideal| < Vcc - ε` (ε = 1 mV), else `saturated (+)` or `saturated (-)`.

### R6 — Error handling

If `R1 = 0` in inverting (would divide by zero in `Av = -Rf/R1`), the readout shows `error: R1 must be > 0`. No exceptions escape `render`.

## Math / code layout

- `src/math/opamp.ts` — pure functions:
  - `analyze(config, params) -> { Av, Vout, Zin, region, transferExpr }`
  - `transfer(config, params, vinArray) -> { vout: number[] }` — vectorized form for the plot.
  - Formulas (ideal, before saturation):
    - inverting: `Av = -Rf/R1`, Zin = R1.
    - non-inverting: `Av = 1 + Rf/Rg` (where Rg is the ground-leg resistor), Zin = ∞.
    - follower: `Av = 1`, Zin = ∞.
    - summing: `Vout = -Rf·(V1/R1 + V2/R2)`, Zin (per input) = R1, R2.
    - difference (matched): `Vout = (R2/R1)·(V2 - V1)`, Zin = 2·R1.

- `src/modules/opamp/module.ts` — UI, wiring, plot.
- One import line added to `src/registry.ts`.

## Tests

`tests/opamp.test.ts`:

- Inverting, R1=10k, Rf=100k, Vcc=15, Vin=0.1: `Av = -10`, `Vout = -1.0`, `region = linear`.
- Inverting, Vin=2.0 (overdrive): `Vout = -15`, `region = saturated (-)`.
- Non-inverting, Rg=1k, Rf=9k: `Av = 10`.
- Follower, Vin=5: `Vout = 5`, `Av = 1`.
- Summing, R1=R2=10k, Rf=100k, V1=1, V2=0.5: `Vout = -15` (saturates at -Vcc since ideal is `-100·(1/10 + 0.5/10) = -15`); `region = saturated (-)` (edge case; ε handling makes this saturated).
- Difference, R1=10k, R2=100k, V1=0.1, V2=0.2: `Vout = +1.0` (gain 10, input diff 0.1).
- Registry smoke test: `opamp` appears with `course = Elektronica1A`.

## UI/UX

- Layout: inputs column → plot → readouts. Same vertical flow as other modules.
- Configuration dropdown at the top.
- Region badge colored: linear = `#3b6b4f` (green), saturated = `#6b3b4f` (red).
- Icon: `∞` (single char, evokes the ideal op-amp gain; fits card-icon pattern).
- Card description: "Ideal op-amp configurations with saturation-aware transfer curve."

## Ponytail simplifications

- Ideal op-amp only. `// ponytail: ideal A=∞, Zin=∞, Zout=0; non-ideal is a separate module`.
- Five configurations, not the full catalog. `// ponytail: five canonical configs, the rest are derivatives or different classes`.
- Matched-resistor difference amp (R1=R3, R2=R4) only. `// ponytail: matched form only, the 4-resistor general form adds no pedagogy`.
- Two-input summing, not n-input. `// ponytail: 2 inputs covers the concept, n-input is a slider away if ever needed`.
- Hard saturation clip, no softening near the rails. `// ponytail: hard clip, real op-amps soften but that's non-ideal modeling`.

## Future work (not in this spec)

- Non-ideal op-amp model (GBW, slew rate, Vos, Ib, noise) — likely a separate `opamp-nonideal` module.
- Active filters (integrator, differentiator, Sallen-Key) — frequency-domain, separate module.
- Instrumentation amplifier (3-op-amp composite).
- n-input summing amplifier.
- General 4-resistor difference amplifier.
- Comparator / Schmitt-trigger regimes (op-amp without feedback).
