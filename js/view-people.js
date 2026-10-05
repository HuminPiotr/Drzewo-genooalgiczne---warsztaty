(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, S = D.selectors;
  let el;
  const state = { q: '', surname: '', place: '', status: 'all', withPhoto: false, sort: 'surname' };

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Osoby</h1><p>Wszyscy zapisani w drzewie rodziny.</p></div><div data-edit-add></div></div>
      <div class="people-toolbar">
        <input class="input wide" type="search" id="pq" placeholder="Szukaj po imieniu, nazwisku, miejscowości…" aria-label="Szukaj osób">
        <select class="select" id="psurname" aria-label="Nazwisko"></select>
        <select class="select" id="pplace" aria-label="Miejscowość"></select>
        <select class="select" id="psort" aria-label="Sortowanie"><option value="surname">Sortuj: nazwisko</option><option value="birth">Sortuj: rok urodzenia</option></select>
        <label class="chip" style="display:inline-flex;align-items:center;gap:8px"><input type="checkbox" id="pphoto"> Ze zdjęciem</label>
        <div class="chips" role="group" aria-label="Status">
          <button class="chip" type="button" data-status="all" aria-pressed="true">Wszyscy</button>
          <button class="chip" type="button" data-status="deceased" aria-pressed="false">Zmarli</button>
          <button class="chip" type="button" data-status="living" aria-pressed="false">Prawdopodobnie żyjący</button>
        </div>
      </div>
      <p class="result-count" id="pcount" aria-live="polite"></p>
      <div id="plist"></div>`.toString();
    const rerender = U.debounce(renderList, 120);
    U.$('#pq', el).addEventListener('input', (e) => { state.q = e.target.value; rerender(); });
    U.$('#psurname', el).addEventListener('change', (e) => { state.surname = e.target.value; renderList(); });
    U.$('#pplace', el).addEventListener('change', (e) => { state.place = e.target.value; renderList(); });
    U.$('#psort', el).addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
    U.$('#pphoto', el).addEventListener('change', (e) => { state.withPhoto = e.target.checked; renderList(); });
    U.$('.chips', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      state.status = b.dataset.status;
      U.$$('[data-status]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderList();
    });
    renderFilters();
    renderList();
    if (D.edit) D.edit.renderPeopleAdd();
  }

  function renderFilters() {
    const m = D.store.model;
    U.$('#psurname', el).innerHTML = U.h`<option value="">Wszystkie nazwiska</option>${S.surnames(m).map((s) => U.h`<option value="${s.name}">${s.name} (${s.count})</option>`)}`.toString();
    U.$('#psurname', el).value = state.surname;
    const places = S.placeIndex(m).filter((p) => !p.vague).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    U.$('#pplace', el).innerHTML = U.h`<option value="">Wszystkie miejsca</option>${places.map((p) => U.h`<option value="${p.name}">${p.name}</option>`)}`.toString();
    U.$('#pplace', el).value = state.place;
  }

  function renderList() {
    const list = S.filterPeople(D.store.model, state);
    U.$('#pcount', el).textContent = `Znaleziono: ${U.plural(list.length, 'osoba', 'osoby', 'osób')}`;
    const box = U.$('#plist', el);
    if (!list.length) {
      box.innerHTML = U.h`<div class="empty-state"><h2>Nikogo nie znaleziono</h2><p>Zmień filtry albo wyczyść wyszukiwanie.</p></div>`.toString();
      return;
    }
    const sub = (p) => (D.person.birth(p) || {}).place || '';
    if (state.sort === 'surname') {
      const groups = new Map();
      for (const p of list) { const k = p.surname || 'Bez nazwiska'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
      box.innerHTML = U.h`${[...groups].map(([name, ps]) => U.h`<section class="surname-group"><h2>${name} <small>· ${ps.length}</small></h2>
        <div class="person-grid">${ps.map((p) => U.personCard(p, { sub: sub(p) }))}</div></section>`)}`.toString();
    } else {
      box.innerHTML = U.h`<div class="person-grid">${list.map((p) => U.personCard(p, { sub: sub(p) }))}</div>`.toString();
    }
  }

  D.views.people = {
    mount,
    show() {},
    update() { renderFilters(); renderList(); },
  };
})();
