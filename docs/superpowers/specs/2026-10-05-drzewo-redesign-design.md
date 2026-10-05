# Drzewo genealogiczne: redesign UX/UI i prawdziwe dane

## Kontekst
`index.html` to prototyp w jednym pliku (45 KB). Ma 20 fikcyjnych osób „Wierzbickich”, zdjęcia z Unsplash i zmyślone historie i dokumenty, a dane trzyma w localStorage. Obok leży prawdziwy eksport z MyHeritage, `6c83t8_…_A (1).ged`: 209 osób, 72 rodziny, lata 1822–1977. Nazwiska to Dobies, Szczech, Burczyńscy, Perłowscy, Dębscy. Miejsca to Kliczewo, Żuromin, Zielona i inne. Plik ma 19 zdjęć, 35 cytowań źródeł i notatki typu „Akt nr 7/1912”.
Obecne drzewo to siatka po 4 osoby na pokolenie, więc przy 209 osobach będzie nieczytelne.

Cel: atrakcyjna, czytelna aplikacja w stylu MyHeritage, działająca na prawdziwych danych. Rodzina ma ją wygodnie przeglądać (także na telefonie i osoby starsze), a opiekun drzewa ma ją łatwo edytować.

### Ustalenia z rozmowy
- Odbiorcy: rodzina przegląda, 1–2 osoby edytują.
- Dane: wczytujemy GEDCOM. Fikcyjne treści usuwamy.
- Stos: **zwykły HTML + CSS + JS, bez builda i bez npm**. Aplikacja otwiera się podwójnym kliknięciem w `index.html` (`file://`).
- Drzewo: całe naraz na płótnie, z zoomem, przesuwaniem i minimapą. Układ liczy ELK.js, rysuje SVG, zoom obsługuje d3-zoom.
- Sekcje: Drzewo, Osoby, Oś czasu, Miejsca (prawdziwa mapa), Galeria, Historie i dokumenty (puste, do uzupełnienia).
- Zapis: localStorage jako nakładka na GEDCOM, z eksportem do GEDCOM i JSON. Bez serwera.
- Styl: nowoczesny, jasny, jak w MyHeritage.
- Hosting: na razie tylko lokalnie. Adresy e-mail z GEDCOM pomijamy przy imporcie.

### Założenia (do korekty)
- Zdjęcia: linki `sites-cf.mhcache.com` mają w URL-u parametr wygaśnięcia (`e=1791817200`, ok. 12.10.2026). Jednorazowy skrypt pobierze je do `photos/`.
- Współrzędne miejsc: jednorazowy skrypt pobierze je z Nominatim i zapisze w `data/places.js`, z ręczną normalizacją (np. „Zielona. pow. żuromiński” = „Zielona pow Żuromin”).
- Tryb ciemny: tak, przez tokeny CSS. Mały koszt.

## Architektura

Ograniczenia `file://`: przeglądarka blokuje `fetch` lokalnych plików, moduły ES (`type="module"`) i Web Workery. Dlatego:
- każdy plik JS to zwykły `<script>` rejestrujący się w jednej przestrzeni nazw `window.Drzewo` (np. `Drzewo.gedcom`, `Drzewo.relations`). Kolejność ładowania ustala `index.html`;
- dane trafiają do aplikacji jako pliki `.js` przypisujące globalną zmienną, a nie przez `fetch`;
- biblioteki leżą lokalnie w `vendor/`, więc działają też offline (poza kafelkami mapy).

```
DRZEWO GENEALOGICZNE/
  index.html                 ← szkielet + <script> w ustalonej kolejności
  css/  tokens.css base.css components.css tree.css
  js/
    gedcom-date.js           ← "ABT SEP 1897", "CAL 1871", "xxxx" → {year, approx, display:"ok. wrz 1897"}
    gedcom-parse.js          ← tekst .ged → rekordy → model Person/Family/Source (pomija EMAIL)
    gedcom-export.js         ← model → GEDCOM 5.5.1 (+ JSON)
    store.js                 ← dane bazowe + nakładka zmian (localStorage) + IndexedDB na pliki; pub/sub; undo
    relations.js             ← rodzice, dzieci, rodzeństwo, małżonkowie, przodkowie, potomkowie, pokrewieństwo po polsku
    tree-layout.js           ← model → graf ELK (osoby + węzły-rodziny) → pozycje; cache w localStorage po hashu relacji
    tree-render.js           ← SVG: karty, linie ortogonalne, semantyczny zoom, podświetlenia
    tree-viewport.js         ← d3-zoom, minimapa, centrowanie na osobie
    ui-*.js                  ← router (hash), wyszukiwarka ⌘K, panel profilu, formularz, modal, toast
    view-*.js                ← people, timeline, places, gallery, stories
    app.js                   ← start: wczytaj dane → store → router
  data/
    rodzina.ged              ← kopia eksportu z MyHeritage (źródło prawdy)
    rodzina.js               ← window.DRZEWO_GEDCOM = `…treść .ged…` (generowany)
    places.js                ← window.DRZEWO_PLACES = {"Kliczewo":[lat,lng],…} (generowany)
    photos.js                ← window.DRZEWO_PHOTOS = {"<url MyHeritage>":"photos/xxx.jpg"} (generowany)
  photos/*.jpg               ← zdjęcia pobrane z MyHeritage
  vendor/  elk.bundled.js  d3-selection+d3-zoom (UMD)  leaflet.js  leaflet.css
  scripts/                   ← narzędzia uruchamiane `node scripts/…` (czysty Node 23, bez npm install)
    build-data.js            ← data/rodzina.ged → data/rodzina.js
    fetch-photos.js          ← pobiera OBJE FILE → photos/, zapisuje data/photos.js
    geocode-places.js        ← PLAC → Nominatim (1 req/s) → data/places.js (+ ręczne aliasy)
  tests/*.test.js            ← `node --test tests/` (wbudowany runner Node, bez zależności)
  index-stary.html           ← obecny prototyp zachowany do porównania
```

