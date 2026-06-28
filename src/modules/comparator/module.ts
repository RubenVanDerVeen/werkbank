import type { Module } from '../../module.ts';
import { analyze, loop, type SchmittConfig } from '../../math/schmitt.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const config = selectWave('Config', ['Inverting', 'Non-inverting'], 'Inverting');
  const R1 = slider('R1 (kΩ)', 0.1, 100, 0.1, 10);
  const R2 = slider('R2 (kΩ)', 0.1, 100, 0.1, 10);
  const Vsat = slider('Vsat (V)', 1, 18, 0.1, 12);
  const Vref = slider('Vref (V)', -10, 10, 0.1, 0);
  for (const w of [config, R1, R2, Vsat, Vref]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const cfg = config.value() as SchmittConfig;
    const params = { R1_kOhm: R1.value(), R2_kOhm: R2.value(), Vsat: Vsat.value(), Vref: Vref.value() };

    if ((cfg === 'Inverting' && params.R1_kOhm + params.R2_kOhm === 0) ||
        (cfg === 'Non-inverting' && params.R2_kOhm === 0)) {
      readouts.textContent = 'error: invalid divider';
      plotHost.innerHTML = '';
      return;
    }

    let r;
    try { r = analyze(cfg, params); }
    catch (e) { readouts.textContent = `error: ${(e as Error).message}`; plotHost.innerHTML = ''; return; }

    readouts.innerHTML = `
      <div><b>VT+:</b> ${r.VTp.toFixed(3)} V</div>
      <div><b>VT−:</b> ${r.VTn.toFixed(3)} V</div>
      <div><b>H:</b> ${r.H.toFixed(3)} V</div>
    `;

    const { rising, falling } = loop(cfg, params);
    linePlot(plotHost, [
      { label: 'rising', data: rising },
      { label: 'falling', data: falling },
    ], { xLabel: 'Vin (V)', yLabel: 'Vout (V)' });
  };

  for (const w of [config, R1, R2, Vsat, Vref]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'comparator',
  title: 'Comparator & Schmitt Trigger',
  course: 'Elektronica1B',
  description: 'Op-amp Schmitt trigger: thresholds, hysteresis, transfer loop.',
  icon: 'ST',
  render,
};