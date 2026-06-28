import type { Module } from '../../module.ts';
import { analyze, type Device, type FetConfig, type FetParams } from '../../math/fet.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const device = selectWave('Device', ['MOSFET', 'JFET'], 'MOSFET');
  const config = selectWave('Config', ['CS', 'CD', 'CG'], 'CS');
  const IDQ = slider('IDQ (mA)', 0.1, 20, 0.1, 2);
  const Kn = slider('Kn (mA/V²)', 0.1, 10, 0.1, 1);
  const Vt = slider('Vt (V)', 0.5, 5, 0.1, 2);
  const IDSS = slider('IDSS (mA)', 1, 30, 0.5, 10);
  const Vp = slider('Vp (V)', -8, -1, 0.1, -4);
  const RD = slider('RD (kΩ)', 0, 20, 0.1, 5);
  const RS = slider('RS (kΩ)', 0, 10, 0.1, 1);
  const RL = slider('RL (kΩ)', 0, 100, 1, 10);
  const Rs = slider('Rs (kΩ)', 0, 10, 0.1, 1);
  const RG = slider('RG (MΩ)', 0, 10, 0.1, 1);
  const RSbyp = selectWave('RS bypassed', ['on', 'off'], 'on');
  for (const w of [device, config, IDQ, Kn, Vt, IDSS, Vp, RD, RS, RL, Rs, RG, RSbyp]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const dev = device.value() as Device;
    const cfg = config.value() as FetConfig;
    Kn.el.style.display = dev === 'MOSFET' ? 'block' : 'none';
    Vt.el.style.display = dev === 'MOSFET' ? 'block' : 'none';
    IDSS.el.style.display = dev === 'JFET' ? 'block' : 'none';
    Vp.el.style.display = dev === 'JFET' ? 'block' : 'none';
    RS.el.style.display = cfg === 'CD' ? 'none' : 'block';
    RSbyp.el.style.display = cfg === 'CD' ? 'none' : 'block';

    if (IDQ.value() === 0) { readouts.textContent = 'error: IDQ must be > 0'; return; }

    const params: FetParams = {
      IDQ_mA: IDQ.value(), RD_kOhm: RD.value(), RS_kOhm: RS.value(), RL_kOhm: RL.value(),
      Rs_kOhm: Rs.value(), RG_MOhm: RG.value(), RSbypassed: RSbyp.value() === 'on',
    };
    if (dev === 'MOSFET') { params.Kn_mAV2 = Kn.value(); params.Vt_V = Vt.value(); }
    else { params.IDSS_mA = IDSS.value(); params.Vp_V = Vp.value(); }

    const r = analyze(dev, cfg, params);
    readouts.innerHTML = `
      <div><b>Av:</b> ${r.Av.toFixed(3)}</div>
      <div><b>Ai:</b> ${r.Ai.toFixed(3)}</div>
      <div><b>Zin:</b> ${r.Zin_MOhm.toFixed(4)} MΩ</div>
      <div><b>Zout:</b> ${r.Zout_kOhm.toFixed(3)} kΩ</div>
    `;
    const xs = linspace(0.1, 20, 60);
    if (cfg === 'CD') {
      const RLs = linspace(0, 100, 60);
      linePlot(plotHost, [
        { label: 'Av vs RL', data: RLs.map((x) => ({ x, y: analyze(dev, cfg, { ...params, RL_kOhm: x }).Av })) },
      ], { xLabel: 'RL (kΩ)', yLabel: 'Av' });
    } else {
      linePlot(plotHost, [
        { label: 'RS bypassed', data: xs.map((x) => ({ x, y: analyze(dev, cfg, { ...params, IDQ_mA: x, RSbypassed: true }).Av })) },
        { label: 'RS unbypassed', data: xs.map((x) => ({ x, y: analyze(dev, cfg, { ...params, IDQ_mA: x, RSbypassed: false }).Av })) },
      ], { xLabel: 'IDQ (mA)', yLabel: 'Av' });
    }
  };

  for (const w of [device, config, IDQ, Kn, Vt, IDSS, Vp, RD, RS, RL, Rs, RG, RSbyp]) {
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
  id: 'fet-amp',
  title: 'FET Amplifiers',
  course: 'Elektronika1A',
  description: 'FET small-signal analysis for CS/CD/CG amplifiers (MOSFET & JFET).',
  icon: 'gm',
  render,
};
