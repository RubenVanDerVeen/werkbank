// Plane-wave incidence: Snell's law and Fresnel coefficients.
// All angles in radians. Non-magnetic media (μ₁ = μ₂).

export function snell(n1: number, n2: number, theta1: number): number {
  const s = (n1 / n2) * Math.sin(theta1);
  if (Math.abs(s) > 1) return NaN; // ponytail: TIR → NaN; complex θ₂ not represented
  return Math.asin(s);
}

export function fresnelPerp(n1: number, n2: number, theta1: number): number {
  // Γ⊥ = (n1 cosθ1 − n2 cosθ2) / (n1 cosθ1 + n2 cosθ2)
  const theta2 = snell(n1, n2, theta1);
  if (Number.isNaN(theta2)) return NaN; // ponytail: TIR → |Γ|=1 but complex; signal via NaN
  const c1 = Math.cos(theta1), c2 = Math.cos(theta2);
  return (n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2);
}

export function fresnelParallel(n1: number, n2: number, theta1: number): number {
  // Γ∥ = (n2 cosθ1 − n1 cosθ2) / (n2 cosθ1 + n1 cosθ2)
  const theta2 = snell(n1, n2, theta1);
  if (Number.isNaN(theta2)) return NaN;
  const c1 = Math.cos(theta1), c2 = Math.cos(theta2);
  return (n2 * c1 - n1 * c2) / (n2 * c1 + n1 * c2);
}

export function criticalAngle(n1: number, n2: number): number | null {
  if (n1 <= n2) return null; // no TIR when entering a denser medium
  return Math.asin(n2 / n1);
}

export function brewsterAngle(n1: number, n2: number): number {
  return Math.atan(n2 / n1);
}