# Elektromagnetisme Decomposition Outline

- **Topic:** Elektromagnetisme (EM fields + HF transmission lines + Antennas) course
  addition to werkbank
- **Date:** 2026-06-29
- **Status:** approved (brainstorm complete) — manifest and foundation spec/plan ready

Parallel to the existing multi-module courses (`Elektronica1A`, `Elektronica1B`,
`Vermogenselektronica`). Adds three course strings to `home.ts`'s auto-append
grouping:

- **`Elektromagnetische Velden`** — 6 modules
- **`Hoogfrequenttechniek`** — 5 modules
- **`Antennes`** — 3 modules

Total: 14 modules, dispatched as 1 foundation plan + 14 module sub-projects
(same shape as the `Elektronica1B` manifest). Each module follows the established
pattern: pure `src/math/<x>.ts` + `src/modules/<id>/module.ts` + one line in
`src/registry.ts` + presence-by-id smoke test + README/CHANGELOG bullet.

## Foundation (shared, runs first)

- **What it is:** A reusable SVG Smith-chart helper, a 2D field-plot helper, a
  polar radiation-pattern helper, and a transmission-line math helper. The AC
  bucket already has `src/math/complex.ts` from the Elektronica1B foundation
  (with `cadd/csub/cmul/cdiv/cabs/cphaseDeg/fromPolar/evalTfAtJw/magPhaseAtJw`)
  — this foundation reuses it, no new complex layer.
- **Deliverables:**
  - `src/ui/smith.ts` — `smithChart(host, opts)` rendering the unit circle,
    constant-r and constant-x circles, and a list of `Γ`/`Z` points; returns
    `{ update(points) }`. Used by `smith-chart`, `impedance-matching`,
    `s-parameters`, `tl-input-impedance`.
  - `src/ui/fieldplot.ts` — `fieldPlot(host, opts)` rendering a 2D grid of
    vector-field arrows and optional scalar-field contours / heat-map cells
    on an SVG canvas; returns `{ update(...) }`. Used by `electrostatics`,
    `magnetostatics`, `em-waves`, `waveguides`.
  - `src/ui/polarplot.ts` — `polarPlot(host, series, opts)` rendering a polar
    radiation pattern (linear or dB, full/half plane); returns `{ update }`.
    Used by `dipole-radiation`, `antenna-arrays`, `link-budget`.
  - `src/math/tl.ts` — transmission-line math: `zToGamma(z, z0)`,
    `gammaToZ(g, z0)`, `swr(g)`, `zin(zL, beta*l, z0)` (lossless), plus
    `tlFundamentals(z0, v)` constants. Used by the entire HF bucket.
- **Scope boundaries:** IN — Smith SVG, field SVG, polar SVG, TL reflection/
  input-Z algebra. NOT — circuit-specific math, antenna pattern formulas, wave
  equations, solver kernels (each module owns its own `src/math/<x>.ts`).
- **Depended on by:**
  - `smith.ts`: smith-chart, impedance-matching, s-parameters, tl-input-impedance
  - `fieldplot.ts`: electrostatics, magnetostatics, em-waves, waveguides
  - `polarplot.ts`: dipole-radiation, antenna-arrays
  - `tl.ts`: tl-fundamentals, tl-input-impedance, smith-chart,
    impedance-matching, s-parameters
- No registry edit (foundation is internal infrastructure, same as 1B).

## Sub-projects (run in parallel after foundation)

### Elektromagnetische Velden (6) — depends on `fieldplot.ts`

#### SP-1: electrostatics — Electrostatics
- **Goal:** Coulomb superposition, V = kq/r, Gauss (sphere/cylinder/plane),
  capacitance of simple geometries (parallel plate, coax, isolated sphere).
- **Why independent:** Own field math, own readouts (E, V, C).
- **Depends on:** Foundation (`fieldplot.ts`).
- **Touches:** `src/math/electrostatics.ts`, `src/modules/electrostatics/`, registry.

