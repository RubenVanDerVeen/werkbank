import type { Module } from '../../module.ts';
import { designBuckBoost, waveform } from '../../math/converter.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const vin = slider('Vin (V)', 1, 50, 0.5, 12);
  const vout = slider('|Vout| (V)', 2, 50, 0.5, 12);
  const iout = slider('Iout (A)', 0.1, 10, 0.1, 1);
  const fsw = slider('fsw (kHz)', 10, 500, 5, 100);
  const L = slider('L (µH)', 1, 1000, 1, 47);
  const C = slider('C (µF)', 1, 1000, 1, 22);
  const rdsOn = slider('Rds,on (mΩ)', 1, 500, 5, 50);
  const vf = slider('Diode Vf (V)', 0.1, 1.2, 0.05, 0.7);
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const inp = {
      Vin: vin.value(), Vout: vout.value(), Iout: iout.value(), fsw: fsw.value() * 1e3,
      L: L.value() * 1e-6, C: C.value() * 1e-6, rdsOn: rdsOn.value() / 1e3, vf: vf.value(),
    };
    let d;
    try { d = designBuckBoost(inp); } catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }
    const w = waveform('buckboost', inp, 256);
    linePlot(plotHost, [
      { label: 'Vsw (V)', data: w.map((p) => ({ x: p.t * 1e6, y: p.vSwitch })) },
      { label: 'iL (A)', data: w.map((p) => ({ x: p.t * 1e6, y: p.iL })) },
    ], { yLabel: 'V / I', xLabel: 't (µs)' });
    readouts.innerHTML = `
      <div><b>D:</b> ${d.D.toFixed(3)}</div>
      <div><b>ΔiL:</b> ${(d.deltaIL).toFixed(3)} A</div>
      <div><b>η:</b> ${(d.efficiency * 100).toFixed(1)}%</div>
      <div><i>Output polarity is inverted.</i></div>
    `;
  };
  for (const s of [vin, vout, iout, fsw, L, C, rdsOn, vf]) s.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'smps-buckboost', title: 'Buck-Boost (inverting)', course: 'Vermogenselektronica',
  description: 'Inverting SMPS: Vout magnitude, duty, ripple, efficiency.',
  icon: '±', render,
};
