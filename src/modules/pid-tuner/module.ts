import type { Module } from '../../module.ts';
import { tfFromCoeffs } from '../../math/tf.ts';
import { stepResponse, closedLoop } from '../../math/step.ts';
import { linePlot } from '../../ui/plots.ts';
import { polyInput, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const numIn = polyInput('Plant numerator', [1]);
  const denIn = polyInput('Plant denominator', [1, 1, 0]);
  const kp = slider('Kp', 0, 10, 0.1, 1);
  const ki = slider('Ki', 0, 10, 0.1, 0);
  const kd = slider('Kd', 0, 10, 0.1, 0);
  host.appendChild(numIn.el);
  host.appendChild(denIn.el);
  host.appendChild(kp.el);
  host.appendChild(ki.el);
  host.appendChild(kd.el);

  const stepHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(stepHost);
  host.appendChild(readouts);

  const update = () => {
    let plant;
    try { plant = tfFromCoeffs(numIn.value(), denIn.value()); }
    catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    // Controller C(s) = Kp + Ki/s + Kd s, build closed loop numerically via simulation.
    const Kp = kp.value(), Ki = ki.value(), Kd = kd.value();
    const y = simulatePidStep(plant, Kp, Ki, Kd, 10, 0.02);
    linePlot(stepHost, [{ label: 'y(t)', data: y.map((p) => ({ x: p.t, y: p.y })) }], { yLabel: 'y', xLabel: 't' });
    const overshoot = computeOvershoot(y);
    const settle = computeSettling(y);
    readouts.innerHTML = `
      <div><b>overshoot:</b> ${overshoot.toFixed(2)}%</div>
      <div><b>settling (2%):</b> ${settle.toFixed(2)} s</div>
    `;
  };

  for (const w of [numIn, denIn]) w.el.querySelector('input')!.addEventListener('input', update);
  for (const s of [kp, ki, kd]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

// Numerical simulation of plant + PID feedback.
function simulatePidStep(plant: { num: number[]; den: number[] }, Kp: number, Ki: number, Kd: number, tEnd: number, dt: number) {
  const n = plant.den.length;
  // Normalize plant so leading den = 1
  const a0 = plant.den[0]!;
  const pNum = plant.num.map((c) => c / a0);
  const pDen = plant.den.map((c) => c / a0);
  // State: x (plant states), eI (integral of error), ePrev (previous error)
  const x = new Array(n - 1).fill(0);
  let eI = 0;
  let ePrev = 0;
  const out: { t: number; y: number }[] = [];
  const steps = Math.ceil(tEnd / dt);
  for (let k = 0; k <= steps; k++) {
    const t = k * dt;
    const y = plantOutput(pNum, pDen, x, 0);
    const e = 1 - y; // setpoint = 1
    const u = Kp * e + Ki * eI + Kd * ((e - ePrev) / dt);
    out.push({ t, y });
    // Advance plant one step with input u (zero-order hold)
    advancePlant(x, pNum, pDen, u, dt);
    ePrev = e;
    eI += e * dt;
  }
  return out;
}

function plantOutput(_num: number[], den: number[], x: number[], _u: number): number {
  // First state in observer canonical form is the output.
  return x[0] ?? 0;
}

function advancePlant(x: number[], _num: number[], den: number[], u: number, dt: number) {
  // Simple explicit Euler on canonical form: ẋ = A x + B u, y = first state
  const n = x.length;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 1; i < n; i++) A[i - 1]![i] = 1;
  for (let i = 0; i < n; i++) A[n - 1]![i] = -(den[i + 1] ?? 0);
  const B = new Array(n).fill(0); B[n - 1] = 1; // input enters via last row; simplified for v1
  const dx = A.map((row, i) => row.reduce((acc, v, j) => acc + v * (x[j] ?? 0), 0) + (B[i] ?? 0) * u);
  for (let i = 0; i < n; i++) x[i] = (x[i] ?? 0) + dt * (dx[i] ?? 0);
}

function computeOvershoot(series: { y: number }[]): number {
  const peak = Math.max(...series.map((p) => p.y));
  return Math.max(0, (peak - 1) * 100);
}

function computeSettling(series: { t: number; y: number }[]): number {
  const band = 0.02;
  for (let i = series.length - 1; i >= 0; i--) {
    if (Math.abs(series[i]!.y - 1) > band) return series[i]!.t;
  }
  return 0;
}

export const module: Module = {
  id: 'pid-tuner',
  title: 'PID Tuner',
  course: 'Regeltechniek',
  description: 'Closed-loop step response with Kp/Ki/Kd sliders.',
  icon: 'Kp',
  render,
};
