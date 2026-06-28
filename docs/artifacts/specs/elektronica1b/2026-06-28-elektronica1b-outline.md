# Elektronica1B Decomposition Outline

- **Topic:** Elektronica1B (Electronics II) course addition to werkbank
- **Date:** 2026-06-28
- **Status:** proposed — awaiting approval before specs are written

Parallel to the existing `Elektronica1A` course (5 modules: bjt-amp, bjt-dc,
diode-shaping, fet-amp, opamp). This adds the `Elektronica1B` course as a shared
math/UI foundation plus 8 independent topic modules. Each module follows the
established pattern: pure `src/math/<x>.ts` + `src/modules/<id>/module.ts` + one
line in `src/registry.ts` + README/CHANGELOG. The course string `Elektronica1B`
auto-appends in `home.ts` — no home-page change needed.

## Foundation (shared, runs first)

- **What it is:** A reusable complex-number layer and a log-frequency Bode plot
  helper. 1B is frequency-domain heavy (frequency response, filters,
  oscillators), and the current codebase has only an ad-hoc inline complex in
  `bode.ts` and a linear-x `linePlot`. The foundation gives the AC modules a
  single, tested complex type and a magnitude/phase-vs-frequency plot.
- **Deliverables:**
  - `src/math/complex.ts` — `Complex = {re, im}` plus `cadd csub cmul cdiv cabs
    cphaseDeg cscale fromPolar`, and `evalTfAtJw(tf, omega) -> Complex` /
    `magPhaseAtJw(tf, omega) -> {magDb, phaseDeg}`. Refactor `bode.ts` to use it
    (removing the dead `evalPolyAtRealCoef`).
  - `src/ui/acplot.ts` — `bodePlot(host, points, opts)` rendering magnitude (dB)
    and phase (deg) on a shared **log-frequency** x-axis (uPlot log scale),
    mirroring `linePlot`'s structure.
  - Tests in `tests/math/complex.test.ts`.
- **Scope boundaries:** IN — complex arithmetic, H(jω) evaluation, mag/phase
  extraction, log-x Bode plot helper. NOT — symbolic algebra, pole/zero solving
  beyond what `tf.ts` already does, S-plane charts (already exist), any
  module-specific circuit math.
- **Depended on by:** SP-1 (freq-response), SP-5 (active-filter), SP-6
  (oscillator). The other five modules are real-valued/DC and do not depend on it.

## Sub-projects (run in parallel after foundation)

### SP-1: freq-response — Amplifier Frequency Response
- **Goal:** Single-stage CE/CS amplifier frequency response: low-cutoff fL from
  coupling/bypass caps, high-cutoff fH from Miller-multiplied Cµ/Cgd, midband
  gain, bandwidth; Bode plot.
- **Why independent:** Own math (pole frequencies, Miller effect), own readouts.
- **Depends on:** Foundation (complex eval + `bodePlot`).
- **Touches:** `src/math/freqresp.ts`, `src/modules/freq-response/`, registry.

### SP-2: multistage — Cascaded / Multistage Amplifier
- **Goal:** 2–3 stage cascade: overall gain as product with inter-stage loading
  (Zout of stage k loads Zin of stage k+1), and combined −3 dB bandwidth
  (bandwidth-shrinkage factor).
- **Why independent:** Composes per-stage scalars; distinct math and UI.
- **Depends on:** none (foundation optional; kept standalone).
- **Touches:** `src/math/multistage.ts`, `src/modules/multistage/`, registry.

### SP-3: diff-amp — Differential Amplifier & Current Mirror
- **Goal:** BJT differential pair with current-mirror tail: differential gain Ad,
  common-mode gain Acm, CMRR, Zin/Zout, tail current from the mirror.
- **Why independent:** Distinct topology and metrics (CMRR), own math.
- **Depends on:** none.
- **Touches:** `src/math/diffamp.ts`, `src/modules/diff-amp/`, registry.

### SP-4: feedback — Negative-Feedback Topologies
- **Goal:** Four topologies (series-shunt, shunt-series, series-series,
  shunt-shunt): closed-loop gain Af = A/(1+Aβ), loop gain T = Aβ, desensitivity,
  and Zin/Zout modification (×/÷ (1+Aβ) per topology).
- **Why independent:** Generic feedback algebra, no circuit-device math.
- **Depends on:** none.
- **Touches:** `src/math/feedback.ts`, `src/modules/feedback/`, registry.

### SP-5: active-filter — Active Filters (Sallen-Key)
- **Goal:** Sallen-Key 2nd-order low-pass / high-pass / band-pass: f0, Q, and
  magnitude/phase Bode response. Filter-type selector.
- **Why independent:** Own transfer-function builder and UI.
- **Depends on:** Foundation (build Tf → `bodePlot`).
- **Touches:** `src/math/filter.ts`, `src/modules/active-filter/`, registry.

### SP-6: oscillator — Sinusoidal Oscillators
- **Goal:** Wien-bridge, RC phase-shift, and LC (Colpitts/Hartley): oscillation
  frequency f0 and the Barkhausen gain condition (loop gain = 1). Loop-gain
  magnitude/phase plot showing the 0°/360° crossing.
- **Why independent:** Distinct per-type formulas and gain conditions.
- **Depends on:** Foundation (loop-gain mag/phase plot).
- **Touches:** `src/math/oscillator.ts`, `src/modules/oscillator/`, registry.

### SP-7: power-amp — Power Amplifiers (Class A/B/AB)
- **Goal:** Class A (direct + transformer), Class B push-pull, Class AB: output
  power, DC input power, efficiency (and theoretical max), crossover region;
  transfer-curve plot.
- **Why independent:** Power/efficiency math, transfer-curve plot, own UI.
- **Depends on:** none.
- **Touches:** `src/math/poweramp.ts`, `src/modules/power-amp/`, registry.

### SP-8: comparator — Comparator & Schmitt Trigger
- **Goal:** Op-amp comparator with hysteresis (inverting / non-inverting Schmitt):
  upper/lower thresholds, hysteresis width from R1/R2 and rails; hysteresis-loop
  transfer plot.
- **Why independent:** Threshold/hysteresis math, loop plot, own UI.
- **Depends on:** none.
- **Touches:** `src/math/schmitt.ts`, `src/modules/comparator/`, registry.

## Execution order

1. **Foundation** — one agent. Adds `complex.ts` + `acplot.ts`, refactors `bode.ts`.
2. **SP-1 … SP-8 in parallel** — one cheaper agent each, after the foundation is
   merged. (SP-2, SP-3, SP-4, SP-7, SP-8 have no hard dependency on the
   foundation and may start immediately if desired; foundation-first is the
   simplest dispatch story.)

## Notes

- 9 plans total (1 foundation + 8 modules), ~5 TDD tasks each ≈ ~45 bite-sized
  tasks — well past the single-plan threshold, hence the split.
- No commit/push performed by the orchestrator (AGENTS.md). Artifacts only.
- Per skill: no shared small-signal solver is extracted across modules. Each
  module is a parallel implementation; factor later only if a shape repeats.
