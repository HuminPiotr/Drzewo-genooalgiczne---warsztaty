# Drzewo genealogiczne – plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zastąpić prototyp `index.html` (fikcyjni „Wierzbiccy”) aplikacją w stylu MyHeritage działającą na prawdziwym eksporcie GEDCOM (209 osób, 72 rodziny), otwieraną podwójnym kliknięciem.

**Architecture:** Zwykły HTML + CSS + JS bez builda. Każdy plik JS to klasyczny `<script>` rejestrujący się w `window.Drzewo`. Logika danych (parser, daty, osoby, relacje, miejsca, selektory, eksport, store) ma nagłówek UMD i jest testowana w Node (`node --test`). Widoki UI korzystają z tych modułów. Całe drzewo układa ELK.js, rysuje SVG, a zoom obsługuje d3.

**Tech Stack:** HTML5, CSS (custom properties, dark mode), vanilla JS (ES2020, bez modułów), elkjs 0.10.0, d3 7.9.0, Leaflet 1.9.4, Node 23 (`node --test`, skrypty), macOS `sips` do skalowania zdjęć.

**Spec:** `docs/superpowers/specs/2026-10-05-drzewo-redesign-design.md`

## Global Constraints

- Aplikacja musi działać z `file://` (podwójny klik w `index.html`). Zakazane są: `type="module"`, `fetch()` plików lokalnych, Web Workery, wymóg serwera.
- Bez npm i bez `node_modules`. Biblioteki leżą w `vendor/`, Node służy tylko do `scripts/` i `tests/`.
- Wspólne moduły mają nagłówek UMD: w Node `module.exports`, w przeglądarce `window.Drzewo.<nazwa>`.
- Interfejs w całości po polsku.
- Adresy e-mail z GEDCOM (`RESI`/`EMAIL`) nigdy nie trafiają do modelu.
- Pliki z danymi osobowymi (`*.ged`, `data/`, `photos/`) są w `.gitignore`. Nie commitujemy ich.
- Styl: nowoczesny, jasny (tło `#f6f7f9`, akcent zieleń), bazowy font 16px, kontrast AA, cele dotyku ≥44px, tryb ciemny.
- Każdy tekst z danych wstawiany do HTML przechodzi przez `Drzewo.util.esc()`.
- Klucze localStorage mają prefiks `drzewo:`. Każdy odczyt i zapis jest w try/catch.
- Zdjęcia z MyHeritage wygasają 12.10.2026 17:00. Task 1 ma je pobrać jako pierwszy.

## Review Focus

1. **Wadliwy lub obcy GEDCOM przy imporcie** (końce linii LF, brak NAME, wskaźnik do nieistniejącej osoby, pusty plik). Oczekiwanie: aplikacja się nie wywraca, pokazuje to, co da się odczytać, a pusty plik daje czytelny błąd. Test w Task 3.
2. **Osoba bez dat, miejsc i zdjęcia** (to wiele osób w tych danych). Oczekiwanie: karty i profil nigdy nie pokazują „undefined”, „NaN” ani pustych nawiasów. Testy `lifespan`/`displayName` w Task 4.
3. **localStorage niedostępny lub pełny** (tryb prywatny, quota). Oczekiwanie: aplikacja działa w trybie podglądu, zmiany są w pamięci, użytkownik widzi komunikat. Test w Task 8.
4. **Pętle w danych** (małżeństwo kuzynów, błędnie wpisany rodzic będący potomkiem). Oczekiwanie: przodkowie, pokrewieństwo i pokolenia kończą się bez zawieszenia, a edycja odrzuca tworzenie cyklu. Testy w Task 5 i Task 8.
5. **Polskie znaki i znaki specjalne** (`<`, cudzysłowy) w imionach i notatkach. Oczekiwanie: wyszukiwanie „zuromin” znajduje „Żuromin”, a HTML jest escapowany. Testy `fold`/`esc` w Task 4.

---

## Mapa plików

| Plik | Odpowiedzialność |
|---|---|
| `index.html` | Szkielet: pasek górny, dolny pasek (mobile), kontenery widoków, panel profilu, modale, kolejność `<script>` |
| `index-stary.html` | Dotychczasowy prototyp (bez zmian, do porównania) |
| `css/tokens.css` | Kolory, typografia, cienie, jasny i ciemny motyw |
| `css/base.css` | Reset, layout aplikacji, pasek górny i dolny, przyciski, pola, puste stany |
| `css/components.css` | Panel profilu, karty osób, paleta wyszukiwania, modale, toast, galeria, oś czasu, mapa |
| `css/tree.css` | Płótno drzewa, karty SVG, semantyczny zoom, minimapa, pasek narzędzi drzewa |
| `js/gedcom-date.js` | `Drzewo.date`: parsowanie i formatowanie dat GEDCOM po polsku |
| `js/gedcom-parse.js` | `Drzewo.gedcom`: `parseRecords`, `parseGedcom`, `finalizeModel` |
| `js/gedcom-export.js` | `Drzewo.gedcomExport`: `toGedcom` |
| `js/person.js` | `Drzewo.person`: nazwy, lata, zdjęcia, `fold`, `esc` (pomocnicze funkcje o osobie) |
| `js/relations.js` | `Drzewo.relations`: rodzice, dzieci, małżonkowie, rodzeństwo, przodkowie, potomkowie, pokrewieństwo, liczba pokoleń |
| `js/places.js` | `Drzewo.places`: normalizacja nazw miejscowości |
| `js/selectors.js` | `Drzewo.selectors`: statystyki, oś czasu, indeks miejsc, filtrowanie osób, galeria, dokumenty ze źródeł, wyszukiwanie |
| `js/store.js` | `Drzewo.createStore`: dane bazowe + nakładka zmian, operacje edycji, undo, import i eksport |
| `js/files-db.js` | `Drzewo.filesDb`: IndexedDB na skany i zdjęcia historii |
| `js/tree-layout.js` | `Drzewo.treeLayout`: graf ELK, uruchomienie layoutu, cache |
| `js/util.js` | `Drzewo.util`: `$`, `h` (szablon), `toast`, `download`, `debounce`, `photoSrc`, `selection` |
| `js/router.js` | `Drzewo.router`: routing przez hash |
| `js/ui-modal.js` | `Drzewo.modal`: `confirm`, `open`, `close` |
| `js/ui-profile.js` | `Drzewo.profile`: panel profilu |
| `js/ui-search.js` | `Drzewo.search`: paleta ⌘K i reużywalny `pickPerson()` |
| `js/ui-edit.js` | `Drzewo.edit`: tryb edycji, formularz osoby, relacje, baner zmian, menu danych |
| `js/view-tree.js` | `Drzewo.views.tree`: render SVG, zoom, minimapa, podświetlenia |
| `js/view-people.js` | `Drzewo.views.people` |
| `js/view-timeline.js` | `Drzewo.views.timeline` |
| `js/view-places.js` | `Drzewo.views.places` |
| `js/view-gallery.js` | `Drzewo.views.gallery` (z lightboxem) |
| `js/view-stories.js` | `Drzewo.views.stories` (historie + dokumenty) |
| `js/app.js` | Start: dane → store → widoki → router |
| `data/rodzina.ged`, `data/rodzina.js`, `data/photos.js`, `data/places.js` | Dane (generowane, poza gitem) |
| `scripts/build-data.js`, `scripts/fetch-photos.js`, `scripts/geocode-places.js` | Narzędzia Node |
| `tests/helpers.js`, `tests/fixtures/mini.ged`, `tests/*.test.js` | Testy `node --test` |
| `vendor/elk.bundled.js`, `vendor/d3.min.js`, `vendor/leaflet.js`, `vendor/leaflet.css`, `vendor/images/*` | Biblioteki |

### Model danych (wspólny dla wszystkich tasków)

```js
// DateInfo
{ raw: '8 MAY 1945', year: 1945, month: 5, day: 8, approx: null /* 'ABT'|'CAL'|'EST'|'BEF'|'AFT'|'BET' */,
  display: '8 maj 1945', sortKey: 19450508 /* null gdy brak roku */ }

// Event
{ type: 'BIRT'|'CHR'|'BAPM'|'DEAT'|'BURI'|'RESI'|'OCCU'|'EVEN'|'MARR'|'MARL'|'DIV'|'ENGA',
  date: DateInfo|null, place: string|null, note: string|null, age: string|null,
  cause: string|null, value: string|null /* OCCU: zawód */, typeLabel: string|null /* EVEN TYPE */ }

// Person
{ id: 'I500002', given: 'Irena', surname: 'Dobies' /* nazwisko rodowe */, marriedName: 'Domżalska'|null,
  sex: 'M'|'F'|'U', events: Event[], photos: [{ url, title|null, primary: bool }],
  sources: [{ sourceId: 'S500001', page|null }], notes: string[], memories: string[] /* dopisane w aplikacji */,
  deceased: bool, famc: string[], fams: string[] /* liczone w finalizeModel */ }

// Family
{ id: 'F500027', husb: 'I500053'|null, wife: 'I500054'|null, children: string[], events: Event[], notes: string[] }

// Source
{ id: 'S500001', title|null, author|null, text|null /* bez HTML */ }

// Model
{ people: {[id]: Person}, families: {[id]: Family}, sources: {[id]: Source}, header: { source|null, date|null } }

// Story / Document (tylko w nakładce store)
{ id: 'story-…', kind: 'story'|'document', title, body, date: string /* wolny tekst */, personIds: string[],
  fileKey: string|null /* klucz w IndexedDB */, fileName: string|null, fileType: string|null, created: number }
```

### Wzorzec UMD (każdy moduł testowany w Node)

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).NAZWA = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  // …
  return { /* API */ };
});
```
Zależności między modułami: w Node przez `require('./x.js')`, w przeglądarce przez `root.Drzewo.x`. Wzorzec dla modułu potrzebującego `date`:
```js
const D = (typeof module === 'object' && module.exports) ? require('./gedcom-date.js') : root.Drzewo.date;
```

---

### Task 1: Szkielet projektu, biblioteki, dane i pobranie zdjęć

**Files:**
- Rename: `index.html` → `index-stary.html`
- Create: `data/rodzina.ged` (kopia eksportu), `scripts/build-data.js`, `scripts/fetch-photos.js`, `tests/helpers.js`, `tests/data.test.js`
- Create (pobrane): `vendor/elk.bundled.js`, `vendor/d3.min.js`, `vendor/leaflet.js`, `vendor/leaflet.css`, `vendor/images/marker-icon.png`, `vendor/images/marker-icon-2x.png`, `vendor/images/marker-shadow.png`
- Generated: `data/rodzina.js`, `data/photos.js`, `photos/*.jpg`

**Interfaces:**
- Produces: `window.DRZEWO_GEDCOM: string` (bez BOM), `window.DRZEWO_PHOTOS: {[url]: 'photos/plik.jpg'}`, `tests/helpers.js` → `{ root, loadGlobal(relPath) → window, realGedcom() → string, miniGedcom() → string }`.

- [ ] **Step 1: Przenieś prototyp i skopiuj dane**

```bash
cd "/Users/whomean/Desktop/DRZEWO GENEALOGICZNE"
git mv index.html index-stary.html
mkdir -p data photos scripts tests/fixtures vendor/images css js
cp "6c83t8_118687o3c6f8ea85qct86g_A (1).ged" data/rodzina.ged
```

- [ ] **Step 2: Napisz test danych (na razie nie przejdzie)**

`tests/helpers.js`:
```js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

function loadGlobal(relPath) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, relPath), 'utf8'), ctx);
  return ctx.window;
}
const realGedcom = () => fs.readFileSync(path.join(root, 'data', 'rodzina.ged'), 'utf8');
const miniGedcom = () => fs.readFileSync(path.join(__dirname, 'fixtures', 'mini.ged'), 'utf8');

module.exports = { root, loadGlobal, realGedcom, miniGedcom };
```

`tests/data.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { root, loadGlobal } = require('./helpers');

test('data/rodzina.js zawiera GEDCOM bez BOM', () => {
  const w = loadGlobal('data/rodzina.js');
  assert.ok(w.DRZEWO_GEDCOM.startsWith('0 HEAD'));
  assert.match(w.DRZEWO_GEDCOM, /0 TRLR\s*$/);
});

test('data/photos.js wskazuje 19 istniejących plików', () => {
  const w = loadGlobal('data/photos.js');
  const files = Object.values(w.DRZEWO_PHOTOS);
  assert.equal(files.length, 19);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), f);
});

test('biblioteki są w vendor/', () => {
  for (const f of ['elk.bundled.js', 'd3.min.js', 'leaflet.js', 'leaflet.css'])
    assert.ok(fs.statSync(path.join(root, 'vendor', f)).size > 1000, f);
});
```

- [ ] **Step 3: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/`
Expected: FAIL (`ENOENT … data/rodzina.js`).

- [ ] **Step 4: Napisz `scripts/build-data.js`**

```js
#!/usr/bin/env node
// Użycie: node scripts/build-data.js [plik.ged]  →  data/rodzina.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = process.argv[2] || path.join(root, 'data', 'rodzina.ged');
const text = fs.readFileSync(src, 'utf8').replace(/^﻿/, '');
const out = '// Wygenerowane przez scripts/build-data.js – nie edytuj ręcznie\n'
  + 'window.DRZEWO_GEDCOM = ' + JSON.stringify(text) + ';\n';
fs.writeFileSync(path.join(root, 'data', 'rodzina.js'), out);
console.log(`data/rodzina.js: ${text.length} znaków`);
```

- [ ] **Step 5: Napisz `scripts/fetch-photos.js`**

```js
#!/usr/bin/env node
// Pobiera zdjęcia (OBJE/FILE) z GEDCOM do photos/ i zapisuje mapę url → plik w data/photos.js.
// Linki MyHeritage wygasają (parametr e= w URL) – uruchom od razu po każdym nowym eksporcie.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const text = fs.readFileSync(path.join(root, 'data', 'rodzina.ged'), 'utf8');
const urls = [...new Set([...text.matchAll(/^\s*\d+ FILE (https?:\/\/\S+)/gm)].map((m) => m[1].trim()))];
const mapFile = path.join(root, 'data', 'photos.js');
const map = {};

(async () => {
  for (const url of urls) {
    const name = decodeURIComponent(url.split('?')[0].split('/').pop());
    const rel = 'photos/' + name;
    const dest = path.join(root, rel);
    if (!fs.existsSync(dest)) {
      const res = await fetch(url);
      if (!res.ok) { console.error(`✗ ${res.status} ${url}`); continue; }
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      try { execFileSync('sips', ['-Z', '1200', dest], { stdio: 'ignore' }); } catch { /* sips tylko na macOS */ }
      console.log(`✓ ${name}`);
    }
    map[url] = rel;
  }
  fs.writeFileSync(mapFile, '// Wygenerowane przez scripts/fetch-photos.js\nwindow.DRZEWO_PHOTOS = '
    + JSON.stringify(map, null, 1) + ';\n');
  console.log(`${Object.keys(map).length}/${urls.length} zdjęć`);
  if (Object.keys(map).length < urls.length) process.exitCode = 1;
})();
```

- [ ] **Step 6: Wygeneruj dane, pobierz zdjęcia i biblioteki**

```bash
node scripts/build-data.js
node scripts/fetch-photos.js
curl -sSfL -o vendor/elk.bundled.js https://cdn.jsdelivr.net/npm/elkjs@0.10.0/lib/elk.bundled.js
curl -sSfL -o vendor/d3.min.js https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js
curl -sSfL -o vendor/leaflet.js https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js
curl -sSfL -o vendor/leaflet.css https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css
for f in marker-icon.png marker-icon-2x.png marker-shadow.png; do
  curl -sSfL -o vendor/images/$f https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/$f; done
```
Expected: `19/19 zdjęć`, wszystkie curl bez błędu. `leaflet.css` odwołuje się do `images/…` względnie, więc `vendor/images/` pasuje.

- [ ] **Step 7: Uruchom testy**

Run: `node --test tests/`
Expected: PASS (3 testy).

- [ ] **Step 8: Commit**

```bash
git add index-stary.html scripts tests vendor
git commit -m "Szkielet: prototyp jako index-stary.html, skrypty danych, biblioteki w vendor/

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Daty GEDCOM (`js/gedcom-date.js`)

**Files:**
- Create: `js/gedcom-date.js`, `tests/date.test.js`

**Interfaces:**
- Produces: `Drzewo.date.parseDate(raw: string|null) → DateInfo|null`, `Drzewo.date.MONTHS_PL: string[12]` (skróty miesięcy).

- [ ] **Step 1: Napisz testy**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDate } = require('../js/gedcom-date.js');

test('pełna data', () => {
  assert.deepEqual(parseDate('8 MAY 1945'),
    { raw: '8 MAY 1945', year: 1945, month: 5, day: 8, approx: null, display: '8 maj 1945', sortKey: 19450508 });
});
test('sam rok', () => {
  const d = parseDate('1908');
  assert.equal(d.display, '1908'); assert.equal(d.sortKey, 19080000); assert.equal(d.month, null);
});
test('ABT miesiąc rok', () => {
  const d = parseDate('ABT SEP 1897');
  assert.equal(d.display, 'ok. wrz 1897'); assert.equal(d.approx, 'ABT'); assert.equal(d.year, 1897);
});
test('CAL, BEF, AFT', () => {
  assert.equal(parseDate('CAL 1871').display, 'ok. 1871');
  assert.equal(parseDate('BEF 1 FEB 1976').display, 'przed 1 lut 1976');
  assert.equal(parseDate('AFT 1900').display, 'po 1900');
});
test('BET … AND …', () => {
  const d = parseDate('BET 1900 AND 1905');
  assert.equal(d.display, 'między 1900 a 1905'); assert.equal(d.year, 1900); assert.equal(d.approx, 'BET');
});
test('nieczytelne daty nie wywracają parsera', () => {
  assert.deepEqual(parseDate('xxxx'),
    { raw: 'xxxx', year: null, month: null, day: null, approx: null, display: 'nieznana', sortKey: null });
  assert.equal(parseDate('jesień 1910').year, null);
  assert.equal(parseDate('jesień 1910').display, 'jesień 1910');
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(null), null);
});
test('małe litery i nadmiarowe spacje', () => {
  assert.equal(parseDate('  26 sep 1897 ').display, '26 wrz 1897');
});
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/date.test.js`
Expected: FAIL (`Cannot find module '../js/gedcom-date.js'`).

- [ ] **Step 3: Zaimplementuj**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).date = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const MONTHS = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const MONTHS_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const QUAL = { ABT: 'ok.', CAL: 'ok.', EST: 'ok.', BEF: 'przed', AFT: 'po' };

  function parsePart(s) {
    const t = s.trim().split(/\s+/);
    let day = null, month = null, year;
    if (t.length === 3) { day = Number(t[0]); month = MONTHS[t[1]] || null; year = Number(t[2]); }
    else if (t.length === 2) { month = MONTHS[t[0]] || null; year = Number(t[1]); }
    else if (t.length === 1) { year = Number(t[0]); }
    if (!Number.isInteger(year) || year <= 0) return null;
    if (t.length >= 2 && !month) return null;
    if (day != null && !(Number.isInteger(day) && day >= 1 && day <= 31)) return null;
    return { day, month, year };
  }
  const fmt = (p) => [p.day, p.month ? MONTHS_PL[p.month - 1] : null, p.year].filter((x) => x != null).join(' ');
  const make = (raw, p, approx, display) => ({
    raw, year: p.year, month: p.month, day: p.day, approx, display,
    sortKey: p.year * 10000 + (p.month || 0) * 100 + (p.day || 0),
  });

  function parseDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const up = s.toUpperCase().replace(/\s+/g, ' ');
    const bet = up.match(/^BET (.+) AND (.+)$/);
    if (bet) {
      const a = parsePart(bet[1]), b = parsePart(bet[2]);
      if (a && b) return make(s, a, 'BET', `między ${fmt(a)} a ${fmt(b)}`);
    }
    const q = up.match(/^(ABT|CAL|EST|BEF|AFT) (.+)$/);
    const p = parsePart(q ? q[2] : up);
    if (!p) return { raw: s, year: null, month: null, day: null, approx: null,
      display: /^x+$/i.test(s) ? 'nieznana' : s, sortKey: null };
    return make(s, p, q ? q[1] : null, (q ? QUAL[q[1]] + ' ' : '') + fmt(p));
  }

  return { parseDate, MONTHS_PL };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/date.test.js`
Expected: PASS (7 testów).

- [ ] **Step 5: Commit**

