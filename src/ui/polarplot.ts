export type PolarSample = { theta: number; r: number };
export type PolarSeries = { label: string; samples: PolarSample[] };

const SVGNS = 'http://www.w3.org/2000/svg';
const PALETTE = ['#1a1a1a', '#6b4f1d', '#3b6b4f', '#4f3b6b', '#6b3b4f'];

/** In dB mode, each sample's `r` is dB relative to the pattern peak, floored at −40 dB. */
export function polarPlot(
  host: HTMLElement,
  series: PolarSeries[],
  opts: { title?: string; db?: boolean; half?: boolean } = {},
) {
  host.innerHTML = '';
  const W = 360, H = 360, cx = 180, cy = 180, R = 150;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  host.appendChild(svg);

  const rings = opts.db ? [0, -10, -20, -30] : [0, 0.25, 0.5, 0.75, 1];
  for (const ring of rings) {
    const c = document.createElementNS(SVGNS, 'circle');
    const r = (opts.db ? Math.max(0, ring + 40) / 40 : ring) * R;
    c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy));
    c.setAttribute('r', String(r));
    c.setAttribute('fill', 'none'); c.setAttribute('stroke', '#ccc');
    c.setAttribute('stroke-width', '0.5');
    svg.appendChild(c);
  }
  // ponytail: half-plane uses same 30° spacing as full (just covers 0..π instead of 0..2π).
  const step = Math.PI / 6;
  const end = opts.half ? Math.PI : 2 * Math.PI;
  for (let a = 0; a <= end + 1e-9; a += step) {
    const ln = document.createElementNS(SVGNS, 'line');
    ln.setAttribute('x1', String(cx)); ln.setAttribute('y1', String(cy));
    ln.setAttribute('x2', String(cx + R * Math.cos(a)));
    ln.setAttribute('y2', String(cy - R * Math.sin(a)));
    ln.setAttribute('stroke', '#eee'); ln.setAttribute('stroke-width', '0.5');
    svg.appendChild(ln);
  }

  const draw = (s: PolarSeries[]) => {
    // Remove only plotted series, keep grid.
    Array.from(svg.querySelectorAll<SVGPathElement>('[data-series]')).forEach((p) => p.remove());
    let rMax = 1;
    for (const ser of s) for (const sm of ser.samples) if (sm.r > rMax) rMax = sm.r;
    s.forEach((ser, i) => {
      const color = PALETTE[i % PALETTE.length]!;
      const d = ser.samples.map((sm, j) => {
        const rr = (opts.db ? Math.max(0, sm.r + 40) / 40 : sm.r / rMax) * R;
        const x = cx + rr * Math.cos(sm.theta);
        const y = cy - rr * Math.sin(sm.theta);
        return `${j === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      }).join(' ');
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('data-series', '');
      svg.appendChild(path);
    });
  };

  draw(series);
  return { update(next: PolarSeries[]) { draw(next); } };
}