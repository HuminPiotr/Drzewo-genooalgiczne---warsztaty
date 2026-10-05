const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePlace, isVague, collectPlaces } = require('../js/places.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { realGedcom } = require('./helpers');

test('warianty Zielonej', () => {
  assert.equal(normalizePlace('Zielona. pow. żuromiński'), 'Zielona');
  assert.equal(normalizePlace('Zielona pow Żuromin'), 'Zielona');
});
test('parafia, akt, prefiksy', () => {
  assert.equal(normalizePlace('Zawady par.Rościszewo'), 'Zawady');
  assert.equal(normalizePlace('-Kampinos akt/31'), 'Kampinos');
  assert.equal(normalizePlace('Kampinos-Dąbrówka akt.57'), 'Dąbrówka (Kampinos)');
});
test('Stara Dąbrowa pod Kampinosem – wszystkie zapisy', () => {
  for (const raw of ['- Stara Dabrowa -Kampinos /akt 85', 'Kampinos -Stara Dąbrowa akt.36',
    'Dabrowa -Kampinos', 'Kampinos-Dąbrowa', 'Kampinos-Dąbrowa Stara /9'])
    assert.equal(normalizePlace(raw), 'Stara Dąbrowa (Kampinos)', raw);
});
test('bez zmian i puste', () => {
  assert.equal(normalizePlace('Lipowiec Kościelny'), 'Lipowiec Kościelny');
  assert.equal(normalizePlace('Żuromin'), 'Żuromin');
  assert.equal(normalizePlace('  '), null);
  assert.equal(normalizePlace(null), null);
  assert.equal(isVague('Polska'), true);
  assert.equal(isVague('Kliczewo'), false);
});
test('collectPlaces na prawdziwych danych', () => {
  const map = collectPlaces(parseGedcom(realGedcom()));
  assert.ok(map.has('Kliczewo'));
  assert.ok(map.get('Zielona').length >= 2);
  assert.ok(map.size >= 20 && map.size <= 32, String(map.size));
});