```bash
git add js/gedcom-date.js tests/date.test.js
git commit -m "Daty GEDCOM: parsowanie i polski format

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Parser GEDCOM (`js/gedcom-parse.js`)

**Files:**
- Create: `js/gedcom-parse.js`, `tests/fixtures/mini.ged`, `tests/parse.test.js`

**Interfaces:**
- Consumes: `Drzewo.date.parseDate`
- Produces:
  - `Drzewo.gedcom.parseRecords(text) → Node[]`, gdzie `Node = {level, xref|null, tag, value, children: Node[]}`
  - `Drzewo.gedcom.parseGedcom(text) → Model` (wyrzuca `Error('Plik nie wygląda na GEDCOM')`, gdy brak `0 HEAD` i rekordów INDI)
  - `Drzewo.gedcom.finalizeModel(model) → model` (przelicza `famc`/`fams` z rodzin, usuwa wskaźniki do nieistniejących osób; mutuje i zwraca)
  - `Drzewo.gedcom.EVENT_TAGS`, `Drzewo.gedcom.FAMILY_EVENT_TAGS`

- [ ] **Step 1: Utwórz fixture `tests/fixtures/mini.ged`**

Rodzina testowa, używana też w Task 5 i 7. Zapisz z końcami linii LF, bez BOM:
```
0 HEAD
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Adam /Kowal/
1 SEX M
1 BIRT
2 DATE 1850
2 PLAC Kliczewo
1 DEAT Y
1 FAMS @F1@
0 @I2@ INDI
1 NAME Ewa /Nowak/
2 _MARNM Kowal
1 SEX F
1 FAMS @F1@
0 @I3@ INDI
1 NAME Jan /Kowal/
1 SEX M
1 BIRT
2 DATE ABT 1880
1 FAMC @F1@
1 FAMS @F2@
0 @I4@ INDI
1 NAME Anna /Kowal/
2 _MARNM Lis
1 SEX F
1 FAMC @F1@
1 FAMS @F3@
0 @I5@ INDI
1 NAME Maria /Mak/
2 _MARNM Kowal
1 SEX F
1 FAMC @F6@
1 FAMS @F2@
0 @I6@ INDI
1 NAME Piotr /Kowal/
1 SEX M
1 FAMC @F2@
1 FAMS @F4@
0 @I7@ INDI
1 NAME Zofia /Kowal/
1 SEX F
1 FAMC @F2@
0 @I8@ INDI
1 NAME Karol /Lis/
1 SEX M
1 FAMS @F3@
0 @I9@ INDI
1 NAME Tomasz /Lis/
1 SEX M
1 FAMC @F3@
1 FAMS @F5@
0 @I10@ INDI
1 NAME Ola /Bak/
1 SEX F
1 FAMS @F4@
0 @I11@ INDI
1 NAME Kuba /Kowal/
1 SEX M
1 FAMC @F4@
0 @I12@ INDI
1 NAME Ula /Lis/
1 SEX F
1 FAMC @F5@
0 @I13@ INDI
1 NAME Stefan /Mak/
1 SEX M
1 FAMS @F6@
0 @I14@ INDI
1 NAME Halina /Mak/
1 SEX F
1 FAMS @F6@
0 @I15@ INDI
1 NAME Leon /Mak/
1 SEX M
1 FAMC @F6@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 CHIL @I4@
1 MARR
2 DATE 1875
2 NOTE Akt nr 7/1875
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I5@
1 CHIL @I6@
1 CHIL @I7@
0 @F3@ FAM
1 HUSB @I8@
1 WIFE @I4@
1 CHIL @I9@
0 @F4@ FAM
1 HUSB @I6@
1 WIFE @I10@
1 CHIL @I11@
0 @F5@ FAM
1 HUSB @I9@
1 CHIL @I12@
0 @F6@ FAM
1 HUSB @I13@
1 WIFE @I14@
1 CHIL @I5@
1 CHIL @I15@
0 TRLR
```
Struktura: Adam+Ewa → Jan, Anna. Jan+Maria → Piotr, Zofia. Anna+Karol → Tomasz. Piotr+Ola → Kuba. Tomasz → Ula. Stefan+Halina → Maria, Leon.

- [ ] **Step 2: Napisz testy**

`tests/parse.test.js`:
```js
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
```

- [ ] **Step 3: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/parse.test.js`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 4: Zaimplementuj `js/gedcom-parse.js`**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).gedcom = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const D = (typeof module === 'object' && module.exports) ? require('./gedcom-date.js') : root.Drzewo.date;

  const EVENT_TAGS = ['BIRT', 'CHR', 'BAPM', 'DEAT', 'BURI', 'RESI', 'OCCU', 'EVEN'];
  const FAMILY_EVENT_TAGS = ['MARR', 'MARL', 'ENGA', 'DIV'];
  const LINE = /^\s*(\d+)\s+(?:(@[^@\s]+@)\s+)?(\S+)(?: (.*))?$/;

  function parseRecords(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/);
    const roots = [];
    const stack = [];
    for (const line of lines) {
      const m = line.match(LINE);
      if (!m) continue;
      const level = Number(m[1]);
      const value = (m[4] || '').replace(/\s+$/, '').replace(/@@/g, '@');
      if (m[3] === 'CONC' || m[3] === 'CONT') {
        const parent = stack[level - 1];
        if (parent) parent.value += (m[3] === 'CONT' ? '\n' : '') + value;
        continue;
      }
      const node = { level, xref: m[2] || null, tag: m[3], value, children: [] };
      stack.length = level;
      stack[level] = node;
      if (level === 0) roots.push(node);
      else if (stack[level - 1]) stack[level - 1].children.push(node);
    }
    return roots;
  }

  const child = (n, tag) => (n ? n.children.find((c) => c.tag === tag) : undefined);
  const kids = (n, tag) => (n ? n.children.filter((c) => c.tag === tag) : []);
  const val = (n, tag) => { const c = child(n, tag); return c && c.value ? c.value : null; };
  const ptr = (v) => (v ? v.replace(/@/g, '') : null);
  const stripHtml = (s) => (s ? s.replace(/<\/p>\s*<p>/g, '\n').replace(/<[^>]+>/g, '').trim() : null);

  function readEvent(n) {
    const ev = {
      type: n.tag,
      date: D.parseDate(val(n, 'DATE')),
      place: val(n, 'PLAC'),
      note: val(n, 'NOTE'),
      age: val(n, 'AGE'),
      cause: val(n, 'CAUS'),
      value: (n.tag === 'OCCU' || n.tag === 'EVEN') && n.value ? n.value : null,
      typeLabel: val(n, 'TYPE'),
    };
    if (n.tag === 'RESI' && !ev.place) {
      const addr = child(n, 'ADDR');
      ev.place = val(addr, 'CITY') || val(addr, 'ADR1') || (addr && addr.value) || null;
    }
    return ev;
  }
  const hasContent = (e) => !!(e.date || e.place || e.note || e.age || e.cause || e.value || e.typeLabel);

  function readPerson(n) {
    const nameNode = child(n, 'NAME');
    const full = nameNode ? nameNode.value : '';
    const mm = full.match(/^([^/]*)\/([^/]*)\/?/);
    const given = (val(nameNode, 'GIVN') || (mm ? mm[1] : full)).trim();
    const surname = (val(nameNode, 'SURN') || (mm ? mm[2] : '')).trim();
    const sex = val(n, 'SEX');
    const events = [];
    let deceased = false;
    for (const c of n.children) {
      if (!EVENT_TAGS.includes(c.tag)) continue;
      if (c.tag === 'DEAT') deceased = true;
      const ev = readEvent(c);
      if (hasContent(ev)) events.push(ev);
    }
    return {
      id: ptr(n.xref),
      given,
      surname,
      marriedName: (val(nameNode, '_MARNM') || '').trim() || null,
      sex: sex === 'M' || sex === 'F' ? sex : 'U',
      events,
      photos: kids(n, 'OBJE').filter((o) => val(o, 'FILE')).map((o) => ({
        url: val(o, 'FILE'),
        title: val(o, 'TITL'),
        primary: val(o, '_PRIM') === 'Y' || val(o, '_PERSONALPHOTO') === 'Y',
      })),
      sources: kids(n, 'SOUR').filter((s) => s.value).map((s) => ({ sourceId: ptr(s.value), page: val(s, 'PAGE') })),
      notes: kids(n, 'NOTE').map((x) => x.value).filter(Boolean),
      memories: [],
      deceased,
      famc: [],
      fams: [],
    };
  }

  function readFamily(n) {
    return {
      id: ptr(n.xref),
      husb: ptr(val(n, 'HUSB')),
      wife: ptr(val(n, 'WIFE')),
      children: kids(n, 'CHIL').map((c) => ptr(c.value)).filter(Boolean),
      events: n.children.filter((c) => FAMILY_EVENT_TAGS.includes(c.tag)).map(readEvent),
      notes: kids(n, 'NOTE').map((x) => x.value).filter(Boolean),
    };
  }

  function readSource(n) {
    return { id: ptr(n.xref), title: val(n, 'TITL'), author: val(n, 'AUTH'), text: stripHtml(val(n, 'TEXT')) };
  }

  function finalizeModel(model) {
    for (const p of Object.values(model.people)) { p.famc = []; p.fams = []; }
    for (const f of Object.values(model.families)) {
      if (f.husb && !model.people[f.husb]) f.husb = null;
      if (f.wife && !model.people[f.wife]) f.wife = null;
      f.children = [...new Set(f.children.filter((id) => model.people[id]))];
      for (const s of [f.husb, f.wife]) if (s) model.people[s].fams.push(f.id);
      for (const c of f.children) model.people[c].famc.push(f.id);
    }
    return model;
  }

  function parseGedcom(text) {
    const recs = parseRecords(text);
    const head = recs.find((r) => r.tag === 'HEAD');
    const indis = recs.filter((r) => r.tag === 'INDI' && r.xref);
    if (!head || !indis.length) throw new Error('Plik nie wygląda na GEDCOM (brak nagłówka lub osób).');
    const model = { people: {}, families: {}, sources: {}, header: { source: val(head, 'SOUR'), date: val(head, 'DATE') } };
    for (const r of indis) { const p = readPerson(r); model.people[p.id] = p; }
    for (const r of recs) {
      if (r.tag === 'FAM' && r.xref) { const f = readFamily(r); model.families[f.id] = f; }
      if (r.tag === 'SOUR' && r.xref) { const s = readSource(r); model.sources[s.id] = s; }
    }
    return finalizeModel(model);
  }

  return { parseRecords, parseGedcom, finalizeModel, EVENT_TAGS, FAMILY_EVENT_TAGS };
});
```
Uwaga: `RESI`, który ma tylko `EMAIL`, nie ma treści (`hasContent` = false), więc wypada. E-mail nie jest nigdzie czytany.

- [ ] **Step 5: Uruchom testy**

Run: `node --test tests/parse.test.js`
Expected: PASS (10 testów). Jeśli test e-maili złapie `@` w innym polu (np. `TEXT` źródła), wypisz dopasowanie i popraw parser. Nie osłabiaj testu.

- [ ] **Step 6: Commit**

```bash
git add js/gedcom-parse.js tests/parse.test.js tests/fixtures/mini.ged
git commit -m "Parser GEDCOM: rekordy, osoby, rodziny, źródła (bez e-maili)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pomocnicze funkcje o osobie (`js/person.js`)

**Files:**
- Create: `js/person.js`, `tests/person.test.js`

**Interfaces:**
- Produces `Drzewo.person`:
  - `displayName(p) → string` (imię + nazwisko po ślubie albo rodowe; pusty → `'Nieznana osoba'`)
  - `maidenName(p) → string|null` (nazwisko rodowe, gdy różne od nazwiska po ślubie)
  - `findEvent(p, types: string[]) → Event|null`, `birth(p)`, `death(p)`, `burial(p)`
  - `birthYear(p) → number|null`, `deathYear(p) → number|null`
  - `lifespan(p) → string` (`'1897–1975'`, `'ur. 1945'`, `'1895–?'`, `'zm. 1952'`, `'†'`, `''`)
  - `initials(p) → string`, `isLiving(p) → boolean`, `primaryPhoto(p) → {url,title,primary}|null`
  - `occupation(p) → string|null`
  - `fold(s) → string` (małe litery, bez polskich znaków), `esc(s) → string` (HTML)
  - `searchText(p) → string` (złożone `fold` imienia, nazwisk i miejsc)

- [ ] **Step 1: Napisz testy**

