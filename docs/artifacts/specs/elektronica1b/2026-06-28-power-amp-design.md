# Power Amplifiers (Class A/B/AB) — Module Design

- **Module ID:** `power-amp`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Compute output power, DC supply power, and efficiency for Class A (series-fed),
Class B push-pull, and Class AB output stages, and plot the transfer curve so the
Class B crossover deadzone is visible.

## Scope

### In scope

- **Class A (series-fed):** `Pout = Vp²/(2RL)`, `Pdc = Vcc·Icq`, `η = Pout/Pdc`,
  theoretical max `η = 25 %`.
- **Class B push-pull:** `Pout = Vp²/(2RL)`, `Pdc = 2·Vcc·Vp/(π·RL)`,
  `η = (π/4)·(Vp/Vcc)`, max `78.5 %`.
- **Class AB:** treated as Class B plus a small quiescent bias `Icq`
  (`Pdc = 2·Vcc·Vp/(π·RL) + Vcc·Icq`); crossover deadzone shrinks.
- Transfer-curve plot (Vin → Vout) showing crossover for B / clean for AB.

### Out of scope (ponytail)

- Transformer-coupled Class A `50 %` variant beyond a noted max. `// ponytail: series-fed Class A`.
- Thermal / SOA limits. `// ponytail: ideal devices`.
- Total harmonic distortion numbers. `// ponytail: qualitative crossover only`.

## Requirements

### R1 — Inputs

- `class` selector: `A` / `B` / `AB` (default `B`).
- `Vcc` (5–40 V, def 15), `Vp` (output peak, 0–Vcc, def 14), `RL` (1–100 Ω, def 8).
- `Icq` (0–500 mA, def 0) — used for Class A and AB.
- `Vbe` (0.4–0.8 V, def 0.7) — crossover half-width for the plot (B only).

### R2 — Readouts (3 sig figs)

- `Pout` (W), `Pdc` (W), `η` (%), and `η_max` for the chosen class.
- Device dissipation `Pdiss = Pdc − Pout` (total).

### R3 — Plot

`linePlot`: Vout vs Vin over `−Vcc…Vcc`. Class B shows the flat deadzone for
`|Vin| < Vbe`; Class AB shows almost none; Class A is linear (clipped at rails).

### R4 — Error handling

`RL = 0` or `Vp > Vcc` → `error: <reason>` (Vp clamped or flagged).

## Math / code layout

`src/math/poweramp.ts` (Vcc·A units consistent; RL in Ω, currents in A):

```
Class A:  Pout = Vp²/(2·RL); Pdc = Vcc·Icq; η = Pout/Pdc; ηmax = 0.25
Class B:  Pout = Vp²/(2·RL); Pdc = 2·Vcc·Vp/(π·RL); η = (π/4)·(Vp/Vcc); ηmax = 0.785
Class AB: Pout = Vp²/(2·RL); Pdc = 2·Vcc·Vp/(π·RL) + Vcc·Icq; η = Pout/Pdc
```

- `analyze(cls, {Vcc, Vp, RL, Icq}) -> { Pout_W, Pdc_W, eta, etaMax, Pdiss_W }`
- `transfer(cls, {Vcc, Vbe}, vin) -> vout` for the plot.
- `src/modules/power-amp/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/poweramp.test.ts`:

- Class B `Vcc=15, Vp=14, RL=8`: `Pout = 12.25 W`, `Pdc ≈ 16.71 W`,
  `η ≈ 0.733`, `η_max = 0.785`.
- Class A `Vcc=15, Vp=5, RL=8, Icq=0.9375A`: `Pout = 1.5625 W`,
  `Pdc ≈ 14.06 W`, `η ≈ 0.111`, `η_max = 0.25`.
- Class B `transfer` at `vin=0.5, Vbe=0.7` → `vout = 0` (in deadzone);
  at `vin=5` → `vout > 0`.
- Registry smoke: `power-amp` present with `course = Elektronica1B`.

## UI/UX

- Inputs → transfer plot → readouts. Icon: `Po`.
- Card description: "Class A/B/AB power stages: output power, efficiency, crossover."

## Ponytail simplifications

- Series-fed Class A only (transformer `50 %` noted, not modelled).
  `// ponytail: series-fed Class A`.
- Ideal devices, no thermal/SOA. `// ponytail: ideal devices`.

## Future work

- Transformer-coupled Class A.
- THD vs bias for Class AB.
