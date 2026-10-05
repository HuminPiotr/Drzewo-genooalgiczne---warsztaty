(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, R = D.relations, S = D.selectors, PL = D.places;
  let panel = null, openId = null;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function ensure() {
    if (panel) return;
    panel = document.createElement('aside');
    panel.className = 'profile';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-labelledby', 'profileName');
    panel.hidden = true;
    document.body.append(panel);
    panel.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && openId && !document.querySelector('.modal-backdrop, .palette-backdrop:not([hidden]), .lightbox:not([hidden])')) D.router.back();
    });
  }

  function facts(m, p) {
    const rank = (e) => (e.date && e.date.sortKey) || (['BIRT', 'CHR', 'BAPM'].includes(e.type) ? 0 : 99999999 + (['DEAT', 'BURI'].includes(e.type) ? 1 : 0));
    const list = p.events.map((e) => ({ e, extra: [] }));
    for (const fid of p.fams) {
      const f = m.families[fid];
      const other = f.husb === p.id ? f.wife : f.husb;
      for (const e of f.events) list.push({ e, extra: other && m.people[other] ? [`z: ${P.displayName(m.people[other])}`] : [] });
    }
    return list.sort((a, b) => rank(a.e) - rank(b.e)).map(({ e, extra }) => ({
      kind: e.type,
      label: S.EVENT_LABEL[e.type] || e.type,
      date: e.date && (e.date.year || e.date.display !== 'nieznana') ? e.date.display : '',
      place: e.place || '',
      placeKey: PL.normalizePlace(e.place),
      extra: [...extra, e.value, e.typeLabel, e.age && `wiek: ${e.age}`, e.cause && `przyczyna: ${e.cause}`, e.note].filter(Boolean).join(' · '),
    }));
  }

  function relGroup(title, rels, m) {
    if (!rels.length) return '';
    return U.h`<h4>${title}</h4><div class="rel-list">${rels.map((r) => {
      const q = m.people[r.id];
      return q ? U.h`<div class="rel-item" data-person="${r.id}" data-family="${r.familyId || ''}" data-rel="${r.rel}">${U.personCard(q, { sub: r.sub || '' })}</div>` : '';
    })}</div>`;
  }

  function render() {
    const m = D.store.model;
    const p = m.people[openId];
    const me = U.prefs.get('me', null);
    const kin = me && me !== p.id && m.people[me] ? R.kinship(m, me, p.id) : null;
    const parents = p.famc.flatMap((fid) => [m.families[fid].husb, m.families[fid].wife].filter(Boolean).map((id) => ({ id, familyId: fid, rel: 'parent' })));
    const spouses = R.spousesOf(m, p.id).map((s) => {
      const marr = m.families[s.familyId].events.find((e) => e.type === 'MARR' && e.date);
      return { id: s.id, familyId: s.familyId, rel: 'spouse', sub: marr ? `ślub ${marr.date.display}` : '' };
    });
    const siblings = R.siblingsOf(m, p.id).map((id) => ({ id, rel: 'sibling' }));
    const children = p.fams.flatMap((fid) => m.families[fid].children.map((id) => ({ id, familyId: fid, rel: 'child' })));
    const fl = facts(m, p);
    const items = [...D.store.items('story'), ...D.store.items('document')].filter((s) => s.personIds.includes(p.id));
    const anyRel = parents.length + spouses.length + siblings.length + children.length;

    panel.className = 'profile';
    panel.innerHTML = U.h`
      <div class="profile-head sex-${p.sex}">
        <button class="icon-btn profile-close" type="button" data-act="close" aria-label="Zamknij profil">${U.icon('close')}</button>
        ${U.avatar(p, 'avatar avatar-xl')}
        <h2 id="profileName">${P.displayName(p)}</h2>
        ${P.maidenName(p) ? U.h`<p class="profile-maiden">z domu ${P.maidenName(p)}</p>` : ''}
        <p class="profile-years">${P.lifespan(p) || 'Brak zapisanych dat'}</p>
        ${kin ? U.h`<p class="kin-badge">${cap(kin)} · dla: ${P.displayName(m.people[me])}</p>` : ''}
        <div class="profile-actions">
          <button class="btn btn-sm" type="button" data-act="center">${U.icon('tree')} Pokaż w drzewie</button>
          <button class="btn btn-sm" type="button" data-act="me" aria-pressed="${me === p.id}">${me === p.id ? 'To ja ✓' : 'To ja'}</button>
          <span data-edit-slot></span>
        </div>
      </div>
      <div class="profile-body">
        <section><h3>Fakty</h3>${fl.length ? U.h`<ol class="facts">${fl.map((f) => U.h`<li class="fact"><span class="fact-label">${f.label}</span>
          <span class="fact-main">${f.date}${f.date && f.place ? ' · ' : ''}${f.place ? U.h`<a href="#/miejsca/${encodeURIComponent(f.placeKey || '')}">${f.place}</a>` : ''}${!f.date && !f.place ? '—' : ''}</span>
          ${f.extra ? U.h`<span class="fact-extra">${f.extra}</span>` : ''}</li>`)}</ol>` : U.h`<p class="muted">Brak zapisanych faktów.</p>`}</section>
        <section data-section="family"><h3>Rodzina</h3>
          ${relGroup('Rodzice', parents, m)}${relGroup('Małżonkowie', spouses, m)}${relGroup('Rodzeństwo', siblings, m)}${relGroup('Dzieci', children, m)}
          ${anyRel ? '' : U.h`<p class="muted">Brak zapisanych relacji.</p>`}
        </section>
        ${p.photos.length ? U.h`<section><h3>Zdjęcia</h3><div class="profile-photos">${p.photos.map((ph, i) => U.h`<button class="profile-photo" type="button" data-photo="${i}" aria-label="Powiększ zdjęcie ${i + 1}"><img src="${U.photoSrc(ph.url)}" alt="" loading="lazy"></button>`)}</div></section>` : ''}
        ${p.memories.length || p.notes.length ? U.h`<section><h3>Wspomnienia i notatki</h3>${p.memories.map((t) => U.h`<blockquote class="memory">${t}</blockquote>`)}${p.notes.map((t) => U.h`<p class="note">${t}</p>`)}</section>` : ''}
        ${items.length ? U.h`<section><h3>Historie i dokumenty</h3><ul class="link-list">${items.map((s) => U.h`<li><a href="#/historie/${encodeURIComponent(s.id)}">${s.title}</a> <span class="muted">${s.date}</span></li>`)}</ul></section>` : ''}
        ${p.sources.length ? U.h`<section><h3>Źródła</h3><ul class="sources">${p.sources.map((s) => { const src = m.sources[s.sourceId]; return U.h`<li>${(src && src.title) || 'Źródło'}${src && src.author ? ` · ${src.author}` : ''}${s.page ? U.h` <span class="muted">(${s.page})</span>` : ''}</li>`; })}</ul></section>` : ''}
      </div>`.toString();
    if (D.edit && D.edit.decorateProfile) D.edit.decorateProfile(panel, p);
  }

  function onClick(e) {
    const b = e.target.closest('[data-act], [data-photo]');
    if (!b) return;
    const p = D.store.model.people[openId];
    if (b.dataset.photo != null && D.lightbox) {
      D.lightbox.open(p.photos.map((ph) => ({ src: U.photoSrc(ph.url), caption: ph.title || P.displayName(p), personId: p.id })), Number(b.dataset.photo));
      return;
    }
    const act = b.dataset.act;
    if (act === 'close') D.router.back();
    if (act === 'center') {
      if (D.router.view !== 'tree') D.router.showView('drzewo');
      U.selection.set(p.id, { center: true });
      if (innerWidth <= 900) D.router.go('#/drzewo');
    }
    if (act === 'me') {
      const me = U.prefs.get('me', null) === p.id ? null : p.id;
      U.prefs.set('me', me);
      render();
      U.toast(me ? `Ustawiono: ${P.displayName(p)} to Ty. Pokrewieństwo liczymy względem tej osoby.` : 'Usunięto punkt startowy.');
    }
  }

  D.profile = {
    open(id) {
      ensure();
      if (!D.store.model.people[id]) { U.toast('Nie znaleziono tej osoby.'); D.router.back(); return; }
      const changed = openId !== id;
      openId = id;
      render();
      panel.hidden = false;
      document.body.classList.add('profile-open');
      if (U.selection.get() !== id) U.selection.set(id, {}); // drzewo samo dosunie osobę, jeśli jest poza ekranem
      if (changed) { panel.scrollTop = 0; U.$('.profile-close', panel).focus({ preventScroll: true }); }
    },
    close() {
      if (!openId) return;
      openId = null;
      panel.hidden = true;
      document.body.classList.remove('profile-open');
      U.selection.set(null);
    },
    refresh() { if (!openId) return; if (!D.store.model.people[openId]) D.router.back(); else render(); },
    get currentId() { return openId; },
  };
})();
