(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).selectors = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const P = node ? require('./person.js') : root.Drzewo.person;
  const R = node ? require('./relations.js') : root.Drzewo.relations;
  const PL = node ? require('./places.js') : root.Drzewo.places;

  const EVENT_LABEL = { BIRT: 'Narodziny', CHR: 'Chrzest', BAPM: 'Chrzest', DEAT: 'Śmierć', BURI: 'Pogrzeb',
    MARR: 'Ślub', MARL: 'Zapowiedzi', ENGA: 'Zaręczyny', DIV: 'Rozwód', RESI: 'Zamieszkanie', OCCU: 'Zawód', EVEN: 'Wydarzenie' };
  const KIND = { BIRT: 'birth', CHR: 'birth', BAPM: 'birth', DEAT: 'death', BURI: 'death', MARR: 'marriage', MARL: 'marriage', ENGA: 'marriage' };
  const HISTORY = [
    { year: 1863, label: 'Powstanie styczniowe' },
    { year: 1914, label: 'Wybuch I wojny światowej' },
    { year: 1918, label: 'Odzyskanie niepodległości' },
    { year: 1939, label: 'Wybuch II wojny światowej' },
    { year: 1945, label: 'Koniec II wojny światowej' },
  ];
  const people = (m) => Object.values(m.people);
  const families = (m) => Object.values(m.families);
  const cmpName = (a, b) => P.displayName(a).localeCompare(P.displayName(b), 'pl');

  function stats(m) {
    const years = [...people(m), ...families(m)].flatMap((x) => x.events).map((e) => e.date && e.date.year).filter(Boolean);
    return {
      people: people(m).length,
      families: families(m).length,
      generations: R.generationCount(m),
      firstYear: years.length ? Math.min(...years) : null,
      lastYear: years.length ? Math.max(...years) : null,
      surnames: new Set(people(m).map((p) => p.surname).filter(Boolean)).size,
    };
  }

  function timeline(m) {
    const out = [];
    const push = (e, personIds, extra) => {
      const kind = KIND[e.type];
      if (!kind || !e.date || !e.date.year) return;
      out.push({ key: `${personIds.join('+')}:${e.type}:${e.date.raw}`, kind, type: e.type, label: EVENT_LABEL[e.type],
        date: e.date, place: e.place, note: e.note, personIds, ...extra });
    };
    for (const p of people(m)) for (const e of p.events) push(e, [p.id], {});
    for (const f of families(m)) for (const e of f.events) push(e, [f.husb, f.wife].filter(Boolean), { familyId: f.id });
    return out.sort((a, b) => a.date.sortKey - b.date.sortKey || a.label.localeCompare(b.label, 'pl'));
  }

  function groupByDecade(events, history = HISTORY) {
    const groups = new Map();
    for (const e of events) {
      const d = Math.floor(e.date.year / 10) * 10;
      if (!groups.has(d)) groups.set(d, { decade: d, events: [], history: [] });
      groups.get(d).events.push(e);
    }
    for (const h of history) { const g = groups.get(Math.floor(h.year / 10) * 10); if (g) g.history.push(h); }
    return [...groups.values()].sort((a, b) => a.decade - b.decade);
  }

  function placeIndex(m, coords = {}) {
    const map = new Map();
    const add = (e, ids) => {
      const name = PL.normalizePlace(e.place);
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, coords: coords[name] || null, vague: PL.isVague(name), personIds: new Set(), events: [] });
      const x = map.get(name);
      ids.forEach((i) => x.personIds.add(i));
      x.events.push({ type: e.type, label: EVENT_LABEL[e.type] || e.type, date: e.date, personIds: ids });
    };
    for (const p of people(m)) for (const e of p.events) add(e, [p.id]);
    for (const f of families(m)) for (const e of f.events) add(e, [f.husb, f.wife].filter(Boolean));
    return [...map.values()].map((x) => ({ ...x, personIds: [...x.personIds] }))
      .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name, 'pl'));
  }

  function surnames(m) {
    const c = new Map();
    for (const p of people(m)) if (p.surname) c.set(p.surname, (c.get(p.surname) || 0) + 1);
    return [...c].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
  }

  function filterPeople(m, { q = '', surname = '', place = '', status = 'all', withPhoto = false, sort = 'surname' } = {}) {
    const words = P.fold(q).split(/\s+/).filter(Boolean);
    const list = people(m).filter((p) => {
      if (words.length) { const t = P.searchText(p); if (!words.every((w) => t.includes(w))) return false; }
      if (surname && p.surname !== surname && p.marriedName !== surname) return false;
      if (place && !p.events.some((e) => PL.normalizePlace(e.place) === place)) return false;
      if (status === 'living' && !P.isLiving(p)) return false;
      if (status === 'deceased' && !p.deceased) return false;
      if (withPhoto && !p.photos.length) return false;
      return true;
    });
    const bySurname = (a, b) => (a.surname || '').localeCompare(b.surname || '', 'pl') || cmpName(a, b);
    const byBirth = (a, b) => (P.birthYear(a) || 9999) - (P.birthYear(b) || 9999) || cmpName(a, b);
    return list.sort(sort === 'birth' ? byBirth : bySurname);
  }

  function searchPeople(m, q, limit = 8) {
    const words = P.fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored = [];
    for (const p of people(m)) {
      const name = P.fold(`${P.displayName(p)} ${p.surname || ''}`);
      let score = -1;
      if (words.every((w) => name.includes(w))) score = name.startsWith(words[0]) ? 0 : 1;
      else if (words.every((w) => P.searchText(p).includes(w))) score = 2;
      if (score >= 0) scored.push({ p, score });
    }
    return scored.sort((a, b) => a.score - b.score || cmpName(a.p, b.p)).slice(0, limit).map((x) => x.p);
  }

  const galleryItems = (m) => people(m).sort(cmpName).flatMap((p) => p.photos.map((ph) =>
    ({ url: ph.url, title: ph.title || P.displayName(p), personId: p.id, primary: ph.primary })));

  function documentsFromTree(m) {
    const acts = [];
    const isAct = (s) => !!s && /akt/i.test(s);
    const scan = (e, ids) => {
      const title = isAct(e.typeLabel) ? e.typeLabel : isAct(e.note) ? e.note : null;
      if (title) acts.push({ title, kind: EVENT_LABEL[e.type] || e.type, date: e.date, place: e.place, personIds: ids });
    };
    for (const p of people(m)) p.events.forEach((e) => scan(e, [p.id]));
    for (const f of families(m)) f.events.forEach((e) => scan(e, [f.husb, f.wife].filter(Boolean)));
    acts.sort((a, b) => ((a.date && a.date.sortKey) || 0) - ((b.date && b.date.sortKey) || 0));
    const sources = Object.values(m.sources).map((s) => ({ ...s,
      personIds: people(m).filter((p) => p.sources.some((x) => x.sourceId === s.id)).map((p) => p.id) }));
    return { acts, sources };
  }

  return { EVENT_LABEL, HISTORY, stats, timeline, groupByDecade, placeIndex, surnames, filterPeople, searchPeople,
    galleryItems, documentsFromTree };
});
