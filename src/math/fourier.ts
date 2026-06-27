export type Waveform = 'square' | 'triangle' | 'sawtooth' | 'pulse';

export function squareWaveCoeffs(N: number): number[] {
  const a: number[] = new Array(N + 1).fill(0);
  for (let n = 1; n <= N; n += 2) a[n] = 4 / (n * Math.PI);
  return a;
}

export function triangleWaveCoeffs(N: number): number[] {
  const a: number[] = new Array(N + 1).fill(0);
  for (let n = 1; n <= N; n += 2) a[n] = (8 / (n * n * Math.PI * Math.PI)) * Math.sin((n * Math.PI) / 2);
  return a;
}

export function sawtoothWaveCoeffs(N: number): number[] {
  const a: number[] = new Array(N + 1).fill(0);
  for (let n = 1; n <= N; n++) a[n] = (2 * ((-1) ** (n + 1))) / (n * Math.PI);
  return a;
}

export function pulseWaveCoeffs(N: number, duty = 0.5): number[] {
  const a: number[] = new Array(N + 1).fill(0);
  a[0] = duty;
  for (let n = 1; n <= N; n++) a[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return a;
}

export function coefficientsFor(wave: Waveform, N: number): number[] {
  switch (wave) {
    case 'square': return squareWaveCoeffs(N);
    case 'triangle': return triangleWaveCoeffs(N);
    case 'sawtooth': return sawtoothWaveCoeffs(N);
    case 'pulse': return pulseWaveCoeffs(N);
  }
}

// ponytail: cosine series convention — coefficients match the even-aligned waveform
// (e.g. square wave is +1 near t=0, -1 near t=T/2). Reconstruction is shifted by T/4
// from the odd-aligned sampleWaveform convention. Use the same convention for visualization.
export function partialSum(a: number[], t: number, period = 1): number {
  const w0 = (2 * Math.PI) / period;
  let s = a[0] ?? 0;
  for (let n = 1; n < a.length; n++) s += (a[n] ?? 0) * Math.cos(n * w0 * t);
  return s;
}

export function sampleWaveform(wave: Waveform, t: number, period = 1): number {
  const x = ((t / period) % 1 + 1) % 1;
  switch (wave) {
    case 'square': return x < 0.5 ? 1 : -1;
    case 'triangle': return 4 * Math.abs(x - 0.5) - 1;
    case 'sawtooth': return 2 * x - 1;
    case 'pulse': return x < 0.5 ? 1 : 0;
  }
}