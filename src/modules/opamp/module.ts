import type { Module } from '../../module.ts';
import { analyze, transfer, type Config } from '../../math/opamp.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const config = selectWave('Configuration', ['inverting', 'non-inverting', 'follower', 'summing', 'difference'], 'inverting');
  const R1 = slider('R1 (kΩ)', 0.1, 1000, 0.1, 10);
  const R2 = slider('R2 (kΩ)', 0.1, 1000, 0.1, 10);
  const Rf = slider('Rf (kΩ)', 0.1, 1000, 0.1, 100);
  const Rg = slider('Rg (kΩ)', 0.1, 1000, 0.1, 1);
  const Vcc = slider('Vcc (V)', 5, 24, 0.5, 15);
  const Vin = slider('Vin (V)', -10, 10, 0.05, 0.1);
  const V1 = slider('V1 (V)', -10, 10, 0.05, 1);
  const V2 = slider('V2 (V)', -10, 10, 0.05, 0.5);
  for (const w of [config, R1, R2, Rf, Rg, Vcc, Vin, V1, V2]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const cfg = config.value() as Config;
    R1.el.style.display = (cfg === 'follower') ? 'none' : 'block';
    R2.el.style.display = (cfg === 'summing' || cfg === 'difference') ? 'block' : 'none';
    Rf.el.style.display = (cfg === 'inverting' || cfg === 'summing' || cfg === 'non-inverting') ? 'block' : 'none';
    Rg.el.style.display = (cfg === 'non-inverting') ? 'block' : 'none';
    Vin.el.style.display = (cfg === 'summing' || cfg === 'difference') ? 'none' : 'block';
    V1.el.style.display = (cfg === 'summing' || cfg === 'difference') ? 'block' : 'none';
    V2.el.style.display = (cfg === 'summing' || cfg === 'difference') ? 'block' : 'none';

    const params: any = { Vcc: Vcc.value() };
    if (cfg === 'inverting') { params.R1 = R1.value(); params.Rf = Rf.value(); params.Vin = Vin.value(); }
    if (cfg === 'non-inverting') { params.Rg = Rg.value(); params.Rf = Rf.value(); params.Vin = Vin.value(); }
    if (cfg === 'follower') { params.Vin = Vin.value(); }
    if (cfg === 'summing') { params.R1 = R1.value(); params.R2 = R2.value(); params.Rf = Rf.value(); params.V1 = V1.value(); params.V2 = V2.value(); }
    if (cfg === 'difference') { params.R1 = R1.value(); params.R2 = R2.value(); params.V1 = V1.value(); params.V2 = V2.value(); }

    let r;
    try { r = analyze(cfg, params); }
    catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }

    const regionColor = r.region === 'linear' ? '#3b6b4f' : '#6b3b4f';
    const ZinStr = Number.isFinite(r.Zin_kOhm) ? `${r.Zin_kOhm.toFixed(3)} kΩ` : '∞';
    readouts.innerHTML = `
      <div><b>transfer:</b> ${r.transferExpr}</div>
      <div><b>Vout:</b> ${r.Vout.toFixed(3)} V</div>
      <div><b>Zin:</b> ${ZinStr}</div>
      <div><b>region:</b> <span style="color:${regionColor};font-weight:bold;">${r.region}</span></div>
    `;

    // Summing/difference sweep V1 (V2 fixed); the rest sweep Vin.
    const sweepsV1 = cfg === 'summing' || cfg === 'difference';
    // Sweep range: ±2·Vcc/|slope| so both knees are visible; follower slope=1 → ±2·Vcc.
    // Summing has no single Av, so its V1-slope is Rf/R1.
    let slopeAbs = cfg === 'summing' ? Rf.value() / R1.value() : Math.abs(r.Av);
    if (!(slopeAbs > 0) || !Number.isFinite(slopeAbs)) slopeAbs = 1;
    const xMax = 2 * Vcc.value() / slopeAbs;
    const xs = linspace(-xMax, xMax, 200);
    const ys = transfer(cfg, params, xs);
    linePlot(plotHost, [
      { label: sweepsV1 ? 'Vout vs V1' : 'Vout vs Vin', data: xs.map((x, i) => ({ x, y: ys[i]! })) },
    ], { xLabel: sweepsV1 ? 'V1 (V)' : 'Vin (V)', yLabel: 'Vout (V)' });
  };

  for (const w of [config, R1, R2, Rf, Rg, Vcc, Vin, V1, V2]) {
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
  id: 'opamp',
  title: 'Op-Amp Circuits',
  course: 'Elektronica1A',
  description: 'Ideal op-amp configurations with saturation-aware transfer curve.',
  icon: '∞',
  render,
};
