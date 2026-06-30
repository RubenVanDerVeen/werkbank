import type { Complex } from '../math/complex.ts';
import { cadd, csub, cdiv, cscale } from '../math/complex.ts';

export type SmithPoint = { z: Complex; label?: string };

const SVGNS = 'http://www.w3.org/2000/svg';
const R_GRID = [0, 0.3, 1, 3];
const X_GRID = [0.3, 1, 3];

export function smithChart(host: HTMLElement, opts: { z0?: number; title?: string } = {}) {
  const z0 = opts.z0 ?? 50;
  host.innerHTML = '';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 360');
  svg.setAttribute('width', '360');
  svg.setAttribute('height', '360');
  const cx = 180, cy = 180, R = 160;

  const line = (x1: number, y1: number, x2: number, y2: number, stroke = '#888', w = 0.5) => {
    const el = document.createElementNS(SVGNS, 'line');
    el.setAttribute('x1', String(x1)); el.setAttribute('y1', String(y1));
    el.setAttribute('x2', String(x2)); el.setAttribute('y2', String(y2));
    el.setAttribute('stroke', stroke); el.setAttribute('stroke-width', String(w));
    svg.appendChild(el);
  };
  const circle = (ox: number, oy: number, r: number, stroke = '#bbb', w = 0.5) => {
    const el = document.createElementNS(SVGNS, 'circle');
    el.setAttribute('cx', String(ox)); el.setAttribute('cy', String(oy));
    el.setAttribute('r', String(r));
    el.setAttribute('fill', 'none'); el.setAttribute('stroke', stroke);
    el.setAttribute('stroke-width', String(w));
    svg.appendChild(el);
  };
  // ponytail: sparse Smith grid (4 r-circles, 3 x-arcs each side).
  // r-circle: center (r/(1+r), 0), radius 1/(1+r) in normalized Γ coords.
  for (const r of R_GRID) {
    const ox = r / (1 + r), rad = 1 / (1 + r);
    circle(cx + ox * R, cy, rad * R);
  }
  // x-arc: circle through Γ=1 with center (1, 1/x) in normalized coords.
  for (const x of X_GRID) {
    for (const s of [1, -1]) {
      const ox = 1, oy = s / x, rad = 1 / Math.abs(x);
      circle(cx + ox * R, cy - oy * R, rad * R);
    }
  }
  line(cx - R, cy, cx + R, cy, '#ccc', 0.5); // real axis
  line(cx, cy - R, cx, cy + R, '#ccc', 0.5); // imag axis
  circle(cx, cy, R, '#444', 1); // outer unit circle

  const dots: SVGGElement[] = [];
  host.appendChild(svg);
  return {
    update(points: SmithPoint[]) {
      for (const d of dots) d.remove();
      dots.length = 0;
      for (const p of points) {
        const zn = cscale(p.z, 1 / z0);
        const one: Complex = { re: 1, im: 0 };
        const g = cdiv(csub(zn, one), cadd(zn, one));
        const px = cx + g.re * R, py = cy - g.im * R;
        const dot = document.createElementNS(SVGNS, 'circle');
        dot.setAttribute('cx', String(px)); dot.setAttribute('cy', String(py));
        dot.setAttribute('r', '3'); dot.setAttribute('fill', '#1a1a1a');
        svg.appendChild(dot);
        if (p.label) {
          const t = document.createElementNS(SVGNS, 'text');
          t.setAttribute('x', String(px + 5)); t.setAttribute('y', String(py - 5));
          t.setAttribute('font-size', '10'); t.setAttribute('fill', '#1a1a1a');
          t.textContent = p.label;
          svg.appendChild(t);
          dots.push(t);
        }
        dots.push(dot);
      }
    },
  };
}