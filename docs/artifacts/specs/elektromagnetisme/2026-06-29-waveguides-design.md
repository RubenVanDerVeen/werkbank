# Rectangular Waveguides — Module Design

- **Module ID:** `waveguides`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make rectangular-waveguide mode theory concrete: TE/TM cutoff frequencies,
phase/group velocity (and the `vp·vg = c²` relation), guide wavelength, and the
transverse E-field pattern of the dominant TE10 mode (plus TE20, TE01, TE11,
TM11). A heat map shows the mode shape; a dispersion plot shows `vp > c`,
`vg < c`.

## Scope

### In scope

- Rectangular waveguide, width `a`, height `b` (`a > b`), vacuum-filled.
- TE_mn / TM_mn cutoff: `fc = (c/2)·sqrt((m/a)² + (n/b)²)`.
- TE: `m ≥ 0, n ≥ 0, m+n > 0`. TM: `m ≥ 1, n ≥ 1`. TE10 dominant for `a > b`.
- `vp = c / sqrt(1 − (fc/f)²)` (superluminal), `vg = c · sqrt(1 − (fc/f)²)` (subluminal), `vp·vg = c²`.
- `λg = (c/f) / sqrt(1 − (fc/f)²)` = `λ0 / sqrt(1 − (fc/f)²)`.
- `β = (2πf/c) · sqrt(1 − (fc/f)²)` (mentioned in the math, not a function).
- TE10 propagation field: `Ey = E0·sin(πx/a)·cos(βz)`, with `Hx`, `Hz` shapes.
- Transverse E-field pattern for the 5 selectable modes (heat map + arrows).

### Out of scope (ponytail)

- Dielectric-filled guide (`c ≠ c0`). `// ponytail: vacuum only, c = c0`.
- Attenuation/loss (conductor + dielectric). `// ponytail: lossless`.
- Higher-order modes beyond the 5 listed. `// ponytail: 5 modes cover the pedagogy`.
- Excitation/coupling, irises, discontinuities.
- TM longitudinal `Ez` displayed (transverse `Ex`, `Ey` shown only — `fieldPlot` is 2D in-plane).

## Requirements

### R1 — Inputs

- `mode` selector: TE10, TE20, TE01, TE11, TM11 (default TE10).
- `a` slider (5–50 mm, step 0.1; default 22.86 — WR-90).
- `b` slider (2–25 mm, step 0.1; default 10.16).
- `f` slider (1–30 GHz, step 0.1; default 10).

### R2 — Readouts (3 sig figs)

- `fc` (GHz).
- `vp` (as ×c), `vg` (as ×c).
- `λg` (cm).
- Cutoff status: `above cutoff` / `BELOW CUTOFF (evanescent)`.

### R3 — Plots

- `fieldPlot` (`showMagnitude`): transverse x-y cross-section of `|E|` for the
  selected mode, `nx × ny` grid, arrows = E-field direction.
- `linePlot`: `vp` and `vg` (both as ×c) vs `f`, swept from `fc·1.05` to
  `min(fc·4, 30 GHz)`.

### R4 — Error handling

- `f ≤ fc` → `vp`/`vg`/`λg` read `—` (evanescent, no real propagation);
  dispersion sweep starts at `fc·1.05`. `phaseVelocity`/`groupVelocity`/
  `guideWavelength` throw when `f ≤ fc`.

## Math / code layout

`src/math/waveguides.ts`:

```
cutoffFreq(m, n, a, b, c)      = (c/2)·sqrt((m/a)² + (n/b)²)         // TE & TM share the formula
phaseVelocity(f, fc, c)        = c / sqrt(1 − (fc/f)²)                // throws if f ≤ fc
groupVelocity(f, fc, c)        = c · sqrt(1 − (fc/f)²)                // throws if f ≤ fc
guideWavelength(f, fc, c)     = (c/f) / sqrt(1 − (fc/f)²)             // = λ0/sqrt(...)
te10Field(x, z, a, beta, E0)  = { Ey: E0·sin(πx/a)·cos(βz),
                                  Hx: −sin(πx/a)·cos(βz),             // shape; abs needs η_TE
                                  Hz: (π/(a·β))·cos(πx/a)·sin(βz) }   // relative by kc/β
modeField(mode, x, y, a, b)    = { Ex, Ey }  // transverse pattern, real signed
```

