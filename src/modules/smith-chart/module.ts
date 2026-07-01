import type { Module } from '../../module.ts';
import { cphaseDeg, type Complex } from '../../math/complex.ts';
import { zToGamma, gammaToZ, swr } from '../../math/tl.ts';
import { admittanceFromImpedance, constantRCircle, constantXCircle } from '../../math/smithmath.ts';
import { smithChart } from '../../ui/smith.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

function sig3(x: number): string {
  return Number.isFinite(x) ? x.toPrecision(3) : '∞';
}

function neg(g: Complex): Complex {
  return { re: -g.re, im: -g.im };
}

// Geometry of the unit Gamma circle in the rendered Smith SVG.
// ponytail: the foundation draws the unit boundary (and the r=0 grid circle)
// centered at the viewBox center; x-arcs have huge radii and sit off-center, so
// filtering to the viewBox-centered circle picks the boundary robustly without
// hardcoding 180/160 (which would break if the foundation is resized).
function smithGeom(svg: SVGSVGElement): { cx: number; cy: number; r: number } {
  const vb = svg.viewBox.baseVal;
  const vcx = vb.x + vb.width / 2;
  const vcy = vb.y + vb.height / 2;
  let best: { cx: number; cy: number; r: number } | null = null;
  for (const c of Array.from(svg.querySelectorAll('circle'))) {
    const cx = Number(c.getAttribute('cx'));
    const cy = Number(c.getAttribute('cy'));
    const r = Number(c.getAttribute('r'));
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(r)) continue;
    if (Math.abs(cx - vcx) > 1 || Math.abs(cy - vcy) > 1) continue;
    if (!best || r > best.r) best = { cx, cy, r };
  }
  // ponytail: fallback (viewBox-inscribed) only if the foundation ever drops <circle>.
  return best ?? { cx: vcx, cy: vcy, r: Math.min(vb.width, vb.height) / 2 };
}

// Screen click -> Gamma in the chart plane (+Im up). Uses getScreenCTM so
// aspect ratio / preserveAspectRatio are handled correctly (no createSVGPoint).
function clickToGamma(e: MouseEvent, svg: SVGSVGElement, geom: { cx: number; cy: number; r: number }): Complex {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { re: 0, im: 0 };
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  return { re: (p.x - geom.cx) / geom.r, im: -(p.y - geom.cy) / geom.r };
}

function setSlider(w: { el: HTMLElement }, val: number): void {
  const input = w.el.querySelector('input')!;
  const step = Number(input.step) || 1;
  const min = Number(input.min);
  const max = Number(input.max);
  input.value = String(Math.min(max, Math.max(min, Math.round(val / step) * step)));
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function render(host: HTMLElement): void {
  const mode = selectWave('Mode', ['Impedance (Z)', 'Admittance (Y)'], 'Impedance (Z)');
  const Zre = slider('Z real (Ω)', 0, 500, 1, 50);
  const Zim = slider('Z imag (Ω)', -500, 500, 1, 0);
  const Z0 = slider('Z₀ (Ω)', 10, 200, 1, 50);
  for (const w of [mode, Zre, Zim, Z0]) host.appendChild(w.el);

  const chartHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(chartHost);
  host.appendChild(readouts);

  const sc = smithChart(chartHost, { z0: Z0.value(), title: 'Smith chart' });
  const svg = chartHost.querySelector('svg') as SVGSVGElement;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function overlays(g: Complex, isY: boolean): void {
    for (const o of Array.from(svg.querySelectorAll('[data-smith-overlay]'))) o.remove();
    const geom = smithGeom(svg);
    const circle = (gcx: number, gcy: number, gr: number, stroke: string, dash = '') => {
      if (!Number.isFinite(gr) || gr <= 0) return;
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', String(geom.cx + gcx * geom.r));
      c.setAttribute('cy', String(geom.cy - gcy * geom.r));
      c.setAttribute('r', String(gr * geom.r));
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', stroke);
      c.setAttribute('stroke-width', '1.2');
      if (dash) c.setAttribute('stroke-dasharray', dash);
      c.setAttribute('data-smith-overlay', '');
      svg.appendChild(c);
    };
    // constant-r / constant-x circles through the point (Z mode only).
    // ponytail: in Y mode the marker sits at the admittance (antipodal) position
    // and impedance circles would mislead - skip rather than reflect the grid.
    if (!isY) {
      const rc = constantRCircle(Zre.value() / Z0.value());
      const xc = constantXCircle(Zim.value() / Z0.value());
      circle(rc.cx, rc.cy, rc.radius, '#3b6b4f');
      circle(xc.cx, xc.cy, xc.radius, '#6b3b4f', '3 2');
    }
    // SWR circle (constant |Gamma|) - identical in both modes (|Gamma| is mode-independent).
    circle(0, 0, Math.hypot(g.re, g.im), '#b8860b');
  }

  const update = (): void => {
    const z0 = Z0.value();
    const Z: Complex = { re: Zre.value(), im: Zim.value() };
    const isY = mode.value().startsWith('Admittance');
    const g = zToGamma(Z, z0);
    const gmag = Math.hypot(g.re, g.im);
    overlays(g, isY);
    // Z mode feeds Z (plotted at Gamma). Y mode feeds the antipodal impedance so
    // the foundation plots the marker at -Gamma = the admittance position.
    const zFeed = isY ? gammaToZ(neg(g), z0) : Z;
    sc.update([{ z: zFeed, label: isY ? 'Y' : 'Z' }]);
    const Y = admittanceFromImpedance(Z);
    readouts.innerHTML = `
      <div><b>Γ:</b> ${sig3(g.re)} ${g.im >= 0 ? '+' : '−'} j${sig3(Math.abs(g.im))}</div>
      <div><b>|Γ|:</b> ${sig3(gmag)}, <b>∠Γ:</b> ${sig3(cphaseDeg(g))}°</div>
      <div><b>Z:</b> ${sig3(Z.re)} ${Z.im >= 0 ? '+' : '−'} j${sig3(Math.abs(Z.im))} Ω</div>
      <div><b>Y:</b> ${sig3(Y.re)} ${Y.im >= 0 ? '+' : '−'} j${sig3(Math.abs(Y.im))} S</div>
      <div><b>SWR:</b> ${sig3(gmag >= 1 ? Infinity : swr(g))}</div>
    `;
  };

  for (const w of [mode, Zre, Zim, Z0]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }

  svg.addEventListener('click', (e: MouseEvent) => {
    const z0 = Z0.value();
    const isY = mode.value().startsWith('Admittance');
    let g = clickToGamma(e, svg, smithGeom(svg));
    const mag = Math.hypot(g.re, g.im);
    if (mag > 1) g = { re: g.re / mag, im: g.im / mag }; // clamp to unit circle (passive)
    // Z mode: cursor Gamma = Gamma_Z(z). Y mode: cursor sits at the admittance
    // position (-Gamma_Z), so Gamma_Z = -g.
    const Z = gammaToZ(isY ? neg(g) : g, z0);
    setSlider(Zre, Z.re);
    setSlider(Zim, Z.im); // ponytail: two input events -> update() runs twice; cheap, idempotent
  });

  update();
}

export const module: Module = {
  id: 'smith-chart',
  title: 'Interactive Smith Chart',
  course: 'Hoogfrequenttechniek',
  description: 'Interactive Smith chart: Z↔Γ, admittance, SWR, constant-r/x circles.',
  icon: '◎',
  render,
};