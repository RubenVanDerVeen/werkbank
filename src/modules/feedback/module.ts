import type { Module } from '../../module.ts';
import { analyze, type Topology } from '../../math/feedback.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const topology = selectWave('Topology', ['series-shunt', 'shunt-series', 'series-series', 'shunt-shunt'], 'series-shunt');
  const A = slider('A', 10, 100000, 10, 1000);
  const beta = slider('β', 0, 1, 0.001, 0.01);
  const Zin = slider('Zin (kΩ)', 0.1, 1000, 0.1, 10);
  const Zout = slider('Zout (kΩ)', 0.01, 100, 0.01, 2);
  for (const w of [topology, A, beta, Zin, Zout]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    let r;
    try {
      r = analyze(topology.value() as Topology, A.value(), beta.value(), Zin.value(), Zout.value());
    } catch (e) {
      readouts.textContent = `error: ${(e as Error).message}`;
      return;
    }
    readouts.innerHTML = `
      <div><b>T (Aβ):</b> ${sig3(r.T)}</div>
      <div><b>D (1+Aβ):</b> ${sig3(r.D)}</div>
      <div><b>Af:</b> ${sig3(r.Af)} (${r.AfDb.toFixed(2)} dB)</div>
      <div><b>Zin':</b> ${sig3(r.Zin_f)} kΩ ${r.zinDir} D</div>
      <div><b>Zout':</b> ${sig3(r.Zout_f)} kΩ ${r.zoutDir} D</div>
    `;
    const xs = linspace(0, 0.05, 60);
    const sweep = xs.map((x) => {
      const rr = analyze(topology.value() as Topology, A.value(), x, Zin.value(), Zout.value());
      return { x, y: rr.Af };
    });
    linePlot(plotHost, [{ label: 'Af', data: sweep }], { xLabel: 'β', yLabel: 'Af' });
  };

  for (const w of [topology, A, beta, Zin, Zout]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'feedback',
  title: 'Negative Feedback',
  course: 'Elektronica1B',
  description: 'Negative-feedback topologies: loop gain, closed-loop gain, Zin/Zout impact.',
  icon: 'β',
  render,
};