```js
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
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/person.test.js`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Zaimplementuj**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).person = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const LIVING_BORN_AFTER = 1925;

  const lastName = (p) => p.marriedName || p.surname || '';
  function displayName(p) {
    const s = `${p.given || ''} ${lastName(p)}`.trim();
    return s || 'Nieznana osoba';
  }
  const maidenName = (p) => (p.marriedName && p.surname && p.marriedName !== p.surname ? p.surname : null);
  const findEvent = (p, types) => {
    for (const t of types) { const e = (p.events || []).find((x) => x.type === t); if (e) return e; }
    return null;
  };
  const birth = (p) => findEvent(p, ['BIRT', 'CHR', 'BAPM']);
  const death = (p) => findEvent(p, ['DEAT']);
  const burial = (p) => findEvent(p, ['BURI']);
  const yearOf = (e) => (e && e.date && e.date.year) || null;
  const birthYear = (p) => yearOf(birth(p));
  const deathYear = (p) => yearOf(death(p));

  function lifespan(p) {
    const b = birthYear(p), d = deathYear(p);
    if (b && d) return `${b}–${d}`;
    if (b) return p.deceased ? `${b}–?` : `ur. ${b}`;
    if (d) return `zm. ${d}`;
    return p.deceased ? '†' : '';
  }
  function initials(p) {
    const s = ((p.given || '').charAt(0) + lastName(p).charAt(0)).toUpperCase();
    return s || '?';
  }
  const isLiving = (p) => !p.deceased && (birthYear(p) || 0) > LIVING_BORN_AFTER;
  const primaryPhoto = (p) => (p.photos || []).find((x) => x.primary) || (p.photos || [])[0] || null;
  const occupation = (p) => { const e = findEvent(p, ['OCCU']); return e ? e.value : null; };

  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => (s == null ? '' : String(s).replace(/[&<>"']/g, (c) => ESC[c]));
  const searchText = (p) => fold([p.given, p.surname, p.marriedName, ...(p.events || []).map((e) => e.place)]
    .filter(Boolean).join(' '));

  return { displayName, maidenName, findEvent, birth, death, burial, birthYear, deathYear, lifespan,
    initials, isLiving, primaryPhoto, occupation, fold, esc, searchText, LIVING_BORN_AFTER };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/person.test.js`
Expected: PASS (7 testów).

- [ ] **Step 5: Commit**

```bash
git add js/person.js tests/person.test.js
git commit -m "Pomocnicze funkcje osoby: nazwy, lata, inicjały, fold, esc

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 5: Relacje i pokrewieństwo (`js/relations.js`)

**Files:**
- Create: `js/relations.js`, `tests/relations.test.js`

**Interfaces:**
- Consumes: `Model` (Task 3)
- Produces `Drzewo.relations` (każda funkcja przyjmuje `(model, id, …)` i zwraca id osób):
  - `parentsOf(m, id) → string[]`, `childrenOf(m, id) → string[]`, `siblingsOf(m, id) → string[]` (z przyrodnim rodzeństwem)
  - `spousesOf(m, id) → [{ id, familyId }]`
  - `ancestorsOf(m, id) → Set<string>`, `descendantsOf(m, id) → Set<string>` (bez samej osoby)
  - `ancestorDepths(m, id) → Map<string, number>` (osoba = 0)
  - `kinship(m, fromId, toId) → string|null`: kim jest `to` dla `from`, po polsku
  - `generationCount(m) → number` (najdłuższa linia przodek → potomek)

- [ ] **Step 1: Napisz testy (na `tests/fixtures/mini.ged`)**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/relations.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const m = parseGedcom(miniGedcom());

test('podstawowe relacje', () => {
  assert.deepEqual(R.parentsOf(m, 'I3').sort(), ['I1', 'I2']);
  assert.deepEqual(R.childrenOf(m, 'I1').sort(), ['I3', 'I4']);
  assert.deepEqual(R.siblingsOf(m, 'I6'), ['I7']);
  assert.deepEqual(R.spousesOf(m, 'I3'), [{ id: 'I5', familyId: 'F2' }]);
  assert.deepEqual(R.spousesOf(m, 'I9'), []);
  assert.deepEqual([...R.ancestorsOf(m, 'I11')].sort(), ['I1', 'I13', 'I14', 'I2', 'I3', 'I5', 'I6', 'I10'].sort());
  assert.deepEqual([...R.descendantsOf(m, 'I4')].sort(), ['I12', 'I9']);
});

test('pokrewieństwo: linia prosta', () => {
  assert.equal(R.kinship(m, 'I6', 'I3'), 'ojciec');
  assert.equal(R.kinship(m, 'I6', 'I5'), 'matka');
  assert.equal(R.kinship(m, 'I6', 'I1'), 'dziadek');
  assert.equal(R.kinship(m, 'I11', 'I1'), 'pradziadek');
  assert.equal(R.kinship(m, 'I11', 'I2'), 'prababcia');
  assert.equal(R.kinship(m, 'I1', 'I6'), 'wnuk');
  assert.equal(R.kinship(m, 'I1', 'I11'), 'prawnuk');
  assert.equal(R.kinship(m, 'I3', 'I7'), 'córka');
});

test('pokrewieństwo: boczne', () => {
  assert.equal(R.kinship(m, 'I6', 'I7'), 'siostra');
  assert.equal(R.kinship(m, 'I6', 'I4'), 'ciocia');
  assert.equal(R.kinship(m, 'I9', 'I3'), 'wujek');
  assert.equal(R.kinship(m, 'I4', 'I6'), 'bratanek');
  assert.equal(R.kinship(m, 'I3', 'I9'), 'siostrzeniec');
  assert.equal(R.kinship(m, 'I6', 'I9'), 'kuzyn');
  assert.equal(R.kinship(m, 'I11', 'I12'), 'kuzynka 2. stopnia');
  assert.equal(R.kinship(m, 'I11', 'I9'), 'kuzyn (1 pokol. wyżej)');
});

test('pokrewieństwo: przez małżeństwo', () => {
  assert.equal(R.kinship(m, 'I3', 'I5'), 'żona');
  assert.equal(R.kinship(m, 'I5', 'I3'), 'mąż');
  assert.equal(R.kinship(m, 'I3', 'I13'), 'teść');
  assert.equal(R.kinship(m, 'I13', 'I3'), 'zięć');
  assert.equal(R.kinship(m, 'I1', 'I5'), 'synowa');
  assert.equal(R.kinship(m, 'I3', 'I15'), 'szwagier');
  assert.equal(R.kinship(m, 'I8', 'I3'), 'szwagier');
  assert.equal(R.kinship(m, 'I10', 'I13'), null);
  assert.equal(R.kinship(m, 'I3', 'I3'), 'ta sama osoba');
});

test('rodzeństwo przyrodnie', () => {
  const m2 = structuredClone(m);
  m2.families.F9 = { id: 'F9', husb: 'I3', wife: null, children: ['I16'], events: [], notes: [] };
  m2.people.I16 = { ...m.people.I7, id: 'I16', given: 'Ida', famc: [], fams: [] };
  require('../js/gedcom-parse.js').finalizeModel(m2);
  assert.equal(R.kinship(m2, 'I6', 'I16'), 'siostra przyrodnia');
});

test('pętla w danych (osoba swoim przodkiem) nie zawiesza funkcji', () => {
  const m3 = structuredClone(m);
  m3.families.F4.children.push('I1'); // Kuba-rodzina ma za dziecko Adama → cykl
  require('../js/gedcom-parse.js').finalizeModel(m3);
  assert.ok(R.ancestorsOf(m3, 'I11').size > 0);
  assert.ok(R.descendantsOf(m3, 'I1').size > 0);
  assert.equal(typeof R.generationCount(m3), 'number');
  R.kinship(m3, 'I11', 'I12');
});

test('liczba pokoleń', () => {
  assert.equal(R.generationCount(m), 4);
  const real = R.generationCount(parseGedcom(realGedcom()));
  assert.ok(real >= 5 && real <= 10, String(real));
});
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/relations.test.js`
Expected: FAIL (`Cannot find module`).

- [ ] **Step 3: Zaimplementuj**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).relations = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const uniq = (a) => [...new Set(a)];
  const fam = (m, id) => m.families[id];
  const person = (m, id) => m.people[id];

  const parentsOf = (m, id) => uniq((person(m, id)?.famc || []).flatMap((f) => [fam(m, f)?.husb, fam(m, f)?.wife]).filter(Boolean));
  const childrenOf = (m, id) => uniq((person(m, id)?.fams || []).flatMap((f) => fam(m, f)?.children || []));
  const spousesOf = (m, id) => (person(m, id)?.fams || []).map((f) => {
    const F = fam(m, f); const other = F && (F.husb === id ? F.wife : F.husb);
    return other ? { id: other, familyId: f } : null;
  }).filter(Boolean);
  const siblingsOf = (m, id) => uniq(parentsOf(m, id).flatMap((p) => childrenOf(m, p))
    .concat((person(m, id)?.famc || []).flatMap((f) => fam(m, f)?.children || [])))
    .filter((x) => x !== id);

  function walk(m, id, next) {
    const depth = new Map([[id, 0]]);
    const queue = [id];
    while (queue.length) {
      const x = queue.shift();
      for (const y of next(m, x)) if (!depth.has(y)) { depth.set(y, depth.get(x) + 1); queue.push(y); }
    }
    return depth;
  }
  const ancestorDepths = (m, id) => walk(m, id, parentsOf);
  const ancestorsOf = (m, id) => { const s = new Set(ancestorDepths(m, id).keys()); s.delete(id); return s; };
  const descendantsOf = (m, id) => { const s = new Set(walk(m, id, childrenOf).keys()); s.delete(id); return s; };

  const g = (p, male, female, unknown) => (p?.sex === 'M' ? male : p?.sex === 'F' ? female : unknown);
  function ancestorWord(n, p) {
    if (n === 1) return g(p, 'ojciec', 'matka', 'rodzic');
    return 'pra'.repeat(n - 2) + g(p, 'dziadek', 'babcia', 'dziadek lub babcia');
  }
  function descendantWord(n, p) {
    if (n === 1) return g(p, 'syn', 'córka', 'dziecko');
    return 'pra'.repeat(n - 2) + g(p, 'wnuk', 'wnuczka', 'wnuk lub wnuczka');
  }

  function bloodKinship(m, fromId, toId) {
    const A = ancestorDepths(m, fromId), B = ancestorDepths(m, toId);
    let best = null;
    for (const [k, a] of A) if (B.has(k)) { const b = B.get(k); if (!best || a + b < best.a + best.b) best = { a, b }; }
    if (!best) return null;
    const { a, b } = best;
    const to = person(m, toId);
    if (b === 0) return ancestorWord(a, to);
    if (a === 0) return descendantWord(b, to);
    if (a === 1 && b === 1) {
      const shared = parentsOf(m, fromId).filter((x) => parentsOf(m, toId).includes(x));
      return g(to, 'brat', 'siostra', 'rodzeństwo') + (shared.length === 1 ? g(to, ' przyrodni', ' przyrodnia', ' przyrodnie') : '');
    }
    if (a === 2 && b === 1) return g(to, 'wujek', 'ciocia', 'wujek lub ciocia');
    if (a === 1 && b === 2) {
      const sib = parentsOf(m, toId).find((x) => siblingsOf(m, fromId).includes(x));
      const viaBrother = person(m, sib)?.sex !== 'F';
      return viaBrother ? g(to, 'bratanek', 'bratanica', 'bratanek') : g(to, 'siostrzeniec', 'siostrzenica', 'siostrzeniec');
    }
    if (a >= 2 && b >= 2) {
      const degree = Math.min(a, b) - 1;
      let s = g(to, 'kuzyn', 'kuzynka', 'kuzyn') + (degree > 1 ? ` ${degree}. stopnia` : '');
      if (a !== b) s += ` (${Math.abs(a - b)} pokol. ${b < a ? 'wyżej' : 'niżej'})`;
      return s;
    }
    return g(to, 'krewny', 'krewna', 'krewny') + ` (wspólny przodek ${a} pokol. wyżej)`;
  }

  function kinship(m, fromId, toId) {
    if (!person(m, fromId) || !person(m, toId)) return null;
    if (fromId === toId) return 'ta sama osoba';
    const to = person(m, toId);
    const spouses = spousesOf(m, fromId).map((s) => s.id);
    if (spouses.includes(toId)) return g(to, 'mąż', 'żona', 'małżonek');
    const blood = bloodKinship(m, fromId, toId);
    if (blood) return blood;
    if (spouses.some((s) => parentsOf(m, s).includes(toId))) return g(to, 'teść', 'teściowa', 'teść lub teściowa');
    if (childrenOf(m, fromId).some((c) => spousesOf(m, c).some((s) => s.id === toId))) return g(to, 'zięć', 'synowa', 'zięć lub synowa');
    const siblingSpouses = siblingsOf(m, fromId).flatMap((s) => spousesOf(m, s).map((x) => x.id));
    if (spouses.some((s) => siblingsOf(m, s).includes(toId)) || siblingSpouses.includes(toId))
      return g(to, 'szwagier', 'szwagierka', 'szwagier lub szwagierka');
    return null;
  }

  function generationCount(m) {
    const memo = new Map();
    const visiting = new Set();
    function depth(id) {
      if (memo.has(id)) return memo.get(id);
      if (visiting.has(id)) return 0; // cykl w danych – przerwij
      visiting.add(id);
      const d = 1 + Math.max(0, ...parentsOf(m, id).map(depth));
      visiting.delete(id);
      memo.set(id, d);
      return d;
    }
    return Math.max(0, ...Object.keys(m.people).map(depth));
  }

  return { parentsOf, childrenOf, spousesOf, siblingsOf, ancestorDepths, ancestorsOf, descendantsOf, kinship, generationCount };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/relations.test.js`
Expected: PASS (7 testów). Wypisz `generationCount` prawdziwych danych (np. `node -e "…"`) i zanotuj wynik. Pokaże go pasek statystyk.

- [ ] **Step 5: Commit**

```bash
git add js/relations.js tests/relations.test.js
git commit -m "Relacje i pokrewieństwo po polsku

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Miejsca – normalizacja i geokodowanie

**Files:**
- Create: `js/places.js`, `scripts/geocode-places.js`, `tests/places.test.js`
- Generated: `data/places.js`

**Interfaces:**
- Consumes: `parseGedcom`, `fold`
- Produces `Drzewo.places`:
  - `normalizePlace(raw) → string|null` (kanoniczna nazwa miejscowości)
  - `isVague(name) → boolean` (np. „Polska”, czyli bez pinezki)
  - `collectPlaces(model) → Map<canonical, string[] /* surowe warianty */>`
- Produces: `window.DRZEWO_PLACES: {[canonical]: [lat, lng] | null}`

- [ ] **Step 1: Napisz testy (warianty wzięte z prawdziwego pliku)**

```js
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
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/places.test.js`
Expected: FAIL.

- [ ] **Step 3: Zaimplementuj `js/places.js`**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).places = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const P = (typeof module === 'object' && module.exports) ? require('./person.js') : root.Drzewo.person;
  const VAGUE = new Set(['polska', 'poland']);
  // Klucze: fold() + myślniki bez spacji
  const ALIASES = {
    'stara dabrowa-kampinos': 'Stara Dąbrowa (Kampinos)',
    'kampinos-stara dabrowa': 'Stara Dąbrowa (Kampinos)',
    'dabrowa-kampinos': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowa': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowa stara': 'Stara Dąbrowa (Kampinos)',
    'kampinos-dabrowka': 'Dąbrówka (Kampinos)',
  };

  function normalizePlace(raw) {
    if (raw == null) return null;
    let s = String(raw).trim()
      .replace(/\/.*$/, '')            // "… /akt 85", "… /9"
      .replace(/\s*\bakt\b.*$/i, '')   // "… akt.36"
      .replace(/^[-\s]+/, '');         // "- Stara…", "-Kampinos"
    s = s.split(/[,.]|\s+pow\b|\s+par\b|\s+gm\b|\s+woj\b/i)[0].trim();
    if (!s) return null;
    const key = P.fold(s).replace(/\s*-\s*/g, '-');
    return ALIASES[key] || s;
  }
  const isVague = (name) => VAGUE.has(P.fold(name));

  function collectPlaces(model) {
    const map = new Map();
    const events = [...Object.values(model.people), ...Object.values(model.families)].flatMap((x) => x.events);
    for (const e of events) {
      const c = normalizePlace(e.place);
      if (!c) continue;
      if (!map.has(c)) map.set(c, []);
      if (!map.get(c).includes(e.place)) map.get(c).push(e.place);
    }
    return map;
  }

  return { normalizePlace, isVague, collectPlaces };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/places.test.js`
Expected: PASS. Jeśli `map.size` wypadnie poza zakres, wypisz klucze i oceń, czy normalizacja nie skleja albo nie rozbija nazw.

- [ ] **Step 5: Napisz `scripts/geocode-places.js`**

```js
#!/usr/bin/env node
// Geokoduje miejscowości (Nominatim/OSM, 1 zapytanie/s) → data/places.js.
// Zachowuje istniejące wpisy, więc ręczne poprawki w data/places.js nie giną.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { collectPlaces, isVague } = require('../js/places.js');

const root = path.join(__dirname, '..');
const out = path.join(root, 'data', 'places.js');
const existing = fs.existsSync(out)
  ? (() => { const c = { window: {} }; vm.runInNewContext(fs.readFileSync(out, 'utf8'), c); return c.window.DRZEWO_PLACES; })()
  : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function query(q) {
  const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pl&q=' + encodeURIComponent(q);
  const res = await fetch(url, { headers: { 'User-Agent': 'drzewo-genealogiczne-lokalne/1.0' } });
  await sleep(1100);
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? [Number(Number(hit.lat).toFixed(5)), Number(Number(hit.lon).toFixed(5))] : null;
}

(async () => {
  const model = parseGedcom(fs.readFileSync(path.join(root, 'data', 'rodzina.ged'), 'utf8'));
  const result = { ...existing };
  for (const [name, raws] of collectPlaces(model)) {
    if (name in result || isVague(name)) continue;
    const hint = raws.map((r) => (r.match(/pow\.?\s*([\p{L}]+)/iu) || [])[1]).find(Boolean);
    const plain = name.replace(/\s*\((.+)\)$/, ', $1'); // "Stara Dąbrowa (Kampinos)" → "Stara Dąbrowa, Kampinos"
    result[name] = (hint && await query(`${plain}, powiat ${hint.replace(/(ski|Żuromin)$/i, 'żuromiński')}`))
      || await query(`${plain}, mazowieckie`) || await query(plain);
    console.log(`${result[name] ? '✓' : '✗'} ${name} ${JSON.stringify(result[name])}  ← ${raws.join(' | ')}`);
  }
  fs.writeFileSync(out, '// Wygenerowane przez scripts/geocode-places.js – można poprawiać ręcznie\nwindow.DRZEWO_PLACES = '
    + JSON.stringify(result, null, 1) + ';\n');
})();
```

- [ ] **Step 6: Uruchom i sprawdź wynik**

Run: `node scripts/geocode-places.js`
Expected: około 25–30 linii. Kliczewo ≈ `[53.05, 20.01]`, Żuromin ≈ `[53.07, 19.91]`, Zielona w pow. żuromińskim ≈ `[53.1, 19.8]`. Każdy wynik odległy o ponad 150 km od Żuromina (lat poza 51.5–54.5 albo lng poza 18–22, z wyjątkiem Elbląga i Dębna Lubuskiego) popraw ręcznie w `data/places.js`. Wpisy `null` zostaw: takie miejsca pokażą się na liście bez pinezki.

- [ ] **Step 7: Commit**

```bash
git add js/places.js scripts/geocode-places.js tests/places.test.js
git commit -m "Miejsca: normalizacja nazw i geokodowanie

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Eksport GEDCOM (`js/gedcom-export.js`)

**Files:**
- Create: `js/gedcom-export.js`, `tests/export.test.js`

**Interfaces:**
- Consumes: `Model`
- Produces: `Drzewo.gedcomExport.toGedcom(model, { now = new Date() } = {}) → string` (GEDCOM 5.5.1, CRLF, UTF-8 bez BOM)

- [ ] **Step 1: Napisz testy**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { toGedcom } = require('../js/gedcom-export.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { realGedcom, miniGedcom } = require('./helpers');

const strip = (m) => ({ people: m.people, families: m.families, sources: m.sources });

test('round-trip: prawdziwe dane', () => {
  const a = parseGedcom(realGedcom());
  const b = parseGedcom(toGedcom(a));
  assert.deepEqual(strip(b), strip(a));
});

test('round-trip: mini', () => {
  const a = parseGedcom(miniGedcom());
  assert.deepEqual(strip(parseGedcom(toGedcom(a))), strip(a));
});

test('długie i wielowierszowe notatki, @ w treści', () => {
  const a = parseGedcom(miniGedcom());
  a.people.I1.notes = ['x'.repeat(450) + '\ndruga linia z adresem a@b'];
  a.people.I1.memories = ['Wspomnienie'];
  const txt = toGedcom(a);
  assert.match(txt, /\r\n2 CONC /); assert.match(txt, /\r\n2 CONT /); assert.match(txt, /a@@b/);
  assert.deepEqual(parseGedcom(txt).people.I1.notes[0], a.people.I1.notes[0]);
});

test('nagłówek i koniec', () => {
  const txt = toGedcom(parseGedcom(miniGedcom()), { now: new Date('2026-10-05T12:00:00Z') });
  assert.ok(txt.startsWith('0 HEAD\r\n1 GEDC\r\n2 VERS 5.5.1'));
  assert.match(txt, /1 DATE 5 OCT 2026/);
  assert.ok(txt.endsWith('0 TRLR\r\n'));
});
```
Uwaga: `memories` nie wchodzą do GEDCOM jako osobne pole (parser ustawia `[]`). Eksportujemy je jako `NOTE` z prefiksem `Wspomnienie: `, a parser przy imporcie rozpoznaje ten prefiks i przenosi je z powrotem do `memories`. Dopisz to do testu i parsera:

```js
test('wspomnienia przechodzą przez GEDCOM', () => {
  const a = parseGedcom(miniGedcom());
  a.people.I2.memories = ['Piekła najlepszy chleb'];
  assert.deepEqual(parseGedcom(toGedcom(a)).people.I2.memories, ['Piekła najlepszy chleb']);
  assert.deepEqual(parseGedcom(toGedcom(a)).people.I2.notes, []);
});
```
oraz w `js/gedcom-parse.js` (`readPerson`) zamień `notes` i `memories` na:
```js
      notes: kids(n, 'NOTE').map((x) => x.value).filter((v) => v && !v.startsWith(MEMORY_PREFIX)),
      memories: kids(n, 'NOTE').map((x) => x.value).filter((v) => v && v.startsWith(MEMORY_PREFIX))
        .map((v) => v.slice(MEMORY_PREFIX.length)),
```
z `const MEMORY_PREFIX = 'Wspomnienie: ';` na górze modułu. Eksportuj go w API: `return { …, MEMORY_PREFIX }`.

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/export.test.js`
Expected: FAIL.

- [ ] **Step 3: Zaimplementuj `js/gedcom-export.js`**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).gedcomExport = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const G = (typeof module === 'object' && module.exports) ? require('./gedcom-parse.js') : root.Drzewo.gedcom;
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const CHUNK = 200;

  function toGedcom(model, { now = new Date() } = {}) {
    const out = [];
    const esc = (v) => String(v).replace(/@/g, '@@');
    function line(level, tag, value, xref) {
      const head = `${level} ${xref ? `@${xref}@ ` : ''}${tag}`;
      if (value == null || value === '') { out.push(head); return; }
      const [first, ...rest] = String(value).split('\n');
      const chunks = (s) => { const r = []; for (let i = 0; i < s.length; i += CHUNK) r.push(s.slice(i, i + CHUNK)); return r.length ? r : ['']; };
      const [f0, ...fc] = chunks(esc(first));
      out.push(`${head} ${f0}`.trimEnd());
      fc.forEach((c) => out.push(`${level + 1} CONC ${c}`));
      for (const r of rest) {
        const [r0, ...rc] = chunks(esc(r));
        out.push(`${level + 1} CONT ${r0}`.trimEnd());
        rc.forEach((c) => out.push(`${level + 1} CONC ${c}`));
      }
    }
    const pointer = (level, tag, id) => out.push(`${level} ${tag} @${id}@`);
    function event(e, level = 1) {
      line(level, e.type, e.value);
      if (e.typeLabel) line(level + 1, 'TYPE', e.typeLabel);
      if (e.date) line(level + 1, 'DATE', e.date.raw);
      if (e.place) line(level + 1, 'PLAC', e.place);
      if (e.age) line(level + 1, 'AGE', e.age);
      if (e.cause) line(level + 1, 'CAUS', e.cause);
      if (e.note) line(level + 1, 'NOTE', e.note);
    }

    line(0, 'HEAD'); line(1, 'GEDC'); line(2, 'VERS', '5.5.1'); line(2, 'FORM', 'LINEAGE-LINKED');
    line(1, 'CHAR', 'UTF-8'); line(1, 'LANG', 'Polish');
    line(1, 'SOUR', 'DRZEWO'); line(2, 'NAME', 'Drzewo genealogiczne');
    line(1, 'DATE', `${now.getUTCDate()} ${MON[now.getUTCMonth()]} ${now.getUTCFullYear()}`);

    for (const p of Object.values(model.people)) {
      line(0, 'INDI', null, p.id);
      line(1, 'NAME', `${p.given} /${p.surname}/`.trim());
      if (p.given) line(2, 'GIVN', p.given);
      if (p.surname) line(2, 'SURN', p.surname);
      if (p.marriedName) line(2, '_MARNM', p.marriedName);
      line(1, 'SEX', p.sex);
      p.events.forEach((e) => event(e));
      if (p.deceased && !p.events.some((e) => e.type === 'DEAT')) line(1, 'DEAT', 'Y');
      p.famc.forEach((f) => pointer(1, 'FAMC', f));
      p.fams.forEach((f) => pointer(1, 'FAMS', f));
      for (const ph of p.photos) {
        line(1, 'OBJE'); line(2, 'FORM', 'jpg'); line(2, 'FILE', ph.url);
        if (ph.title) line(2, 'TITL', ph.title);
        if (ph.primary) line(2, '_PRIM', 'Y');
      }
      for (const s of p.sources) { pointer(1, 'SOUR', s.sourceId); if (s.page) line(2, 'PAGE', s.page); }
      p.notes.forEach((n) => line(1, 'NOTE', n));
      (p.memories || []).forEach((n) => line(1, 'NOTE', G.MEMORY_PREFIX + n));
    }
    for (const f of Object.values(model.families)) {
      line(0, 'FAM', null, f.id);
      if (f.husb) pointer(1, 'HUSB', f.husb);
      if (f.wife) pointer(1, 'WIFE', f.wife);
      f.children.forEach((c) => pointer(1, 'CHIL', c));
      f.events.forEach((e) => event(e));
      f.notes.forEach((n) => line(1, 'NOTE', n));
    }
    for (const s of Object.values(model.sources)) {
      line(0, 'SOUR', null, s.id);
      if (s.title) line(1, 'TITL', s.title);
      if (s.author) line(1, 'AUTH', s.author);
      if (s.text) line(1, 'TEXT', s.text);
    }
    line(0, 'TRLR');
    return out.join('\r\n') + '\r\n';
  }

  return { toGedcom };
});
```
- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/`
Expected: PASS (wszystkie, łącznie z `parse.test.js` po zmianie `memories`).

- [ ] **Step 5: Commit**

```bash
git add js/gedcom-export.js js/gedcom-parse.js tests/export.test.js
git commit -m "Eksport GEDCOM z round-tripem i wspomnieniami jako NOTE

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Store – dane, nakładka zmian, edycja, undo (`js/store.js`)

**Files:**
- Create: `js/store.js`, `tests/store.test.js`

**Interfaces:**
- Consumes: `parseGedcom`, `finalizeModel`, `toGedcom`, `relations.descendantsOf`
- Produces `Drzewo.createStore({ baseText: string, storage: Storage-like|null }) → store`:
  - `store.model: Model` (getter; scalone dane bazowe + nakładka; obiekt tylko do odczytu)
  - `store.subscribe(fn: (model, change: {type: string}) => void) → unsubscribe`
  - `store.newId(prefix: 'I'|'F'|'story'|'doc') → string`
  - `store.savePerson(person)`, `store.deletePerson(id)`
  - `store.saveFamily(family)`, `store.deleteFamily(id)`
  - `store.linkParent(childId, parentId)`, `store.linkSpouse(aId, bId) → familyId`, `store.linkChild(parentId, childId, spouseId = null)`, `store.unlink(familyId, personId)`
  - `store.items(kind: 'story'|'document') → Item[]` (od najnowszych), `store.saveItem(item)`, `store.deleteItem(id)`
  - `store.undo() → boolean`, `store.canUndo → boolean`, `store.hasChanges → boolean`, `store.persistent → boolean` (false, gdy storage nie działa)
  - `store.importGedcom(text)` (podmienia dane bazowe, zachowuje nakładkę), `store.resetToFile()` (czyści nakładkę i import)
  - `store.exportGedcom() → string`, `store.exportJson() → string`, `store.importJson(text)`
  - Błędy operacji: `Error` z polskim komunikatem (np. cykl). Błąd zapisu: `store.persistent = false` + zdarzenie `{type:'storage-error'}`.
- Klucze storage: `drzewo:overlay:v1`, `drzewo:base:v1`. Zaimportowany GEDCOM (ok. 80 KB) trzymamy w localStorage, a nie w IndexedDB, jak mówił spec: jest synchroniczny i wystarcza dla tej wielkości. Przekroczenie limitu kończy się zdarzeniem `storage-error` i komunikatem.

- [ ] **Step 1: Napisz testy**

```js
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
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/store.test.js`
Expected: FAIL.

- [ ] **Step 3: Zaimplementuj `js/store.js`**

```js
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
    let base = G.parseGedcom(importedText || baseText);
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
        if (childId === parentId) throw new Error('Nie można: to ta sama osoba – samą osobą nie da się połączyć.');
        must(childId); const parent = must(parentId);
        if (R.descendantsOf(model, childId).has(parentId)) throw new Error('Nie można: wybrana osoba jest potomkiem tego dziecka.');
        const slot = role(parent);
        const existing = model.people[childId].famc.map((f) => model.families[f]).find((f) => !f[slot]);
        commit('family', () => {
          if (existing) putFamily({ ...existing, [slot]: parentId });
          else putFamily({ id: newId('F'), husb: null, wife: null, [slot]: parentId, children: [childId], events: [], notes: [] });
        });
      },
      linkSpouse(aId, bId) {
        const a = must(aId), b = must(bId);
        if (aId === bId) throw new Error('Nie można: to ta sama osoba – samą osobą nie da się połączyć.');
        const same = model.people[aId].fams.map((f) => model.families[f]).find((f) => [f.husb, f.wife].includes(bId));
        if (same) return same.id;
        const [h, w] = role(a) === 'wife' || (role(a) === role(b) && a.sex === 'F') ? [b, a] : [a, b];
        const open = model.people[h.id].fams.map((f) => model.families[f]).find((f) => !f.wife)
          || model.people[w.id].fams.map((f) => model.families[f]).find((f) => !f.husb);
        const fam = open ? { ...open, husb: h.id, wife: w.id } : { id: newId('F'), husb: h.id, wife: w.id, children: [], events: [], notes: [] };
        commit('family', () => putFamily(fam));
        return fam.id;
      },
      linkChild(parentId, childId, spouseId = null) {
        must(childId); must(parentId);
        if (childId === parentId) throw new Error('Nie można: to ta sama osoba – samą osobą nie da się połączyć.');
        if (R.descendantsOf(model, childId).has(parentId)) throw new Error('Nie można: wybrana osoba jest potomkiem tego dziecka.');
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
        commit('import', () => {
          importedText = data.baseText || null; base = G.parseGedcom(importedText || baseText);
          overlay = { ...emptyOverlay(), ...data.overlay };
          write(K_BASE, importedText);
        });
      },
    };
    return api;
  }

  return { createStore };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/`
Expected: PASS (wszystkie).

- [ ] **Step 5: Commit**

```bash
git add js/store.js tests/store.test.js
git commit -m "Store: nakładka zmian, edycja relacji, undo, import/eksport

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: Selektory dla widoków (`js/selectors.js`)

**Files:**
- Create: `js/selectors.js`, `tests/selectors.test.js`

**Interfaces:**
- Consumes: `person`, `relations`, `places`
- Produces `Drzewo.selectors`:
  - `EVENT_LABEL: {[type]: string}` (np. `BIRT: 'Narodziny'`), `HISTORY: [{year, label}]`
  - `stats(m) → { people, families, generations, firstYear|null, lastYear|null, surnames }`
  - `timeline(m) → TimelineEvent[]`, gdzie `TimelineEvent = { key, kind: 'birth'|'death'|'marriage', type, label, date: DateInfo, place, note, personIds: string[], familyId? }` posortowane po `date.sortKey`
  - `groupByDecade(events, history = HISTORY) → [{ decade, events, history }]`
  - `placeIndex(m, coords = {}) → [{ name, coords: [lat,lng]|null, vague, personIds: string[], events: [{type, label, date, personIds}] }]` (malejąco po liczbie zdarzeń)
  - `surnames(m) → [{ name, count }]` (nazwiska rodowe, malejąco)
  - `filterPeople(m, { q, surname, place, status: 'all'|'living'|'deceased', withPhoto, sort: 'surname'|'birth' }) → Person[]`
  - `searchPeople(m, q, limit = 8) → Person[]`
  - `galleryItems(m) → [{ url, title, personId, primary }]`
  - `documentsFromTree(m) → { acts: [{ title, kind, date, place, personIds }], sources: [{ id, title, author, text, personIds }] }`

- [ ] **Step 1: Napisz testy**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/selectors.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const mini = parseGedcom(miniGedcom());
const real = parseGedcom(realGedcom());

test('stats', () => {
  const s = S.stats(real);
  assert.equal(s.people, 209); assert.equal(s.families, 72);
  assert.ok(s.firstYear <= 1822); assert.ok(s.lastYear >= 1977);
  assert.ok(s.surnames > 20);
  assert.equal(S.stats(mini).generations, 4);
});

test('timeline mini: kolejność i ślub z obojgiem małżonków', () => {
  const t = S.timeline(mini);
  assert.deepEqual(t.map((e) => [e.date.year, e.kind]), [[1850, 'birth'], [1875, 'marriage'], [1880, 'birth']]);
  assert.deepEqual(t[1].personIds, ['I1', 'I2']);
  assert.equal(t[1].label, 'Ślub');
});

test('groupByDecade z wydarzeniami historycznymi', () => {
  const g = S.groupByDecade(S.timeline(mini), [{ year: 1877, label: 'X' }, { year: 1999, label: 'Y' }]);
  assert.deepEqual(g.map((x) => x.decade), [1850, 1870, 1880]);
  assert.deepEqual(g[1].history.map((h) => h.label), ['X']);
});

test('placeIndex: scalanie wariantów i współrzędne', () => {
  const idx = S.placeIndex(real, { Kliczewo: [53.05, 20.0] });
  assert.equal(idx[0].name, 'Kliczewo'); assert.deepEqual(idx[0].coords, [53.05, 20.0]);
  const zielona = idx.find((x) => x.name === 'Zielona');
  assert.ok(zielona.events.length >= 16);
  assert.equal(idx.find((x) => x.name === 'Polska').vague, true);
});

test('filterPeople', () => {
  assert.ok(S.filterPeople(mini, { surname: 'Kowal' }).some((p) => p.id === 'I2'), 'Ewa (po mężu Kowal)');
  assert.deepEqual(S.filterPeople(mini, { status: 'deceased' }).map((p) => p.id), ['I1']);
  assert.equal(S.filterPeople(mini, { sort: 'birth' })[0].id, 'I1');
  const z = S.filterPeople(real, { q: 'zuromin' });
  assert.ok(z.length > 3);
  assert.ok(S.filterPeople(real, { withPhoto: true }).every((p) => p.photos.length));
  assert.ok(S.filterPeople(real, { place: 'Zielona' }).length >= 10);
});

test('searchPeople', () => {
  assert.deepEqual(S.searchPeople(mini, ''), []);
  assert.equal(S.searchPeople(real, 'irena dom')[0].id, 'I500002');
  assert.equal(S.searchPeople(real, 'IRENA DOBIES')[0].id, 'I500002');
  assert.ok(S.searchPeople(mini, 'kow').length >= 5);
  assert.ok(S.searchPeople(real, 'a', 5).length <= 5);
});

test('galeria i dokumenty', () => {
  assert.equal(S.galleryItems(real).length, 19);
  const d = S.documentsFromTree(real);
  assert.ok(d.acts.some((a) => a.title === 'Akt nr.27/1908'));
  assert.ok(d.acts.some((a) => a.title === 'Akt prawny 37/1892'));
  assert.equal(d.sources.length, 1);
  assert.equal(d.sources[0].personIds.length, 34);
});
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/selectors.test.js`
Expected: FAIL.

- [ ] **Step 3: Zaimplementuj**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).selectors = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const P = node ? require('./person.js') : root.Drzewo.person;
  const R = node ? require('./relations.js') : root.Drzewo.relations;
  const PL = node ? require('./places.js') : root.Drzewo.places;

  const EVENT_LABEL = { BIRT: 'Narodziny', CHR: 'Chrzest', BAPM: 'Chrzest', DEAT: 'Śmierć', BURI: 'Pogrzeb',
    MARR: 'Ślub', MARL: 'Zapowiedzi', ENGA: 'Zaręczyny', DIV: 'Rozwód', RESI: 'Zamieszkanie', OCCU: 'Zawód', EVEN: 'Wydarzenie' };
  const KIND = { BIRT: 'birth', CHR: 'birth', BAPM: 'birth', DEAT: 'death', BURI: 'death', MARR: 'marriage', MARL: 'marriage', ENGA: 'marriage' };
  const HISTORY = [
    { year: 1863, label: 'Powstanie styczniowe' },
    { year: 1914, label: 'Wybuch I wojny światowej' },
    { year: 1918, label: 'Odzyskanie niepodległości' },
    { year: 1939, label: 'Wybuch II wojny światowej' },
    { year: 1945, label: 'Koniec II wojny światowej' },
  ];
  const people = (m) => Object.values(m.people);
  const families = (m) => Object.values(m.families);
  const cmpName = (a, b) => P.displayName(a).localeCompare(P.displayName(b), 'pl');

  function stats(m) {
    const years = [...people(m), ...families(m)].flatMap((x) => x.events).map((e) => e.date && e.date.year).filter(Boolean);
    return {
      people: people(m).length,
      families: families(m).length,
      generations: R.generationCount(m),
      firstYear: years.length ? Math.min(...years) : null,
      lastYear: years.length ? Math.max(...years) : null,
      surnames: new Set(people(m).map((p) => p.surname).filter(Boolean)).size,
    };
  }

  function timeline(m) {
    const out = [];
    const push = (e, personIds, extra) => {
      const kind = KIND[e.type];
      if (!kind || !e.date || !e.date.year) return;
      out.push({ key: `${personIds.join('+')}:${e.type}:${e.date.raw}`, kind, type: e.type, label: EVENT_LABEL[e.type],
        date: e.date, place: e.place, note: e.note, personIds, ...extra });
    };
    for (const p of people(m)) for (const e of p.events) push(e, [p.id], {});
    for (const f of families(m)) for (const e of f.events) push(e, [f.husb, f.wife].filter(Boolean), { familyId: f.id });
    return out.sort((a, b) => a.date.sortKey - b.date.sortKey || a.label.localeCompare(b.label, 'pl'));
  }

  function groupByDecade(events, history = HISTORY) {
    const groups = new Map();
    for (const e of events) {
      const d = Math.floor(e.date.year / 10) * 10;
      if (!groups.has(d)) groups.set(d, { decade: d, events: [], history: [] });
      groups.get(d).events.push(e);
    }
    for (const h of history) { const g = groups.get(Math.floor(h.year / 10) * 10); if (g) g.history.push(h); }
    return [...groups.values()].sort((a, b) => a.decade - b.decade);
  }

  function placeIndex(m, coords = {}) {
    const map = new Map();
    const add = (e, ids) => {
      const name = PL.normalizePlace(e.place);
      if (!name) return;
      if (!map.has(name)) map.set(name, { name, coords: coords[name] || null, vague: PL.isVague(name), personIds: new Set(), events: [] });
      const x = map.get(name);
      ids.forEach((i) => x.personIds.add(i));
      x.events.push({ type: e.type, label: EVENT_LABEL[e.type] || e.type, date: e.date, personIds: ids });
    };
    for (const p of people(m)) for (const e of p.events) add(e, [p.id]);
    for (const f of families(m)) for (const e of f.events) add(e, [f.husb, f.wife].filter(Boolean));
    return [...map.values()].map((x) => ({ ...x, personIds: [...x.personIds] }))
      .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name, 'pl'));
  }

  function surnames(m) {
    const c = new Map();
    for (const p of people(m)) if (p.surname) c.set(p.surname, (c.get(p.surname) || 0) + 1);
    return [...c].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pl'));
  }

  function filterPeople(m, { q = '', surname = '', place = '', status = 'all', withPhoto = false, sort = 'surname' } = {}) {
    const words = P.fold(q).split(/\s+/).filter(Boolean);
    const list = people(m).filter((p) => {
      if (words.length) { const t = P.searchText(p); if (!words.every((w) => t.includes(w))) return false; }
      if (surname && p.surname !== surname && p.marriedName !== surname) return false;
      if (place && !p.events.some((e) => PL.normalizePlace(e.place) === place)) return false;
      if (status === 'living' && !P.isLiving(p)) return false;
      if (status === 'deceased' && !p.deceased) return false;
      if (withPhoto && !p.photos.length) return false;
      return true;
    });
    const bySurname = (a, b) => (a.surname || '').localeCompare(b.surname || '', 'pl') || cmpName(a, b);
    const byBirth = (a, b) => (P.birthYear(a) || 9999) - (P.birthYear(b) || 9999) || cmpName(a, b);
    return list.sort(sort === 'birth' ? byBirth : bySurname);
  }

  function searchPeople(m, q, limit = 8) {
    const words = P.fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored = [];
    for (const p of people(m)) {
      const name = P.fold(`${P.displayName(p)} ${p.surname || ''}`);
      let score = -1;
      if (words.every((w) => name.includes(w))) score = name.startsWith(words[0]) ? 0 : 1;
      else if (words.every((w) => P.searchText(p).includes(w))) score = 2;
      if (score >= 0) scored.push({ p, score });
    }
    return scored.sort((a, b) => a.score - b.score || cmpName(a.p, b.p)).slice(0, limit).map((x) => x.p);
  }

  const galleryItems = (m) => people(m).sort(cmpName).flatMap((p) => p.photos.map((ph) =>
    ({ url: ph.url, title: ph.title || P.displayName(p), personId: p.id, primary: ph.primary })));

  function documentsFromTree(m) {
    const acts = [];
    const isAct = (s) => !!s && /akt/i.test(s);
    const scan = (e, ids) => {
      const title = isAct(e.typeLabel) ? e.typeLabel : isAct(e.note) ? e.note : null;
      if (title) acts.push({ title, kind: EVENT_LABEL[e.type] || e.type, date: e.date, place: e.place, personIds: ids });
    };
    for (const p of people(m)) p.events.forEach((e) => scan(e, [p.id]));
    for (const f of families(m)) f.events.forEach((e) => scan(e, [f.husb, f.wife].filter(Boolean)));
    acts.sort((a, b) => ((a.date && a.date.sortKey) || 0) - ((b.date && b.date.sortKey) || 0));
    const sources = Object.values(m.sources).map((s) => ({ ...s,
      personIds: people(m).filter((p) => p.sources.some((x) => x.sourceId === s.id)).map((p) => p.id) }));
    return { acts, sources };
  }

  return { EVENT_LABEL, HISTORY, stats, timeline, groupByDecade, placeIndex, surnames, filterPeople, searchPeople,
    galleryItems, documentsFromTree };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/`
Expected: PASS. Jeśli `zielona.events.length` < 16, wypisz `placeIndex(real).map(x=>[x.name,x.events.length])` i sprawdź normalizację (Task 6).

- [ ] **Step 5: Commit**

```bash
git add js/selectors.js tests/selectors.test.js
git commit -m "Selektory: statystyki, oś czasu, miejsca, filtrowanie, wyszukiwanie

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Układ drzewa w ELK (`js/tree-layout.js`)

