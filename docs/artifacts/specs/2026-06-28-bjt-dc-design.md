# BJT DC Bias & Operating Point — Module Design

- **Module ID:** `bjt-dc`
- **Course:** Elektronica1A
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Visual calculator for BJT DC bias analysis. Shows the Q-point (IC, VCE) and the DC load line overlaid on a stylized output-characteristics family, so a student can see how biasing resistors move the operating point relative to cutoff, active, and saturation regions.

## Scope

### In scope

- Three bias networks: fixed-bias, voltage-divider bias, emitter-feedback (collector-to-base feedback).
- Q-point computation: IC, VCE, IB, VCB (region indicator: cutoff / active / saturation).
- DC load line drawn on an SVG output-characteristics chart (IC vs VCE) with the Q-point marked.
- Saturation / cutoff boundaries drawn and labeled.
- Region indicator as a readout (`cutoff` / `active` / `saturation`).

### Out of scope (ponytail)

- Bias stability factors (S, S(β), S(VBE)). Useful but a separate concern; add when exam prep demands it.
- AC load line. Belongs with the `bjt-amp` module.
- Temperature sweep. Out of scope for a single-exam tool.
- PNP. NPN only for v1; PNP is a sign flip, add a toggle if needed.
- Exact output-characteristics curves from Ebers-Moll. We draw a *stylized* family (even-IB spacing) — the load line and Q-point are exact, the curves are pedagogical scaffolding.

## Requirements

### R1 — Bias network selector

Dropdown with three options: `fixed-bias`, `voltage-divider`, `emitter-feedback`. Switching changes which resistor inputs are shown.

### R2 — Inputs

| Input            | Range        | Default | Networks                              |
|------------------|--------------|---------|---------------------------------------|
| `network`        | (3 options) | fixed   | All                                   |
| `VCC`            | 5–25 V       | 12      | All                                   |
| `β`              | 50–300       | 100     | All                                   |
| `VBEon`          | 0.5–0.8 V    | 0.7     | All                                   |
| `VCEsat`         | 0.1–0.3 V    | 0.2     | All                                   |
| `RB`             | 50–2000 kΩ   | 470     | fixed-bias, emitter-feedback          |
| `RC`             | 0–20 kΩ      | 4       | All                                   |
| `RE`             | 0–10 kΩ      | 1       | voltage-divider, emitter-feedback     |
| `R1`             | 10–1000 kΩ   | 120     | voltage-divider                       |
| `R2`             | 1–500 kΩ     | 30      | voltage-divider                       |

Hidden inputs are not rendered (not just disabled) to keep the form uncluttered.

### R3 — Readouts

Live, 3 significant figures:

- `IB` (µA), `IC` (mA), `VCE` (V), `VCB` (V)
- `region` — one of `cutoff`, `active`, `saturation` (with a colored badge: grey / green / red)
- `load-line endpoints` — `(VCE=0, IC=VCC/(RC+RE))` and `(VCE=VCC, IC=0)`

### R4 — Plot

A custom SVG plot (using the existing `svgPlot` helper from `src/ui/plots.ts`):

- X axis: VCE, 0 to VCC.
- Y axis: IC, 0 to `VCC/(RC+RE)` plus a 10% headroom margin.
- Stylized output-characteristics family: 5 curves at IB = 5, 10, 20, 40, 80 µA (flat in the active region, knee into saturation at VCEsat). Curves are pedagogical, not derived from Ebers-Moll. `// ponytail: stylized curves, not Ebers-Moll; Q-point and load line are the exact part`.
- DC load line: straight line between the two endpoints.
- Q-point: filled circle at (VCE, IC), with coordinate label.

### R5 — Region detection

`region` is determined from VCE and VCB:

- `cutoff` — IB ≤ 0 (numerically, IB < 0.01 µA) or IC < 1 µA.
- `saturation` — VCB < 0 (equivalently VCE < VCEsat + VBEon, but the implementation uses VCB < 0 directly).
- `active` — otherwise.

### R6 — Error handling

If a resistor is 0 where it would divide by zero (e.g. RB=0 in fixed-bias), the readout shows `error: <reason>` and the plot is not redrawn.

## Math / code layout

- `src/math/bjt-dc.ts` — pure functions:
  - `bias(network, params) -> { IB, IC, VCE, VCB, region, loadLine: {iMax, vMax} }`
  - Fixed-bias: `IB = (VCC - VBEon)/RB`, `IC = β·IB`, `VCE = VCC - IC·RC`.
  - Voltage-divider: Thevenin `VB = VCC·R2/(R1+R2)`, `RB_th = R1‖R2`. `IE = (VB - VBEon)/RE`, `IC ≈ IE`, `VCE = VCC - IC·RC - IE·RE`.
  - Emitter-feedback: `IB = (VCC - VBEon - IE·RE)/RB` with `IE = (β+1)·IB`; solve iteratively (3 fixed-point iterations is enough for 0.1% accuracy; `// ponytail: 3 fixed-point iterations, exact closed form is cubic and not worth it`).

- `src/modules/bjt-dc/module.ts` — UI, wiring, SVG plot.
- One import line added to `src/registry.ts`.

## Tests

`tests/bjt-dc.test.ts`:

- Voltage-divider, VCC=12, R1=120k, R2=30k, RC=4k, RE=1k, β=100: `IC ≈ 1.91 mA`, `VCE ≈ 2.55 V`, `region = active`.
- Fixed-bias, VCC=12, RB=470k, RC=4k, β=100: `IC ≈ 2.39 mA`, `VCE ≈ 2.43 V`, `region = active`.
- Fixed-bias, β=300 (over-driven): `region = saturation`.
- Fixed-bias, RB=2000k (under-driven): `region = cutoff`.
- Registry smoke test: `bjt-dc` appears with `course = Elektronica1A`.

## UI/UX

- Layout: inputs column → readouts → SVG plot. Same vertical flow as other modules.
- Region badge colored: cutoff = `#888`, active = `#3b6b4f`, saturation = `#6b3b4f` (uses existing palette).
- Icon: `Q` (single char, fits card-icon pattern).
- Card description: "DC bias, Q-point and load line on the output characteristics."

## Ponytail simplifications

- Stylized output-characteristics, not Ebers-Moll. `// ponytail: stylized curves, the load line and Q-point are the exact part`.
- 3 fixed-point iterations for emitter-feedback. `// ponytail: 3 iterations, cubic closed form not worth it`.
- NPN only. `// ponytail: NPN only; PNP is a sign flip, add toggle if needed`.
- No bias-stability factors. `// ponytail: S/S(β)/S(VBE) skipped, add when exam prep demands it`.

## Future work (not in this spec)

- Bias stability factors (S = dIC/dICBO, S(β), S(VBE)).
- AC load line overlay (interacts with `bjt-amp`).
- Temperature sweep.
- PNP toggle.
