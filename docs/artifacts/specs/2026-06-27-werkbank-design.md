# Werkbank — Design Spec

**Date:** 2026-06-27
**Status:** Approved (brainstorming complete)
**Project home:** `C:\Users\ruben\Projects\Hobby\werkbank\`

## Overview

Werkbank is a static, single-page web app hosting calculators and visualizers for an Electrical Engineering student's coursework. v1 covers Regeltechniek (control systems) and Fourier analysis. The architecture is designed so adding a new course or module is a small, mechanical change.

**Stack:** Vanilla TypeScript + Vite. No framework. uPlot for time-series plots, custom SVG for s-plane and root-locus charts. Deployable as a static bundle (GitHub Pages or any static host).

**Persona:** one author (Ruben), single-user, no backend, no auth, no persistence.

## Goals

- Ship four useful tools for current courses: transfer function visualizer, PID tuner, Routh-Hurwitz analyzer, Fourier series plotter.
- Make adding a new module a one-folder, one-line-registry-entry operation.
- Make adding a new course a one-section operation on the homepage.
- Keep the math engine pure-function and unit-tested so the UI can be rewritten without re-validating formulas.
- Minimal Academic visual style: light background, serif headings, generous whitespace, no decorative chrome.

## Non-Goals (v1)

- Multi-user, accounts, sync, or backend of any kind.
- Persistence across sessions (refresh = reset to home).
- URL routing (single page; modules mount inline).
- Mobile-first layout (desktop-first; mobile is best-effort).
- More than the four listed modules.
- Internationalization. UI copy is English; code identifiers are English; user-facing labels may be Dutch where natural.

## Architecture

Small-tier layout per project-standardization:

```
werkbank/
├── AGENTS.md
├── CLAUDE.md                  # one-line shim: "@AGENTS.md"
├── README.md
├── CHANGELOG.md
├── STANDARDS.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.ts                # bootstrap, renders home, dispatches to module.render
│   ├── registry.ts            # imports every modules/*/module.ts
│   ├── ui/
│   │   ├── layout.ts          # shared header + content slot
│   │   ├── home.ts            # course-grouped module grid
│   │   ├── plots.ts           # uPlot helpers + custom SVG helpers
│   │   └── inputs.ts          # shared input widgets (poly coeff row, slider)
│   ├── math/
│   │   ├── tf.ts              # transfer function type + algebra
│   │   ├── bode.ts            # magnitude/phase evaluation
│   │   ├── step.ts            # closed-loop step response (numerical)
│   │   ├── routh.ts           # Routh array builder
│   │   └── fourier.ts         # series coefficients + partial-sum synthesis
│   └── modules/
│       ├── transfer-fn/module.ts
│       ├── pid-tuner/module.ts
│       ├── routh-hurwitz/module.ts
│       └── fourier-series/module.ts
├── styles/
│   ├── tokens.css             # color, spacing, type scale
│   ├── base.css               # reset + typography
│   └── home.css
└── tests/
    ├── math/
    │   ├── tf.test.ts
    │   ├── bode.test.ts
    │   ├── step.test.ts
    │   ├── routh.test.ts
    │   └── fourier.test.ts
    └── smoke.test.ts          # registry import + per-module contract check
```

No `.agents/`, no `docs/artifacts/specs/` beyond this file in v1. Both wait until the project graduates (per project-standardization small-tier rules).

## Module contract

Every module file exports the same shape. The registry imports them at build time, the homepage reads them to render cards, and the dispatcher calls `render(host)` when a card is clicked.

```ts
export interface Module {
  id: string;            // 'transfer-fn'
  title: string;         // 'Transfer Function'
  course: string;        // 'Regeltechniek'
  description: string;   // 1-sentence card blurb
  icon: string;          // single character or short symbol
  render: (host: HTMLElement) => void;
}

