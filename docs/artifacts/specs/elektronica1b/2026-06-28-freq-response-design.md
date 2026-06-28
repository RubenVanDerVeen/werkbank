# Amplifier Frequency Response — Module Design

- **Module ID:** `freq-response`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Interactive frequency-response analyzer for a single-stage CE/CS amplifier: the
low-cutoff `fL` set by coupling/bypass capacitors, the high-cutoff `fH` set by
the Miller-multiplied internal capacitance, the midband gain, and the resulting
bandwidth. A Bode plot shows the band-pass shape.

## Scope

### In scope

- Single transconductance stage characterised by `gm`.
- Midband gain `Amid = -gm·(RC‖RL)`.
- Low-frequency poles from input coupling `C1` and output coupling `C2`; report
  the **dominant** (highest) `fL`.
- High-frequency pole from the Miller input capacitance:
  `Cin = Cπ + Cµ·(1+|Amid|)`, `fH = 1/(2π·(Rsig‖Rin)·Cin)`.
- Bode plot of the single-pole-low + single-pole-high band-pass model.

### Out of scope (ponytail)

- The output Miller pole / `Cµ` output split. `// ponytail: input Miller pole dominates`.
- Bypass-cap (`CE`) zero/pole pair — only coupling caps for `fL`.
  `// ponytail: coupling-cap fL only; add CE pole when course covers it`.
- Exact multi-pole solving; the model is the textbook two-corner approximation.
- Device bias (gm is an input, not derived). Lives in `bjt-dc`/`fet-amp`.

## Requirements

### R1 — Inputs (sliders)

| Input | Range | Default | Notes |
|-------|-------|---------|-------|
| `gm` | 1–100 mS | 40 | transconductance |
| `Rsig` | 0–10 kΩ | 0.6 | source resistance |
| `Rin` | 0.1–50 kΩ | 2.5 | amp input resistance (rπ‖bias) |
| `RC` | 0.1–20 kΩ | 5 | collector/drain resistor |
| `RL` | 0.1–100 kΩ | 10 | load |
| `Cpi` | 1–100 pF | 10 | Cπ / Cgs |
| `Cmu` | 0.5–20 pF | 2 | Cµ / Cgd (Miller cap) |
| `C1` | 0.01–10 µF | 1 | input coupling |
| `C2` | 0.01–10 µF | 1 | output coupling |

### R2 — Readouts (3 sig figs)

- `Amid` and `AmidDb = 20·log10(|Amid|)`.
- `fL` (Hz) — dominant low corner.
- `fH` (Hz) — high corner.
- `BW` (Hz) — `fH − fL`.

### R3 — Plot

`bodePlot` (foundation) over log frequency from `fL/100` to `fH·100`, using the
band-pass transfer model `H(jω) = Amid·(jω/ωL)/(1+jω/ωL)·1/(1+jω/ωH)`.

### R4 — Error handling

Any zero resistance/cap that produces a non-finite corner → readout shows
`error: <reason>`, plot not redrawn.

## Math / code layout

`src/math/freqresp.ts`:

```
RLp  = RC‖RL
Amid = -gm·RLp                      (mS·kΩ = unitless)
Cin  = Cpi + Cmu·(1+|Amid|)          [pF]
Rth  = Rsig‖Rin                      [kΩ]
fH   = 1e9 / (2π·Rth·Cin)            [Hz]   (kΩ·pF)
fL1  = 1e3 / (2π·(Rsig+Rin)·C1)      [Hz]   (kΩ·µF)
fL2  = 1e3 / (2π·(RC+RL)·C2)         [Hz]
fL   = max(fL1, fL2)
BW   = fH − fL
```

- `analyze(params) -> { Amid, AmidDb, fL_Hz, fH_Hz, BW_Hz }`
- `bodePoints(params, decadesBelow, decadesAbove) -> {omega,magDb,phaseDeg}[]`
  built from `tfFromCoeffs` + `bode` (foundation), or directly via the band-pass
  expression and `complex.ts`.
- `src/modules/freq-response/module.ts` — sliders → readouts → `bodePlot`.
- One import line in `src/registry.ts`.

## Tests

`tests/math/freqresp.test.ts` (defaults above):

- `Amid ≈ -133.3`, `AmidDb ≈ 42.5`.
- `Cin ≈ 278.7 pF`.
- `fH ≈ 1.18e6 Hz` (tol 2 %).
- `fL ≈ 51.3 Hz` (input coupling dominates; tol 2 %).
- Registry smoke: `freq-response` present with `course = Elektronica1B`.

## UI/UX

- Inputs column → Bode plot → readouts. Icon: `fH`.
- Card description: "Single-stage amplifier frequency response: fL, fH, midband gain, Bode plot."

## Ponytail simplifications

- Input Miller pole only. `// ponytail: input Miller pole dominates fH`.
- Coupling-cap `fL` only, no bypass pole. `// ponytail: coupling fL only`.
- Two-corner band-pass model, not exact multi-pole. `// ponytail: textbook two-corner model`.

## Future work

- `CE` bypass pole/zero pair.
- Output Miller pole.
- Couple to `multistage` for cascaded bandwidth.