#### SP-2: magnetostatics — Magnetostatics
- **Goal:** Biot-Savart (long wire, finite segment, loop), Ampère (wire,
  solenoid, toroid), inductance, magnetic reluctance.
- **Why independent:** Own B-field math and readouts (B, L, ℛ).
- **Depends on:** Foundation (`fieldplot.ts`).
- **Touches:** `src/math/magnetostatics.ts`, `src/modules/magnetostatics/`, registry.

#### SP-3: maxwell-induction — Maxwell & Electromagnetic Induction
- **Goal:** Faraday `emf = −dΦ/dt`, motional emf, Lenz's law, self/mutual
  inductance, Maxwell's equations in integral form, displacement current.
- **Why independent:** Time-domain emf/flux; uses existing `linePlot`, not fieldplot.
- **Depends on:** none (foundation optional; kept standalone using `linePlot`).
- **Touches:** `src/math/induction.ts`, `src/modules/maxwell-induction/`, registry.

#### SP-4: em-waves — Electromagnetic Waves
- **Goal:** Wave equation, intrinsic impedance η, propagation constant
  γ = α + jβ, skin depth δ, linear/circular/elliptical polarization, Poynting
  vector.
- **Why independent:** Own wave math; uses `fieldplot` for 1D E/B snapshot +
  polarization view.
- **Depends on:** Foundation (`fieldplot.ts`).
- **Touches:** `src/math/emwaves.ts`, `src/modules/em-waves/`, registry.

#### SP-5: plane-wave-incidence — Plane-Wave Incidence
- **Goal:** Snell's law, Fresnel coefficients (perpendicular/parallel), total
  internal reflection, Brewster angle; standing-wave pattern in the lossy case.
- **Why independent:** Own incidence math and readouts (Γ, T, θ).
- **Depends on:** none (uses `linePlot`, foundation optional).
- **Touches:** `src/math/incidence.ts`, `src/modules/plane-wave-incidence/`, registry.

#### SP-6: waveguides — Rectangular Waveguides
- **Goal:** TE/TM mode cutoff frequencies, phase and group velocity,
  dispersion, TE10 dominant mode field profile.
- **Why independent:** Own mode math; uses `fieldplot` for mode-profile heat map.
- **Depends on:** Foundation (`fieldplot.ts`).
- **Touches:** `src/math/waveguides.ts`, `src/modules/waveguides/`, registry.

### Hoogfrequenttechniek (5) — depends on `tl.ts`, most also on `smith.ts`

#### SP-7: tl-fundamentals — Transmission-Line Fundamentals
- **Goal:** LGC distributed model, characteristic impedance Z₀, phase velocity
  v, lossy line, distortionless (Heaviside) condition.
- **Why independent:** Own LGC math; uses `linePlot` for Z₀/v vs params.
- **Depends on:** Foundation (`tl.ts`).
- **Touches:** `src/math/tlfundamentals.ts`, `src/modules/tl-fundamentals/`, registry.

#### SP-8: tl-input-impedance — Input Impedance, SWR, λ/4 Transformer
- **Goal:** `Zin(ZL, βl, Z0)` for lossless line, voltage standing-wave ratio,
  `|Γ|`, quarter-wave transformer design.
- **Why independent:** Own Zin math; uses Smith locus + `linePlot`.
- **Depends on:** Foundation (`tl.ts`, `smith.ts`).
- **Touches:** `src/math/tlinputz.ts`, `src/modules/tl-input-impedance/`, registry.

#### SP-9: smith-chart — Interactive Smith Chart
- **Goal:** Z↔Γ mapping, constant r/x circles, admittance Y = 1/Z, normalized
  impedance; click-to-plot, SWR readout, Z/Y toggle.
- **Why independent:** Uses the foundation's `smithChart` directly; own interaction.
- **Depends on:** Foundation (`smith.ts`, `tl.ts`).
- **Touches:** `src/math/smithmath.ts`, `src/modules/smith-chart/`, registry.

#### SP-10: impedance-matching — Impedance Matching Networks
- **Goal:** L-networks (4 topologies), λ/4 transformer, single-stub and
  double-stub matching; component values (L, C, stub length, distance).
