const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/selectors.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const mini = parseGedcom(miniGedcom());
const real = parseGedcom(realGedcom());

test('stats', () => {
  const s = S.stats(real);
  assert.equal(s.people, 209); assert.equal(s.families, 72);
  assert.ok(s.firstYear <= 1822); assert.ok(s.lastYear >= 1977);
  assert.ok(s.surnames > 20);
  assert.equal(S.stats(mini).generations, 4);
});

test('timeline mini: kolejność i ślub z obojgiem małżonków', () => {
  const t = S.timeline(mini);
  assert.deepEqual(t.map((e) => [e.date.year, e.kind]), [[1850, 'birth'], [1875, 'marriage'], [1880, 'birth']]);
  assert.deepEqual(t[1].personIds, ['I1', 'I2']);
  assert.equal(t[1].label, 'Ślub');
});

test('groupByDecade z wydarzeniami historycznymi', () => {
  const g = S.groupByDecade(S.timeline(mini), [{ year: 1877, label: 'X' }, { year: 1999, label: 'Y' }]);
  assert.deepEqual(g.map((x) => x.decade), [1850, 1870, 1880]);
  assert.deepEqual(g[1].history.map((h) => h.label), ['X']);
});

test('placeIndex: scalanie wariantów i współrzędne', () => {
  const idx = S.placeIndex(real, { Kliczewo: [53.05, 20.0] });
  assert.equal(idx[0].name, 'Kliczewo'); assert.deepEqual(idx[0].coords, [53.05, 20.0]);
  const zielona = idx.find((x) => x.name === 'Zielona');
  assert.ok(zielona.events.length >= 16);
  assert.equal(idx.find((x) => x.name === 'Polska').vague, true);
});

test('filterPeople', () => {
  assert.ok(S.filterPeople(mini, { surname: 'Kowal' }).some((p) => p.id === 'I2'), 'Ewa (po mężu Kowal)');
  assert.deepEqual(S.filterPeople(mini, { status: 'deceased' }).map((p) => p.id), ['I1']);
  assert.equal(S.filterPeople(mini, { sort: 'birth' })[0].id, 'I1');
  const z = S.filterPeople(real, { q: 'zuromin' });
  assert.ok(z.length > 3);
  assert.ok(S.filterPeople(real, { withPhoto: true }).every((p) => p.photos.length));
  assert.ok(S.filterPeople(real, { place: 'Zielona' }).length >= 10);
});

test('searchPeople', () => {
  assert.deepEqual(S.searchPeople(mini, ''), []);
  assert.equal(S.searchPeople(real, 'irena dom')[0].id, 'I500002');
  assert.equal(S.searchPeople(real, 'IRENA DOBIES')[0].id, 'I500002');
  assert.ok(S.searchPeople(mini, 'kow').length >= 5);
  assert.ok(S.searchPeople(real, 'a', 5).length <= 5);
});

test('galeria i dokumenty', () => {
  assert.equal(S.galleryItems(real).length, 19);
  const d = S.documentsFromTree(real);
  assert.ok(d.acts.some((a) => a.title === 'Akt nr.27/1908'));
  assert.ok(d.acts.some((a) => a.title === 'Akt prawny 37/1892'));
  assert.equal(d.sources.length, 1);
  assert.equal(d.sources[0].personIds.length, 34);
});

test('filterPeople: osoby bez nazwiska na końcu listy', () => {
  const m = structuredClone(mini);
  m.people.I99 = { ...m.people.I1, id: 'I99', given: 'Ktoś', surname: '', marriedName: null, famc: [], fams: [] };
  const list = S.filterPeople(m, {});
  assert.equal(list[list.length - 1].id, 'I99');
  assert.equal(S.filterPeople(m, { sort: 'surname' })[0].id !== 'I99', true);
});
