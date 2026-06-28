# FET Bias & Amplifiers — Module Design

- **Module ID:** `fet-amp`
- **Course:** Elektronica1A
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Interactive calculator for FET (MOSFET and JFET) small-signal amplifier analysis, parallel to `bjt-amp`. Shows gm, Av, Zin, Zout for the three FET configurations, with a sweep plot that exposes how bias current and source degeneration control the gain.

## Scope

### In scope

- Two device types, selectable: **n-channel MOSFET** (square-law, Kn, Vt) and **n-channel JFET** (IDSS, Vp).
- Three configurations: common-source (CS), common-drain (CD), common-gate (CG).
- Small-signal model: gm·vgs voltage-controlled current source; ro omitted (see ponytail).
- Bias current IDQ entered directly (mA) OR computed from a bias point dialog (VGS or VDS target). For v1, **direct IDQ entry only** — bias design belongs to a separate concern.
- Source-degeneration toggle (RS bypassed/unbypassed) for CS/CG.
- Sweep plot: Av vs IDQ, two curves overlaid (bypassed vs unbypassed RS); Av vs RL for CD (where gain is always ≈1 and the interesting curve is load-pull).

### Out of scope (ponytail)

- ro / output resistance of the FET. Add a `VA`-equivalent (lambda·IDQ) term when the course covers channel-length modulation.
- P-channel devices. Sign flip; add a toggle if needed.
- Bias-network design (voltage-divider, self-bias, current-source). IDQ is an input, not a derived quantity. Add a separate `fet-dc` module if needed.
- Frequency response / Bode. Lives in `transfer-fn`.
- Multi-stage. YAGNI for v1.
- Exact JFET square-law pinch-off model. We use the standard textbook square-law (ID = IDSS·(1 - VGS/Vp)²) which is itself an approximation; going deeper into the physics is out of scope.

## Requirements

### R1 — Device and configuration selectors

Two dropdowns:

- `device` — `MOSFET` / `JFET` (default MOSFET).
- `config` — `CS` / `CD` / `CG` (default CS).

Switching either re-renders inputs, readouts, and plot.

### R2 — Inputs

| Input       | Range             | Default | Devices   | Notes                                   |
|-------------|-------------------|---------|-----------|-----------------------------------------|
| `device`    | MOSFET / JFET     | MOSFET  | —         | Dropdown                                |
| `config`    | CS / CD / CG      | CS      | —         | Dropdown                                |
| `IDQ`       | 0.1–20 mA         | 2       | Both      | Slider (bias current, direct entry)     |
| `Kn`        | 0.1–10 mA/V²       | 1       | MOSFET    | Slider; hidden for JFET                 |
| `Vt`        | 0.5–5 V           | 2       | MOSFET    | Slider; hidden for JFET                 |
| `IDSS`      | 1–30 mA           | 10      | JFET      | Slider; hidden for MOSFET               |
| `Vp`        | -8 to -1 V        | -4      | JFET      | Slider; hidden for MOSFET               |
| `RD`        | 0–20 kΩ           | 5       | Both      | Slider                                  |
| `RS`        | 0–10 kΩ           | 1       | Both      | Slider; hidden/ignored for CD           |
| `RL`        | 0–100 kΩ          | 10      | Both      | Slider                                  |
| `Rs`        | 0–10 kΩ           | 1       | Both      | Slider (source resistance)              |
| `RG`        | 0–10 MΩ           | 1       | Both      | Slider (gate biasing resistor; Zin)     |
| `RSbyp`     | on / off          | on      | Both      | Toggle; only shown for CS/CG            |

### R3 — Readouts

Live, 3 significant figures:

- `gm` (mS) — `2·√(Kn·IDQ)` for MOSFET; `2·IDQ/|Vp|·√(IDSS/IDQ)` for JFET (equivalently `2/|VGS - Vp|·IDQ`; the implementation uses the form that avoids VGS as a separate input).
- `Av` (loaded, including Rs loading where applicable) — dimensionless
- `Ai` (loaded current gain) — dimensionless
- `Zin` (MΩ) — `RG` for all three (gate is open)
- `Zout` (kΩ) — `RD` for CS/CG; `(1/gm) ‖ RS` for CD

### R4 — Plot

A `linePlot` with two curves on the same axes:

- For CS/CG: x = IDQ (0.1–20 mA), y = Av. Two series: `RS bypassed` and `RS unbypassed`.
- For CD: x = RL (0–100 kΩ), y = Av. Single series; second slot empty.

