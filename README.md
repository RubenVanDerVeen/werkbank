# werkbank

A small collection of interactive study tools for electrical-engineering
coursework — calculators and visualizers you can poke at until the theory
clicks.

Built by one student, for the courses that needed it. Currently covers
**Regeltechniek** (control systems), **Fourier** analysis, and
**Elektronica1A** (analog electronics). New modules land as new courses come
up.

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
