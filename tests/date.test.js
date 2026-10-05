const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDate } = require('../js/gedcom-date.js');

test('pełna data', () => {
  assert.deepEqual(parseDate('8 MAY 1945'),
    { raw: '8 MAY 1945', year: 1945, month: 5, day: 8, approx: null, display: '8 maj 1945', sortKey: 19450508 });
});
test('sam rok', () => {
  const d = parseDate('1908');
  assert.equal(d.display, '1908'); assert.equal(d.sortKey, 19080000); assert.equal(d.month, null);
});
test('ABT miesiąc rok', () => {
  const d = parseDate('ABT SEP 1897');
  assert.equal(d.display, 'ok. wrz 1897'); assert.equal(d.approx, 'ABT'); assert.equal(d.year, 1897);
});
test('CAL, BEF, AFT', () => {
  assert.equal(parseDate('CAL 1871').display, 'ok. 1871');
  assert.equal(parseDate('BEF 1 FEB 1976').display, 'przed 1 lut 1976');
  assert.equal(parseDate('AFT 1900').display, 'po 1900');
});
test('BET … AND …', () => {
  const d = parseDate('BET 1900 AND 1905');
  assert.equal(d.display, 'między 1900 a 1905'); assert.equal(d.year, 1900); assert.equal(d.approx, 'BET');
});
test('nieczytelne daty nie wywracają parsera', () => {
  assert.deepEqual(parseDate('xxxx'),
    { raw: 'xxxx', year: null, month: null, day: null, approx: null, display: 'nieznana', sortKey: null });
  assert.equal(parseDate('jesień 1910').year, null);
  assert.equal(parseDate('jesień 1910').display, 'jesień 1910');
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(null), null);
});
test('małe litery i nadmiarowe spacje', () => {
  assert.equal(parseDate('  26 sep 1897 ').display, '26 wrz 1897');
});

const { fromUserInput, toUserInput } = require('../js/gedcom-date.js');

test('fromUserInput: polskie formaty → GEDCOM', () => {
  assert.equal(fromUserInput('12.03.1901'), '12 MAR 1901');
  assert.equal(fromUserInput('1.3.1901'), '1 MAR 1901');
  assert.equal(fromUserInput('03.1901'), 'MAR 1901');
  assert.equal(fromUserInput('1901'), '1901');
  assert.equal(fromUserInput('ok. 1900'), 'ABT 1900');
  assert.equal(fromUserInput('około 1900'), 'ABT 1900');
  assert.equal(fromUserInput('przed 5.02.1976'), 'BEF 5 FEB 1976');
  assert.equal(fromUserInput('po 1900'), 'AFT 1900');
  assert.equal(fromUserInput('12 marca 1901'), '12 MAR 1901');
  assert.equal(fromUserInput('3 października 1950'), '3 OCT 1950');
  assert.equal(fromUserInput('8 MAY 1945'), '8 MAY 1945');
  assert.equal(fromUserInput('  '), null);
  assert.equal(fromUserInput('31.13.1901'), '31.13.1901');
  assert.equal(parseDate(fromUserInput('31.13.1901')).year, null);
});

test('toUserInput i powrót', () => {
  assert.equal(toUserInput(parseDate('8 MAY 1945')), '08.05.1945');
  assert.equal(toUserInput(parseDate('ABT SEP 1897')), 'ok. 09.1897');
  assert.equal(toUserInput(parseDate('1908')), '1908');
  assert.equal(toUserInput(parseDate('xxxx')), 'xxxx');
  assert.equal(toUserInput(null), '');
  for (const raw of ['8 MAY 1945', 'ABT SEP 1897', 'BEF 1 FEB 1976', '1908', 'AFT 1900'])
    assert.equal(parseDate(fromUserInput(toUserInput(parseDate(raw)))).display, parseDate(raw).display, raw);
});
