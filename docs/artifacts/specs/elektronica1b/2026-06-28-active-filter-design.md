# Active Filters (Sallen-Key) — Module Design

- **Module ID:** `active-filter`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Build a 2nd-order Sallen-Key active filter (low-pass / high-pass) and a
multiple-feedback band-pass, show the corner/centre frequency `f0` and quality
factor `Q`, and plot the magnitude/phase Bode response from the transfer function.

## Scope

### In scope

- Unity-gain Sallen-Key **low-pass** and **high-pass** (2nd order).
- Multiple-feedback **band-pass** (2nd order).
- `f0` and `Q` from the R/C values.
- Transfer function assembled as a `Tf` and plotted via the foundation `bodePlot`.

### Out of scope (ponytail)

- Adjustable pass-band gain `K` (non-unity Sallen-Key). `// ponytail: unity-gain SK`.
- Higher-order (cascaded) filters. `// ponytail: 2nd order only`.
- Notch / all-pass. `// ponytail: LP/HP/BP only`.
- Component-tolerance / sensitivity analysis.

## Requirements

### R1 — Inputs

- `type` selector: `LP` / `HP` / `BP` (default `LP`).
- `R1`, `R2` (0.1–100 kΩ; defaults 10, 10).
- `C1`, `C2` (0.1–1000 nF; defaults 10, 10).

### R2 — Readouts (3 sig figs)

- `f0` (Hz), `Q`.
- For BP: also mid-band gain.

### R3 — Plot

`bodePlot` (foundation) of the assembled `Tf` over log frequency
`f0/1000 … f0·1000`.

### R4 — Error handling

Any product under a square root `≤ 0`, or a zero denominator term →
`error: invalid R/C values`.

## Math / code layout

`src/math/filter.ts` (unity-gain Sallen-Key):

```
LP:  ω0 = 1/√(R1·R2·C1·C2)
     Q  = √(R1·R2·C1·C2) / (C2·(R1+R2))
     Tf = ω0² / (s² + (ω0/Q)·s + ω0²)
HP:  same ω0; Q = √(R1·R2·C1·C2)/(R2·(C1+C2))
     Tf = s² / (s² + (ω0/Q)·s + ω0²)
BP (MFB): ω0 = 1/√(R1·R2·C1·C2) (with the MFB resistor mapping)
     Tf = (ω0/Q)·s / (s² + (ω0/Q)·s + ω0²)
```

(Use SI: R in Ω, C in F when forming ω0 — convert kΩ·nF inside.)

- `design(type, R1,R2,C1,C2) -> { f0_Hz, Q, gain, tf }` where `tf: Tf`
  (`num`/`den` highest-power-first), suitable for `bode()`.
- `bodePoints(type, ...) -> {omega,magDb,phaseDeg}[]` via `bode(tf, points)`.
- `src/modules/active-filter/module.ts` — sliders → readouts → `bodePlot`.
- One import line in `src/registry.ts`.

## Tests

`tests/math/filter.test.ts`:

- LP, `R1=R2=10 kΩ`, `C1=C2=10 nF`: `f0 ≈ 1592 Hz`, `Q = 0.5`.
- HP, same values: `f0 ≈ 1592 Hz`, `Q = 0.5`.
- LP magnitude at `f0` is `≈ −6.0 dB` for `Q=0.5` (`20·log10(Q)`), and `≈ 0 dB`
  at DC — check via `bode(tf, [{omega: ω0}])` and `[{omega: ω0/1000}]`.
- Registry smoke: `active-filter` present with `course = Elektronica1B`.

## UI/UX

- Inputs → Bode plot → readouts. Icon: `f0`.
- Card description: "Sallen-Key / MFB 2nd-order filters: f0, Q, magnitude & phase."

## Ponytail simplifications

- Unity-gain Sallen-Key. `// ponytail: K=1`.
- 2nd order only. `// ponytail: single biquad`.

## Future work

- Adjustable gain `K` and the resulting `Q` boost.
- Cascaded higher-order (Butterworth/Chebyshev) design.
