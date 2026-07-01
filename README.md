# werkbank

A small collection of interactive study tools for electrical-engineering
coursework — calculators and visualizers you can poke at until the theory
clicks.

Built by one student, for the courses that needed it. Currently covers
**Regeltechniek** (control systems), **Fourier** analysis,
**Elektronica1A** (analog electronics), and **Vermelonselektronica**
(power electronics / SMPS), and **Elektromagnetische Velden**
(electromagnetics). New modules land as new courses come up.

## What's inside

Each tool is a self-contained page: plug in your parameters, watch the plots
and numbers update live.

**Regeltechniek — control systems**

- **Transfer Function** — poles, zeros, Bode plot, and step response from a
  transfer function you type in.
- **PID Tuner** — drag the Kp / Ki / Kd sliders and watch the closed-loop
  step response settle in real time.
- **Routh-Hurwitz** — enter a characteristic polynomial, get the Routh table
  and a stability verdict.

**Fourier**

- **Fourier Series** — rebuild a waveform one harmonic at a time. Crank the
  harmonic count and watch the partial sum converge to the original.

**Elektronica1A — analog electronics**

- **Op-Amp Circuits** — ideal op-amp configurations with a transfer curve
  that accounts for saturation.
- **Diode Wave-Shaping** — clippers, clampers, and rectifiers with the input
  and output waveforms overlaid so you can see the reshape.
- **BJT DC Bias** — Q-point and load line on the output characteristics, for
  fixed, divider, and emitter-feedback biasing.
- **BJT Amplifiers** — hybrid-π small-signal analysis for CE / CB / CC
  stages.
- **FET Amplifiers** — small-signal analysis for CS / CD / CG stages, MOSFET
  and JFET.
- **Cascaded Amplifier** — inter-stage loading, overall gain, and bandwidth shrink.
- **Differential Amplifier** — BJT diff pair with current-mirror tail: Ad, Acm, CMRR.

**Elektronica1B — advanced analog electronics**

- **Amplifier Frequency Response** — single-stage fL/fH/midband gain with a Bode plot.
- **Negative Feedback** — four topologies: loop gain, closed-loop gain, Zin/Zout impact.
- **Power Amplifiers** — Class A/B/AB output power, efficiency, and crossover transfer curve.
- **Sinusoidal Oscillators** — Wien, phase-shift, Colpitts, Hartley: f0 and gain condition.
- **Active Filters** — Sallen-Key / MFB 2nd-order LP/HP/BP with f0, Q, and Bode plot.
- **Comparator & Schmitt Trigger** — thresholds, hysteresis, and the transfer loop.

**Vermogenselektronica — power electronics (SMPS)**

- **Buck Converter** — step-down SMPS: duty cycle, inductor current ripple, switch/diode currents, output voltage ripple, and efficiency vs. conduction loss.
- **Boost Converter** — step-up SMPS with the same readouts; output voltage must exceed input.
- **Buck-Boost (inverting)** — inverting SMPS with output polarity note; same readouts minus the ripple.
- **Flyback Converter** — isolated SMPS with a turns-ratio slider: Vout = Vin·n·D, reflected primary current, duty/ripple/efficiency.
- **Forward Converter** — isolated SMPS (non-flying) with the demag-winding D-clamp at 0.45: duty, ripple, efficiency.
- **Maxwell & Induction** — Faraday, Lenz, motional emf, self/mutual inductance, displacement current.

**Elektromagnetische Velden — electromagnetics**

- **Plane-Wave Incidence** — Snell's law, Fresnel coefficients, critical and Brewster angles.

**Elektromagnetische Velden**

- **Electromagnetic Waves** — plane-wave propagation: η, γ, skin depth, Poynting vector, polarization.

**Elektromagnetische Velden — electromagnetics**

- **Rectangular Waveguides** — TE/TM cutoff, phase/group velocity, guide wavelength, TE10 field profile.

## Develop

```sh
npm install
npm run dev
```

Vite serves the site with hot reload.

## Test

```sh
npm test
```

Unit tests run on Node's built-in test runner.

## Build

```sh
npm run build
```

Output lands in `dist/` — a flat bundle you can drop on any static host
(GitHub Pages, Netlify, a USB stick, whatever).

## Add a module

The site is a registry of self-contained modules. To add one:

1. Create `src/modules/<id>/module.ts` exporting a `Module`.
2. Add the import to `src/registry.ts`.

That's it — the homepage and dispatcher pick it up automatically. See
`AGENTS.md` for the full module contract and conventions.
