(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).gedcomExport = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const G = (typeof module === 'object' && module.exports) ? require('./gedcom-parse.js') : root.Drzewo.gedcom;
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const CHUNK = 200;

  function toGedcom(model, { now = new Date() } = {}) {
    const out = [];
    const esc = (v) => String(v).replace(/@/g, '@@');
    function line(level, tag, value, xref) {
      const head = `${level} ${xref ? `@${xref}@ ` : ''}${tag}`;
      if (value == null || value === '') { out.push(head); return; }
      const [first, ...rest] = String(value).split('\n');
      const chunks = (s) => { const r = []; for (let i = 0; i < s.length; i += CHUNK) r.push(s.slice(i, i + CHUNK)); return r.length ? r : ['']; };
      const [f0, ...fc] = chunks(esc(first));
      out.push(`${head} ${f0}`.trimEnd());
      fc.forEach((c) => out.push(`${level + 1} CONC ${c}`));
      for (const r of rest) {
        const [r0, ...rc] = chunks(esc(r));
        out.push(`${level + 1} CONT ${r0}`.trimEnd());
        rc.forEach((c) => out.push(`${level + 1} CONC ${c}`));
      }
    }
    const pointer = (level, tag, id) => out.push(`${level} ${tag} @${id}@`);
    function event(e, level = 1) {
      line(level, e.type, e.value);
      if (e.typeLabel) line(level + 1, 'TYPE', e.typeLabel);
      if (e.date) line(level + 1, 'DATE', e.date.raw);
      if (e.place) line(level + 1, 'PLAC', e.place);
      if (e.age) line(level + 1, 'AGE', e.age);
      if (e.cause) line(level + 1, 'CAUS', e.cause);
      if (e.note) line(level + 1, 'NOTE', e.note);
    }

    line(0, 'HEAD'); line(1, 'GEDC'); line(2, 'VERS', '5.5.1'); line(2, 'FORM', 'LINEAGE-LINKED');
    line(1, 'CHAR', 'UTF-8'); line(1, 'LANG', 'Polish');
    line(1, 'SOUR', 'DRZEWO'); line(2, 'NAME', 'Drzewo genealogiczne');
    line(1, 'DATE', `${now.getUTCDate()} ${MON[now.getUTCMonth()]} ${now.getUTCFullYear()}`);

    for (const p of Object.values(model.people)) {
      line(0, 'INDI', null, p.id);
      line(1, 'NAME', `${p.given} /${p.surname}/`.trim());
      if (p.given) line(2, 'GIVN', p.given);
      if (p.surname) line(2, 'SURN', p.surname);
      if (p.marriedName) line(2, '_MARNM', p.marriedName);
      line(1, 'SEX', p.sex);
      p.events.forEach((e) => event(e));
      if (p.deceased && !p.events.some((e) => e.type === 'DEAT')) line(1, 'DEAT', 'Y');
      p.famc.forEach((f) => pointer(1, 'FAMC', f));
      p.fams.forEach((f) => pointer(1, 'FAMS', f));
      for (const ph of p.photos) {
        line(1, 'OBJE'); line(2, 'FORM', 'jpg'); line(2, 'FILE', ph.url);
        if (ph.title) line(2, 'TITL', ph.title);
        if (ph.primary) line(2, '_PRIM', 'Y');
      }
      for (const s of p.sources) { pointer(1, 'SOUR', s.sourceId); if (s.page) line(2, 'PAGE', s.page); }
      p.notes.forEach((n) => line(1, 'NOTE', n));
      (p.memories || []).forEach((n) => line(1, 'NOTE', G.MEMORY_PREFIX + n));
    }
    for (const f of Object.values(model.families)) {
      line(0, 'FAM', null, f.id);
      if (f.husb) pointer(1, 'HUSB', f.husb);
      if (f.wife) pointer(1, 'WIFE', f.wife);
      f.children.forEach((c) => pointer(1, 'CHIL', c));
      f.events.forEach((e) => event(e));
      f.notes.forEach((n) => line(1, 'NOTE', n));
    }
    for (const s of Object.values(model.sources)) {
      line(0, 'SOUR', null, s.id);
      if (s.title) line(1, 'TITL', s.title);
      if (s.author) line(1, 'AUTH', s.author);
      if (s.text) line(1, 'TEXT', s.text);
    }
    line(0, 'TRLR');
    return out.join('\r\n') + '\r\n';
  }

  return { toGedcom };
});
