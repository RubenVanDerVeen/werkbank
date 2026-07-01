import type { Module } from '../../module.ts';
import type { Complex } from '../../math/complex.ts';
import { cabs } from '../../math/complex.ts';
import { zToGamma, zinLossless } from '../../math/tl.ts';
import { lNetwork, applyLNetwork, intermediateZ, quarterWaveMatch, singleStub, type LSolution, type ElementKind } from '../../math/matching.ts';
import { smithChart, type SmithPoint } from '../../ui/smith.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function sig3(x: number): string {
  return x.toPrecision(3);
}
function fmtEl(kind: ElementKind, value: number): string {
  if (kind === null) return '—';
  return kind === 'L' ? `${sig3(value * 1e9)} nH` : `${sig3(value * 1e12)} pF`;
}

function render(host: HTMLElement) {
  const matchType = selectWave('Match type', ['L-network', 'λ/4 transformer', 'Single-stub'], 'L-network');
  const ZLre = slider('ZL re (Ω)', 1, 500, 1, 100);
  const ZLim = slider('ZL im (Ω)', -200, 200, 1, 0);
  const Z0 = slider('Z0 (Ω)', 10, 200, 1, 50);
  const fMHz = slider('f (MHz)', 100, 5000, 10, 1000);
  for (const w of [matchType, ZLre, ZLim, Z0, fMHz]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const smith = smithChart(plotHost, { title: 'Match trajectory' });

  const update = () => {
    const zL: Complex = { re: ZLre.value(), im: ZLim.value() };
    const z0 = Z0.value();
    const f = fMHz.value() * 1e6;
    const gammaBefore = cabs(zToGamma(zL, z0));
    const pts: SmithPoint[] = [{ z: zL, label: 'ZL' }];
    let html = `<div><b>|Γ| before:</b> ${sig3(gammaBefore)}</div>`;
    try {
      if (matchType.value() === 'L-network') {
        const r = lNetwork(zL, z0, f);
        html += `<div><b>Q:</b> ${sig3(r.q)}</div>`;
        r.solutions.forEach((s: LSolution, i: number) => {
          const zin = applyLNetwork(zL, z0, s, f);
          if (i === 0) {
            pts.push({ z: intermediateZ(zL, z0, s, f), label: 'Z (mid)' });
            pts.push({ z: zin, label: 'Z (sol 1)' });
          }
          html += `<div><b>Sol ${i + 1}</b> (${s.order}): shunt ${fmtEl(s.shunt.kind, s.shunt.value)}, series ${fmtEl(s.series.kind, s.series.value)} → |Γ|=${sig3(cabs(zToGamma(zin, z0)))}</div>`;
        });
      } else if (matchType.value() === 'λ/4 transformer') {
        const z0t = quarterWaveMatch(zL, z0);
        html += `<div><b>Z0' (λ/4):</b> ${sig3(z0t)} Ω</div>`;
      } else {
        const r = singleStub(zL, z0);
        r.solutions.forEach((s, i) => {
          if (i === 0) pts.push({ z: zinLossless(zL, 2 * Math.PI * s.d_wl, z0), label: 'Z(d)' });
          html += `<div><b>Sol ${i + 1}</b>: d=${sig3(s.d_wl)}λ, lShort=${sig3(s.lShort_wl)}λ, lOpen=${sig3(s.lOpen_wl)}λ</div>`;
        });
      }
    } catch (e) {
      html += `<div>error: ${(e as Error).message}</div>`;
    }
    pts.push({ z: { re: z0, im: 0 }, label: 'Z0' });
    smith.update(pts);
    readouts.innerHTML = html;
  };

  for (const w of [matchType, ZLre, ZLim, Z0, fMHz]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'impedance-matching',
  title: 'Impedance Matching',
  course: 'Hoogfrequenttechniek',
  description: 'Impedance matching: L-networks, λ/4 transformer, single-stub — with Smith-chart trajectory.',
  icon: 'Γ',
  render,
};