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
