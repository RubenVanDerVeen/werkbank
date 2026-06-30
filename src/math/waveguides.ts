export type Mode = 'TE10' | 'TE20' | 'TE01' | 'TE11' | 'TM11';

// fc = (c/2)·sqrt((m/a)² + (n/b)²). Mode-agnostic: TE & TM share the formula.
export function cutoffFreq(m: number, n: number, a: number, b: number, c: number): number {
  return (c / 2) * Math.sqrt((m / a) ** 2 + (n / b) ** 2);
}

// vp = c / sqrt(1 − (fc/f)²); superluminal above cutoff. Throws below cutoff.
export function phaseVelocity(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('phaseVelocity: f ≤ fc (evanescent)');
  return c / Math.sqrt(1 - r * r);
}

// vg = c · sqrt(1 − (fc/f)²); subluminal, vp·vg = c². Throws below cutoff.
export function groupVelocity(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('groupVelocity: f ≤ fc (evanescent)');
  return c * Math.sqrt(1 - r * r);
}

// λg = λ0 / sqrt(1 − (fc/f)²), λ0 = c/f. Throws below cutoff.
// ponytail: brief wrote guideWavelength(f, fc); +c needed (λg needs λ0 = c/f).
export function guideWavelength(f: number, fc: number, c: number): number {
  const r = fc / f;
  if (r >= 1) throw new Error('guideWavelength: f ≤ fc (evanescent)');
  return c / f / Math.sqrt(1 - r * r);
}

// TE10 propagation field (t=0 real part). Ey is absolute; Hx, Hz are spatial
// shapes — absolute needs η_TE = ωμ/β, not in the signature.
// ponytail: Hx, Hz shapes; sign + relative structure (kc/β) correct.
export function te10Field(x: number, z: number, a: number, beta: number, E0: number): { Ey: number; Hx: number; Hz: number } {
  const sx = Math.sin((Math.PI * x) / a);
  const cx = Math.cos((Math.PI * x) / a);
  const cz = Math.cos(beta * z);
  const sz = Math.sin(beta * z);
  return {
    Ey: E0 * sx * cz,
    Hx: -sx * cz,                              // shape (÷ η_TE for absolute)
    Hz: (Math.PI / (a * beta)) * cx * sz,      // relative to Hx by kc/β = (π/a)/β
  };
}

// Transverse E-field pattern (real, signed) for the 5 selectable modes.
// fieldPlot auto-scales, so absolute amplitude is irrelevant; the Ex:Ey ratio is
// kept via (m/a):(n/b). Common jωμ/kc² (TE) / jβ/kc² (TM) factors are dropped.
// ponytail: pattern shape, not amplitude; single-digit m, n only.
export function modeField(mode: Mode, x: number, y: number, a: number, b: number): { Ex: number; Ey: number } {
  const pol = mode.slice(0, 2); // 'TE' | 'TM'
  const m = Number(mode[2]);
  const n = Number(mode[3]);
  const ax = (Math.PI * x) / a;
  const ay = (Math.PI * y) / b;
  if (pol === 'TE') {
    // Ex ∝ (n/b)·cos(mπx/a)·sin(nπy/b); Ey ∝ −(m/a)·sin(mπx/a)·cos(nπy/b)
    return {
      Ex: (n / b) * Math.cos(m * ax) * Math.sin(n * ay),
      Ey: -(m / a) * Math.sin(m * ax) * Math.cos(n * ay),
    };
  }
  // TM: Ex ∝ (m/a)·cos(mπx/a)·sin(nπy/b); Ey ∝ (n/b)·sin(mπx/a)·cos(nπy/b)
  return {
    Ex: (m / a) * Math.cos(m * ax) * Math.sin(n * ay),
    Ey: (n / b) * Math.sin(m * ax) * Math.cos(n * ay),
  };
}