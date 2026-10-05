(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).createStore = api.createStore;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const G = node ? require('./gedcom-parse.js') : root.Drzewo.gedcom;
  const X = node ? require('./gedcom-export.js') : root.Drzewo.gedcomExport;
  const R = node ? require('./relations.js') : root.Drzewo.relations;
  const K_OVERLAY = 'drzewo:overlay:v1';
  const K_BASE = 'drzewo:base:v1';
  const UNDO_MAX = 50;
  const SAME = 'Nie można: to ta sama osoba – samą osobą nie da się połączyć.';
  const CYCLE = 'Nie można: wybrana osoba jest potomkiem tego dziecka.';
  const emptyOverlay = () => ({ people: {}, families: {}, items: {} });

  function createStore({ baseText, storage }) {
    let persistent = !!storage;
    const listeners = new Set();
    const undoStack = [];

    function read(key) {
      if (!storage) return null;
      try { return storage.getItem(key); } catch { persistent = false; return null; }
    }
    function write(key, value) {
      if (!storage) return;
      try { value == null ? storage.removeItem(key) : storage.setItem(key, value); }
      catch { persistent = false; emit({ type: 'storage-error' }); }
    }

    let importedText = read(K_BASE);
    let base;
    try { base = G.parseGedcom(importedText || baseText); }
    catch { importedText = null; base = G.parseGedcom(baseText); } // uszkodzony zapisany import – wróć do pliku
    let overlay = (() => { try { return { ...emptyOverlay(), ...JSON.parse(read(K_OVERLAY) || '{}') }; } catch { return emptyOverlay(); } })();
    let model = compute();

    function compute() {
      const m = structuredClone(base);
      for (const [id, p] of Object.entries(overlay.people)) { if (p === null) delete m.people[id]; else m.people[id] = structuredClone(p); }
      for (const [id, f] of Object.entries(overlay.families)) { if (f === null) delete m.families[id]; else m.families[id] = structuredClone(f); }
      return G.finalizeModel(m);
    }
    function emit(change) { for (const fn of listeners) fn(model, change); }
    function commit(type, mutate) {
      const snapshot = JSON.stringify(overlay);
      mutate();
      undoStack.push(snapshot);
      if (undoStack.length > UNDO_MAX) undoStack.shift();
      model = compute();
      write(K_OVERLAY, JSON.stringify(overlay));
      emit({ type });
    }
    const putPerson = (p) => { overlay.people[p.id] = structuredClone({ ...p, famc: [], fams: [] }); };
    const putFamily = (f) => { overlay.families[f.id] = structuredClone(f); };
    const role = (p) => (p.sex === 'F' ? 'wife' : 'husb');
    function must(id) { const p = model.people[id]; if (!p) throw new Error('Nie znaleziono osoby.'); return p; }

    function newId(prefix) {
      const taken = (id) => model.people[id] || model.families[id] || overlay.items[id];
      if (prefix === 'I' || prefix === 'F') {
        let n = 900001; while (taken(prefix + n)) n++; return prefix + n;
      }
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const api = {
      get model() { return model; },
      get canUndo() { return undoStack.length > 0; },
      get hasChanges() { return !!importedText || Object.keys(overlay.people).length + Object.keys(overlay.families).length + Object.keys(overlay.items).length > 0; },
      get persistent() { return persistent; },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      newId,

      savePerson(p) { commit('person', () => putPerson(p)); },
      deletePerson(id) {
        must(id);
        commit('person', () => {
          overlay.people[id] = null;
          for (const f of Object.values(model.families)) {
            if (f.husb !== id && f.wife !== id && !f.children.includes(id)) continue;
            putFamily({ ...f, husb: f.husb === id ? null : f.husb, wife: f.wife === id ? null : f.wife, children: f.children.filter((c) => c !== id) });
          }
        });
      },
      saveFamily(f) { commit('family', () => putFamily(f)); },
      deleteFamily(id) { commit('family', () => { overlay.families[id] = null; }); },

      linkParent(childId, parentId) {
        if (childId === parentId) throw new Error(SAME);
        must(childId); const parent = must(parentId);
        if (R.descendantsOf(model, childId).has(parentId)) throw new Error(CYCLE);
        const slot = role(parent);
        const existing = model.people[childId].famc.map((f) => model.families[f]).find((f) => !f[slot]);
        commit('family', () => {
          if (existing) putFamily({ ...existing, [slot]: parentId });
          else putFamily({ id: newId('F'), husb: null, wife: null, [slot]: parentId, children: [childId], events: [], notes: [] });
        });
      },
      linkSpouse(aId, bId) {
        if (aId === bId) throw new Error(SAME);
        const a = must(aId), b = must(bId);
        const same = a.fams.map((f) => model.families[f]).find((f) => [f.husb, f.wife].includes(bId));
        if (same) return same.id;
        const [h, w] = role(a) === 'wife' || (role(a) === role(b) && a.sex === 'F') ? [b, a] : [a, b];
        const open = h.fams.map((f) => model.families[f]).find((f) => !f.wife)
          || w.fams.map((f) => model.families[f]).find((f) => !f.husb);
        const fam = open ? { ...open, husb: h.id, wife: w.id } : { id: newId('F'), husb: h.id, wife: w.id, children: [], events: [], notes: [] };
        commit('family', () => putFamily(fam));
        return fam.id;
      },
      linkChild(parentId, childId, spouseId = null) {
        if (childId === parentId) throw new Error(SAME);
        must(childId); must(parentId);
        if (R.descendantsOf(model, childId).has(parentId)) throw new Error(CYCLE);
        const fams = () => model.people[parentId].fams.map((f) => model.families[f]);
        let target = spouseId ? fams().find((f) => [f.husb, f.wife].includes(spouseId)) : (fams().length === 1 ? fams()[0] : null);
        if (!target && spouseId) target = model.families[api.linkSpouse(parentId, spouseId)];
        if (!target) return api.linkParent(childId, parentId);
        if (target.children.includes(childId)) return;
        commit('family', () => putFamily({ ...target, children: [...target.children, childId] }));
      },
      unlink(familyId, personId) {
        const f = model.families[familyId]; if (!f) return;
        commit('family', () => putFamily({ ...f, husb: f.husb === personId ? null : f.husb, wife: f.wife === personId ? null : f.wife, children: f.children.filter((c) => c !== personId) }));
      },

      items(kind) { return Object.values(overlay.items).filter((x) => x && x.kind === kind).sort((a, b) => b.created - a.created); },
      saveItem(item) { commit('item', () => { overlay.items[item.id] = structuredClone(item); }); },
      deleteItem(id) { commit('item', () => { delete overlay.items[id]; }); },

      undo() {
        if (!undoStack.length) return false;
        overlay = JSON.parse(undoStack.pop());
        model = compute(); write(K_OVERLAY, JSON.stringify(overlay)); emit({ type: 'undo' });
        return true;
      },
      importGedcom(text) {
        const parsed = G.parseGedcom(text); // rzuca czytelny błąd
        importedText = text; base = parsed;
        model = compute(); write(K_BASE, text); emit({ type: 'import' });
      },
      resetToFile() {
        importedText = null; base = G.parseGedcom(baseText); overlay = emptyOverlay(); undoStack.length = 0;
        model = compute(); write(K_BASE, null); write(K_OVERLAY, null); emit({ type: 'reset' });
      },
      exportGedcom() { return X.toGedcom(model); },
      exportJson() { return JSON.stringify({ format: 'drzewo-json', version: 1, baseText: importedText, overlay }, null, 1); },
      importJson(text) {
        let data; try { data = JSON.parse(text); } catch { data = null; }
        if (!data || data.format !== 'drzewo-json' || !data.overlay) throw new Error('To nie jest kopią danych z tej aplikacji.');
        const newBase = G.parseGedcom(data.baseText || baseText);
        commit('import', () => {
          importedText = data.baseText || null; base = newBase;
          overlay = { ...emptyOverlay(), ...data.overlay };
          write(K_BASE, importedText);
        });
      },
    };
    return api;
  }

  return { createStore };
});
