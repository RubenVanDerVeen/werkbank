import type { Module } from '../../module.ts';
import { bodePoints, type FilterType } from '../../math/filter.ts';
import { bode } from '../../math/bode.ts';
import { bodePlot } from '../../ui/acplot.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const typeSel = selectWave('Type', ['LP', 'HP', 'BP'], 'LP');
  const R1 = slider('R1 (kΩ)', 0.1, 100, 0.1, 10);
  const R2 = slider('R2 (kΩ)', 0.1, 100, 0.1, 10);
  const C1 = slider('C1 (nF)', 0.1, 1000, 0.1, 10);
  const C2 = slider('C2 (nF)', 0.1, 1000, 0.1, 10);
  const ws = [typeSel, R1, R2, C1, C2];
  for (const w of ws) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const type = typeSel.value() as FilterType;
    try {
      const { design: d, omegas } = bodePoints(type, R1.value(), R2.value(), C1.value(), C2.value());
      const pts = bode(d.tf, omegas);
      const gainLine = type === 'BP'
        ? `<div><b>Mid-band gain:</b> ${d.gain.toFixed(2)} (${(20 * Math.log10(d.gain)).toFixed(1)} dB)</div>`
        : '';
      readouts.innerHTML = `
        <div><b>f0:</b> ${d.f0_Hz.toFixed(1)} Hz</div>
        <div><b>Q:</b> ${d.Q.toFixed(2)}</div>
        ${gainLine}`;
      bodePlot(plotHost, pts);
    } catch {
      readouts.textContent = 'error: invalid R/C values';
    }
  };

  typeSel.el.querySelector('select')!.addEventListener('change', update);
  for (const w of [R1, R2, C1, C2]) {
    w.el.querySelector('input')!.addEventListener('input', update);
  }
  update();
}

export const module: Module = {
  id: 'active-filter',
  title: 'Active Filters',
  course: 'Elektronica1B',
  description: 'Sallen-Key / MFB 2nd-order filters: f0, Q, magnitude & phase.',
  icon: 'f0',
  render,
};