(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).relations = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const uniq = (a) => [...new Set(a)];
  const fam = (m, id) => m.families[id];
  const person = (m, id) => m.people[id];

  const parentsOf = (m, id) => uniq((person(m, id)?.famc || []).flatMap((f) => [fam(m, f)?.husb, fam(m, f)?.wife]).filter(Boolean));
  const childrenOf = (m, id) => uniq((person(m, id)?.fams || []).flatMap((f) => fam(m, f)?.children || []));
  const spousesOf = (m, id) => (person(m, id)?.fams || []).map((f) => {
    const F = fam(m, f); const other = F && (F.husb === id ? F.wife : F.husb);
    return other ? { id: other, familyId: f } : null;
  }).filter(Boolean);
  const siblingsOf = (m, id) => uniq(parentsOf(m, id).flatMap((p) => childrenOf(m, p))
    .concat((person(m, id)?.famc || []).flatMap((f) => fam(m, f)?.children || [])))
    .filter((x) => x !== id);

  function walk(m, id, next) {
    const depth = new Map([[id, 0]]);
    const queue = [id];
    while (queue.length) {
      const x = queue.shift();
      for (const y of next(m, x)) if (!depth.has(y)) { depth.set(y, depth.get(x) + 1); queue.push(y); }
    }
    return depth;
  }
  const ancestorDepths = (m, id) => walk(m, id, parentsOf);
  const ancestorsOf = (m, id) => { const s = new Set(ancestorDepths(m, id).keys()); s.delete(id); return s; };
  const descendantsOf = (m, id) => { const s = new Set(walk(m, id, childrenOf).keys()); s.delete(id); return s; };

  const g = (p, male, female, unknown) => (p?.sex === 'M' ? male : p?.sex === 'F' ? female : unknown);
  function ancestorWord(n, p) {
    if (n === 1) return g(p, 'ojciec', 'matka', 'rodzic');
    return 'pra'.repeat(n - 2) + g(p, 'dziadek', 'babcia', 'dziadek lub babcia');
  }
  function descendantWord(n, p) {
    if (n === 1) return g(p, 'syn', 'córka', 'dziecko');
    return 'pra'.repeat(n - 2) + g(p, 'wnuk', 'wnuczka', 'wnuk lub wnuczka');
  }

  function bloodKinship(m, fromId, toId) {
    const A = ancestorDepths(m, fromId), B = ancestorDepths(m, toId);
    let best = null;
    for (const [k, a] of A) if (B.has(k)) { const b = B.get(k); if (!best || a + b < best.a + best.b) best = { a, b }; }
    if (!best) return null;
    const { a, b } = best;
    const to = person(m, toId);
    if (b === 0) return ancestorWord(a, to);
    if (a === 0) return descendantWord(b, to);
    if (a === 1 && b === 1) {
      const shared = parentsOf(m, fromId).filter((x) => parentsOf(m, toId).includes(x));
      return g(to, 'brat', 'siostra', 'rodzeństwo') + (shared.length === 1 ? g(to, ' przyrodni', ' przyrodnia', ' przyrodnie') : '');
    }
    if (a === 2 && b === 1) return g(to, 'wujek', 'ciocia', 'wujek lub ciocia');
    if (a === 1 && b === 2) {
      const sib = parentsOf(m, toId).find((x) => siblingsOf(m, fromId).includes(x));
      const viaBrother = person(m, sib)?.sex !== 'F';
      return viaBrother ? g(to, 'bratanek', 'bratanica', 'bratanek') : g(to, 'siostrzeniec', 'siostrzenica', 'siostrzeniec');
    }
    if (a >= 2 && b >= 2) {
      const degree = Math.min(a, b) - 1;
      let s = g(to, 'kuzyn', 'kuzynka', 'kuzyn') + (degree > 1 ? ` ${degree}. stopnia` : '');
      if (a !== b) s += ` (${Math.abs(a - b)} pokol. ${b < a ? 'wyżej' : 'niżej'})`;
      return s;
    }
    return g(to, 'krewny', 'krewna', 'krewny') + ` (wspólny przodek ${a} pokol. wyżej)`;
  }

  function kinship(m, fromId, toId) {
    if (!person(m, fromId) || !person(m, toId)) return null;
    if (fromId === toId) return 'ta sama osoba';
    const to = person(m, toId);
    const spouses = spousesOf(m, fromId).map((s) => s.id);
    if (spouses.includes(toId)) return g(to, 'mąż', 'żona', 'małżonek');
    const blood = bloodKinship(m, fromId, toId);
    if (blood) return blood;
    if (spouses.some((s) => parentsOf(m, s).includes(toId))) return g(to, 'teść', 'teściowa', 'teść lub teściowa');
    if (childrenOf(m, fromId).some((c) => spousesOf(m, c).some((s) => s.id === toId))) return g(to, 'zięć', 'synowa', 'zięć lub synowa');
    const siblingSpouses = siblingsOf(m, fromId).flatMap((s) => spousesOf(m, s).map((x) => x.id));
    if (spouses.some((s) => siblingsOf(m, s).includes(toId)) || siblingSpouses.includes(toId))
      return g(to, 'szwagier', 'szwagierka', 'szwagier lub szwagierka');
    return null;
  }

  function generationCount(m) {
    const memo = new Map();
    const visiting = new Set();
    function depth(id) {
      if (memo.has(id)) return memo.get(id);
      if (visiting.has(id)) return 0; // cykl w danych – przerwij
      visiting.add(id);
      const d = 1 + Math.max(0, ...parentsOf(m, id).map(depth));
      visiting.delete(id);
      memo.set(id, d);
      return d;
    }
    return Math.max(0, ...Object.keys(m.people).map(depth));
  }

  return { parentsOf, childrenOf, spousesOf, siblingsOf, ancestorDepths, ancestorsOf, descendantsOf, kinship, generationCount };
});
