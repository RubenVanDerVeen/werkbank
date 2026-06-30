export type DipoleType = 'hertzian' | 'halfwave';

// Normalized |F(θ)|, max = 1 at broadside (θ = π/2).
export function hertzianPattern(theta: number): number {
  return Math.abs(Math.sin(theta));
}

// Normalized |cos(π/2·cos θ)/sin θ|; already peaks at 1 at θ = π/2.
// ponytail: guard sin θ → 0 (endfire nulls at 0 and π); the limit is 0.
export function halfWavePattern(theta: number): number {
  const s = Math.sin(theta);
  if (Math.abs(s) < 1e-9) return 0;
  return Math.abs((Math.cos((Math.PI / 2) * Math.cos(theta))) / s);
}

// Hertzian radiation resistance: 80π²(l/λ)² [Ω].
export function hertzianRr(length: number, wavelength: number): number {
  return 80 * Math.PI * Math.PI * (length / wavelength) ** 2;
}

// Half-wave radiation resistance: textbook ≈ 73 Ω.
// ponytail: constant; arbitrary-length needs the full current integral.
export function halfWaveRr(): number {
  return 73;
}

// Directivity D (linear).
// ponytail: textbook constants for the two canonical dipoles; derive from the
// pattern integral (4π/ΩA) if arbitrary dipoles are added.
export function directivity(type: DipoleType): number {
  return type === 'hertzian' ? 1.5 : 1.64;
}

// Directivity in dBi = 10·log10(D).
export function directivityDbi(type: DipoleType): number {
  return 10 * Math.log10(directivity(type));
}

// Half-power beamwidth [degrees].
// ponytail: textbook constants; derive numerically from |F|² = ½ if needed.
export function hpbw(type: DipoleType): number {
  return type === 'hertzian' ? 90 : 78;
}

// Radiated power: Prad = ½·I₀²·Rr.
export function radiatedPower(I0: number, Rr: number): number {
  return 0.5 * I0 * I0 * Rr;
}