import type { Module } from '../../module.ts';
import type { Complex } from '../../math/complex.ts';
import { zinLossless, zToGamma, swr, quarterWaveZ } from '../../math/tl.ts';
import { cabs } from '../../math/complex.ts';
import { zinSweep, vmaxPosition, vminPosition } from '../../math/tlinputz.ts';
import { linePlot } from '../../ui/plots.ts';
import { smithChart } from '../../ui/smith.ts';
import { slider } from '../../ui/inputs.ts';

function sig3(x: number): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : x < 0 ? '−∞' : 'NaN';
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const zLre = slider('Z_L real (Ω)', 0, 200, 1, 75);
  const zLim = slider('Z_L imag (Ω)', -100, 100, 1, 0);
  const z0 = slider('Z₀ (Ω)', 10, 200, 1, 50);
  const length = slider('line length (λ)', 0, 0.5, 0.001, 0.1);
  for (const w of [zLre, zLim, z0, length]) host.appendChild(w.el);

  const smithHost = document.createElement('div');
  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(smithHost);
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const smith = smithChart(smithHost, {});

  const update = () => {
    const zL: Complex = { re: zLre.value(), im: zLim.value() };
    const z0v = z0.value();
    const betaL = 2 * Math.PI * length.value();

    const zin = zinLossless(zL, betaL, z0v);
    const gamma = zToGamma(zL, z0v);

    const mag = cabs(gamma);
    const swrv = mag < 1 ? swr(gamma) : Infinity;
    const qwZ = Math.abs(zLim.value()) < 0.5 && zLre.value() > 0
      ? quarterWaveZ(zLre.value(), z0v) : NaN;
    const vmax = mag < 1 ? vmaxPosition(gamma) : NaN;
    const vmin = mag < 1 ? vminPosition(gamma) : NaN;

    readouts.innerHTML = `
      <div><b>Zin:</b> ${sig3(zin.re)} + j${sig3(zin.im)} Ω</div>
      <div><b>|Γ|:</b> ${sig3(mag)}</div>
      <div><b>SWR:</b> ${sig3(swrv)}</div>
      <div><b>λ/4 Z₀':</b> ${Number.isNaN(qwZ) ? '— (real Z_L only)' : sig3(qwZ) + ' Ω'}</div>
      <div><b>Vmax position:</b> ${Number.isNaN(vmax) ? '—' : sig3(vmax) + ' λ'}</div>
      <div><b>Vmin position:</b> ${Number.isNaN(vmin) ? '—' : sig3(vmin) + ' λ'}</div>
    `;

    const sweep = zinSweep(zL, z0v, 0, Math.PI, 120);
    const reSeries = sweep.map((p) => ({ x: p.betaL / (2 * Math.PI), y: p.zin.re }));
    const imSeries = sweep.map((p) => ({ x: p.betaL / (2 * Math.PI), y: p.zin.im }));
    linePlot(plotHost, [
      { label: 'Re(Zin)', data: reSeries },
      { label: 'Im(Zin)', data: imSeries },
    ], { xLabel: 'l (λ)', yLabel: 'Zin (Ω)' });

    smith.update([
      ...sweep.map((p) => ({ z: p.zin })),
      { z: zL, label: 'load' },
      { z: zin, label: 'Zin' },
    ]);
  };

  for (const w of [zLre, zLim, z0, length]) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'tl-input-impedance',
  title: 'TL Input Impedance',
  course: 'Hoogfrequenttechniek',
  description: 'Input impedance vs line length, SWR, reflection coefficient, λ/4 transformer.',
  icon: 'Zᵢ',
  render,
};