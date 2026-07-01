// ponytail: scalar, frequency-independent gains; vacuum FSPL, no atmospheric losses.

export const C = 2.99792458e8; // speed of light, m/s

export function lambdaOf(f: number): number {
  if (f <= 0) throw new Error('frequency must be positive');
  return C / f; // ponytail: vacuum wavelength; medium effects out of scope
}

export function eirp(pt: number, gt: number): number {
  return pt * gt; // W
}

export function friis(pt: number, gt: number, gr: number, lambda: number, R: number): number {
  if (R <= 0 || lambda <= 0) throw new Error('range/frequency must be positive');
  return pt * gt * gr * Math.pow(lambda / (4 * Math.PI * R), 2); // W
}

export function fspl(R: number, f: number): number {
  // ponytail: vacuum; no gaseous/rain absorption. 20*log10(4*pi*R*f/C) dB.
  if (R <= 0 || f <= 0) throw new Error('range/frequency must be positive');
  return 20 * Math.log10((4 * Math.PI * R * f) / C); // dB
}

export function friisDbm(ptDbm: number, gtDb: number, grDb: number, R: number, f: number): number {
  return ptDbm + gtDb + grDb - fspl(R, f); // dBm
}

export function radarEq(pt: number, G: number, sigma: number, lambda: number, R: number): number {
  if (R <= 0 || lambda <= 0) throw new Error('range/frequency must be positive');
  // ponytail: monostatic (Gt=Gr=G); no bistatic geometry.
  return (pt * G * G * sigma * lambda * lambda) / (Math.pow(4 * Math.PI, 3) * Math.pow(R, 4)); // W
}

export function fadeMargin(prDbm: number, sensitivityDbm: number): number {
  return prDbm - sensitivityDbm; // dB
}