# Electrostatics — Module Design

- **Module ID:** `electrostatics`
- **Course:** Elektromagnetische Velden
- **Date:** 2026-06-29
- **Status:** proposed

## Goal

Make Coulomb superposition, Gauss's law for symmetric geometries, and the
three canonical capacitance formulas tangible in one screen: a 2D vector-field
plot of the E-field from an arrangement of point charges (with a movable probe
reading |E| and V), plus two calculators that take geometry inputs and return
C (plate/coax/sphere) and E (sphere/cylinder/plane).

## Scope

### In scope

- Coulomb superposition in 2D: `E = k·q·r̂/r²`, `V = k·q/r`, summed over
  point charges. `k = 1/(4πε₀)`, `ε₀ = 8.854187817e-12`.
- Preset charge arrangements: `single`, `dipole`, `quadrupole`, `capacitor`
  (two lines of ± charges approximating parallel plates).
- Movable probe (x,y sliders) reading |E| and V via superposition.
- Gauss's law for three symmetric geometries:
  - sphere: `E = Q/(4πε₀r²) = k·Q/r²`
  - infinite cylinder (line charge): `E = λ/(2πε₀r)`
  - infinite plane: `E = σ/(2ε₀)` (independent of r)
- Capacitance:
  - parallel plate: `C = ε₀·A/d`
  - coaxial: `C = 2πε₀·L/ln(b/a)`
  - isolated sphere: `C = 4πε₀·r`

### Out of scope (ponytail)

- 3D fields; dielectric materials (`ε_r ≠ 1`). `// ponytail: vacuum only; ε_r slider if a dielectric unit is added later`.
- Boundary-value problems / method of images. `// ponytail: superposition of point charges only`.
- Free-form charge placement via canvas clicks; presets + scale slider cover the pedagogy. `// ponytail: presets only; free placement if pedagogy demands`.
- Energy stored in a capacitor, force between plates. Mention only.

## Requirements

### R1 — Inputs

- Field viz: `Preset` select (`single|dipole|quadrupole|capacitor`, default `dipole`);
  `Charge scale` slider (0.1–5, default 1); `Probe x`, `Probe y` sliders (−5…5 m, default 0,0).
- Capacitance: `Capacitance` select (`plate|coax|sphere`, default `plate`); sliders
  `A` (1e-5…1e-2 m²), `d` (1e-4…1e-2 m), `L` (0.1…5 m), `a` (1e-4…5e-3 m),
  `b` (2e-4…1e-2 m), `r` (0.01…2 m). Only the sliders for the active type are shown.
- Gauss: `Gauss` select (`sphere|cylinder|plane`, default `sphere`); sliders
  `Q` (1e-10…1e-7 C), `λ` (1e-10…1e-7 C/m), `σ` (1e-10…1e-7 C/m²), `r` (0.01…5 m).
  Only the slider for the active type is shown; `r` always visible (ignored for plane).

### R2 — Readouts (3 sig figs)

- Field: `|E|` (V/m) and `V` (V) at the probe.
- Capacitance: `C` in pF.
- Gauss: `E` in V/m.

### R3 — Plot

`fieldPlot`: 15×15 grid over −5…5 m, E-field arrows from the scaled preset.
Vector length capped at a display constant so near-charge arrows stay readable.

### R4 — Error handling

- Probe coincident with a charge → readout shows `probe at charge: <message>`; the coincident grid point is skipped (zero vector).
- `capacitance('coax', …)` with `b ≤ a` → throws `coax: b must be > a`.
- `capacitance('plate', …)` with `d ≤ 0` → throws `plate: d must be > 0`.
- `gaussField('sphere'|'cylinder', …)` with `r ≤ 0` → throws `r must be > 0`.

## Math / code layout

`src/math/electrostatics.ts`:

```
EPS0 = 8.854187817e-12
K    = 1/(4π·EPS0)               ≈ 8.987551787e9

pointChargeField(q, at, obs)      → {Ex, Ey} = k·q·(obs-at)/|obs-at|³
pointChargePotential(q, at, obs) → V = k·q/|obs-at|
superposeField(charges, obs)     → sum of pointChargeField
superposePotential(charges, obs) → sum of pointChargePotential
capacitance(type, params)        → plate: ε₀A/d; coax: 2πε₀L/ln(b/a); sphere: 4πε₀r
gaussField(type, params, r)     → sphere: kQ/r²; cylinder: λ/(2πε₀r); plane: σ/(2ε₀)
```

- `src/modules/electrostatics/module.ts`
- One import line in `src/registry.ts`.

## Tests

`tests/math/electrostatics.test.ts`:

- `pointChargeField(1e-9, {0,0}, {1,0})` → `Ex ≈ 8.988`, `Ey = 0`.
- `pointChargePotential(1e-9, {0,0}, {1,0})` → `V ≈ 8.988`.
- Dipole superposition `+1nC@{−1,0}`, `−1nC@{1,0}`, obs `{0,0}`:
  `Ex ≈ 17.975`, `Ey = 0`, `V = 0` (potentials cancel).
- `pointChargeField(1, {0,0}, {0,0})` → throws.
- `capacitance('plate', {A:1e-4, d:1e-3})` → `C ≈ 8.854e-13 F` (0.885 pF).
- `capacitance('coax', {L:1, a:1e-3, b:2e-3})` → `C ≈ 8.027e-11 F` (80.3 pF).
- `capacitance('sphere', {r:1})` → `C ≈ 1.11265e-10 F` (111.3 pF).
- `capacitance('coax', {L:1, a:2e-3, b:1e-3})` → throws (b < a).
- `gaussField('sphere', {Q:1e-9}, 1)` → `E ≈ 8.988 V/m`.
- `gaussField('cylinder', {lambda:1e-9}, 1)` → `E ≈ 17.975 V/m`.
- `gaussField('plane', {sigma:1e-9}, 0.5)` → `E ≈ 56.47 V/m`, independent of r.
- Registry smoke: `electrostatics` present with `course = Elektromagnetische Velden`.

## UI/UX

- Three stacked sections (field viz, capacitance, Gauss), each with its inputs
  followed by its plot/readout. Icon: `⚡`.
- Card description: "Coulomb superposition field plot, Gauss-law field calculators, and capacitance formulas."

## Ponytail simplifications

- Vacuum only (`ε_r = 1`). `// ponytail: vacuum; ε_r slider if a dielectric unit is added`.
- Preset charge arrangements, no canvas-click placement. `// ponytail: presets; free placement if pedagogy demands`.
- 2D fields, vector length capped for display. `// ponytail: 2D slice; 3D is a separate module`.
- Plane Gauss `r` parameter accepted but unused (uniform signature). `// ponytail: r accepted, unused for plane`.

## Future work

- Dielectric `ε_r` slider on capacitance and field.
- Method-of-images examples (point charge near grounded plane).
- Energy readouts (`U = ½CV²`, `u = ½ε₀E²`).
