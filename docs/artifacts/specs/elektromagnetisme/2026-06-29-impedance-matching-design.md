# Impedance Matching Networks — Module Design

- **Module ID:** `impedance-matching`
- **Course:** Hoogfrequenttechniek
- **Date:** 2026-06-29
- **Status:** proposed
- **Outline slot:** SP-10 in `2026-06-29-elektromagnetisme-outline.md`

## Goal

Make the three classic lossless matching techniques concrete and visual: given a
load `ZL` and a real system impedance `Z0`, compute the L-network component
values, the λ/4 transformer impedance, or the single-stub distance/length — and
show each match trajectory on the Smith chart (load → intermediate → center).

## Dependencies

- **Foundation plan `2026-06-29-foundation.md` must be merged first.** This
  module imports, and does not redefine:
  - `src/math/tl.ts` → `zToGamma`, `gammaToZ`, `swr`, `zinLossless(zL, betaL, z0)`, `quarterWaveZ(zL, z0)`.
  - `src/ui/smith.ts` → `smithChart(host, {z0?, title?})` returning `{update(points: {z: Complex, label?}[])}`.
  - `src/math/complex.ts` → `Complex`, `cadd`, `cmul`, `cdiv`, `cscale`, `cabs`.
- No other module's `src/math/<x>.ts` is touched.

## Scope

### In scope

- **L-network:** both solutions, auto-selecting topology from `Re(ZL)` vs `Z0`:
  - `Re(ZL) ≥ Z0` → shunt reactance across load, then series reactance (cancels residual imag).
  - `Re(ZL) < Z0` → series reactance, then shunt reactance across the combination.
  - `Q = sqrt(R_high/R_low − 1)`.
  - Component values (L in H, C in F) from `ω = 2πf`.
- **λ/4 transformer:** `Z0' = sqrt(Z0 · Re(ZL))` for a real load; reject complex
  `ZL` (reactance must be cancelled first).
- **Single-stub:** distance `d` from load where `Re(Yin) = 1/Z0`, plus
  short-circuited and open-circuited stub lengths that cancel `Im(Yin)`. Both
  solutions in `0 ≤ d < λ/2`.

### Out of scope (ponytail)

- **Double-stub matching** — deferred. `// ponytail: single-stub covers the
  stub-matching concept; double-stub adds a second stub at fixed spacing — add
  when a two-stub spacing problem is actually needed.` See Future work.
- **Lossy / frequency-dependent components** — ideal L, C, ideal lossless lines.
  `// ponytail: ideal reactances; Q of real components is a later concern.`
- **Broadband / multi-section matching** — single-frequency match only.
- **Physical stub as shunt vs series** — shunt stub only (the textbook default).
- **Click-to-place interaction on the Smith chart** — that lives in the
  `smith-chart` module (SP-9); here the chart is a read-only trajectory display.

## Requirements

### R1 — Inputs

- `matchType` selector: `L-network` | `λ/4 transformer` | `Single-stub`
  (default `L-network`).
- `ZL_re` slider (1–500 Ω, step 1, default 100).
- `ZL_im` slider (−200–200 Ω, step 1, default 0).
- `Z0` slider (10–200 Ω, step 1, default 50).
- `f` slider (100–5000 MHz, step 10, default 1000).

### R2 — Readouts (3 sig figs)

- **L-network:** for each of the two solutions — shunt element (kind + value in
  nH or pF, or `—` if absent), series element likewise, and `Q`.
- **λ/4:** `Z0'` in Ω, or an `error: λ/4 requires real ZL` note when `|Im(ZL)| > 0`.
- **Single-stub:** for each solution — `d` (in λ), `lShort` (in λ), `lOpen` (in λ).
- **All:** `|Γ|` after the match (match quality, ≈ 0 on a valid match) and the
  pre-match `|Γ|` for reference.

### R3 — Plot

`smithChart` (foundation) with the match trajectory as labelled points:
- **L-network:** `ZL` → intermediate `Z` after the first element → `Z0` (center).
- **λ/4:** `ZL` → `Z0` (center). `// ponytail: endpoints only; the constant-|Γ|
  arc is implied.`
- **Single-stub:** `ZL` → `Z(d)` at the stub plane → `Z0` (center).

### R4 — Error handling

- λ/4 with `|Im(ZL)| > 1e-9` → throw `quarterWaveMatch: zL must be real`; UI
  catches and shows the message in place of the readout.
- L-network with no real solution (only happens when `Re(ZL) = Z0` AND the
  discriminant is negative, which cannot occur for a physical passive load, but
  the branch is guarded) → `solutions: []`.
- Single-stub when `|Γ_L| ≥ 1` (pure reactance / short / open) → `solutions: []`.

## Math / code layout

`src/math/matching.ts` (pure, imports `complex.ts` + `tl.ts`):

