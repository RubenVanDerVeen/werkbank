import type { Module } from '../../module.ts';
import { bias, type Network } from '../../math/bjt-dc.ts';
import { selectWave, slider } from '../../ui/inputs.ts';
import { svgPlot } from '../../ui/plots.ts';

function render(host: HTMLElement) {
  const network = selectWave('Bias network', ['fixed', 'divider', 'emitter-feedback'], 'divider');
  const VCC = slider('VCC (V)', 5, 25, 0.5, 12);
  const beta = slider('β', 50, 300, 1, 100);
  const VBEon = slider('VBE on (V)', 0.5, 0.8, 0.01, 0.7);
  const VCEsat = slider('VCE sat (V)', 0.1, 0.3, 0.01, 0.2);
  const RB = slider('RB (kΩ)', 50, 2000, 10, 470);
  const RC = slider('RC (kΩ)', 0, 20, 0.1, 4);
  const RE = slider('RE (kΩ)', 0, 10, 0.1, 1);
  const R1 = slider('R1 (kΩ)', 10, 1000, 5, 120);
  const R2 = slider('R2 (kΩ)', 1, 500, 1, 30);

  const allSliders = [VCC, beta, VBEon, VCEsat, RB, RC, RE, R1, R2];
  host.appendChild(network.el);
  for (const s of allSliders) host.appendChild(s.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const net = network.value() as Network;
    // Show/hide irrelevant sliders
    RB.el.style.display = net === 'divider' ? 'none' : 'block';
    RE.el.style.display = net === 'fixed' ? 'none' : 'block';
    R1.el.style.display = net === 'divider' ? 'block' : 'none';
    R2.el.style.display = net === 'divider' ? 'block' : 'none';

    const params: any = {
      VCC: VCC.value(), beta: beta.value(), VBEon: VBEon.value(), VCEsat: VCEsat.value(),
      RC: RC.value(),
    };
    if (net === 'fixed') params.RB = RB.value();
    if (net === 'divider') { params.R1 = R1.value(); params.R2 = R2.value(); params.RE = RE.value(); }
    if (net === 'emitter-feedback') { params.RB = RB.value(); params.RE = RE.value(); }

    if (params.RC === 0) { readouts.textContent = 'error: RC must be > 0'; return; }
    if (net === 'fixed' && params.RB === 0) { readouts.textContent = 'error: RB must be > 0'; return; }
    if (net === 'divider' && (params.R1 + params.R2) === 0) { readouts.textContent = 'error: R1+R2 must be > 0'; return; }
    if (net === 'divider' && params.RE === 0) { readouts.textContent = 'error: RE must be > 0 for divider'; return; }

    const r = bias(net, params);
    const regionColor = r.region === 'active' ? '#3b6b4f' : r.region === 'saturation' ? '#6b3b4f' : '#888';
    readouts.innerHTML = `
      <div><b>IB:</b> ${r.IB_uA.toFixed(3)} µA</div>
      <div><b>IC:</b> ${r.ICmA.toFixed(3)} mA</div>
      <div><b>VCE:</b> ${r.VCE.toFixed(3)} V</div>
      <div><b>VCB:</b> ${r.VCB.toFixed(3)} V</div>
      <div><b>region:</b> <span style="color:${regionColor};font-weight:bold;">${r.region}</span></div>
      <div><b>load line:</b> (0, ${r.loadLine.iMax_mA.toFixed(2)} mA) ↔ (${r.loadLine.vMax.toFixed(2)} V, 0)</div>
    `;
    drawLoadLine(plotHost, r, params.VCC);
  };

  const inputs = [network, ...allSliders];
  for (const w of inputs) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

// ponytail: stylized curves, not Ebers-Moll; the load line and Q-point are the exact part
function drawLoadLine(host: HTMLElement, r: { ICmA: number; VCE: number; loadLine: { iMax_mA: number; vMax: number }; region: string }, VCC: number) {
  const size = { w: 480, h: 320 };
  const margin = { l: 50, r: 20, t: 20, b: 40 };
  const iMax = Math.max(r.loadLine.iMax_mA * 1.1, r.ICmA * 1.2);
  const vMax = VCC;
  const xScale = (size.w - margin.l - margin.r) / vMax;
  const yScale = (size.h - margin.t - margin.b) / iMax;
  const xPx = (v: number) => margin.l + v * xScale;
  const yPx = (i: number) => size.h - margin.b - i * yScale;

  svgPlot(host, (svg) => {
    // Axes
    line(svg, xPx(0), yPx(0), xPx(vMax), yPx(0), '#1a1a1a');
    line(svg, xPx(0), yPx(0), xPx(0), yPx(iMax), '#1a1a1a');
    // Stylized output-characteristics family at IB = 5,10,20,40,80 µA
    const IBs = [5, 10, 20, 40, 80];
    for (const ib of IBs) {
      const ic = (ib * 100) / 1000; // β=100 → IC = β·IB (µA→mA)
      if (ic > iMax) continue;
      // Flat in active region, knee at VCEsat
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const satV = 0.2;
      d.setAttribute('d', `M ${xPx(0)} ${yPx(ic)} L ${xPx(satV)} ${yPx(ic * 0.7)} L ${xPx(vMax)} ${yPx(ic)}`);
      d.setAttribute('stroke', '#c8c2b0');
      d.setAttribute('fill', 'none');
      svg.appendChild(d);
    }
    // DC load line
    line(svg, xPx(0), yPx(r.loadLine.iMax_mA), xPx(r.loadLine.vMax), yPx(0), '#6b4f1d');
    // Q-point
    const q = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    q.setAttribute('cx', String(xPx(r.VCE)));
    q.setAttribute('cy', String(yPx(r.ICmA)));
    q.setAttribute('r', '5');
    q.setAttribute('fill', '#1a1a1a');
    svg.appendChild(q);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', String(xPx(r.VCE) + 8));
    label.setAttribute('y', String(yPx(r.ICmA) - 8));
    label.setAttribute('font-size', '12');
    label.setAttribute('font-family', 'ui-monospace, monospace');
    label.textContent = `Q (${r.VCE.toFixed(2)}, ${r.ICmA.toFixed(2)})`;
    svg.appendChild(label);
  }, size);
}

function line(svg: SVGSVGElement, x1: number, y1: number, x2: number, y2: number, color: string) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
  el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
  el.setAttribute('stroke', color); el.setAttribute('stroke-width', '1.5');
  svg.appendChild(el);
}

export const module: Module = {
  id: 'bjt-dc',
  title: 'BJT DC Bias',
  course: 'Elektronika1A',
  description: 'DC bias, Q-point and load line on the output characteristics.',
  icon: 'Q',
  render,
};