- `src/modules/waveguides/module.ts`
- One import line in `src/registry.ts`.
- `c = c0 = 2.998e8` hardcoded in the module (no dielectric slider).

> **Signature note:** the brief specified `guideWavelength(f, fc)`; `c` was
> added because `λg = (c/f)·sqrt(...)` needs it (consistent with
> `phaseVelocity`/`groupVelocity`, which also take `c`). `// ponytail: +c arg`.

> **`te10Field` note:** `Hx`/`Hz` are returned as unit-amplitude spatial shapes
> (correct signs and relative structure); absolute amplitude needs the TE wave
> impedance `η_TE = ωμ/β`, not in the signature. `// ponytail: Hx,Hz are shapes`.

> **`modeField` note:** added beyond the brief's 5 functions because the heat
> map needs per-mode transverse patterns for all 5 selectable modes. Drops the
> common `jωμ/kc²` (TE) / `jβ/kc²` (TM) factors; `fieldPlot` auto-scales, so
> only the `Ex:Ey` ratio (kept via `(m/a):(n/b)`) matters. `// ponytail: pattern shape, not amplitude`.

## Tests

`tests/math/waveguides.test.ts` (WR-90: `a = 0.02286`, `b = 0.01016`, `c = 3e8`):

- `cutoffFreq(1, 0, …)` → ≈ 6.56 GHz (TE10, dominant).
- `cutoffFreq(2, 0, …)` = 2 × TE10 `fc`.
- `cutoffFreq(0, 1, …)` > TE10 `fc` (since `a > b` → TE10 dominant).
- `cutoffFreq(1, 1, …)` ≈ 16.16 GHz (TE11 = TM11, same formula).
- `phaseVelocity(10e9, 6.56e9, 3e8)` > `c`; `groupVelocity(…)` < `c`; `vp·vg ≈ c²`.
- `guideWavelength(10e9, 6.56e9, 3e8)` ≈ 3.98 cm (`λ0 = 3 cm` at 10 GHz, `λg > λ0`).
- `phaseVelocity` throws when `f ≤ fc` (evanescent).
- `te10Field(a/2, 0, a, β, E0).Ey = E0` (peak); `te10Field(0, 0, …).Ey = 0` (wall).
- `te10Field(0, π/(2β), a, β, E0).Hz` is the peak (`sin(π/2) = 1`); `.Ey = 0` there.
- `modeField('TE10', a/2, b/2, a, b)`: `Ex = 0`, `|Ey|` at peak.
- `modeField('TE20', 3a/4, b/2, a, b).Ey` opposite sign to `a/4` (second lobe flips).
- `modeField('TE01', a/2, b/2, a, b)`: `Ey = 0`, `|Ex|` at peak.
- `modeField('TM11', a/4, b/4, a, b)`: `Ex`, `Ey` both finite and positive (TM branch).
- Registry smoke: `waveguides` present with `course = Elektromagnetische Velden`.

## UI/UX

- Inputs → heat map → readouts → dispersion plot. Icon: `TE`.
- Card description: "Rectangular waveguides: TE/TM cutoff, phase/group velocity, TE10 field profile."

## Ponytail simplifications

- Vacuum fill only (`c = c0`). `// ponytail: c = c0`.
- Lossless guide, no attenuation.
- 5 modes only (single-digit `m`, `n`).
- `fieldPlot` square canvas: waveguide aspect (`a:b`) is not reflected
  geometrically, only the mode pattern is. `// ponytail: square canvas, aspect not to scale`.
- `te10Field` `Hx`/`Hz` are spatial shapes, not absolute amplitudes.
- TM longitudinal `Ez` not shown (`fieldPlot` is in-plane).
- Mode shape shown even below cutoff (amplitude decay in evanescent regime not modeled).

## Future work

- Dielectric fill (`εr`, `μr` sliders → `c = 1/sqrt(με)`).
- Attenuation (conductor wall loss + dielectric loss) vs `f`.
- Single-mode band overlay on the dispersion plot (`fc_TE10 … fc_next`).
- z-propagation field snapshot (x-z plane) via a second `fieldPlot`.
