// EM plane-wave parameters. SI units throughout (μ, ε, σ, ω in rad/s).
export const MU0 = 4 * Math.PI * 1e-7; // vacuum permeability, H/m
export const EPS0 = 8.8541878128e-12; // vacuum permittivity, F/m

// η = sqrt(μ/ε). Free space -> 376.73 Ω.
export function intrinsicImpedance(mu: number, eps: number): number {
  return Math.sqrt(mu / eps);
}

// γ = α + jβ from the exact γ² = (jωμ)(σ + jωε) = -ω²με + jωμσ.
// Reduces to lossless (α=0), low-loss (α=(σ/2)·√(μ/ε)), and good-conductor
// (α=β=√(ωμσ/2)) regimes automatically.
// ponytail: closed-form real sqrt, no complex-sqrt dependency.
export function propagationConst(
  omega: number,
  mu: number,
  eps: number,
  sigma: number,
): { alpha: number; beta: number } {
  const a = -omega * omega * mu * eps; // Re(γ²)
  const b = omega * mu * sigma; //        Im(γ²)
  const mag = Math.hypot(a, b); //        |γ²|
  const alpha = Math.sqrt(Math.max(0, (mag + a) / 2));
  const beta = Math.sqrt(Math.max(0, (mag - a) / 2));
  return { alpha, beta };
}

// δ = sqrt(2/(ωμσ)). Good-conductor skin depth; ∞ when σ = 0.
export function skinDepth(omega: number, mu: number, sigma: number): number {
  if (sigma <= 0) return Infinity;
  return Math.sqrt(2 / (omega * mu * sigma));
}

// v = 1/sqrt(με). Free space -> c.
export function phaseVelocity(mu: number, eps: number): number {
  return 1 / Math.sqrt(mu * eps);
}

// ⟨S⟩ = E₀²/(2η). Time-average Poynting magnitude for a plane wave.
export function poyntingAvg(E0: number, eta: number): number {
  return (E0 * E0) / (2 * eta);
}