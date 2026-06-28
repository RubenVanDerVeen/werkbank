import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/feedback.ts';

test('series-shunt: T=10, D=11, Af≈90.9, Zin×D, Zout÷D', () => {
  const r = analyze('series-shunt', 1000, 0.01, 10, 2);
  assert.ok(Math.abs(r.T - 10) < 1e-9, `T=${r.T}`);
  assert.ok(Math.abs(r.D - 11) < 1e-9, `D=${r.D}`);
  assert.ok(Math.abs(r.Af - 90.909) < 0.01, `Af=${r.Af}`);
  assert.ok(Math.abs(r.Zin_f - 110) < 1e-6, `Zin_f=${r.Zin_f}`);
  assert.ok(Math.abs(r.Zout_f - 0.18182) < 1e-4, `Zout_f=${r.Zout_f}`);
});
test('series-series: Zin×D, Zout×D', () => {
  const r = analyze('series-series', 1000, 0.01, 10, 2);
  assert.ok(Math.abs(r.Zin_f - 110) < 1e-6 && Math.abs(r.Zout_f - 22) < 1e-6, JSON.stringify(r));
});
test('shunt-shunt: Zin÷D, Zout÷D', () => {
  const r = analyze('shunt-shunt', 1000, 0.01, 10, 2);
  assert.ok(Math.abs(r.Zin_f - 0.90909) < 1e-4 && Math.abs(r.Zout_f - 0.18182) < 1e-4, JSON.stringify(r));
});