**Files:**
- Create: `js/tree-layout.js`, `tests/layout.test.js`

**Interfaces:**
- Consumes: `Model`, globalny `ELK` (przeglądarka) albo `require('../vendor/elk.bundled.js')` (testy)
- Produces `Drzewo.treeLayout`:
  - `CARD_W = 210`, `CARD_H = 76`, `FAM_SIZE = 12`
  - `buildElkGraph(m) → ElkGraph` (węzły `p:<id>` i `f:<id>`)
  - `relationHash(m) → string`
  - `layoutTree(m, { ELK, storage = null }) → Promise<Layout>`
  - `Layout = { nodes: {[nodeId]: { id, kind: 'person'|'family', x, y, w, h }}, edges: [{ id, from, to, points: [[x,y], …] }], width, height }`
  - Cache: `storage` (`getItem`/`setItem`/`removeItem`/`length`/`key`) pod kluczem `drzewo:layout:v1:<hash>`. Starsze klucze `drzewo:layout:` są usuwane.

- [ ] **Step 1: Napisz testy**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const ELK = require('../vendor/elk.bundled.js');
const L = require('../js/tree-layout.js');
const { parseGedcom } = require('../js/gedcom-parse.js');
const { miniGedcom, realGedcom } = require('./helpers');

const mini = parseGedcom(miniGedcom());
function memStorage() {
  const d = new Map();
  return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k),
    get length() { return d.size; }, key: (i) => [...d.keys()][i] ?? null };
}

test('buildElkGraph: węzły i krawędzie', () => {
  const g = L.buildElkGraph(mini);
  assert.equal(g.children.filter((n) => n.id.startsWith('p:')).length, 15);
  assert.equal(g.children.filter((n) => n.id.startsWith('f:')).length, 6);
  assert.equal(g.edges.length, 20);
  const ids = g.children.map((n) => n.id);
  assert.equal(ids.indexOf('p:I2'), ids.indexOf('p:I1') + 1, 'małżonkowie obok siebie w kolejności modelu');
});

test('rodzina bez nikogo jest pomijana', () => {
  const m = structuredClone(mini);
  m.families.F99 = { id: 'F99', husb: null, wife: null, children: [], events: [], notes: [] };
  assert.ok(!L.buildElkGraph(m).children.some((n) => n.id === 'f:F99'));
});

test('układ prawdziwych danych: wszyscy, bez nakładania, małżonkowie w jednym rzędzie', async () => {
  const real = parseGedcom(realGedcom());
  const t0 = Date.now();
  const res = await L.layoutTree(real, { ELK });
  const ms = Date.now() - t0;
  const cards = Object.values(res.nodes).filter((n) => n.kind === 'person');
  assert.equal(cards.length, 209);
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const a = cards[i], b = cards[j];
    const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    assert.ok(!overlap, `${a.id} nachodzi na ${b.id}`);
  }
  const couples = Object.values(real.families).filter((f) => f.husb && f.wife);
  const sameRow = couples.filter((f) => res.nodes['p:' + f.husb].y === res.nodes['p:' + f.wife].y).length;
  console.log(`layout: ${ms} ms, ${res.width}×${res.height}, małżonkowie w rzędzie: ${sameRow}/${couples.length}`);
  assert.ok(sameRow / couples.length >= 0.9, `${sameRow}/${couples.length}`);
  assert.ok(res.edges.every((e) => e.points.length >= 2));
  assert.ok(ms < 15000);
});

test('cache: drugi raz bez liczenia, inny hash po zmianie relacji', async () => {
  const st = memStorage();
  const a = await L.layoutTree(mini, { ELK, storage: st });
  const b = await L.layoutTree(mini, { ELK: function () { throw new Error('nie powinno liczyć'); }, storage: st });
  assert.deepEqual(b, a);
  const m2 = structuredClone(mini); m2.families.F5.wife = 'I7';
  assert.notEqual(L.relationHash(m2), L.relationHash(mini));
  const renamed = structuredClone(mini); renamed.people.I1.given = 'Inne imię';
  assert.equal(L.relationHash(renamed), L.relationHash(mini));
});
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/layout.test.js`
Expected: FAIL (`Cannot find module '../js/tree-layout.js'`).

- [ ] **Step 3: Zaimplementuj**

```js
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.Drzewo = root.Drzewo || {}).treeLayout = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const CARD_W = 210, CARD_H = 76, FAM_SIZE = 12;
  const PREFIX = 'drzewo:layout:';
  const OPTIONS = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.nodeNodeBetweenLayers': '36',
    'elk.spacing.nodeNode': '28',
    'elk.layered.spacing.edgeNodeBetweenLayers': '14',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.separateConnectedComponents': 'true',
    'elk.spacing.componentComponent': '80',
  };

  function buildElkGraph(m) {
    const children = [], edges = [], seen = new Set();
    const addPerson = (id) => { if (!id || seen.has(id) || !m.people[id]) return; seen.add(id); children.push({ id: 'p:' + id, width: CARD_W, height: CARD_H }); };
    for (const f of Object.values(m.families)) {
      if (!f.husb && !f.wife && !f.children.length) continue;
      addPerson(f.husb); addPerson(f.wife);
      children.push({ id: 'f:' + f.id, width: FAM_SIZE, height: FAM_SIZE });
      for (const s of [f.husb, f.wife]) if (s) edges.push({ id: `e:${s}>${f.id}`, sources: ['p:' + s], targets: ['f:' + f.id] });
      for (const c of f.children) edges.push({ id: `e:${f.id}>${c}`, sources: ['f:' + f.id], targets: ['p:' + c] });
    }
    for (const id of Object.keys(m.people)) addPerson(id);
    return { id: 'root', layoutOptions: OPTIONS, children, edges };
  }

  function relationHash(m) {
    const s = Object.values(m.families).map((f) => `${f.id}:${f.husb || ''}:${f.wife || ''}:${f.children.join(',')}`).sort().join('|')
      + '#' + Object.keys(m.people).sort().join(',') + '#' + CARD_W + 'x' + CARD_H;
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36);
  }

  function fromElk(res) {
    const nodes = {};
    for (const n of res.children) {
      nodes[n.id] = { id: n.id.slice(2), kind: n.id[0] === 'p' ? 'person' : 'family', x: Math.round(n.x), y: Math.round(n.y), w: n.width, h: n.height };
    }
    const edges = (res.edges || []).map((e) => {
      const sec = (e.sections || [])[0];
      const pts = sec ? [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint].map((p) => [Math.round(p.x), Math.round(p.y)]) : [];
      return { id: e.id, from: e.sources[0], to: e.targets[0], points: pts };
    });
    return { nodes, edges, width: Math.ceil(res.width), height: Math.ceil(res.height) };
  }

  async function layoutTree(m, { ELK, storage = null } = {}) {
    const key = PREFIX + 'v1:' + relationHash(m);
    if (storage) { try { const c = storage.getItem(key); if (c) return JSON.parse(c); } catch { /* brak cache */ } }
    const res = fromElk(await new ELK().layout(buildElkGraph(m)));
    if (storage) {
      try {
        for (let i = storage.length - 1; i >= 0; i--) { const k = storage.key(i); if (k && k.startsWith(PREFIX) && k !== key) storage.removeItem(k); }
        storage.setItem(key, JSON.stringify(res));
      } catch { /* cache jest opcjonalny */ }
    }
    return res;
  }

  return { CARD_W, CARD_H, FAM_SIZE, buildElkGraph, relationHash, layoutTree };
});
```

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/layout.test.js`
Expected: PASS i linia `layout: … ms, …, małżonkowie w rzędzie: X/67`.
Jeśli współczynnik małżonków < 0.9: (1) dodaj do `OPTIONS` `'elk.layered.crossingMinimization.forceNodeModelOrder': 'true'` i uruchom ponownie. (2) Jeśli nadal < 0.9, dodaj `'elk.layered.layering.strategy': 'NETWORK_SIMPLEX'` i `'elk.layered.nodePlacement.favorStraightEdges': 'false'`. (3) Jeśli nadal < 0.9, zatrzymaj się, zgłoś status BLOCKED z wartością i nie obniżaj progu.

- [ ] **Step 5: Commit**

```bash
git add js/tree-layout.js tests/layout.test.js
git commit -m "Układ drzewa: graf ELK osób i rodzin z cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 11: Szkielet aplikacji – HTML, style, util, router, modal, start

**Files:**
- Create: `index.html`, `css/tokens.css`, `css/base.css`, `css/components.css`, `js/util.js`, `js/router.js`, `js/ui-modal.js`, `js/app.js`

**Interfaces:**
- Consumes: wszystkie moduły z Task 2–10, `window.DRZEWO_GEDCOM`, `window.DRZEWO_PHOTOS`
- Produces:
  - `Drzewo.util`: `$`, `$$`, `h` (tagged template → `Raw`, escapuje wartości), `raw(html) → Raw`, `icon(name) → Raw`, `plural(n, one, few, many) → string`, `photoSrc(url)`, `avatar(p, cls = 'avatar') → Raw`, `personCard(p, { sub, attrs } = {}) → Raw`, `toast(msg, { actionLabel, onAction, timeout })`, `download(name, text, mime)`, `debounce(fn, ms)`, `selection` (`get()`, `set(id, {center})`, `subscribe(fn(id, opts))`), `prefs` (`get(key, def)`, `set(key, val)` pod `drzewo:<key>`), `reduceMotion()`
  - `Drzewo.router`: `start()`, `go(hash)`, `back()`, `showView(slug, param)`, `view` (nazwa aktywnego widoku), `isMounted(name)`. Trasy: `#/drzewo`, `#/osoby`, `#/os-czasu`, `#/miejsca[/<nazwa>]`, `#/galeria`, `#/historie`, `#/osoba/<id>`
  - Kontrakt widoku: `Drzewo.views[name] = { mount(el), show(param), update(model, change) }`, gdzie `name ∈ tree|people|timeline|places|gallery|stories`
  - `Drzewo.modal`: `open({ title, body: Raw|string, actions: [{ label, value, kind }], onMount(el), onAction(value, el) → false (zostaw otwarty) | undefined (zwróć value) | wynik (zwróć wynik) }) → Promise<value|wynik|null>`, `confirm(message, { title, ok, danger }) → Promise<boolean>`
  - `Drzewo.store` (instancja z `createStore`), utworzona w `app.js`
  - Ikony: sprite `<symbol id="i-<name>">` w `index.html`. Nazwy: `tree people timeline map photo book search plus minus fit me edit close undo download upload more moon chev-left chev-right trash link minimap`

- [ ] **Step 1: `css/tokens.css`**

```css
:root {
  --bg: #f6f7f9; --surface: #ffffff; --surface-2: #f0f2f5; --border: #e3e6ea;
  --text: #1d2329; --text-2: #4f5963; --text-3: #5f6973;
  --accent: #2f7d4f; --accent-strong: #236140; --accent-soft: #e5f2ea; --on-accent: #ffffff;
  --male: #3b7fc4; --male-soft: #e8f1fa; --female: #c9507a; --female-soft: #fbe9f0; --unknown: #8f99a3; --unknown-soft: #eef0f2;
  --danger: #b4372b; --focus: #2f7d4f;
  --shadow-1: 0 1px 2px rgb(16 24 32 / .06), 0 1px 3px rgb(16 24 32 / .08);
  --shadow-2: 0 10px 30px rgb(16 24 32 / .14);
  --radius: 14px; --radius-sm: 10px;
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; --fs: 16px;
  --topbar-h: 64px; --tabbar-h: 64px; --drawer-w: 440px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #12161a; --surface: #1b2127; --surface-2: #232a31; --border: #2e363e;
    --text: #e8ecef; --text-2: #b3bcc4; --text-3: #8d98a2;
    --accent: #4fb37a; --accent-strong: #6cc896; --accent-soft: #1d3327; --on-accent: #0c1a12;
    --male: #6ea9e0; --male-soft: #1a2a39; --female: #e47fa2; --female-soft: #3a2230; --unknown: #96a0a9; --unknown-soft: #262d34;
    --danger: #ef7d70; --focus: #6cc896;
    --shadow-1: 0 1px 2px rgb(0 0 0 / .4); --shadow-2: 0 10px 30px rgb(0 0 0 / .5);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #12161a; --surface: #1b2127; --surface-2: #232a31; --border: #2e363e;
  --text: #e8ecef; --text-2: #b3bcc4; --text-3: #8d98a2;
  --accent: #4fb37a; --accent-strong: #6cc896; --accent-soft: #1d3327; --on-accent: #0c1a12;
  --male: #6ea9e0; --male-soft: #1a2a39; --female: #e47fa2; --female-soft: #3a2230; --unknown: #96a0a9; --unknown-soft: #262d34;
  --danger: #ef7d70; --focus: #6cc896;
  --shadow-1: 0 1px 2px rgb(0 0 0 / .4); --shadow-2: 0 10px 30px rgb(0 0 0 / .5);
  color-scheme: dark;
}
```

