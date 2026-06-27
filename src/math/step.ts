import { type Poly, type Tf, polyEval } from './tf.ts';

export type StepPoint = { t: number; y: number };

// Numerical step response via state-space simulation. Convert TF to controller canonical form,
// then RK4-integrate the state equations driven by a unit step.
export function stepResponse(sys: Tf, tEnd: number, dt: number): StepPoint[] {
  const { A, B, C } = tfToCanonical(sys);
  const n = A.length;
  const x = new Array(n).fill(0);
  const out: StepPoint[] = [{ t: 0, y: C[0]! * x[0]! }];
  const steps = Math.ceil(tEnd / dt);
  for (let k = 0; k < steps; k++) {
    const t = k * dt;
    const xNext = rk4(x, A, B, 1, dt); // u=1 (unit step)
    for (let i = 0; i < n; i++) x[i] = xNext[i]!;
    const y = C.reduce((acc, c, i) => acc + c * x[i]!, 0);
    out.push({ t: t + dt, y });
  }
  return out;
}

// Unity-feedback closed-loop: T(s) = G(s) / (1 + G(s)) = num / (num + den).
export function closedLoop(plant: Tf, controllerNum: Poly): Tf {
  // For v1 assume controller num is scalar K; numerator of T is K * plant.num, denominator is K*plant.num + plant.den.
  const K = controllerNum[0] ?? 1;
  const num = scalePoly(plant.num, K);
  const den = polyAdd(num, plant.den);
  return { num, den };
}

function scalePoly(p: Poly, k: number): Poly { return p.map((c) => c * k); }
function polyAdd(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  const out: Poly = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    out[i] = (a[a.length - 1 - i] ?? 0) + (b[b.length - 1 - i] ?? 0);
  }
  return out.reverse();
}

function tfToCanonical(sys: Tf) {
  const n = sys.den.length - 1;
  // Normalize so leading den coeff is 1
  const a0 = sys.den[0]!;
  const den = sys.den.map((c) => c / a0);
  const num = sys.num.map((c) => c / a0);
  // Pad num to length n
  while (num.length < n) num.unshift(0);
  // Controller canonical form (SISO)
  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 1; i < n; i++) A[i - 1]![i] = 1;
  for (let i = 0; i < n; i++) A[n - 1]![i] = -(den[n - i] ?? 0);
  // Above simplified: assume n is small; for n<2 fallback handled below.
  if (n >= 2) {
    for (let i = 0; i < n; i++) A[n - 1]![i] = -(den[n - i] ?? 0);
  }
  const B = new Array(n).fill(0); B[n - 1] = num[num.length - 1] ?? 0;
  // C in observer canonical: depends on num coefficients; for step input shape we use y = C x where C is constructed below.
  const C = new Array(n).fill(0);
  for (let i = 0; i < n; i++) C[i] = num[n - 1 - i] ?? 0;
  return { A, B, C };
}

function rk4(x: number[], A: number[][], B: number[], u: number, dt: number): number[] {
  const f = (x: number[]) => matVec(A, x).map((v, i) => v + (B[i] ?? 0) * u);
  const k1 = f(x);
  const k2 = f(x.map((v, i) => v + 0.5 * dt * (k1[i] ?? 0)));
  const k3 = f(x.map((v, i) => v + 0.5 * dt * (k2[i] ?? 0)));
  const k4 = f(x.map((v, i) => v + dt * (k3[i] ?? 0)));
  return x.map((v, i) => v + (dt / 6) * ((k1[i] ?? 0) + 2 * (k2[i] ?? 0) + 2 * (k3[i] ?? 0) + (k4[i] ?? 0)));
}

function matVec(A: number[][], x: number[]): number[] {
  return A.map((row) => row.reduce((acc, v, i) => acc + v * (x[i] ?? 0), 0));
}

// `polyEval` import kept available for callers; no internal use in v1.
export const _polyEvalRef = polyEval;