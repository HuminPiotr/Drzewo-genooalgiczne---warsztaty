const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/relations.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const m = parseGedcom(miniGedcom());

test('podstawowe relacje', () => {
  assert.deepEqual(R.parentsOf(m, 'I3').sort(), ['I1', 'I2']);
  assert.deepEqual(R.childrenOf(m, 'I1').sort(), ['I3', 'I4']);
  assert.deepEqual(R.siblingsOf(m, 'I6'), ['I7']);
  assert.deepEqual(R.spousesOf(m, 'I3'), [{ id: 'I5', familyId: 'F2' }]);
  assert.deepEqual(R.spousesOf(m, 'I9'), []);
  assert.deepEqual([...R.ancestorsOf(m, 'I11')].sort(), ['I1', 'I13', 'I14', 'I2', 'I3', 'I5', 'I6', 'I10'].sort());
  assert.deepEqual([...R.descendantsOf(m, 'I4')].sort(), ['I12', 'I9']);
});

test('pokrewieństwo: linia prosta', () => {
  assert.equal(R.kinship(m, 'I6', 'I3'), 'ojciec');
  assert.equal(R.kinship(m, 'I6', 'I5'), 'matka');
  assert.equal(R.kinship(m, 'I6', 'I1'), 'dziadek');
  assert.equal(R.kinship(m, 'I11', 'I1'), 'pradziadek');
  assert.equal(R.kinship(m, 'I11', 'I2'), 'prababcia');
  assert.equal(R.kinship(m, 'I1', 'I6'), 'wnuk');
  assert.equal(R.kinship(m, 'I1', 'I11'), 'prawnuk');
  assert.equal(R.kinship(m, 'I3', 'I7'), 'córka');
});

test('pokrewieństwo: boczne', () => {
  assert.equal(R.kinship(m, 'I6', 'I7'), 'siostra');
  assert.equal(R.kinship(m, 'I6', 'I4'), 'ciocia');
  assert.equal(R.kinship(m, 'I9', 'I3'), 'wujek');
  assert.equal(R.kinship(m, 'I4', 'I6'), 'bratanek');
  assert.equal(R.kinship(m, 'I3', 'I9'), 'siostrzeniec');
  assert.equal(R.kinship(m, 'I6', 'I9'), 'kuzyn');
  assert.equal(R.kinship(m, 'I11', 'I12'), 'kuzynka 2. stopnia');
  assert.equal(R.kinship(m, 'I11', 'I9'), 'kuzyn (1 pokol. wyżej)');
});

test('pokrewieństwo: przez małżeństwo', () => {
  assert.equal(R.kinship(m, 'I3', 'I5'), 'żona');
  assert.equal(R.kinship(m, 'I5', 'I3'), 'mąż');
  assert.equal(R.kinship(m, 'I3', 'I13'), 'teść');
  assert.equal(R.kinship(m, 'I13', 'I3'), 'zięć');
  assert.equal(R.kinship(m, 'I1', 'I5'), 'synowa');
  assert.equal(R.kinship(m, 'I3', 'I15'), 'szwagier');
  assert.equal(R.kinship(m, 'I8', 'I3'), 'szwagier');
  assert.equal(R.kinship(m, 'I10', 'I13'), null);
  assert.equal(R.kinship(m, 'I3', 'I3'), 'ta sama osoba');
});

test('rodzeństwo przyrodnie', () => {
  const m2 = structuredClone(m);
  m2.families.F9 = { id: 'F9', husb: 'I3', wife: null, children: ['I16'], events: [], notes: [] };
  m2.people.I16 = { ...m.people.I7, id: 'I16', given: 'Ida', famc: [], fams: [] };
  require('../js/gedcom-parse.js').finalizeModel(m2);
  assert.equal(R.kinship(m2, 'I6', 'I16'), 'siostra przyrodnia');
});

test('pętla w danych (osoba swoim przodkiem) nie zawiesza funkcji', () => {
  const m3 = structuredClone(m);
  m3.families.F4.children.push('I1'); // rodzina Piotra ma za dziecko Adama → cykl
  require('../js/gedcom-parse.js').finalizeModel(m3);
  assert.ok(R.ancestorsOf(m3, 'I11').size > 0);
  assert.ok(R.descendantsOf(m3, 'I1').size > 0);
  assert.equal(typeof R.generationCount(m3), 'number');
  R.kinship(m3, 'I11', 'I12');
});

test('liczba pokoleń', () => {
  assert.equal(R.generationCount(m), 4);
  const real = R.generationCount(parseGedcom(realGedcom()));
  assert.ok(real >= 5 && real <= 10, String(real));
});
