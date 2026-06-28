import type { Module } from '../../module.ts';
import { analyze, type Config } from '../../math/bjt.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const config = selectWave('Config', ['CE', 'CB', 'CC'], 'CE');
  const beta = slider('β', 50, 300, 1, 100);
  const IC = slider('IC (mA)', 0.1, 10, 0.1, 1);
  const VT = slider('VT (mV)', 20, 30, 1, 25);
  const RC = slider('RC (kΩ)', 0, 20, 0.1, 5);
  const RE = slider('RE (kΩ)', 0, 5, 0.05, 0.5);
  const RL = slider('RL (kΩ)', 0, 100, 1, 10);
  const Rs = slider('Rs (kΩ)', 0, 10, 0.1, 1);
  const RB = slider('RB (kΩ)', 0, 500, 5, 500);
  const REbyp = selectWave('RE bypassed', ['on', 'off'], 'on');
  for (const w of [config, beta, IC, VT, RC, RE, RL, Rs, RB, REbyp]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const cfg = config.value() as Config;
    const ICv = IC.value(), VTv = VT.value(), betav = beta.value();
    if (ICv === 0 || VTv === 0) { readouts.textContent = 'error: gm undefined'; return; }
    const params = {
      beta: betav, ICmA: ICv, VTmV: VTv,
      RC_kOhm: RC.value(), RE_kOhm: RE.value(), RL_kOhm: RL.value(),
      Rs_kOhm: Rs.value(), RB_kOhm: RB.value(), REbypassed: REbyp.value() === 'on',
    };
    const r = analyze(cfg, params);
    readouts.innerHTML = `
      <div><b>Av:</b> ${r.Av.toFixed(3)}</div>
      <div><b>Ai:</b> ${r.Ai.toFixed(3)}</div>
      <div><b>Zin (device):</b> ${r.Zin_device_kOhm.toFixed(3)} kΩ</div>
      <div><b>Zin:</b> ${r.Zin_kOhm.toFixed(3)} kΩ</div>
      <div><b>Zout:</b> ${r.Zout_kOhm.toFixed(3)} kΩ</div>
    `;
    const xs = linspace(0.1, 10, 60);
    if (cfg === 'CC') {
      const RLs = linspace(0, 100, 60);
      linePlot(plotHost, [
        { label: 'Av vs RL', data: RLs.map((x) => ({ x, y: analyze(cfg, { ...params, RL_kOhm: x }).Av })) },
      ], { xLabel: 'RL (kΩ)', yLabel: 'Av' });
    } else {
      linePlot(plotHost, [
        { label: 'RE bypassed', data: xs.map((x) => ({ x, y: analyze(cfg, { ...params, ICmA: x, REbypassed: true }).Av })) },
        { label: 'RE unbypassed', data: xs.map((x) => ({ x, y: analyze(cfg, { ...params, ICmA: x, REbypassed: false }).Av })) },
      ], { xLabel: 'IC (mA)', yLabel: 'Av' });
    }
  };

  for (const w of [config, beta, IC, VT, RC, RE, RL, Rs, RB, REbyp]) {
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
  id: 'bjt-amp',
  title: 'BJT Amplifiers',
  course: 'Elektronika1A',
  description: 'Hybrid-π small-signal analysis for CE/CB/CC amplifiers.',
  icon: 'Av',
  render,
};
