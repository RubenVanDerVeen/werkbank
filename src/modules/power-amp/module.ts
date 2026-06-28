import type { Module } from '../../module.ts';
import { analyze, transfer, type PaClass } from '../../math/poweramp.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const cls = selectWave('Class', ['A', 'B', 'AB'], 'B');
  const Vcc = slider('Vcc (V)', 5, 40, 0.1, 15);
  const Vp = slider('Vp (V)', 0, 40, 0.1, 14);
  const RL = slider('RL (Ω)', 1, 100, 0.1, 8);
  const Icq = slider('Icq (mA)', 0, 500, 1, 0);
  const Vbe = slider('Vbe (V)', 0.4, 0.8, 0.01, 0.7);
  for (const w of [cls, Vcc, Vp, RL, Icq, Vbe]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const c = cls.value() as PaClass;
    Icq.el.style.display = c === 'B' ? 'none' : 'block';
    Vbe.el.style.display = c === 'B' ? 'block' : 'none';

    if (RL.value() <= 0) { readouts.textContent = 'error: RL must be > 0'; return; }
    if (Vp.value() > Vcc.value()) { readouts.textContent = 'error: Vp must be ≤ Vcc'; return; }
    if (c === 'A' && Icq.value() === 0) { readouts.textContent = 'error: Icq must be > 0'; return; }

    const r = analyze(c, { Vcc: Vcc.value(), Vp: Vp.value(), RL: RL.value(), Icq: Icq.value() / 1000 });
    readouts.innerHTML = `
      <div><b>Pout:</b> ${r.Pout_W.toFixed(3)} W</div>
      <div><b>Pdc:</b> ${r.Pdc_W.toFixed(3)} W</div>
      <div><b>η:</b> ${(r.eta * 100).toFixed(3)} %</div>
      <div><b>η_max:</b> ${(r.etaMax * 100).toFixed(3)} %</div>
      <div><b>Pdiss:</b> ${r.Pdiss_W.toFixed(3)} W</div>
    `;
    const xs = linspace(-Vcc.value(), Vcc.value(), 201);
    linePlot(plotHost, [
      { label: 'Vout', data: xs.map((x) => ({ x, y: transfer(c, { Vcc: Vcc.value(), Vbe: Vbe.value() }, x) })) },
    ], { xLabel: 'Vin (V)', yLabel: 'Vout (V)' });
  };

  for (const w of [cls, Vcc, Vp, RL, Icq, Vbe]) {
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
  id: 'power-amp',
  title: 'Power Amplifiers',
  course: 'Elektronica1B',
  description: 'Class A/B/AB power stages: output power, efficiency, crossover.',
  icon: 'Po',
  render,
};
