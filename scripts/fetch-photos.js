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
