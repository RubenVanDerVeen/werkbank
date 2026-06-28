# Elektronica1B Foundation — Complex Math & Bode Plot

- **Sub-project:** F (foundation)
- **Course:** Elektronica1B (shared infrastructure)
- **Date:** 2026-06-28
- **Status:** proposed

## Goal

Give the AC-frequency modules of Elektronica1B a single, tested complex-number
layer and a log-frequency magnitude/phase (Bode) plot helper. Today the codebase
has only an ad-hoc inline complex in `bode.ts` and a linear-x `linePlot`. This
foundation is depended on by `freq-response`, `active-filter`, and `oscillator`.

## Scope

### In scope

- `src/math/complex.ts` — a `Complex` type and pure arithmetic.
- `evalTfAtJw` / `magPhaseAtJw` — evaluate an existing `Tf` (from `tf.ts`) at
  `s = jω` and return the complex value / magnitude(dB)+phase(deg).
- `src/ui/acplot.ts` — `bodePlot(host, points, opts)`: two stacked uPlot charts
  (magnitude dB, phase deg) sharing a **log-frequency** x-axis.
- Refactor `bode.ts` to use `complex.ts` and drop the dead `evalPolyAtRealCoef`.

### Out of scope (ponytail)

- Symbolic algebra, higher-order `polyRoots` (already capped at n≤2 in `tf.ts`).
- S-plane charts (already exist via `svgPlot`).
- Any circuit-specific math — that lives in each module.
- Group-delay / Nyquist plots. `// ponytail: mag+phase only for v1`.

## Requirements

### R1 — Complex type and arithmetic

`Complex = { re: number; im: number }`. Pure functions:

| Fn | Definition |
|----|------------|
| `cadd(a,b)` | `{re:a.re+b.re, im:a.im+b.im}` |
| `csub(a,b)` | `{re:a.re-b.re, im:a.im-b.im}` |
| `cmul(a,b)` | `{re:a.re*b.re-a.im*b.im, im:a.re*b.im+a.im*b.re}` |
| `cdiv(a,b)` | divide by `|b|²`; throws on `b=0` |
| `cabs(a)` | `Math.hypot(a.re,a.im)` |
| `cphaseDeg(a)` | `Math.atan2(a.im,a.re)*180/π` |
| `cscale(a,k)` | `{re:a.re*k, im:a.im*k}` |
| `fromPolar(mag,phaseDeg)` | `{re:mag·cos, im:mag·sin}` |

### R2 — Transfer-function evaluation at jω

- `evalTfAtJw(tf: Tf, omega: number): Complex` — evaluate `num(jω)/den(jω)` using
  complex polynomial Horner (coefficients highest-power-first, as in `tf.ts`).
- `magPhaseAtJw(tf, omega): { magDb: number; phaseDeg: number }` — `20·log10(|H|)`
  and `cphaseDeg(H)`.

### R3 — Bode plot helper

`bodePlot(host, points: { omega: number; magDb: number; phaseDeg: number }[], opts?: { title?: string })`:

- Two stacked uPlot charts: top = magnitude (dB), bottom = phase (deg).
- x-axis = frequency in **Hz** (`omega/(2π)`), **logarithmic** (uPlot `distr: 3`).
- Mirrors `linePlot`'s construction (guarded CSS import already in `plots.ts`;
  `acplot.ts` imports uPlot the same way).
- Returns `{ update(points) }` like `linePlot`.

### R4 — bode.ts refactor

`bode()` keeps its signature and `BodePoint` type but computes via
`magPhaseAtJw`. Remove `evalPolyAtRealCoef` and the dead first computation.

## Math / code layout

- `src/math/complex.ts` — type + functions above.
- `src/math/bode.ts` — re-implemented on top of `complex.ts`.
- `src/ui/acplot.ts` — `bodePlot`.

## Tests

`tests/math/complex.test.ts`:

- `cmul({1,2},{3,4})` → `{-5,10}`.
- `cdiv({1,0},{0,1})` → `{0,-1}` (1/j = −j).
- `cabs({3,4})` → `5`.
- `cphaseDeg({0,1})` → `90`.
- `evalTfAtJw` for `H=1/(s+1)` (`num=[1]`, `den=[1,1]`) at `ω=1` →
  `magPhaseAtJw` gives `magDb ≈ -3.01`, `phaseDeg ≈ -45`.
- `bode()` still returns the same values after refactor (regression: reuse an
  existing `bode.test.ts` case, or assert `H=1/(s+1)` at `ω=1` → `-3.01 dB`).

`bodePlot` is DOM-only — covered by `npm run build`, not a unit test.

## UI/UX

No user-facing module. This is internal infrastructure; no card, no registry
entry. CHANGELOG gets an internal note only.

## Ponytail simplifications

- Mag+phase only, no group delay/Nyquist. `// ponytail: mag+phase Bode only`.
- `complex.ts` is plain `{re,im}` objects, no class/operator sugar.
  `// ponytail: plain objects, no Complex class`.

## Future work

- Reuse `complex.ts` to upgrade `tf.ts` `polyRoots` past n=2 if a later module
  needs higher-order pole solving.
