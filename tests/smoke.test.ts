import { test } from 'node:test';
import assert from 'node:assert/strict';
import { modules } from '../src/registry.ts';

test('registry imports without throwing', () => {
  assert.ok(Array.isArray(modules));
});

test('every registered module has required fields', () => {
  for (const m of modules) {
    assert.ok(m.id, 'id');
    assert.ok(m.title, 'title');
    assert.ok(m.course, 'course');
    assert.ok(m.description, 'description');
    assert.equal(typeof m.render, 'function');
  }
});

test('multistage module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'multistage');
  assert.ok(m && m.course === 'Elektronica1B', 'multistage missing');
});

test('diff-amp module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'diff-amp');
  assert.ok(m && m.course === 'Elektronica1B', 'diff-amp missing');
});

test('feedback module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'feedback');
  assert.ok(m && m.course === 'Elektronica1B', 'feedback missing');
});

test('freq-response module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'freq-response');
  assert.ok(m && m.course === 'Elektronica1B', 'freq-response missing');
});

test('power-amp module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'power-amp');
  assert.ok(m && m.course === 'Elektronica1B', 'power-amp missing');
});

test('oscillator module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'oscillator');
  assert.ok(m && m.course === 'Elektronica1B', 'oscillator missing');
});

test('active-filter module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'active-filter');
  assert.ok(m && m.course === 'Elektronica1B', 'active-filter missing');
});

test('comparator module registered under Elektronica1B', () => {
  const m = modules.find((x) => x.id === 'comparator');
  assert.ok(m && m.course === 'Elektronica1B', 'comparator missing');
});

test('plane-wave-incidence module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'plane-wave-incidence');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'plane-wave-incidence missing');
});

test('smith-chart module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'smith-chart');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'smith-chart missing');
});

test('electrostatics module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'electrostatics');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'electrostatics missing');
});

test('magnetostatics module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'magnetostatics');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'magnetostatics missing');
});

test('maxwell-induction module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'maxwell-induction');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'maxwell-induction missing');
});

test('em-waves module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'em-waves');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'em-waves missing');
});

test('waveguides module registered under Elektromagnetische Velden', () => {
  const m = modules.find((x) => x.id === 'waveguides');
  assert.ok(m && m.course === 'Elektromagnetische Velden', 'waveguides missing');
});

test('tl-fundamentals module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'tl-fundamentals');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'tl-fundamentals missing');
});

test('tl-input-impedance module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'tl-input-impedance');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'tl-input-impedance missing');
});

test('impedance-matching module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 'impedance-matching');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 'impedance-matching missing');
});

test('s-parameters module registered under Hoogfrequenttechniek', () => {
  const m = modules.find((x) => x.id === 's-parameters');
  assert.ok(m && m.course === 'Hoogfrequenttechniek', 's-parameters missing');
});

test('dipole-radiation module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'dipole-radiation');
  assert.ok(m && m.course === 'Antennes', 'dipole-radiation missing');
});

test('antenna-arrays module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'antenna-arrays');
  assert.ok(m && m.course === 'Antennes', 'antenna-arrays missing');
});

test('link-budget module registered under Antennes', () => {
  const m = modules.find((x) => x.id === 'link-budget');
  assert.ok(m && m.course === 'Antennes', 'link-budget missing');
});