- [ ] **Step 2: `css/base.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font: 400 var(--fs)/1.5 var(--font); -webkit-font-smoothing: antialiased; }
body.modal-open { overflow: hidden; }
img { max-width: 100%; display: block; }
button, input, select, textarea { font: inherit; color: inherit; }
a { color: var(--accent-strong); }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
[hidden] { display: none !important; }
.i { width: 20px; height: 20px; flex: none; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.visually-hidden { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.skip-link { position: absolute; left: -999px; top: 8px; z-index: 100; background: var(--surface); padding: 8px 12px; border-radius: 8px; }
.skip-link:focus { left: 8px; }

.topbar { position: sticky; top: 0; z-index: 40; height: var(--topbar-h); display: flex; align-items: center; gap: 24px; padding: 0 20px; background: var(--surface); border-bottom: 1px solid var(--border); }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--text); min-width: 0; }
.brand-mark { width: 38px; height: 38px; border-radius: 11px; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; flex: none; }
.brand-text { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.brand-text strong { font-size: 16px; font-weight: 700; }
.brand-text small { font-size: 12px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mainnav { display: flex; gap: 2px; height: 100%; }
.mainnav a { display: flex; align-items: center; padding: 0 12px; color: var(--text-2); text-decoration: none; font-weight: 500; font-size: 15px; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.mainnav a:hover { color: var(--text); }
.mainnav a[aria-current="page"] { color: var(--accent-strong); border-bottom-color: var(--accent); }
.top-actions { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.search-trigger { display: flex; align-items: center; gap: 8px; height: 42px; min-width: 230px; padding: 0 10px 0 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-3); cursor: pointer; }
.search-trigger:hover { border-color: var(--text-3); }
.search-trigger kbd { margin-left: auto; font: 12px var(--font); border: 1px solid var(--border); border-radius: 6px; padding: 1px 6px; background: var(--surface); }

.icon-btn { width: 44px; height: 44px; display: inline-grid; place-items: center; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--text-2); cursor: pointer; }
.icon-btn:hover { background: var(--surface-2); color: var(--text); }
.icon-btn[aria-pressed="true"] { color: var(--accent-strong); background: var(--accent-soft); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-weight: 600; font-size: 15px; cursor: pointer; text-decoration: none; white-space: nowrap; }
.btn:hover { background: var(--surface-2); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.btn-primary:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
.btn-danger { color: var(--danger); }
.btn-sm { min-height: 36px; padding: 0 12px; font-size: 14px; }
.btn[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-strong); }

main { min-height: calc(100vh - var(--topbar-h)); }
main:focus { outline: none; }
[data-view] { padding: 28px 20px 56px; max-width: 1240px; margin: 0 auto; }
[data-view="tree"] { max-width: none; padding: 0; height: calc(100vh - var(--topbar-h)); }
.page-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.page-head h1 { margin: 0; font-size: 28px; line-height: 1.2; font-weight: 700; letter-spacing: -.01em; }
.page-head p { margin: 4px 0 0; color: var(--text-2); }
.toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 20px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field > span { font-size: 14px; font-weight: 600; color: var(--text-2); }
.field small { color: var(--text-3); font-size: 13px; }
.input, .select { min-height: 44px; padding: 9px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); }
textarea.input { min-height: 96px; resize: vertical; line-height: 1.5; }
.input:focus, .select:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-2); font-weight: 500; cursor: pointer; }
.chip[aria-pressed="true"] { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-strong); }
.empty-state { text-align: center; padding: 56px 20px; color: var(--text-2); max-width: 520px; margin: 0 auto; }
.empty-state h2 { color: var(--text); margin: 0 0 8px; font-size: 20px; }
.muted { color: var(--text-3); }
.card-surface { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-1); }
.tabbar { display: none; }

@media (max-width: 900px) {
  .mainnav { display: none; }
  .topbar { gap: 10px; padding: 0 12px; }
  .brand-text small { display: none; }
  .search-trigger { min-width: 0; width: 44px; padding: 0; justify-content: center; }
  .search-trigger-text, .search-trigger kbd { display: none; }
  .tabbar { display: grid; grid-template-columns: repeat(6, 1fr); position: fixed; bottom: 0; left: 0; right: 0; z-index: 40; height: calc(var(--tabbar-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); background: var(--surface); border-top: 1px solid var(--border); }
  .tabbar a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 11px; font-weight: 600; color: var(--text-3); text-decoration: none; min-width: 0; }
  .tabbar a[aria-current="page"] { color: var(--accent-strong); }
  main { padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom)); }
  [data-view] { padding: 20px 16px 32px; }
  [data-view="tree"] { padding: 0; height: calc(100dvh - var(--topbar-h) - var(--tabbar-h) - env(safe-area-inset-bottom)); }
  .page-head h1 { font-size: 24px; }
}
@media (max-width: 420px) { .brand-text { display: none; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

- [ ] **Step 3: `css/components.css` (części wspólne; kolejne taski dopisują swoje sekcje na końcu)**

```css
/* ── Awatar i karta osoby ── */
.avatar { position: relative; width: 44px; height: 44px; flex: none; border-radius: 50%; display: grid; place-items: center; overflow: hidden; font-weight: 700; font-size: 15px; background: var(--unknown-soft); color: var(--unknown); }
.avatar.sex-M { background: var(--male-soft); color: var(--male); }
.avatar.sex-F { background: var(--female-soft); color: var(--female); }
.avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.avatar-xl { width: 96px; height: 96px; font-size: 32px; box-shadow: 0 0 0 4px var(--surface); }
.person-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px 12px 16px; min-height: 68px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); text-decoration: none; position: relative; overflow: hidden; transition: border-color .15s, box-shadow .15s, transform .15s; }
.person-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--unknown); }
.person-card.sex-M::before { background: var(--male); }
.person-card.sex-F::before { background: var(--female); }
.person-card:hover { border-color: var(--text-3); box-shadow: var(--shadow-1); transform: translateY(-1px); }
.pc-body { display: flex; flex-direction: column; min-width: 0; }
.pc-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-sub, .pc-years { font-size: 14px; color: var(--text-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.person-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }

/* ── Toast ── */
.toast { position: fixed; left: 50%; bottom: 24px; z-index: 90; transform: translate(-50%, 20px); opacity: 0; pointer-events: none; display: flex; align-items: center; gap: 14px; max-width: min(560px, calc(100vw - 32px)); padding: 12px 16px; border-radius: var(--radius-sm); background: #1d2329; color: #fff; box-shadow: var(--shadow-2); transition: opacity .2s, transform .2s; }
.toast.show { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
.toast button { border: 0; background: none; color: #8fe0b0; font-weight: 700; cursor: pointer; min-height: 36px; }
@media (max-width: 900px) { .toast { bottom: calc(var(--tabbar-h) + 16px + env(safe-area-inset-bottom)); } }

/* ── Modal ── */
.modal-backdrop { position: fixed; inset: 0; z-index: 70; background: rgb(10 14 18 / .55); display: grid; place-items: center; padding: 16px; }
.modal { width: min(640px, 100%); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-2); }
.modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 16px 8px 24px; }
.modal-head h2 { margin: 0; font-size: 20px; }
.modal-body { padding: 8px 24px 16px; overflow: auto; }
.modal-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding: 16px 24px 20px; border-top: 1px solid var(--border); }
.modal-foot .btn-danger:first-child { margin-right: auto; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid .full { grid-column: 1 / -1; }
@media (max-width: 600px) { .modal-backdrop { place-items: end stretch; padding: 0; } .modal { width: 100%; border-radius: var(--radius) var(--radius) 0 0; } .form-grid { grid-template-columns: 1fr; } }

/* ── Ładowanie i błąd startu ── */
.spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid var(--border); border-top-color: var(--accent); animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
```

- [ ] **Step 4: `index.html`**

```html
<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Drzewo rodziny</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="vendor/leaflet.css">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
</head>
<body>
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <symbol id="i-tree" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5V12M5 16.5V12h14v4.5"/></symbol>
    <symbol id="i-people" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.2c2.8.3 5 2.4 5 5.3"/></symbol>
    <symbol id="i-timeline" viewBox="0 0 24 24"><path d="M12 3v18"/><circle cx="12" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M14 7h6M4 17h6"/></symbol>
    <symbol id="i-map" viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></symbol>
    <symbol id="i-photo" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 16l-5-5-8 8"/></symbol>
    <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
    <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
    <symbol id="i-fit" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></symbol>
    <symbol id="i-me" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/></symbol>
    <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
    <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></symbol>
    <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></symbol>
    <symbol id="i-chev-left" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></symbol>
    <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></symbol>
    <symbol id="i-link" viewBox="0 0 24 24"><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1"/></symbol>
    <symbol id="i-minimap" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="7" height="6" rx="1"/></symbol>
  </svg>
  <a class="skip-link" href="#app-main">Przejdź do treści</a>

  <header class="topbar">
    <a class="brand" href="#/drzewo">
      <span class="brand-mark"><svg class="i" aria-hidden="true"><use href="#i-tree"/></svg></span>
      <span class="brand-text"><strong>Drzewo rodziny</strong><small>Dobies · Perłowscy · Burczyńscy · Domżalscy</small></span>
    </a>
    <nav class="mainnav" aria-label="Główna nawigacja">
      <a data-nav="drzewo" href="#/drzewo">Drzewo</a>
      <a data-nav="osoby" href="#/osoby">Osoby</a>
      <a data-nav="os-czasu" href="#/os-czasu">Oś czasu</a>
      <a data-nav="miejsca" href="#/miejsca">Miejsca</a>
      <a data-nav="galeria" href="#/galeria">Galeria</a>
      <a data-nav="historie" href="#/historie">Historie</a>
    </nav>
    <div class="top-actions">
      <button class="search-trigger" id="searchOpen" type="button" aria-label="Szukaj osoby">
        <svg class="i" aria-hidden="true"><use href="#i-search"/></svg><span class="search-trigger-text">Szukaj osoby…</span><kbd>⌘K</kbd>
      </button>
      <button class="icon-btn" id="themeToggle" type="button" aria-label="Przełącz tryb jasny/ciemny"><svg class="i" aria-hidden="true"><use href="#i-moon"/></svg></button>
      <div id="editSlot" class="top-actions"></div>
    </div>
  </header>

  <main id="app-main" tabindex="-1">
    <section data-view="tree" aria-label="Drzewo" hidden></section>
    <section data-view="people" aria-label="Osoby" hidden></section>
    <section data-view="timeline" aria-label="Oś czasu" hidden></section>
    <section data-view="places" aria-label="Miejsca" hidden></section>
    <section data-view="gallery" aria-label="Galeria" hidden></section>
    <section data-view="stories" aria-label="Historie i dokumenty" hidden></section>
  </main>

  <nav class="tabbar" aria-label="Nawigacja">
    <a data-nav="drzewo" href="#/drzewo"><svg class="i" aria-hidden="true"><use href="#i-tree"/></svg>Drzewo</a>
    <a data-nav="osoby" href="#/osoby"><svg class="i" aria-hidden="true"><use href="#i-people"/></svg>Osoby</a>
    <a data-nav="os-czasu" href="#/os-czasu"><svg class="i" aria-hidden="true"><use href="#i-timeline"/></svg>Oś czasu</a>
    <a data-nav="miejsca" href="#/miejsca"><svg class="i" aria-hidden="true"><use href="#i-map"/></svg>Miejsca</a>
    <a data-nav="galeria" href="#/galeria"><svg class="i" aria-hidden="true"><use href="#i-photo"/></svg>Galeria</a>
    <a data-nav="historie" href="#/historie"><svg class="i" aria-hidden="true"><use href="#i-book"/></svg>Historie</a>
  </nav>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>

  <script src="vendor/d3.min.js"></script>
  <script src="vendor/elk.bundled.js"></script>
  <script src="vendor/leaflet.js"></script>
  <script src="data/rodzina.js"></script>
  <script src="data/photos.js"></script>
  <script src="data/places.js"></script>
  <script src="js/gedcom-date.js"></script>
  <script src="js/person.js"></script>
  <script src="js/gedcom-parse.js"></script>
  <script src="js/gedcom-export.js"></script>
  <script src="js/relations.js"></script>
  <script src="js/places.js"></script>
  <script src="js/selectors.js"></script>
  <script src="js/store.js"></script>
  <script src="js/tree-layout.js"></script>
  <script src="js/util.js"></script>
  <script src="js/router.js"></script>
  <script src="js/ui-modal.js"></script>
  <!-- tu kolejne taski dopisują: ui-*.js, view-*.js -->
  <script src="js/app.js"></script>
</body>
</html>
```
Zasada dla kolejnych tasków: każdy nowy plik `js/ui-*.js` lub `js/view-*.js` dopisuje się linią `<script>` **przed** `js/app.js`, w miejscu komentarza.

- [ ] **Step 5: `js/util.js`**

```js
(function () {
  'use strict';
  const D = (window.Drzewo = window.Drzewo || {});
  const P = D.person;

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(String(s));
  const piece = (v) => (v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(piece).join('') : P.esc(v));
  function h(strings, ...vals) {
    let s = strings[0];
    vals.forEach((v, i) => { s += piece(v) + strings[i + 1]; });
    return new Raw(s);
  }
  const icon = (name) => raw(`<svg class="i" aria-hidden="true"><use href="#i-${name}"/></svg>`);
  function plural(n, one, few, many) {
    if (n === 1) return `${n} ${one}`;
    const d = n % 10, dd = n % 100;
    return `${n} ${d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many}`;
  }

  const photoSrc = (url) => (window.DRZEWO_PHOTOS || {})[url] || url;
  function avatar(p, cls = 'avatar') {
    const ph = P.primaryPhoto(p);
    return h`<span class="${cls} sex-${p.sex}" aria-hidden="true">${P.initials(p)}${ph ? h`<img src="${photoSrc(ph.url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  }
  function personCard(p, { sub = '', attrs = '' } = {}) {
    const maiden = P.maidenName(p);
    const years = P.lifespan(p);
    return h`<a class="person-card sex-${p.sex}" href="#/osoba/${encodeURIComponent(p.id)}" ${raw(attrs)}>
      ${avatar(p)}<span class="pc-body"><span class="pc-name">${P.displayName(p)}</span>
      ${maiden ? h`<span class="pc-sub">z d. ${maiden}</span>` : ''}
      ${years || sub ? h`<span class="pc-years">${[years, sub].filter(Boolean).join(' · ')}</span>` : ''}</span></a>`;
  }

  let toastTimer;
  function toast(msg, { actionLabel = '', onAction = null, timeout = 4000 } = {}) {
    const el = $('#toast');
    el.innerHTML = h`<span>${msg}</span>${actionLabel ? h`<button type="button">${actionLabel}</button>` : ''}`;
    if (actionLabel) $('button', el).onclick = () => { el.classList.remove('show'); onAction && onAction(); };
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), timeout);
  }
  function download(name, text, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const selection = (() => {
    let id = null;
    const ls = new Set();
    return {
      get: () => id,
      set(next, opts = {}) { id = next || null; ls.forEach((f) => f(id, opts)); },
      subscribe(f) { ls.add(f); return () => ls.delete(f); },
    };
  })();
  const prefs = {
    get(key, def) { try { const v = localStorage.getItem('drzewo:' + key); return v == null ? def : JSON.parse(v); } catch { return def; } },
    set(key, val) { try { localStorage.setItem('drzewo:' + key, JSON.stringify(val)); } catch { /* tryb bez zapisu */ } },
  };

  D.util = { $, $$, h, raw, icon, plural, photoSrc, avatar, personCard, toast, download, debounce, reduceMotion, selection, prefs };
  D.views = D.views || {};
})();
```

- [ ] **Step 6: `js/router.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util;
  const ROUTES = { drzewo: 'tree', osoby: 'people', 'os-czasu': 'timeline', miejsca: 'places', galeria: 'gallery', historie: 'stories' };
  const TITLES = { drzewo: 'Drzewo', osoby: 'Osoby', 'os-czasu': 'Oś czasu', miejsca: 'Miejsca', galeria: 'Galeria', historie: 'Historie' };
  const mounted = new Set();
  let current = null;
  let lastSlug = 'drzewo';

  function parse(hash) {
    const parts = hash.replace(/^#\/?/, '').split('/').map((x) => { try { return decodeURIComponent(x); } catch { return x; } });
    if (parts[0] === 'osoba' && parts[1]) return { personId: parts[1] };
    return { slug: ROUTES[parts[0]] ? parts[0] : 'drzewo', param: parts[1] || null };
  }

  function showView(slug, param = null) {
    const name = ROUTES[slug];
    lastSlug = slug;
    U.$$('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== name; });
    U.$$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === slug) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.title = `${TITLES[slug]} · Drzewo rodziny`;
    const v = D.views[name];
    if (v) {
      if (!mounted.has(name)) { v.mount(U.$(`[data-view="${name}"]`)); mounted.add(name); }
      if (v.show) v.show(param);
    } else {
      U.$(`[data-view="${name}"]`).innerHTML = U.h`<div class="empty-state"><h2>${TITLES[slug]}</h2><p>Ten widok pojawi się w kolejnym kroku.</p></div>`.toString();
    }
    current = name;
  }

  function apply() {
    const r = parse(location.hash);
    if (r.personId) {
      if (!current) showView(lastSlug);
      if (D.profile) D.profile.open(r.personId);
      return;
    }
    if (D.profile) D.profile.close();
    if (ROUTES[r.slug] !== current || r.param) showView(r.slug, r.param);
  }

  D.router = {
    start() { addEventListener('hashchange', apply); apply(); },
    go(hash) { if (location.hash === hash) apply(); else location.hash = hash; },
    back() { D.router.go('#/' + lastSlug); },
    showView,
    get view() { return current; },
    isMounted: (name) => mounted.has(name),
  };
})();
```
Komunikat „Ten widok pojawi się w kolejnym kroku” to rusztowanie na czas budowy. Po Task 19 każdy widok ma już implementację, więc komunikat nigdy się nie pokaże. Task 21 usuwa tę gałąź.

- [ ] **Step 7: `js/ui-modal.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util;
  let seq = 0;

  function open({ title, body = '', actions = [{ label: 'Zamknij', value: null }], onMount = null, onAction = null }) {
    return new Promise((resolve) => {
      const id = `modal-title-${++seq}`;
      const prev = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = U.h`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <div class="modal-head"><h2 id="${id}">${title}</h2><button class="icon-btn" type="button" data-close aria-label="Zamknij">${U.icon('close')}</button></div>
        <div class="modal-body">${U.raw(String(body))}</div>
        <div class="modal-foot">${actions.map((a, i) => U.h`<button type="button" class="btn ${a.kind ? 'btn-' + a.kind : ''}" data-action="${i}">${a.label}</button>`)}</div>
      </div>`.toString();
      document.body.append(wrap);
      document.body.classList.add('modal-open');
      const close = (value) => {
        wrap.remove();
        if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('modal-open');
        if (prev && prev.focus) prev.focus({ preventScroll: true });
        resolve(value);
      };
      wrap.addEventListener('click', async (e) => {
        if (e.target === wrap || e.target.closest('[data-close]')) return close(null);
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const value = actions[Number(btn.dataset.action)].value;
        if (onAction && value != null) {
          const r = await onAction(value, wrap);
          if (r === false) return;          // walidacja nie przeszła – zostaw otwarty
          if (r !== undefined) return close(r); // wynik onAction staje się wartością modala
        }
        close(value);
      });
      wrap.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(null); }
        if (e.key === 'Tab') { // pułapka fokusu
          const f = U.$$('button, [href], input, select, textarea', wrap).filter((x) => !x.disabled && x.offsetParent);
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      });
      if (onMount) onMount(wrap);
      (U.$('input, select, textarea', wrap) || U.$('.btn-primary, .btn-danger', wrap) || U.$('[data-action]', wrap)).focus();
    });
  }

  async function confirm(message, { title = 'Potwierdź', ok = 'Tak', danger = false } = {}) {
    const v = await open({ title, body: U.h`<p>${message}</p>`, actions: [{ label: 'Anuluj', value: null }, { label: ok, value: true, kind: danger ? 'danger' : 'primary' }] });
    return v === true;
  }

  D.modal = { open, confirm };
})();
```
- [ ] **Step 8: `js/app.js`**

```js
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
```

- [ ] **Step 9: Sprawdź w przeglądarce**

Wczytaj narzędzia claude-in-chrome (`ToolSearch` z `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__read_console_messages,mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__resize_window`). Otwórz nową kartę z `file:///Users/whomean/Desktop/DRZEWO%20GENEALOGICZNE/index.html`. Do sprawdzenia:
- konsola bez błędów; `javascript_tool`: `Object.keys(Drzewo.store.model.people).length` → `209`, `typeof ELK` → `'function'`, `typeof d3.zoom` → `'function'`, `typeof L.map` → `'function'`;
- klik w każdą zakładkę zmienia hash, podkreślenie w menu i tytuł karty;
- przełącznik motywu zmienia tło i przetrwa przeładowanie;
- przy szerokości 390 px (`resize_window`) widać dolny pasek z 6 ikonami, a górne menu jest ukryte.

- [ ] **Step 10: Commit**

```bash
git add index.html css js/util.js js/router.js js/ui-modal.js js/app.js
git commit -m "Szkielet UI: nawigacja, motyw, router, modal, start aplikacji

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 12: Widok drzewa – SVG, zoom, podświetlenie, minimapa (`js/view-tree.js`, `css/tree.css`)

**Files:**
- Create: `js/view-tree.js`, `css/tree.css`
- Modify: `index.html` (dodaj `<link rel="stylesheet" href="css/tree.css">` po `components.css` i `<script src="js/view-tree.js">` przed `app.js`)

**Interfaces:**
- Consumes: `Drzewo.treeLayout.layoutTree/CARD_H`, `Drzewo.selectors.stats/surnames`, `Drzewo.relations`, `Drzewo.util.selection`, globalne `d3`, `ELK`
- Produces: `Drzewo.views.tree = { mount, show, update, centerOn(id), fit(animate) }`. Kliknięcie karty → `#/osoba/<id>` (podświetlenie bez przesuwania). Subskrybuje `selection`: `{center:true}` centruje, a bez tej flagi drzewo przesuwa się tylko wtedy, gdy osoba jest poza ekranem.

- [ ] **Step 1: `css/tree.css`**

```css
.tree-shell { display: flex; flex-direction: column; height: 100%; }
.tree-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
.tree-stats { color: var(--text-2); font-size: 15px; }
.tree-stats strong { color: var(--text); font-weight: 700; }
.tree-tools { display: flex; align-items: center; gap: 2px; }
.tree-tools .select { min-height: 40px; max-width: 220px; margin-right: 6px; }
.tree-stage { position: relative; flex: 1; min-height: 0; background:
  radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0) 0 0 / 22px 22px, var(--bg); overflow: hidden; }
.tree-svg { width: 100%; height: 100%; display: block; cursor: grab; touch-action: none; }
.tree-svg:active { cursor: grabbing; }
.tree-svg:focus-visible { outline-offset: -3px; }
.tree-loading { position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; justify-items: center; gap: 12px; color: var(--text-2); background: color-mix(in srgb, var(--bg) 80%, transparent); }
.tree-hint { position: absolute; left: 16px; bottom: 12px; margin: 0; font-size: 13px; color: var(--text-3); pointer-events: none; }

.edge { fill: none; stroke: var(--text-3); stroke-opacity: .45; stroke-width: 1.6; transition: stroke-opacity .2s; }
.fam { fill: var(--surface); stroke: var(--text-3); stroke-width: 1.6; }
.card { cursor: pointer; transition: opacity .2s; }
.card-bg { fill: var(--surface); stroke: var(--border); stroke-width: 1.2; filter: drop-shadow(0 1px 2px rgb(16 24 32 / .08)); }
.card:hover .card-bg { stroke: var(--text-3); }
.card-bar { fill: var(--unknown); }
.card.sex-M .card-bar { fill: var(--male); }
.card.sex-F .card-bar { fill: var(--female); }
.card-avatar { fill: var(--unknown-soft); }
.card.sex-M .card-avatar { fill: var(--male-soft); }
.card.sex-F .card-avatar { fill: var(--female-soft); }
.card-initials { font: 700 17px var(--font); fill: var(--unknown); }
.card.sex-M .card-initials { fill: var(--male); }
.card.sex-F .card-initials { fill: var(--female); }
.card-name { font: 600 15px var(--font); fill: var(--text); }
.card-sub, .card-years { font: 400 13px var(--font); fill: var(--text-2); }
.card-far { display: none; font: 700 30px var(--font); fill: var(--text); }
.card.selected .card-bg { stroke: var(--accent); stroke-width: 3; }

/* Semantyczny zoom: przy oddaleniu tylko duże imię na kolorowym tle */
.tree-svg.far .card-detail { display: none; }
.tree-svg.far .card-far { display: block; }
.tree-svg.far .card-bg { fill: var(--unknown-soft); }
.tree-svg.far .card.sex-M .card-bg { fill: var(--male-soft); }
.tree-svg.far .card.sex-F .card-bg { fill: var(--female-soft); }

/* Podświetlenie linii */
.tree-svg.has-focus .card:not(.on) { opacity: .25; }
.tree-svg.has-focus .edge { stroke-opacity: .12; }
.tree-svg.has-focus .edge.on { stroke: var(--accent); stroke-opacity: 1; stroke-width: 2.6; }
.tree-svg.has-focus .fam.on { stroke: var(--accent); fill: var(--accent); }
.tree-svg.has-focus .fam:not(.on) { opacity: .25; }

/* Minimapa */
.minimap { position: absolute; right: 16px; bottom: 16px; width: 220px; height: 150px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-1); cursor: pointer; }
.mini-node { fill: var(--unknown); opacity: .7; }
.mini-node.sex-M { fill: var(--male); }
.mini-node.sex-F { fill: var(--female); }
.mini-view { fill: var(--accent); fill-opacity: .1; stroke: var(--accent); stroke-width: 1.5; }
body.profile-open .minimap { right: calc(var(--drawer-w) + 16px); }
@media (max-width: 900px) {
  .tree-stats { font-size: 13px; }
  .tree-tools .select { max-width: 150px; }
  .minimap { width: 150px; height: 100px; right: 10px; bottom: 10px; }
  .tree-hint { display: none; }
  body.profile-open .minimap { right: 10px; }
}
```

