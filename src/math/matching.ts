import type { Complex } from './complex.ts';
import { cadd, cmul, cdiv } from './complex.ts';
import { zinLossless } from './tl.ts';

export type ElementKind = 'L' | 'C' | null;
export interface Element {
  kind: ElementKind;
  value: number; // L: Henry, C: Farad, null: 0
}

export interface LSolution {
  order: 'shunt-series' | 'series-shunt';
  shunt: Element;
  series: Element;
}
export interface LResult {
  solutions: LSolution[];
  q: number;
}

const EPS = 1e-9;

// series reactance X (ohms): X>0 -> L=X/w, X<0 -> C=-1/(w*X), X~0 -> absent.
function seriesEl(X: number, w: number): Element {
  if (Math.abs(X) < EPS) return { kind: null, value: 0 };
  return X > 0 ? { kind: 'L', value: X / w } : { kind: 'C', value: -1 / (w * X) };
}
// shunt susceptance B (siemens): B>0 -> C=B/w, B<0 -> L=-1/(w*B), B~0 -> absent.
function shuntEl(B: number, w: number): Element {
  if (Math.abs(B) < EPS) return { kind: null, value: 0 };
  return B > 0 ? { kind: 'C', value: B / w } : { kind: 'L', value: -1 / (w * B) };
}

function reactanceOf(e: Element, w: number): number {
  if (e.kind === null) return 0;
  return e.kind === 'L' ? w * e.value : -1 / (w * e.value);
}
function susceptanceOf(e: Element, w: number): number {
  if (e.kind === null) return 0;
  return e.kind === 'C' ? w * e.value : -1 / (w * e.value);
}

// L-network: match ZL to real Z0. Two solutions; topology auto-selected by
// Re(ZL) vs Z0. Q = sqrt(R_high/R_low - 1).
export function lNetwork(zL: Complex, z0: number, f: number): LResult {
  const w = 2 * Math.PI * f;
  const RL = zL.re, XL = zL.im;
  const GL = RL / (RL * RL + XL * XL);
  const BL = -XL / (RL * RL + XL * XL);
  const solutions: LSolution[] = [];

  if (RL >= z0) {
    // shunt-then-series: shunt Bp across load -> Re(Zp)=z0, series Xs cancels Im(Zp).
    const disc = GL * (1 / z0 - GL);
    if (disc < 0) return { solutions, q: NaN };
    const sq = Math.sqrt(disc);
    for (const s of [1, -1]) {
      const Bp = -BL + s * sq;
      const Bsum = BL + Bp; // = s*sq
      const den = GL * GL + Bsum * Bsum; // = GL/z0 by construction
      const Xs = Bsum / den; // = -Im(Zp)
      solutions.push({ order: 'shunt-series', shunt: shuntEl(Bp, w), series: seriesEl(Xs, w) });
    }
  } else {
    // series-then-shunt: series Xs -> Re(1/Z1)=1/z0, shunt Bp cancels Im(1/Z1).
    const disc = RL * (z0 - RL);
    const sq = Math.sqrt(disc);
    for (const s of [1, -1]) {
      const Xs = -XL + s * sq;
      const Z1im = XL + Xs;
      const Bp = Z1im / (RL * z0);
      solutions.push({ order: 'series-shunt', series: seriesEl(Xs, w), shunt: shuntEl(Bp, w) });
    }
  }
  const q = Math.sqrt(Math.max(RL, z0) / Math.min(RL, z0) - 1);
  return { solutions, q };
}

// Z after the FIRST element of an L-network solution (for Smith trajectory mid-point).
// shunt-series: parallel of ZL and shunt element. series-shunt: ZL + jXs.
export function intermediateZ(zL: Complex, _z0: number, sol: LSolution, f: number): Complex {
  const w = 2 * Math.PI * f;
  if (sol.order === 'shunt-series') {
    if (sol.shunt.kind === null) return zL;
    const Bp = susceptanceOf(sol.shunt, w);
    const Zsh: Complex = { re: 0, im: -1 / Bp };
    return cdiv(cmul(zL, Zsh), cadd(zL, Zsh));
  }
  const Xs = reactanceOf(sol.series, w);
  return cadd(zL, { re: 0, im: Xs });
}

