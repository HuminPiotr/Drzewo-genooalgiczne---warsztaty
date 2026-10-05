(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).places = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const P = (typeof module === 'object' && module.exports) ? require('./person.js') : root.Drzewo.person;
  const VAGUE = new Set(['polska', 'poland']);
  // Klucze: fold() + myślniki bez spacji
  const ALIASES = {
    'stara dabrowa-kampinos': 'Stara Dąbrowa (Kampinos)',
    'kampinos-stara dabrowa': 'Stara Dąbrowa (Kampinos)',
    'dabrowa-kampinos': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowa': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowa stara': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowka': 'Dąbrówka (Kampinos)',
  };

  function normalizePlace(raw) {
    if (raw == null) return null;
    let s = String(raw).trim()
      .replace(/\/.*$/, '')            // "… /akt 85", "… /9"
      .replace(/\s*\bakt\b.*$/i, '')   // "… akt.36"
      .replace(/^[-\s]+/, '');         // "- Stara…", "-Kampinos"
    s = s.split(/[,.]|\s+pow\b|\s+par\b|\s+gm\b|\s+woj\b/i)[0].trim();
    if (!s) return null;
    const key = P.fold(s).replace(/\s*-\s*/g, '-');
    return ALIASES[key] || s;
  }
  const isVague = (name) => VAGUE.has(P.fold(name));

  function collectPlaces(model) {
    const map = new Map();
    const events = [...Object.values(model.people), ...Object.values(model.families)].flatMap((x) => x.events);
    for (const e of events) {
      const c = normalizePlace(e.place);
      if (!c) continue;
      if (!map.has(c)) map.set(c, []);
      if (!map.get(c).includes(e.place)) map.get(c).push(e.place);
    }
    return map;
  }

  return { normalizePlace, isVague, collectPlaces };
});
