// Magnetostatics: Biot-Savart, Ampère's law, inductance, reluctance.
export const MU_0 = 4 * Math.PI * 1e-7; // H/m, textbook exact value

// Infinite straight wire, B at perpendicular distance r (magnitude).
export function wireField(I: number, r: number): number {
  if (r <= 0) throw new Error('wireField: r must be > 0');
  return (MU_0 * I) / (2 * Math.PI * r);
}

// 2D field of an infinite wire (current +z) at (wx,wy), evaluated at (x,y).
export function wireField2D(I: number, wx: number, wy: number, x: number, y: number): { Bx: number; By: number } {
  const dx = x - wx, dy = y - wy;
  const rho2 = dx * dx + dy * dy;
  if (rho2 < 1e-12) return { Bx: 0, By: 0 };
  const k = (MU_0 * I) / (2 * Math.PI * rho2);
  return { Bx: -k * dy, By: k * dx };
}

// Circular loop on axis, B at distance z from center (loop radius R).
export function loopField(I: number, R: number, z: number): number {
  if (R <= 0) throw new Error('loopField: R must be > 0');
  const s = R * R + z * z;
  return (MU_0 * I * R * R) / (2 * s * Math.sqrt(s));
}

// Finite straight segment from (x1,0) to (x2,0), B at (0,d). Signed (+z).
export function segmentField(I: number, d: number, x1: number, x2: number): number {
  if (d <= 0) throw new Error('segmentField: d must be > 0');
  const f = (x: number) => x / Math.sqrt(x * x + d * d);
  return ((MU_0 * I) / (4 * Math.PI * d)) * (f(x2) - f(x1));
}

// Ideal long solenoid interior field. n = turns per unit length.
export function solenoidField(n: number, I: number): number {
  return MU_0 * n * I;
}

// Solenoid inductance: L = μ₀N²A/l.
export function solenoidInductance(N: number, A: number, l: number): number {
  if (l <= 0) throw new Error('solenoidInductance: l must be > 0');
  return (MU_0 * N * N * A) / l;
}

// Ideal toroid field at mean radius r: B = μ₀NI/(2πr).
export function toroidField(N: number, I: number, r: number): number {
  if (r <= 0) throw new Error('toroidField: r must be > 0');
  return (MU_0 * N * I) / (2 * Math.PI * r);
}

// Toroid inductance: L = μ₀N²A/(2πr).
export function toroidInductance(N: number, A: number, r: number): number {
  if (r <= 0) throw new Error('toroidInductance: r must be > 0');
  return (MU_0 * N * N * A) / (2 * Math.PI * r);
}

// Magnetic reluctance: ℛ = l/(μ·A).
export function reluctance(l: number, mu: number, A: number): number {
  if (mu <= 0 || A <= 0) throw new Error('reluctance: μ and A must be > 0');
  return l / (mu * A);
}

// Magnetic flux: Φ = NI/ℛ.
export function flux(N: number, I: number, rel: number): number {
  if (rel <= 0) throw new Error('flux: ℛ must be > 0');
  return (N * I) / rel;
}