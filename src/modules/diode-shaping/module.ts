import type { Module } from '../../module.ts';
import { shape, metrics, type Topology } from '../../math/diode.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const topology = selectWave('Topology', ['series-clipper', 'biased-shunt-clipper', 'positive-clamper', 'half-wave-rect', 'peak-rect'], 'series-clipper');
  const Vpeak = slider('Vpeak in (V)', 1, 20, 0.1, 10);
  const Vgamma = slider('Vγ (V)', 0.3, 0.9, 0.01, 0.7);
  const Vbias = slider('Vbias (V)', 0, 15, 0.1, 3);
  const R = slider('R (kΩ)', 0.1, 100, 0.1, 10);
  const C = slider('C (µF)', 1, 1000, 1, 100);
  host.appendChild(topology.el);
  host.appendChild(Vpeak.el);
  host.appendChild(Vgamma.el);
  host.appendChild(Vbias.el);
  host.appendChild(R.el);
  host.appendChild(C.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const top = topology.value() as Topology;
    Vbias.el.style.display = top === 'biased-shunt-clipper' ? 'block' : 'none';
    R.el.style.display = (top === 'peak-rect') ? 'block' : 'none';
    C.el.style.display = (top === 'positive-clamper' || top === 'peak-rect') ? 'block' : 'none';

    if (top === 'peak-rect' && R.value() === 0) { readouts.textContent = 'error: R must be > 0'; return; }

    const T = 1 / 50;
    const N = 500;
    const ts = Array.from({ length: 2 * N + 1 }, (_, i) => (i * T) / N);
    const params: any = { Vpeak: Vpeak.value(), Vgamma: Vgamma.value() };
    if (top === 'biased-shunt-clipper') params.Vbias = Vbias.value();
    if (top === 'peak-rect') { params.R_kOhm = R.value(); params.C_uF = C.value(); }
    if (top === 'positive-clamper') params.C_uF = C.value();

    const { vin, vout } = shape(top, params, ts);
    const m = metrics(vout, ts[1]! - ts[0]!);
    readouts.innerHTML = `
      <div><b>Vpeak out:</b> ${m.Vpeak_out.toFixed(3)} V</div>
      <div><b>Vavg:</b> ${m.Vavg.toFixed(3)} V</div>
      ${top === 'peak-rect' ? `<div><b>Vripple pp:</b> ${m.Vripple_pp.toFixed(3)} V</div>` : ''}
    `;
    linePlot(plotHost, [
      { label: 'v_in', data: vin.map((v, i) => ({ x: ts[i]!, y: v })) },
      { label: 'v_out', data: vout.map((v, i) => ({ x: ts[i]!, y: v })) },
    ], { xLabel: 't (s)', yLabel: 'V' });
  };

  for (const w of [topology, Vpeak, Vgamma, Vbias, R, C]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'diode-shaping',
  title: 'Diode Wave-Shaping',
  course: 'Elektronika1A',
  description: 'Clippers, clampers, rectifiers — see the waveform reshape.',
  icon: '▶|',
  render,
};