```
lNetwork(zL, z0, f) -> { solutions: LSolution[]; q }
  LSolution = { order: 'shunt-series' | 'series-shunt'; shunt: Element; series: Element }
  Element   = { kind: 'L'|'C'|null; value: number }   // L: Henry, C: Farad, null: absent
  // Re(zL) >= z0: Bp = -BL ± sqrt(GL*(1/z0 - GL)); Xs = -(BL+Bp)/(GL²+(BL+Bp)²)·z0
  // Re(zL) <  z0: Xs = -XL ± sqrt(RL*(z0 - RL));    Bp = (XL+Xs)/(RL*z0)

applyLNetwork(zL, z0, sol, f) -> Complex    // Zin after the network (for |Γ| + Smith trajectory)

quarterWaveMatch(zL, z0) -> number          // sqrt(z0 * Re(zL)); throws if Im(zL)≠0

singleStub(zL, z0) -> { solutions: StubSolution[] }   // f dropped: wavelengths are f-independent
  StubSolution = { d_wl; lShort_wl; lOpen_wl }        // all in wavelengths, 0 <= d < 0.5
  // sweep d in [0, 0.5) λ; keep where |Re(Yin(d))·z0 − 1| < tol; dedupe by 0.01 λ.
  // short stub: cot(βl) = b  → lShort = atan(1/b)/(2π)  (mod 0.5)
  // open stub: tan(βl) = -b → lOpen  = atan(-b)/(2π)    (mod 0.5)
```

`// ponytail: singleStub uses a 5000-point sweep + tolerance, not closed-form.
// Closed form exists (Γ-rotation) but the sweep is robust for complex ZL and
// cheap; upgrade to closed-form only if performance matters (it won't).`

Files:
- `src/math/matching.ts` (above).
- `src/modules/impedance-matching/module.ts` — sliders + `smithChart` + readouts.
- One import line appended to `src/registry.ts`.

## Tests

`tests/math/matching.test.ts` (tolerance `1e-9` for closed-form, `0.01` for the
sweep-derived stub lengths):

- `quarterWaveMatch({re:100,im:0}, 50)` → `70.7106781…` (`sqrt(5000)`).
- `quarterWaveMatch({re:50,im:1}, 50)` → throws (complex load).
- `lNetwork({re:50,im:100}, 50, 1e9)`:
  - `q === 0`.
  - Sol 0 (`order: 'shunt-series'`): shunt `C ≈ 2.5465 pF`, series `L ≈ 15.9155 nH`.
  - Sol 1: shunt `kind === null`, series `C ≈ 1.5915 pF` (degenerate — just cancels reactance).
  - `applyLNetwork(…, sol0, 1e9)` ≈ `{50, 0}` (matched).
- `lNetwork({re:100,im:0}, 50, 1e9)`:
  - `q === 1`.
  - Sol 0: shunt `C ≈ 1.5915 pF`, series `L ≈ 7.9577 nH`.
  - Sol 1: shunt `L ≈ 15.9155 nH`, series `C ≈ 3.1831 pF`.
- `singleStub({re:100,im:0}, 50)`:
  - 2 solutions; sorted `d_wl ≈ {0.152, 0.348}` (±0.01).
  - Sorted `lShort_wl ≈ {0.152, 0.348}`; sorted `lOpen_wl ≈ {0.098, 0.402}`.
- `singleStub({re:50,im:100}, 50)`:
  - 2 solutions; sorted `d_wl ≈ {0.250, 0.375}`; sorted `lShort_wl ≈ {0.0738, 0.4262}`.
- Registry smoke: `impedance-matching` present with `course === 'Hoogfrequenttechniek'`.

Reference values were generated and verified against an independent node script
(L solutions re-checked by applying the network and confirming `Zin → Z0`;
stub lengths re-checked via `Γ_L · e^{−j2βd}` rotation).

## UI/UX

- Inputs → Smith chart → readouts. Icon: `Γ`.
- Card description: "Impedance matching: L-networks, λ/4 transformer, single-stub — with Smith-chart trajectory."
- `smithChart(host, { z0: Z0.value(), title: 'Match trajectory' })`; on each
  `update`, call `smith.update(trajectory)` where `trajectory` is built per
  `matchType` (see R3) from the matching functions and `applyLNetwork` /
  `zinLossless`.

## Ponytail simplifications

- Ideal L/C and ideal lossless lines; no component Q, no dielectric ε_r.
- λ/4 trajectory shown as endpoints only.
- Single-stub solved by sweep, not closed-form.
- Double-stub deferred.
- `f` dropped from `singleStub` signature (wavelengths are f-independent; UI
  computes physical length as `wl · c / f` if ever needed).

## Future work

- Double-stub matching (two stubs at fixed spacing; solve for two stub lengths).
- Closed-form single-stub via Γ rotation (if the sweep ever proves too coarse).
- Frequency-swept match bandwidth (L/C have ω-dependence away from the design f).
- Lossy / finite-Q components and their effect on residual |Γ|.
