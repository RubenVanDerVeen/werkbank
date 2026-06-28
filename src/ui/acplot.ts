import uPlot from 'uplot';
if (typeof document !== 'undefined') { void import('uplot/dist/uPlot.min.css'); }

export type BodePlotPoint = { omega: number; magDb: number; phaseDeg: number };

export function bodePlot(host: HTMLElement, points: BodePlotPoint[], opts: { title?: string } = {}) {
  host.innerHTML = '';
  const freqs = points.map((p) => p.omega / (2 * Math.PI));
  const mag = points.map((p) => p.magDb);
  const phase = points.map((p) => p.phaseDeg);
  const mk = (label: string, ys: number[], yLabel: string) => {
    const div = document.createElement('div');
    host.appendChild(div);
    return new uPlot({
      width: host.clientWidth || 600,
      height: 180,
      title: opts.title && label === 'Magnitude' ? opts.title : '',
      scales: { x: { time: false, distr: 3 } },
      axes: [{ label: 'f (Hz)' }, { label: yLabel }],
      series: [{}, { label, stroke: '#1a1a1a', width: 1.5 }],
    }, [freqs, ys], div);
  };
  const pm = mk('Magnitude', mag, 'dB');
  const pp = mk('Phase', phase, 'deg');
  return {
    update(next: BodePlotPoint[]) {
      const f = next.map((p) => p.omega / (2 * Math.PI));
      pm.setData([f, next.map((p) => p.magDb)]);
      pp.setData([f, next.map((p) => p.phaseDeg)]);
    },
  };
}
