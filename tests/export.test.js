const test = require('node:test');
const assert = require('node:assert/strict');
const { toGedcom } = require('../js/gedcom-export.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { realGedcom, miniGedcom } = require('./helpers');

const strip = (m) => ({ people: m.people, families: m.families, sources: m.sources });

test('round-trip: prawdziwe dane', () => {
  const a = parseGedcom(realGedcom());
  const b = parseGedcom(toGedcom(a));
  assert.deepEqual(strip(b), strip(a));
});

test('round-trip: mini', () => {
  const a = parseGedcom(miniGedcom());
  assert.deepEqual(strip(parseGedcom(toGedcom(a))), strip(a));
});

test('długie i wielowierszowe notatki, @ w treści', () => {
  const a = parseGedcom(miniGedcom());
  a.people.I1.notes = ['x'.repeat(450) + '\ndruga linia z adresem a@b'];
  const txt = toGedcom(a);
  assert.match(txt, /\r\n2 CONC /); assert.match(txt, /\r\n2 CONT /); assert.match(txt, /a@@b/);
  assert.deepEqual(parseGedcom(txt).people.I1.notes[0], a.people.I1.notes[0]);
});

test('wspomnienia przechodzą przez GEDCOM', () => {
  const a = parseGedcom(miniGedcom());
  a.people.I2.memories = ['Piekła najlepszy chleb'];
  assert.deepEqual(parseGedcom(toGedcom(a)).people.I2.memories, ['Piekła najlepszy chleb']);
  assert.deepEqual(parseGedcom(toGedcom(a)).people.I2.notes, []);
});

test('nagłówek i koniec', () => {
  const txt = toGedcom(parseGedcom(miniGedcom()), { now: new Date('2026-10-05T12:00:00Z') });
  assert.ok(txt.startsWith('0 HEAD\r\n1 GEDC\r\n2 VERS 5.5.1'));
  assert.match(txt, /1 DATE 5 OCT 2026/);
  assert.ok(txt.endsWith('0 TRLR\r\n'));
});
