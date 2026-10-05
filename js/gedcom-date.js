(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).date = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const MONTHS_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const QUAL = { ABT: 'ok.', CAL: 'ok.', EST: 'ok.', BEF: 'przed', AFT: 'po' };

  function parsePart(s) {
    const t = s.trim().split(/\s+/);
    let day = null, month = null, year;
    if (t.length === 3) { day = Number(t[0]); month = MONTHS[t[1]] || null; year = Number(t[2]); }
    else if (t.length === 2) { month = MONTHS[t[0]] || null; year = Number(t[1]); }
    else if (t.length === 1) { year = Number(t[0]); }
    if (!Number.isInteger(year) || year <= 0) return null;
    if (t.length >= 2 && !month) return null;
    if (day != null && !(Number.isInteger(day) && day >= 1 && day <= 31)) return null;
    return { day, month, year };
  }
  const fmt = (p) => [p.day, p.month ? MONTHS_PL[p.month - 1] : null, p.year].filter((x) => x != null).join(' ');
  const make = (raw, p, approx, display) => ({
    raw, year: p.year, month: p.month, day: p.day, approx, display,
    sortKey: p.year * 10000 + (p.month || 0) * 100 + (p.day || 0),
  });

  function parseDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const up = s.toUpperCase().replace(/\s+/g, ' ');
    const bet = up.match(/^BET (.+) AND (.+)$/);
    if (bet) {
      const a = parsePart(bet[1]), b = parsePart(bet[2]);
      if (a && b) return make(s, a, 'BET', `między ${fmt(a)} a ${fmt(b)}`);
    }
    const q = up.match(/^(ABT|CAL|EST|BEF|AFT) (.+)$/);
    const p = parsePart(q ? q[2] : up);
    if (!p) return { raw: s, year: null, month: null, day: null, approx: null,
      display: /^x+$/i.test(s) ? 'nieznana' : s, sortKey: null };
    return make(s, p, q ? q[1] : null, (q ? QUAL[q[1]] + ' ' : '') + fmt(p));
  }

  const MON = Object.keys(MONTHS);
  const PL3 = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paz', 'lis', 'gru'];
  const PREFIX_IN = { 'ok.': 'ABT', ok: 'ABT', 'około': 'ABT', 'ca.': 'ABT', ca: 'ABT', przed: 'BEF', po: 'AFT' };
  const PREFIX_OUT = { ABT: 'ok. ', CAL: 'ok. ', EST: 'ok. ', BEF: 'przed ', AFT: 'po ' };
  const fold3 = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').toLowerCase().slice(0, 3);
  const pad2 = (n) => String(n).padStart(2, '0');

  // Polski zapis wpisany przez użytkownika → tekst daty GEDCOM (nierozpoznane zostaje bez zmian)
  function fromUserInput(input) {
    const s = String(input == null ? '' : input).trim();
    if (!s) return null;
    const low = s.toLowerCase().replace(/\s+/g, ' ');
    let prefix = '', body = low;
    const q = low.match(/^(ok\.?|około|ca\.?|przed|po) (.+)$/);
    if (q) { prefix = PREFIX_IN[q[1]] + ' '; body = q[2]; }
    let m = body.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${prefix}${+m[1]} ${MON[+m[2] - 1]} ${m[3]}`;
    m = body.match(/^(\d{1,2})[.\-/](\d{4})$/);
    if (m && +m[1] >= 1 && +m[1] <= 12) return `${prefix}${MON[+m[1] - 1]} ${m[2]}`;
    m = body.match(/^(?:(\d{1,2}) )?([a-ząćęłńóśźż]+)\.? (\d{4})$/i);
    if (m) {
      let idx = PL3.indexOf(fold3(m[2]));
      if (idx < 0) idx = MON.indexOf(m[2].slice(0, 3).toUpperCase());
      if (idx >= 0) return `${prefix}${m[1] ? +m[1] + ' ' : ''}${MON[idx]} ${m[3]}`;
    }
    if (/^\d{3,4}$/.test(body)) return prefix + body;
    return s;
  }

  // DateInfo → tekst do pola formularza (dd.mm.rrrr)
  function toUserInput(date) {
    if (!date) return '';
    const m = String(date.raw).toUpperCase().match(/^(?:(ABT|CAL|EST|BEF|AFT) )?(?:(\d{1,2}) )?(?:([A-Z]{3}) )?(\d{3,4})$/);
    if (!m || (m[3] && !MONTHS[m[3]])) return date.raw;
    const pre = PREFIX_OUT[m[1]] || '';
    if (m[2] && m[3]) return `${pre}${pad2(m[2])}.${pad2(MONTHS[m[3]])}.${m[4]}`;
    if (m[3]) return `${pre}${pad2(MONTHS[m[3]])}.${m[4]}`;
    return pre + m[4];
  }

  return { parseDate, MONTHS_PL, fromUserInput, toUserInput };
});
