(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let el, lb = null, items = [], idx = 0, prevFocus = null;

  function ensureLightbox() {
    if (lb) return;
    lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Podgląd zdjęcia');
    lb.innerHTML = U.h`<img alt="">
      <div class="lightbox-bar"><span data-caption></span><a data-profile href="#">Zobacz profil</a><span data-counter class="muted"></span></div>
      <button class="icon-btn lb-close" type="button" aria-label="Zamknij">${U.icon('close')}</button>
      <button class="icon-btn lb-prev" type="button" aria-label="Poprzednie">${U.icon('chev-left')}</button>
      <button class="icon-btn lb-next" type="button" aria-label="Następne">${U.icon('chev-right')}</button>`.toString();
    document.body.append(lb);
    lb.addEventListener('click', (e) => {
      if (e.target.closest('.lb-close') || e.target === lb) close();
      else if (e.target.closest('.lb-prev')) step(-1);
      else if (e.target.closest('.lb-next')) step(1);
      else if (e.target.closest('[data-profile]')) close();
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }
  function paint() {
    const it = items[idx];
    U.$('img', lb).src = it.src;
    U.$('img', lb).alt = it.caption || '';
    U.$('[data-caption]', lb).textContent = it.caption || '';
    const link = U.$('[data-profile]', lb);
    link.hidden = !it.personId;
    if (it.personId) link.href = '#/osoba/' + encodeURIComponent(it.personId);
    U.$('[data-counter]', lb).textContent = items.length > 1 ? `${idx + 1} / ${items.length}` : '';
    U.$('.lb-prev', lb).hidden = U.$('.lb-next', lb).hidden = items.length < 2;
  }
  function step(d) { idx = (idx + d + items.length) % items.length; paint(); }
  function close() { lb.hidden = true; document.body.classList.remove('modal-open'); if (prevFocus) prevFocus.focus({ preventScroll: true }); }
  function open(list, i = 0) {
    ensureLightbox();
    items = list; idx = i; prevFocus = document.activeElement;
    paint();
    lb.hidden = false;
    document.body.classList.add('modal-open');
    U.$('.lb-close', lb).focus();
  }

  function render() {
    const m = D.store.model;
    const list = S.galleryItems(m);
    if (!list.length) { el.innerHTML = U.h`<div class="page-head"><h1>Galeria</h1></div><div class="empty-state"><h2>Brak zdjęć</h2><p>Zdjęcia z MyHeritage pojawią się tu po pobraniu (skrypt <code>scripts/fetch-photos.js</code>).</p></div>`.toString(); return; }
    el.innerHTML = U.h`<div class="page-head"><div><h1>Galeria</h1><p>${U.plural(list.length, 'zdjęcie', 'zdjęcia', 'zdjęć')} z rodzinnego drzewa.</p></div></div>
      <div class="masonry">${list.map((it, i) => U.h`<figure><button type="button" data-i="${i}" aria-label="Powiększ: ${it.title}"><img src="${U.photoSrc(it.url)}" alt="${it.title}" loading="lazy"></button>
        <figcaption><a href="#/osoba/${encodeURIComponent(it.personId)}">${P.displayName(m.people[it.personId])}</a></figcaption></figure>`)}</div>`.toString();
    U.$('.masonry', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      open(list.map((it) => ({ src: U.photoSrc(it.url), caption: it.title, personId: it.personId })), Number(b.dataset.i));
    });
  }

  D.lightbox = { open };
  D.views.gallery = { mount(container) { el = container; render(); }, show() {}, update: () => render() };
})();
