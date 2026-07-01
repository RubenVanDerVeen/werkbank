import type { Module } from '../../module.ts';
import {
  superposeField, superposePotential, capacitance, gaussField,
  type Charge, type CapType, type GaussType,
} from '../../math/electrostatics.ts';
import { fieldPlot, type FieldGrid } from '../../ui/fieldplot.ts';
import { slider, selectWave } from '../../ui/inputs.ts';

const RANGE = 5;
const NX = 15, NY = 15;
const VCAP = 50; // ponytail: capped arrow length; near-charge field diverges, clamp for readability

function buildPreset(name: string): Charge[] {
  if (name === 'dipole') return [{ q: 1e-9, at: { x: -1, y: 0 } }, { q: -1e-9, at: { x: 1, y: 0 } }];
  if (name === 'quadrupole') return [
    { q: 1e-9, at: { x: 1, y: 1 } }, { q: -1e-9, at: { x: -1, y: 1 } },
    { q: -1e-9, at: { x: 1, y: -1 } }, { q: 1e-9, at: { x: -1, y: -1 } },
  ];
  if (name === 'capacitor') {
    const cs: Charge[] = [];
    for (let i = -3; i <= 3; i++) {
      cs.push({ q: 5e-10, at: { x: -2, y: i * 0.7 } });
      cs.push({ q: -5e-10, at: { x: 2, y: i * 0.7 } });
    }
    return cs;
  }
  return [{ q: 1e-9, at: { x: 0, y: 0 } }]; // single
}

function buildGrid(charges: Charge[]): FieldGrid {
  const vectors: FieldGrid['vectors'] = [];
  const step = (2 * RANGE) / (NX - 1);
  for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
    const x = -RANGE + i * step;
    const y = -RANGE + j * step;
    let E = { Ex: 0, Ey: 0 };
    try { E = superposeField(charges, { x, y }); }
    catch { /* ponytail: grid point on a charge, leave zero */ }
    vectors.push({ x: i, y: j, vx: E.Ex, vy: E.Ey });
  }
  return { nx: NX, ny: NY, vectors };
}

function capVectors(grid: FieldGrid): FieldGrid {
  for (const v of grid.vectors) {
    const m = Math.hypot(v.vx, v.vy);
    if (m > VCAP) { const s = VCAP / m; v.vx *= s; v.vy *= s; }
  }
  return grid;
}

function sig3(x: number): string { return x.toPrecision(3); }

function render(host: HTMLElement) {
  // ---- Field viz ----
  const preset = selectWave('Preset', ['single', 'dipole', 'quadrupole', 'capacitor'], 'dipole');
  const qscale = slider('Charge scale', 0.1, 5, 0.1, 1);
  const probeX = slider('Probe x (m)', -RANGE, RANGE, 0.1, 0);
  const probeY = slider('Probe y (m)', -RANGE, RANGE, 0.1, 0);
  const fieldHost = document.createElement('div');
  const fieldReadout = document.createElement('div');
  for (const w of [preset, qscale, probeX, probeY]) host.appendChild(w.el);
  host.appendChild(fieldHost);
  host.appendChild(fieldReadout);

  // ---- Capacitance ----
  const capType = selectWave('Capacitance', ['plate', 'coax', 'sphere'], 'plate');
  const sA = slider('A (m²)', 1e-5, 1e-2, 1e-5, 1e-4);
  const sd = slider('d (m)', 1e-4, 1e-2, 1e-4, 1e-3);
  const sL = slider('L (m)', 0.1, 5, 0.1, 1);
  const sa = slider('a (m)', 1e-4, 5e-3, 1e-4, 1e-3);
  const sb = slider('b (m)', 2e-4, 1e-2, 1e-4, 2e-3);
  const sr = slider('r (m)', 0.01, 2, 0.01, 1);
  const capReadout = document.createElement('div');
  for (const w of [capType, sA, sd, sL, sa, sb, sr]) host.appendChild(w.el);
  host.appendChild(capReadout);

  // ---- Gauss ----
  const gType = selectWave('Gauss', ['sphere', 'cylinder', 'plane'], 'sphere');
  const gQ = slider('Q (C)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gL = slider('λ (C/m)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gS = slider('σ (C/m²)', 1e-10, 1e-7, 1e-10, 1e-9);
  const gr = slider('r (m)', 0.01, 5, 0.01, 1);
  const gReadout = document.createElement('div');
  for (const w of [gType, gQ, gL, gS, gr]) host.appendChild(w.el);
  host.appendChild(gReadout);

  const update = () => {
    // Field
    const charges = buildPreset(preset.value()).map((c) => ({ q: c.q * qscale.value(), at: c.at }));
    fieldPlot(fieldHost, capVectors(buildGrid(charges)), { title: 'E-field' });
    try {
      const E = superposeField(charges, { x: probeX.value(), y: probeY.value() });
      const V = superposePotential(charges, { x: probeX.value(), y: probeY.value() });
      fieldReadout.innerHTML = `
        <div><b>|E| at probe:</b> ${sig3(Math.hypot(E.Ex, E.Ey))} V/m</div>
        <div><b>V at probe:</b> ${sig3(V)} V</div>
      `;
    } catch (e) {
      fieldReadout.textContent = `probe at charge: ${(e as Error).message}`;
    }
    // Capacitance
    const ct = capType.value() as CapType;
    sA.el.style.display = sd.el.style.display = ct === 'plate' ? 'block' : 'none';
    sL.el.style.display = sa.el.style.display = sb.el.style.display = ct === 'coax' ? 'block' : 'none';
    sr.el.style.display = ct === 'sphere' ? 'block' : 'none';
    try {
      const C = capacitance(ct, { A: sA.value(), d: sd.value(), L: sL.value(), a: sa.value(), b: sb.value(), r: sr.value() });
      capReadout.innerHTML = `<div><b>C:</b> ${sig3(C * 1e12)} pF</div>`;
    } catch (e) {
      capReadout.textContent = `error: ${(e as Error).message}`;
    }
    // Gauss
    const gt = gType.value() as GaussType;
    gQ.el.style.display = gt === 'sphere' ? 'block' : 'none';
    gL.el.style.display = gt === 'cylinder' ? 'block' : 'none';
    gS.el.style.display = gt === 'plane' ? 'block' : 'none';
    try {
      const Eg = gaussField(gt, { Q: gQ.value(), lambda: gL.value(), sigma: gS.value() }, gr.value());
      gReadout.innerHTML = `<div><b>E:</b> ${sig3(Eg)} V/m</div>`;
    } catch (e) {
      gReadout.textContent = `error: ${(e as Error).message}`;
    }
  };

  const all = [preset, qscale, probeX, probeY, capType, sA, sd, sL, sa, sb, sr, gType, gQ, gL, gS, gr];
  for (const w of all) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'electrostatics',
  title: 'Electrostatics',
  course: 'Elektromagnetische Velden',
  description: 'Coulomb superposition field plot, Gauss-law field calculators, and capacitance formulas.',
  icon: '⚡',
  render,
};