import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export type XY = { x: number; y: number }[];

export function linePlot(host: HTMLElement, series: { label: string; data: XY }[], opts: { yLabel?: string; xLabel?: string } = {}) {
  host.innerHTML = '';
  const xs = series[0]?.data.map((p) => p.x) ?? [];
  const data: uPlot.AlignedData = [xs, ...series.map((s) => s.data.map((p) => p.y))];
  const plot = new uPlot({
    width: host.clientWidth || 600,
    height: 280,
    title: '',
    scales: { x: { time: false } },
    axes: [
      { label: opts.xLabel ?? '' },
      { label: opts.yLabel ?? '' },
    ],
    series: [
      {},
      ...series.map((s) => ({ label: s.label, stroke: pickColor(s.label), width: 1.5 })),
    ],
  }, data, host);
  return { update(next: { label: string; data: XY }[]) {
    const xs2 = next[0]?.data.map((p) => p.x) ?? [];
    plot.setData([xs2, ...next.map((s) => s.data.map((p) => p.y))]);
  } };
}

export function svgPlot(host: HTMLElement, draw: (svg: SVGSVGElement) => void, size = { w: 360, h: 360 }) {
  host.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size.w} ${size.h}`);
  svg.setAttribute('width', String(size.w));
  svg.setAttribute('height', String(size.h));
  draw(svg);
  host.appendChild(svg);
  return svg;
}

const palette = ['#1a1a1a', '#6b4f1d', '#3b6b4f', '#4f3b6b', '#6b3b4f'];
function pickColor(label: string): string {
  let h = 0; for (const c of label) h = (h * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length]!;
}