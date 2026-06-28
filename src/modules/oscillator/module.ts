import type { Module } from '../../module.ts';
import { analyze, wienBetaPoints, type OscParams, type OscType } from '../../math/oscillator.ts';
import { bodePlot } from '../../ui/acplot.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const type = selectWave('Type', ['Wien', 'Phase-shift', 'Colpitts', 'Hartley'], 'Wien');
  const R = slider('R (kΩ)', 0.1, 100, 0.1, 10);
  const C = slider('C (nF)', 0.1, 1000, 0.1, 10);
  const L = slider('L (mH)', 0.01, 100, 0.01, 1);
  const C1 = slider('C1 (nF)', 0.1, 1000, 0.1, 10);
  const C2 = slider('C2 (nF)', 0.1, 1000, 0.1, 10);
  const L1 = slider('L1 (mH)', 0.01, 100, 0.01, 1);
  const L2 = slider('L2 (mH)', 0.01, 100, 0.01, 1);
  const ws = [type, R, C, L, C1, C2, L1, L2];
  for (const w of ws) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const t = type.value() as OscType;
    R.el.style.display = t === 'Wien' || t === 'Phase-shift' ? 'block' : 'none';
    C.el.style.display = t === 'Wien' || t === 'Phase-shift' || t === 'Hartley' ? 'block' : 'none';
    L.el.style.display = t === 'Colpitts' ? 'block' : 'none';
    C1.el.style.display = t === 'Colpitts' ? 'block' : 'none';
    C2.el.style.display = t === 'Colpitts' ? 'block' : 'none';
    L1.el.style.display = t === 'Hartley' ? 'block' : 'none';
    L2.el.style.display = t === 'Hartley' ? 'block' : 'none';

    const params: OscParams = {
      R_kOhm: R.value(), C_nF: C.value(),
      L_mH: L.value(), C1_nF: C1.value(), C2_nF: C2.value(),
      L1_mH: L1.value(), L2_mH: L2.value(),
    };

    try {
      const r = analyze(t, params);
      const f0 = r.f0_Hz;
      const fStr = f0 < 1e3 ? `${f0.toFixed(3)} Hz` : `${(f0 / 1e3).toFixed(3)} kHz`;
      const ratioLine = r.ratio !== undefined ? `<div><b>ratio:</b> ${r.ratio.toFixed(3)}</div>` : '';
      readouts.innerHTML = `
        <div><b>f0:</b> ${fStr}</div>
        <div><b>AvMin:</b> ${r.AvMin.toFixed(3)}</div>
        ${ratioLine}
      `;
      if (t === 'Wien' || t === 'Phase-shift') {
        bodePlot(plotHost, wienBetaPoints(R.value(), C.value()));
      } else {
        plotHost.innerHTML = 'Bode plot applies to RC oscillator types.';
      }
    } catch {
      readouts.textContent = 'error: invalid L/C values';
      plotHost.innerHTML = '';
    }
  };

  for (const w of ws) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'oscillator',
  title: 'Sinusoidal Oscillators',
  course: 'Elektronica1B',
  description: 'Wien / phase-shift / Colpitts / Hartley oscillators: f0 and gain condition.',
  icon: '~',
  render,
};