import type { Module } from '../../module.ts';
import {
  MU_0, wireField, wireField2D, loopField,
  solenoidField, solenoidInductance, toroidField, toroidInductance,
  reluctance, flux,
} from '../../math/magnetostatics.ts';
import { fieldPlot, type FieldGrid } from '../../ui/fieldplot.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

const HALF = 0.3; // m, plot half-window
const NG = 13;

function sig3(x: number): string {
  return x.toPrecision(3);
}

// ponytail: loop cross-section = two opposite point currents at (±R, 0).
function buildGrid(
  source: string, I: number, R: number, n: number, Nt: number, l: number, r: number, A: number,
): FieldGrid {
  const vectors: { x: number; y: number; vx: number; vy: number }[] = [];
  for (let iy = 0; iy < NG; iy++) {
    for (let ix = 0; ix < NG; ix++) {
      const px = -HALF + (2 * HALF * ix) / (NG - 1);
      const py = -HALF + (2 * HALF * iy) / (NG - 1);
      let Bx = 0, By = 0;
      if (source === 'wire') {
        const b = wireField2D(I, 0, 0, px, py);
        Bx = b.Bx; By = b.By;
      } else if (source === 'loop') {
        const a = wireField2D(I, R, 0, px, py);
        const b = wireField2D(-I, -R, 0, px, py);
        Bx = a.Bx + b.Bx; By = a.By + b.By;
      } else if (source === 'solenoid') {
        // ponytail: ideal solenoid, uniform axial (y) field inside rectangle.
        if (Math.abs(px) < R && Math.abs(py) < l / 2) By = solenoidField(n, I);
      } else { // toroid
        const rho = Math.hypot(px, py);
        const a = Math.sqrt(A / Math.PI);
        if (rho > r - a && rho < r + a && rho > 1e-9) {
          const B = toroidField(Nt, I, rho);
          Bx = (-B * py) / rho; By = (B * px) / rho;
        }
      }
      vectors.push({ x: ix, y: iy, vx: Bx, vy: By });
    }
  }
  return { nx: NG, ny: NG, vectors };
}

function render(host: HTMLElement) {
  const source = selectWave('Source', ['wire', 'loop', 'solenoid', 'toroid'], 'wire');
  const I = slider('I (A)', 0.1, 10, 0.1, 1);
  const R = slider('R (m)', 0.01, 1, 0.01, 0.1);
  const n = slider('n (turns/m)', 10, 5000, 10, 1000);
  const Nt = slider('N (turns)', 1, 500, 1, 100);
  const l = slider('l (m)', 0.01, 1, 0.01, 0.1);
  const r = slider('r (m)', 0.02, 1, 0.01, 0.1);
  const A = slider('A (cm²)', 0.1, 50, 0.1, 1);
  for (const w of [source, I, R, n, Nt, l, r, A]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const s = source.value();
    const Iv = I.value(), Rv = R.value(), nv = n.value(), Nv = Nt.value();
    const lv = l.value(), rv = r.value(), Av = A.value() * 1e-4; // cm² → m²

    fieldPlot(plotHost, buildGrid(s, Iv, Rv, nv, Nv, lv, rv, Av), { showMagnitude: true });

    let B = 0, L = 0, Rel = 0;
    let isInd = false;
    if (s === 'wire') {
      B = wireField(Iv, rv);
    } else if (s === 'loop') {
      B = loopField(Iv, Rv, 0);
    } else if (s === 'solenoid') {
      B = solenoidField(nv, Iv);
      L = solenoidInductance(Nv, Av, lv);
      Rel = reluctance(lv, MU_0, Av);
      isInd = true;
    } else { // toroid
      B = toroidField(Nv, Iv, rv);
      L = toroidInductance(Nv, Av, rv);
      Rel = reluctance(2 * Math.PI * rv, MU_0, Av);
      isInd = true;
    }
    readouts.innerHTML = `
      <div><b>B:</b> ${sig3(B)} T</div>
      ${isInd ? `<div><b>L:</b> ${sig3(L)} H</div>
      <div><b>ℛ:</b> ${sig3(Rel)} A/Wb</div>
      <div><b>Φ (NI/ℛ):</b> ${sig3(flux(Nv, Iv, Rel))} Wb</div>` : ''}
    `;
  };

  for (const w of [source, I, R, n, Nt, l, r, A]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'magnetostatics',
  title: 'Magnetostatics',
  course: 'Elektromagnetische Velden',
  description: 'Biot-Savart, Ampère law, inductance, magnetic reluctance.',
  icon: '⊙',
  render,
};
