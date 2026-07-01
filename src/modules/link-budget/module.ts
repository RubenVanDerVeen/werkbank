import type { Module } from '../../module.ts';
import { eirp, friis, friisDbm, fspl, radarEq, fadeMargin, lambdaOf } from '../../math/linkbudget.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function logspace(lo: number, hi: number, n: number): number[] {
  // ponytail: geometric spacing on a linear-axis plot; no true log axis.
  const out: number[] = [];
  const a = Math.log10(lo), b = Math.log10(hi);
  for (let i = 0; i < n; i++) out.push(10 ** (a + ((b - a) * i) / (n - 1)));
  return out;
}

function sig3(x: number): string {
  return x.toPrecision(3);
}

const MHZ = 1e6, KM = 1000, DBM0 = 1e-3;

function render(host: HTMLElement) {
  const mode = selectWave('Mode', ['link', 'radar'], 'link');
  const Pt = slider('Pt (dBm)', -20, 60, 1, 10);
  const Gt = slider('Gt (dBi)', 0, 30, 0.5, 0);
  const Gr = slider('Gr (dBi)', 0, 30, 0.5, 0);
  const f = slider('f (MHz)', 100, 6000, 10, 2400);
  const R = slider('R (km)', 0.01, 100, 0.01, 1);
  const sigma = slider('σ (m²)', 0.001, 100, 0.001, 1);
  const sens = slider('Rx sens (dBm)', -130, -60, 1, -100);
  for (const w of [mode, Pt, Gt, Gr, f, R, sigma, sens]) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const dbmFromW = (w: number) => 10 * Math.log10(w / DBM0);

  const update = () => {
    const m = mode.value();
    const ptDbm = Pt.value();
    const gtDb = Gt.value();
    const grDb = Gr.value();
    const fHz = f.value() * MHZ;
    const Rm = R.value() * KM;
    const lam = lambdaOf(fHz);
    const ptW = DBM0 * 10 ** (ptDbm / 10);
    const gtLin = 10 ** (gtDb / 10);

    let prW: number, prDbm: number;
    try {
      const eirpW = eirp(ptW, gtLin);
      const L = fspl(Rm, fHz);
      if (m === 'link') {
        prW = friis(ptW, gtLin, 10 ** (grDb / 10), lam, Rm);
        prDbm = friisDbm(ptDbm, gtDb, grDb, Rm, fHz);
        const fm = fadeMargin(prDbm, sens.value());
        readouts.innerHTML = `
          <div><b>EIRP:</b> ${sig3(eirpW)} W (${(10 * Math.log10(eirpW)).toFixed(2)} dBW)</div>
          <div><b>FSPL:</b> ${L.toFixed(2)} dB</div>
          <div><b>Pr:</b> ${sig3(prW)} W (${prDbm.toFixed(2)} dBm)</div>
          <div><b>Fade margin:</b> ${fm.toFixed(2)} dB ${fm >= 0 ? '(link OK)' : '(link FAIL)'}</div>
          <div class="mono" style="margin-top:6px;font-size:12px;color:#555;">Pt ${ptDbm} dBm → +Gt ${gtDb} → +Gr ${grDb} → −FSPL ${L.toFixed(2)} dB → Pr ${prDbm.toFixed(2)} dBm</div>
        `;
      } else {
        prW = radarEq(ptW, gtLin, sigma.value(), lam, Rm);
        prDbm = dbmFromW(prW);
        const fm = fadeMargin(prDbm, sens.value());
        readouts.innerHTML = `
          <div><b>Pr:</b> ${sig3(prW)} W (${prDbm.toFixed(2)} dBm)</div>
          <div><b>Fade margin:</b> ${fm.toFixed(2)} dB ${fm >= 0 ? '(link OK)' : '(link FAIL)'}</div>
          <div class="mono" style="margin-top:6px;font-size:12px;color:#555;">Pr = Pt·G²·σ·λ² / ((4π)³·R⁴) → ${prDbm.toFixed(2)} dBm</div>
        `;
      }
    } catch (e) {
      readouts.textContent = `error: ${(e as Error).message}`;
      return;
    }

    const rs = logspace(0.01, 100, 60); // km
    const sweep = rs.map((rk) => {
      const rmi = rk * KM;
      const p = m === 'link'
        ? friisDbm(ptDbm, gtDb, grDb, rmi, fHz)
        : dbmFromW(radarEq(ptW, gtLin, sigma.value(), lam, rmi));
      return { x: rk, y: p };
    });
    linePlot(plotHost, [{ label: 'Pr (dBm)', data: sweep }], { xLabel: 'R (km)', yLabel: 'Pr (dBm)' });
  };

  for (const w of [mode, Pt, Gt, Gr, f, R, sigma, sens]) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'link-budget',
  title: 'Link Budget & Radar',
  course: 'Antennes',
  description: 'Friis link budget, EIRP, FSPL, radar equation, fade margin: received power vs distance.',
  icon: '⌖',
  render,
};
