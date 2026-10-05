(function () {
  'use strict';
  const D = (window.Drzewo = window.Drzewo || {});
  const P = D.person;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(String(s));
  const piece = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(piece).join('') : P.esc(v));
  function h(strings, ...vals) {
    let s = strings[0];
    vals.forEach((v, i) => { s += piece(v) + strings[i + 1]; });
    return new Raw(s);
  }
  const icon = (name) => raw(`<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`);
  function plural(n, one, few, many) {
    if (n === 1) return `${n} ${one}`;
    const d = n % 10, dd = n % 100;
    return `${n} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many}`;
  }

  const photoSrc = (url) => (window.DRZEWO_PHOTOS || {})[url] || url;
  function avatar(p, cls = 'avatar') {
    const ph = P.primaryPhoto(p);
    return h`<span class="${cls} sex-${p.sex}" aria-hidden="true">${P.initials(p)}${ph ? h`<img src="${photoSrc(ph.url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  }
  function personCard(p, { sub = '', attrs = '' } = {}) {
    const maiden = P.maidenName(p);
    const years = P.lifespan(p);
    return h`<a class="person-card sex-${p.sex}" href="#/osoba/${encodeURIComponent(p.id)}" ${raw(attrs)}>
      ${avatar(p)}<span class="pc-body"><span class="pc-name">${P.displayName(p)}</span>
      ${maiden ? h`<span class="pc-sub">z d. ${maiden}</span>` : ''}
      ${years || sub ? h`<span class="pc-years">${[years, sub].filter(Boolean).join(' · ')}</span>` : ''}</span></a>`;
  }

  let toastTimer;
  function toast(msg, { actionLabel = '', onAction = null, timeout = 4000 } = {}) {
    const el = $('#toast');
    el.innerHTML = h`<span>${msg}</span>${actionLabel ? h`<button type="button">${actionLabel}</button>` : ''}`;
    if (actionLabel) $('button', el).onclick = () => { el.classList.remove('show'); onAction && onAction(); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), timeout);
  }
  function download(name, text, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const selection = (() => {
    let id = null;
    const ls = new Set();
    return {
      get: () => id,
      set(next, opts = {}) { id = next || null; ls.forEach((f) => f(id, opts)); },
      subscribe(f) { ls.add(f); return () => ls.delete(f); },
    };
  })();
  const prefs = {
    get(key, def) { try { const v = localStorage.getItem('drzewo:' + key); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(key, val) { try { localStorage.setItem('drzewo:' + key, JSON.stringify(val)); } catch { /* tryb bez zapisu */ } },
  };

  D.util = { $, $$, h, raw, icon, plural, photoSrc, avatar, personCard, toast, download, debounce, reduceMotion, selection, prefs };
  D.views = D.views || {};
})();
