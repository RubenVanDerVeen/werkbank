import type { Module } from '../../module.ts';
import {
  arrayFactor, nulls, broadsideHpbw, scanAngle, hasGratingLobe, elementPattern,
} from '../../math/arrays.ts';
import { polarPlot } from '../../ui/polarplot.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

type ElKind = 'isotropic' | 'dipole';

function sig3(x: number): string {
  return x.toPrecision(3);
}

function render(host: HTMLElement) {
  const N = slider('N', 2, 20, 1, 4);
  const dLambda = slider('d/λ', 0.05, 2, 0.05, 0.5);
  const alphaDeg = slider('α (°)', -180, 180, 1, 0);
  const element = selectWave('Element', ['isotropic', 'dipole'], 'isotropic');
  for (const w of [N, dLambda, alphaDeg, element]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const LAMBDA = 1;        // ponytail: λ-normalized
  const K = (2 * Math.PI) / LAMBDA;
  const SAMPLES = 180;     // 1° per sample over [0, π]

  const update = () => {
    const n = Math.round(N.value());
    const d = dLambda.value() * LAMBDA;
    const alpha = (alphaDeg.value() * Math.PI) / 180;
    const kind = element.value() as ElKind;

    const thetas: number[] = [];
    for (let i = 0; i <= SAMPLES; i++) thetas.push((Math.PI * i) / SAMPLES);

    const afSamples = thetas.map((t) => ({ theta: t, r: arrayFactor(t, n, d, alpha, K) }));
    const series = [{ label: 'AF', samples: afSamples }];
    if (kind !== 'isotropic') {
      const elSamples = thetas.map((t) => ({ theta: t, r: elementPattern(t, kind) }));
      const totSamples = thetas.map((t) => ({
        theta: t,
        r: arrayFactor(t, n, d, alpha, K) * elementPattern(t, kind),
      }));
      series.push({ label: 'element', samples: elSamples });
      series.push({ label: 'total', samples: totSamples });
    }
    polarPlot(plotHost, series, { half: true, title: 'Array factor' });

    const beam = scanAngle(n, d, alpha, K);
    const nul = nulls(n, d, alpha, K);
    const hpbw = broadsideHpbw(n, d, LAMBDA); // ponytail: broadside approx shown when scanned
    const gl = hasGratingLobe(d, LAMBDA);
    readouts.innerHTML = `
      <div><b>Main beam:</b> ${sig3(beam)}°</div>
      <div><b>Nulls:</b> ${nul.map((x) => sig3(x) + '°').join(', ') || '—'}</div>
      <div><b>HPBW (broadside ≈):</b> ${sig3(hpbw)}°</div>
      <div><b>Grating lobes:</b> ${gl ? 'yes (d > λ)' : 'no'}</div>
    `;
  };

  for (const w of [N, dLambda, alphaDeg, element]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'antenna-arrays',
  title: 'Linear Antenna Arrays',
  course: 'Antennes',
  description: 'Linear antenna arrays: array factor, beam scanning, nulls, HPBW, grating lobes.',
  icon: '≡',
  render,
};