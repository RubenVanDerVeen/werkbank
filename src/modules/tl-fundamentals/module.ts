import type { Module } from '../../module.ts';
import {
  characteristicImpedance,
  propagationConstant,
  phaseVelocity,
  isDistortionless,
  losslessZ0,
} from '../../math/tlfundamentals.ts';
import { cabs, cphaseDeg } from '../../math/complex.ts';
import { linePlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

function logspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  const llo = Math.log10(lo), lhi = Math.log10(hi);
  for (let i = 0; i < n; i++) out.push(10 ** (llo + ((lhi - llo) * i) / (n - 1)));
  return out;
}

const sig3 = (x: number): string => x.toPrecision(3);

function render(host: HTMLElement) {
  const R = slider('R (Ω/m)', 0, 2, 0.001, 0);
  const L = slider('L (nH/m)', 100, 500, 1, 250);
  const G = slider('G (mS/m)', 0, 2, 0.001, 0);
  const C = slider('C (pF/m)', 50, 200, 1, 100);
  const f0 = slider('f0 (MHz)', 1, 1000, 1, 100);
  const ws = [R, L, G, C, f0];
  for (const w of ws) host.appendChild(w.el);

  const magHost = document.createElement('div');
  const phaseHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(magHost);
  host.appendChild(phaseHost);
  host.appendChild(readouts);

  const update = () => {
    const r = R.value();
    const l = L.value() * 1e-9;
    const g = G.value() * 1e-3;
    const c = C.value() * 1e-12;
    const f = f0.value() * 1e6;
    const omega = 2 * Math.PI * f;

    const z0 = characteristicImpedance(r, l, g, c, omega);
    const pc = propagationConstant(r, l, g, c, omega);
    const vLossless = phaseVelocity(l, c);
    const vPhase = pc.beta !== 0 ? omega / pc.beta : NaN;
    const z0Lossless = losslessZ0(l, c);
    const dist = isDistortionless(r, l, g, c);

    readouts.innerHTML = `
      <div><b>Z₀:</b> ${sig3(z0.re)} ${z0.im >= 0 ? '+' : '−'} j·${sig3(Math.abs(z0.im))} Ω &nbsp;(|Z₀|=${sig3(cabs(z0))} ∠ ${cphaseDeg(z0).toFixed(2)}°)</div>
      <div><b>α:</b> ${sig3(pc.alpha)} Np/m &nbsp;&nbsp;<b>β:</b> ${sig3(pc.beta)} rad/m</div>
      <div><b>v_phase (ω/β):</b> ${Number.isFinite(vPhase) ? sig3(vPhase) : '—'} m/s</div>
      <div><b>v_lossless (1/√LC):</b> ${sig3(vLossless)} m/s</div>
      <div><b>Z₀_lossless (√(L/C)):</b> ${sig3(z0Lossless)} Ω</div>
      <div><b>distortionless?:</b> ${dist ? 'yes (R/L = G/C)' : 'no'}</div>
    `;

    const fs = logspace(1e6, 1e9, 60);
    const mag = fs.map((ff) => {
      const w = 2 * Math.PI * ff;
      return { x: ff / 1e6, y: cabs(characteristicImpedance(r, l, g, c, w)) };
    });
    const ph = fs.map((ff) => {
      const w = 2 * Math.PI * ff;
      return { x: ff / 1e6, y: cphaseDeg(characteristicImpedance(r, l, g, c, w)) };
    });
    linePlot(magHost, [{ label: '|Z₀|', data: mag }], { xLabel: 'f (MHz)', yLabel: '|Z₀| (Ω)' });
    linePlot(phaseHost, [{ label: 'phase(Z₀)', data: ph }], { xLabel: 'f (MHz)', yLabel: 'phase (°)' });
  };

  for (const w of ws) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'tl-fundamentals',
  title: 'Transmission-Line Fundamentals',
  course: 'Hoogfrequenttechniek',
  description: 'Distributed LGC line: Z₀, γ=α+jβ, phase velocity, distortionless condition.',
  icon: 'Z₀',
  render,
};