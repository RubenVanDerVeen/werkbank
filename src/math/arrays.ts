// Uniform linear array (ULA) array factor and derived quantities.
// ponytail: λ-normalized (λ=1) throughout; k = 2π/λ = 2π.

// Normalized array factor |AF(θ)|, peak = 1 at the main beam.
// θ in radians measured from the array axis (broadside at θ = π/2).
export function arrayFactor(theta: number, N: number, d: number, alpha: number, k: number): number {
  const psi = k * d * Math.cos(theta) + alpha;
  const num = Math.sin((N * psi) / 2);
  const den = N * Math.sin(psi / 2);
  if (Math.abs(den) < 1e-12) return 1; // ψ → 0 limit → main-beam maximum
  return Math.abs(num / den);
}

// Interior null angles (degrees) strictly in (0°, 180°).
export function nulls(N: number, d: number, alpha: number, k: number): number[] {
  const kd = k * d;
  if (kd === 0) return []; // ponytail: degenerate d=0 guard
  const out: number[] = [];
  for (let m = 1; m < N; m++) {
    for (const s of [1, -1]) {
      const psi = (s * 2 * Math.PI * m) / N;
      const cosTheta = (psi - alpha) / kd;
      if (Math.abs(cosTheta) < 1 - 1e-9) {
        const theta = (Math.acos(cosTheta) * 180) / Math.PI;
        if (theta > 1e-6 && theta < 180 - 1e-6) out.push(theta);
      }
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

// Broadside half-power beamwidth in degrees (approx; valid for α = 0).
export function broadsideHpbw(N: number, d: number, lambda: number): number {
  return ((0.886 * lambda) / (N * d)) * (180 / Math.PI);
}

// Main-beam direction (degrees) from progressive phase α.
// ψ = 0 → cos θ₀ = -α/(k·d). N unused (geometry-only), kept per spec API.
export function scanAngle(N: number, d: number, alpha: number, k: number): number {
  void N; // ponytail: N unused for scan direction; kept in signature per spec
  const denom = k * d;
  if (denom === 0) return 90;
  const cosTheta = -alpha / denom;
  if (cosTheta > 1) return 0;
  if (cosTheta < -1) return 180;
  return (Math.acos(cosTheta) * 180) / Math.PI;
}

// Grating lobes appear (broadside) when d > λ.
export function hasGratingLobe(d: number, lambda: number): boolean {
  return d > lambda; // ponytail: broadside-only GL check; scanned arrays GL earlier
}

// Element pattern: isotropic = 1, short dipole = |sin θ|.
export function elementPattern(theta: number, kind: 'isotropic' | 'dipole'): number {
  return kind === 'isotropic' ? 1 : Math.abs(Math.sin(theta)); // ponytail: short-dipole only
}