- [ ] **Step 2: `js/view-tree.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, R = D.relations, S = D.selectors, TL = D.treeLayout;
  const MIN_K = 0.06, MAX_K = 2.5, FAR_K = 0.45, MW = 220, MH = 150;
  const RELAYOUT = ['init', 'person', 'family', 'undo', 'import', 'reset'];
  let el, svg, gRoot, gEdges, gNodes, zoom, layout = null, model = null;
  let focusId = null, surnameFilter = '', miniScale = 0, token = 0, pendingCenter = null, fitted = false;

  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const storage = () => { try { return localStorage; } catch { return null; } };
  function viewport() {
    const r = svg.node().getBoundingClientRect();
    const drawer = document.body.classList.contains('profile-open') && innerWidth > 900 ? 440 : 0;
    return { W: Math.max(0, r.width - drawer), H: r.height };
  }

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="tree-shell">
      <div class="tree-header">
        <div class="tree-stats" id="treeStats"></div>
        <div class="tree-tools" role="toolbar" aria-label="Narzędzia drzewa">
          <label class="visually-hidden" for="treeSurname">Wyróżnij nazwisko</label>
          <select class="select" id="treeSurname"></select>
          <button class="icon-btn" type="button" data-act="me" title="Pokaż mnie" aria-label="Pokaż mnie">${U.icon('me')}</button>
          <button class="icon-btn" type="button" data-act="fit" title="Dopasuj do ekranu" aria-label="Dopasuj do ekranu">${U.icon('fit')}</button>
          <button class="icon-btn" type="button" data-act="out" title="Oddal" aria-label="Oddal">${U.icon('minus')}</button>
          <button class="icon-btn" type="button" data-act="in" title="Przybliż" aria-label="Przybliż">${U.icon('plus')}</button>
          <button class="icon-btn" type="button" data-act="minimap" title="Minimapa" aria-label="Minimapa" aria-pressed="true">${U.icon('minimap')}</button>
        </div>
      </div>
      <div class="tree-stage">
        <div class="tree-loading" id="treeLoading"><div class="spinner"></div><p>Układam drzewo…</p></div>
        <svg class="tree-svg" id="treeSvg" tabindex="0" role="application" aria-label="Drzewo genealogiczne. Przeciągnij, aby przesuwać. Strzałki przesuwają, plus i minus przybliżają.">
          <defs><clipPath id="avatarClip"><circle cx="40" cy="${TL.CARD_H / 2}" r="24"/></clipPath></defs>
        </svg>
        <svg class="minimap" id="treeMini" aria-hidden="true"></svg>
        <p class="tree-hint">Kliknij osobę, aby zobaczyć jej linię i profil · dwuklik centruje</p>
      </div></div>`.toString();

    svg = d3.select(el).select('#treeSvg');
    gRoot = svg.append('g');
    gEdges = gRoot.append('g').attr('class', 'edges');
    gNodes = gRoot.append('g').attr('class', 'nodes');
    zoom = d3.zoom().scaleExtent([MIN_K, MAX_K]).on('zoom', (e) => {
      gRoot.attr('transform', e.transform);
      svg.classed('far', e.transform.k < FAR_K);
      drawMiniViewport(e.transform);
    });
    svg.call(zoom).on('dblclick.zoom', null);
    svg.on('click', () => { if (U.selection.get()) D.router.back(); });
    svg.node().addEventListener('keydown', onKey);
    d3.select(el).select('#treeMini').on('click', onMiniClick);
    U.$('.tree-tools', el).addEventListener('click', onTool);
    U.$('#treeSurname', el).addEventListener('change', (e) => { surnameFilter = e.target.value; applyHighlight(); });
    U.selection.subscribe((id, opts) => { focusId = id; applyHighlight(); if (id && (opts.center || !isVisible(id))) centerOn(id); });
    toggleMinimap(U.prefs.get('minimap', innerWidth > 900));
    addEventListener('resize', U.debounce(() => { if (layout) drawMinimap(); }, 200));
    update(D.store.model, { type: 'init' });
  }

  function show() {
    if (!layout) return;
    if (!fitted) fit(false);
    if (pendingCenter) { const id = pendingCenter; pendingCenter = null; centerOn(id); }
  }

  async function update(m, change) {
    model = m;
    renderStats();
    renderSurnames();
    if (!RELAYOUT.includes(change.type)) return;
    const my = ++token;
    U.$('#treeLoading', el).hidden = false;
    try {
      const res = await TL.layoutTree(m, { ELK: window.ELK, storage: storage() });
      if (my !== token) return;
      layout = res;
      render();
      drawMinimap();
      if (!fitted && !el.hidden) fit(false);
      applyHighlight();
      if (focusId && change.type === 'init') centerOn(focusId);
    } catch (err) {
      console.error(err);
      U.toast('Nie udało się ułożyć drzewa: ' + err.message, { timeout: 8000 });
    } finally {
      if (my === token) U.$('#treeLoading', el).hidden = true;
    }
  }

  function renderStats() {
    const s = S.stats(model);
    const range = s.firstYear ? `${s.firstYear}–${s.lastYear}` : '';
    U.$('#treeStats', el).innerHTML = U.h`<strong>${U.plural(s.people, 'osoba', 'osoby', 'osób')}</strong> · <strong>${U.plural(s.generations, 'pokolenie', 'pokolenia', 'pokoleń')}</strong>${range ? U.h` · <strong>${range}</strong>` : ''} · ${U.plural(s.surnames, 'nazwisko', 'nazwiska', 'nazwisk')}`.toString();
  }
  function renderSurnames() {
    const sel = U.$('#treeSurname', el);
    sel.innerHTML = U.h`<option value="">Wszystkie nazwiska</option>${S.surnames(model).map((x) => U.h`<option value="${x.name}">${x.name} (${x.count})</option>`)}`.toString();
    sel.value = surnameFilter;
  }

  function cardSvg(p, d) {
    const ph = P.primaryPhoto(p), maiden = P.maidenName(p);
    let years = P.lifespan(p);
    if (p.deceased && years && !years.includes('†')) years += ' †';
    const cy = d.h / 2;
    const lastInitial = (p.marriedName || p.surname || '').charAt(0);
    return U.h`<rect class="card-bg" width="${d.w}" height="${d.h}" rx="12"/>
      <rect class="card-bar" width="5" height="${d.h}" rx="2"/>
      <g class="card-detail">
        <circle class="card-avatar" cx="40" cy="${cy}" r="24"/>
        ${ph ? U.h`<image href="${U.photoSrc(ph.url)}" x="16" y="${cy - 24}" width="48" height="48" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
             : U.h`<text class="card-initials" x="40" y="${cy + 6}" text-anchor="middle">${P.initials(p)}</text>`}
        <text class="card-name" x="76" y="${maiden ? 27 : 33}">${trunc(P.displayName(p), 21)}</text>
        ${maiden ? U.h`<text class="card-sub" x="76" y="45">z d. ${trunc(maiden, 18)}</text>` : ''}
        <text class="card-years" x="76" y="${maiden ? 63 : 53}">${years}</text>
      </g>
      <text class="card-far" x="${d.w / 2}" y="${cy + 10}" text-anchor="middle">${trunc(p.given || '?', 11)}${lastInitial ? ' ' + lastInitial + '.' : ''}</text>`.toString();
  }

  function render() {
    const nodes = Object.values(layout.nodes);
    gEdges.selectAll('path').data(layout.edges, (d) => d.id).join('path')
      .attr('class', 'edge').attr('d', (d) => (d.points.length ? 'M' + d.points.map((p) => p.join(',')).join('L') : ''));
    gNodes.selectAll('circle.fam').data(nodes.filter((n) => n.kind === 'family'), (d) => d.id).join('circle')
      .attr('class', 'fam').attr('cx', (d) => d.x + d.w / 2).attr('cy', (d) => d.y + d.h / 2).attr('r', 4.5);
    gNodes.selectAll('g.card').data(nodes.filter((n) => n.kind === 'person' && model.people[n.id]), (d) => d.id)
      .join('g')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .each(function (d) {
        const p = model.people[d.id];
        this.setAttribute('class', `card sex-${p.sex}`);
        this.setAttribute('aria-label', `${P.displayName(p)} ${P.lifespan(p)}`);
        this.innerHTML = cardSvg(p, d);
      })
      .on('click', (e, d) => { e.stopPropagation(); D.router.go('#/osoba/' + encodeURIComponent(d.id)); })
      .on('dblclick', (e, d) => { e.stopPropagation(); centerOn(d.id, 1); });
  }

  function lineageOf(id) {
    return new Set([id, ...R.ancestorsOf(model, id), ...R.descendantsOf(model, id), ...R.spousesOf(model, id).map((s) => s.id)]);
  }
  function applyHighlight() {
    if (!layout || !model) return;
    let on = null;
    if (focusId && model.people[focusId]) on = lineageOf(focusId);
    else if (surnameFilter) on = new Set(Object.values(model.people).filter((p) => p.surname === surnameFilter || p.marriedName === surnameFilter).map((p) => p.id));
    const famOn = (fid) => {
      const f = model.families[fid];
      if (!f || !on) return false;
      const parentOn = on.has(f.husb) || on.has(f.wife);
      return parentOn && (f.children.some((c) => on.has(c)) || (!!focusId && (f.husb === focusId || f.wife === focusId)));
    };
    const nodeOn = (nid) => (nid.startsWith('p:') ? on.has(nid.slice(2)) : famOn(nid.slice(2)));
    svg.classed('has-focus', !!on);
    gNodes.selectAll('g.card').classed('on', (d) => !!on && on.has(d.id)).classed('selected', (d) => d.id === focusId);
    gNodes.selectAll('circle.fam').classed('on', (d) => !!on && famOn(d.id));
    gEdges.selectAll('path').classed('on', (d) => !!on && nodeOn(d.from) && nodeOn(d.to));
  }

  function transition() { return svg.transition().duration(U.reduceMotion() ? 0 : 600); }
  function isVisible(id) {
    const n = layout && layout.nodes['p:' + id];
    if (!n || el.closest('[hidden]')) return false;
    const t = d3.zoomTransform(svg.node());
    const { W, H } = viewport();
    const x = t.applyX(n.x), y = t.applyY(n.y);
    return x >= 0 && y >= 0 && x + n.w * t.k <= W && y + n.h * t.k <= H;
  }
  function centerOn(id, k) {
    const n = layout && layout.nodes['p:' + id];
    const { W, H } = viewport();
    if (!n || !W || el.closest('[hidden]')) { pendingCenter = id; return; }
    const scale = k || Math.max(d3.zoomTransform(svg.node()).k, 0.85);
    transition().call(zoom.transform, d3.zoomIdentity.translate(W / 2 - (n.x + n.w / 2) * scale, H / 2 - (n.y + n.h / 2) * scale).scale(scale));
  }
  function fit(animate = true) {
    const { W, H } = viewport();
    if (!layout || !W) return;
    const k = Math.max(MIN_K, Math.min(1, Math.min(W / layout.width, H / layout.height) * 0.92));
    const t = d3.zoomIdentity.translate((W - layout.width * k) / 2, (H - layout.height * k) / 2).scale(k);
    (animate ? transition() : svg).call(zoom.transform, t);
    fitted = true;
  }

  function onTool(e) {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'in') transition().call(zoom.scaleBy, 1.3);
    if (act === 'out') transition().call(zoom.scaleBy, 1 / 1.3);
    if (act === 'fit') fit(true);
    if (act === 'minimap') toggleMinimap(b.getAttribute('aria-pressed') !== 'true');
    if (act === 'me') {
      const me = U.prefs.get('me', null);
      if (me && model.people[me]) { D.router.go('#/osoba/' + encodeURIComponent(me)); U.selection.set(me, { center: true }); }
      else U.toast('Otwórz swój profil i kliknij „To ja”, aby ustawić punkt startowy.');
    }
  }
  function onKey(e) {
    const k = d3.zoomTransform(svg.node()).k;
    const step = 80 / k;
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (map[e.key]) { e.preventDefault(); svg.call(zoom.translateBy, ...map[e.key]); }
    else if (e.key === '+' || e.key === '=') transition().call(zoom.scaleBy, 1.3);
    else if (e.key === '-') transition().call(zoom.scaleBy, 1 / 1.3);
    else if (e.key === '0') fit(true);
  }

  function toggleMinimap(on) {
    U.$('#treeMini', el).hidden = !on;
    U.$('[data-act="minimap"]', el).setAttribute('aria-pressed', String(on));
    U.prefs.set('minimap', on);
  }
  function drawMinimap() {
    const mini = d3.select(el).select('#treeMini');
    const box = mini.node().getBoundingClientRect();
    const w = box.width || MW, hgt = box.height || MH;
    miniScale = Math.min(w / layout.width, hgt / layout.height);
    mini.attr('viewBox', `0 0 ${w} ${hgt}`);
    mini.selectAll('rect.mini-node').data(Object.values(layout.nodes).filter((n) => n.kind === 'person'), (d) => d.id).join('rect')
      .attr('class', (d) => 'mini-node sex-' + ((model.people[d.id] || {}).sex || 'U'))
      .attr('x', (d) => d.x * miniScale).attr('y', (d) => d.y * miniScale)
      .attr('width', (d) => Math.max(1.5, d.w * miniScale)).attr('height', (d) => Math.max(1.5, d.h * miniScale));
    mini.selectAll('rect.mini-view').data([0]).join('rect').attr('class', 'mini-view').raise();
    drawMiniViewport(d3.zoomTransform(svg.node()));
  }
  function drawMiniViewport(t) {
    if (!layout || !miniScale) return;
    const r = svg.node().getBoundingClientRect();
    d3.select(el).select('.mini-view')
      .attr('x', (-t.x / t.k) * miniScale).attr('y', (-t.y / t.k) * miniScale)
      .attr('width', (r.width / t.k) * miniScale).attr('height', (r.height / t.k) * miniScale);
  }
  function onMiniClick(e) {
    const [mx, my] = d3.pointer(e);
    const k = d3.zoomTransform(svg.node()).k;
    const { W, H } = viewport();
    transition().call(zoom.transform, d3.zoomIdentity.translate(W / 2 - (mx / miniScale) * k, H / 2 - (my / miniScale) * k).scale(k));
  }

  D.views.tree = { mount, show, update, centerOn, fit };
})();
```

- [ ] **Step 3: Sprawdź w przeglądarce**

Przeładuj `index.html` (claude-in-chrome, ta sama karta). Do sprawdzenia:
- spinner „Układam drzewo…” znika po kilku sekundach, a całe drzewo jest dopasowane do ekranu; konsola bez błędów;
- statystyki w nagłówku pokazują „209 osób · N pokoleń · 18xx–19xx · M nazwisk”;
- kółko i przeciąganie działają, przy oddaleniu karty pokazują duże „Imię N.”, a przy zbliżeniu zdjęcie lub inicjały, nazwisko, „z d.” i lata;
- kliknięcie karty zmienia hash na `#/osoba/<id>`. Profil pojawi się dopiero w Task 13, ale `javascript_tool`: `Drzewo.util.selection.set('I500002',{center:true})` musi podświetlić linię i wyśrodkować Irenę;
- wybór nazwiska „Dobies” w selekcie przyciemnia pozostałych; „Wszystkie nazwiska” zdejmuje filtr;
- minimapa pokazuje prostokąt widoku, a kliknięcie w niej przesuwa drzewo; przycisk minimapy ją ukrywa;
- zrób zrzut ekranu (`computer` screenshot) przy 1440 px i 390 px. Sprawdź, czy małżonkowie stoją obok siebie, a linie nie są skrajnie splątane. Jeśli drzewo jest bardzo szerokie (np. > 15 000 px), zanotuj szerokość. Filtr nazwiska jest wtedy głównym narzędziem nawigacji, co jest zgodne ze specem.
- przeładowanie strony: drzewo pojawia się natychmiast (cache w localStorage).

- [ ] **Step 4: Commit**

```bash
git add js/view-tree.js css/tree.css index.html
git commit -m "Widok drzewa: SVG, zoom semantyczny, podświetlenie linii, minimapa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Panel profilu osoby (`js/ui-profile.js`)

**Files:**
- Create: `js/ui-profile.js`
- Modify: `css/components.css` (sekcja profilu), `index.html` (`<script src="js/ui-profile.js">` przed widokami)

**Interfaces:**
- Consumes: `store.model`, `store.items`, `relations`, `selectors.EVENT_LABEL`, `places.normalizePlace`, `util`
- Produces: `Drzewo.profile = { open(id), close(), refresh(), currentId }`. Wywołuje `Drzewo.edit.decorateProfile(panel, person)`, jeśli istnieje (Task 20), i `Drzewo.lightbox.open(items, index)`, jeśli istnieje (Task 18). Elementy relacji mają atrybuty `data-person`, `data-family`, `data-rel` (`parent|spouse|sibling|child`), których używa tryb edycji.

- [ ] **Step 1: CSS profilu (dopisz na końcu `css/components.css`)**

```css
/* ── Panel profilu ── */
.profile { position: fixed; z-index: 50; top: var(--topbar-h); right: 0; bottom: 0; width: var(--drawer-w); overflow: auto; background: var(--surface); border-left: 1px solid var(--border); box-shadow: var(--shadow-2); animation: drawer-in .22s ease; }
@keyframes drawer-in { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
.profile-head { position: relative; padding: 28px 24px 20px; text-align: center; border-bottom: 1px solid var(--border); background: linear-gradient(var(--unknown-soft), var(--surface) 70%); }
.profile-head.sex-M { background: linear-gradient(var(--male-soft), var(--surface) 70%); }
.profile-head.sex-F { background: linear-gradient(var(--female-soft), var(--surface) 70%); }
.profile-head .avatar-xl { margin: 0 auto 12px; }
.profile-close { position: absolute; top: 10px; right: 10px; }
.profile-head h2 { margin: 0; font-size: 24px; line-height: 1.25; }
.profile-maiden { margin: 2px 0 0; color: var(--text-2); }
.profile-years { margin: 6px 0 0; color: var(--text-2); font-weight: 500; }
.kin-badge { display: inline-block; margin: 12px 0 0; padding: 4px 12px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-strong); font-weight: 600; font-size: 14px; }
.profile-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 16px; }
.profile-body { padding: 8px 24px 40px; }
.profile-body section { padding: 18px 0; border-bottom: 1px solid var(--border); }
.profile-body section:last-child { border-bottom: 0; }
.profile-body h3 { margin: 0 0 12px; font-size: 17px; }
.profile-body h4 { margin: 14px 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-3); }
.facts { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.fact { display: grid; grid-template-columns: 110px 1fr; gap: 2px 12px; }
.fact-label { font-weight: 600; color: var(--text-2); }
.fact-extra { grid-column: 2; font-size: 14px; color: var(--text-3); }
.rel-list { display: grid; gap: 8px; }
.rel-list .person-card { min-height: 60px; padding: 8px 12px 8px 14px; }
.rel-list .avatar { width: 38px; height: 38px; font-size: 13px; }
.profile-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.profile-photo { padding: 0; border: 0; border-radius: var(--radius-sm); overflow: hidden; aspect-ratio: 1; cursor: zoom-in; background: var(--surface-2); }
.profile-photo img { width: 100%; height: 100%; object-fit: cover; }
.memory { margin: 0 0 10px; padding: 10px 14px; border-left: 4px solid var(--accent); background: var(--surface-2); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; font-style: italic; }
.note { margin: 0 0 8px; color: var(--text-2); white-space: pre-line; }
.link-list, .sources { margin: 0; padding-left: 18px; display: grid; gap: 6px; }
@media (max-width: 900px) {
  .profile { top: auto; left: 0; width: auto; max-height: 88dvh; border-left: 0; border-radius: var(--radius) var(--radius) 0 0; bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom)); animation-name: sheet-in; }
  @keyframes sheet-in { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
}
```

- [ ] **Step 2: `js/ui-profile.js`**

```js
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
      date: e.date ? e.date.display : '',
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
```

- [ ] **Step 3: Sprawdź w przeglądarce**

Przeładuj. Do sprawdzenia:
- klik w kartę otwiera panel z prawej, a drzewo podświetla linię i centruje osobę w widocznej części, obok panelu;
- `#/osoba/I500002` po przeładowaniu otwiera Irenę Domżalską („z domu Dobies”, zdjęcie, fakty);
- karty w „Rodzina” otwierają kolejne profile, a link miejsca prowadzi do `#/miejsca/<nazwa>` (widok pojawi się w Task 17);
- „To ja” na jednej osobie, potem otwarcie jej dziadka: odznaka „Dziadek · dla: …”;
- Esc, X i klik w tło drzewa zamykają panel, a hash wraca do `#/drzewo`;
- przy 390 px panel wysuwa się od dołu nad dolnym paskiem.

- [ ] **Step 4: Commit**

