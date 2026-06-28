# Differential Amplifier & Current Mirror — Module Design

- **Module ID:** `diff-amp`
- **Course:** Elektronica1B
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Analyze a BJT differential pair biased by a current-mirror tail: differential
gain `Ad`, common-mode gain `Acm`, common-mode rejection ratio `CMRR`, and
differential input resistance `Rid`. A sweep plot shows how CMRR rises with the
tail resistance `REE` (the figure of merit of the mirror).

## Scope

### In scope

- BJT pair, single-ended output (collector of one side).
- Tail current `Itail` set by the mirror; per-device `IC = Itail/2`.
- `gm = IC/VT`, `rπ = β/gm`.
- `Ad(se) = gm·RC/2`, `Acm(se) ≈ RC/(2·REE)`, `CMRR = |Ad/Acm| = gm·REE`.
- `Rid = 2·rπ`.
- Sweep: CMRR (dB) vs `REE`.

### Out of scope (ponytail)

- Double-ended (differential) output — `Acm → 0` ideally, less instructive.
  `// ponytail: single-ended output; Acm finite is the teaching point`.
- Mismatch-driven CMRR (ΔRC, Δβ). `// ponytail: matched-pair, mirror REE sets CMRR`.
- `ro` of the devices. `// ponytail: ro omitted`.
- FET pair (add a device toggle later).

## Requirements

### R1 — Inputs (sliders)

| Input | Range | Default | Notes |
|-------|-------|---------|-------|
| `Itail` | 0.1–10 mA | 2 | mirror tail current |
| `RC` | 0.1–50 kΩ | 5 | collector resistor |
| `REE` | 1–1000 kΩ | 100 | tail (mirror output) resistance |
| `beta` | 20–500 | 200 | β |
| `VT` | 0.020–0.030 V | 0.025 | thermal voltage |

### R2 — Readouts (3 sig figs)

- `gm` (mS), `rπ` (kΩ).
- `Ad` (single-ended), `Acm`, `CMRR` and `CMRR_dB`.
- `Rid` (kΩ).

### R3 — Plot

`linePlot`: CMRR_dB vs `REE` (1–1000 kΩ), single series.

### R4 — Error handling

`Itail = 0` → `error: tail current must be > 0`.

## Math / code layout

`src/math/diffamp.ts`:

```
IC   = Itail/2                 [mA]
gm   = IC/VT                   [mS]   (mA / V)
rpi  = beta/gm                 [kΩ]   (unitless/mS = kΩ)
Ad   = gm·RC/2                 [unitless]  (mS·kΩ)
Acm  = RC/(2·REE)              [unitless]
CMRR = Ad/Acm = gm·REE
Rid  = 2·rpi                   [kΩ]
```

- `analyze(params) -> { gm_mS, rpi_kOhm, Ad, Acm, CMRR, CMRRdb, Rid_kOhm }`
- `src/modules/diff-amp/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/diffamp.test.ts` (`Itail=2, RC=5, REE=100, beta=200, VT=0.025`):

- `gm = 40 mS`, `rπ = 5 kΩ`, `Rid = 10 kΩ`.
- `Ad = 100`.
- `CMRR = 4000`, `CMRR_dB ≈ 72.0`.
- Registry smoke: `diff-amp` present with `course = Elektronica1B`.

## UI/UX

- Inputs → plot → readouts. Icon: `Δ`.
- Card description: "BJT differential pair with current-mirror tail: Ad, Acm, CMRR, Rid."

## Ponytail simplifications

- Single-ended output. `// ponytail: single-ended output`.
- Matched pair, `ro` omitted. `// ponytail: matched, ro omitted`.

## Future work

- FET differential pair toggle.
- Mismatch-limited CMRR.
- Active-load (current-mirror load) gain `gm·ro`.
