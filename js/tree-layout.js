(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).treeLayout = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const CARD_W = 210, CARD_H = 76, FAM_SIZE = 12;
  const PREFIX = 'drzewo:layout:';
  const OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.nodeNodeBetweenLayers': '36',
    'elk.spacing.nodeNode': '28',
    'elk.layered.spacing.edgeNodeBetweenLayers': '14',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.separateConnectedComponents': 'true',
    'elk.spacing.componentComponent': '80',
  };

  function buildElkGraph(m) {
    const children = [], edges = [], seen = new Set();
    const addPerson = (id) => { if (!id || seen.has(id) || !m.people[id]) return; seen.add(id); children.push({ id: 'p:' + id, width: CARD_W, height: CARD_H }); };
    for (const f of Object.values(m.families)) {
      if (!f.husb && !f.wife && !f.children.length) continue;
      addPerson(f.husb); addPerson(f.wife);
      children.push({ id: 'f:' + f.id, width: FAM_SIZE, height: FAM_SIZE });
      for (const s of [f.husb, f.wife]) if (s) edges.push({ id: `e:${s}>${f.id}`, sources: ['p:' + s], targets: ['f:' + f.id] });
      for (const c of f.children) edges.push({ id: `e:${f.id}>${c}`, sources: ['f:' + f.id], targets: ['p:' + c] });
    }
    for (const id of Object.keys(m.people)) addPerson(id);
    return { id: 'root', layoutOptions: OPTIONS, children, edges };
  }

  function relationHash(m) {
    const s = Object.values(m.families).map((f) => `${f.id}:${f.husb || ''}:${f.wife || ''}:${f.children.join(',')}`).sort().join('|')
      + '#' + Object.keys(m.people).sort().join(',') + '#' + CARD_W + 'x' + CARD_H;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }

  function fromElk(res) {
    const nodes = {};
    for (const n of res.children) {
      nodes[n.id] = { id: n.id.slice(2), kind: n.id[0] === 'p' ? 'person' : 'family', x: Math.round(n.x), y: Math.round(n.y), w: n.width, h: n.height };
    }
    const edges = (res.edges || []).map((e) => {
      const sec = (e.sections || [])[0];
      const pts = sec ? [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint].map((p) => [Math.round(p.x), Math.round(p.y)]) : [];
      return { id: e.id, from: e.sources[0], to: e.targets[0], points: pts };
    });
    return { nodes, edges, width: Math.ceil(res.width), height: Math.ceil(res.height) };
  }

  async function layoutTree(m, { ELK, storage = null } = {}) {
    const key = PREFIX + 'v1:' + relationHash(m);
    if (storage) { try { const c = storage.getItem(key); if (c) return JSON.parse(c); } catch { /* brak cache */ } }
    const res = fromElk(await new ELK().layout(buildElkGraph(m)));
    if (storage) {
      try {
        for (let i = storage.length - 1; i >= 0; i--) { const k = storage.key(i); if (k && k.startsWith(PREFIX) && k !== key) storage.removeItem(k); }
        storage.setItem(key, JSON.stringify(res));
      } catch { /* cache jest opcjonalny */ }
    }
    return res;
  }

  return { CARD_W, CARD_H, FAM_SIZE, buildElkGraph, relationHash, layoutTree };
});
