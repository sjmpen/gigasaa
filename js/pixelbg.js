/* Pikseligrafiikkatausta (16-bit JRPG -henkeen): tunturit, kuusimetsä, järvi, mökki
 * sekä säätilan mukaan pilvet, sade, lumi, ukkonen ja sumu. Piirretään matalaan
 * resoluutioon ja skaalataan CSS:llä (image-rendering: pixelated). */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});

  // ---------- apufunktiot ----------
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const thr = (x, y) => (BAYER[y & 3][x & 3] + 0.5) / 16;

  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  WX.hashString = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const mixPal = (pa, pb, t) => pa.map((c, i) => mix(c, pb[i], t));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function layer(W, H) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }

  // Ditteröity pystyliukuväri suoraan ImageDataan
  function ditherRect(ctx, x0, y0, w, h, pal) {
    if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(x0, y0, w, h);
    const d = img.data, P = pal.map(rgb), n = P.length - 1;
    for (let y = 0; y < h; y++) {
      const pos = (h <= 1 ? 0 : y / (h - 1)) * n;
      const i = Math.min(n - 1, Math.floor(pos)), f = pos - i;
      for (let x = 0; x < w; x++) {
        const c = f > thr(x0 + x, y0 + y) ? P[i + 1] : P[i];
        const k = (y * w + x) * 4;
        d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
      }
    }
    ctx.putImageData(img, x0, y0);
  }

  // Sävytys (multiply) säilyttäen läpinäkyvyyden
  function tint(L, color) {
    const t = layer(L.c.width, L.c.height);
    t.ctx.drawImage(L.c, 0, 0);
    t.ctx.globalCompositeOperation = 'multiply';
    t.ctx.fillStyle = color;
    t.ctx.fillRect(0, 0, L.c.width, L.c.height);
    t.ctx.globalCompositeOperation = 'destination-in';
    t.ctx.drawImage(L.c, 0, 0);
    L.ctx.clearRect(0, 0, L.c.width, L.c.height);
    L.ctx.drawImage(t.c, 0, 0);
  }

  // ---------- paletit ----------
  const SKY = {
    day: {
      clear: ['#1d4cc2', '#2b6be0', '#4a8ff0', '#7bb6f6', '#b5dafb'],
      over: ['#68768e', '#7a879c', '#8e9aad', '#a3adbd', '#b8c0cc'],
      storm: ['#2b3141', '#363d4f', '#424a5d', '#50586c', '#5f677a'],
      fog: ['#98a1ad', '#a7afba', '#b5bcc5', '#c3c9d0', '#d0d4da'],
    },
    dusk: {
      clear: ['#22205a', '#45327c', '#924a7a', '#dc7a5a', '#ffbd70'],
      over: ['#2e2b44', '#483e58', '#6c5266', '#93676a', '#b37e70'],
      storm: ['#1d1b28', '#282532', '#34303d', '#413b48', '#4e4654'],
      fog: ['#5b5566', '#6d6574', '#807683', '#938792', '#a698a0'],
    },
    night: {
      clear: ['#03041a', '#070c2e', '#0e1745', '#17245d', '#223373'],
      over: ['#0b0d17', '#111421', '#181c2b', '#202535', '#292f40'],
      storm: ['#06070c', '#0a0b12', '#0f1118', '#14171f', '#1a1d26'],
      fog: ['#1c1f28', '#22262f', '#292d37', '#30353f', '#383d48'],
    },
  };
  const CLOUD = {
    day: { light: ['#ffffff', '#eef2fa', '#c3cbde'], dark: ['#8d95a6', '#717989', '#535a6a'] },
    dusk: { light: ['#ffe0bf', '#efa7a2', '#8f6a8e'], dark: ['#6a5866', '#4e4252', '#353040'] },
    night: { light: ['#56607c', '#3a435e', '#262d45'], dark: ['#2a2e3a', '#1f222c', '#15171f'] },
  };
  const GROUND = {
    summer: { pal: ['#5c9c3e', '#4a8533', '#3a6c2a', '#2b5321'], hi: '#80c056', tuft: '#9ad866' },
    spring: { pal: ['#74b34a', '#5f9a3c', '#4a7f30', '#386425'], hi: '#98d468', tuft: '#b4e27c' },
    autumn: { pal: ['#a08c3c', '#8c6c2e', '#6e5426', '#53401e'], hi: '#d2a040', tuft: '#e0b048' },
    late: { pal: ['#727048', '#5e5a3a', '#4b462e', '#3a3524'], hi: '#8e8a5a', tuft: '#a39c66' },
    snow: { pal: ['#ffffff', '#eef3fb', '#d6e1f2', '#bfcde6'], hi: '#ffffff', tuft: '#ffffff' },
  };
  const BIRCH = { summer: ['#6aaa44', '#4f8c34'], spring: ['#8fd060', '#6aaa44'], autumn: ['#f0b23c', '#d27028'] };
  const TINT = { day: null, dusk: '#c99a9a', night: '#5a68aa' };

  // ---------- kohtaus ----------
  function PixelScene(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = { code: 2, phase: 'day', temp: 10, month: 7, lat: 60, wind: 3, seed: 1 };
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.last = 0;
    this._loop = this.loop.bind(this);
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => this.resize(), 120); });
    this.resize();
    if (!this.reduced) requestAnimationFrame(this._loop);
  }

  PixelScene.prototype.set = function (s) {
    Object.assign(this.state, s);
    this.build();
    if (this.reduced) this.draw(performance.now());
  };

  PixelScene.prototype.resize = function () {
    const vw = window.innerWidth, vh = window.innerHeight;
    const px = clamp(Math.round(Math.min(vw, vh * 1.7) / 300), 2, 6);
    this.px = px;
    this.W = Math.ceil(vw / px);
    this.H = Math.ceil(vh / px);
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = this.W * px + 'px';
    this.canvas.style.height = this.H * px + 'px';
    this.ctx.imageSmoothingEnabled = false;
    this.build();
    if (this.reduced) this.draw(performance.now());
  };

  PixelScene.prototype.derive = function () {
    const s = this.state;
    const d = WX.describe(s.code).scene;
    let m = s.month;
    if (s.lat < 0) m = ((m + 5) % 12) + 1;
    const wintry = [11, 12, 1, 2, 3, 4].includes(m);
    let snowGround = d.precip === 'snow' || (s.temp <= 0 && wintry) || s.temp <= -3;
    let foliage = snowGround ? 'snow' : m === 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m === 9 || m === 10 ? 'autumn' : 'late';
    if (s.season) { foliage = s.season === 'winter' ? 'snow' : s.season; snowGround = foliage === 'snow'; }
    const frozen = snowGround && ([12, 1, 2, 3].includes(m) || s.season === 'winter') && s.temp < 1;
    return Object.assign({}, d, { snowGround, foliage, frozen, phase: s.phase });
  };

  PixelScene.prototype.build = function () {
    const W = this.W, H = this.H, s = this.state;
    if (!W || !H) return;
    const sc = (this.sc = this.derive());
    const rand = rngFrom(s.seed || 1);
    const ph = sc.phase;

    // Taivas
    const P = SKY[ph];
    let sky = mixPal(P.clear, P.over, clamp(sc.clouds * 1.1 - 0.1, 0, 1));
    sky = mixPal(sky, P.storm, sc.dark * sc.clouds);
    if (sc.fog) sky = mixPal(sky, P.fog, 0.8);
    if (sc.precip === 'snow' && ph === 'day') sky = mixPal(sky, ['#a9b2c2', '#b6becc', '#c3cad6', '#d0d6df', '#dde2e9'], 0.5);
    this.sky = sky;
    const horizon = sky[sky.length - 1];

    const hy = (this.hy = Math.round(H * 0.64));
    this.layers = {};

    // Taivaskerros + taivaankappaleet + tähdet
    const S = layer(W, H);
    ditherRect(S.ctx, 0, 0, W, hy + 1, sky);
    this.stars = [];
    if (ph === 'night' && sc.clouds < 0.9) {
      const n = Math.round((W * hy) / 260 * (1 - sc.clouds));
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rand() * W), y = Math.floor(rand() * hy * 0.75);
        const big = rand() < 0.08;
        S.ctx.fillStyle = rand() < 0.5 ? '#ffffff' : '#c8d4ff';
        S.ctx.fillRect(x, y, 1, 1);
        if (big) { S.ctx.fillRect(x - 1, y, 3, 1); S.ctx.fillRect(x, y - 1, 1, 3); }
        if (rand() < 0.25) this.stars.push([x, y]);
      }
    }
    this.body = null;
    if (sc.clouds < 0.95 && !sc.fog) {
      if (ph === 'night') this.body = { x: Math.round(W * 0.2), y: Math.round(H * 0.15), r: 6, moon: true };
      else if (ph === 'dusk') this.body = { x: Math.round(W * 0.7), y: Math.round(hy - H * 0.16), r: 9, moon: false };
      else this.body = { x: Math.round(W * 0.78), y: Math.round(H * 0.16), r: 7, moon: false };
      drawBody(S.ctx, this.body, ph, sky);
    }
    this.layers.sky = S;

    // Pilvet
    this.clouds = [];
    const cp = mixPal(CLOUD[ph].light, CLOUD[ph].dark, sc.dark);
    const count = sc.clouds <= 0 || sc.fog ? 0 : Math.round(1 + sc.clouds * (W / 30));
    for (let i = 0; i < count; i++) {
      const depth = rand();
      const w = Math.round(18 + depth * 34 + rand() * 18);
      this.clouds.push({
        img: cloudSprite(rand, w, Math.round(w * (0.32 + rand() * 0.12)), cp),
        x: rand() * (W + 80) - 40,
        y: Math.round(H * 0.03 + (1 - depth) * hy * 0.45 + rand() * hy * 0.1),
        v: (0.6 + depth * 1.6) * (0.6 + (s.wind || 2) * 0.25),
      });
    }
    this.clouds.sort((a, b) => a.v - b.v);
    this.deck = null;
    if (sc.clouds >= 0.95 && !sc.fog) {
      const D = layer(W, Math.round(hy * 0.8));
      const top = Math.round(hy * 0.12);
      const deckPal = [cp[1], mix(cp[1], cp[2], 0.5), cp[2]];
      D.ctx.fillStyle = deckPal[0];
      D.ctx.fillRect(0, 0, W, top + 4);
      for (let row = 0; row < 3; row++) {
        let x = -30 - rand() * 20;
        while (x < W + 10) {
          const w = Math.round(36 + rand() * 46);
          const img = cloudSprite(rand, w, Math.round(w * (0.38 + rand() * 0.1)), row === 2 ? [mix(cp[0], cp[1], 0.6), cp[1], cp[2]] : deckPal);
          D.ctx.drawImage(img, Math.round(x), Math.round(top - w * 0.18 + row * hy * 0.07 + rand() * 5));
          x += w * (0.45 + rand() * 0.25);
        }
      }
      this.deck = D;
    }

    // Kaukainen kerros: tunturit + vastarannan metsä
    const F = layer(W, H);
    const fellA = ridge(rand, W, hy, H * 0.27, [[0.011, 1], [0.027, 0.45], [0.06, 0.12]]);
    const fellB = ridge(rand, W, hy, H * 0.15, [[0.017, 1], [0.04, 0.4], [0.09, 0.1]]);
    const fA = mix(horizon, ph === 'night' ? '#1c2650' : '#4d5d92', sc.fog ? 0.25 : 0.55);
    const fB = mix(horizon, ph === 'night' ? '#141d40' : '#35446e', sc.fog ? 0.4 : 0.72);
    const capA = sc.snowGround ? mix('#ffffff', horizon, ph === 'day' ? 0.15 : 0.55) : mix(fA, '#ffffff', 0.12);
    drawFell(F.ctx, fellA, hy, fA, capA, horizon, sc.snowGround ? 6 : 2);
    drawFell(F.ctx, fellB, hy, fB, sc.snowGround ? mix(capA, fB, 0.35) : mix(fB, '#ffffff', 0.1), horizon, sc.snowGround ? 4 : 1);
    // vastarannan metsä
    const shore = [];
    for (let x = 0; x < W; x++) shore.push(Math.round(hy - 2 - H * 0.018 * (1 + Math.sin(x * 0.045 + rand() * 0.2) * 0.6 + Math.sin(x * 0.13) * 0.3)));
    const pine = { body: '#1e4630', hi: '#2f6343', dark: '#123020', snow: '#e8f0fa' };
    const farPine = { body: mix(pine.body, horizon, 0.35), hi: mix(pine.hi, horizon, 0.35), dark: mix(pine.dark, horizon, 0.35), snow: mix(pine.snow, horizon, 0.2) };
    for (let x = -4; x < W + 4; x += 2 + Math.floor(rand() * 2)) {
      const b = shore[clamp(x, 0, W - 1)] - 1;
      spruce(F.ctx, x, b, Math.round(H * 0.03 + rand() * H * 0.025), farPine, sc.snowGround, 0.4);
    }
    for (let x = 0; x < W; x++) {
      F.ctx.fillStyle = pine.dark;
      F.ctx.fillRect(x, shore[x], 1, hy - shore[x] + 1);
    }
    for (let x = -3; x < W + 3; x += 2 + Math.floor(rand() * 3)) {
      const b = shore[clamp(x, 0, W - 1)] + 1;
      if (sc.foliage !== 'snow' && sc.foliage !== 'late' && rand() < 0.22) birch(F.ctx, x, b, Math.round(H * 0.025 + rand() * H * 0.02), sc.foliage, rand);
      else spruce(F.ctx, x, b, Math.round(H * 0.032 + rand() * H * 0.035), pine, sc.snowGround, 0.33);
    }
    F.ctx.fillStyle = sc.snowGround ? '#dfe7f3' : '#3a3428';
    F.ctx.fillRect(0, hy, W, 1);
    if (TINT[ph]) tint(F, ph === 'dusk' ? '#d8b0b0' : '#8090cc');
    if (sc.dark > 0.3 && ph === 'day') tint(F, mix('#ffffff', '#8890a0', sc.dark * 0.6));
    this.layers.far = F;

    // Vesi / jää
    const Wt = layer(W, H);
    const waterH = H - hy - 1;
    if (sc.frozen) {
      ditherRect(Wt.ctx, 0, hy + 1, W, waterH, mixPal(['#c9d6ea', '#d8e2f2', '#e6edf8', '#f2f6fc'], sky.slice(0, 4), ph === 'day' ? 0.2 : 0.6));
      Wt.ctx.fillStyle = mix('#b2c2dc', sky[2], 0.3);
      for (let i = 0; i < W / 6; i++) Wt.ctx.fillRect(Math.floor(rand() * W), hy + 2 + Math.floor(rand() * waterH), 3 + Math.floor(rand() * 8), 1);
    } else {
      const deep = ph === 'night' ? '#050a1c' : ph === 'dusk' ? '#2a1e3c' : '#173a6a';
      const wpal = [sky[4], sky[3], sky[2], sky[1], sky[0]].map((c, i) => mix(mix(c, deep, 0.25 + i * 0.08), '#000000', 0.12));
      ditherRect(Wt.ctx, 0, hy + 1, W, waterH, wpal);
    }
    this.layers.water = Wt;
    // Heijastus: peilattu kaukainen kerros
    const reflH = Math.min(waterH, Math.round(hy * 0.42));
    const R = layer(W, reflH);
    R.ctx.save();
    R.ctx.scale(1, -1);
    R.ctx.drawImage(F.c, 0, hy - reflH, W, reflH, 0, -reflH, W, reflH);
    R.ctx.restore();
    tint(R, ph === 'night' ? '#8090c0' : '#7486ad');
    this.layers.refl = R;
    this.reflH = reflH;

    // Etuala: rantakumpareet, isot kuuset, kivet, mökki
    const L = layer(W, H);
    const shoreY = Math.round(H * 0.84);
    const prof = [];
    for (let x = 0; x < W; x++) {
      const l = Math.max(0, 1 - x / (W * 0.4)), r = Math.max(0, 1 - (W - x) / (W * 0.34));
      prof.push(Math.round(shoreY - H * 0.17 * l ** 1.7 - H * 0.1 * r ** 1.5 + Math.sin(x * 0.21) * 0.8 + Math.sin(x * 0.07) * 1.5));
    }
    this.prof = prof;
    const gp = GROUND[sc.foliage];
    const top = Math.min.apply(null, prof);
    const G = layer(W, H);
    ditherRect(G.ctx, 0, top, W, H - top, gp.pal);
    for (let x = 0; x < W; x++) {
      L.ctx.drawImage(G.c, x, prof[x], 1, H - prof[x], x, prof[x], 1, H - prof[x]);
      L.ctx.fillStyle = gp.hi;
      L.ctx.fillRect(x, prof[x], 1, 1);
      if (rand() < 0.18) { L.ctx.fillStyle = gp.tuft; L.ctx.fillRect(x, prof[x] - 1, 1, 1 + (rand() < 0.3 ? 1 : 0)); }
    }
    // rantaviivan kaislikko/kivet
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(W * (0.28 + rand() * 0.42));
      rock(L.ctx, x, prof[clamp(x, 0, W - 1)] + 1, 2 + Math.floor(rand() * 3), sc.snowGround);
    }
    if (sc.foliage === 'summer' || sc.foliage === 'spring' || sc.foliage === 'autumn') {
      for (let i = 0; i < W * 0.12; i++) {
        const x = Math.floor(W * 0.25 + rand() * W * 0.5);
        L.ctx.fillStyle = sc.foliage === 'autumn' ? '#b8963c' : '#6a9a40';
        L.ctx.fillRect(x, prof[x] - 2 - Math.floor(rand() * 3), 1, 3);
      }
    }
    // isot kuuset vasemmalla ja oikealla
    const bigPine = { body: '#1b4029', hi: '#2e6340', dark: '#0f2a1a', snow: '#f2f7ff' };
    [[0.03, 0.36], [0.11, 0.27], [0.19, 0.2], [0.965, 0.3], [0.9, 0.2]].forEach(([fx, fh]) => {
      const x = Math.round(W * fx);
      const h = Math.round(H * fh * (0.9 + rand() * 0.2));
      const b = prof[clamp(x, 0, W - 1)];
      L.ctx.fillStyle = '#4a2e1e';
      L.ctx.fillRect(x - 1, b - 3, 2, 4);
      spruce(L.ctx, x, b - 2, h, bigPine, sc.snowGround, 0.36);
    });
    // mökki
    const cx = Math.round(W * 0.74);
    let cb = 0;
    for (let x = cx - 3; x < cx + 23; x++) cb = Math.max(cb, prof[clamp(x, 0, W - 1)]);
    for (let x = cx - 3; x < cx + 23; x++) {
      const xx = clamp(x, 0, W - 1);
      L.ctx.drawImage(G.c, xx, cb - 1, 1, H - cb, xx, cb - 1, 1, H - cb);
    }
    this.cabin = cabin(L.ctx, cx, cb, sc.snowGround);
    if (TINT[ph]) tint(L, TINT[ph]);
    if (sc.dark > 0.3 && ph === 'day') tint(L, mix('#ffffff', '#7c8494', sc.dark * 0.6));
    if (ph !== 'day') {
      // ikkunan valo pimeällä
      const wx = this.cabin.win;
      L.ctx.fillStyle = '#ffd36b';
      L.ctx.fillRect(wx[0], wx[1], 4, 3);
      L.ctx.fillStyle = '#fff2b0';
      L.ctx.fillRect(wx[0] + 1, wx[1] + 1, 2, 1);
      for (let i = 0; i < 18; i++) {
        const gx = wx[0] - 3 + Math.floor(rand() * 10), gy = cb + Math.floor(rand() * 4);
        if (thr(gx, gy) < 0.5) { L.ctx.fillStyle = 'rgba(255,211,107,0.35)'; L.ctx.fillRect(gx, gy, 1, 1); }
      }
    }
    this.layers.land = L;

    // Hiukkaset
    this.drops = [];
    this.flakes = [];
    this.splashes = [];
    const amt = sc.amount || 0;
    if (sc.precip === 'rain' || sc.precip === 'drizzle' || sc.precip === 'sleet') {
      const n = Math.round(W * (sc.precip === 'drizzle' ? 0.35 : 0.75) * amt * (sc.precip === 'sleet' ? 0.6 : 1));
      for (let i = 0; i < n; i++) this.drops.push(this.newDrop(rand, true));
    }
    if (sc.precip === 'snow' || sc.precip === 'sleet') {
      const n = Math.round(W * 0.8 * amt * (sc.precip === 'sleet' ? 0.5 : 1));
      for (let i = 0; i < n; i++) this.flakes.push({ x: rand() * W, y: rand() * H, v: 8 + rand() * 18, s: rand() < 0.25 ? 2 : 1, p: rand() * 6.28 });
    }
    this.smoke = [];
    this.smokeOn = s.temp < 12 && !sc.thunder;
    // Sumuvyöt
    this.fogBands = [];
    if (sc.fog) {
      const fc = P.fog[4];
      [[hy - H * 0.07, H * 0.14, 0.75], [hy + H * 0.05, H * 0.1, 0.6], [H * 0.86, H * 0.1, 0.4]].forEach(([y, h, dens], i) => {
        const B = layer(W * 2, Math.round(h));
        const bh = B.c.height;
        B.ctx.fillStyle = fc;
        for (let yy = 0; yy < bh; yy++)
          for (let x = 0; x < W * 2; x++) {
            const e = 1 - Math.abs(yy / bh - 0.5) * 2;
            const n2 = 0.6 + 0.4 * Math.sin(x * 0.03 + i) * Math.sin(x * 0.011 + i * 2);
            if (thr(x, yy) < e * dens * n2 * 1.6) B.ctx.fillRect(x, yy, 1, 1);
          }
        this.fogBands.push({ img: B.c, y: Math.round(y - h / 2), v: 1.5 + i * 0.8 });
      });
    }
    this.flash = 0;
    this.bolt = null;
    this.nextBolt = performance.now() + 2500 + rand() * 4000;
    this.rand = rand;
  };

  PixelScene.prototype.newDrop = function (rand, anywhere) {
    const sc = this.sc;
    const drizzle = sc.precip === 'drizzle';
    return {
      x: rand() * (this.W + 40) - 20,
      y: anywhere ? rand() * this.H : -5 - rand() * 20,
      v: drizzle ? 90 + rand() * 40 : 170 + rand() * 90,
      len: drizzle ? 2 : 3 + Math.floor(rand() * 3),
      end: this.hy + rand() * (this.H - this.hy),
    };
  };

  PixelScene.prototype.loop = function (t) {
    requestAnimationFrame(this._loop);
    if (t - this.last < 55) return; // ~18 fps riittää pikseligrafiikalle
    const dt = Math.min(0.2, (t - (this.last || t)) / 1000);
    this.last = t;
    this.step(dt, t);
    this.draw(t);
  };

  PixelScene.prototype.step = function (dt, t) {
    const W = this.W, H = this.H, sc = this.sc, rand = this.rand;
    if (!sc) return;
    const windDx = 0.12 + Math.min(0.5, (this.state.wind || 0) * 0.04);
    this.clouds.forEach((c) => {
      c.x += c.v * dt;
      if (c.x > W + 10) c.x = -c.img.width - 10 - rand() * 40;
    });
    this.fogBands.forEach((f) => { f.off = ((f.off || 0) + f.v * dt) % W; });
    this.drops.forEach((d, i) => {
      d.y += d.v * dt;
      d.x += d.v * dt * windDx;
      if (d.y > d.end) {
        if (this.splashes.length < 60) this.splashes.push({ x: Math.round(d.x), y: Math.round(d.end), t: 0 });
        this.drops[i] = this.newDrop(rand, false);
      }
    });
    this.splashes = this.splashes.filter((s) => (s.t += dt) < 0.15);
    this.flakes.forEach((f) => {
      f.y += f.v * dt;
      f.p += dt * 1.5;
      f.x += Math.sin(f.p) * 0.3 + windDx * f.v * dt * 0.6;
      if (f.y > H) { f.y = -2; f.x = rand() * W; }
      if (f.x > W) f.x -= W;
    });
    if (this.smokeOn && this.cabin) {
      if (rand() < dt * 3) this.smoke.push({ x: this.cabin.chimney[0], y: this.cabin.chimney[1], a: 0 });
      this.smoke.forEach((p) => { p.a += dt; p.y -= dt * 6; p.x += dt * (2 + (this.state.wind || 0) * 0.8) + Math.sin(p.a * 3) * 0.1; });
      this.smoke = this.smoke.filter((p) => p.a < 3.5);
    }
    if (sc.thunder && t > this.nextBolt) {
      this.flash = 1;
      this.bolt = makeBolt(rand, Math.round(W * (0.2 + rand() * 0.6)), Math.round(H * 0.08), this.hy);
      this.boltUntil = t + 160;
      this.nextBolt = t + 3500 + rand() * 7000;
    }
    this.flash = Math.max(0, this.flash - dt * 4);
    if (this.bolt && t > this.boltUntil) this.bolt = null;
  };

  PixelScene.prototype.draw = function (t) {
    const ctx = this.ctx, W = this.W, H = this.H, hy = this.hy, sc = this.sc;
    if (!sc || !this.layers) return;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.layers.sky.c, 0, 0);
    // tuikkivat tähdet
    if (this.stars.length) {
      const k = Math.floor(t / 400);
      this.stars.forEach(([x, y], i) => {
        if ((i * 7 + k) % 5 === 0) { ctx.fillStyle = this.sky[0]; ctx.fillRect(x, y, 1, 1); }
      });
    }
    this.clouds.forEach((c) => ctx.drawImage(c.img, Math.round(c.x), c.y));
    if (this.deck) ctx.drawImage(this.deck.c, 0, 0);
    if (this.bolt) drawBolt(ctx, this.bolt);
    ctx.drawImage(this.layers.far.c, 0, 0);
    if (this.fogBands[0]) drawFog(ctx, this.fogBands[0], W);
    // vesi ja heijastus
    ctx.drawImage(this.layers.water.c, 0, hy + 1, W, H - hy - 1, 0, hy + 1, W, H - hy - 1);
    if (!sc.frozen) {
      const R = this.layers.refl.c, rh = this.reflH, tt = t / 1000;
      ctx.globalAlpha = 0.55;
      for (let r = 0; r < rh; r++) {
        const off = Math.round(Math.sin(r * 0.9 + tt * 2.2) * (0.4 + (r / rh) * 1.4));
        if ((r + Math.floor(tt * 3)) % 9 === 0) continue;
        ctx.drawImage(R, 0, r, W, 1, off, hy + 1 + r, W, 1);
      }
      ctx.globalAlpha = 1;
      // auringon/kuun kimallus
      if (this.body) {
        const k = Math.floor(t / 220);
        const rr = rngFrom(k * 9973 + 7);
        ctx.fillStyle = this.body.moon ? '#dfe6ff' : this.state.phase === 'dusk' ? '#ffd08a' : '#fff4c0';
        for (let i = 0; i < 14; i++) {
          const y = hy + 2 + Math.floor(rr() * (H * 0.18));
          const w = 1 + Math.floor(rr() * 4);
          ctx.fillRect(this.body.x - 3 + Math.floor(rr() * 7) - (w >> 1), y, w, 1);
        }
      }
      // pientä välkettä
      const k2 = Math.floor(t / 300);
      const r2 = rngFrom(k2 * 31 + 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < W / 18; i++) ctx.fillRect(Math.floor(r2() * W), hy + 3 + Math.floor(r2() * (H - hy)), 2 + Math.floor(r2() * 3), 1);
    }
    if (this.fogBands[1]) drawFog(ctx, this.fogBands[1], W);
    ctx.drawImage(this.layers.land.c, 0, 0);
    // savu
    this.smoke.forEach((p) => {
      const a = Math.max(0, 0.6 - p.a / 6);
      ctx.fillStyle = `rgba(210,212,222,${a})`;
      const s = p.a > 1.5 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    });
    // sade
    if (this.drops.length) {
      ctx.fillStyle = this.state.phase === 'night' ? 'rgba(140,160,200,0.7)' : 'rgba(200,220,245,0.75)';
      const slope = 0.12 + Math.min(0.5, (this.state.wind || 0) * 0.04);
      this.drops.forEach((d) => {
        for (let j = 0; j < d.len; j++) ctx.fillRect(Math.round(d.x - j * slope), Math.round(d.y - j), 1, 1);
      });
      this.splashes.forEach((s) => { ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1); });
    }
    if (this.flakes.length) {
      ctx.fillStyle = this.state.phase === 'night' ? '#c8d0e8' : '#ffffff';
      this.flakes.forEach((f) => ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s));
    }
    if (this.fogBands[2]) drawFog(ctx, this.fogBands[2], W);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(230,236,255,${this.flash * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
  };

  // ---------- piirtoapurit ----------
  function ridge(rand, W, base, amp, waves) {
    const ph = waves.map(() => rand() * Math.PI * 2);
    const tot = waves.reduce((a, w) => a + w[1], 0);
    const out = [];
    for (let x = 0; x < W; x++) {
      let v = 0;
      waves.forEach(([f, a], i) => (v += Math.sin(x * f + ph[i]) * a));
      out.push(Math.round(base - amp * (0.35 + 0.65 * (0.5 + (0.5 * v) / tot))));
    }
    return out;
  }

  function drawFell(ctx, prof, hy, col, cap, haze, capDepth) {
    const minTop = Math.min.apply(null, prof);
    const span = hy - minTop || 1;
    for (let x = 0; x < prof.length; x++) {
      const top = prof[x];
      for (let y = top; y <= hy; y++) {
        const fromTop = y - top;
        const high = (hy - top) / span; // 0..1 kuinka korkea kohta
        let c = col;
        if (fromTop < capDepth * high && high > 0.45) c = fromTop === capDepth * high - 1 && thr(x, y) < 0.5 ? col : cap;
        const hz = (y - (hy - 6)) / 6;
        if (hz > 0 && thr(x, y) < hz * 0.7) c = haze;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }
      // aurinkopuolen reunakorostus
      if (x > 0 && prof[x - 1] > top) { ctx.fillStyle = cap; ctx.fillRect(x, top, 1, 1); }
    }
  }

  function spruce(ctx, x, base, h, pal, snow, k) {
    h = Math.max(4, h);
    const top = base - h;
    for (let r = 0; r < h; r++) {
      const half = Math.floor(r * k) + (r % 3 === 2 ? 1 : 0) - (r % 3 === 0 && r > 2 ? 1 : 0);
      const y = top + r;
      ctx.fillStyle = pal.body;
      ctx.fillRect(x - half, y, half * 2 + 1, 1);
      ctx.fillStyle = pal.dark;
      ctx.fillRect(x - half, y, Math.max(1, half >> 1), 1);
      if (r % 3 === 2 && half > 0) { ctx.fillStyle = pal.hi; ctx.fillRect(x + half - 1, y, 2, 1); }
      if (snow && r % 3 === 0 && r > 0) {
        ctx.fillStyle = pal.snow;
        ctx.fillRect(x - half, y, Math.max(1, Math.ceil(half * 0.7)), 1);
        if (half > 1) ctx.fillRect(x + half, y + 1, 1, 1);
      }
    }
    if (snow) { ctx.fillStyle = pal.snow; ctx.fillRect(x, top, 1, 1); }
  }

  function birch(ctx, x, base, h, season, rand) {
    ctx.fillStyle = '#e8e4da';
    ctx.fillRect(x, base - h, 1, h);
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x, base - Math.round(h * 0.4), 1, 1);
    const [a, b] = BIRCH[season] || BIRCH.summer;
    const cr = Math.max(2, Math.round(h * 0.38));
    const cy = base - h + cr - 1;
    for (let yy = -cr; yy <= cr; yy++)
      for (let xx = -cr; xx <= cr; xx++) {
        if (xx * xx + yy * yy * 1.3 > cr * cr + 0.5) continue;
        if (rand() < 0.12) continue;
        ctx.fillStyle = xx - yy > cr * 0.5 ? b : a;
        ctx.fillRect(x + xx, cy + yy, 1, 1);
      }
  }

  function rock(ctx, x, y, r, snow) {
    for (let yy = -r; yy <= 0; yy++)
      for (let xx = -r - 1; xx <= r + 1; xx++) {
        if ((xx * xx) / ((r + 1) * (r + 1)) + (yy * yy) / (r * r) > 1) continue;
        ctx.fillStyle = yy === -r || (snow && yy <= -r + 1) ? (snow ? '#f4f8ff' : '#a4a9b4') : xx > r * 0.3 ? '#555a66' : '#7a7f8c';
        ctx.fillRect(x + xx, y + yy, 1, 1);
      }
  }

  function cabin(ctx, x, b, snow) {
    const wall = '#a8322a', wallD = '#86271f', trim = '#efe6d6';
    ctx.fillStyle = wall;
    ctx.fillRect(x, b - 9, 20, 9);
    ctx.fillStyle = wallD;
    for (let i = 2; i < 20; i += 3) ctx.fillRect(x + i, b - 9, 1, 9);
    ctx.fillStyle = trim;
    ctx.fillRect(x, b - 9, 1, 9);
    ctx.fillRect(x + 19, b - 9, 1, 9);
    // katto
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 5 ? (snow ? '#ffffff' : '#5a4650') : snow ? (i > 2 ? '#f2f6fd' : '#dbe4f2') : i % 2 ? '#3b2b33' : '#463540';
      ctx.fillRect(x - 2 + i, b - 10 - i, 24 - i * 2, 1);
    }
    // savupiippu
    ctx.fillStyle = '#6a5c5c';
    ctx.fillRect(x + 15, b - 17, 3, 6);
    ctx.fillStyle = snow ? '#ffffff' : '#867676';
    ctx.fillRect(x + 15, b - 17, 3, 1);
    // ikkuna ja ovi
    ctx.fillStyle = trim;
    ctx.fillRect(x + 3, b - 8, 6, 5);
    ctx.fillStyle = '#2a2440';
    ctx.fillRect(x + 4, b - 7, 4, 3);
    ctx.fillStyle = trim;
    ctx.fillRect(x + 12, b - 7, 5, 7);
    ctx.fillStyle = '#5a2c22';
    ctx.fillRect(x + 13, b - 6, 3, 6);
    ctx.fillStyle = '#d8b040';
    ctx.fillRect(x + 15, b - 3, 1, 1);
    return { win: [x + 4, b - 7], chimney: [x + 16, b - 18] };
  }

  function drawBody(ctx, b, ph, sky) {
    const { x, y, r } = b;
    const glow = b.moon ? '#9fb0e8' : ph === 'dusk' ? '#ffb070' : '#fff4c0';
    // ditteröity hehku
    for (let yy = -r * 3; yy <= r * 3; yy++)
      for (let xx = -r * 3; xx <= r * 3; xx++) {
        const d = Math.sqrt(xx * xx + yy * yy) / r;
        if (d <= 1 || d > 3) continue;
        const a = (3 - d) / 2;
        if (thr(x + xx, y + yy) < a * (b.moon ? 0.35 : 0.5)) { ctx.fillStyle = mix(glow, sky[1], 0.45); ctx.fillRect(x + xx, y + yy, 1, 1); }
      }
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++) {
        const d2 = xx * xx + yy * yy;
        if (d2 > r * r + r * 0.6) continue;
        let c;
        if (b.moon) {
          const cut = (xx - r * 0.55) ** 2 + (yy + r * 0.35) ** 2 < (r * 0.8) ** 2;
          if (cut) continue;
          c = xx + yy < -r * 0.6 ? '#fffbe6' : '#efe3ad';
        } else if (ph === 'dusk') c = yy > r * 0.3 ? '#ff8a4a' : yy < -r * 0.4 ? '#ffe39a' : '#ffb85c';
        else c = xx + yy < -r * 0.7 ? '#ffffff' : d2 > (r - 1.2) ** 2 ? '#ffd65a' : '#fff1a0';
        ctx.fillStyle = c;
        ctx.fillRect(x + xx, y + yy, 1, 1);
      }
  }

  function cloudSprite(rand, w, h, pal) {
    const C = layer(w + 2, h + 2);
    const puffs = [];
    const n = 4 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const px = 3 + ((w - 6) * (i + 0.5)) / n + (rand() - 0.5) * 3;
      const edge = Math.min(px, w - px) / (w / 2);
      const r = h * (0.32 + 0.4 * edge * (0.7 + rand() * 0.5));
      puffs.push([px, h - r * 0.9 - 1, r]);
    }
    const inside = (x, y) => y <= h - 1 && puffs.some(([cx, cy, r]) => (x - cx) ** 2 + ((y - cy) * 1.15) ** 2 <= r * r);
    const P = pal;
    for (let y = 0; y < h + 2; y++)
      for (let x = 0; x < w + 2; x++) {
        if (!inside(x, y)) continue;
        const up = inside(x, y - 2), dn = inside(x, y + 2);
        let c = P[1];
        if (!up) c = P[0];
        else if (!dn) c = P[2];
        else if (!inside(x, y + 3) && thr(x, y) < 0.5) c = P[2];
        else if (!inside(x, y - 3) && thr(x, y) < 0.5) c = P[0];
        C.ctx.fillStyle = c;
        C.ctx.fillRect(x, y, 1, 1);
      }
    return C.c;
  }

  function drawFog(ctx, f, W) {
    const off = Math.round(f.off || 0);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(f.img, -off, f.y);
    ctx.drawImage(f.img, W * 2 - off, f.y);
    ctx.globalAlpha = 1;
  }

  function makeBolt(rand, x, y0, y1) {
    const pts = [];
    let x2 = x, y = y0;
    while (y < y1) {
      pts.push([x2, y]);
      y += 2 + Math.floor(rand() * 4);
      x2 += Math.round((rand() - 0.5) * 6);
    }
    const branch = [];
    if (pts.length > 6) {
      let [bx, by] = pts[Math.floor(pts.length / 3)];
      for (let i = 0; i < 6; i++) { branch.push([bx, by]); by += 2 + Math.floor(rand() * 3); bx += 2 + Math.floor(rand() * 3); }
    }
    return [pts, branch];
  }
  function drawBolt(ctx, bolt) {
    bolt.forEach((pts) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let j = 0; j <= n; j++) {
          const px = Math.round(ax + ((bx - ax) * j) / n), py = Math.round(ay + ((by - ay) * j) / n);
          ctx.fillStyle = '#9fb6ff';
          ctx.fillRect(px - 1, py, 3, 1);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px, py, 1, 1);
        }
      }
    });
  }

  WX.PixelScene = PixelScene;
})();
