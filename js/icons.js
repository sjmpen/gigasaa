/* Pikseligrafiikkaiset sääsymbolit. Piirretään 24×24 ruudukkoon, ääriviivoitetaan
 * ja muutetaan data-URL:iksi. Näytetään CSS:llä skaalattuna (image-rendering: pixelated). */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const G = 24;
  const OUTLINE = '#14112b';

  const PAL = {
    sun: { base: '#ffc93c', light: '#fff3a6', dark: '#f0901e' },
    moon: { base: '#f3e7b3', light: '#fffbe2', dark: '#c9b773' },
    cloud: { base: '#eef2fa', light: '#ffffff', dark: '#aab4cc' },
    grey: { base: '#b9c0d0', light: '#d8deea', dark: '#7f88a0' },
    dark: { base: '#7d8498', light: '#9aa1b4', dark: '#545a6e' },
    rain: { base: '#4fa8ff', light: '#b5e0ff' },
    snow: { base: '#ffffff', light: '#cfe6ff' },
    bolt: { base: '#ffe14a', dark: '#f39a1c' },
    fog: '#cfd5e0',
    star: '#fff6c8',
  };

  function Sprite() {
    this.px = new Array(G * G).fill(null);
    this.post = [];
  }
  Sprite.prototype.set = function (x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < G && y < G) this.px[y * G + x] = c;
  };
  Sprite.prototype.get = function (x, y) {
    if (x < 0 || y < 0 || x >= G || y >= G) return null;
    return this.px[y * G + x];
  };
  Sprite.prototype.mask = function (fn) {
    const m = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (fn(x + 0.5, y + 0.5)) m.push([x, y]);
    return m;
  };
  // Täytetty ympyrä, valo vasemmalta ylhäältä
  Sprite.prototype.ball = function (cx, cy, r, pal, cut) {
    const pts = this.mask((x, y) => {
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      return inside && !(cut && (x - cut[0]) ** 2 + (y - cut[1]) ** 2 <= cut[2] * cut[2]);
    });
    pts.forEach(([x, y]) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const s = (dx + dy) / r;
      this.set(x, y, s < -0.75 ? pal.light : s > 0.65 ? pal.dark : pal.base);
    });
  };
  Sprite.prototype.rays = function (cx, cy, r0, r1, c) {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      for (let r = r0; r <= r1; r += 0.5) this.set(cx - 0.5 + Math.cos(a) * r, cy - 0.5 + Math.sin(a) * r, c);
    }
  };
  // Pilvi: kolme pöhköä + litteä pohja. x0,y0 = vasen yläkulma, w = leveys
  Sprite.prototype.cloud = function (x0, y0, w, pal) {
    const h = w * 0.62;
    const puffs = [
      [x0 + w * 0.27, y0 + h * 0.6, w * 0.21],
      [x0 + w * 0.53, y0 + h * 0.42, w * 0.28],
      [x0 + w * 0.79, y0 + h * 0.64, w * 0.19],
    ];
    const bottom = y0 + h * 0.98;
    const inside = (x, y) =>
      (puffs.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r) ||
        (x >= x0 + w * 0.1 && x <= x0 + w * 0.94 && y >= y0 + h * 0.6)) && y <= bottom;
    const pts = this.mask(inside);
    pts.forEach(([x, y]) => {
      const above = inside(x + 0.5, y - 0.5);
      const below2 = inside(x + 0.5, y + 2.5);
      this.set(x, y, !above ? pal.light : !below2 ? pal.dark : pal.base);
    });
  };
  Sprite.prototype.drops = function (list) {
    list.forEach(([x, y]) => {
      this.set(x, y, PAL.rain.light);
      this.set(x, y + 1, PAL.rain.base);
      this.set(x - 1, y + 2, PAL.rain.base);
    });
  };
  Sprite.prototype.flakes = function (list) {
    list.forEach(([x, y]) => {
      this.set(x, y, PAL.snow.light);
      this.set(x - 1, y, PAL.snow.base);
      this.set(x + 1, y, PAL.snow.base);
      this.set(x, y - 1, PAL.snow.base);
      this.set(x, y + 1, PAL.snow.base);
    });
  };
  Sprite.prototype.dots = function (list) {
    list.forEach(([x, y]) => this.set(x, y, PAL.rain.base));
  };
  Sprite.prototype.bolt = function (x, y) {
    const shape = [
      '..###', '.###.', '.##..', '#####', '..##.', '.##..', '.#...',
    ];
    shape.forEach((row, j) =>
      [...row].forEach((ch, i) => ch === '#' && this.set(x + i, y + j, i === 0 || j === 3 ? PAL.bolt.dark : PAL.bolt.base)));
  };
  Sprite.prototype.fogLines = function (rows) {
    rows.forEach(([x, y, len]) => { for (let i = 0; i < len; i++) this.set(x + i, y, PAL.fog); });
  };
  Sprite.prototype.star = function (x, y) { this.post.push([x, y, PAL.star]); };

  Sprite.prototype.outline = function () {
    const add = [];
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
      }
    add.forEach(([x, y]) => this.set(x, y, OUTLINE));
    this.post.forEach(([x, y, c]) => this.set(x, y, c));
  };
  Sprite.prototype.toURL = function () {
    const cv = document.createElement('canvas');
    cv.width = G; cv.height = G;
    const ctx = cv.getContext('2d');
    for (let y = 0; y < G; y++)
      for (let x = 0; x < G; x++) {
        const c = this.px[y * G + x];
        if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
      }
    return cv.toDataURL();
  };

  // Aurinko tai kuu taustalle (isot symbolit) tai nurkkaan (pilven takana)
  function sky(s, isDay, cx, cy, r) {
    if (isDay) {
      s.rays(cx, cy, r + 2, r + 3.5, PAL.sun.base);
      s.ball(cx, cy, r, PAL.sun);
    } else {
      s.ball(cx, cy, r + 0.5, PAL.moon, [cx + r * 0.55, cy - r * 0.45, r * 0.85]);
    }
  }

  const BUILD = {
    clear(s, d) {
      sky(s, d, 12, 12, 6);
      if (!d) { s.star(19, 5); s.star(5, 19); s.star(20, 17); }
    },
    mostlyclear(s, d) {
      sky(s, d, 11, 10, 6);
      s.cloud(10, 13, 13, PAL.cloud);
      if (!d) s.star(20, 4);
    },
    partly(s, d) {
      sky(s, d, 8, 8, 5);
      s.cloud(4, 8, 19, PAL.cloud);
    },
    cloudy(s) {
      s.cloud(8, 3, 15, PAL.grey);
      s.cloud(1, 8, 19, PAL.cloud);
    },
    fog(s) {
      s.cloud(3, 2, 18, PAL.grey);
      s.fogLines([[2, 15, 16], [5, 18, 17], [1, 21, 14]]);
    },
    drizzle(s) {
      s.cloud(2, 2, 20, PAL.grey);
      s.dots([[6, 17], [11, 19], [16, 17], [8, 21], [14, 22], [19, 20]]);
    },
    rain(s) {
      s.cloud(2, 2, 20, PAL.grey);
      s.drops([[7, 16], [12, 18], [17, 16]]);
    },
    heavyrain(s) {
      s.cloud(2, 1, 20, PAL.dark);
      s.drops([[5, 15], [10, 17], [15, 15], [20, 17], [8, 20], [17, 20]]);
    },
    sleet(s) {
      s.cloud(2, 2, 20, PAL.grey);
      s.drops([[7, 16], [16, 18]]);
      s.flakes([[12, 18], [19, 15]]);
    },
    snow(s) {
      s.cloud(2, 2, 20, PAL.grey);
      s.flakes([[7, 17], [13, 19], [18, 16]]);
    },
    heavysnow(s) {
      s.cloud(2, 1, 20, PAL.dark);
      s.flakes([[5, 16], [11, 18], [17, 16], [8, 21], [15, 21], [20, 20]]);
    },
    showers(s, d) {
      sky(s, d, 8, 7, 5);
      s.cloud(4, 6, 19, PAL.grey);
      s.drops([[9, 19], [14, 20], [19, 19]]);
    },
    snowshowers(s, d) {
      sky(s, d, 8, 7, 5);
      s.cloud(4, 6, 19, PAL.grey);
      s.flakes([[9, 20], [16, 20]]);
    },
    thunder(s) {
      s.cloud(2, 1, 20, PAL.dark);
      s.bolt(10, 14);
      s.drops([[6, 16], [18, 16]]);
    },
  };

  const cache = {};
  /** Data-URL sääsymbolille. key = icon-avain (ks. weathercodes.js) */
  WX.iconURL = function (key, isDay) {
    const k = key + (isDay ? '-d' : '-n');
    if (!cache[k]) {
      const s = new Sprite();
      (BUILD[key] || BUILD.cloudy)(s, !!isDay);
      s.outline();
      cache[k] = s.toURL();
    }
    return cache[k];
  };

  function fromMap(rows, colors) {
    const h = rows.length, w = rows[0].length;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (colors[ch]) { ctx.fillStyle = colors[ch]; ctx.fillRect(x, y, 1, 1); }
      }));
    return cv.toDataURL();
  }

  // Final Fantasy -henkinen osoitinkäsi valitulle riville
  WX.handURL = function () {
    if (!cache.hand)
      cache.hand = fromMap([
        '....kkkk........',
        '...kwwwwkkkkkkk.',
        '..kwwwwwwwwwwwwk',
        '..kwwwwwgggggggk',
        '..kwwwwwkkkkkkk.',
        '.kwwwwwwwwk.....',
        '.kwwwwwkkk......',
        '.kwwwwwwwk......',
        '.kgwwwkkk.......',
        '..kgggwwk.......',
        '...kkkkk........',
      ], { k: '#14112b', w: '#ffffff', g: '#b8bfd6' });
    return cache.hand;
  };

  // Tuulinuoli (osoittaa ylös; käännetään CSS:llä tuulen suuntaan)
  WX.arrowURL = function () {
    if (!cache.arrow)
      cache.arrow = fromMap([
        '....k....',
        '...kwk...',
        '..kwwwk..',
        '.kwwwwwk.',
        'kkkwwwkkk',
        '..kwwwk..',
        '..kwwwk..',
        '..kwwwk..',
        '..kkkkk..',
      ], { k: '#14112b', w: '#ffffff' });
    return cache.arrow;
  };
})();
