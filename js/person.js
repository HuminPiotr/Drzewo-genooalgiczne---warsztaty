(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).person = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const LIVING_BORN_AFTER = 1925;

  const lastName = (p) => p.marriedName || p.surname || '';
  function displayName(p) {
    const s = `${p.given || ''} ${lastName(p)}`.trim();
    return s || 'Nieznana osoba';
  }
  const maidenName = (p) => (p.marriedName && p.surname && p.marriedName !== p.surname ? p.surname : null);
  const findEvent = (p, types) => {
    for (const t of types) { const e = (p.events || []).find((x) => x.type === t); if (e) return e; }
    return null;
  };
  const birth = (p) => findEvent(p, ['BIRT', 'CHR', 'BAPM']);
  const death = (p) => findEvent(p, ['DEAT']);
  const burial = (p) => findEvent(p, ['BURI']);
  const yearOf = (e) => (e && e.date && e.date.year) || null;
  const birthYear = (p) => yearOf(birth(p));
  const deathYear = (p) => yearOf(death(p));

  function lifespan(p) {
    const b = birthYear(p), d = deathYear(p);
    if (b && d) return `${b}–${d}`;
    if (b) return p.deceased ? `${b}–?` : `ur. ${b}`;
    if (d) return `zm. ${d}`;
    return p.deceased ? '†' : '';
  }
  function initials(p) {
    const s = ((p.given || '').charAt(0) + lastName(p).charAt(0)).toUpperCase();
    return s || '?';
  }
  const isLiving = (p) => !p.deceased && (birthYear(p) || 0) > LIVING_BORN_AFTER;
  const primaryPhoto = (p) => (p.photos || []).find((x) => x.primary) || (p.photos || [])[0] || null;
  const occupation = (p) => { const e = findEvent(p, ['OCCU']); return e ? e.value : null; };

  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, (c) => ESC[c]));
  const searchText = (p) => fold([p.given, p.surname, p.marriedName, ...(p.events || []).map((e) => e.place)]
    .filter(Boolean).join(' '));

  return { displayName, maidenName, findEvent, birth, death, burial, birthYear, deathYear, lifespan,
    initials, isLiving, primaryPhoto, occupation, fold, esc, searchText, LIVING_BORN_AFTER };
});
