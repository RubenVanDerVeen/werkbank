# Comparator & Schmitt Trigger — Module Design

- **Module ID:** `comparator`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Analyze an op-amp comparator with positive feedback (Schmitt trigger): the upper
and lower thresholds, the hysteresis width, and the hysteresis transfer loop, for
both inverting and non-inverting configurations.

## Scope

### In scope

- **Inverting Schmitt:** input to `V−`, divider `R1`/`R2` from output to `V+`
  (with reference `Vref` to ground through `R1`). Thresholds
  `VT± = Vref·R2/(R1+R2) ± Vsat·R1/(R1+R2)`. For `Vref=0`: `VT± = ±Vsat·R1/(R1+R2)`.
- **Non-inverting Schmitt:** input through `R1` to `V+`, divider to output.
  Thresholds `VT± = ∓Vsat·R1/R2` (with `Vref=0`).
- Hysteresis width `H = VT+ − VT−`.
- Hysteresis-loop transfer plot (two branches: rising and falling input).

### Out of scope (ponytail)

- Finite slew rate / propagation delay. `// ponytail: ideal instantaneous switching`.
- Asymmetric rails beyond `±Vsat` magnitude (single `Vsat` value).
  `// ponytail: symmetric ±Vsat`.
- Window comparators. `// ponytail: single-threshold Schmitt`.

## Requirements

### R1 — Inputs

- `config` selector: `Inverting` / `Non-inverting` (default `Inverting`).
- `R1` (0.1–100 kΩ, def 10), `R2` (0.1–100 kΩ, def 10).
- `Vsat` (1–18 V, def 12), `Vref` (−10…10 V, def 0).

### R2 — Readouts (3 sig figs)

- `VT+`, `VT−`, hysteresis `H`.

### R3 — Plot

`linePlot`: the hysteresis loop — Vout vs Vin, two series (input rising, input
falling), each switching at the respective threshold between `+Vsat` and `−Vsat`.

### R4 — Error handling

`R1+R2 = 0` (inverting) or `R2 = 0` (non-inverting) → `error: invalid divider`.

## Math / code layout

`src/math/schmitt.ts`:

```
Inverting:      k = R1/(R1+R2)
                VTp = Vref·R2/(R1+R2) + Vsat·k
                VTn = Vref·R2/(R1+R2) − Vsat·k
Non-inverting:  k = R1/R2
                VTp = (Vref·(R1+R2) ... )  → for Vref=0:  VTp = +Vsat·k, VTn = −Vsat·k
                (VT+ is the rising threshold; loop is non-inverting)
H = VTp − VTn
```

- `analyze(config, {R1, R2, Vsat, Vref}) -> { VTp, VTn, H }`
- `loop(config, params, n) -> { rising: XY, falling: XY }` for the plot.
- `src/modules/comparator/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/schmitt.test.ts`:

- Inverting `R1=R2=10k, Vsat=12, Vref=0`: `VT+ = +6 V`, `VT− = −6 V`, `H = 12 V`.
- Non-inverting `R1=10k, R2=20k, Vsat=12, Vref=0`: `VT+ = +6 V`, `VT− = −6 V`,
  `H = 12 V`.
- Inverting `Vref=2, R1=R2=10k, Vsat=12`: `VT+ = 1 + 6 = 7 V`, `VT− = 1 − 6 = −5 V`.
- Registry smoke: `comparator` present with `course = Elektronica1B`.

## UI/UX

- Inputs → loop plot → readouts. Icon: `⎍` (or `ST`).
- Card description: "Op-amp Schmitt trigger: thresholds, hysteresis, transfer loop."

## Ponytail simplifications

- Ideal instantaneous switching. `// ponytail: no slew/delay`.
- Symmetric `±Vsat`. `// ponytail: single Vsat magnitude`.

## Future work

- Asymmetric supply rails.
- Window comparator.
- 555-timer astable/monostable (related threshold circuit).
