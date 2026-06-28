import type { Module } from '../../module.ts';
import { analyze, bodePoints, type FreqRespParams } from '../../math/freqresp.ts';
import { bodePlot } from '../../ui/acplot.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const gm = slider('gm (mS)', 1, 100, 1, 40);
  const Rsig = slider('Rsig (kΩ)', 0, 10, 0.1, 0.6);
  const Rin = slider('Rin (kΩ)', 0.1, 50, 0.1, 2.5);
  const RC = slider('RC (kΩ)', 0.1, 20, 0.1, 5);
  const RL = slider('RL (kΩ)', 0.1, 100, 1, 10);
  const Cpi = slider('Cπ (pF)', 1, 100, 1, 10);
  const Cmu = slider('Cµ (pF)', 0.5, 20, 0.5, 2);
  const C1 = slider('C1 (µF)', 0.01, 10, 0.01, 1);
  const C2 = slider('C2 (µF)', 0.01, 10, 0.01, 1);
  const ws = [gm, Rsig, Rin, RC, RL, Cpi, Cmu, C1, C2];
  for (const w of ws) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const p: FreqRespParams = {
      gm_mS: gm.value(), Rsig_kOhm: Rsig.value(), Rin_kOhm: Rin.value(),
      RC_kOhm: RC.value(), RL_kOhm: RL.value(), Cpi_pF: Cpi.value(), Cmu_pF: Cmu.value(),
      C1_uF: C1.value(), C2_uF: C2.value(),
    };
    const r = analyze(p);
    if (!Number.isFinite(r.fH_Hz) || !Number.isFinite(r.fL_Hz)) {
      readouts.textContent = 'error: non-finite corner frequency'; return;
    }
    readouts.innerHTML = `
      <div><b>Amid:</b> ${r.Amid.toFixed(1)} (${r.AmidDb.toFixed(1)} dB)</div>
      <div><b>fL:</b> ${r.fL_Hz.toFixed(1)} Hz</div>
      <div><b>fH:</b> ${(r.fH_Hz / 1e3).toFixed(1)} kHz</div>
      <div><b>BW:</b> ${(r.BW_Hz / 1e3).toFixed(1)} kHz</div>`;
    bodePlot(plotHost, bodePoints(p));
  };

  for (const w of ws) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
  }
  update();
}

export const module: Module = {
  id: 'freq-response',
  title: 'Amplifier Frequency Response',
  course: 'Elektronica1B',
  description: 'Single-stage amplifier frequency response: fL, fH, midband gain, Bode plot.',
  icon: 'fH',
  render,
};
