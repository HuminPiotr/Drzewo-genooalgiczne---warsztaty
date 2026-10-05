(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  const MAX_FILE = 15 * 1024 * 1024;
  let el, tab = 'story';
  const urls = new Map(); // fileKey → objectURL

  async function fileUrl(key) {
    if (!key) return null;
    if (urls.has(key)) return urls.get(key);
    try { const b = await D.filesDb.get(key); if (!b) return null; const u = URL.createObjectURL(b); urls.set(key, u); return u; } catch { return null; }
  }

  function mount(container) {
    el = container;
    el.addEventListener('click', onClick);
    render();
  }

  function render() {
    const items = D.store.items(tab);
    const editing = document.body.classList.contains('editing');
    const noun = tab === 'story' ? 'historię' : 'dokument';
    el.innerHTML = U.h`<div class="page-head"><div><h1>Historie i dokumenty</h1><p>Rodzinne opowieści, wspomnienia i skany dokumentów.</p></div>
        ${editing ? U.h`<button class="btn btn-primary" type="button" data-act="add">${U.icon('plus')} Dodaj ${noun}</button>` : ''}</div>
      <div class="tabs" role="tablist">
        <button role="tab" type="button" data-tab="story" aria-selected="${tab === 'story'}">Historie</button>
        <button role="tab" type="button" data-tab="document" aria-selected="${tab === 'document'}">Dokumenty</button></div>
      ${items.length ? U.h`<div class="story-grid">${items.map((s) => U.h`<button class="story-card" type="button" data-open="${s.id}">
          ${s.fileKey && (s.fileType || '').startsWith('image/') ? U.h`<img class="story-thumb" data-file="${s.fileKey}" alt="">` : ''}
          <span class="muted">${[s.date, s.fileName].filter(Boolean).join(' · ')}</span><h3>${s.title}</h3>${s.body ? U.h`<p>${s.body}</p>` : ''}</button>`)}</div>`
        : U.h`<div class="empty-state"><h2>${tab === 'story' ? 'Nie ma jeszcze historii' : 'Nie ma jeszcze dokumentów'}</h2>
          <p>${tab === 'story' ? 'Zapiszcie wspomnienia, anegdoty i opowieści dziadków, zanim umkną.' : 'Dodaj skan aktu, świadectwa albo listu i połącz go z osobami.'}</p>
          ${editing ? U.h`<button class="btn btn-primary" type="button" data-act="add">${U.icon('plus')} Dodaj pierwszą ${noun}</button>` : U.h`<p class="muted">Włącz „Edytuj” w górnym pasku, aby dodać.</p>`}</div>`}
      ${tab === 'document' ? treeDocs() : ''}`.toString();
    U.$$('img[data-file]', el).forEach(async (img) => { const u = await fileUrl(img.dataset.file); if (u) img.src = u; else img.remove(); });
  }

  function treeDocs() {
    const { acts, sources } = S.documentsFromTree(D.store.model);
    const m = D.store.model;
    const who = (ids) => ids.map((id) => m.people[id]).filter(Boolean).map((p) => U.h`<a href="#/osoba/${encodeURIComponent(p.id)}">${P.displayName(p)}</a>`)
      .reduce((a, x, i) => (i ? U.h`${a}, ${x}` : x), '');
    return U.h`<section class="tree-docs"><h2>Akty zapisane w drzewie</h2><p class="muted">Numery aktów i źródła z eksportu MyHeritage.</p>
      ${acts.map((a) => U.h`<div class="doc-row"><span class="muted">${a.date ? a.date.display : 'bez daty'}</span><span><strong>${a.title}</strong> · ${a.kind}${a.place ? ` · ${a.place}` : ''}<br>${who(a.personIds)}</span></div>`)}
      ${sources.map((s) => U.h`<div class="doc-row"><span class="muted">Źródło</span><span><strong>${s.title || 'Źródło'}</strong>${s.author ? ` · ${s.author}` : ''}<br><span class="muted">${s.text || ''} · cytowane przy ${U.plural(s.personIds.length, 'osobie', 'osobach', 'osobach')}</span></span></div>`)}
    </section>`;
  }

  async function openItem(id) {
    const s = D.store.items('story').concat(D.store.items('document')).find((x) => x.id === id);
    if (!s) return;
    const m = D.store.model;
    const url = await fileUrl(s.fileKey);
    const editing = document.body.classList.contains('editing');
    const isImg = (s.fileType || '').startsWith('image/');
    const res = await D.modal.open({
      title: s.title,
      body: U.h`<p class="muted">${s.date || ''}</p>
        ${url && isImg ? U.h`<img src="${url}" alt="">` : ''}
        ${url && !isImg ? U.h`<p><a class="btn" href="${url}" target="_blank" rel="noopener" download="${s.fileName || 'plik'}">${U.icon('download')} Otwórz ${s.fileName || 'plik'}</a></p>` : ''}
        ${s.fileKey && !url ? U.h`<p class="muted">Plik nie jest dostępny w tej przeglądarce.</p>` : ''}
        <div class="story-read">${s.body}</div>
        ${s.personIds.length ? U.h`<h4>Osoby</h4><div class="rel-list">${s.personIds.map((pid) => m.people[pid]).filter(Boolean).map((p) => U.personCard(p))}</div>` : ''}`,
      actions: editing ? [{ label: 'Usuń', value: 'delete', kind: 'danger' }, { label: 'Edytuj', value: 'edit' }, { label: 'Zamknij', value: null, kind: 'primary' }]
        : [{ label: 'Zamknij', value: null, kind: 'primary' }],
    });
    if (res === 'edit') editItem(s.kind, s);
    if (res === 'delete' && await D.modal.confirm(`Usunąć „${s.title}”?`, { ok: 'Usuń', danger: true })) {
      if (s.fileKey) D.filesDb.del(s.fileKey).catch(() => {});
      D.store.deleteItem(s.id);
      U.toast('Usunięto.', { actionLabel: 'Cofnij', onAction: () => D.store.undo() });
    }
  }

  async function editItem(kind, item) {
    const m = D.store.model;
    let personIds = item ? [...item.personIds] : [];
    let file = null;
    const chips = () => U.h`${personIds.map((id) => m.people[id]).filter(Boolean).map((p) => U.h`<span class="person-chip">${P.displayName(p)}<button type="button" data-remove="${p.id}" aria-label="Usuń ${P.displayName(p)}">${U.icon('close')}</button></span>`)}`;
    const res = await D.modal.open({
      title: item ? 'Edytuj' : kind === 'story' ? 'Nowa historia' : 'Nowy dokument',
      body: U.h`<form class="form-grid" onsubmit="return false">
        <label class="field full"><span>Tytuł *</span><input class="input" name="title" required value="${item ? item.title : ''}"></label>
        <label class="field"><span>Data lub okres</span><input class="input" name="date" placeholder="np. lato 1938" value="${item ? item.date : ''}"></label>
        <label class="field"><span>${kind === 'story' ? 'Zdjęcie (opcjonalnie)' : 'Skan / plik'}</span><input class="input" type="file" name="file" accept="image/*,application/pdf" ${D.filesDb.available ? '' : 'disabled'}>
          <small>${item && item.fileName ? `Obecnie: ${item.fileName}. ` : ''}Do 15 MB. Pliki zostają w tej przeglądarce i nie trafiają do eksportu.</small></label>
        <label class="field full"><span>${kind === 'story' ? 'Opowieść' : 'Opis'}</span><textarea class="input" name="body" rows="8">${item ? item.body : ''}</textarea></label>
        <div class="field full"><span>Powiązane osoby</span><div class="person-chips" data-chips>${chips()}</div>
          <button class="btn btn-sm" type="button" data-add-person style="justify-self:start">${U.icon('plus')} Dodaj osobę</button></div></form>`,
      actions: [{ label: 'Anuluj', value: null }, { label: 'Zapisz', value: 'save', kind: 'primary' }],
      onMount(w) {
        w.addEventListener('click', async (e) => {
          const rm = e.target.closest('[data-remove]');
          if (rm) { personIds = personIds.filter((x) => x !== rm.dataset.remove); U.$('[data-chips]', w).innerHTML = chips().toString(); }
          if (e.target.closest('[data-add-person]')) {
            const id = await D.search.pickPerson({ title: 'Kogo dotyczy?', exclude: personIds });
            if (id) { personIds.push(id); U.$('[data-chips]', w).innerHTML = chips().toString(); }
          }
        });
        U.$('[name="file"]', w).addEventListener('change', (e) => { file = e.target.files[0] || null; });
      },
      onAction(value, w) {
        const title = U.$('[name="title"]', w).value.trim();
        if (!title) { U.$('[name="title"]', w).focus(); U.toast('Podaj tytuł.'); return false; }
        if (file && file.size > MAX_FILE) { U.toast('Plik jest większy niż 15 MB.'); return false; }
        return { title, date: U.$('[name="date"]', w).value.trim(), body: U.$('[name="body"]', w).value.trim() };
      },
    });
    if (!res || typeof res !== 'object') return;
    const id = item ? item.id : D.store.newId(kind === 'story' ? 'story' : 'doc');
    let { fileKey = null, fileName = null, fileType = null } = item || {};
    if (file) {
      try {
        const key = 'file-' + id + '-' + Date.now();
        await D.filesDb.put(key, file);
        if (fileKey) D.filesDb.del(fileKey).catch(() => {});
        fileKey = key; fileName = file.name; fileType = file.type;
      } catch { U.toast('Nie udało się zapisać pliku w przeglądarce – zapisuję bez pliku.'); }
    }
    D.store.saveItem({ id, kind, title: res.title, date: res.date, body: res.body, personIds, fileKey, fileName, fileType, created: item ? item.created : Date.now() });
    U.toast(item ? 'Zapisano zmiany.' : 'Dodano.');
  }

  function onClick(e) {
    const t = e.target.closest('[data-tab], [data-open], [data-act="add"]');
    if (!t) return;
    if (t.dataset.tab) { tab = t.dataset.tab; render(); }
    if (t.dataset.open) openItem(t.dataset.open);
    if (t.dataset.act === 'add') editItem(tab, null);
  }

  D.stories = { editItem };
  D.views.stories = {
    mount,
    show(param) { if (param) { const s = D.store.items('story').concat(D.store.items('document')).find((x) => x.id === param); if (s) { tab = s.kind; render(); openItem(s.id); } } },
    update: () => render(),
  };
  document.addEventListener('drzewo:editing', () => { if (el) render(); });
})();
