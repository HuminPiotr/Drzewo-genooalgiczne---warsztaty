(function () {
  'use strict';
  const D = window.Drzewo;
  const U = D.util, P = D.person, R = D.relations, S = D.selectors, TL = D.treeLayout;
  const MIN_K = 0.06, MAX_K = 2.5, FAR_K = 0.45, START_K = 0.7, MW = 220, MH = 150;
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
  // Osoba startowa: "To ja", a gdy brak – pierwsza osoba pliku (właściciel drzewa w eksporcie MyHeritage)
  function homeId() {
    const me = U.prefs.get('me', null);
    return me && model.people[me] ? me : Object.keys(model.people)[0];
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
    if (!fitted) startView();
    if (pendingCenter) { const id = pendingCenter; pendingCenter = null; centerOn(id); }
  }

  function startView() {
    fitted = true;
    centerOn(focusId || homeId(), focusId ? undefined : START_K, false);
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
      if (!fitted && !el.hidden) startView();
      applyHighlight();
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
  function centerOn(id, k, animate = true) {
    const n = layout && layout.nodes['p:' + id];
    const { W, H } = viewport();
    if (!n || !W || el.closest('[hidden]')) { pendingCenter = id; return; }
    const scale = k || Math.max(d3.zoomTransform(svg.node()).k, 0.85);
    const t = d3.zoomIdentity.translate(W / 2 - (n.x + n.w / 2) * scale, H / 2 - (n.y + n.h / 2) * scale).scale(scale);
    (animate ? transition() : svg).call(zoom.transform, t);
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
      const id = homeId();
      D.router.go('#/osoba/' + encodeURIComponent(id));
      U.selection.set(id, { center: true });
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
    const desktop = innerWidth > 900;
    mini.style('height', Math.max(44, Math.min(desktop ? 150 : 100, Math.round((desktop ? 220 : 150) * layout.height / layout.width) + 10)) + 'px');
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
