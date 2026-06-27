import type { Module } from '../../module.ts';
import { routhArray, routhStability, auxiliaryEquationWarning } from '../../math/routh.ts';
import { polyInput } from '../../ui/inputs.ts';
import { svgPlot } from '../../ui/plots.ts';

function render(host: HTMLElement) {
  const polyIn = polyInput('Characteristic polynomial (high → low)', [1, 6, 11, 6]);
  host.appendChild(polyIn.el);

  const tableHost = document.createElement('div');
  const verdictHost = document.createElement('div');
  const rootsHost = document.createElement('div');
  host.appendChild(tableHost);
  host.appendChild(verdictHost);
  host.appendChild(rootsHost);

  const update = () => {
    const coef = polyIn.value();
    if (coef.length < 2) { verdictHost.textContent = 'need at least degree-1 polynomial'; return; }
    const rows = routhArray(coef);
    tableHost.innerHTML = renderTable(rows);
    verdictHost.innerHTML = `<b>stability:</b> ${routhStability(coef)}`;
    const w = auxiliaryEquationWarning(coef);
    if (w.kind === 'auxiliary') {
      verdictHost.innerHTML += ` &nbsp; <b>auxiliary equation at row ${w.rowIndex}:</b> s${formatPoly(w.poly)} = 0`;
    }
    drawRoots(rootsHost, polyRoots(coef));
  };

  polyIn.el.querySelector('input')!.addEventListener('input', update);
  update();
}

function renderTable(rows: number[][]): string {
  const cols = Math.max(...rows.map((r) => r.length));
  let html = '<table style="border-collapse:collapse;font-family:ui-monospace,monospace;font-size:13px;">';
  for (const r of rows) {
    html += '<tr>';
    for (let i = 0; i < cols; i++) {
      const v = r[i];
      html += `<td style="border:1px solid #e5e0d2;padding:6px 10px;text-align:right;">${v === undefined ? '—' : v.toFixed(3)}</td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  return html;
}

function formatPoly(p: number[]): string {
  const terms: string[] = [];
  let first = true;
  for (let i = 0; i < p.length; i++) {
    if (p[i] === undefined || p[i] === 0) continue;
    const exp = p.length - 1 - i;
    const sign = p[i]! >= 0 ? (first ? '' : ' + ') : ' − ';
    const mag = Math.abs(p[i]!);
    const coefStr = exp === 0 ? `${mag}` : mag === 1 ? '' : `${mag}`;
    const sStr = exp <= 1 ? (exp === 1 ? 's' : '') : `s<sup>${exp}</sup>`;
    terms.push(`${sign}${coefStr}${sStr}`);
    first = false;
  }
  return terms.join('') || '0';
}

function polyRoots(p: number[]): number[] {
  const n = p.length - 1;
  if (n === 1) return [-p[1]! / p[0]!];
  if (n === 2) {
    const a = p[0]!, b = p[1]!, c = p[2]!;
    const d = b * b - 4 * a * c;
    if (d >= 0) return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
    return [];
  }
  return [];
}

function drawRoots(host: HTMLElement, roots: number[]) {
  if (roots.length === 0) { host.innerHTML = ''; return; }
  const span = Math.max(2, ...roots.map((v) => Math.abs(v))) * 1.2;
  const size = { w: 360, h: 200 };
  svgPlot(host, (svg) => {
    const cx = size.w / 2, cy = size.h / 2;
    const scale = (size.w / 2 - 20) / span;
    const ax = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ax.setAttribute('x1', '0'); ax.setAttribute('y1', String(cy));
    ax.setAttribute('x2', String(size.w)); ax.setAttribute('y2', String(cy));
    ax.setAttribute('stroke', '#e5e0d2'); svg.appendChild(ax);
    for (const r of roots) {
      const x = cx + r * scale, y = cy;
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', String(x)); c.setAttribute('cy', String(y)); c.setAttribute('r', '5');
      c.setAttribute('stroke', '#1a1a1a'); c.setAttribute('fill', 'none');
      svg.appendChild(c);
    }
  }, size);
}

export const module: Module = {
  id: 'routh-hurwitz',
  title: 'Routh-Hurwitz',
  course: 'Regeltechniek',
  description: 'Stability from characteristic polynomial.',
  icon: 'σ',
  render,
};