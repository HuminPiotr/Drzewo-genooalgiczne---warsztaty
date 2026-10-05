const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRecords, parseGedcom } = require('../js/gedcom-parse.js');
const { realGedcom, miniGedcom } = require('./helpers');

test('parseRecords: BOM, CRLF, @@, CONC/CONT, końcowe spacje', () => {
  const txt = '﻿0 HEAD\r\n0 @I1@ INDI\r\n1 NOTE Ala ma \r\n2 CONC kota\r\n2 CONT drugi wiersz\r\n'
    + '1 RESI\r\n2 EMAIL a@@b.pl\r\n0 TRLR\r\n';
  const recs = parseRecords(txt);
  assert.equal(recs.length, 3);
  assert.equal(recs[1].xref, '@I1@');
  assert.equal(recs[1].children[0].value, 'Ala makota\ndrugi wiersz');
  assert.equal(recs[1].children[1].children[0].value, 'a@b.pl');
});

test('mini.ged: osoby, rodziny, nazwiska, relacje', () => {
  const m = parseGedcom(miniGedcom());
  assert.equal(Object.keys(m.people).length, 15);
  assert.equal(Object.keys(m.families).length, 6);
  const ewa = m.people.I2;
  assert.equal(ewa.given, 'Ewa'); assert.equal(ewa.surname, 'Nowak'); assert.equal(ewa.marriedName, 'Kowal');
  assert.equal(ewa.sex, 'F');
  assert.deepEqual(m.people.I3.famc, ['F1']); assert.deepEqual(m.people.I3.fams, ['F2']);
  assert.equal(m.people.I1.deceased, true);
  assert.equal(m.people.I1.events[0].place, 'Kliczewo');
  assert.equal(m.families.F1.events[0].type, 'MARR');
  assert.equal(m.families.F1.events[0].note, 'Akt nr 7/1875');
  assert.equal(m.people.I3.events[0].date.display, 'ok. 1880');
});

test('prawdziwy eksport MyHeritage: liczby i spójność', () => {
  const m = parseGedcom(realGedcom());
  assert.equal(Object.keys(m.people).length, 209);
  assert.equal(Object.keys(m.families).length, 72);
  assert.equal(Object.values(m.people).filter((p) => p.deceased).length, 133);
  for (const p of Object.values(m.people)) {
    for (const f of [...p.famc, ...p.fams]) assert.ok(m.families[f], `${p.id} → ${f}`);
  }
  for (const f of Object.values(m.families)) {
    for (const id of [f.husb, f.wife, ...f.children].filter(Boolean)) assert.ok(m.people[id], `${f.id} → ${id}`);
  }
});

test('prawdziwy eksport: Irena Dobies (Domżalska) ze zdjęciami', () => {
  const irena = parseGedcom(realGedcom()).people.I500002;
  assert.equal(irena.given, 'Irena'); assert.equal(irena.surname, 'Dobies');
  assert.equal(irena.marriedName, 'Domżalska');
  assert.equal(irena.photos.length, 2);
  assert.equal(irena.photos.filter((x) => x.primary).length, 1);
  assert.match(irena.photos[0].url, /^https:\/\/sites-cf\.mhcache\.com\//);
});

test('rodzina F500027: 6 dzieci, akt ślubu', () => {
  const f = parseGedcom(realGedcom()).families.F500027;
  assert.equal(f.children.length, 6);
  assert.equal(f.events[0].note, 'Akt nr.27/1908');
});

test('żaden adres e-mail nie trafia do modelu', () => {
  const json = JSON.stringify(parseGedcom(realGedcom()));
  assert.doesNotMatch(json, /@[a-z0-9-]+\.[a-z]{2,}/i);
  assert.doesNotMatch(json, /gmail/i);
});

test('EVEN z TYPE, CAUS, RESI z adresem', () => {
  const m = parseGedcom(realGedcom());
  const all = Object.values(m.people).flatMap((p) => p.events);
  assert.ok(all.some((e) => e.type === 'EVEN' && e.typeLabel === 'Akt prawny 37/1892'));
  assert.ok(all.some((e) => e.cause === 'Naturalny/Podeszły wiek'));
  assert.ok(all.some((e) => e.type === 'RESI' && e.place === 'Zielona'));
});

test('źródła: tytuł i tekst bez HTML', () => {
  const s = parseGedcom(realGedcom()).sources.S500001;
  assert.equal(s.author, 'Magdalena Wachowska');
  assert.doesNotMatch(s.text, /<p>/);
});

test('wadliwy GEDCOM: brak NAME, wskaźnik do nieistniejącej osoby', () => {
  const m = parseGedcom('0 HEAD\n0 @I1@ INDI\n1 SEX M\n1 FAMS @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n1 WIFE @I99@\n1 CHIL @I98@\n0 TRLR\n');
  assert.equal(m.people.I1.given, ''); assert.equal(m.people.I1.surname, '');
  assert.equal(m.families.F1.wife, null);
  assert.deepEqual(m.families.F1.children, []);
});

test('pusty lub obcy plik → czytelny błąd', () => {
  assert.throws(() => parseGedcom(''), /nie wygląda na GEDCOM/);
  assert.throws(() => parseGedcom('<html></html>'), /nie wygląda na GEDCOM/);
});

test('nazwisko po ślubie bez dopisków "zd", "z d." i nawiasów', () => {
  const txt = (marn) => `0 HEAD\n0 @I1@ INDI\n1 NAME Ala /Nowak/\n2 GIVN Ala\n2 SURN Nowak\n2 _MARNM ${marn}\n0 TRLR\n`;
  const married = (marn) => parseGedcom(txt(marn)).people.I1.marriedName;
  assert.equal(married('Kąpińska zd Perłowska'), 'Kąpińska');
  assert.equal(married('Kąpińska z d.Słomka'), 'Kąpińska');
  assert.equal(married('Kąpińska z d. Słomka'), 'Kąpińska');
  assert.equal(married('Burczyńska (Petrykowska)'), 'Burczyńska');
  assert.equal(married('Domżalska'), 'Domżalska');
  assert.equal(married('Zdunek'), 'Zdunek', 'nazwisko zaczynające się od "Zd" zostaje');
  assert.equal(married('Nowak Zdunek'), 'Nowak Zdunek');
});

test('prawdziwy eksport: żadne nazwisko po ślubie nie zawiera dopisków', () => {
  const bad = Object.values(parseGedcom(realGedcom()).people).filter((p) => p.marriedName && /\bz\s?d\b|\(/i.test(p.marriedName));
  assert.deepEqual(bad.map((p) => p.id), []);
  assert.equal(parseGedcom(realGedcom()).people.I500180.marriedName, 'Perłowska');
});