- **Why independent:** Own matching solver; Smith match trajectory.
- **Depends on:** Foundation (`smith.ts`, `tl.ts`).
- **Touches:** `src/math/matching.ts`, `src/modules/impedance-matching/`, registry.

#### SP-11: s-parameters — S-Parameters & Two-Port
- **Goal:** Two-port S→Z/Y/ABCD conversions, return loss, insertion loss,
  transducer gain, signal-flow-graph reduction; `|S21|` dB vs frequency.
- **Why independent:** Own two-port math; uses Smith (S11/S22) + `acplot` +
  flow-graph SVG.
- **Depends on:** Foundation (`smith.ts`, `tl.ts`); existing `acplot.ts`.
- **Touches:** `src/math/sparams.ts`, `src/modules/s-parameters/`, registry.

### Antennes (3) — depends on `polarplot.ts`

#### SP-12: dipole-radiation — Dipole Radiation
- **Goal:** Hertzian dipole and half-wave dipole radiation patterns,
  radiation resistance Rr, directivity D, half-power beamwidth.
- **Why independent:** Own dipole pattern math; polar plot.
- **Depends on:** Foundation (`polarplot.ts`).
- **Touches:** `src/math/dipole.ts`, `src/modules/dipole-radiation/`, registry.

#### SP-13: antenna-arrays — Linear Antenna Arrays
- **Goal:** N-element uniform linear array, array factor, broadside/endfire,
  pattern multiplication with element pattern, nulls, beam scanning via phase.
- **Why independent:** Own array-factor math; polar plot with N/d/phase sliders.
- **Depends on:** Foundation (`polarplot.ts`).
- **Touches:** `src/math/arrays.ts`, `src/modules/antenna-arrays/`, registry.

#### SP-14: link-budget — Link Budget & Radar Equation
- **Goal:** Friis transmission equation, EIRP, free-space path loss, radar
  equation, fade margin; received power vs distance.
- **Why independent:** Own link-budget math; `linePlot` for Pr vs d.
- **Depends on:** none (uses `linePlot`, foundation optional).
- **Touches:** `src/math/linkbudget.ts`, `src/modules/link-budget/`, registry.

## Execution order

1. **Planner** commits planning artifacts to `feat/elektromagnetisme` (done).
2. **Foundation** — one agent on `feat/elektromagnetisme/foundation` (cut from
   `feat/elektromagnetisme`). Adds `smith.ts`, `fieldplot.ts`, `polarplot.ts`,
   `tl.ts`. No registry edit. User merges the sub-branch back into
   `feat/elektromagnetisme`.
3. **After the user merges the foundation into `feat/elektromagnetisme`:
   SP-1 … SP-14 in parallel** — one cheaper agent per plan, each on its own
   `feat/elektromagnetisme/<slug>` branch cut from `feat/elektromagnetisme`
   (which now contains the foundation). The foundation-independent modules
   (`maxwell-induction`, `plane-wave-incidence`, `link-budget`) may be
   dispatched in the same batch as the foundation if you want to start early;
   the other 11 must wait for the foundation's SVG/TL helpers to be on
   `feat/elektromagnetisme`. Each agent reports back; the user merges the
   sub-branch into `feat/elektromagnetisme`.
4. **After all sub-branches are merged** — integration verification on
   `feat/elektromagnetisme`. User reviews and merges `feat/elektromagnetisme`
   to `main`.

## Notes

- 15 plans total (1 foundation + 14 modules), ~5 TDD tasks each ≈ ~75
  bite-sized tasks — well past the single-plan threshold, hence the split.
- No commit/push performed by the orchestrator (AGENTS.md). Artifacts only.
- Per skill: no shared solver extracted across modules. Each module is a
  parallel implementation; factor later only if a shape repeats.
- Course strings: three new labels appear automatically in `home.ts` via the
  existing auto-append for unknown course strings. Optionally add them to
  `courseOrder` in `home.ts` for explicit ordering (one-line tweak, optional,
  not required for cards to render).
