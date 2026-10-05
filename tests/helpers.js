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
