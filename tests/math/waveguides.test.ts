import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cutoffFreq, phaseVelocity, groupVelocity, guideWavelength, te10Field, modeField } from '../../src/math/waveguides.ts';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;
const C = 3e8;
const A = 0.02286, B = 0.01016; // WR-90

test('WR-90 TE10 cutoff ≈ 6.56 GHz', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  assert.ok(near(fc, 6.562e9, 1e7), `fc=${fc}`);
});
test('TE20 cutoff = 2× TE10', () => {
  const fc10 = cutoffFreq(1, 0, A, B, C);
  const fc20 = cutoffFreq(2, 0, A, B, C);
  assert.ok(near(fc20, 2 * fc10), `fc20=${fc20}`);
});
test('TE01 > TE10 for a>b (TE10 dominant)', () => {
  const fc10 = cutoffFreq(1, 0, A, B, C);
  const fc01 = cutoffFreq(0, 1, A, B, C);
  assert.ok(fc01 > fc10, `fc01=${fc01} fc10=${fc10}`);
});
test('TE11 = TM11 cutoff (same formula) ≈ 16.16 GHz', () => {
  const fc = cutoffFreq(1, 1, A, B, C);
  assert.ok(near(fc, 1.6157e10, 1e7), `fc11=${fc}`);
});
test('phaseVelocity(10GHz, fc, c) > c; vg < c; vp·vg ≈ c²', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  const vp = phaseVelocity(10e9, fc, C);
  const vg = groupVelocity(10e9, fc, C);
  assert.ok(vp > C, `vp=${vp}`);
  assert.ok(vg < C, `vg=${vg}`);
  assert.ok(near(vp * vg, C * C, 1e6), `vp·vg=${vp * vg}`); // ponytail: eps 1e6, product ~9e16
});
test('guideWavelength(10GHz, fc, c) ≈ 3.98 cm', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  const lg = guideWavelength(10e9, fc, C);
  assert.ok(near(lg, 0.03975, 1e-3), `lg=${lg}`); // ~3.98 cm, λ0=3cm at 10GHz
});
test('phaseVelocity throws when f ≤ fc (evanescent)', () => {
  const fc = cutoffFreq(1, 0, A, B, C);
  assert.throws(() => phaseVelocity(fc, fc, C));
  assert.throws(() => phaseVelocity(fc * 0.5, fc, C));
});
test('te10Field: Ey peak at (a/2, 0), zero at wall (0, 0)', () => {
  const beta = (2 * Math.PI) / 0.03975;
  assert.ok(near(te10Field(A / 2, 0, A, beta, 1).Ey, 1), 'Ey peak');
  assert.ok(near(te10Field(0, 0, A, beta, 1).Ey, 0), 'Ey wall');
});
test('te10Field: Hz peaks at (0, λg/4); Ey = 0 there', () => {
  const beta = (2 * Math.PI) / 0.03975;
  const r = te10Field(0, Math.PI / (2 * beta), A, beta, 1);
  assert.ok(near(r.Ey, 0), `Ey=${r.Ey}`);
  assert.ok(r.Hz > 0, `Hz=${r.Hz}`); // peak shape (π/(aβ)·1·sin(π/2))
});
test('modeField TE10: Ex=0, |Ey| at peak (a/2, b/2)', () => {
  const r = modeField('TE10', A / 2, B / 2, A, B);
  assert.ok(near(r.Ex, 0), `Ex=${r.Ex}`);
  assert.ok(Math.abs(r.Ey) > 0.9 / A, `Ey=${r.Ey}`); // |1/a| ≈ 43.7
});
test('modeField TE20: second lobe (3a/4) opposite sign to first (a/4)', () => {
  const r1 = modeField('TE20', A / 4, B / 2, A, B);
  const r2 = modeField('TE20', (3 * A) / 4, B / 2, A, B);
  assert.ok(r1.Ey * r2.Ey < 0, `r1=${r1.Ey} r2=${r2.Ey}`);
});
test('modeField TE01: Ey=0, |Ex| at peak (a/2, b/2)', () => {
  const r = modeField('TE01', A / 2, B / 2, A, B);
  assert.ok(near(r.Ey, 0), `Ey=${r.Ey}`);
  assert.ok(Math.abs(r.Ex) > 0.9 / B, `Ex=${r.Ex}`); // |1/b| ≈ 98.4
});
test('modeField TM11: Ex, Ey finite, same sign at (a/4, b/4) (TM branch)', () => {
  const r = modeField('TM11', A / 4, B / 4, A, B);
  assert.ok(Number.isFinite(r.Ex) && Number.isFinite(r.Ey), `Ex=${r.Ex} Ey=${r.Ey}`);
  assert.ok(r.Ex > 0 && r.Ey > 0, `Ex=${r.Ex} Ey=${r.Ey}`); // (1/a)·0.5, (1/b)·0.5
});