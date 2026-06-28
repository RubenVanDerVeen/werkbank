# Changelog

All notable changes to Werkbank are documented here. Format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- BJT Amplifiers module: hybrid-π small-signal analysis for CE/CB/CC configurations with Av/IC sweep plot.
- BJT DC Bias module: Q-point, region detection, and DC load line for fixed, voltage-divider, and emitter-feedback networks.
- Diode Wave-Shaping module: five canonical topologies with input/output waveform overlay and ripple readout.
- FET Amplifiers module: CS/CD/CG small-signal analysis for MOSFET and JFET with Av/IDQ sweep plot.
- Op-Amp Circuits module: inverting, non-inverting, follower, summing, difference with saturation-aware transfer plot.
- Cascaded Amplifier module: inter-stage loading, overall gain, and bandwidth shrink for 2–3 stages.
- Internal: complex-number math helper (`src/math/complex.ts`) and log-frequency Bode plot helper (`src/ui/acplot.ts`) for the Elektronica1B AC modules.
- Negative Feedback module: four topologies with loop gain, closed-loop gain, and Zin/Zout modification.
- Differential Amplifier module: BJT pair with current-mirror tail, Ad/Acm/CMRR/Rid and a CMRR-vs-REE sweep.
- Amplifier Frequency Response module: single-stage CE/CS fL, fH (Miller), midband gain, and Bode plot.
- Power Amplifiers module: Class A/B/AB output power, efficiency, and crossover transfer curve.

## [0.1.0] - 2026-06-27

### Added

- Static site scaffold (Vite + TypeScript, Minimal Academic style).
- Math engine: transfer function, Bode, step response, Routh array, Fourier series.
- Shared UI: layout shell, home grid, plot helpers (uPlot + SVG), input widgets.
- Modules: Transfer Function, PID Tuner, Routh-Hurwitz, Fourier Series.
- Documentation: AGENTS.md, README, CHANGELOG, STANDARDS.
- Tests: math engine + registry smoke test.