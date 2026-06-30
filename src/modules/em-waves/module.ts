import type { Module } from '../../module.ts';
import {
  intrinsicImpedance,
  propagationConst,
  skinDepth,
  phaseVelocity,
  poyntingAvg,
  MU0,
  EPS0,
} from '../../math/emwaves.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

type Medium = 'free space' | 'lossy dielectric' | 'good conductor';
type Polar = 'linear' | 'circular' | 'elliptical';

// ponytail: σ via medium preset, spans 9 decades, linear slider useless.
const MEDIA: Record<Medium, { mur: number; epsr: number; sigma: number }> = {
  'free space': { mur: 1, epsr: 1, sigma: 0 },
  'lossy dielectric': { mur: 1, epsr: 4, sigma: 0.01 },
  'good conductor': { mur: 1, epsr: 1, sigma: 5.8e7 }, // copper
};

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

const sig3 = (x: number): string => x.toPrecision(3);

function render(host: HTMLElement) {
  const medium = selectWave('Medium', ['free space', 'lossy dielectric', 'good conductor'], 'free space');
  const polar = selectWave('Polarization', ['linear', 'circular', 'elliptical'], 'linear');
  const f = slider('f (GHz)', 0.01, 100, 0.01, 1);
  const E0 = slider('E₀ (V/m)', 1, 1000, 1, 100);
  for (const w of [medium, polar, f, E0]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const m = MEDIA[medium.value() as Medium];
    const mu = m.mur * MU0;
    const eps = m.epsr * EPS0;
    const sigma = m.sigma;
    const omega = 2 * Math.PI * f.value() * 1e9;
    const eta = intrinsicImpedance(mu, eps);
    const { alpha, beta } = propagationConst(omega, mu, eps, sigma);
    const delta = skinDepth(omega, mu, sigma);
    const v = phaseVelocity(mu, eps);
    const S = poyntingAvg(E0.value(), eta);

    readouts.innerHTML = `
      <div><b>η:</b> ${sig3(eta)} Ω</div>
      <div><b>α:</b> ${sig3(alpha)} Np/m</div>
      <div><b>β:</b> ${sig3(beta)} rad/m</div>
      <div><b>δ:</b> ${isFinite(delta) ? sig3(delta * 1e6) + ' µm' : '∞'}</div>
      <div><b>v:</b> ${sig3(v)} m/s</div>
      <div><b>⟨S⟩:</b> ${sig3(S)} W/m²</div>
    `;

    // Snapshot Ex(z), Ey(z) at t=0. zmax shows decay when lossy, ~4 cycles when not.
    // ponytail: one plot path, B=E/v shown as readout, not a second curve.
    const lambda = beta > 0 ? (2 * Math.PI) / beta : 1;
    const zmax = isFinite(delta) && delta < lambda ? 5 * delta : 4 * lambda;
    const xs = linspace(0, zmax, 200);
    const e0 = E0.value();
    const p = polar.value() as Polar;
    // ponytail: elliptical ratio fixed at 0.5.
    const eyAmp = p === 'linear' ? 0 : p === 'circular' ? 1 : 0.5;
    const ex = xs.map((z) => ({ x: z, y: e0 * Math.exp(-alpha * z) * Math.cos(-beta * z) }));
    const ey = xs.map((z) => ({ x: z, y: e0 * eyAmp * Math.exp(-alpha * z) * Math.sin(-beta * z) }));
    linePlot(plotHost, [{ label: 'Ex', data: ex }, { label: 'Ey', data: ey }], { xLabel: 'z (m)', yLabel: 'E (V/m)' });
  };

  for (const w of [medium, polar, f, E0]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'em-waves',
  title: 'Electromagnetic Waves',
  course: 'Elektromagnetische Velden',
  description: 'Plane-wave propagation: η, γ, skin depth, Poynting vector, polarization.',
  icon: 'λ',
  render,
};