// Zin after applying an L-network solution (for |Γ| readout + Smith trajectory).
export function applyLNetwork(zL: Complex, z0: number, sol: LSolution, f: number): Complex {
  const w = 2 * Math.PI * f;
  const Xs = reactanceOf(sol.series, w);
  const Bp = susceptanceOf(sol.shunt, w);
  if (sol.order === 'shunt-series') {
    let Zp = zL;
    if (sol.shunt.kind !== null) {
      const Zsh: Complex = { re: 0, im: -1 / Bp }; // impedance of shunt admittance jBp
      Zp = cdiv(cmul(zL, Zsh), cadd(zL, Zsh));
    }
    return cadd(Zp, { re: 0, im: Xs });
  }
  const Z1 = cadd(zL, { re: 0, im: Xs });
  if (sol.shunt.kind === null) return Z1;
  const Zsh: Complex = { re: 0, im: -1 / Bp };
  return cdiv(cmul(Z1, Zsh), cadd(Z1, Zsh));
}

// λ/4 transformer characteristic impedance for a REAL load: Z0' = sqrt(z0 * Re(zL)).
// Throws if Im(zL) != 0 (cancel reactance first). The foundation quarterWaveZ
// gives Z0'^2/zL = z0 as the consistency check.
export function quarterWaveMatch(zL: Complex, z0: number): number {
  if (Math.abs(zL.im) > 1e-9) throw new Error('quarterWaveMatch: zL must be real (cancel reactance first)');
  if (zL.re <= 0) throw new Error('quarterWaveMatch: Re(zL) must be positive');
  return Math.sqrt(z0 * zL.re);
}

export interface StubSolution {
  d_wl: number; // distance from load, wavelengths (0 < d < 0.5)
  lShort_wl: number; // short-circuited stub length, wavelengths
  lOpen_wl: number; // open-circuited stub length, wavelengths
}
export interface StubResult {
  solutions: StubSolution[];
}

// ponytail: 5000-point sweep + tolerance, not closed form. Closed form exists
// (Gamma rotation) but the sweep is robust for complex ZL and cheap; upgrade
// only if performance matters (it won't).
export function singleStub(zL: Complex, z0: number): StubResult {
  const N = 5000;
  const tol = 0.005;
  const found: StubSolution[] = [];
  for (let i = 1; i < N; i++) {
    const d_wl = i / (2 * N); // 0 < d < 0.5 lambda
    const beta_d = 2 * Math.PI * d_wl;
    const t = Math.tan(beta_d);
    if (!isFinite(t)) continue;
    const Zd = zinLossless(zL, beta_d, z0);
    const Yd = cdiv({ re: 1, im: 0 }, Zd);
    const yRe = Yd.re * z0; // normalized conductance
    const yIm = Yd.im * z0; // normalized susceptance
    if (Math.abs(yRe - 1) < tol && Math.abs(yIm) < 1e3) {
      const b = yIm;
      let lShort = Math.atan(1 / b) / (2 * Math.PI); // cot(bl)=b -> tan(bl)=1/b
      if (lShort < 0) lShort += 0.5;
      let lOpen = Math.atan(-b) / (2 * Math.PI); // tan(bl)=-b
      if (lOpen < 0) lOpen += 0.5;
      found.push({ d_wl, lShort_wl: lShort, lOpen_wl: lOpen });
    }
  }
  // dedupe by 0.01 lambda
  const uniq: StubSolution[] = [];
  for (const s of found) {
    if (!uniq.some((u) => Math.abs(u.d_wl - s.d_wl) < 0.01)) uniq.push(s);
  }
  return { solutions: uniq };
}