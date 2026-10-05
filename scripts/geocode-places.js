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
    const county = hint && /żuromi/i.test(hint) ? 'żuromiński' : hint;
    const plain = name.replace(/\s*\((.+)\)$/, ', $1'); // "Stara Dąbrowa (Kampinos)" → "Stara Dąbrowa, Kampinos"
    result[name] = (county && await query(`${plain}, powiat ${county}`))
      || await query(`${plain}, mazowieckie`) || await query(plain);
    console.log(`${result[name] ? '✓' : '✗'} ${name} ${JSON.stringify(result[name])}  ← ${raws.join(' | ')}`);
  }
  fs.writeFileSync(out, '// Wygenerowane przez scripts/geocode-places.js – można poprawiać ręcznie\nwindow.DRZEWO_PLACES = '
    + JSON.stringify(result, null, 1) + ';\n');
})();
