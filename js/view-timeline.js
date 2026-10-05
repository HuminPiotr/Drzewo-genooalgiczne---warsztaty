(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let el;
  const state = { kind: 'all', surname: '' };

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Oś czasu</h1><p>Narodziny, śluby i odejścia w kolejności lat.</p></div></div>
      <div class="toolbar">
        <div class="chips" role="group" aria-label="Rodzaj wydarzeń">
          ${[['all', 'Wszystkie'], ['birth', 'Narodziny'], ['marriage', 'Śluby'], ['death', 'Odejścia']].map(([k, l]) => U.h`<button class="chip" type="button" data-kind="${k}" aria-pressed="${k === 'all'}">${l}</button>`)}
        </div>
        <select class="select" id="tsurname" aria-label="Nazwisko"></select>
      </div>
      <div id="tlist"></div>`.toString();
    U.$('.chips', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      state.kind = b.dataset.kind;
      U.$$('[data-kind]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
    U.$('#tsurname', el).addEventListener('change', (e) => { state.surname = e.target.value; render(); });
    update();
  }

  function render() {
    const m = D.store.model;
    const match = (id) => { const p = m.people[id]; return p && (p.surname === state.surname || p.marriedName === state.surname); };
    const events = S.timeline(m)
      .filter((e) => state.kind === 'all' || e.kind === state.kind)
      .filter((e) => !state.surname || e.personIds.some(match));
    const box = U.$('#tlist', el);
    if (!events.length) { box.innerHTML = U.h`<div class="empty-state"><h2>Brak wydarzeń</h2><p>Dla wybranych filtrów nie ma dat w drzewie.</p></div>`.toString(); return; }
    const names = (ids) => ids.map((id) => m.people[id]).filter(Boolean)
      .map((p) => U.h`<a href="#/osoba/${encodeURIComponent(p.id)}">${P.displayName(p)}</a>`);
    const join = (parts) => parts.reduce((acc, x, i) => (i ? U.h`${acc} i ${x}` : x), '');
    box.innerHTML = U.h`${S.groupByDecade(events).map((g) => U.h`<section class="decade" aria-label="Lata ${g.decade}.">
      <div class="decade-label">${g.decade}</div>
      <ol class="decade-items">${[
        ...g.events.map((e) => ({ y: e.date.sortKey, html: U.h`<li class="tl-item k-${e.kind}"><div class="tl-date">${e.date.display}</div>
          <p class="tl-title">${e.label}: ${join(names(e.personIds))}</p>
          ${e.place || e.note ? U.h`<div class="tl-meta">${[e.place, e.note].filter(Boolean).join(' · ')}</div>` : ''}</li>` })),
        ...g.history.map((h) => ({ y: h.year * 10000 + 1, html: U.h`<li class="tl-history">${h.year} · ${h.label}</li>` })),
      ].sort((a, b) => a.y - b.y).map((x) => x.html)}</ol></section>`)}`.toString();
  }

  function update() {
    const sel = U.$('#tsurname', el);
    sel.innerHTML = U.h`<option value="">Wszystkie nazwiska</option>${S.surnames(D.store.model).map((s) => U.h`<option value="${s.name}">${s.name}</option>`)}`.toString();
    sel.value = state.surname;
    render();
  }

  D.views.timeline = { mount, show() {}, update };
})();
