(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let wrap, input, list, results = [], active = 0, resolver = null, excluded = new Set();

  function ensure() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.className = 'palette-backdrop';
    wrap.hidden = true;
    wrap.innerHTML = U.h`<div class="palette" role="dialog" aria-modal="true" aria-label="Szukaj osoby">
      <div class="palette-input">${U.icon('search')}
        <input type="search" autocomplete="off" spellcheck="false" placeholder="Imię, nazwisko lub miejscowość…" role="combobox" aria-expanded="true" aria-controls="paletteList" aria-autocomplete="list">
        <kbd>Esc</kbd></div>
      <p class="palette-title" hidden></p>
      <ul id="paletteList" role="listbox" aria-label="Wyniki"></ul></div>`.toString();
    document.body.append(wrap);
    input = U.$('input', wrap);
    list = U.$('ul', wrap);
    input.addEventListener('input', () => { active = 0; renderResults(); });
    input.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) return finish(null);
      const li = e.target.closest('[data-id]');
      if (li) finish(li.dataset.id);
    });
  }

  function recent() {
    const m = D.store.model;
    return U.prefs.get('recent', []).map((id) => m.people[id]).filter(Boolean).filter((p) => !excluded.has(p.id));
  }
  function renderResults() {
    const q = input.value.trim();
    results = q ? S.searchPeople(D.store.model, q, 12).filter((p) => !excluded.has(p.id)) : recent();
    if (!results.length) {
      list.innerHTML = U.h`<li class="palette-empty">${q ? 'Brak wyników – spróbuj innej pisowni lub samego nazwiska.' : 'Zacznij pisać, aby wyszukać osobę.'}</li>`.toString();
      input.removeAttribute('aria-activedescendant');
      return;
    }
    list.innerHTML = U.h`${!q ? U.h`<li class="palette-hint" role="presentation">Ostatnio oglądane</li>` : ''}${results.map((p, i) => U.h`
      <li id="opt-${i}" role="option" data-id="${p.id}" aria-selected="${i === active}">${U.avatar(p)}
        <span class="opt-text"><strong>${P.displayName(p)}</strong>
        <small>${[P.maidenName(p) && 'z d. ' + P.maidenName(p), P.lifespan(p), (P.birth(p) || {}).place].filter(Boolean).join(' · ') || ' '}</small></span></li>`)}`.toString();
    input.setAttribute('aria-activedescendant', 'opt-' + active);
  }
  function move(delta) {
    if (!results.length) return;
    active = (active + delta + results.length) % results.length;
    U.$$('[role="option"]', list).forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', 'opt-' + active);
    U.$('#opt-' + active, list).scrollIntoView({ block: 'nearest' });
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) finish(results[active].id); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
  }

  function openPalette({ title = '', exclude = [] } = {}) {
    ensure();
    excluded = new Set(exclude);
    const t = U.$('.palette-title', wrap);
    t.hidden = !title;
    t.textContent = title;
    input.value = '';
    active = 0;
    renderResults();
    wrap.hidden = false;
    document.body.classList.add('modal-open');
    input.focus();
    return new Promise((r) => { resolver = r; });
  }
  function finish(id) {
    wrap.hidden = true;
    if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('modal-open');
    if (id) U.prefs.set('recent', [id, ...U.prefs.get('recent', []).filter((x) => x !== id)].slice(0, 6));
    const r = resolver;
    resolver = null;
    if (r) r(id);
  }

  async function go() {
    const id = await openPalette();
    if (!id) return;
    D.router.go('#/osoba/' + encodeURIComponent(id));
    U.selection.set(id, { center: true });
  }

  function init() {
    U.$('#searchOpen').addEventListener('click', go);
    document.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      const typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        if (wrap && !wrap.hidden) return;
        e.preventDefault();
        go();
      }
    });
  }

  D.search = { init, go, pickPerson: openPalette };
})();
