import type { Module } from '../../module.ts';
import { tfFromCoeffs, poles, zeros, dcGain } from '../../math/tf.ts';
import { bode } from '../../math/bode.ts';
import { stepResponse } from '../../math/step.ts';
import { linePlot, svgPlot } from '../../ui/plots.ts';
import { polyInput } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  let bodeHandle: ReturnType<typeof linePlot> | null = null;
  let stepHandle: ReturnType<typeof linePlot> | null = null;

  const numIn = polyInput('Numerator coefficients (high → low)', [1, 0]);
  const denIn = polyInput('Denominator coefficients (high → low)', [1, 3, 2]);
  host.appendChild(numIn.el);
  host.appendChild(denIn.el);

  const pzHost = document.createElement('div');
  const readouts = document.createElement('div');
  const bodeHost = document.createElement('div');
  const stepHost = document.createElement('div');
  host.appendChild(pzHost);
  host.appendChild(readouts);
  host.appendChild(bodeHost);
  host.appendChild(stepHost);

  const update = () => {
    let sys;
    try { sys = tfFromCoeffs(numIn.value(), denIn.value()); }
    catch (e) { readouts.textContent = `error: ${(e as Error).message}`; return; }

    const ps = poles(sys); const zs = zeros(sys);
    drawPoleZero(pzHost, ps, zs);
    readouts.innerHTML = `
      <div><b>poles:</b> ${ps.map((p) => p.toFixed(3)).join(', ') || '—'}</div>
      <div><b>zeros:</b> ${zs.map((p) => p.toFixed(3)).join(', ') || '—'}</div>
      <div><b>DC gain:</b> ${dcGain(sys).toFixed(4)}</div>
    `;

    const w = logspace(-2, 3, 60);
    const b = bode(sys, w.map((omega) => ({ omega })));
    bodeHandle = linePlot(bodeHost, [
      { label: 'magnitude (dB)', data: b.map((p) => ({ x: Math.log10(p.omega), y: p.magDb })) },
      { label: 'phase (deg)', data: b.map((p) => ({ x: Math.log10(p.omega), y: p.phaseDeg })) },
    ], { yLabel: 'dB / deg', xLabel: 'log10(ω)' });

    const y = stepResponse(sys, 10, 0.02);
    stepHandle = linePlot(stepHost, [
      { label: 'step response', data: y.map((p) => ({ x: p.t, y: p.y })) },
    ], { yLabel: 'y(t)', xLabel: 't (s)' });
  };

  numIn.el.querySelector('input')!.addEventListener('input', update);
  denIn.el.querySelector('input')!.addEventListener('input', update);
  update();
}

function drawPoleZero(host: HTMLElement, ps: number[], zs: number[]) {
  const all = [...ps, ...zs].filter(Number.isFinite);
  if (all.length === 0) { host.innerHTML = ''; return; }
  const span = Math.max(2, ...all.map((v) => Math.abs(v))) * 1.2;
  const size = { w: 360, h: 360 };
  svgPlot(host, (svg) => {
    const cx = size.w / 2, cy = size.h / 2;
    const scale = (size.w / 2 - 20) / span;
    // axes
    axis(svg, cx, cy, size.w, size.h);
    // poles (×) and zeros (○)
    for (const p of ps) {
      const x = cx + p * scale, y = cy;
      cross(svg, x, y, 6, '#1a1a1a');
    }
    for (const z of zs) {
      const x = cx + z * scale, y = cy;
      circle(svg, x, y, 5, '#6b4f1d');
    }
  }, size);
}

function axis(svg: SVGSVGElement, cx: number, cy: number, w: number, h: number) {
  line(svg, 0, cy, w, cy, '#e5e0d2');
  line(svg, cx, 0, cx, h, '#e5e0d2');
}
function line(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, color: string) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
  el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
  el.setAttribute('stroke', color); svg.appendChild(el);
}
function cross(svg: SVGSVGElement, x: number, y: number, r: number, color: string) {
  line(svg, x - r, y - r, x + r, y + r, color);
  line(svg, x - r, y + r, x + r, y - r, color);
}
function circle(svg: SVGSVGElement, x: number, y: number, r: number, color: string) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.setAttribute('cx', String(x)); el.setAttribute('cy', String(y));
  el.setAttribute('r', String(r)); el.setAttribute('stroke', color);
  el.setAttribute('fill', 'none'); el.setAttribute('stroke-width', '1.5');
  svg.appendChild(el);
}

function logspace(loExp: number, hiExp: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(10 ** (loExp + ((hiExp - loExp) * i) / (n - 1)));
  return out;
}

export const module: Module = {
  id: 'transfer-fn',
  title: 'Transfer Function',
  course: 'Regeltechniek',
  description: 'Poles, zeros, Bode, step response.',
  icon: 'ω',
  render,
};
