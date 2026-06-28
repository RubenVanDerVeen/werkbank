import type { Module } from '../../module.ts';
import { analyze, type DiffParams } from '../../math/diffamp.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const Itail = slider('Itail (mA)', 0.1, 10, 0.1, 2);
  const RC = slider('RC (kΩ)', 0.1, 50, 0.1, 5);
  const REE = slider('REE (kΩ)', 1, 1000, 1, 100);
  const beta = slider('beta', 20, 500, 1, 200);
  const VT = slider('VT (V)', 0.020, 0.030, 0.001, 0.025);
  for (const w of [Itail, RC, REE, beta, VT]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    if (Itail.value() <= 0) { readouts.textContent = 'error: tail current must be > 0'; return; }

    const params: DiffParams = {
      Itail_mA: Itail.value(), RC_kOhm: RC.value(), REE_kOhm: REE.value(),
      beta: beta.value(), VT_V: VT.value(),
    };
    const r = analyze(params);
    readouts.innerHTML = `
      <div><b>gm:</b> ${r.gm_mS.toFixed(3)} mS</div>
      <div><b>rπ:</b> ${r.rpi_kOhm.toFixed(3)} kΩ</div>
      <div><b>Ad:</b> ${r.Ad.toFixed(3)}</div>
      <div><b>Acm:</b> ${r.Acm.toFixed(3)}</div>
      <div><b>CMRR:</b> ${r.CMRRdb.toFixed(3)} dB</div>
      <div><b>Rid:</b> ${r.Rid_kOhm.toFixed(3)} kΩ</div>
    `;
    const REs = linspace(1, 1000, 60);
    linePlot(plotHost, [
      { label: 'CMRR vs REE', data: REs.map((x) => ({ x, y: analyze({ ...params, REE_kOhm: x }).CMRRdb })) },
    ], { xLabel: 'REE (kΩ)', yLabel: 'CMRR (dB)' });
  };

  for (const w of [Itail, RC, REE, beta, VT]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

export const module: Module = {
  id: 'diff-amp',
  title: 'Differential Amplifier',
  course: 'Elektronica1B',
  description: 'BJT differential pair with current-mirror tail: Ad, Acm, CMRR, Rid.',
  icon: 'Δ',
  render,
};
