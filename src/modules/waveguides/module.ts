import type { Module } from '../../module.ts';
import { cutoffFreq, phaseVelocity, groupVelocity, guideWavelength, modeField, type Mode } from '../../math/waveguides.ts';
import { fieldPlot } from '../../ui/fieldplot.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const C0 = 2.998e8; // ponytail: vacuum only, no dielectric slider

function sig3(x: number): string {
  return Number.isFinite(x) ? x.toPrecision(3) : '—';
}

function modeMN(mode: string): [number, number] {
  return [Number(mode[2]), Number(mode[3])];
}

function render(host: HTMLElement) {
  const mode = selectWave('Mode', ['TE10', 'TE20', 'TE01', 'TE11', 'TM11'], 'TE10');
  const a = slider('a (mm)', 5, 50, 0.1, 22.86);
  const b = slider('b (mm)', 2, 25, 0.1, 10.16);
  const f = slider('f (GHz)', 1, 30, 0.1, 10);
  for (const w of [mode, a, b, f]) host.appendChild(w.el);

  const fieldHost = document.createElement('div');
  const dispHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(fieldHost);
  host.appendChild(readouts);
  host.appendChild(dispHost);

  const update = () => {
    const m = mode.value() as Mode;
    const [mi, ni] = modeMN(m);
    const aM = a.value() / 1000; // mm → m
    const bM = b.value() / 1000;
    const fHz = f.value() * 1e9; // GHz → Hz
    const fc = cutoffFreq(mi, ni, aM, bM, C0);
    const above = fHz > fc;
    const vp = above ? phaseVelocity(fHz, fc, C0) : NaN;
    const vg = above ? groupVelocity(fHz, fc, C0) : NaN;
    const lg = above ? guideWavelength(fHz, fc, C0) : NaN;

    readouts.innerHTML = `
      <div><b>fc:</b> ${sig3(fc / 1e9)} GHz</div>
      <div><b>vp:</b> ${above ? sig3(vp / C0) + 'c' : '—'}</div>
      <div><b>vg:</b> ${above ? sig3(vg / C0) + 'c' : '—'}</div>
      <div><b>λg:</b> ${above ? sig3(lg * 100) + ' cm' : '—'}</div>
      <div><b>${above ? 'above cutoff' : 'BELOW CUTOFF (evanescent)'}</b></div>
    `;

    // Transverse |E| heat map (nx×ny grid; arrows = E-field direction).
    // ponytail: square canvas — waveguide aspect (a:b) not to scale, pattern only.
    const nx = 20, ny = 10;
    const vectors: { x: number; y: number; vx: number; vy: number }[] = [];
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = (i / (nx - 1)) * aM;
        const y = (j / (ny - 1)) * bM;
        const { Ex, Ey } = modeField(m, x, y, aM, bM);
        vectors.push({ x: i, y: j, vx: Ex, vy: Ey });
      }
    }
    fieldPlot(fieldHost, { nx, ny, vectors }, { title: `${m} |E| (transverse)`, showMagnitude: true });

    // Dispersion: vp, vg (×c) vs f, swept above fc.
    const fLo = Math.max(fc * 1.05, 1e9);
    const fHi = Math.min(fc * 4, 30e9);
    if (fHi > fLo) {
      const N = 50;
      const vpSeries: { x: number; y: number }[] = [];
      const vgSeries: { x: number; y: number }[] = [];
      for (let i = 0; i < N; i++) {
        const ff = fLo + ((fHi - fLo) * i) / (N - 1);
        vpSeries.push({ x: ff / 1e9, y: phaseVelocity(ff, fc, C0) / C0 });
        vgSeries.push({ x: ff / 1e9, y: groupVelocity(ff, fc, C0) / C0 });
      }
      linePlot(dispHost, [
        { label: 'vp/c', data: vpSeries },
        { label: 'vg/c', data: vgSeries },
      ], { xLabel: 'f (GHz)', yLabel: 'v / c' });
    } else {
      dispHost.innerHTML = '<div style="color:#888">fc out of sweep range</div>';
    }
  };

  for (const w of [mode, a, b, f]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'waveguides',
  title: 'Rectangular Waveguides',
  course: 'Elektromagnetische Velden',
  description: 'Rectangular waveguides: TE/TM cutoff, phase/group velocity, TE10 field profile.',
  icon: 'TE',
  render,
};
