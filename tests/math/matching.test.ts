import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lNetwork, applyLNetwork, quarterWaveMatch, singleStub } from '../../src/math/matching.ts';

const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

test('quarterWaveMatch(100,50) -> sqrt(5000) = 70.7107', () => {
  const z0t = quarterWaveMatch({ re: 100, im: 0 }, 50);
  assert.ok(near(z0t, 70.71067811865476, 1e-6), `z0t=${z0t}`);
});

test('quarterWaveMatch throws on complex load', () => {
  assert.throws(() => quarterWaveMatch({ re: 50, im: 1 }, 50), /must be real/);
});

test('lNetwork ZL=50+j100, z0=50, f=1GHz: sol1 shunt C 2.546pF + series L 15.915nH, q=0', () => {
  const r = lNetwork({ re: 50, im: 100 }, 50, 1e9);
  assert.ok(near(r.q, 0), `q=${r.q}`);
  assert.equal(r.solutions.length, 2);
  const s0 = r.solutions[0]!;
  assert.equal(s0.order, 'shunt-series');
  assert.equal(s0.shunt.kind, 'C');
  assert.ok(near(s0.shunt.value, 2.5464790894703254e-12, 1e-15), `C=${s0.shunt.value}`);
  assert.equal(s0.series.kind, 'L');
  assert.ok(near(s0.series.value, 1.5915494309189538e-8, 1e-12), `L=${s0.series.value}`);
  const zin = applyLNetwork({ re: 50, im: 100 }, 50, s0, 1e9);
  assert.ok(near(zin.re, 50, 1e-6) && near(zin.im, 0, 1e-6), `zin=${JSON.stringify(zin)}`);
});

test('lNetwork ZL=50+j100 sol2 degenerate: shunt null, series C 1.5915pF', () => {
  const r = lNetwork({ re: 50, im: 100 }, 50, 1e9);
  const s1 = r.solutions[1]!;
  assert.equal(s1.shunt.kind, null);
  assert.equal(s1.series.kind, 'C');
  assert.ok(near(s1.series.value, 1.5915494309189532e-12, 1e-15), `C=${s1.series.value}`);
});

test('lNetwork ZL=100, z0=50: q=1, sol1 shunt C 1.592pF + series L 7.958nH', () => {
  const r = lNetwork({ re: 100, im: 0 }, 50, 1e9);
  assert.ok(near(r.q, 1), `q=${r.q}`);
  const s0 = r.solutions[0]!;
  assert.equal(s0.shunt.kind, 'C');
  assert.ok(near(s0.shunt.value, 1.5915494309189534e-12, 1e-15));
  assert.equal(s0.series.kind, 'L');
  assert.ok(near(s0.series.value, 7.957747154594767e-9, 1e-12));
});

test('singleStub ZL=100, z0=50: d≈{0.152,0.348}λ, lShort≈{0.152,0.348}λ, lOpen≈{0.098,0.402}λ', () => {
  const r = singleStub({ re: 100, im: 0 }, 50);
  assert.equal(r.solutions.length, 2, `n=${r.solutions.length}`);
  const ds = r.solutions.map((s) => s.d_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ds[0]! - 0.152) < 0.01, `d0=${ds[0]}`);
  assert.ok(Math.abs(ds[1]! - 0.348) < 0.01, `d1=${ds[1]}`);
  const ls = r.solutions.map((s) => s.lShort_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ls[0]! - 0.152) < 0.01 && Math.abs(ls[1]! - 0.348) < 0.01, `lShort=${ls}`);
  const los = r.solutions.map((s) => s.lOpen_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(los[0]! - 0.098) < 0.01 && Math.abs(los[1]! - 0.402) < 0.01, `lOpen=${los}`);
});

test('singleStub ZL=50+j100, z0=50: d≈{0.25,0.375}λ, lShort≈{0.0738,0.4262}λ', () => {
  const r = singleStub({ re: 50, im: 100 }, 50);
  assert.equal(r.solutions.length, 2);
  const ds = r.solutions.map((s) => s.d_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ds[0]! - 0.250) < 0.01 && Math.abs(ds[1]! - 0.375) < 0.01, `d=${ds}`);
  const ls = r.solutions.map((s) => s.lShort_wl).sort((a, b) => a - b);
  assert.ok(Math.abs(ls[0]! - 0.0738) < 0.01 && Math.abs(ls[1]! - 0.4262) < 0.01, `lShort=${ls}`);
});