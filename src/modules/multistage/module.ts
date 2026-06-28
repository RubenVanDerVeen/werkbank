import type { Module } from '../../module.ts';
import { analyze, type Stage } from '../../math/multistage.ts';
import { linePlot } from '../../ui/plots.ts';
import { selectWave, slider } from '../../ui/inputs.ts';

function render(host: HTMLElement) {
  const nStagesSel = selectWave('Stages', ['2', '3'], '2');
  const RL = slider('RL (kΩ)', 0.1, 100, 0.1, 2);

  const stageInputs: { Av0: ReturnType<typeof slider>; Rin: ReturnType<typeof slider>; Rout: ReturnType<typeof slider>; fH: ReturnType<typeof slider> }[] = [
    {
      Av0: slider('Stage 1 Av0', -50, 50, 0.1, -10),
      Rin: slider('Stage 1 Rin (kΩ)', 0.1, 50, 0.1, 2),
      Rout: slider('Stage 1 Rout (kΩ)', 0.1, 50, 0.1, 5),
      fH: slider('Stage 1 fH (MHz)', 0.01, 100, 0.01, 1),
    },
    {
      Av0: slider('Stage 2 Av0', -50, 50, 0.1, -10),
      Rin: slider('Stage 2 Rin (kΩ)', 0.1, 50, 0.1, 2),
      Rout: slider('Stage 2 Rout (kΩ)', 0.1, 50, 0.1, 5),
      fH: slider('Stage 2 fH (MHz)', 0.01, 100, 0.01, 1),
    },
    {
      Av0: slider('Stage 3 Av0', -50, 50, 0.1, -10),
      Rin: slider('Stage 3 Rin (kΩ)', 0.1, 50, 0.1, 2),
      Rout: slider('Stage 3 Rout (kΩ)', 0.1, 50, 0.1, 5),
      fH: slider('Stage 3 fH (MHz)', 0.01, 100, 0.01, 1),
    },
  ];

  const allWidgets = [nStagesSel, RL, ...stageInputs.flatMap((s) => [s.Av0, s.Rin, s.Rout, s.fH])];
  for (const w of allWidgets) host.appendChild(w.el);

  const plotHost = document.createElement('div');
  const readouts = document.createElement('div');
  host.appendChild(plotHost);
  host.appendChild(readouts);

  const update = () => {
    const nStages = Number(nStagesSel.value()) as 2 | 3;
    for (let i = 0; i < stageInputs.length; i++) {
      const show = i < nStages;
      for (const w of [stageInputs[i]!.Av0, stageInputs[i]!.Rin, stageInputs[i]!.Rout, stageInputs[i]!.fH]) {
        w.el.style.display = show ? 'block' : 'none';
      }
    }

    const stages: Stage[] = [];
    for (let i = 0; i < nStages; i++) {
      const s = stageInputs[i]!;
      stages.push({
        Av0: s.Av0.value(),
        Rin_kOhm: s.Rin.value(),
        Rout_kOhm: s.Rout.value(),
        fH_Hz: s.fH.value() * 1e6,
      });
    }

    if (stages.some((s) => s.Rout_kOhm + (stages[stages.indexOf(s) + 1]?.Rin_kOhm ?? RL.value()) === 0)) {
      readouts.textContent = 'error: zero loading resistance';
      return;
    }

    const r = analyze(stages, RL.value());
    const bwStr = r.BW_Hz >= 1e6 ? `${(r.BW_Hz / 1e6).toFixed(3)} MHz` : `${(r.BW_Hz / 1e3).toFixed(3)} kHz`;
    const stageLines = stages.map((_, i) => `<div><b>Av<sub>${i + 1}</sub>:</b> ${r.stageGains[i]!.toFixed(3)}</div>`).join('');
    readouts.innerHTML = `
      ${stageLines}
      <div><b>Av:</b> ${r.AvTotal.toFixed(3)} (<b>${r.AvTotalDb.toFixed(2)} dB</b>)</div>
      <div><b>BW:</b> ${bwStr}</div>
    `;

    linePlot(plotHost, [
      { label: 'Loaded Av', data: stages.map((_, i) => ({ x: i + 1, y: r.stageGains[i]! })) },
      { label: 'Unloaded Av0', data: stages.map((s, i) => ({ x: i + 1, y: s.Av0 })) },
    ], { xLabel: 'Stage', yLabel: 'Av' });
  };

  for (const w of allWidgets) {
    const el = w.el.querySelector('input,select')!;
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  }
  update();
}

export const module: Module = {
  id: 'multistage',
  title: 'Cascaded Amplifier',
  course: 'Elektronica1B',
  description: 'Cascaded amplifier: inter-stage loading, overall gain, bandwidth shrink.',
  icon: 'xN',
  render,
};