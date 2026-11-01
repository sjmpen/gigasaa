/* Viivakaavio: tämän vuoden ja viime vuoden lämpötila ±30 päivää tästä päivästä.
 * Puhdas SVG, ristikkokursori + työkaluvihje, näppäimistöllä selattava. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const NS = 'http://www.w3.org/2000/svg';
  const WD = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function niceStep(range, target) {
    const raw = range / target;
    const steps = [1, 2, 5, 10, 20];
    return steps.find((s) => s >= raw) || 20;
  }
  const dm = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d}.${m}.`; };

  function YearChart(root) {
    this.root = root;
    this.tip = document.createElement('div');
    this.tip.className = 'chart-tip';
    this.tip.hidden = true;
    root.appendChild(this.tip);
    this.data = null;
    this.ro = new ResizeObserver(() => this.data && this.draw());
    this.ro.observe(root);
  }

  YearChart.prototype.render = function (data) {
    this.data = data;
    this.draw();
  };

  YearChart.prototype.draw = function () {
    const data = this.data, root = this.root;
    const W = Math.max(280, root.clientWidth);
    const H = W < 560 ? 250 : 310;
    const m = { t: 26, r: W < 560 ? 40 : 48, b: 28, l: 38 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    if (this.svg) this.svg.remove();
    const svg = (this.svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart-svg', tabindex: 0, role: 'img' }));
    svg.setAttribute('aria-label', data.aria);
    root.insertBefore(svg, this.tip);

    const days = data.days;
    const o0 = days[0].offset, o1 = days[days.length - 1].offset;
    const vals = [];
    days.forEach((d) => [d.cur, d.prev, d.lo, d.hi].forEach((v) => v != null && vals.push(v)));
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (!isFinite(lo)) { lo = -5; hi = 5; }
    const step = niceStep(hi - lo || 1, 5);
    lo = Math.floor((lo - 0.5) / step) * step;
    hi = Math.ceil((hi + 0.5) / step) * step;
    const x = (o) => m.l + ((o - o0) / (o1 - o0)) * iw;
    const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
    this.x = x; this.y = y; this.m = m; this.W = W; this.H = H;

    // ennustealue
    const fx = x(0);
    el('rect', { x: fx, y: m.t, width: m.l + iw - fx, height: ih, class: 'c-future' }, svg);
    const fl = el('text', { x: m.l + iw - 4, y: m.t - 8, class: 'c-label', 'text-anchor': 'end' }, svg);
    fl.textContent = 'Ennuste →';

    // vaakaviivat
    for (let v = lo; v <= hi + 1e-9; v += step) {
      el('line', { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v), class: v === 0 ? 'c-zero' : 'c-grid' }, svg);
      const t = el('text', { x: m.l - 6, y: y(v) + 4, class: 'c-tick', 'text-anchor': 'end' }, svg);
      t.textContent = WX.fmt.signed(v) + '°';
    }
    // x-akseli: viikon välein
    el('line', { x1: m.l, x2: m.l + iw, y1: m.t + ih, y2: m.t + ih, class: 'c-axis' }, svg);
    const every = (iw / (o1 - o0)) * 7 >= 52 ? 7 : 14;
    days.forEach((d) => {
      if (d.offset % every !== 0 || d.offset === 0) return;
      const t = el('text', { x: x(d.offset), y: H - 8, class: 'c-tick', 'text-anchor': 'middle' }, svg);
      t.textContent = dm(d.date);
    });
    // tänään
    el('line', { x1: fx, x2: fx, y1: m.t - 4, y2: m.t + ih, class: 'c-today' }, svg);
    const tl = el('text', { x: fx, y: m.t - 8, class: 'c-label c-label-strong', 'text-anchor': 'middle' }, svg);
    tl.textContent = 'Tänään';
    const tl2 = el('text', { x: fx, y: H - 8, class: 'c-tick c-label-strong', 'text-anchor': 'middle' }, svg);
    tl2.textContent = dm(days.find((d) => d.offset === 0).date);

    // pitkän ennusteen vaihteluväli
    const band = days.filter((d) => d.lo != null && d.hi != null);
    if (band.length > 1) {
      const p = band.map((d, i) => `${i ? 'L' : 'M'}${x(d.offset)},${y(d.hi)}`).join('') +
        band.slice().reverse().map((d) => `L${x(d.offset)},${y(d.lo)}`).join('') + 'Z';
      el('path', { d: p, class: 'c-band' }, svg);
    }

    const line = (pts, cls) => {
      let d = '', pen = false;
      pts.forEach(([o, v]) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${x(o).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      if (d) el('path', { d, class: cls }, svg);
    };
    line(days.map((d) => [d.offset, d.prev]), 'c-line c-prev');
    line(days.filter((d) => d.offset <= 0).map((d) => [d.offset, d.cur]), 'c-line c-cur');
    line(days.filter((d) => d.offset >= 0).map((d) => [d.offset, d.cur]), 'c-line c-cur c-dash');

    // suorat nimiöt viivojen loppuun, jos mahtuvat erilleen
    const lastOf = (k) => { for (let i = days.length - 1; i >= 0; i--) if (days[i][k] != null) return days[i]; return null; };
    const lc = lastOf('cur'), lp = lastOf('prev');
    const yc = lc && y(lc.cur), yp = lp && y(lp.prev);
    if (!(lc && lp) || Math.abs(yc - yp) >= 14) {
      if (lc) { const t = el('text', { x: x(lc.offset) + 6, y: yc + 4, class: 'c-end' }, svg); t.textContent = data.curLabel; }
      if (lp) { const t = el('text', { x: x(lp.offset) + 6, y: yp + 4, class: 'c-end' }, svg); t.textContent = data.prevLabel; }
    }

    // osoitinkerros
    this.cross = el('line', { y1: m.t, y2: m.t + ih, class: 'c-cross', visibility: 'hidden' }, svg);
    this.dotPrev = el('circle', { r: 4.5, class: 'c-dot c-dot-prev', visibility: 'hidden' }, svg);
    this.dotCur = el('circle', { r: 4.5, class: 'c-dot c-dot-cur', visibility: 'hidden' }, svg);
    const hit = el('rect', { x: m.l, y: 0, width: iw, height: H, fill: 'transparent' }, svg);
    const pick = (ev) => {
      const r = svg.getBoundingClientRect();
      const px = ev.clientX - r.left;
      const o = Math.round(o0 + ((px - m.l) / iw) * (o1 - o0));
      this.show(Math.max(o0, Math.min(o1, o)));
    };
    hit.addEventListener('pointermove', pick);
    hit.addEventListener('pointerdown', pick);
    hit.addEventListener('pointerleave', () => this.hide());
    svg.addEventListener('focus', () => this.show(this.focusO != null ? this.focusO : 0));
    svg.addEventListener('blur', () => this.hide());
    svg.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'PageUp' ? 7 : e.key === 'PageDown' ? -7 : 0;
      if (!step) return;
      e.preventDefault();
      this.show(Math.max(o0, Math.min(o1, (this.focusO != null ? this.focusO : 0) + step)));
    });
  };

  YearChart.prototype.show = function (o) {
    const d = this.data.days.find((dd) => dd.offset === o);
    if (!d) return;
    this.focusO = o;
    const X = this.x(o);
    this.cross.setAttribute('x1', X); this.cross.setAttribute('x2', X);
    this.cross.setAttribute('visibility', 'visible');
    [[this.dotCur, d.cur], [this.dotPrev, d.prev]].forEach(([dot, v]) => {
      if (v == null) { dot.setAttribute('visibility', 'hidden'); return; }
      dot.setAttribute('cx', X); dot.setAttribute('cy', this.y(v)); dot.setAttribute('visibility', 'visible');
    });
    const tip = this.tip;
    tip.textContent = '';
    const head = document.createElement('div');
    head.className = 'tt-date';
    const dd = new Date(d.date + 'T00:00:00Z');
    head.textContent = `${WD[dd.getUTCDay()]} ${dm(d.date)}${o === 0 ? ' · tänään' : ''}`;
    tip.appendChild(head);
    const row = (cls, v, label, note) => {
      const r = document.createElement('div');
      r.className = 'tt-row';
      const k = document.createElement('span'); k.className = 'tt-key ' + cls; r.appendChild(k);
      const b = document.createElement('b'); b.textContent = v == null ? '–' : WX.fmt.temp1(v); r.appendChild(b);
      const l = document.createElement('span'); l.textContent = label + (note ? ` (${note})` : ''); r.appendChild(l);
      tip.appendChild(r);
    };
    const note = d.kind === 'fc' ? 'ennuste' : d.kind === 'ext' ? 'pitkä ennuste' : d.kind === 'now' ? 'havainto + ennuste' : '';
    row('tt-cur', d.cur, this.data.curLabel, note);
    row('tt-prev', d.prev, this.data.prevLabel, '');
    if (d.kind === 'ext' && d.lo != null) {
      const r = document.createElement('div'); r.className = 'tt-note';
      r.textContent = `Vaihteluväli ${WX.fmt.temp1(d.lo)} … ${WX.fmt.temp1(d.hi)}`;
      tip.appendChild(r);
    }
    if (d.cur != null && d.prev != null) {
      const r = document.createElement('div'); r.className = 'tt-note';
      r.textContent = `Ero viime vuoteen ${WX.fmt.signed1(d.cur - d.prev)} °C`;
      tip.appendChild(r);
    }
    tip.hidden = false;
    const tw = tip.offsetWidth;
    let left = X + 14;
    if (left + tw > this.W - 4) left = X - tw - 14;
    tip.style.left = Math.max(4, left) + 'px';
    tip.style.top = this.m.t + 4 + 'px';
  };

  YearChart.prototype.hide = function () {
    this.tip.hidden = true;
    if (this.cross) this.cross.setAttribute('visibility', 'hidden');
    if (this.dotCur) this.dotCur.setAttribute('visibility', 'hidden');
    if (this.dotPrev) this.dotPrev.setAttribute('visibility', 'hidden');
  };

  WX.YearChart = YearChart;
})();
