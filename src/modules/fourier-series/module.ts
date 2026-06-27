import type { Module } from '../../module.ts';
import { coefficientsFor, partialSum, sampleWaveform, type Waveform } from '../../math/fourier.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const wave = selectWave('Waveform', ['square', 'triangle', 'sawtooth', 'pulse'], 'square');
  const N = slider('Harmonics N', 1, 50, 1, 5);
  host.appendChild(wave.el);
  host.appendChild(N.el);

  const reconHost = document.createElement('div');
  const specHost = document.createElement('div');
  host.appendChild(reconHost);
  host.appendChild(specHost);

  const update = () => {
    const w = wave.value() as Waveform;
    const n = Math.max(1, Math.floor(N.value()));
    const a = coefficientsFor(w, n);
    const period = 1;
    const M = 400;
    const ts = Array.from({ length: M }, (_, i) => (i / (M - 1)) * (2 * period));
    const original = ts.map((t) => ({ x: t, y: sampleWaveform(w, t, period) }));
    const recon = ts.map((t) => ({ x: t, y: partialSum(a, t, period) }));
    linePlot(reconHost, [
      { label: 'original', data: original },
      { label: `partial sum (N=${n})`, data: recon },
    ], { yLabel: 'f(t)', xLabel: 't' });

    const spec = Array.from({ length: n + 1 }, (_, k) => ({ x: k, y: Math.abs(a[k] ?? 0) }));
    linePlot(specHost, [{ label: '|aₙ|', data: spec }], { yLabel: '|aₙ|', xLabel: 'n' });
  };

  wave.el.querySelector('select')!.addEventListener('change', update);
  N.el.querySelector('input')!.addEventListener('input', update);
  update();
}

export const module: Module = {
  id: 'fourier-series',
  title: 'Fourier Series',
  course: 'Fourier',
  description: 'Watch harmonics rebuild a waveform.',
  icon: '∑',
  render,
};
