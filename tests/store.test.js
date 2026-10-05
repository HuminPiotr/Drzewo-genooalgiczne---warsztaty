const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../js/store.js');
const { miniGedcom } = require('./helpers');

function memStorage() {
  const d = new Map();
  return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k) };
}
const mk = (storage = memStorage()) => createStore({ baseText: miniGedcom(), storage });

test('model bazowy i brak zmian na starcie', () => {
  const s = mk();
  assert.equal(Object.keys(s.model.people).length, 15);
  assert.equal(s.hasChanges, false); assert.equal(s.canUndo, false); assert.equal(s.persistent, true);
});

test('savePerson zapisuje i przetrwa ponowne utworzenie store', () => {
  const st = memStorage();
  const s = mk(st);
  s.savePerson({ ...s.model.people.I1, given: 'Adaś' });
  assert.equal(s.model.people.I1.given, 'Adaś');
  assert.equal(mk(st).model.people.I1.given, 'Adaś');
  assert.equal(s.hasChanges, true);
});

test('subscribe dostaje powiadomienie', () => {
  const s = mk(); let n = 0;
  const off = s.subscribe(() => n++);
  s.savePerson({ ...s.model.people.I1, given: 'X' }); off(); s.savePerson({ ...s.model.people.I1, given: 'Y' });
  assert.equal(n, 1);
});

test('nowa osoba + linkParent tworzy lub uzupełnia rodzinę', () => {
  const s = mk();
  const id = s.newId('I');
  s.savePerson({ id, given: 'Nowy', surname: 'Bak', marriedName: null, sex: 'M', events: [], photos: [], sources: [], notes: [], memories: [], deceased: false });
  s.linkParent('I12', id); // Ula ma tylko ojca w F5 (brak WIFE) → mężczyzna nie pasuje → nowa rodzina
  assert.ok(s.model.people.I12.famc.length === 2);
  const ida = s.newId('I');
  s.savePerson({ id: ida, given: 'Mama', surname: 'Bak', marriedName: null, sex: 'F', events: [], photos: [], sources: [], notes: [], memories: [], deceased: false });
  s.linkParent('I12', ida); // pierwsza rodzina z wolnym miejscem na matkę → F5
  assert.equal(s.model.families.F5.wife, ida);
});

test('linkParent odrzuca cykl i samego siebie', () => {
  const s = mk();
  assert.throws(() => s.linkParent('I1', 'I11'), /potomkiem/);
  assert.throws(() => s.linkParent('I1', 'I1'), /samą osobą/);
});

test('linkSpouse i linkChild', () => {
  const s = mk();
  const fid = s.linkSpouse('I7', 'I15');
  assert.equal(s.model.families[fid].wife, 'I7'); assert.equal(s.model.families[fid].husb, 'I15');
  assert.equal(s.linkSpouse('I15', 'I7'), fid); // bez duplikatu
  s.linkChild('I7', 'I12', 'I15');
  assert.ok(s.model.families[fid].children.includes('I12'));
});

test('deletePerson usuwa osobę z rodzin; undo przywraca', () => {
  const s = mk();
  s.deletePerson('I3');
  assert.equal(s.model.people.I3, undefined);
  assert.equal(s.model.families.F2.husb, null);
  assert.ok(!s.model.families.F1.children.includes('I3'));
  assert.equal(s.undo(), true);
  assert.ok(s.model.people.I3); assert.equal(s.model.families.F2.husb, 'I3');
});

test('unlink odłącza dziecko lub małżonka', () => {
  const s = mk();
  s.unlink('F1', 'I4');
  assert.ok(!s.model.families.F1.children.includes('I4'));
  s.unlink('F2', 'I5');
  assert.equal(s.model.families.F2.wife, null);
});

test('historie i dokumenty', () => {
  const s = mk();
  s.saveItem({ id: 'story-1', kind: 'story', title: 'Dom', body: '…', date: '1930', personIds: ['I1'], fileKey: null, fileName: null, fileType: null, created: 1 });
  s.saveItem({ id: 'doc-1', kind: 'document', title: 'Akt', body: '', date: '', personIds: [], fileKey: 'k', fileName: 'a.jpg', fileType: 'image/jpeg', created: 2 });
  assert.equal(s.items('story').length, 1); assert.equal(s.items('document')[0].title, 'Akt');
  s.deleteItem('story-1'); assert.equal(s.items('story').length, 0);
});

test('exportJson → importJson odtwarza stan', () => {
  const a = mk(); a.savePerson({ ...a.model.people.I1, given: 'Zmieniony' });
  const b = mk(); b.importJson(a.exportJson());
  assert.equal(b.model.people.I1.given, 'Zmieniony');
  assert.throws(() => b.importJson('{"x":1}'), /kopią danych/);
});

test('importGedcom podmienia bazę, resetToFile czyści wszystko', () => {
  const st = memStorage(); const s = mk(st);
  s.savePerson({ ...s.model.people.I1, given: 'Zmieniony' });
  s.importGedcom('0 HEAD\n0 @I1@ INDI\n1 NAME Inny /Ktoś/\n0 @I77@ INDI\n1 NAME Nowa /Osoba/\n0 TRLR\n');
  assert.ok(s.model.people.I77); assert.equal(s.model.people.I1.given, 'Zmieniony');
  assert.ok(mk(st).model.people.I77, 'import zapamiętany');
  s.resetToFile();
  assert.equal(s.model.people.I1.given, 'Adam'); assert.equal(s.model.people.I77, undefined);
  assert.throws(() => s.importGedcom('nie gedcom'), /GEDCOM/);
});

test('niedziałający storage: aplikacja działa w pamięci', () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); }, removeItem() {} };
  const s = createStore({ baseText: miniGedcom(), storage: broken });
  const events = []; s.subscribe((_, c) => events.push(c.type));
  s.savePerson({ ...s.model.people.I1, given: 'X' });
  assert.equal(s.model.people.I1.given, 'X');
  assert.equal(s.persistent, false);
  assert.ok(events.includes('storage-error'));
  assert.equal(createStore({ baseText: miniGedcom(), storage: null }).persistent, false);
});

test('uszkodzony zapis w localStorage jest ignorowany, aplikacja startuje', () => {
  const st = memStorage();
  st.setItem('drzewo:base:v1', 'to nie jest gedcom');
  st.setItem('drzewo:overlay:v1', '{{ zepsute');
  const s = mk(st);
  assert.equal(Object.keys(s.model.people).length, 15);
  assert.equal(s.hasChanges, false);
});
