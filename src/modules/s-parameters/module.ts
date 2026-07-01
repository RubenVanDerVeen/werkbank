import type { Module } from '../../module.ts';
import type { Complex } from '../../math/complex.ts';
import { cadd, csub, cmul, cdiv, cabs } from '../../math/complex.ts';
import { sToZ, returnLoss, insertionLoss, transducerGain, isStable } from '../../math/sparams.ts';
import { smithChart } from '../../ui/smith.ts';
import { linePlot, svgPlot } from '../../ui/plots.ts';
import { slider } from '../../ui/inputs.ts';

const SVGNS = 'http://www.w3.org/2000/svg';

function s21AtF(s21: Complex, fc: number, f: number): Complex {
  const one: Complex = { re: 1, im: 0 };
  const jw = { re: 0, im: f / fc };
  return cdiv(s21, cadd(one, jw));
}

function linspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(lo + ((hi - lo) * i) / (n - 1));
  return out;
}

function logspace(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  const lgLo = Math.log10(lo), lgHi = Math.log10(hi);
  for (let i = 0; i < n; i++) out.push(10 ** (lgLo + ((lgHi - lgLo) * i) / (n - 1)));
  return out;
}

function render(host: HTMLElement) {
  const S11re = slider('S11 re', -1, 1, 0.01, 0.2);
  const S11im = slider('S11 im', -1, 1, 0.01, 0);
  const S21re = slider('S21 re', -1, 1, 0.01, 0.8);
  const S21im = slider('S21 im', -1, 1, 0.01, 0);
  const S12re = slider('S12 re', -1, 1, 0.01, 0.05);
  const S12im = slider('S12 im', -1, 1, 0.01, 0);
  const S22re = slider('S22 re', -1, 1, 0.01, 0.3);
  const S22im = slider('S22 im', -1, 1, 0.01, 0);
  const Z0 = slider('Z0 (Ω)', 10, 200, 1, 50);
  const fc = slider('fc (GHz)', 0.1, 20, 0.1, 5);
  for (const w of [S11re, S11im, S21re, S21im, S12re, S12im, S22re, S22im, Z0, fc]) {
    host.appendChild(w.el);
  }

  const layout = document.createElement('div');
  layout.style.display = 'grid';
  layout.style.gridTemplateColumns = '1fr 1fr';
  layout.style.gap = '16px';
  layout.style.marginTop = '12px';
  host.appendChild(layout);

  const smithHost = document.createElement('div');
  const bodeHost = document.createElement('div');
  const flowHost = document.createElement('div');
  const readouts = document.createElement('div');
  layout.appendChild(smithHost);
  layout.appendChild(bodeHost);
  layout.appendChild(flowHost);
  layout.appendChild(readouts);

  const smith = smithChart(smithHost, { title: 'S11, S22 on Smith chart' });
  const bode = linePlot(bodeHost, [
    { label: '|S21| (dB)', data: [] },
    { label: '|S11| (dB)', data: [] },
  ], { xLabel: 'f (GHz)', yLabel: 'dB' });

  svgPlot(flowHost, (svg) => {
    const line = (x1: number, y1: number, x2: number, y2: number, lbl?: string) => {
      const ln = document.createElementNS(SVGNS, 'line');
      ln.setAttribute('x1', String(x1)); ln.setAttribute('y1', String(y1));
      ln.setAttribute('x2', String(x2)); ln.setAttribute('y2', String(y2));
      ln.setAttribute('stroke', '#1a1a1a'); ln.setAttribute('stroke-width', '1.5');
      ln.setAttribute('marker-end', 'url(#arr)');
      svg.appendChild(ln);
      if (lbl) {
        const t = document.createElementNS(SVGNS, 'text');
        t.setAttribute('x', String((x1 + x2) / 2));
        t.setAttribute('y', String((y1 + y2) / 2 - 6));
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '11'); t.setAttribute('fill', '#1a1a1a');
        t.textContent = lbl;
        svg.appendChild(t);
      }
    };
    const box = (x: number, y: number, w: number, h: number, label: string) => {
      const r = document.createElementNS(SVGNS, 'rect');
      r.setAttribute('x', String(x)); r.setAttribute('y', String(y));
      r.setAttribute('width', String(w)); r.setAttribute('height', String(h));
      r.setAttribute('fill', '#f5efe0'); r.setAttribute('stroke', '#1a1a1a');
      svg.appendChild(r);
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', String(x + w / 2)); t.setAttribute('y', String(y + h / 2 + 4));
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '12');
      t.textContent = label;
      svg.appendChild(t);
    };
    const defs = document.createElementNS(SVGNS, 'defs');
    const marker = document.createElementNS(SVGNS, 'marker');
    marker.setAttribute('id', 'arr'); marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9'); marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '8'); marker.setAttribute('markerHeight', '8');
    marker.setAttribute('orient', 'auto-start-reverse');
    const tip = document.createElementNS(SVGNS, 'path');
    tip.setAttribute('d', 'M0,0 L10,5 L0,10 z'); tip.setAttribute('fill', '#1a1a1a');
    marker.appendChild(tip); defs.appendChild(marker); svg.appendChild(defs);

    box(120, 60, 120, 80, '[S] two-port');
    line(40, 80, 120, 100, 'a1');
    line(240, 100, 360, 80, 'b2');
    line(120, 100, 40, 80, 'b1');
    line(360, 100, 240, 100, 'b2→');
    const sLoad = document.createElementNS(SVGNS, 'text');
    sLoad.setAttribute('x', '50'); sLoad.setAttribute('y', '160');
    sLoad.setAttribute('font-size', '12'); sLoad.textContent = 'Source / ΓS';
    svg.appendChild(sLoad);
    const lLoad = document.createElementNS(SVGNS, 'text');
    lLoad.setAttribute('x', '320'); lLoad.setAttribute('y', '160');
    lLoad.setAttribute('font-size', '12'); lLoad.textContent = 'Load / ΓL';
    svg.appendChild(lLoad);
  }, { w: 400, h: 200 });

  const update = () => {
    const S11: Complex = { re: S11re.value(), im: S11im.value() };
    const S21: Complex = { re: S21re.value(), im: S21im.value() };
    const S12: Complex = { re: S12re.value(), im: S12im.value() };
    const S22: Complex = { re: S22re.value(), im: S22im.value() };
    const z0 = Z0.value();
    const fcG = fc.value();

    const z = sToZ({ S11, S21, S12, S22 }, z0);
    const rl = returnLoss(S11);
    const il = insertionLoss(S21);
    const gt = transducerGain(S21);
    const stab = isStable({ S11, S21, S12, S22 });

    const zinMag = cabs(z.Z11);
    const zoutMag = cabs(z.Z22);

    readouts.innerHTML = `
      <div><b>Return loss:</b> ${rl.toFixed(2)} dB</div>
      <div><b>Insertion loss:</b> ${il.toFixed(2)} dB</div>
      <div><b>Transducer gain:</b> ${gt.toFixed(2)} dB</div>
      <div><b>K:</b> ${stab.K.toFixed(3)}</div>
      <div><b>|Δ|:</b> ${stab.delta.toFixed(3)}</div>
      <div><b>Stable:</b> ${stab.stable ? 'yes' : 'no'}</div>
      <div><b>|Z11|:</b> ${zinMag.toFixed(1)} Ω</div>
      <div><b>|Z22|:</b> ${zoutMag.toFixed(1)} Ω</div>
    `;

    smith.update([
      { z: S11, label: 'S11' },
      { z: S22, label: 'S22' },
    ]);

    const fs = logspace(0.01, 30, 200);
    const s21Mag = fs.map((f) => {
      const v = s21AtF(S21, fcG, f);
      return 20 * Math.log10(cabs(v) || 1e-12);
    });
    const s11Db = fs.map(() => 20 * Math.log10(cabs(S11) || 1e-12));
    bode.update([
      { label: '|S21| (dB)', data: fs.map((f, i) => ({ x: f, y: s21Mag[i]! })) },
      { label: '|S11| (dB)', data: fs.map((f, i) => ({ x: f, y: s11Db[i]! })) },
    ]);
  };

  for (const w of [S11re, S11im, S21re, S21im, S12re, S12im, S22re, S22im, Z0, fc]) {
    const el = w.el.querySelector('input')!;
    el.addEventListener('input', update);
  }
  update();
}

export const module: Module = {
  id: 's-parameters',
  title: 'S-Parameters & Two-Port',
  course: 'Hoogfrequenttechniek',
  description: 'Two-port S-parameters: S→Z, return/insertion loss, transducer gain, stability.',
  icon: 'S',
  render,
};