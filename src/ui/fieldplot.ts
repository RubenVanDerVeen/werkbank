export type FieldGrid = {
  nx: number;
  ny: number;
  vectors: { x: number; y: number; vx: number; vy: number }[];
};

const SVGNS = 'http://www.w3.org/2000/svg';
// ponytail: 5-bin magnitude heat map.
const HEAT = ['#f5f5f5', '#d8d8d8', '#a8a8a8', '#787878', '#484848'];

export function fieldPlot(host: HTMLElement, grid: FieldGrid, opts: { title?: string; showMagnitude?: boolean } = {}) {
  host.innerHTML = '';
  const W = 360, H = 360, pad = 20;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  host.appendChild(svg);

  const defs = document.createElementNS(SVGNS, 'defs');
  defs.innerHTML = '<marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 z" fill="#1a1a1a"/></marker>';

  const draw = (g: FieldGrid) => {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.appendChild(defs);
    const cellW = (W - 2 * pad) / g.nx;
    const cellH = (H - 2 * pad) / g.ny;
    const maxMag = Math.max(1e-9, ...g.vectors.map((v) => Math.hypot(v.vx, v.vy)));
    const cellScale = Math.min(cellW, cellH);
    if (opts.showMagnitude) {
      for (const v of g.vectors) {
        const m = Math.hypot(v.vx, v.vy) / maxMag;
        const bin = Math.min(HEAT.length - 1, Math.floor(m * HEAT.length));
        const rect = document.createElementNS(SVGNS, 'rect');
        rect.setAttribute('x', String(pad + v.x * cellW - cellW / 2));
        rect.setAttribute('y', String(pad + v.y * cellH - cellH / 2));
        rect.setAttribute('width', String(cellW));
        rect.setAttribute('height', String(cellH));
        rect.setAttribute('fill', HEAT[bin]!);
        svg.appendChild(rect);
      }
    }
    for (const v of g.vectors) {
      const x0 = pad + v.x * cellW, y0 = pad + v.y * cellH;
      const len = cellScale * 0.45 * (Math.hypot(v.vx, v.vy) / maxMag);
      const ang = Math.atan2(v.vy, v.vx);
      const x1 = x0 + len * Math.cos(ang), y1 = y0 - len * Math.sin(ang);
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', String(x0)); ln.setAttribute('y1', String(y0));
      ln.setAttribute('x2', String(x1)); ln.setAttribute('y2', String(y1));
      ln.setAttribute('stroke', '#1a1a1a'); ln.setAttribute('stroke-width', '1');
      ln.setAttribute('marker-end', 'url(#arrow)');
      svg.appendChild(ln);
    }
  };

  draw(grid);
  return { update(next: FieldGrid) { draw(next); } };
}