export const module: Module = { /* … */ };
```

Adding a module:

1. Create `src/modules/<id>/module.ts` exporting the contract.
2. Add one line to `src/registry.ts`: `import { module as transferFn } from './modules/transfer-fn/module';`
3. (Optional) Add a course section in `src/ui/home.ts` if the course is new.

That's the entire expansion surface.

## Module designs

### `transfer-fn` — Transfer Function Visualizer

- **Inputs:** numerator and denominator coefficients as comma-separated text fields (e.g. `num: 1, 0` → `den: 1, 3, 2`).
- **Plots:** pole-zero map (s-plane, SVG); Bode magnitude + phase (uPlot); step response (uPlot); root locus (SVG, toggleable).
- **Read-outs:** pole list, zero list, DC gain, system type, stability verdict.
- **UX:** paste a MATLAB-style vector directly; clear button.

### `pid-tuner` — PID Closed-Loop Tuner

- **Inputs:** plant transfer function (same input as above); controller form (P / PI / PID); Kp, Ki, Kd sliders.
- **Plots:** closed-loop step response (setpoint vs. actual); control signal `u(t)`; closed-loop pole map.
- **Read-outs:** overshoot %, settling time (2%), steady-state error, ITAE.
- **Behavior:** plots update live as sliders move. Toggle between setpoint-change and disturbance-response modes.

### `routh-hurwitz` — Stability Analyzer

- **Inputs:** characteristic polynomial coefficients, highest power first.
- **Output:** Routh array rendered step-by-step with row labels; stability verdict; auxiliary-equation warning when a row of zeros appears.
- **Plot:** roots of the polynomial on the s-plane.

### `fourier-series` — Fourier Series Plotter

- **Inputs:** waveform picker (square, triangle, sawtooth, pulse train); number of harmonics `N` (slider, 1–50).
- **Plots:** time-domain partial-sum reconstruction with `N` harmonics stacked against the original; magnitude spectrum of coefficients.
- **Behavior:** dragging `N` animates the partial sum rebuilding the waveform. Gibb's phenomenon is visually obvious.

## Data flow

```
            ┌─────────────────────────┐
            │  registry.ts            │
            │  imports every module.ts│
            └────────────┬────────────┘
                         ▼
   ┌────────────────────────────────────────────┐
   │  main.ts                                   │
   │   - on load: render home                   │
   │   - on card click: call module.render(host)│
   └────────────────────────────────────────────┘
            │                  │
            ▼                  ▼
   pure math (src/math/*)   per-module state
   tf, bode, step,          - holds inputs
   routh, fourier           - holds last result
   - testable               - module-local only
   - no DOM
```

State is local to each module. No global state, no router, no URL params, no localStorage. Page refresh returns to the home grid. The math engine has zero DOM access — every function is `(inputs) → result`, which makes unit testing trivial and means the UI can be rewritten without re-validating formulas.

## Visual style

Minimal Academic. Light background (`#fafaf7`), serif headings (Georgia or similar system serif), generous whitespace, monospace only for code/polynomial input. Course labels as small uppercase tracking-wide tags above module cards. A dashed "future courses" placeholder card keeps the grid balanced when a section is empty.

## Testing + verification

**Math:** one test file per math module under `tests/math/`. Each test is 1–3 assertions: one known-good case and one edge case.

- `tf.test.ts` — pole/zero extraction from `(s+1)/(s+2)`
- `bode.test.ts` — magnitude/phase at known `ω`
- `step.test.ts` — closed-loop step shape (rise, overshoot, settle)
- `routh.test.ts` — array correctness plus zero-row auxiliary-equation branch
- `fourier.test.ts` — square-wave coefficients match analytic formula

**Module UI:** no unit tests. `tests/smoke.test.ts` imports `src/registry.ts` and asserts each module file exports the contract. Visual correctness is verified by manual click-through.

**Runner:** Node's built-in `node --test` (zero deps). `npm test` runs the whole tree.

**Verification gate before claiming v1 complete:**

1. `npm run build` exits 0 (Vite production build clean).
2. `npm test` exits 0 (all math + smoke pass).
3. Manual click-through in `npm run dev`: each of the four modules opens, accepts inputs, renders the expected plots and read-outs.

## Git workflow

- No commit/push without explicit user instruction.
- All work on `main`. No branches.
- Commit message style: Conventional Commits 1.0.0 (`<type>(<scope>): <description>`), Keep a Changelog 1.1.0 format in `CHANGELOG.md`.

## Standards stack applied

- kebab-case ASCII-only paths
- English structural paths, Dutch allowed in user-facing labels
- ISO 8601 date prefix where dates appear in filenames
- Conventional Commits + Keep a Changelog
- IEEE 830-style requirements phrasing in this spec

## Future work (post-v1)

Not in scope; listed so expansion is obvious.

- Additional courses: Elektronica 2, Telecom, Energietechniek, NetwerkAnalyse, Digitale Techniek.
- Additional modules per existing course: Nyquist plot (Regeltechniek), FFT analyzer (Fourier).
- Import/export of state via URL hash.
- Persistent per-module last-input via localStorage.
- Dark mode toggle.
- Graduate to medium tier once a second on-demand topic file would naturally exist.