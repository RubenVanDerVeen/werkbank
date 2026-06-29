# Vermogenselektronica — Design

Date: 2026-06-29
Branch: `feat/vermogenselektronica`

## Goal

Add the subject **Vermogenselektronica** (switched-mode power supplies) as a new
course alongside Regeltechniek + electronics. One card per topology, following
the existing module pattern.

## Scope (v1)

Five SMPS topologies, each as its own module:

| Module id        | Topology   | Isolated | Notes                       |
| ---------------- | ---------- | -------- | --------------------------- |
| `smps-buck`      | Buck       | No       | Step-down                   |
| `smps-boost`     | Boost      | No       | Step-up                     |
| `smps-buckboost` | Buck-Boost | No       | Inverting (Vout negative)   |
| `smps-flyback`   | Flyback    | Yes      | Isolated, isolated topology |
| `smps-forward`   | Forward    | Yes      | Isolated, non-flying        |

### Per-module inputs

All: Vin, Vout, Iout, fsw, ΔiL (ripple-current target or absolute).
Isolated: also turns ratio Np:Ns, max duty clamp (typical 0.45 for reset).

### Per-module outputs

- Duty cycle D
- Required L (from ΔiL target) — or ΔiL given L
- Required C (from output ripple ΔV target)
- Peak/RMS switch current and diode current
- Efficiency estimate (conduction losses from switch Rds,on + diode Vf; no
  switching-loss model — see Skipped)
- One steady-state waveform: Vsw(t) and iL(t) over one switching period
  (uPlot line plot — matches pid-tuner / bjt-amp)

### Reuse

Existing UI helpers (`polyInput`, `slider` from `src/ui/inputs.ts`,
`linePlot` from `src/ui/plots.ts`) — no new UI primitives.
Math lives in `src/math/converter.ts` (per-topology pure functions).

## Math layer

`src/math/converter.ts` — exports per-topology:

```ts
export interface ConverterDesign {
  topology: 'buck' | 'boost' | 'buckboost' | 'flyback' | 'forward';
  Vin: number;
  Vout: number;
  Iout: number;
  fsw: number;
  L: number;
  C: number;
  D: number;
  deltaIL: number;
  deltaVout: number;
  iLpeak: number;
  iLrms: number;
  iSwitchPeak: number;
  iSwitchRms: number;
  efficiency: number;
}
```

Plus `waveform(d, samplesPerPeriod)` returns `{ t: number; vSwitch: number;
iL: number }[]` for one period. Synchronous to switching period, so the plot
always covers exactly one cycle regardless of fsw input.

Loss model (v1): conduction only.
`Pcond = I²_switch,rms * Rds_on + I_diode,avg * Vf`. Switching losses not
modeled — see Skipped.

## Module structure (matches existing pattern)

```
src/modules/smps-buck/module.ts
src/modules/smps-boost/module.ts
src/modules/smps-buckboost/module.ts
src/modules/smps-flyback/module.ts
src/modules/smps-forward/module.ts
src/math/converter.ts
tests/math/converter.test.ts
```

5 new imports + 5 new entries in `src/registry.ts`.
`AGENTS.md`: Vermogenselektronica joins the course list.

## Testing

`tests/math/converter.test.ts` — node:test. One `describe` per topology,
happy-path assertions on the canonical textbook numbers
(e.g. buck: Vin=24, Vout=12, Iout=2A, fsw=100kHz, L=47µH → D=0.5, ΔiL≈2.13A,
ΔVout ≈ ΔiL/(8*f*C), with C=22µF).

## Skipped (deliberate, ponytail)

- **Switching losses** (gate charge, Coss) — needs capacitance + Rgate inputs,
  most users won't have them. Add when a user asks.
- **Thermal model** (junction temp from RθJA) — separate concern, no UI need
  yet.
- **DCM (discontinuous conduction mode)** — CCM only in v1. The `simulateXXX`
  helpers can flag DCM when Iout < ΔiL/2 / (1-D), calculator shows a warning,
  no separate DCM math. Add full DCM when someone studies it.
- **Tapped/SEPIC/Cuk** — not in the five picked.
- **Per-topology dropdown / single combined SMPS card** — see Approach.
  Pattern says one folder per card; we follow.

## Approach (rejected alternatives)

- **Single combined "SMPS" module with dropdown**: rejected. One file, less
  code, but breaks per-card discoverability and bloats the file. Existing
  pattern is one module folder per card.
- **Two grouped modules ("basic" + "isolated")**: rejected. Same discoverability
  cost, less obvious.

## Style

- ponytail: no premature abstractions. The five modules deliberately copy
  the pid-tuner skeleton — same widget order, same plot positioning.
- No new dependencies. uPlot already in package.json.
