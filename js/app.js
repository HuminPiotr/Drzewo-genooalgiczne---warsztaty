(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util;

  function safeLocalStorage() {
    try { const k = 'drzewo:test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { return null; }
  }
  function showFatal(err) {
    U.$('#app-main').innerHTML = U.h`<div class="empty-state"><h2>Nie udało się wczytać drzewa</h2><p>${err.message}</p>
      <p class="muted">Sprawdź, czy istnieje plik <code>data/rodzina.js</code> – utworzysz go poleceniem <code>node scripts/build-data.js</code>.</p></div>`.toString();
  }
  function isDark() {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    document.dispatchEvent(new CustomEvent('drzewo:theme'));
  }

  function start() {
    applyTheme(U.prefs.get('theme', 'auto'));
    let store;
    try { store = D.createStore({ baseText: window.DRZEWO_GEDCOM || '', storage: safeLocalStorage() }); }
    catch (err) { showFatal(err); return; }
    D.store = store;
    store.subscribe((model, change) => {
      if (change.type === 'storage-error') { U.toast('Nie udało się zapisać zmian w przeglądarce. Wyeksportuj kopię, zanim zamkniesz kartę.', { timeout: 8000 }); return; }
      for (const [name, v] of Object.entries(D.views)) if (D.router.isMounted(name) && v.update) v.update(model, change);
      if (D.profile && D.profile.refresh) D.profile.refresh();
    });
    U.$('#themeToggle').addEventListener('click', () => { const t = isDark() ? 'light' : 'dark'; U.prefs.set('theme', t); applyTheme(t); });
    for (const mod of [D.search, D.edit]) if (mod && mod.init) mod.init();
    if (!store.persistent) U.toast('Przeglądarka blokuje zapis – zmiany będą widoczne tylko do zamknięcia karty.', { timeout: 8000 });
    D.router.start();
  }

  document.addEventListener('DOMContentLoaded', start);
  D.isDark = isDark;
})();
