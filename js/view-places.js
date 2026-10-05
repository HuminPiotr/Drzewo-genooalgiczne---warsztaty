(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let el, map = null, tiles = null, markers = new Map(), index = [], selected = null;
  const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const syncDark = () => { if (map) U.$('#placesMap', el).classList.toggle('map-dark', D.isDark()); };

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Miejsca</h1><p>Miejscowości, w których żyła rodzina.</p></div></div>
      <div class="places-layout"><div id="placesMap" role="region" aria-label="Mapa miejscowości"></div>
      <aside class="places-side"><div id="placeDetail"></div><ul class="place-list" id="placeList"></ul></aside></div>`.toString();
    U.$('#placeList', el).addEventListener('click', (e) => { const b = e.target.closest('[data-place]'); if (b) select(b.dataset.place, true); });
    document.addEventListener('drzewo:theme', syncDark);
  }

  function ensureMap() {
    if (map) return;
    map = L.map(U.$('#placesMap', el), { zoomControl: true, attributionControl: true }).setView([52.6, 20.0], 7);
    tiles = L.tileLayer(TILE, { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map);
    syncDark();
    rebuild();
    const pts = index.filter((p) => p.coords).map((p) => p.coords);
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 10 });
  }

  function rebuild() {
    index = S.placeIndex(D.store.model, window.DRZEWO_PLACES || {});
    if (map) {
      markers.forEach((mk) => mk.remove());
      markers = new Map();
      for (const p of index) {
        if (!p.coords) continue;
        const size = Math.round(28 + Math.sqrt(p.personIds.length) * 5);
        const mk = L.marker(p.coords, {
          icon: L.divIcon({ className: '', html: `<div class="pin${p.name === selected ? ' on' : ''}" style="width:${size}px;height:${size}px">${p.personIds.length}</div>`, iconSize: [size, size] }),
          title: p.name, keyboard: true,
        }).on('click', () => select(p.name, false));
        mk.bindTooltip(p.name, { direction: 'top', offset: [0, -size / 2] });
        mk.addTo(map);
        markers.set(p.name, mk);
      }
    }
    renderList();
    renderDetail();
  }

  function renderList() {
    U.$('#placeList', el).innerHTML = U.h`${index.map((p) => U.h`<li><button class="place-btn" type="button" data-place="${p.name}" aria-current="${p.name === selected}">
      <span>${p.name}${!p.coords && !p.vague ? U.h` <small>· brak na mapie</small>` : ''}</span><small>${U.plural(p.personIds.length, 'osoba', 'osoby', 'osób')}</small></button></li>`)}`.toString();
  }

  function renderDetail() {
    const box = U.$('#placeDetail', el);
    const p = index.find((x) => x.name === selected);
    if (!p) { box.innerHTML = U.h`<p class="muted" style="margin:4px 4px 12px">Wybierz miejscowość na mapie lub z listy.</p>`.toString(); return; }
    const m = D.store.model;
    const events = p.events.slice().sort((a, b) => ((a.date && a.date.sortKey) || 0) - ((b.date && b.date.sortKey) || 0));
    box.innerHTML = U.h`<div class="place-detail card-surface" style="padding:16px;margin-bottom:12px">
      <h2>${p.name}</h2><p class="muted" style="margin:0">${U.plural(p.events.length, 'wydarzenie', 'wydarzenia', 'wydarzeń')} · ${U.plural(p.personIds.length, 'osoba', 'osoby', 'osób')}</p>
      <ul class="place-events">${events.map((e) => U.h`<li><strong>${e.date ? e.date.display : 'bez daty'}</strong> · ${e.label}: ${e.personIds.map((id) => m.people[id] ? P.displayName(m.people[id]) : '').filter(Boolean).join(' i ')}</li>`)}</ul>
      <div class="rel-list">${p.personIds.map((id) => m.people[id]).filter(Boolean).map((q) => U.personCard(q))}</div></div>`.toString();
  }

  function select(name, fly) {
    selected = name;
    rebuild();
    const p = index.find((x) => x.name === name);
    if (fly && p && p.coords && map) map.flyTo(p.coords, Math.max(map.getZoom(), 10), { duration: U.reduceMotion() ? 0 : 0.6 });
    if (innerWidth <= 900) U.$('#placeDetail', el).scrollIntoView({ behavior: U.reduceMotion() ? 'auto' : 'smooth' });
  }

  D.views.places = {
    mount,
    show(param) {
      ensureMap();
      setTimeout(() => map.invalidateSize(), 0);
      if (param) select(param, true);
    },
    update() { rebuild(); },
  };
})();
