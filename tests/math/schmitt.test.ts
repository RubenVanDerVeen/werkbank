import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../../src/math/schmitt.ts';

test('inverting R1=R2=10k Vsat=12 → VT±=±6, H=12', () => {
  const r = analyze('Inverting', { R1_kOhm: 10, R2_kOhm: 10, Vsat: 12, Vref: 0 });
  assert.ok(Math.abs(r.VTp - 6) < 1e-9 && Math.abs(r.VTn - -6) < 1e-9, JSON.stringify(r));
  assert.ok(Math.abs(r.H - 12) < 1e-9, `H=${r.H}`);
});
test('non-inverting R1=10k R2=20k Vsat=12 → VT±=±6', () => {
  const r = analyze('Non-inverting', { R1_kOhm: 10, R2_kOhm: 20, Vsat: 12, Vref: 0 });
  assert.ok(Math.abs(r.VTp - 6) < 1e-9 && Math.abs(r.VTn - -6) < 1e-9, JSON.stringify(r));
});
test('inverting Vref=2 → VT+=7, VT-=-5', () => {
  const r = analyze('Inverting', { R1_kOhm: 10, R2_kOhm: 10, Vsat: 12, Vref: 2 });
  assert.ok(Math.abs(r.VTp - 7) < 1e-9 && Math.abs(r.VTn - -5) < 1e-9, JSON.stringify(r));
});
