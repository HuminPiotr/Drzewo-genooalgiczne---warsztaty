(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).treeLayout = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const CARD_W = 210, CARD_H = 76, FAM_SIZE = 12, COUPLE_GAP = 24;
  const STEP = CARD_W + COUPLE_GAP;
  const PREFIX = 'drzewo:layout:';
  const OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.nodeNodeBetweenLayers': '40',
    'elk.spacing.nodeNode': '28',
    'elk.layered.spacing.edgeNodeBetweenLayers': '14',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.separateConnectedComponents': 'true',
    'elk.spacing.componentComponent': '80',
  };

  // Jednostka = osoby połączone małżeństwami (para albo łańcuch przy ponownym małżeństwie),
  // układane obok siebie jako jeden węzeł ELK. Rodzina (hub) leży między małżonkami.
  function buildUnits(m) {
    const ids = Object.keys(m.people);
    const hasParent = (f) => (f.husb && m.people[f.husb]) || (f.wife && m.people[f.wife]);
    const fams = Object.values(m.families).filter(hasParent);
    const links = new Map(ids.map((id) => [id, []]));
    for (const f of fams) {
      if (f.husb && f.wife && m.people[f.husb] && m.people[f.wife]) {
        links.get(f.husb).push({ other: f.wife, fid: f.id });
        links.get(f.wife).push({ other: f.husb, fid: f.id });
      }
    }
    const seen = new Set(), units = [], unitOf = new Map();
    for (const id of ids) {
      if (seen.has(id)) continue;
      const comp = [], queue = [id];
      seen.add(id);
      while (queue.length) {
        const x = queue.shift(); comp.push(x);
        for (const { other } of links.get(x)) if (!seen.has(other)) { seen.add(other); queue.push(other); }
      }
      let order;
      if (comp.length === 2) {
        const f = fams.find((x) => x.husb && x.wife && comp.includes(x.husb) && comp.includes(x.wife));
        order = [f.husb, f.wife];
      } else {
        const start = comp.reduce((best, x) => (links.get(x).length < links.get(best).length ? x : best), comp[0]);
        order = [];
        const visited = new Set();
        (function walk(x) { visited.add(x); order.push(x); for (const { other } of links.get(x)) if (!visited.has(other)) walk(other); })(start);
      }
      const unit = { id: 'u' + units.length, persons: order, families: [] };
      units.push(unit);
      order.forEach((p) => unitOf.set(p, unit));
    }
    for (const f of fams) {
      const hus = f.husb && m.people[f.husb] ? f.husb : null, wif = f.wife && m.people[f.wife] ? f.wife : null;
      const unit = unitOf.get(hus || wif);
      const a = unit.persons.indexOf(hus), b = unit.persons.indexOf(wif);
      const both = !!(hus && wif);
      const hubX = !both ? unit.persons.indexOf(hus || wif) * STEP + CARD_W / 2
        : Math.abs(a - b) === 1 ? Math.max(a, b) * STEP - COUPLE_GAP / 2
        : ((a + b) / 2) * STEP + CARD_W / 2;
      unit.families.push({ id: f.id, husb: hus, wife: wif, both, hubX });
    }
    return { units, unitOf };
  }

  function buildElkGraph(m, built = buildUnits(m)) {
    const { units } = built;
    const edges = [], childOf = new Set();
    for (const f of Object.values(m.families)) {
      const hasParent = (f.husb && m.people[f.husb]) || (f.wife && m.people[f.wife]);
      if (!hasParent) continue;
      for (const c of f.children) {
        if (!m.people[c]) continue;
        childOf.add(c);
        edges.push({ id: `e:${f.id}>${c}`, sources: ['pf:' + f.id], targets: ['pc:' + c] });
      }
    }
    const children = units.map((u) => ({
      id: u.id,
      width: u.persons.length * CARD_W + (u.persons.length - 1) * COUPLE_GAP,
      height: CARD_H,
      layoutOptions: { 'elk.portConstraints': 'FIXED_POS' },
      ports: [
        ...u.families.map((f) => ({ id: 'pf:' + f.id, x: f.hubX, y: CARD_H, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'SOUTH' } })),
        ...u.persons.map((p, i) => (childOf.has(p)
          ? { id: 'pc:' + p, x: i * STEP + CARD_W / 2, y: 0, width: 0, height: 0, layoutOptions: { 'elk.port.side': 'NORTH' } } : null)).filter(Boolean),
      ],
    }));
    return { id: 'root', layoutOptions: OPTIONS, children, edges };
  }

  function relationHash(m) {
    const s = Object.values(m.families).map((f) => `${f.id}:${f.husb || ''}:${f.wife || ''}:${f.children.join(',')}`).sort().join('|')
      + '#' + Object.keys(m.people).sort().join(',') + '#' + CARD_W + 'x' + CARD_H + 'g' + COUPLE_GAP;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }

  function fromElk(res, built) {
    const byId = new Map(built.units.map((u) => [u.id, u]));
    const nodes = {}, hubs = {}, edges = [];
    const r = Math.round;
    for (const n of res.children) {
      const u = byId.get(n.id);
      u.persons.forEach((pid, i) => { nodes['p:' + pid] = { id: pid, kind: 'person', x: r(n.x + i * STEP), y: r(n.y), w: CARD_W, h: CARD_H }; });
      for (const f of u.families) {
        const cx = n.x + f.hubX, cy = n.y + (f.both ? CARD_H / 2 : CARD_H);
        hubs[f.id] = { cx, cy, f };
        nodes['f:' + f.id] = { id: f.id, kind: 'family', x: r(cx - FAM_SIZE / 2), y: r(cy - FAM_SIZE / 2), w: FAM_SIZE, h: FAM_SIZE };
      }
    }
    for (const e of res.edges || []) {
      const sec = (e.sections || [])[0];
      const fid = e.sources[0].slice(3), cid = e.targets[0].slice(3);
      const pts = sec ? [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint].map((p) => [r(p.x), r(p.y)]) : [];
      if (pts.length && hubs[fid].f.both) pts.unshift([r(hubs[fid].cx), r(hubs[fid].cy)]);
      edges.push({ id: e.id, from: 'f:' + fid, to: 'p:' + cid, points: pts });
    }
    for (const { cx, cy, f } of Object.values(hubs)) {
      if (!f.both) continue;
      for (const pid of [f.husb, f.wife]) {
        const card = nodes['p:' + pid];
        const sx = card.x + CARD_W / 2 < cx ? card.x + CARD_W : card.x;
        edges.push({ id: `m:${pid}>${f.id}`, from: 'p:' + pid, to: 'f:' + f.id, points: [[sx, r(cy)], [r(cx), r(cy)]] });
      }
    }
    return { nodes, edges, width: Math.ceil(res.width), height: Math.ceil(res.height) };
  }

  async function layoutTree(m, { ELK, storage = null } = {}) {
    const key = PREFIX + 'v2:' + relationHash(m);
    if (storage) { try { const c = storage.getItem(key); if (c) return JSON.parse(c); } catch { /* brak cache */ } }
    const built = buildUnits(m);
    const res = fromElk(await new ELK().layout(buildElkGraph(m, built)), built);
    if (storage) {
      try {
        for (let i = storage.length - 1; i >= 0; i--) { const k = storage.key(i); if (k && k.startsWith(PREFIX) && k !== key) storage.removeItem(k); }
        storage.setItem(key, JSON.stringify(res));
      } catch { /* cache jest opcjonalny */ }
    }
    return res;
  }

  return { CARD_W, CARD_H, FAM_SIZE, COUPLE_GAP, buildUnits, buildElkGraph, relationHash, layoutTree };
});
