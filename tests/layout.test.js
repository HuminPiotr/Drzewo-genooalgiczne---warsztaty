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

test('buildElkGraph: węzły i krawędzie', () => {
  const g = L.buildElkGraph(mini);
  assert.equal(g.children.filter((n) => n.id.startsWith('p:')).length, 15);
  assert.equal(g.children.filter((n) => n.id.startsWith('f:')).length, 6);
  assert.equal(g.edges.length, 20);
  const ids = g.children.map((n) => n.id);
  assert.equal(ids.indexOf('p:I2'), ids.indexOf('p:I1') + 1, 'małżonkowie obok siebie w kolejności modelu');
});

test('rodzina bez nikogo jest pomijana', () => {
  const m = structuredClone(mini);
  m.families.F99 = { id: 'F99', husb: null, wife: null, children: [], events: [], notes: [] };
  assert.ok(!L.buildElkGraph(m).children.some((n) => n.id === 'f:F99'));
});

test('układ prawdziwych danych: wszyscy, bez nakładania, małżonkowie w jednym rzędzie', async () => {
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
  const sameRow = couples.filter((f) => res.nodes['p:' + f.husb].y === res.nodes['p:' + f.wife].y).length;
  console.log(`layout: ${ms} ms, ${res.width}×${res.height}, małżonkowie w rzędzie: ${sameRow}/${couples.length}`);
  assert.ok(sameRow / couples.length >= 0.9, `${sameRow}/${couples.length}`);
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