```bash
git add js/ui-profile.js css/components.css index.html
git commit -m "Panel profilu: fakty, rodzina, pokrewieństwo, zdjęcia, źródła

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Wyszukiwarka ⌘K i wybór osoby (`js/ui-search.js`)

**Files:**
- Create: `js/ui-search.js`
- Modify: `css/components.css` (sekcja palety), `index.html` (`<script src="js/ui-search.js">`)

**Interfaces:**
- Consumes: `selectors.searchPeople`, `util.prefs` (`recent`)
- Produces: `Drzewo.search = { init(), go(), pickPerson({ title, exclude: string[] }) → Promise<id|null> }`. `init()` wywołuje `app.js`.

- [ ] **Step 1: CSS palety (dopisz do `css/components.css`)**

```css
/* ── Paleta wyszukiwania ── */
.palette-backdrop { position: fixed; inset: 0; z-index: 80; background: rgb(10 14 18 / .5); display: flex; justify-content: center; align-items: flex-start; padding: 12vh 16px 16px; }
.palette { width: min(620px, 100%); background: var(--surface); border-radius: var(--radius); box-shadow: var(--shadow-2); overflow: hidden; }
.palette-input { display: flex; align-items: center; gap: 10px; padding: 0 16px; border-bottom: 1px solid var(--border); color: var(--text-3); }
.palette-input input { flex: 1; min-width: 0; height: 58px; border: 0; outline: 0; background: transparent; font-size: 18px; color: var(--text); }
.palette-input kbd { font: 12px var(--font); border: 1px solid var(--border); border-radius: 6px; padding: 1px 6px; }
.palette-title { margin: 0; padding: 10px 16px 0; font-weight: 600; color: var(--text-2); }
.palette ul { list-style: none; margin: 0; padding: 8px; max-height: min(420px, 60dvh); overflow: auto; }
.palette li[role="option"] { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: var(--radius-sm); cursor: pointer; min-height: 52px; }
.palette li[aria-selected="true"] { background: var(--accent-soft); }
.opt-text { display: flex; flex-direction: column; min-width: 0; }
.opt-text small { color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.palette-empty, .palette-hint { padding: 18px 12px; color: var(--text-3); text-align: center; }
@media (max-width: 600px) { .palette-backdrop { padding: 0; } .palette { border-radius: 0; min-height: 100dvh; } }
```

- [ ] **Step 2: `js/ui-search.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let wrap, input, list, results = [], active = 0, resolver = null, excluded = new Set();

  function ensure() {
    if (wrap) return;
    wrap = document.createElement('div');
    wrap.className = 'palette-backdrop';
    wrap.hidden = true;
    wrap.innerHTML = U.h`<div class="palette" role="dialog" aria-modal="true" aria-label="Szukaj osoby">
      <div class="palette-input">${U.icon('search')}
        <input type="search" autocomplete="off" spellcheck="false" placeholder="Imię, nazwisko lub miejscowość…" role="combobox" aria-expanded="true" aria-controls="paletteList" aria-autocomplete="list">
        <kbd>Esc</kbd></div>
      <p class="palette-title" hidden></p>
      <ul id="paletteList" role="listbox" aria-label="Wyniki"></ul></div>`.toString();
    document.body.append(wrap);
    input = U.$('input', wrap);
    list = U.$('ul', wrap);
    input.addEventListener('input', () => { active = 0; renderResults(); });
    input.addEventListener('keydown', onKey);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) return finish(null);
      const li = e.target.closest('[data-id]');
      if (li) finish(li.dataset.id);
    });
  }

  function recent() {
    const m = D.store.model;
    return U.prefs.get('recent', []).map((id) => m.people[id]).filter(Boolean).filter((p) => !excluded.has(p.id));
  }
  function renderResults() {
    const q = input.value.trim();
    results = q ? S.searchPeople(D.store.model, q, 12).filter((p) => !excluded.has(p.id)) : recent();
    if (!results.length) {
      list.innerHTML = U.h`<li class="palette-empty">${q ? 'Brak wyników – spróbuj innej pisowni lub samego nazwiska.' : 'Zacznij pisać, aby wyszukać osobę.'}</li>`.toString();
      input.removeAttribute('aria-activedescendant');
      return;
    }
    list.innerHTML = U.h`${!q ? U.h`<li class="palette-hint" role="presentation">Ostatnio oglądane</li>` : ''}${results.map((p, i) => U.h`
      <li id="opt-${i}" role="option" data-id="${p.id}" aria-selected="${i === active}">${U.avatar(p)}
        <span class="opt-text"><strong>${P.displayName(p)}</strong>
        <small>${[P.maidenName(p) && 'z d. ' + P.maidenName(p), P.lifespan(p), (P.birth(p) || {}).place].filter(Boolean).join(' · ') || ' '}</small></span></li>`)}`.toString();
    input.setAttribute('aria-activedescendant', 'opt-' + active);
  }
  function move(delta) {
    if (!results.length) return;
    active = (active + delta + results.length) % results.length;
    U.$$('[role="option"]', list).forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    input.setAttribute('aria-activedescendant', 'opt-' + active);
    U.$('#opt-' + active, list).scrollIntoView({ block: 'nearest' });
  }
  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[active]) finish(results[active].id); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); }
  }

  function openPalette({ title = '', exclude = [] } = {}) {
    ensure();
    excluded = new Set(exclude);
    const t = U.$('.palette-title', wrap);
    t.hidden = !title;
    t.textContent = title;
    input.value = '';
    active = 0;
    renderResults();
    wrap.hidden = false;
    document.body.classList.add('modal-open');
    input.focus();
    return new Promise((r) => { resolver = r; });
  }
  function finish(id) {
    wrap.hidden = true;
    if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('modal-open');
    if (id) U.prefs.set('recent', [id, ...U.prefs.get('recent', []).filter((x) => x !== id)].slice(0, 6));
    const r = resolver;
    resolver = null;
    if (r) r(id);
  }

  async function go() {
    const id = await openPalette();
    if (!id) return;
    D.router.go('#/osoba/' + encodeURIComponent(id));
    U.selection.set(id, { center: true });
  }

  function init() {
    U.$('#searchOpen').addEventListener('click', go);
    document.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      const typing = a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        if (wrap && !wrap.hidden) return;
        e.preventDefault();
        go();
      }
    });
  }

  D.search = { init, go, pickPerson: openPalette };
})();
```

- [ ] **Step 3: Sprawdź w przeglądarce**

- ⌘K (oraz `/` i przycisk w pasku) otwiera paletę, a wpisanie „zuromin” daje osoby związane z Żurominem;
- „irena dom” + Enter otwiera profil Ireny, a drzewo centruje się na niej;
- strzałki zmieniają zaznaczenie, Esc zamyka; po ponownym otwarciu z pustym polem widać „Ostatnio oglądane”;
- przy 390 px paleta zajmuje cały ekran.

- [ ] **Step 4: Commit**

```bash
git add js/ui-search.js css/components.css index.html
git commit -m "Wyszukiwarka ⌘K z historią i wyborem osoby

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 15: Widok „Osoby” (`js/view-people.js`)

**Files:**
- Create: `js/view-people.js`
- Modify: `css/components.css` (sekcja), `index.html` (`<script>`)

**Interfaces:**
- Consumes: `selectors.filterPeople/surnames/placeIndex`, `util.personCard`
- Produces: `Drzewo.views.people`. Kontener `[data-edit-add]` w nagłówku jest uzupełniany przez tryb edycji (Task 20).

- [ ] **Step 1: CSS (dopisz do `css/components.css`)**

```css
/* ── Osoby ── */
.people-toolbar { display: grid; grid-template-columns: minmax(200px, 2fr) repeat(3, minmax(140px, 1fr)) auto; gap: 10px; align-items: center; margin-bottom: 12px; }
.people-toolbar .chips { grid-column: 1 / -1; }
.result-count { margin: 4px 0 16px; color: var(--text-2); }
.surname-group h2 { position: sticky; top: var(--topbar-h); z-index: 1; margin: 24px 0 10px; padding: 6px 0; font-size: 18px; background: var(--bg); }
.surname-group h2 small { color: var(--text-3); font-weight: 500; }
@media (max-width: 900px) { .people-toolbar { grid-template-columns: 1fr 1fr; } .people-toolbar .wide { grid-column: 1 / -1; } }
```

- [ ] **Step 2: `js/view-people.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, S = D.selectors;
  let el;
  const state = { q: '', surname: '', place: '', status: 'all', withPhoto: false, sort: 'surname' };

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Osoby</h1><p>Wszyscy zapisani w drzewie rodziny.</p></div><div data-edit-add></div></div>
      <div class="people-toolbar">
        <input class="input wide" type="search" id="pq" placeholder="Szukaj po imieniu, nazwisku, miejscowości…" aria-label="Szukaj osób">
        <select class="select" id="psurname" aria-label="Nazwisko"></select>
        <select class="select" id="pplace" aria-label="Miejscowość"></select>
        <select class="select" id="psort" aria-label="Sortowanie"><option value="surname">Sortuj: nazwisko</option><option value="birth">Sortuj: rok urodzenia</option></select>
        <label class="chip" style="display:inline-flex;align-items:center;gap:8px"><input type="checkbox" id="pphoto"> Ze zdjęciem</label>
        <div class="chips" role="group" aria-label="Status">
          <button class="chip" type="button" data-status="all" aria-pressed="true">Wszyscy</button>
          <button class="chip" type="button" data-status="deceased" aria-pressed="false">Zmarli</button>
          <button class="chip" type="button" data-status="living" aria-pressed="false">Prawdopodobnie żyjący</button>
        </div>
      </div>
      <p class="result-count" id="pcount" aria-live="polite"></p>
      <div id="plist"></div>`.toString();
    const rerender = U.debounce(renderList, 120);
    U.$('#pq', el).addEventListener('input', (e) => { state.q = e.target.value; rerender(); });
    U.$('#psurname', el).addEventListener('change', (e) => { state.surname = e.target.value; renderList(); });
    U.$('#pplace', el).addEventListener('change', (e) => { state.place = e.target.value; renderList(); });
    U.$('#psort', el).addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });
    U.$('#pphoto', el).addEventListener('change', (e) => { state.withPhoto = e.target.checked; renderList(); });
    U.$('.chips', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      state.status = b.dataset.status;
      U.$$('[data-status]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderList();
    });
    renderFilters();
    renderList();
  }

  function renderFilters() {
    const m = D.store.model;
    U.$('#psurname', el).innerHTML = U.h`<option value="">Wszystkie nazwiska</option>${S.surnames(m).map((s) => U.h`<option value="${s.name}">${s.name} (${s.count})</option>`)}`.toString();
    U.$('#psurname', el).value = state.surname;
    const places = S.placeIndex(m).filter((p) => !p.vague).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    U.$('#pplace', el).innerHTML = U.h`<option value="">Wszystkie miejscowości</option>${places.map((p) => U.h`<option value="${p.name}">${p.name}</option>`)}`.toString();
    U.$('#pplace', el).value = state.place;
  }

  function renderList() {
    const list = S.filterPeople(D.store.model, state);
    U.$('#pcount', el).textContent = `Znaleziono: ${U.plural(list.length, 'osoba', 'osoby', 'osób')}`;
    const box = U.$('#plist', el);
    if (!list.length) {
      box.innerHTML = U.h`<div class="empty-state"><h2>Nikogo nie znaleziono</h2><p>Zmień filtry albo wyczyść wyszukiwanie.</p></div>`.toString();
      return;
    }
    if (state.sort === 'surname') {
      const groups = new Map();
      for (const p of list) { const k = p.surname || 'Bez nazwiska'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
      box.innerHTML = U.h`${[...groups].map(([name, ps]) => U.h`<section class="surname-group"><h2>${name} <small>· ${ps.length}</small></h2>
        <div class="person-grid">${ps.map((p) => U.personCard(p, { sub: (D.person.birth(p) || {}).place || '' }))}</div></section>`)}`.toString();
    } else {
      box.innerHTML = U.h`<div class="person-grid">${list.map((p) => U.personCard(p, { sub: (D.person.birth(p) || {}).place || '' }))}</div>`.toString();
    }
  }

  D.views.people = {
    mount,
    show() {},
    update() { renderFilters(); renderList(); },
  };
})();
```

- [ ] **Step 3: Sprawdź w przeglądarce**

`#/osoby`: licznik „Znaleziono: 209 osób”, grupy z nagłówkami nazwisk przyklejonymi przy przewijaniu. Wpisz „zuromin”, wybierz nazwisko „Dobies”, „Zmarli” i „Ze zdjęciem”: licznik i lista reagują, a przy braku wyników widać pusty stan. Klik w kartę otwiera profil. Przy 390 px filtry układają się w 2 kolumnach.

- [ ] **Step 4: Commit**

```bash
git add js/view-people.js css/components.css index.html
git commit -m "Widok Osoby: wyszukiwanie, filtry, grupowanie po nazwisku

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Widok „Oś czasu” (`js/view-timeline.js`)

**Files:**
- Create: `js/view-timeline.js`
- Modify: `css/components.css`, `index.html`

**Interfaces:**
- Consumes: `selectors.timeline/groupByDecade/surnames/HISTORY`
- Produces: `Drzewo.views.timeline`

- [ ] **Step 1: CSS**

```css
/* ── Oś czasu ── */
.decade { display: grid; grid-template-columns: 96px 1fr; gap: 0 20px; }
.decade-label { position: sticky; top: calc(var(--topbar-h) + 12px); align-self: start; font-size: 22px; font-weight: 700; color: var(--text-2); padding-top: 14px; }
.decade-items { list-style: none; margin: 0; padding: 8px 0 24px 24px; border-left: 2px solid var(--border); display: grid; gap: 10px; }
.tl-item { position: relative; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.tl-item::before { content: ''; position: absolute; left: -32px; top: 18px; width: 12px; height: 12px; border-radius: 50%; background: var(--text-3); box-shadow: 0 0 0 4px var(--bg); }
.tl-item.k-birth::before { background: var(--accent); }
.tl-item.k-marriage::before { background: var(--female); }
.tl-item.k-death::before { background: var(--text-2); }
.tl-date { font-size: 14px; font-weight: 600; color: var(--text-2); }
.tl-title { margin: 2px 0 0; font-weight: 600; }
.tl-title a { color: var(--text); }
.tl-meta { font-size: 14px; color: var(--text-3); }
.tl-history { position: relative; padding: 8px 14px; border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-2); font-size: 14px; font-style: italic; }
.tl-history::before { content: ''; position: absolute; left: -30px; top: 14px; width: 8px; height: 8px; transform: rotate(45deg); background: var(--text-3); }
@media (max-width: 600px) { .decade { grid-template-columns: 1fr; } .decade-label { position: static; padding: 8px 0 4px; } }
```

- [ ] **Step 2: `js/view-timeline.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let el;
  const state = { kind: 'all', surname: '' };

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Oś czasu</h1><p>Narodziny, śluby i odejścia w kolejności lat.</p></div></div>
      <div class="toolbar">
        <div class="chips" role="group" aria-label="Rodzaj wydarzeń">
          ${[['all', 'Wszystkie'], ['birth', 'Narodziny'], ['marriage', 'Śluby'], ['death', 'Odejścia']].map(([k, l]) => U.h`<button class="chip" type="button" data-kind="${k}" aria-pressed="${k === 'all'}">${l}</button>`)}
        </div>
        <select class="select" id="tsurname" aria-label="Nazwisko"></select>
      </div>
      <div id="tlist"></div>`.toString();
    U.$('.chips', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b) return;
      state.kind = b.dataset.kind;
      U.$$('[data-kind]', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
    U.$('#tsurname', el).addEventListener('change', (e) => { state.surname = e.target.value; render(); });
    update();
  }

  function render() {
    const m = D.store.model;
    const match = (id) => { const p = m.people[id]; return p && (p.surname === state.surname || p.marriedName === state.surname); };
    const events = S.timeline(m)
      .filter((e) => state.kind === 'all' || e.kind === state.kind)
      .filter((e) => !state.surname || e.personIds.some(match));
    const box = U.$('#tlist', el);
    if (!events.length) { box.innerHTML = U.h`<div class="empty-state"><h2>Brak wydarzeń</h2><p>Dla wybranych filtrów nie ma dat w drzewie.</p></div>`.toString(); return; }
    const names = (ids) => ids.map((id) => m.people[id]).filter(Boolean)
      .map((p) => U.h`<a href="#/osoba/${encodeURIComponent(p.id)}">${P.displayName(p)}</a>`);
    const join = (parts) => parts.reduce((acc, x, i) => (i ? U.h`${acc} i ${x}` : x), '');
    box.innerHTML = U.h`${S.groupByDecade(events).map((g) => U.h`<section class="decade" aria-label="Lata ${g.decade}.">
      <div class="decade-label">${g.decade}</div>
      <ol class="decade-items">${[
        ...g.events.map((e) => ({ y: e.date.sortKey, html: U.h`<li class="tl-item k-${e.kind}"><div class="tl-date">${e.date.display}</div>
          <p class="tl-title">${e.label}: ${join(names(e.personIds))}</p>
          ${e.place || e.note ? U.h`<div class="tl-meta">${[e.place, e.note].filter(Boolean).join(' · ')}</div>` : ''}</li>` })),
        ...g.history.map((h) => ({ y: h.year * 10000 + 1, html: U.h`<li class="tl-history">${h.year} · ${h.label}</li>` })),
      ].sort((a, b) => a.y - b.y).map((x) => x.html)}</ol></section>`)}`.toString();
  }

  function update() {
    const sel = U.$('#tsurname', el);
    sel.innerHTML = U.h`<option value="">Wszystkie nazwiska</option>${S.surnames(D.store.model).map((s) => U.h`<option value="${s.name}">${s.name}</option>`)}`.toString();
    sel.value = state.surname;
    render();
  }

  D.views.timeline = { mount, show() {}, update };
})();
```

- [ ] **Step 3: Sprawdź w przeglądarce**

`#/os-czasu`: dekady od 1820 w górę z przyklejoną etykietą dekady i kropkami w kolorach rodzaju. W dekadach 1910 i 1940 widać wpisy historyczne. Śluby pokazują oboje małżonków jako linki. Filtry „Śluby” i nazwisko zawężają listę.

- [ ] **Step 4: Commit**

```bash
git add js/view-timeline.js css/components.css index.html
git commit -m "Widok Oś czasu: dekady, filtry, kontekst historyczny

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Widok „Miejsca” z mapą (`js/view-places.js`)

**Files:**
- Create: `js/view-places.js`
- Modify: `css/components.css`, `index.html`

**Interfaces:**
- Consumes: `selectors.placeIndex(m, window.DRZEWO_PLACES)`, globalne `L` (Leaflet), zdarzenie `drzewo:theme`
- Produces: `Drzewo.views.places`. `show(param)` zaznacza miejsce o nazwie `param` (z linków `#/miejsca/<nazwa>` w profilu).

- [ ] **Step 1: CSS**

```css
/* ── Miejsca ── */
.places-layout { display: grid; grid-template-columns: 1fr 380px; gap: 16px; height: calc(100vh - var(--topbar-h) - 140px); min-height: 480px; }
#placesMap { border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; background: var(--surface-2); }
.places-side { overflow: auto; padding: 4px; }
.place-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.place-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 48px; padding: 8px 14px; text-align: left; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface); cursor: pointer; }
.place-btn[aria-current="true"] { border-color: var(--accent); background: var(--accent-soft); }
.place-btn small { color: var(--text-3); }
.place-detail h2 { margin: 0 0 4px; font-size: 22px; }
.place-events { list-style: none; margin: 12px 0; padding: 0; display: grid; gap: 6px; font-size: 15px; }
.pin { display: grid; place-items: center; border-radius: 50%; background: var(--accent); color: var(--on-accent); font: 700 13px var(--font); border: 3px solid var(--surface); box-shadow: var(--shadow-1); }
.pin.on { background: var(--female); }
.leaflet-container { font-family: var(--font); }
@media (max-width: 900px) { .places-layout { grid-template-columns: 1fr; height: auto; } #placesMap { height: 52dvh; } }
```

- [ ] **Step 2: `js/view-places.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, S = D.selectors;
  let el, map = null, tiles = null, markers = new Map(), index = [], selected = null;
  const TILE = (dark) => `https://{s}.basemaps.cartocdn.com/${dark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}{r}.png`;

  function mount(container) {
    el = container;
    el.innerHTML = U.h`<div class="page-head"><div><h1>Miejsca</h1><p>Miejscowości, w których żyła rodzina.</p></div></div>
      <div class="places-layout"><div id="placesMap" role="region" aria-label="Mapa miejscowości"></div>
      <aside class="places-side"><div id="placeDetail"></div><ul class="place-list" id="placeList"></ul></aside></div>`.toString();
    U.$('#placeList', el).addEventListener('click', (e) => { const b = e.target.closest('[data-place]'); if (b) select(b.dataset.place, true); });
    document.addEventListener('drzewo:theme', () => { if (tiles) tiles.setUrl(TILE(D.isDark())); });
  }

  function ensureMap() {
    if (map) return;
    map = L.map(U.$('#placesMap', el), { zoomControl: true, attributionControl: true }).setView([52.6, 20.0], 7);
    tiles = L.tileLayer(TILE(D.isDark()), { subdomains: 'abcd', maxZoom: 18, attribution: '© OpenStreetMap · © CARTO' }).addTo(map);
    rebuild();
    const pts = index.filter((p) => p.coords).map((p) => p.coords);
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 10 });
  }

  function rebuild() {
    index = S.placeIndex(D.store.model, window.DRZEWO_PLACES || {});
    if (map) {
      markers.forEach((mk) => mk.remove());
      markers = new Map();
      for (const p of index) {
        if (!p.coords) continue;
        const size = Math.round(28 + Math.sqrt(p.personIds.length) * 5);
        const mk = L.marker(p.coords, {
          icon: L.divIcon({ className: '', html: `<div class="pin${p.name === selected ? ' on' : ''}" style="width:${size}px;height:${size}px">${p.personIds.length}</div>`, iconSize: [size, size] }),
          title: p.name, keyboard: true,
        }).on('click', () => select(p.name, false));
        mk.bindTooltip(p.name, { direction: 'top', offset: [0, -size / 2] });
        mk.addTo(map);
        markers.set(p.name, mk);
      }
    }
    renderList();
    renderDetail();
  }

  function renderList() {
    U.$('#placeList', el).innerHTML = U.h`${index.map((p) => U.h`<li><button class="place-btn" type="button" data-place="${p.name}" aria-current="${p.name === selected}">
      <span>${p.name}${!p.coords && !p.vague ? U.h` <small>· brak na mapie</small>` : ''}</span><small>${U.plural(p.personIds.length, 'osoba', 'osoby', 'osób')}</small></button></li>`)}`.toString();
  }

  function renderDetail() {
    const box = U.$('#placeDetail', el);
    const p = index.find((x) => x.name === selected);
    if (!p) { box.innerHTML = U.h`<p class="muted" style="margin:4px 4px 12px">Wybierz miejscowość na mapie lub z listy.</p>`.toString(); return; }
    const m = D.store.model;
    const events = p.events.slice().sort((a, b) => ((a.date && a.date.sortKey) || 0) - ((b.date && b.date.sortKey) || 0));
    box.innerHTML = U.h`<div class="place-detail card-surface" style="padding:16px;margin-bottom:12px">
      <h2>${p.name}</h2><p class="muted" style="margin:0">${U.plural(p.events.length, 'wydarzenie', 'wydarzenia', 'wydarzeń')} · ${U.plural(p.personIds.length, 'osoba', 'osoby', 'osób')}</p>
      <ul class="place-events">${events.map((e) => U.h`<li><strong>${e.date ? e.date.display : 'bez daty'}</strong> · ${e.label}: ${e.personIds.map((id) => m.people[id] ? P.displayName(m.people[id]) : '').filter(Boolean).join(' i ')}</li>`)}</ul>
      <div class="rel-list">${p.personIds.map((id) => m.people[id]).filter(Boolean).map((q) => U.personCard(q))}</div></div>`.toString();
  }

  function select(name, fly) {
    selected = name;
    rebuild();
    const p = index.find((x) => x.name === name);
    if (fly && p && p.coords && map) map.flyTo(p.coords, Math.max(map.getZoom(), 10), { duration: U.reduceMotion() ? 0 : 0.6 });
    if (innerWidth <= 900) U.$('#placeDetail', el).scrollIntoView({ behavior: U.reduceMotion() ? 'auto' : 'smooth' });
  }

  D.views.places = {
    mount,
    show(param) {
      ensureMap();
      setTimeout(() => map.invalidateSize(), 0);
      if (param) select(param, true);
    },
    update() { rebuild(); },
  };
})();
```

- [ ] **Step 3: Sprawdź w przeglądarce**

`#/miejsca`: mapa wycentrowana na północnym Mazowszu z pinezkami i liczbami (Kliczewo, Żuromin i Zielona największe). Kafelki ładują się z `file://`. Jeśli konsola pokaże błędy kafelków CARTO, zamień `TILE` na `'https://tile.openstreetmap.org/{z}/{x}/{y}.png'` (bez `subdomains`) i sprawdź ponownie. Klik w pinezkę lub pozycję listy pokazuje szczegóły z wydarzeniami i kartami osób. Link miejsca z profilu (`#/miejsca/Zielona`) od razu zaznacza Zieloną. Po przełączeniu motywu na ciemny kafelki stają się ciemne. Przy 390 px mapa jest nad listą.

