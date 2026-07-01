// Physical constants
export const EPS0 = 8.854187817e-12; // vacuum permittivity [F/m]
export const C = 299792458;           // speed of light [m/s]

// Faraday's law: emf = -N·dΦ/dt, Φ = B·A·cosθ
// ponytail: A and θ constant; only B varies → dΦ/dt = A·cosθ·dB/dt
// B is the instantaneous field (context); dBdt drives the emf
export function faradayEmf(N: number, B: number, A: number, theta: number, dBdt: number): number {
  return -N * A * Math.cos(theta) * dBdt;
}

// Motional emf: emf = B·L·v (conductor moving perpendicular to B)
export function motionalEmf(B: number, L: number, v: number): number {
  return B * L * v;
}

// Self-inductance: L = N·Φ / I
export function selfInductance(N: number, phi: number, I: number): number {
  if (I === 0) throw new Error('I = 0 (division by zero)');
  return (N * phi) / I;
}

// Mutual inductance: M = N₂·Φ₂₁ / I₁
export function mutualInductance(N2: number, phi21: number, I1: number): number {
  if (I1 === 0) throw new Error('I1 = 0 (division by zero)');
  return (N2 * phi21) / I1;
}

// Displacement current: Id = ε₀·dΦE/dt
export function displacementCurrent(eps0: number, dPhiE_dt: number): number {
  return eps0 * dPhiE_dt;
}

// Time series for sinusoidal B(t) = B_peak·sin(2πft)
// Returns Φ(t) and emf(t) for plotting
export function inductionTimeSeries(
  N: number, B_peak: number, A: number, theta: number, f: number,
  tMax: number, n: number,
): { phi: { x: number; y: number }[]; emf: { x: number; y: number }[] } {
  const w = 2 * Math.PI * f;
  const phi: { x: number; y: number }[] = [];
  const emf: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = (tMax * i) / (n - 1);
    const B = B_peak * Math.sin(w * t);
    const dBdt = B_peak * w * Math.cos(w * t);
    phi.push({ x: t, y: B * A * Math.cos(theta) });
    emf.push({ x: t, y: -N * A * Math.cos(theta) * dBdt });
  }
  return { phi, emf };
}