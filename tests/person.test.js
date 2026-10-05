const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/person.js');

const base = { given: 'Irena', surname: 'Dobies', marriedName: 'Domżalska', sex: 'F', events: [], photos: [], deceased: false };
const ev = (type, raw, place = null) => ({ type, date: raw ? require('../js/gedcom-date.js').parseDate(raw) : null, place });

test('displayName i maidenName', () => {
  assert.equal(P.displayName(base), 'Irena Domżalska');
  assert.equal(P.maidenName(base), 'Dobies');
  assert.equal(P.maidenName({ ...base, marriedName: null }), null);
  assert.equal(P.maidenName({ ...base, marriedName: 'Dobies' }), null);
  assert.equal(P.displayName({ ...base, given: '', surname: '', marriedName: null }), 'Nieznana osoba');
});

test('lifespan bez undefined/NaN dla każdej kombinacji', () => {
  assert.equal(P.lifespan({ ...base, events: [ev('BIRT', '1897'), ev('DEAT', '3 MAR 1975')], deceased: true }), '1897–1975');
  assert.equal(P.lifespan({ ...base, events: [ev('BIRT', '1945')] }), 'ur. 1945');
  assert.equal(P.lifespan({ ...base, events: [ev('BIRT', '1895')], deceased: true }), '1895–?');
  assert.equal(P.lifespan({ ...base, events: [ev('DEAT', '1952')], deceased: true }), 'zm. 1952');
  assert.equal(P.lifespan({ ...base, deceased: true }), '†');
  assert.equal(P.lifespan(base), '');
  assert.equal(P.lifespan({ ...base, events: [ev('BIRT', 'xxxx')] }), '');
});

test('birth bierze BIRT, a gdy brak – CHR/BAPM', () => {
  assert.equal(P.birthYear({ ...base, events: [ev('CHR', '1901')] }), 1901);
});

test('initials, isLiving, primaryPhoto, occupation', () => {
  assert.equal(P.initials(base), 'ID');
  assert.equal(P.initials({ ...base, given: '', surname: '', marriedName: null }), '?');
  assert.equal(P.isLiving({ ...base, events: [ev('BIRT', '1945')] }), true);
  assert.equal(P.isLiving({ ...base, events: [ev('BIRT', '1900')] }), false);
  assert.equal(P.isLiving({ ...base, events: [ev('BIRT', '1945')], deceased: true }), false);
  const ph = [{ url: 'a', primary: false }, { url: 'b', primary: true }];
  assert.equal(P.primaryPhoto({ ...base, photos: ph }).url, 'b');
  assert.equal(P.primaryPhoto(base), null);
  assert.equal(P.occupation({ ...base, events: [{ type: 'OCCU', value: 'Rolnik' }] }), 'Rolnik');
});

test('fold: polskie znaki, wielkość liter', () => {
  assert.equal(P.fold('Żuromin ŁĄCKA Dąbrówka'), 'zuromin lacka dabrowka');
});

test('esc: znaki specjalne HTML', () => {
  assert.equal(P.esc(`<b>"Ala" & 'Ola'</b>`), '&lt;b&gt;&quot;Ala&quot; &amp; &#39;Ola&#39;&lt;/b&gt;');
  assert.equal(P.esc(null), '');
});

test('searchText zawiera imię, oba nazwiska i miejsca bez znaków', () => {
  const t = P.searchText({ ...base, events: [ev('BIRT', '1945', 'Żuromin')] });
  for (const w of ['irena', 'dobies', 'domzalska', 'zuromin']) assert.ok(t.includes(w), w);
});