- [ ] **Step 4: Commit**

```bash
git add js/view-places.js css/components.css index.html
git commit -m "Widok Miejsca: mapa Leaflet z pinezkami i szczegółami miejscowości

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Galeria i lightbox (`js/view-gallery.js`)

**Files:**
- Create: `js/view-gallery.js`
- Modify: `css/components.css`, `index.html`

**Interfaces:**
- Consumes: `selectors.galleryItems`
- Produces: `Drzewo.views.gallery`, `Drzewo.lightbox = { open(items: [{ src, caption, personId? }], index) }`

- [ ] **Step 1: CSS**

```css
/* ── Galeria i lightbox ── */
.masonry { columns: 4 220px; column-gap: 12px; }
.masonry figure { break-inside: avoid; margin: 0 0 12px; border-radius: var(--radius-sm); overflow: hidden; background: var(--surface); border: 1px solid var(--border); }
.masonry button { display: block; width: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
.masonry img { width: 100%; height: auto; transition: transform .25s; }
.masonry button:hover img { transform: scale(1.03); }
.masonry figcaption { padding: 8px 12px; font-size: 14px; }
.masonry figcaption a { color: var(--text); font-weight: 600; text-decoration: none; }
.lightbox { position: fixed; inset: 0; z-index: 85; background: rgb(8 10 12 / .92); display: grid; grid-template-rows: 1fr auto; color: #fff; }
.lightbox img { max-width: calc(100vw - 140px); max-height: calc(100dvh - 120px); margin: auto; object-fit: contain; align-self: center; }
.lightbox-bar { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 12px 16px 20px; }
.lightbox-bar a { color: #8fe0b0; }
.lightbox .icon-btn { color: #fff; position: absolute; }
.lightbox .icon-btn:hover { background: rgb(255 255 255 / .12); }
.lb-close { top: 12px; right: 12px; } .lb-prev { left: 12px; top: 50%; } .lb-next { right: 12px; top: 50%; }
@media (max-width: 600px) { .lightbox img { max-width: 100vw; } .lb-prev, .lb-next { top: auto; bottom: 64px; } }
```

- [ ] **Step 2: `js/view-gallery.js`**

```js
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
```

- [ ] **Step 3: Sprawdź w przeglądarce**

`#/galeria`: 19 zdjęć w kolumnach ładowanych z `photos/`. W zakładce Network (`read_network_requests`) nie ma żądań do `mhcache.com`. Klik otwiera lightbox; strzałki, Esc i „Zobacz profil” działają. Zdjęcia w panelu profilu też otwierają lightbox.

- [ ] **Step 4: Commit**

```bash
git add js/view-gallery.js css/components.css index.html
git commit -m "Galeria z lightboxem (lokalne zdjęcia)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Historie i dokumenty (`js/view-stories.js`, `js/files-db.js`)

**Files:**
- Create: `js/files-db.js`, `js/view-stories.js`
- Modify: `css/components.css`, `index.html` (`files-db.js` po `store.js`, `view-stories.js` przed `app.js`)

**Interfaces:**
- Consumes: `store.items/saveItem/deleteItem/newId`, `selectors.documentsFromTree`, `search.pickPerson`, `modal`
- Produces:
  - `Drzewo.filesDb = { available: boolean, put(key, blob) → Promise, get(key) → Promise<Blob|null>, del(key) → Promise }` (IndexedDB `drzewo-pliki`, magazyn `files`)
  - `Drzewo.views.stories`. `show(param)` otwiera historię o id `param` (link z profilu `#/historie/<id>`).
  - `Drzewo.stories.editItem(kind, item|null)`: formularz dodawania lub edycji, używany przez przyciski trybu edycji (Task 20)

- [ ] **Step 1: `js/files-db.js`**

```js
(function () {
  'use strict';
  const D = window.Drzewo;
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('Brak IndexedDB'));
      const req = indexedDB.open('drzewo-pliki', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction('files', mode);
      const r = fn(t.objectStore('files'));
      t.oncomplete = () => resolve(r && r.result !== undefined ? r.result : null);
      t.onerror = () => reject(t.error);
    });
  }
  D.filesDb = {
    available: !!window.indexedDB,
    put: (key, blob) => tx('readwrite', (s) => s.put(blob, key)),
    get: (key) => tx('readonly', (s) => s.get(key)).then((x) => x || null),
    del: (key) => tx('readwrite', (s) => s.delete(key)),
  };
})();
```

- [ ] **Step 2: CSS**

```css
/* ── Historie i dokumenty ── */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
.tabs button { min-height: 44px; padding: 0 16px; border: 0; border-bottom: 3px solid transparent; background: none; font-weight: 600; color: var(--text-2); cursor: pointer; }
.tabs button[aria-selected="true"] { color: var(--accent-strong); border-bottom-color: var(--accent); }
.story-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.story-card { display: flex; flex-direction: column; gap: 6px; padding: 18px; text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; color: var(--text); }
.story-card:hover { box-shadow: var(--shadow-1); border-color: var(--text-3); }
.story-card h3 { margin: 0; font-size: 18px; }
.story-card p { margin: 0; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.story-thumb { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radius-sm); background: var(--surface-2); }
.story-read { white-space: pre-line; line-height: 1.7; }
.story-read img { border-radius: var(--radius-sm); margin: 12px 0; }
.tree-docs { margin-top: 32px; }
.tree-docs h2 { font-size: 20px; margin: 0 0 4px; }
.doc-row { display: grid; grid-template-columns: 120px 1fr; gap: 4px 16px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.doc-row .muted { font-size: 14px; }
.person-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.person-chip { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 6px 0 12px; border-radius: 999px; background: var(--surface-2); }
.person-chip button { border: 0; background: none; cursor: pointer; width: 28px; height: 28px; border-radius: 50%; }
```

- [ ] **Step 3: `js/view-stories.js`**

```js
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
```

- [ ] **Step 4: Sprawdź w przeglądarce**

`#/historie`: pusty stan z tekstem zachęty. Zakładka „Dokumenty” pokazuje „Akty zapisane w drzewie” (np. „Akt nr.27/1908”) i źródło Wachowska, cytowane przy 34 osobach. Pełny test dodawania wykonasz po Task 20 (wymaga trybu edycji). Na razie w konsoli: `document.body.classList.add('editing'); document.dispatchEvent(new Event('drzewo:editing'))` i dodaj historię ze zdjęciem i jedną osobą. Karta pokazuje miniaturę, klik otwiera podgląd, a po przeładowaniu historia i zdjęcie zostają. Profil powiązanej osoby ma link w sekcji „Historie i dokumenty”.

- [ ] **Step 5: Commit**

```bash
git add js/files-db.js js/view-stories.js css/components.css index.html
git commit -m "Historie i dokumenty: edytor, pliki w IndexedDB, akty z drzewa

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 20: Tryb edycji, import i eksport (`js/ui-edit.js`)

**Files:**
- Modify: `js/gedcom-date.js` (dodaj `fromUserInput`, `toUserInput`), `tests/date.test.js`
- Create: `js/ui-edit.js`
- Modify: `js/view-people.js` (wywołanie `renderPeopleAdd`), `css/components.css`, `index.html` (`<script src="js/ui-edit.js">` po `ui-profile.js`)

**Interfaces:**
- Consumes: `store` (wszystkie operacje), `search.pickPerson`, `modal`, `relations.spousesOf`, `profile.refresh`
- Produces:
  - `Drzewo.date.fromUserInput(text) → string|null` (polski zapis daty → GEDCOM), `Drzewo.date.toUserInput(DateInfo|null) → string`
  - `Drzewo.edit = { init(), active: boolean, decorateProfile(panel, person), renderPeopleAdd(), personForm(person|null, { prefill, title }) → Promise<Person|null> }`
  - Klasa `body.editing` i zdarzenie `drzewo:editing` na `document` przy przełączeniu

- [ ] **Step 1: Testy dat wpisywanych przez użytkownika (dopisz do `tests/date.test.js`)**

```js
const { fromUserInput, toUserInput } = require('../js/gedcom-date.js');

test('fromUserInput: polskie formaty → GEDCOM', () => {
  assert.equal(fromUserInput('12.03.1901'), '12 MAR 1901');
  assert.equal(fromUserInput('1.3.1901'), '1 MAR 1901');
  assert.equal(fromUserInput('03.1901'), 'MAR 1901');
  assert.equal(fromUserInput('1901'), '1901');
  assert.equal(fromUserInput('ok. 1900'), 'ABT 1900');
  assert.equal(fromUserInput('około 1900'), 'ABT 1900');
  assert.equal(fromUserInput('przed 5.02.1976'), 'BEF 5 FEB 1976');
  assert.equal(fromUserInput('po 1900'), 'AFT 1900');
  assert.equal(fromUserInput('12 marca 1901'), '12 MAR 1901');
  assert.equal(fromUserInput('3 października 1950'), '3 OCT 1950');
  assert.equal(fromUserInput('8 MAY 1945'), '8 MAY 1945');
  assert.equal(fromUserInput('  '), null);
  assert.equal(fromUserInput('31.13.1901'), '31.13.1901');
  assert.equal(parseDate(fromUserInput('31.13.1901')).year, null);
});

test('toUserInput i powrót', () => {
  assert.equal(toUserInput(parseDate('8 MAY 1945')), '08.05.1945');
  assert.equal(toUserInput(parseDate('ABT SEP 1897')), 'ok. 09.1897');
  assert.equal(toUserInput(parseDate('1908')), '1908');
  assert.equal(toUserInput(parseDate('xxxx')), 'xxxx');
  assert.equal(toUserInput(null), '');
  for (const raw of ['8 MAY 1945', 'ABT SEP 1897', 'BEF 1 FEB 1976', '1908', 'AFT 1900'])
    assert.equal(parseDate(fromUserInput(toUserInput(parseDate(raw)))).display, parseDate(raw).display, raw);
});
```

- [ ] **Step 2: Uruchom, żeby potwierdzić porażkę**

Run: `node --test tests/date.test.js`
Expected: FAIL (`fromUserInput is not a function`).

- [ ] **Step 3: Zaimplementuj w `js/gedcom-date.js` (wewnątrz fabryki, przed `return`)**

```js
  const MON = Object.keys(MONTHS);
  const PL3 = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paz', 'lis', 'gru'];
  const PREFIX_IN = { 'ok.': 'ABT', ok: 'ABT', 'około': 'ABT', 'ca.': 'ABT', ca: 'ABT', przed: 'BEF', po: 'AFT' };
  const PREFIX_OUT = { ABT: 'ok. ', CAL: 'ok. ', EST: 'ok. ', BEF: 'przed ', AFT: 'po ' };
  const fold3 = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').toLowerCase().slice(0, 3);
  const pad2 = (n) => String(n).padStart(2, '0');

  function fromUserInput(input) {
    const s = String(input == null ? '' : input).trim();
    if (!s) return null;
    const low = s.toLowerCase().replace(/\s+/g, ' ');
    let prefix = '', body = low;
    const q = low.match(/^(ok\.?|około|ca\.?|przed|po) (.+)$/);
    if (q) { prefix = PREFIX_IN[q[1]] + ' '; body = q[2]; }
    let m = body.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    if (m && +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31) return `${prefix}${+m[1]} ${MON[+m[2] - 1]} ${m[3]}`;
    m = body.match(/^(\d{1,2})[.\-/](\d{4})$/);
    if (m && +m[1] >= 1 && +m[1] <= 12) return `${prefix}${MON[+m[1] - 1]} ${m[2]}`;
    m = body.match(/^(?:(\d{1,2}) )?([a-ząćęłńóśźż]+)\.? (\d{4})$/i);
    if (m) {
      let idx = PL3.indexOf(fold3(m[2]));
      if (idx < 0) idx = MON.indexOf(m[2].slice(0, 3).toUpperCase());
      if (idx >= 0) return `${prefix}${m[1] ? +m[1] + ' ' : ''}${MON[idx]} ${m[3]}`;
    }
    if (/^\d{3,4}$/.test(body)) return prefix + body;
    return s;
  }

  function toUserInput(date) {
    if (!date) return '';
    const m = String(date.raw).toUpperCase().match(/^(?:(ABT|CAL|EST|BEF|AFT) )?(?:(\d{1,2}) )?(?:([A-Z]{3}) )?(\d{3,4})$/);
    if (!m || (m[3] && !MONTHS[m[3]])) return date.raw;
    const pre = PREFIX_OUT[m[1]] || '';
    if (m[2] && m[3]) return `${pre}${pad2(m[2])}.${pad2(MONTHS[m[3]])}.${m[4]}`;
    if (m[3]) return `${pre}${pad2(MONTHS[m[3]])}.${m[4]}`;
    return pre + m[4];
  }
```
i zmień `return { parseDate, MONTHS_PL };` na `return { parseDate, MONTHS_PL, fromUserInput, toUserInput };`.

- [ ] **Step 4: Uruchom testy**

Run: `node --test tests/`
Expected: PASS (wszystkie).

- [ ] **Step 5: CSS (dopisz do `css/components.css`)**

```css
/* ── Tryb edycji ── */
.menu-wrap { position: relative; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 60; min-width: 270px; padding: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-2); }
.menu button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 0 12px; border: 0; border-radius: 8px; background: none; text-align: left; cursor: pointer; }
.menu button:hover, .menu button:focus-visible { background: var(--surface-2); }
.menu hr { border: 0; border-top: 1px solid var(--border); margin: 6px 0; }
.menu .danger-text { color: var(--danger); }
body.editing .topbar { box-shadow: inset 0 -3px 0 var(--accent); }
.rel-item { position: relative; }
.rel-unlink { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: var(--surface); }
.rel-add { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.changes-banner { position: fixed; left: 50%; transform: translateX(-50%); bottom: 16px; z-index: 45; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; max-width: calc(100vw - 32px); padding: 10px 12px 10px 16px; background: var(--surface); border: 1px solid var(--accent); border-radius: var(--radius-sm); box-shadow: var(--shadow-2); }
.changes-banner p { margin: 0; font-size: 14px; }
body.profile-open .changes-banner { left: calc((100vw - var(--drawer-w)) / 2); }
.date-preview { min-height: 18px; }
@media (max-width: 900px) {
  .changes-banner { bottom: calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom)); }
  body.profile-open .changes-banner { display: none; }
  .edit-label { display: none; }
}
```

- [ ] **Step 6: `js/ui-edit.js`**

```js
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
```
Uwaga do `setEvent` dla OCCU: zawód trzymamy w `value`, a `date`/`place` są puste. Warunek usuwania (`!date && !place && !value`) usuwa więc zdarzenie zawodu po wyczyszczeniu pola.

- [ ] **Step 7: Podłącz przycisk „Dodaj osobę” w widoku Osoby**

W `js/view-people.js`, na końcu `mount()` (po `renderList();`), dodaj:
```js
    if (D.edit) D.edit.renderPeopleAdd();
```

- [ ] **Step 8: Sprawdź w przeglądarce (pełny scenariusz edycji)**

Na `file://`, konsola bez błędów przez cały scenariusz:
1. „Edytuj” → pod paskiem zielona linia, przycisk „Zakończ edycję”.
2. Profil Ireny → „Edytuj”, w polu daty urodzenia wpisz „12.03.1930”. Podgląd pokazuje „→ 12 mar 1930”. Zapisz: profil i karta w drzewie pokazują 1930, a po przeładowaniu zmiana zostaje.
3. „+ Dziecko” → „Nowa osoba” (nazwisko podpowiada się samo) → zapisz. Dziecko pojawia się w profilu i w drzewie pod rodzicami.
4. Ikona odłączenia przy dziecku → potwierdź; dziecko znika z „Rodzina”; „Cofnij” w toaście je przywraca.
5. „+ Rodzic” → „Wybierz z drzewa” → wybierz prawnuka. Toast: „Nie można: wybrana osoba jest potomkiem tego dziecka.”
6. „Usuń” na nowej osobie → modal → usunięta, panel zamknięty; Ctrl+Z przywraca.
7. Baner „Zmiany są zapisane tylko w tej przeglądarce” → „Eksportuj kopię” pobiera JSON, baner znika.
8. Menu ⋯ → „Eksportuj GEDCOM” → potem „Przywróć dane z pliku…” (dane wracają do oryginału) → „Importuj GEDCOM…” z pobranym plikiem → drzewo z poprawkami, 210 osób.
9. Menu ⋯ → „Importuj GEDCOM…” z `index-stary.html` (nie-GEDCOM) → toast z błędem, aplikacja działa dalej.
10. `#/osoby` → „Dodaj osobę” widoczne tylko w trybie edycji. `#/historie` → „Dodaj historię” ze zdjęciem i osobą, a po przeładowaniu zdjęcie zostaje.

- [ ] **Step 9: Commit**

```bash
git add js/gedcom-date.js tests/date.test.js js/ui-edit.js js/view-people.js css/components.css index.html
git commit -m "Tryb edycji: formularz osoby, relacje, undo, import i eksport

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Dopracowanie, dostępność i weryfikacja końcowa

**Files:**
- Modify: `js/router.js` (usunięcie rusztowania), ewentualne poprawki CSS wykryte w przeglądzie
- Create: `README.md`

- [ ] **Step 1: Usuń rusztowanie z routera**

W `js/router.js`, w `showView`, zamień blok `if (v) { … } else { … }` na:
```js
    if (!mounted.has(name)) { v.mount(U.$(`[data-view="${name}"]`)); mounted.add(name); }
    if (v.show) v.show(param);
```

- [ ] **Step 2: Napisz `README.md`**

```markdown
# Drzewo rodziny

Aplikacja do przeglądania drzewa genealogicznego (dane z MyHeritage). Działa bez internetu i bez serwera, poza mapą i fontem.

## Jak otworzyć
Kliknij dwukrotnie `index.html` (najlepiej Chrome, Edge lub Firefox).

## Nowy eksport z MyHeritage
1. W MyHeritage: Drzewo rodzinne → Zarządzaj drzewami → Eksportuj do GEDCOM.
2. Zapisz plik jako `data/rodzina.ged`.
3. W Terminalu, w tym folderze, uruchom kolejno:
   - `node scripts/build-data.js` (dane drzewa)
   - `node scripts/fetch-photos.js` (zdjęcia – zrób to od razu, linki MyHeritage wygasają po kilku dniach)
   - `node scripts/geocode-places.js` (współrzędne nowych miejscowości)

Bez Terminala: w aplikacji menu ⋯ → „Importuj GEDCOM…”. Wtedy zdjęcia są ładowane z MyHeritage, dopóki linki działają.

## Zmiany i kopie
Zmiany z trybu „Edytuj” są zapisywane tylko w tej przeglądarce. Menu ⋯ → „Eksportuj kopię (JSON)” lub „Eksportuj GEDCOM” zapisuje je do pliku.

## Testy
`node --test tests/`
```

- [ ] **Step 3: Testy jednostkowe**

Run: `node --test tests/`
Expected: wszystkie PASS, 0 fail. Wklej podsumowanie (liczba testów).

- [ ] **Step 4: Przegląd w przeglądarce – 1440 px i 390 px, oba motywy**

Na `file:///…/index.html` (claude-in-chrome) dla każdego widoku (Drzewo, Osoby, Oś czasu, Miejsca, Galeria, Historie, profil, paleta, modal edycji) w jasnym i ciemnym motywie:
- konsola: `read_console_messages` bez błędów i ostrzeżeń z naszych plików;
- brak poziomego przewijania strony przy 390 px (`javascript_tool`: `document.documentElement.scrollWidth <= innerWidth`);
- nigdzie nie ma tekstu „undefined”, „NaN”, „null” ani pustego „()” (`javascript_tool`: `/undefined|NaN|\bnull\b|\(\)/.test(document.body.innerText)` → `false` w każdym widoku);
- klawiatura: Tab przechodzi przez pasek, widok i panel z widocznym fokusem; Esc zamyka panel, paletę, modal i lightbox; w drzewie działają strzałki i +/−;
- kontrast: tekst drugorzędny (`--text-3`) na `--bg` i `--surface-2` ≥ 4.5:1 w obu motywach (jasny `#5f6973` na `#f6f7f9` ≈ 5.2:1, ciemny `#8d98a2` na `#1b2127` ≈ 5.4:1). Przy każdej zmianie kolorów policz ponownie;
- zrzuty ekranu każdego widoku do oceny wizualnej. Popraw rażące błędy układu (nachodzące elementy, ucięte teksty, przyciski < 44 px).

- [ ] **Step 5: Scenariusze z „Review Focus”**

1. Import wadliwego pliku (`index-stary.html` i pusty plik `.ged`) → czytelny toast, aplikacja działa.
2. Osoba bez dat i zdjęcia (wybierz w `#/osoby` kogoś bez lat) → karta i profil bez „undefined”, z inicjałami i „Brak zapisanych dat”.
3. localStorage zablokowany: tymczasowo zmień w `js/app.js` ciało `safeLocalStorage()` na `return null;`, przeładuj i sprawdź toast „Przeglądarka blokuje zapis…” oraz to, że edycja działa do przeładowania. Potem przywróć oryginał (`git diff js/app.js` ma być pusty).
4. Pętla: w trybie edycji spróbuj dodać prawnuka jako rodzica → komunikat zamiast zawieszenia.
5. Polskie znaki: paleta „zuromin” znajduje osoby z Żuromina; dodaj osobę o imieniu `<b>Test</b> "Ala"` → wyświetla się dosłownie, bez pogrubienia; potem ją usuń.

- [ ] **Step 6: Commit**

```bash
git add -A -- . ':!data' ':!photos' ':!*.ged'
git commit -m "Dopracowanie: README, usunięcie rusztowania, poprawki dostępności

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Przed commitem uruchom `git status --short` i upewnij się, że żaden plik z `data/`, `photos/` ani `.ged` nie jest dodawany.
