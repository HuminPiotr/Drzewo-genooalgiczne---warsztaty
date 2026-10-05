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
