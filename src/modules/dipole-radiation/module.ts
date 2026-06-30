import type { Module } from '../../module.ts';
import {
  hertzianPattern, halfWavePattern, hertzianRr, halfWaveRr,
  directivity, directivityDbi, hpbw, radiatedPower, type DipoleType,
} from '../../math/dipole.ts';
import { polarPlot } from '../../ui/polarplot.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function sig3(x: number): string { return x.toPrecision(3); }

function patternFor(type: DipoleType, theta: number): number {
  return type === 'hertzian' ? hertzianPattern(theta) : halfWavePattern(theta);
}

function render(host: HTMLElement) {
  const type = selectWave('Type', ['hertzian', 'halfwave'], 'hertzian');
  const lOverLambda = slider('l/λ', 0.01, 0.5, 0.01, 0.1);
  const I0 = slider('I₀ (A)', 0, 10, 0.01, 1);
  const scale = selectWave('Scale', ['linear', 'dB'], 'linear');
  for (const w of [type, lOverLambda, I0, scale]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const samples = (t: DipoleType) => {
    const N = 181;
    const dbMode = scale.value() === 'dB';
    const out: { theta: number; r: number }[] = [];
    for (let i = 0; i < N; i++) {
      const th = (2 * Math.PI * i) / (N - 1);
      const r = patternFor(t, th);
      out.push({ theta: th, r: dbMode ? 20 * Math.log10(Math.max(r, 1e-9)) : r });
    }
    return out;
  };

  const update = () => {
    const t = type.value() as DipoleType;
    const Rr = t === 'hertzian' ? hertzianRr(lOverLambda.value(), 1) : halfWaveRr();
    const D = directivity(t);
    readouts.innerHTML = `
      <div><b>Rr:</b> ${sig3(Rr)} Ω</div>
      <div><b>D:</b> ${sig3(D)} (${directivityDbi(t).toFixed(2)} dBi)</div>
      <div><b>HPBW:</b> ${hpbw(t)}°</div>
      <div><b>Prad:</b> ${sig3(radiatedPower(I0.value(), Rr))} W</div>
    `;
    const series = [{ label: t, samples: samples(t) }];
    polarPlot(plotHost, series, { title: 'E-plane pattern', db: scale.value() === 'dB' });
  };

  for (const w of [type, lOverLambda, I0, scale]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'dipole-radiation',
  title: 'Dipole Radiation',
  course: 'Antennes',
  icon: 'Θ',
  description: 'Hertzian and half-wave dipole radiation patterns: Rr, directivity, HPBW, Prad.',
  render,
};