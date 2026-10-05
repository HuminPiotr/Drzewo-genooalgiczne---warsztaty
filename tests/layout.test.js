const test = require('node:test');
const assert = require('node:assert/strict');
const ELK = require('../vendor/elk.bundled.js');
const L = require('../js/tree-layout.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const mini = parseGedcom(miniGedcom());
function memStorage() {
  const d = new Map();
  return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k),
    get length() { return d.size; }, key: (i) => [...d.keys()][i] ?? null };
}

test('buildUnits: para w jednej jednostce (mąż, żona), single osobno', () => {
  const { units } = L.buildUnits(mini);
  assert.equal(units.length, 10);
  assert.deepEqual(units.find((u) => u.persons.includes('I1')).persons, ['I1', 'I2']);
  assert.deepEqual(units.find((u) => u.persons.includes('I9')).persons, ['I9']);
  const f5 = units.find((u) => u.persons.includes('I9')).families.find((f) => f.id === 'F5');
  assert.equal(f5.both, false); assert.equal(f5.hubX, L.CARD_W / 2);
  const f1 = units.find((u) => u.persons.includes('I1')).families[0];
  assert.equal(f1.both, true); assert.equal(f1.hubX, L.CARD_W + L.COUPLE_GAP / 2);
});

test('buildUnits: ponowne małżeństwo daje łańcuch trzech osób z osobą w środku', () => {
  const m = structuredClone(mini);
  m.people.I16 = { ...m.people.I10, id: 'I16', given: 'Ida', famc: [], fams: [] };
  m.families.F9 = { id: 'F9', husb: 'I3', wife: 'I16', children: [], events: [], notes: [] };
  require('../js/gedcom-parse.js').finalizeModel(m);
  const unit = L.buildUnits(m).units.find((u) => u.persons.includes('I3'));
  assert.equal(unit.persons.length, 3);
  assert.equal(unit.persons[1], 'I3');
  assert.equal(unit.families.length, 2);
  assert.ok(unit.families.every((f) => f.both));
});

test('buildElkGraph: jednostki, porty i krawędzie rodzic→dziecko', () => {
  const g = L.buildElkGraph(mini);
  assert.equal(g.children.length, 10);
  const edges = g.edges;
  assert.equal(edges.length, 9);
  assert.ok(edges.every((e) => e.sources[0].startsWith('pf:') && e.targets[0].startsWith('pc:')));
  const portIds = new Set(g.children.flatMap((n) => n.ports.map((p) => p.id)));
  assert.ok(edges.every((e) => portIds.has(e.sources[0]) && portIds.has(e.targets[0])), 'każda krawędź wskazuje istniejące porty');
  assert.ok(g.children.every((n) => n.layoutOptions['elk.portConstraints'] === 'FIXED_POS'));
});

test('rodzina bez nikogo jest pomijana', () => {
  const m = structuredClone(mini);
  m.families.F99 = { id: 'F99', husb: null, wife: null, children: [], events: [], notes: [] };
  assert.equal(L.buildElkGraph(m).children.length, 10);
});

test('układ prawdziwych danych: wszyscy, bez nakładania, każda para obok siebie', async () => {
  const real = parseGedcom(realGedcom());
  const t0 = Date.now();
  const res = await L.layoutTree(real, { ELK });
  const ms = Date.now() - t0;
  const cards = Object.values(res.nodes).filter((n) => n.kind === 'person');
  assert.equal(cards.length, 209);
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    assert.ok(!overlap, `${a.id} nachodzi na ${b.id}`);
  }
  const couples = Object.values(real.families).filter((f) => f.husb && f.wife);
  const adjacent = couples.filter((f) => {
    const a = res.nodes['p:' + f.husb], b = res.nodes['p:' + f.wife];
    return a.y === b.y && Math.abs(a.x - b.x) === L.CARD_W + L.COUPLE_GAP;
  }).length;
  console.log(`layout: ${ms} ms, ${res.width}×${res.height}, pary obok siebie: ${adjacent}/${couples.length}`);
  assert.equal(adjacent, couples.length);
  assert.equal(Object.values(res.nodes).filter((n) => n.kind === 'family').length, Object.values(real.families).filter((f) => f.husb || f.wife).length);
  assert.ok(res.edges.every((e) => e.points.length >= 2));
  assert.ok(ms < 15000);
});

test('cache: drugi raz bez liczenia, inny hash po zmianie relacji', async () => {
  const st = memStorage();
  const a = await L.layoutTree(mini, { ELK, storage: st });
  const b = await L.layoutTree(mini, { ELK: function () { throw new Error('nie powinno liczyć'); }, storage: st });
  assert.deepEqual(b, a);
  const m2 = structuredClone(mini); m2.families.F5.wife = 'I7';
  assert.notEqual(L.relationHash(m2), L.relationHash(mini));
  const renamed = structuredClone(mini); renamed.people.I1.given = 'Inne imię';
  assert.equal(L.relationHash(renamed), L.relationHash(mini));
});
