# Drzewo rodziny

Aplikacja do przeglądania drzewa genealogicznego (dane z MyHeritage). Działa bez serwera, poza mapą i fontem.

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
Zmiany z trybu „Edytuj” są zapisywane tylko w tej przeglądarce. Menu ⋯ → „Eksportuj kopię (JSON)” lub „Eksportuj GEDCOM” zapisuje je do pliku. Skany i zdjęcia dodane do historii zostają w przeglądarce i nie trafiają do eksportu.

## Prywatność
Repozytorium zawiera dane rodzinne (`data/`, `photos/`): imiona, nazwiska, daty, miejsca i zdjęcia, także osób żyjących. Jeśli publikujesz je (np. na GitHub Pages), są widoczne dla każdego z linkiem, również przy prywatnym repo. Adresy e-mail są usuwane z `data/rodzina.js` przez `scripts/build-data.js`, a surowe pliki `*.ged` są w `.gitignore`.

## Testy
`node --test tests/*.test.js`