### R5 — Error handling

If `IDQ = 0`, or MOSFET `IDQ > Kn·(VGS - Vt)²` is unsatisfiable for the entered Kn/Vt (the user enters an IDQ that would require |VGS - Vt| > some sensible bound), the readout shows `error: <reason>` and the plot is not redrawn.

## Math / code layout

- `src/math/fet.ts` — pure functions:
  - `gmMOSFET(Kn, IDQ) -> gm_mS` (= `2·√(Kn·IDQ)`)
  - `gmJFET(IDSS, Vp, IDQ) -> gm_mS` (= `2·IDQ / |Vp|·√(IDSS/IDQ)`)
  - `analyze(device, config, params) -> { Av, Ai, Zin, Zout }`
  - CS bypassed: `Av = -gm·(RD‖RL)`; Zin = RG; Zout = RD.
  - CS unbypassed: `Av = -gm·(RD‖RL) / (1 + gm·RS)`; Zin = RG; Zout = RD.
  - CG: `Av = +gm·(RD‖RL) / (1 + gm·RS)` (RS always present); Zin = `1/gm` (approx, RS unbypassed case); Zout = RD.
  - CD: `Av = gm·(RS‖RL) / (1 + gm·(RS‖RL))`; Zin = RG; Zout = `(1/gm) ‖ RS`.
  - Loaded forms including Rs are computed via nodal analysis (same approach as `bjt-amp`): 2-unknown linear solve on the small-signal equivalent.

- `src/modules/fet-amp/module.ts` — UI, wiring, plot. Mirrors `bjt-amp/module.ts` structure closely.
- One import line added to `src/registry.ts`.

### Implementation note

The `bjt-amp` and `fet-amp` modules both end up with a "2-node small-signal nodal solve + sweep plot" structure. The temptation is to factor out a shared helper now. **Don't.** Write `fet-amp` as a parallel implementation; if a clear shared abstraction emerges after both exist, factor it then. `// ponytail: parallel impl, not premature abstraction; factor when both modules show the shared shape`.

## Tests

`tests/fet.test.ts`:

- MOSFET CS bypassed, Kn=1, IDQ=2mA, RD=5k, RL=10k: `gm = 2.83 mS`, `Av ≈ -9.43`.
- MOSFET CS unbypassed, same plus RS=1k: `Av ≈ -2.43` (degeneration reduces gain by factor `1 + gm·RS ≈ 3.83`).
- JFET CS bypassed, IDSS=10, Vp=-4, IDQ=2mA, RD=5k, RL=10k: `gm ≈ 2.24 mS`, `Av ≈ -7.47`.
- MOSFET CD, IDQ=2mA, RS=2k, RL=10k: `Av ≈ 0.849`, `Zout ≈ 269 Ω`.
- MOSFET CG, IDQ=2mA, RS=1k, RD=5k, RL=10k: `Av ≈ +9.43`, `Zin ≈ 354 Ω`.
- Registry smoke test: `fet-amp` appears with `course = Elektronica1A`.

## UI/UX

- Layout: inputs column → plot → readouts. Same vertical flow as `bjt-amp`.
- Device and config dropdowns at the top.
- Icon: `gm` (two chars, fits card-icon pattern).
- Card description: "FET small-signal analysis for CS/CD/CG amplifiers (MOSFET & JFET)."

## Ponytail simplifications

- `ro` / channel-length modulation omitted. `// ponytail: ro omitted, add lambda·IDQ term when course covers it`.
- P-channel out. `// ponytail: n-channel only; P-channel is a sign flip, add toggle if needed`.
- Direct IDQ entry, no bias-network design. `// ponytail: IDQ is an input, bias design is a separate module if needed`.
- Parallel implementation to `bjt-amp`, no shared abstraction yet. `// ponytail: parallel impl, factor when both modules show the shared shape`.
- Standard textbook square-law for JFET, no deeper physics. `// ponytail: textbook square-law, the physics refinement is out of scope`.

## Future work (not in this spec)

- `ro` term (channel-length modulation).
- Bias-network design (voltage-divider, self-bias) — possibly a `fet-dc` module parallel to `bjt-dc`.
- P-channel toggle.
- Multi-stage FET amplifiers.
- Shared small-signal solver helper (extract after `bjt-amp` and `fet-amp` both stabilize).
