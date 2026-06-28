# BJT Small-Signal Amplifiers — Module Design

- **Module ID:** `bjt-amp`
- **Course:** Elektronica1A
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Interactive calculator for BJT small-signal amplifier analysis using the hybrid-π (rπ) model. Lets a student explore how β, IC, and emitter degeneration affect voltage gain, input impedance, and output impedance for the three single-stage configurations.

## Scope

### In scope

- Three configurations: common-emitter (CE), common-base (CB), common-collector / emitter follower (CC).
- Hybrid-π parameters: gm = IC/VT, rπ = β/gm.
- Mid-band analysis (coupling & bypass caps = AC shorts).
- Loaded gain (RC‖RL), biasing-network loading on Zin.
- Emitter-degeneration toggle (RE in or out of the AC path) for CE/CB.
- Single sweep plot: Av vs IC, with bypassed vs unbypassed RE overlaid (CE/CB); Av vs RL (CC).

### Out of scope (ponytail)

- Early voltage / ro (high-output-resistance regime). Add a `VA` input + `ro` term when the course covers it.
- Frequency response / Bode for the amplifier. Already covered by the existing `transfer-fn` module.
- Biasing design (Q-point setting). Belongs to the `bjt-dc` module.
- Multi-stage amplifiers. YAGNI for a single-exam study tool.
- Exact R1/R2 split. Single `RB = R1‖R2` input. Split when a voltage-divider bias quiz needs it.

## Requirements

### R1 — Configuration selector

The module exposes a `selectWave`-style dropdown with options `CE`, `CB`, `CC`. Switching it re-renders the readouts and plot without page reload.

### R2 — Inputs

| Input   | Range              | Default | Notes                                  |
|---------|--------------------|---------|----------------------------------------|
| `config`| CE / CB / CC       | CE      | Dropdown                               |
| `β`     | 50–300             | 100     | Slider                                 |
| `IC`    | 0.1–10 mA          | 1       | Slider                                 |
| `VT`    | 20–30 mV           | 25      | Slider                                 |
| `RC`    | 0–20 kΩ            | 5       | Slider                                 |
| `RE`    | 0–5 kΩ             | 0.5     | Slider; hidden/ignored for CC          |
| `RL`    | 0–100 kΩ           | 10      | Slider                                 |
| `Rs`    | 0–10 kΩ            | 1       | Slider (source resistance)             |
| `RB`    | 0–500 kΩ           | 50      | Slider (R1‖R2)                         |
| `REbyp` | on / off           | on      | Toggle; only shown for CE/CB           |

### R3 — Readouts

All numeric readouts update live on any input change, formatted to 3 significant figures with units:

- `gm` (mS), `rπ` (kΩ)
- `Av` (loaded, including Rs and RB loading where applicable) — dimensionless
- `Ai` (loaded current gain) — dimensionless
- `Zin_device` (kΩ) — looking into the base (CE/CC) or emitter (CB)
- `Zin` (kΩ) — including the biasing network `RB ‖ Zin_device`
- `Zout` (kΩ) — looking into the collector (CE/CB) or emitter (CC)

### R4 — Plot

A single `linePlot` showing two curves on the same axes:

- For CE/CB: x = IC (0.1–10 mA), y = Av. Two series: `RE bypassed` and `RE unbypassed`, using the current values of β, RC, RL, Rs, RB, RE.
- For CC: x = RL (0–100 kΩ), y = Av. Single series; CC has no bypass concept. The second series slot is left empty (plot still renders one curve).

### R5 — Error handling

If `IC = 0` or `VT = 0` (would divide by zero in `gm`), the readout area shows `error: gm undefined` and the plot is not redrawn. No exceptions escape `render`.

## Math / code layout

- `src/math/bjt.ts` — pure functions:
  - `hybridPi(beta, ICmA, VTmV) -> { gm_mS, rpi_kOhm }`
  - `analyze(config, params) -> { Av, Ai, Zin_device, Zin, Zout }`
  - Formula set (exact forms, standard textbook):
    - CE bypassed: `Av = -β·(RC‖RL) / [rπ + Rs·(1 + RB/rπ)]` (simplified loaded form; the `analyze` function uses the full nodal form, see implementation note below).
    - CE unbypassed: `Av = -β·(RC‖RL) / [rπ + (β+1)·RE]`
    - CB: `Av = +β·(RC‖RL) / [rπ + (β+1)·RE]` (RE always present; bypass toggle hidden)
    - CC: `Av = (β+1)·(RE‖RL) / [rπ + (β+1)·(RE‖RL)]`
  - `Zin_device`: CE/CC = `rπ + (β+1)·RE` (unbypassed) or `rπ` (bypassed); CB = `rπ/(β+1)`.
  - `Zout`: CE/CB = `RC`; CC = `(rπ + Rs)/(β+1) ‖ RE`.

- `src/modules/bjt-amp/module.ts` — UI, wiring, plot. Mirrors `pid-tuner/module.ts` structure.

- One import line added to `src/registry.ts`.

### Implementation note

The formulas above are the *loaded, full* forms used in `analyze`. The implementation will use nodal analysis on the small-signal equivalent circuit (2 unknowns: vb, vc) rather than the textbook closed forms, so the loading effects of Rs, RB, and RL fall out naturally. This is ~30 lines of linear algebra and avoids the special-case explosion of closed-form expressions for each loading combination.

## Tests

`tests/bjt.test.ts` using `node --test`, asserting `analyze` against textbook reference values to 3 significant figures:

- CE bypassed, β=100, IC=1mA, VT=25mV, RC=5k, RL=10k, Rs=0, RB=∞, RE=0: `Av ≈ -192`, `Zin_device ≈ 2.5 kΩ`.
- CE unbypassed, same but RE=500Ω: `Av ≈ -9.43`, `Zin_device ≈ 52.5 kΩ`.
- CC, β=100, IC=1mA, RE=1k, RL=10k, Rs=1k: `Av ≈ 0.976`, `Zout ≈ 35 Ω`.
- CB, β=100, IC=1mA, RE=500Ω, RC=5k, RL=10k: `Av ≈ +96.6`, `Zin_device ≈ 25 Ω`.

A registry smoke test confirms `bjt-amp` appears in `modules` with the right `id` and `course`.

## UI/UX

- Reuses `slider`, `selectWave` from `src/ui/inputs.ts`.
- Reuses `linePlot` from `src/ui/plots.ts`.
- Layout matches `pid-tuner`: inputs in a vertical column, plot below, readouts below the plot.
- Icon: `Av` (two chars, fits the existing card-icon pattern).
- Card description: "Hybrid-π small-signal analysis for CE/CB/CC amplifiers."

## Ponytail simplifications

- `ro` / Early voltage omitted. `// ponytail: ro omitted, add VA input when course covers Early effect`.
- Single `RB` input, not R1/R2. `// ponytail: RB = R1‖R2; split when bias-design quiz needs it`.
- Mid-band only. `// ponytail: coupling/bypass caps = AC short; freq response lives in transfer-fn module`.
- Nodal solver is hand-rolled 2×2, no matrix library. `// ponytail: 2×2 Cramer's rule; if a 3rd node ever needed, swap to a tiny linear-solve helper`.

## Future work (not in this spec)

- Add `VA` input → `ro = VA/IC` term in the nodal solver.
- Split `RB` into `R1`, `R2` for voltage-divider bias interaction.
- Cascade two stages and show overall Av with loading.
