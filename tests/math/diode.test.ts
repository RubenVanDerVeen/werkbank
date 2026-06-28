import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shape, metrics, type Topology } from '../../src/math/diode.ts';

const T = 1 / 50; // f = 50 Hz
const N = 1000;
const ts = Array.from({ length: 2 * N + 1 }, (_, i) => (i * T) / N);

test('series-clipper: Vpeak_out = 10, Vavg ≈ 3.17', () => {
  const { vout } = shape('series-clipper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(Math.abs(Math.max(...vout) - 10) < 0.01, `Vpeak=${Math.max(...vout)}`);
  assert.ok(Math.abs(m.Vavg - 3.17) < 0.1, `Vavg=${m.Vavg}`);
});

test('biased-shunt-clipper: clips above Vbias + Vgamma', () => {
  const { vout } = shape('biased-shunt-clipper', { Vpeak: 10, Vgamma: 0.7, Vbias: 3 }, ts);
  assert.ok(Math.abs(Math.max(...vout) - 3.7) < 0.01, `Vpeak=${Math.max(...vout)}`);
});

test('half-wave-rect: Vavg ≈ 2.91', () => {
  const { vout } = shape('half-wave-rect', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(Math.abs(m.Vavg - 2.91) < 0.1, `Vavg=${m.Vavg}`);
});

test('positive-clamper: negative peak of vout ≈ -Vgamma', () => {
  const { vout } = shape('positive-clamper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  // After first cycle, output is shifted; min should be near -Vgamma
  const secondCycle = vout.slice(N);
  const minV = Math.min(...secondCycle);
  assert.ok(Math.abs(minV - (-0.7)) < 0.1, `min=${minV}`);
});

test('positive-clamper: positive peak of vout ≈ 2·Vpeak - Vgamma', () => {
  const { vout } = shape('positive-clamper', { Vpeak: 10, Vgamma: 0.7 }, ts);
  const secondCycle = vout.slice(N);
  const maxV = Math.max(...secondCycle);
  assert.ok(Math.abs(maxV - 19.3) < 0.1, `max=${maxV}`);
});

test('peak-rect: ripple < 1V with R=10k, C=100µF, f=50Hz', () => {
  const { vout } = shape('peak-rect', { Vpeak: 10, Vgamma: 0.7, R_kOhm: 10, C_uF: 100 }, ts);
  const m = metrics(vout, ts[1]! - ts[0]!);
  assert.ok(m.Vripple_pp < 1, `ripple=${m.Vripple_pp}`);
  assert.ok(m.Vpeak_out > 9, `Vpeak=${m.Vpeak_out}`);
});
