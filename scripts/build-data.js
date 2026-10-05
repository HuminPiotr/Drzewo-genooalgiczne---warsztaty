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
