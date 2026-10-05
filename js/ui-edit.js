(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, R = D.relations, DT = D.date;
  let active = false, bannerDismissed = false, banner;
  const REL_WORD = { parent: 'rodzica', spouse: 'małżonka', child: 'dziecko' };
  const today = () => new Date().toISOString().slice(0, 10);
  const isTyping = () => { const a = document.activeElement; return a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable); };

  function init() {
    U.$('#editSlot').innerHTML = U.h`
      <button class="btn btn-sm" id="editToggle" type="button" aria-pressed="false">${U.icon('edit')}<span class="edit-label">Edytuj</span></button>
      <button class="icon-btn" id="undoBtn" type="button" aria-label="Cofnij ostatnią zmianę" title="Cofnij (Ctrl+Z)" hidden>${U.icon('undo')}</button>
      <div class="menu-wrap">
        <button class="icon-btn" id="dataMenuBtn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="dataMenu" aria-label="Dane: import i eksport">${U.icon('more')}</button>
        <div class="menu" id="dataMenu" role="menu" hidden>
          <button role="menuitem" type="button" data-cmd="export-ged">${U.icon('download')} Eksportuj GEDCOM</button>
          <button role="menuitem" type="button" data-cmd="export-json">${U.icon('download')} Eksportuj kopię (JSON)</button>
          <button role="menuitem" type="button" data-cmd="import-ged">${U.icon('upload')} Importuj GEDCOM…</button>
          <button role="menuitem" type="button" data-cmd="import-json">${U.icon('upload')} Wczytaj kopię (JSON)…</button>
          <hr>
          <button role="menuitem" type="button" data-cmd="reset" class="danger-text">${U.icon('trash')} Przywróć dane z pliku…</button>
        </div>
      </div>
      <input type="file" id="fileInput" hidden>`.toString();

    U.$('#editToggle').addEventListener('click', () => setActive(!active));
    U.$('#undoBtn').addEventListener('click', undo);
    const btn = U.$('#dataMenuBtn'), menu = U.$('#dataMenu');
    const closeMenu = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) U.$('button', menu).focus(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); btn.focus(); } });
    menu.addEventListener('click', (e) => { const c = e.target.closest('[data-cmd]'); if (c) { closeMenu(); command(c.dataset.cmd); } });

    banner = document.createElement('div');
    banner.className = 'changes-banner';
    banner.setAttribute('role', 'status');
    banner.hidden = true;
    banner.innerHTML = U.h`<p>Zmiany są zapisane tylko w tej przeglądarce. Wyeksportuj kopię, żeby ich nie stracić.</p>
      <button class="btn btn-sm btn-primary" type="button" data-cmd="export-json">Eksportuj kopię</button>
      <button class="btn btn-sm" type="button" data-cmd="dismiss">Ukryj</button>`.toString();
    banner.addEventListener('click', (e) => { const c = e.target.closest('[data-cmd]'); if (!c) return; if (c.dataset.cmd === 'dismiss') { bannerDismissed = true; updateChrome(); } else command(c.dataset.cmd); });
    document.body.append(banner);

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && active && !isTyping()) { e.preventDefault(); undo(); }
    });
    document.addEventListener('click', onEditClick);
    D.store.subscribe((m, c) => { if (['person', 'family', 'item', 'import', 'undo'].includes(c.type)) bannerDismissed = false; updateChrome(); });
    updateChrome();
  }

  function setActive(on) {
    active = on;
    document.body.classList.toggle('editing', on);
    U.$('#editToggle').setAttribute('aria-pressed', String(on));
    U.$('#editToggle .edit-label').textContent = on ? 'Zakończ edycję' : 'Edytuj';
    updateChrome();
    renderPeopleAdd();
    document.dispatchEvent(new Event('drzewo:editing'));
    if (D.profile) D.profile.refresh();
    U.toast(on ? 'Tryb edycji włączony. Zmiany zapisują się w tej przeglądarce.' : 'Tryb edycji wyłączony.');
  }
  function updateChrome() {
    U.$('#undoBtn').hidden = !(active && D.store.canUndo);
    banner.hidden = !D.store.hasChanges || bannerDismissed;
  }
  function undo() { U.toast(D.store.undo() ? 'Cofnięto ostatnią zmianę.' : 'Nie ma czego cofać.'); }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const input = U.$('#fileInput');
      input.value = '';
      input.accept = accept;
      input.onchange = async () => { const f = input.files[0]; resolve(f ? await f.text() : null); };
      input.click();
    });
  }
  async function command(cmd) {
    const S = D.store;
    try {
      if (cmd === 'export-ged') { U.download(`drzewo-${today()}.ged`, S.exportGedcom()); U.toast('Zapisano plik GEDCOM – można go wczytać np. do MyHeritage.'); }
      if (cmd === 'export-json') { U.download(`drzewo-kopia-${today()}.json`, S.exportJson(), 'application/json'); bannerDismissed = true; updateChrome(); U.toast('Kopia zapisana. Załączone skany nie wchodzą do kopii.'); }
      if (cmd === 'import-ged') {
        const text = await pickFile('.ged,text/plain');
        if (!text) return;
        if (!(await D.modal.confirm('Wczytać ten plik GEDCOM jako nowe dane drzewa? Twoje lokalne zmiany zostaną nałożone na nowe dane.', { ok: 'Wczytaj' }))) return;
        S.importGedcom(text);
        U.toast(`Wczytano: ${U.plural(Object.keys(S.model.people).length, 'osoba', 'osoby', 'osób')}.`);
      }
      if (cmd === 'import-json') {
        const text = await pickFile('.json,application/json');
        if (!text) return;
        if (!(await D.modal.confirm('Wczytać kopię? Zastąpi bieżące zmiany w tej przeglądarce.', { ok: 'Wczytaj' }))) return;
        S.importJson(text);
        U.toast('Wczytano kopię.');
      }
      if (cmd === 'reset') {
        if (!(await D.modal.confirm('Przywrócić dane z pliku data/rodzina.js? Wszystkie zmiany, historie i import z tej przeglądarki zostaną usunięte. Najpierw wyeksportuj kopię, jeśli chcesz je zachować.', { title: 'Przywrócić dane z pliku?', ok: 'Przywróć', danger: true }))) return;
        S.resetToFile();
        U.toast('Przywrócono dane z pliku.');
      }
    } catch (err) {
      U.toast(err.message, { timeout: 8000 });
    }
  }

  function renderPeopleAdd() {
    const slot = document.querySelector('[data-view="people"] [data-edit-add]');
    if (slot) slot.innerHTML = active ? U.h`<button class="btn btn-primary" type="button" data-edit-act="new-person">${U.icon('plus')} Dodaj osobę</button>`.toString() : '';
  }

  function decorateProfile(panel, p) {
    if (!active) return;
    U.$('[data-edit-slot]', panel).innerHTML = U.h`
      <button class="btn btn-sm btn-primary" type="button" data-edit-act="edit">${U.icon('edit')} Edytuj</button>
      <button class="btn btn-sm btn-danger" type="button" data-edit-act="delete">${U.icon('trash')} Usuń</button>`.toString();
    const fam = U.$('[data-section="family"]', panel);
    fam.insertAdjacentHTML('beforeend', U.h`<div class="rel-add">
      <button class="btn btn-sm" type="button" data-edit-act="add" data-kind="parent">${U.icon('plus')} Rodzic</button>
      <button class="btn btn-sm" type="button" data-edit-act="add" data-kind="spouse">${U.icon('plus')} Małżonek</button>
      <button class="btn btn-sm" type="button" data-edit-act="add" data-kind="child">${U.icon('plus')} Dziecko</button></div>`.toString());
    U.$$('.rel-item', fam).forEach((it) => {
      if (!it.dataset.family || it.dataset.rel === 'sibling') return;
      it.insertAdjacentHTML('beforeend', U.h`<button class="icon-btn rel-unlink" type="button" data-edit-act="unlink" title="Odłącz relację" aria-label="Odłącz relację">${U.icon('link')}</button>`.toString());
    });
  }

  async function onEditClick(e) {
    const b = e.target.closest('[data-edit-act]');
    if (!b || !active) return;
    e.preventDefault();
    e.stopPropagation();
    const S = D.store, m = S.model;
    const p = D.profile && D.profile.currentId ? m.people[D.profile.currentId] : null;
    const act = b.dataset.editAct;
    try {
      if (act === 'new-person') {
        const np = await personForm(null, { title: 'Nowa osoba' });
        if (np) { S.savePerson(np); D.router.go('#/osoba/' + encodeURIComponent(np.id)); U.toast('Dodano osobę.'); }
      }
      if (!p) return;
      if (act === 'edit') {
        const np = await personForm(p, { title: 'Edytuj osobę' });
        if (np) { S.savePerson(np); U.toast('Zapisano zmiany.', { actionLabel: 'Cofnij', onAction: () => S.undo() }); }
      }
      if (act === 'delete') {
        if (!(await D.modal.confirm(`Usunąć ${P.displayName(p)} z drzewa? Powiązania z tą osobą zostaną odłączone.`, { title: 'Usunąć osobę?', ok: 'Usuń', danger: true }))) return;
        S.deletePerson(p.id);
        D.router.back();
        U.toast('Usunięto osobę.', { actionLabel: 'Cofnij', onAction: () => S.undo() });
      }
      if (act === 'unlink') {
        const it = b.closest('.rel-item');
        const other = m.people[it.dataset.person];
        if (!(await D.modal.confirm(`Odłączyć ${P.displayName(other)} od ${P.displayName(p)}? Osoba zostanie w drzewie.`, { ok: 'Odłącz' }))) return;
        S.unlink(it.dataset.family, other.id);
        U.toast('Odłączono.', { actionLabel: 'Cofnij', onAction: () => S.undo() });
      }
      if (act === 'add') await addRelation(p, b.dataset.kind);
    } catch (err) {
      U.toast(err.message, { timeout: 8000 });
    }
  }

  async function addRelation(p, kind) {
    const S = D.store;
    const how = await D.modal.open({
      title: `Dodaj ${REL_WORD[kind]}`,
      body: U.h`<p>Dla: <strong>${P.displayName(p)}</strong>. Wybierz osobę, która jest już w drzewie, albo dodaj nową.</p>`,
      actions: [{ label: 'Wybierz z drzewa', value: 'existing' }, { label: 'Nowa osoba', value: 'new', kind: 'primary' }],
    });
    if (!how) return;
    let id = null;
    if (how === 'existing') id = await D.search.pickPerson({ title: `Wybierz ${REL_WORD[kind]} dla: ${P.displayName(p)}`, exclude: [p.id] });
    else {
      const prefill = kind === 'spouse' ? { sex: p.sex === 'M' ? 'F' : p.sex === 'F' ? 'M' : 'U' }
        : kind === 'child' ? { surname: p.sex === 'F' ? (p.marriedName || p.surname) : p.surname }
        : { surname: p.surname };
      const np = await personForm(null, { prefill, title: `Nowa osoba – ${REL_WORD[kind]}` });
      if (np) { S.savePerson(np); id = np.id; }
    }
    if (!id) return;
    if (kind === 'parent') S.linkParent(p.id, id);
    if (kind === 'spouse') S.linkSpouse(p.id, id);
    if (kind === 'child') {
      const spouses = R.spousesOf(S.model, p.id);
      let spouseId = spouses.length === 1 ? spouses[0].id : null;
      if (spouses.length > 1) {
        spouseId = await D.modal.open({
          title: 'Z kim?',
          body: U.h`<p>Wybierz drugiego rodzica dziecka.</p>`,
          actions: [...spouses.map((s) => ({ label: P.displayName(S.model.people[s.id]), value: s.id })), { label: 'Bez drugiego rodzica', value: '' }],
        });
        if (spouseId === null) return;
      }
      S.linkChild(p.id, id, spouseId || null);
    }
    U.toast('Dodano relację.', { actionLabel: 'Cofnij', onAction: () => S.undo() });
  }

  const emptyEvent = (type) => ({ type, date: null, place: null, note: null, age: null, cause: null, value: null, typeLabel: null });
  function setEvent(events, type, { date, place, value }) {
    const i = events.findIndex((e) => e.type === type);
    if (!date && !place && !value) { if (i >= 0) events.splice(i, 1); return; }
    const next = { ...(i >= 0 ? events[i] : emptyEvent(type)), date, place: place || null, ...(value !== undefined ? { value: value || null } : {}) };
    if (i >= 0) events[i] = next; else events.push(next);
  }
  const paras = (t) => t.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

  function personForm(p, { prefill = {}, title }) {
    const base = p ? structuredClone(p) : { id: D.store.newId('I'), given: '', surname: '', marriedName: null, sex: 'U', events: [], photos: [], sources: [], notes: [], memories: [], deceased: false, famc: [], fams: [], ...prefill };
    const ev = (t) => base.events.find((e) => e.type === t) || null;
    const b = ev('BIRT'), d = ev('DEAT'), bu = ev('BURI');
    const dateField = (name, label, e) => U.h`<label class="field"><span>${label}</span>
      <input class="input" name="${name}" value="${DT.toUserInput(e && e.date)}" placeholder="np. 12.03.1901, 1901, ok. 1900" data-date>
      <small class="date-preview" aria-live="polite"></small></label>`;
    return D.modal.open({
      title,
      body: U.h`<form class="form-grid" onsubmit="return false">
        <label class="field"><span>Imię *</span><input class="input" name="given" value="${base.given}" autocomplete="off"></label>
        <label class="field"><span>Płeć</span><select class="select" name="sex">
          ${[['M', 'Mężczyzna'], ['F', 'Kobieta'], ['U', 'Nieznana']].map(([v, l]) => U.h`<option value="${v}" ${U.raw(base.sex === v ? 'selected' : '')}>${l}</option>`)}</select></label>
        <label class="field"><span>Nazwisko rodowe</span><input class="input" name="surname" value="${base.surname}"></label>
        <label class="field"><span>Nazwisko po ślubie</span><input class="input" name="marriedName" value="${base.marriedName || ''}"></label>
        ${dateField('birthDate', 'Data urodzenia', b)}
        <label class="field"><span>Miejsce urodzenia</span><input class="input" name="birthPlace" value="${(b && b.place) || ''}"></label>
        <label class="field full" style="flex-direction:row;align-items:center;gap:10px"><input type="checkbox" name="deceased" ${U.raw(base.deceased ? 'checked' : '')}> <span>Osoba nie żyje</span></label>
        ${dateField('deathDate', 'Data śmierci', d)}
        <label class="field"><span>Miejsce śmierci</span><input class="input" name="deathPlace" value="${(d && d.place) || ''}"></label>
        <label class="field"><span>Miejsce pochówku</span><input class="input" name="burialPlace" value="${(bu && bu.place) || ''}"></label>
        <label class="field"><span>Zawód</span><input class="input" name="occupation" value="${P.occupation(base) || ''}"></label>
        <label class="field full"><span>Wspomnienia rodzinne</span><textarea class="input" name="memories" rows="4" placeholder="Każde wspomnienie oddziel pustą linią.">${base.memories.join('\n\n')}</textarea></label>
        <label class="field full"><span>Notatki</span><textarea class="input" name="notes" rows="3">${base.notes.join('\n\n')}</textarea></label>
      </form>`,
      actions: [{ label: 'Anuluj', value: null }, { label: 'Zapisz', value: 'save', kind: 'primary' }],
      onMount(w) {
        U.$$('[data-date]', w).forEach((inp) => {
          const show = () => {
            const out = inp.parentElement.querySelector('.date-preview');
            const g = DT.fromUserInput(inp.value);
            const dt = DT.parseDate(g);
            out.textContent = !g ? '' : dt && dt.year ? `→ ${dt.display}` : 'Nie rozpoznano daty – zostanie zapisana jako tekst.';
          };
          inp.addEventListener('input', show);
          show();
        });
      },
      onAction(value, w) {
        const f = (n) => U.$(`[name="${n}"]`, w);
        const val = (n) => f(n).value.trim();
        if (!val('given') && !val('surname')) { f('given').focus(); U.toast('Podaj imię lub nazwisko.'); return false; }
        const out = structuredClone(base);
        out.given = val('given');
        out.surname = val('surname');
        out.marriedName = val('marriedName') || null;
        out.sex = f('sex').value;
        const date = (n) => DT.parseDate(DT.fromUserInput(val(n)));
        setEvent(out.events, 'BIRT', { date: date('birthDate'), place: val('birthPlace') });
        setEvent(out.events, 'DEAT', { date: date('deathDate'), place: val('deathPlace') });
        setEvent(out.events, 'BURI', { date: bu ? bu.date : null, place: val('burialPlace') });
        setEvent(out.events, 'OCCU', { date: null, place: null, value: val('occupation') });
        out.deceased = f('deceased').checked || out.events.some((e) => e.type === 'DEAT' || e.type === 'BURI');
        out.memories = paras(f('memories').value);
        out.notes = paras(f('notes').value);
        return out;
      },
    });
  }

  D.edit = { init, get active() { return active; }, decorateProfile, renderPeopleAdd, personForm };
})();
