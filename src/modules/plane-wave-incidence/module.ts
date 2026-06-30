import type { Module } from '../../module.ts';
import {
  snell,
  fresnelPerp,
  fresnelParallel,
  criticalAngle,
  brewsterAngle,
} from '../../math/incidence.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const D = Math.PI / 180;

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const n1 = slider('n₁', 1, 2.5, 0.01, 1);
  const n2 = slider('n₂', 1, 2.5, 0.01, 1.5);
  const theta = slider('θ₁ (°)', 0, 89, 0.1, 30);
  const pol = selectWave('Polarization', ['perpendicular', 'parallel'], 'perpendicular');
  for (const w of [n1, n2, theta, pol]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const a = n1.value(), b = n2.value(), th = theta.value() * D;
    const perp = pol.value() === 'perpendicular';
    const theta2 = snell(a, b, th);
    const gamma = perp ? fresnelPerp(a, b, th) : fresnelParallel(a, b, th);
    const tir = Number.isNaN(gamma);
    const T = tir ? 0 : 1 - gamma * gamma;
    const tc = criticalAngle(a, b);
    const tb = brewsterAngle(a, b);

    let flags = '';
    if (tir) flags += ' ⚠ TIR';
    if (!perp && !tir && Math.abs(gamma) < 0.01) flags += ' ⚠ Brewster';

    readouts.innerHTML = `
      <div><b>θ₂:</b> ${Number.isNaN(theta2) ? '— (TIR)' : sig3(theta2 / D) + '°'}</div>
      <div><b>Γ:</b> ${tir ? '|Γ|=1 (TIR)' : sig3(gamma)}</div>
      <div><b>T:</b> ${sig3(T)}${flags}</div>
      <div><b>θc:</b> ${tc === null ? '—' : sig3(tc / D) + '°'}</div>
      <div><b>θB:</b> ${sig3(tb / D) + '°'}</div>
    `;

    const xs = linspace(-12, 12, 400);
    const k1 = a, k2 = b; // ponytail: ω/c = 1, so k = n
    const gPlot = tir ? 1 : gamma; // ponytail: TIR → full reflection |Γ|=1
    const tAmp = tir ? 0 : 1 + gamma; // ponytail: field transmission t=1+Γ (exact s-pol)
    const incident = xs.map((x) => ({ x, y: x <= 0 ? Math.cos(k1 * x) : NaN }));
    const reflected = xs.map((x) => ({ x, y: x <= 0 ? gPlot * Math.cos(k1 * x) : NaN }));
    const transmitted = xs.map((x) => ({ x, y: x >= 0 ? tAmp * Math.cos(k2 * x) : NaN }));
    linePlot(
      plotHost,
      [
        { label: 'Incident', data: incident },
        { label: 'Reflected', data: reflected },
        { label: 'Transmitted', data: transmitted },
      ],
      { xLabel: 'position', yLabel: 'E (a.u.)' },
    );
  };

  for (const w of [n1, n2, theta, pol]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'plane-wave-incidence',
  title: 'Plane-Wave Incidence',
  course: 'Elektromagnetische Velden',
  description: "Snell's law, Fresnel coefficients, critical and Brewster angles at a dielectric interface.",
  icon: 'θ',
  render,
};