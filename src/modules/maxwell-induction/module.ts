import type { Module } from '../../module.ts';
import {
  faradayEmf, selfInductance, mutualInductance, displacementCurrent,
  inductionTimeSeries, EPS0, C,
} from '../../math/induction.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

const I_REF = 1; // ponytail: reference current for L/M readouts

const MAXWELL_EQUATIONS = `∮ E·dl  = −dΦ_B/dt              (Faraday)
∮ B·dl  = μ₀(I + ε₀·dΦ_E/dt)     (Ampère-Maxwell)
∮ E·dA  = Q/ε₀                   (Gauss E)
∮ B·dA  = 0                      (Gauss B)`;

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const N = slider('N (turns)', 1, 1000, 1, 100);
  const B = slider('B peak (T)', 0, 5, 0.01, 0.5);
  const A = slider('A (m²)', 0.001, 0.1, 0.001, 0.01);
  const thetaDeg = slider('θ (deg)', 0, 90, 1, 0);
  const f = slider('f (Hz)', 0.1, 10, 0.1, 1);
  for (const s of [N, B, A, thetaDeg, f]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  const eqBlock = document.createElement('pre');
  eqBlock.textContent = MAXWELL_EQUATIONS;
  host.appendChild(plotHost);
  host.appendChild(readouts);
  host.appendChild(eqBlock);

  const update = () => {
    const n = N.value();
    const bPk = B.value();
    const a = A.value();
    const theta = thetaDeg.value() * Math.PI / 180;
    const freq = f.value();
    const omega = 2 * Math.PI * freq;
    const dBdt_peak = bPk * omega;
    const phi_peak = bPk * a * Math.cos(theta);
    const emf_peak = Math.abs(faradayEmf(n, bPk, a, theta, dBdt_peak));
    const emf_rms = emf_peak / Math.sqrt(2);
    const L = selfInductance(n, phi_peak, I_REF);
    // ponytail: k=1, N2=N, phi21=phi_peak → M=L
    const M = mutualInductance(n, phi_peak, I_REF);
    // ponytail: EM-wave relation E=cB → dΦE/dt = A·c·dB/dt
    const dPhiE_dt = a * C * dBdt_peak;
    const Id = displacementCurrent(EPS0, dPhiE_dt);

    readouts.innerHTML = `
      <div><b>Φ peak:</b> ${sig3(phi_peak)} Wb</div>
      <div><b>emf peak:</b> ${sig3(emf_peak)} V</div>
      <div><b>emf rms:</b> ${sig3(emf_rms)} V</div>
      <div><b>L (I=${I_REF} A):</b> ${sig3(L)} H</div>
      <div><b>M (k=1, N₂=N):</b> ${sig3(M)} H</div>
      <div><b>Id (E=cB):</b> ${sig3(Id)} A</div>
    `;
    const tMax = 2 / freq; // two periods
    const { phi, emf } = inductionTimeSeries(n, bPk, a, theta, freq, tMax, 200);
    linePlot(plotHost, [
      { label: 'Φ (Wb)', data: phi },
      { label: 'emf (V)', data: emf },
    ], { xLabel: 't (s)', yLabel: '' });
  };

  for (const s of [N, B, A, thetaDeg, f]) {
    const el = s.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'maxwell-induction',
  title: 'Maxwell & Induction',
  course: 'Elektromagnetische Velden',
  description: 'Faraday, Lenz, motional emf, self/mutual inductance, displacement current.',
  icon: 'Φ',
  render,
};