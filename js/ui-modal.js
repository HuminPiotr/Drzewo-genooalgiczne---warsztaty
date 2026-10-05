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
