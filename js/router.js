(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util;
  const ROUTES = { drzewo: 'tree', osoby: 'people', 'os-czasu': 'timeline', miejsca: 'places', galeria: 'gallery', historie: 'stories' };
  const TITLES = { drzewo: 'Drzewo', osoby: 'Osoby', 'os-czasu': 'Oś czasu', miejsca: 'Miejsca', galeria: 'Galeria', historie: 'Historie' };
  const mounted = new Set();
  let current = null;
  let lastSlug = 'drzewo';

  function parse(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/').map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
    if (parts[0] === 'osoba' && parts[1]) return { personId: parts[1] };
    return { slug: ROUTES[parts[0]] ? parts[0] : 'drzewo', param: parts[1] || null };
  }

  function showView(slug, param = null) {
    const name = ROUTES[slug];
    lastSlug = slug;
    U.$$('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== name; });
    U.$$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === slug) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${TITLES[slug]} · Drzewo rodziny`;
    const v = D.views[name];
    if (!mounted.has(name)) { v.mount(U.$(`[data-view="${name}"]`)); mounted.add(name); }
    if (v.show) v.show(param);
    current = name;
  }

  function apply() {
    const r = parse(location.hash);
    if (r.personId) {
      if (!current) showView(lastSlug);
      if (D.profile) D.profile.open(r.personId);
      return;
    }
    if (D.profile) D.profile.close();
    if (ROUTES[r.slug] !== current || r.param) showView(r.slug, r.param);
  }

  D.router = {
    start() { addEventListener('hashchange', apply); apply(); },
    go(hash) { if (location.hash === hash) apply(); else location.hash = hash; },
    back() { D.router.go('#/' + lastSlug); },
    showView,
    get view() { return current; },
    isMounted: (name) => mounted.has(name),
  };
})();