Wspólny kod dla przeglądarki i Node: pliki `gedcom-*.js` i `relations.js` mają nagłówek UMD (`if (typeof module!=='undefined') module.exports = …`), więc testy w Node używają dokładnie tego samego kodu.

**Przepływ danych:** `data/rodzina.js` → `gedcom-parse` → `store` (scala z nakładką z localStorage) → widoki subskrybują store. Przycisk „Importuj GEDCOM” (`<input type=file>` + FileReader, działa na `file://`) podmienia dane bazowe na nowszy eksport z MyHeritage i zapisuje je w IndexedDB. Edycja zapisuje różnice w nakładce i woła `store.emit()`. Drzewo przelicza układ tylko przy zmianie relacji.

**Układ drzewa:** ELK `layered`, kierunek DOWN. Węzły to osoby (karta ok. 180×64) i małe węzły-rodziny. Krawędzie: mąż → rodzina, żona → rodzina, rodzina → dziecko. Krawędzie są ortogonalne, a ELK minimalizuje ich przecięcia. Bez workera (blokuje go `file://`) ELK liczy w wątku głównym, ok. 1–2 s z szkieletem ładowania. Wynik trafia do cache w localStorage, więc kolejne otwarcia są natychmiastowe.

## UX/UI

**Styl:** biel i jasna szarość (#f6f7f9), jeden kolor akcentu (zieleń drzewa), kobiety i mężczyźni rozróżnieni subtelną kolorową belką na karcie (jak w MyHeritage). Font Inter lub DM Sans, bazowy rozmiar 16px, kontrast AA, cele dotyku ≥44px, tryb ciemny.

**Nawigacja:** górny pasek z 6 pozycjami: Drzewo, Osoby, Oś czasu, Miejsca, Galeria, Historie. Na telefonie zastępuje go dolny pasek zakładek. Globalna wyszukiwarka działa też pod ⌘K lub „/”: fuzzy po imieniu, nazwisku i nazwisku panieńskim, z latami i miejscem w wynikach. Routing przez hash (`#/osoba/I500002`), więc linki do osób można udostępniać.

**Strona startowa** = drzewo (najważniejsza rzecz od razu), z małym paskiem statystyk: osoby, pokolenia, lata, nazwiska.

**Drzewo (główny ekran):**
- Karta osoby: zdjęcie albo inicjały, imię i nazwisko, przy kobietach „z d. …”, lata „1897–1975”, belka płci. Zmarłych oznacza delikatny znak †, bez wyszarzania.
- Semantyczny zoom: przy oddaleniu tylko imię i nazwisko na kolorowych prostokątach, przy przybliżeniu pełna karta.
- Kliknięcie osoby podświetla jej przodków i potomków (reszta drzewa przygasa) i otwiera panel profilu. Podwójne kliknięcie albo wynik wyszukiwania płynnie centruje drzewo na osobie.
- Pasek narzędzi: zoom +/−, „dopasuj do ekranu”, „pokaż mnie” (wybrana osoba startowa zapamiętana w localStorage), filtr podświetlenia według nazwiska lub gałęzi, minimapa w rogu (na telefonie zwijana).
- Obsługa: przeciąganie myszą i palcem, pinch, kółko, klawiatura (strzałki, +/−).

**Panel profilu** (z prawej, na telefonie pełny ekran od dołu):
- Nagłówek ze zdjęciem, imieniem, nazwiskiem, z d. …, latami.
- Fakty: urodzenie, chrzest, ślub, śmierć, pochówek, każde z datą, miejscem i notatką (np. nr aktu).
- „Rodzina” jako klikalne mini-karty pogrupowane: rodzice, małżonkowie (z datą ślubu), rodzeństwo, dzieci.
- „Pokrewieństwo z [moja osoba]”, np. „prapradziadek”, liczone w `js/relations.js`.
- Mini oś czasu życia, zdjęcia, źródła, wspomnienia i notatki dopisane w aplikacji.
- Przyciski: „Pokaż w drzewie”, „Edytuj” (w trybie edycji).

**Osoby:** tabela lub siatka z sortowaniem (nazwisko, rok urodzenia) i filtrami (nazwisko, miejsce, żyjący/zmarli, ze zdjęciem), grupowanie po nazwisku, licznik wyników.

**Oś czasu:** generowana automatycznie ze zdarzeń w GEDCOM, grupowana po dekadach, z filtrem rodzaju (urodzenia, śluby, zgony) i nazwiska. Kontekst historyczny (np. 1914, 1939) jako delikatne znaczniki.

**Miejsca:** Leaflet z kafelkami OpenStreetMap (nie wymaga klucza API). Pinezki z liczbą osób. Kliknięcie pokazuje listę osób i zdarzeń w danym miejscu. Obok lista miejsc posortowana po liczbie zdarzeń.

**Galeria:** siatka masonry z pobranych zdjęć, podpis z osobą i lightbox (strzałki, Esc).

**Historie i dokumenty:** puste stany z zachętą („Dodaj pierwsze wspomnienie”). W trybie edycji prosty edytor: tytuł, treść, powiązane osoby, data, zdjęcie lub skan jako data-URL w IndexedDB (localStorage ma za mały limit). Dokumenty dostają też automatyczną listę źródeł i aktów z GEDCOM (NOTE „Akt nr…”, SOUR).

**Tryb edycji:** jeden przełącznik „Edytuj” w pasku. Edycja otwiera formularz w panelu: dane, zdarzenia, relacje (dodaj rodzica, małżonka lub dziecko z wyszukiwarką zamiast długiego selecta). Usuwanie potwierdza własny modal, nie `confirm()`. Jest też cofnij ostatnią zmianę oraz baner „Masz niezapisane zmiany, wyeksportuj kopię” z przyciskami Eksport GEDCOM / JSON i „Przywróć dane z pliku”.

**Stany puste, ładowania i błędów:** szkielet drzewa podczas liczenia układu, komunikat przy braku wyników, przy brakującym zdjęciu fallback do inicjałów.

## Kluczowe decyzje i ryzyka
- **ELK przy 209 osobach** liczy się w ok. 1–2 s w wątku głównym (ze szkieletem ładowania). Jeśli wynik będzie zbyt szeroki, zostaje opcja „pokaż tylko gałąź nazwiska X” (ten sam layout na podzbiorze).
- **Małżeństwa między gałęziami** tworzą cykle wizualne, ale nie w grafie (osoba → rodzina → dziecko to DAG), więc ELK sobie poradzi.
- **Daty niepełne** („xxxx”, „ABT”, „CAL”) normalizujemy do `{year?, approx, display}` z polskimi skrótami miesięcy.
- **Prywatność:** e-maile i `RESI EMAIL` pomijamy przy imporcie. Osoby żyjące (bez DEAT i urodzone po 1925) dostają flagę `living`, na przyszłość pod publikację.

## Zależności
Bez npm. Pliki z cdnjs/jsdelivr pobrane jednorazowo do `vendor/`: `elk.bundled.js` (elkjs), `d3-selection` i `d3-zoom` (UMD), `leaflet.js` i `leaflet.css`. Font Inter z Google Fonts, z systemowym fallbackiem offline. Node 23 tylko do skryptów i `node --test`.

## Kolejność realizacji (po akceptacji)
1. Skopiować ten projekt jako spec do `docs/superpowers/specs/2026-10-05-drzewo-redesign-design.md`, zrobić `git init` i commit (`.ged`, `data/` i `photos/` dodać do `.gitignore`, bo to dane osobowe).
2. Skill writing-plans: szczegółowy plan zadań z TDD dla parsera, dat, relacji i eksportu.
3. Implementacja etapami: dane (parser, skrypty, testy) → drzewo → profil → pozostałe widoki → edycja, import i eksport → dopracowanie wizualne i mobilne. Zdjęcia pobrać jako pierwsze, przed 12.10.2026.

## Weryfikacja
- `node --test tests/`: parser na prawdziwym pliku daje 209 osób, 72 rodziny i 0 osieroconych referencji. Daty „ABT SEP 1897”, „xxxx” i „CAL 1871” parsują się poprawnie. Relacje i pokrewieństwo (rodzic, dziadek, kuzyn) działają na znanych parach. Eksport → import daje identyczny model (round-trip). Żaden e-mail nie trafia do modelu.
- Otwarcie `index.html` przez `file://` w Chrome (claude-in-chrome) w rozmiarach 1440 px i 390 px, bez błędów w konsoli: drzewo się renderuje, zoom, pan i minimapa działają, wyszukiwanie centruje osobę, panel profilu pokazuje rodzinę i pokrewieństwo, mapa ma pinezki, galeria ładuje lokalne zdjęcia, edycja przetrwa przeładowanie, eksport GEDCOM wczytany przez „Importuj” daje to samo drzewo.
