(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).gedcom = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const D = (typeof module === 'object' && module.exports) ? require('./gedcom-date.js') : root.Drzewo.date;

  const EVENT_TAGS = ['BIRT', 'CHR', 'BAPM', 'DEAT', 'BURI', 'RESI', 'OCCU', 'EVEN'];
  const FAMILY_EVENT_TAGS = ['MARR', 'MARL', 'ENGA', 'DIV'];
  const LINE = /^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?(\S+)(?: (.*))?$/;

  function parseRecords(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/);
    const roots = [];
    const stack = [];
    for (const line of lines) {
      const m = line.match(LINE);
      if (!m) continue;
      const level = Number(m[1]);
      const value = (m[4] || '').replace(/\s+$/, '').replace(/@@/g, '@');
      if (m[3] === 'CONC' || m[3] === 'CONT') {
        const parent = stack[level - 1];
        if (parent) parent.value += (m[3] === 'CONT' ? '\n' : '') + value;
        continue;
      }
      const node = { level, xref: m[2] || null, tag: m[3], value, children: [] };
      stack.length = level;
      stack[level] = node;
      if (level === 0) roots.push(node);
      else if (stack[level - 1]) stack[level - 1].children.push(node);
    }
    return roots;
  }

  const child = (n, tag) => (n ? n.children.find((c) => c.tag === tag) : undefined);
  const kids = (n, tag) => (n ? n.children.filter((c) => c.tag === tag) : []);
  const val = (n, tag) => { const c = child(n, tag); return c && c.value ? c.value : null; };
  const ptr = (v) => (v ? v.replace(/@/g, '') : null);
  const stripHtml = (s) => (s ? s.replace(/<\/p>\s*<p>/g, '\n').replace(/<[^>]+>/g, '').trim() : null);

  function readEvent(n) {
    const ev = {
      type: n.tag,
      date: D.parseDate(val(n, 'DATE')),
      place: val(n, 'PLAC'),
      note: val(n, 'NOTE'),
      age: val(n, 'AGE'),
      cause: val(n, 'CAUS'),
      value: (n.tag === 'OCCU' || n.tag === 'EVEN') && n.value ? n.value : null,
      typeLabel: val(n, 'TYPE'),
    };
    if (n.tag === 'RESI' && !ev.place) {
      const addr = child(n, 'ADDR');
      ev.place = val(addr, 'CITY') || val(addr, 'ADR1') || (addr && addr.value) || null;
    }
    return ev;
  }
  const hasContent = (e) => !!(e.date || e.place || e.note || e.age || e.cause || e.value || e.typeLabel);

  function readPerson(n) {
    const nameNode = child(n, 'NAME');
    const full = nameNode ? nameNode.value : '';
    const mm = full.match(/^([^/]*)\/([^/]*)\/?/);
    const given = (val(nameNode, 'GIVN') || (mm ? mm[1] : full)).trim();
    const surname = (val(nameNode, 'SURN') || (mm ? mm[2] : '')).trim();
    const sex = val(n, 'SEX');
    const events = [];
    let deceased = false;
    for (const c of n.children) {
      if (!EVENT_TAGS.includes(c.tag)) continue;
      if (c.tag === 'DEAT') deceased = true;
      const ev = readEvent(c);
      if (hasContent(ev)) events.push(ev);
    }
    return {
      id: ptr(n.xref),
      given,
      surname,
      marriedName: (val(nameNode, '_MARNM') || '').trim() || null,
      sex: sex === 'M' || sex === 'F' ? sex : 'U',
      events,
      photos: kids(n, 'OBJE').filter((o) => val(o, 'FILE')).map((o) => ({
        url: val(o, 'FILE'),
        title: val(o, 'TITL'),
        primary: val(o, '_PRIM') === 'Y' || val(o, '_PERSONALPHOTO') === 'Y',
      })),
      sources: kids(n, 'SOUR').filter((s) => s.value).map((s) => ({ sourceId: ptr(s.value), page: val(s, 'PAGE') })),
      notes: kids(n, 'NOTE').map((x) => x.value).filter(Boolean),
      memories: [],
      deceased,
      famc: [],
      fams: [],
    };
  }

  function readFamily(n) {
    return {
      id: ptr(n.xref),
      husb: ptr(val(n, 'HUSB')),
      wife: ptr(val(n, 'WIFE')),
      children: kids(n, 'CHIL').map((c) => ptr(c.value)).filter(Boolean),
      events: n.children.filter((c) => FAMILY_EVENT_TAGS.includes(c.tag)).map(readEvent),
      notes: kids(n, 'NOTE').map((x) => x.value).filter(Boolean),
    };
  }

  function readSource(n) {
    return { id: ptr(n.xref), title: val(n, 'TITL'), author: val(n, 'AUTH'), text: stripHtml(val(n, 'TEXT')) };
  }

  function finalizeModel(model) {
    for (const p of Object.values(model.people)) { p.famc = []; p.fams = []; }
    for (const f of Object.values(model.families)) {
      if (f.husb && !model.people[f.husb]) f.husb = null;
      if (f.wife && !model.people[f.wife]) f.wife = null;
      f.children = [...new Set(f.children.filter((id) => model.people[id]))];
      for (const s of [f.husb, f.wife]) if (s) model.people[s].fams.push(f.id);
      for (const c of f.children) model.people[c].famc.push(f.id);
    }
    return model;
  }

  function parseGedcom(text) {
    const recs = parseRecords(text);
    const head = recs.find((r) => r.tag === 'HEAD');
    const indis = recs.filter((r) => r.tag === 'INDI' && r.xref);
    if (!head || !indis.length) throw new Error('Plik nie wygląda na GEDCOM (brak nagłówka lub osób).');
    const model = { people: {}, families: {}, sources: {}, header: { source: val(head, 'SOUR'), date: val(head, 'DATE') } };
    for (const r of indis) { const p = readPerson(r); model.people[p.id] = p; }
    for (const r of recs) {
      if (r.tag === 'FAM' && r.xref) { const f = readFamily(r); model.families[f.id] = f; }
      if (r.tag === 'SOUR' && r.xref) { const s = readSource(r); model.sources[s.id] = s; }
    }
    return finalizeModel(model);
  }

  return { parseRecords, parseGedcom, finalizeModel, EVENT_TAGS, FAMILY_EVENT_TAGS };
});
