/* Pikseligrafiikkatausta (16-bit JRPG -henkeen). Maisema muodostuu:
 *   - säätilasta: pilvet, sade, lumi, ukkonen, sumu
 *   - vuorokauden- ja vuodenajasta: päivä / hämärä / yö, kevät … talvi
 *   - kasvillisuusvyöhykkeestä (Köppenin ilmastoluokasta): tundra, taiga, havumetsä, lehtimetsä,
 *     subtrooppinen, välimeri, aro, aavikko, savanni, sademetsä
 *   - asutuksesta (DEGURBA-tyyppinen): haja-asutus, kylä, pikkukaupunki, kaupunki
 *   - alueesta: rakennustyyli (Pohjola, Eurooppa, Amerikat, Aasia, Afrikka, Oseania, Antarktis)
 * Piirretään matalaan resoluutioon ja skaalataan CSS:llä (image-rendering: pixelated). */
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
  const mixPal = (pa, pb, t) => pa.map((c, i) => mix(c, Array.isArray(pb) ? pb[i] : pb, t));
  const dark = (c, k) => mix(c, '#000000', k);
  const light = (c, k) => mix(c, '#ffffff', k);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

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
    ruska: { pal: ['#b0563a', '#94482e', '#7a3c28', '#5e2e20'], hi: '#d07040', tuft: '#e8843c' },
    tundra: { pal: ['#7a8a4a', '#6a7a40', '#5a6636', '#48522c'], hi: '#9aa860', tuft: '#c8c890' },
    dry: { pal: ['#b8a060', '#a08850', '#8a7244', '#705c38'], hi: '#d0b870', tuft: '#8a9a50' },
    steppe: { pal: ['#c0a868', '#a8905a', '#8e784a', '#74603c'], hi: '#d8c080', tuft: '#e0c888' },
    sand: { pal: ['#f0d498', '#e0c080', '#ccaa6c', '#b49058'], hi: '#fff0c0', tuft: '#c89858', tuftP: 0.03 },
    savanna: { pal: ['#d0b050', '#b89a44', '#9c823a', '#806a30'], hi: '#e8cc68', tuft: '#f0d878', tuftP: 0.3 },
    lush: { pal: ['#3a8a3a', '#2e7430', '#245e28', '#1a4a20'], hi: '#58ac4a', tuft: '#70c058', tuftP: 0.3 },
  };
  // lehvästöt: [perus, tumma, vaalea]
  const LEAF = {
    summer: [['#4f8a34', '#3a6e28', '#6aa844']],
    spring: [['#7cc050', '#5a9a3a', '#a0dc70']],
    autumn: [['#d0702a', '#a8501e', '#e8a03a'], ['#d8a830', '#b08020', '#f0c850'], ['#b8402a', '#8a3020', '#d8603a']],
    evergreen: [['#3a7a3a', '#2a5e2c', '#58a04a']],
    jungle: [['#2a6a2a', '#1a4a1e', '#3e8a3a'], ['#3a7a2a', '#26561e', '#52983e']],
    olive: [['#8a9a6a', '#6a7a50', '#aab88a']],
    cypress: [['#2a4a2a', '#1a3420', '#3e6a3a']],
    acacia: [['#6a7a3a', '#4e5c2a', '#8a9a4a']],
    palm: [['#3a8a3a', '#2a6a2a', '#5aaa4a']],
    cactus: [['#4a8a4a', '#2e6a34', '#6aaa5a']],
    shrub: [['#5a6a3a', '#46542e', '#7a8a4a']],
    shrubRuska: [['#b0503a', '#8a3a2a', '#d0704a']],
    shrubBare: [['#6a5a46', '#52463a', '#84725a']],
  };
  const BIRCH = { summer: ['#6aaa44', '#4f8c34'], spring: ['#8fd060', '#6aaa44'], autumn: ['#f0b23c', '#d27028'] };
  const PINE = { body: '#1e4630', hi: '#2f6343', dark: '#123020', snow: '#e8f0fa' };
  const TINT = { day: null, dusk: '#c99a9a', night: '#5a68aa' };

  // Kasvillisuusvyöhykkeet
  const BIOME = {
    tundra: { terrain: 'fell', amp: 0.32, tint: '#5a6888', far: 'tundra', step: 5, fg: 'shrub', water: 'lake', seasonal: true, open: true },
    taiga: { terrain: 'fell', amp: 0.3, tint: '#4d5d92', far: 'taiga', step: 4, fg: 'spruce', water: 'lake', seasonal: true },
    boreal: { terrain: 'fell', amp: 0.27, tint: '#4d5d92', far: 'boreal', step: 2.5, fg: 'spruce', water: 'lake', seasonal: true },
    temperate: { terrain: 'hills', amp: 0.17, tint: '#4a6878', far: 'temperate', step: 3, fg: 'broadleaf', water: 'lake', seasonal: true, fields: true },
    subtropical: { terrain: 'hills', amp: 0.22, tint: '#3f6a6a', far: 'subtropical', step: 3, fg: 'evergreen', water: 'sea', ground: 'lush', fields: true },
    mediterranean: { terrain: 'hills', amp: 0.2, tint: '#7a6a6a', far: 'med', step: 4, fg: 'cypress', water: 'sea', ground: 'dry' },
    steppe: { terrain: 'mesa', amp: 0.13, tint: '#8a6a5a', far: 'steppe', step: 10, fg: 'bush', water: 'lake', ground: 'steppe', open: true },
    desert: { terrain: 'mesa', amp: 0.17, tint: '#b07850', far: 'desert', step: 0, fg: 'desert', water: 'none', ground: 'sand', open: true },
    savanna: { terrain: 'hills', amp: 0.12, tint: '#6a6a7a', far: 'savanna', step: 14, fg: 'acacia', water: 'lake', ground: 'savanna', open: true },
    rainforest: { terrain: 'peaks', amp: 0.3, tint: '#2f5a4a', far: 'jungle', step: 2, fg: 'palm', water: 'lake', ground: 'lush' },
  };

  // Rakennustyylit
  const STYLE = {
    nordic: { walls: ['#a8322a', '#c8a03a', '#e6dfcf', '#8a2a24', '#6a7a8a'], roofs: ['#3b2b33', '#4a4a52', '#2e3a44'], roof: 'gable', landmark: 'church', tower: true, chimney: true, city: ['#8a8a92', '#a89a88', '#6a7280', '#b8b0a0', '#7a6a60', '#c8bca8'] },
    europe: { walls: ['#e8dcc4', '#d8c8a8', '#f0e8d8', '#c8b090', '#e0c8a0'], roofs: ['#b4553a', '#a04a32', '#8a4030'], roof: 'gable', landmark: 'church', tower: true, chimney: true, city: ['#c8bca8', '#a8a090', '#d8d0c0', '#8a8278', '#b0a898'] },
    namerica: { walls: ['#e8e8e8', '#8aa4c0', '#c8b89a', '#a8322a', '#9ab08a'], roofs: ['#4a4a52', '#5a4038', '#3a3a42'], roof: 'gable', landmark: 'watertower', village: 'barn', chimney: true, glass: true, city: ['#6a8aa8', '#8aa8c8', '#5a6a7a', '#a8b8c8', '#4a5a6a', '#b8b0a0'] },
    samerica: { walls: ['#e8a040', '#40a8a0', '#e86a6a', '#f0d860', '#7a9ae8', '#e8e0d0'], roofs: ['#b4553a', '#a04a32'], roof: 'gable', landmark: 'church', city: ['#d8d0c0', '#c8b8a0', '#a8b0b8', '#e8e0d0', '#8a9aa8'] },
    eastasia: { walls: ['#e8e2d4', '#c8b8a0', '#d8d0c0', '#a8322a'], roofs: ['#3a4a5a', '#2a3a3a', '#4a5a40'], roof: 'curved', landmark: 'pagoda', glass: true, neon: true, city: ['#8a9aa8', '#a8b8c8', '#6a7a8a', '#c8ccd0', '#5a6a7a'] },
    westasia: { walls: ['#e8d8b0', '#d8c090', '#f0e8d0', '#e0c8a8'], roof: 'flat', landmark: 'dome', city: ['#d8c8a8', '#c8b090', '#8aa8c0', '#e8dcc0', '#b0a080'] },
    africa: { walls: ['#c8783a', '#d8a060', '#e8d0a0', '#b86a3a'], roof: 'flat', village: 'hut', city: ['#d8c8a8', '#a8a8a8', '#c8a878', '#8aa0b0', '#e0d0b8'] },
    oceania: { walls: ['#e8e8e8', '#d8c8a8', '#8aa4c0', '#c8d8c0'], roofs: ['#9aa0a8', '#7a8088'], roof: 'gable', corrugated: true, landmark: 'watertower', chimney: true, city: ['#a8b8c8', '#c8c8c0', '#7a8a9a', '#d8d0c0'] },
    antarctica: { walls: ['#e8642a', '#d84a2a', '#e8e8e8'], roofs: ['#e8e8e8'], roof: 'flat', landmark: 'mast', station: true, city: ['#e8642a', '#d84a2a', '#c8ccd6'] },
  };
  const STAR_F = { rural: 1, village: 0.85, town: 0.5, city: 0.2 };
  const FRONT_F = { rural: 1, village: 0.85, town: 0.55, city: 0.4 };

  // ---------- kohtaus ----------
  function PixelScene(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = { code: 2, phase: 'day', temp: 10, month: 7, lat: 60, wind: 3, seed: 1, settlement: 'rural', style: 'nordic', biome: 'boreal' };
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
    const biome = BIOME[s.biome] ? s.biome : 'boreal';
    const B = BIOME[biome];
    let m = s.month;
    if (s.lat < 0) m = ((m + 5) % 12) + 1;
    const seasonal = !!s.season || (B.seasonal && Math.abs(s.lat) >= 23.5 && !s.evergreen);
    const wintry = [11, 12, 1, 2, 3, 4].includes(m);
    let snowGround;
    if (s.ice) snowGround = true;
    else if (s.snowDepth != null) snowGround = s.snowDepth >= 0.01 || (d.precip === 'snow' && s.temp <= 1); // lumensyvyys datasta
    else snowGround = d.precip === 'snow' || (s.temp <= 0 && wintry && seasonal) || s.temp <= -3;
    let foliage = !seasonal ? 'summer' : m === 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m === 9 || m === 10 ? 'autumn' : 'late';
    if (s.season) { foliage = s.season === 'winter' ? 'snow' : s.season; snowGround = foliage === 'snow'; }
    if (snowGround) foliage = 'snow';
    let ground;
    if (snowGround) ground = 'snow';
    else if (biome === 'tundra') ground = foliage === 'autumn' ? 'ruska' : foliage === 'late' ? 'late' : 'tundra';
    else if (B.seasonal || s.season) ground = B.ground && !s.season ? B.ground : foliage;
    else ground = B.ground || 'summer';
    // vesistö: rannikolla meri, sisämaassa järvi
    let water = B.water;
    if (water !== 'none' && s.coast === true) water = 'sea';
    else if (water === 'sea' && s.coast === false) water = 'lake';
    // jää: pakkasvuorokausista laskettu tila, muuten arvio
    let frozen = false, partialIce = false;
    if (water === 'none') frozen = false;
    else if (s.ice || s.season) frozen = snowGround && (!!s.ice || s.season === 'winter') && s.temp < 1;
    else if (s.iceState) { frozen = s.iceState === 'frozen'; partialIce = s.iceState === 'partial'; }
    else frozen = snowGround && [12, 1, 2, 3].includes(m) && s.temp < 1;
    const style = STYLE[s.style] ? s.style : 'nordic';
    const settlement = STAR_F[s.settlement] ? s.settlement : 'rural';
    // aurinko ja kuu (oletukset, jos tähtitieteellisiä tietoja ei ole annettu)
    const ph = s.phase;
    const south = s.lat < 0;
    const sunAlt = s.sunAlt != null ? s.sunAlt : ph === 'day' ? 35 : ph === 'dusk' ? 1 : -25;
    const sunAz = s.sunAz != null ? s.sunAz : (south ? 0 : 180) + (ph === 'dusk' ? 50 : 20) * (south ? -1 : 1);
    const moon = {
      alt: s.moonAlt != null ? s.moonAlt : ph === 'night' ? 32 : -10,
      az: s.moonAz != null ? s.moonAz : south ? 40 : 140,
      phase: s.moonPhase != null ? s.moonPhase : 0.38,
      fraction: s.moonFrac != null ? s.moonFrac : 0.85,
    };
    // maaston korkeuserot → vuorten korkeus; yli 900 m → alppimaisemat
    const rel = s.relief;
    const reliefF = rel == null ? 1 : rel < 60 ? 0.45 : rel < 200 ? 0.45 + ((rel - 60) / 140) * 0.4 : rel < 800 ? 0.85 + ((rel - 200) / 600) * 0.45 : Math.min(1.9, 1.3 + (rel - 800) / 2500);
    const alpine = rel != null && rel >= 900;
    const snowCaps = s.peak != null && s.peak > Math.max(800, 5500 - 80 * Math.abs(s.lat));
    // tuulen suunta ruudulla: katsoja katsoo pohjoisella pallonpuoliskolla etelään (oikealla länsi)
    const toward = ((s.windDir != null ? s.windDir : 270) + 180) % 360;
    const windX = (s.wind || 0) * Math.cos(((toward - (south ? 90 : 270)) * Math.PI) / 180);
    return Object.assign({}, d, {
      snowGround, foliage, ground, frozen, partialIce, water, coastOpen: s.coast === true && water === 'sea', phase: ph, biome, B,
      style, st: STYLE[style], settlement, sunAlt, sunAz, moon, reliefF, alpine, snowCaps, windX, month: m, seasonal,
      ev: s.ev || { fx: {}, flag: null },
    });
  };

  PixelScene.prototype.build = function () {
    const W = this.W, H = this.H, s = this.state;
    if (!W || !H) return;
    const sc = (this.sc = this.derive());
    const B = sc.B, st = sc.st;
    const rand = rngFrom(s.seed || 1);
    const ph = sc.phase;
    const americas = sc.style === 'namerica' || sc.style === 'samerica';

    // ---- taivas ----
    const P = skyPalettes(sc.sunAlt);
    let sky = mixPal(P.clear, P.over, clamp(sc.clouds * 1.1 - 0.1, 0, 1));
    sky = mixPal(sky, P.storm, sc.dark * sc.clouds);
    if (sc.fog) sky = mixPal(sky, P.fog, 0.8);
    if (sc.precip === 'snow' && ph === 'day') sky = mixPal(sky, ['#a9b2c2', '#b6becc', '#c3cad6', '#d0d6df', '#dde2e9'], 0.5);
    this.sky = sky;
    const horizon = sky[sky.length - 1];
    const hy = (this.hy = Math.round(H * 0.64));
    this.layers = {};

    const S = layer(W, H);
    ditherRect(S.ctx, 0, 0, W, hy + 1, sky);
    // valosaaste kaupungin yllä
    if (ph !== 'day' && (sc.settlement === 'city' || sc.settlement === 'town')) {
      const gh = Math.round(H * (sc.settlement === 'city' ? 0.22 : 0.12));
      const k = sc.settlement === 'city' ? 0.55 : 0.3;
      for (let y = hy - gh; y <= hy; y++) {
        const t = 1 - (hy - y) / gh;
        for (let x = 0; x < W; x++) if (thr(x, y) < t * k) rect(S.ctx, x, y, 1, 1, mix(sky[4], '#e0905a', 0.45));
      }
    }
    this.stars = [];
    if (ph === 'night' && sc.clouds < 0.9) {
      const n = Math.round(((W * hy) / 260) * (1 - sc.clouds) * STAR_F[sc.settlement]);
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rand() * W), y = Math.floor(rand() * hy * 0.75);
        const big = rand() < 0.08;
        S.ctx.fillStyle = rand() < 0.5 ? '#ffffff' : '#c8d4ff';
        S.ctx.fillRect(x, y, 1, 1);
        if (big) { S.ctx.fillRect(x - 1, y, 3, 1); S.ctx.fillRect(x, y - 1, 1, 3); }
        if (rand() < 0.25) this.stars.push([x, y]);
      }
    }
    // aurinko ja kuu todellisilla paikoillaan; kuu oikeassa vaiheessaan
    this.body = null;
    if (sc.clouds < 0.95 && !sc.fog) {
      const sp = skyPos(sc.sunAz, sc.sunAlt, W, hy, s.lat);
      let sun = null, moon = null;
      if (sp && sc.sunAlt > -1.5) {
        const low = sc.sunAlt < 6;
        sun = { x: sp.x, y: sp.y, r: low ? 9 : 7, moon: false };
        drawBody(S.ctx, sun, low ? 'dusk' : 'day', sky);
      }
      const mp = skyPos(sc.moon.az, sc.moon.alt, W, hy, s.lat);
      if (mp && sc.moon.alt > -1 && sc.moon.fraction > 0.03 && (sc.sunAlt < 0 || sc.moon.fraction > 0.2)) {
        moon = { x: mp.x, y: mp.y, r: 6, moon: true, phase: sc.moon.phase, fraction: sc.moon.fraction, south: s.lat < 0, pale: sc.sunAlt > 0 };
        drawBody(S.ctx, moon, ph, sky);
      }
      this.body = sun && sc.sunAlt > 0 ? sun : moon && !moon.pale ? moon : sun;
    }
    this.layers.sky = S;
    // revontulet
    this.aurora = null;
    const aur = (s.aurora || 0) * (1 - Math.min(1, sc.clouds * 1.1)) * (sc.fog ? 0 : 1);
    if (aur > 0.04 && sc.sunAlt < -9) {
      const ah = Math.round(hy * 0.7);
      const A = layer(W, ah);
      this.aurora = { L: A, img: A.ctx.createImageData(W, ah), s: Math.min(1, aur), ah, last: -1 };
    }

    // ---- pilvet ----
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

    // ---- kaukainen kerros: maasto, asutus, vastarannan kasvillisuus ----
    const F = layer(W, H);
    const farLights = [];
    this.blinkers = [];
    const gp = GROUND[sc.ground];
    let terrain = B.terrain;
    if (sc.biome === 'desert' && !americas && sc.style !== 'oceania') terrain = 'dune';
    if (sc.alpine && terrain !== 'dune') terrain = 'alpine';
    const amp = H * B.amp * sc.reliefF;
    const nearT = sc.fog ? 0.25 : 0.55, farT = sc.fog ? 0.4 : 0.72;
    const tintA = terrain === 'alpine' ? '#5a6478' : B.tint;
    const fA = mix(horizon, ph === 'night' ? '#1c2650' : tintA, nearT);
    const fB = mix(horizon, ph === 'night' ? '#141d40' : dark(tintA, 0.2), farT);
    const alpCaps = terrain === 'alpine' && (sc.snowGround || sc.snowCaps);
    const capA = sc.snowGround || alpCaps ? mix('#ffffff', horizon, ph === 'day' ? 0.15 : 0.55) : mix(fA, '#ffffff', 0.12);
    const ridgeA = ridgeOf(terrain, rand, W, hy, amp);
    const ridgeB = ridgeOf(terrain, rand, W, hy, amp * 0.56);
    drawFell(F.ctx, ridgeA, hy, fA, capA, horizon, sc.snowGround ? 6 : 2, terrain, null, alpCaps ? Math.round(hy - amp * 0.62) : null);
    const fields = B.fields && !sc.snowGround ? fieldColors(fB, sc.foliage) : null;
    drawFell(F.ctx, ridgeB, hy, fB, sc.snowGround ? mix(capA, fB, 0.35) : mix(fB, '#ffffff', 0.1), horizon, sc.snowGround ? 4 : 1, terrain, fields && { colors: fields, rand }, alpCaps && terrain === 'alpine' ? Math.round(hy - amp * 0.4) : null);

    // rannikolla avomeri toisella laidalla: maan sallittu korkeus (px) sarakkeittain
    let landH = null;
    this.openX = null;
    if (sc.coastOpen) {
      const right = rand() < 0.5;
      const ow = Math.round(W * (0.3 + rand() * 0.12)), tw = Math.round(W * 0.1);
      landH = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        const dOpen = right ? W - ow - x : x - ow;
        // niemen korkeus nousee loivasti rannasta sisämaahan
        landH[x] = dOpen <= 0 ? 0 : dOpen < tw ? Math.pow(dOpen / tw, 1.4) * H * 0.12 : H * 0.12 + (dOpen - tw) * 1.2;
      }
      for (let x = 0; x < W; x++) if (landH[x] < hy) F.ctx.clearRect(x, 0, 1, hy + 1 - Math.round(landH[x]));
      this.openX = right ? [W - ow, W] : [0, ow];
    }
    const allowed = (x) => (landH ? landH[clamp(Math.round(x), 0, W - 1)] : Infinity);

    // kaupungin siluetti puiden taakse
    if (sc.settlement === 'city') skyline(F.ctx, W, H, hy, st, rand, farLights, this.blinkers, sc.snowGround, horizon, allowed);

    // vastarannan profiili
    const forest = !B.open;
    const shore = [];
    const sAmp = forest ? H * 0.018 : H * 0.008;
    for (let x = 0; x < W; x++) {
      let y = Math.round(hy - 2 - sAmp * (1 + Math.sin(x * 0.045 + rand() * 0.2) * 0.6 + Math.sin(x * 0.13) * 0.3));
      if (landH && landH[x] < hy) y = Math.max(y, Math.round(hy + 1 - Math.min(landH[x], hy + 1 - y)));
      shore.push(y);
    }
    const env = { sc, rand, H, horizon, americas };
    // takarivi
    if (B.far === 'desert') {
      const n = americas ? 7 : 5;
      const cx = W * (0.3 + rand() * 0.4);
      for (let i = 0; i < n; i++) {
        const x = Math.round(americas ? rand() * W : cx + (rand() - 0.5) * W * 0.12);
        if (allowed(x) < 4) continue;
        plant(F.ctx, americas ? 'cactus' : 'palm', x, shore[clamp(x, 0, W - 1)] - 1, env, 0.35);
      }
    } else if (B.step > 0) {
      for (let x = -4; x < W + 4; x += Math.max(2, Math.round(B.step * (0.7 + rand() * 0.6)))) {
        if (allowed(x) < 4) continue;
        plant(F.ctx, farKind(B.far, rand, sc.style), x, shore[clamp(x, 0, W - 1)] - 1, env, 0.35);
      }
    }
    const shoreFill = forest ? PINE.dark : dark(gp.pal[2], 0.35);
    for (let x = 0; x < W; x++) if (shore[x] <= hy) rect(F.ctx, x, shore[x], 1, hy - shore[x] + 1, shoreFill);

    // asutus rannalla (ei avomeren kohdalle)
    const occupied = new Uint8Array(W);
    if (landH) for (let x = 0; x < W; x++) if (landH[x] < 12) occupied[x] = 1;
    if (sc.settlement !== 'rural') settlementRow(F.ctx, sc, st, W, H, hy, rand, farLights, this.blinkers, occupied);

    // etummainen puurivi (harvempi taajamissa)
    if (B.step > 0) {
      const ff = FRONT_F[sc.settlement];
      for (let x = -3; x < W + 3; x += Math.max(2, Math.round(B.step * (0.7 + rand() * 0.8) / Math.max(0.3, ff)))) {
        const xi = clamp(x, 0, W - 1);
        if (allowed(xi) < 4) continue;
        if (occupied[xi] && rand() < 0.85) continue;
        const kind = farKind(B.far, rand, sc.style);
        plant(F.ctx, kind, x, shore[xi] + 1, env, 0);
      }
    }
    for (let x = 0; x < W; x++) if (allowed(x) > 0) rect(F.ctx, x, hy, 1, 1, sc.snowGround ? '#dfe7f3' : sc.water === 'none' ? gp.pal[2] : '#3a3428');
    // majakkasaari avomerellä
    this.lighthouse = null;
    if (this.openX) this.lighthouse = lighthouse(F.ctx, Math.round((this.openX[0] + this.openX[1]) / 2 + (rand() - 0.5) * W * 0.08), hy, rand, sc.snowGround);
    // juhannuskokko vastarannalla
    this.kokko = null;
    if (sc.ev.fx.kokko) {
      let kx = Math.round(W * (0.3 + rand() * 0.3));
      for (let i = 0; i < 20 && allowed(kx) < 10; i++) kx = Math.round(W * (0.1 + rand() * 0.8));
      rect(F.ctx, kx - 4, hy - 2, 9, 2, '#3a2418');
      rect(F.ctx, kx - 3, hy - 3, 7, 1, '#4a3020');
      this.kokko = { x: kx, y: hy - 3 };
    }
    if (TINT[ph]) tint(F, ph === 'dusk' ? '#d8b0b0' : '#8090cc');
    if (sc.dark > 0.3 && ph === 'day') tint(F, mix('#ffffff', '#8890a0', sc.dark * 0.6));
    if (ph !== 'day') drawLights(F.ctx, farLights, ph === 'dusk' ? 0.6 : 1, rand);
    this.layers.far = F;

    // etualan rantaprofiili (tarvitaan jo vesikerroksessa)
    const shoreY = Math.round(H * 0.84);
    const prof = [];
    for (let x = 0; x < W; x++) {
      const l = Math.max(0, 1 - x / (W * 0.4)), r = Math.max(0, 1 - (W - x) / (W * 0.34));
      prof.push(Math.round(shoreY - H * 0.17 * l ** 1.7 - H * 0.1 * r ** 1.5 + Math.sin(x * 0.21) * 0.8 + Math.sin(x * 0.07) * 1.5));
    }
    this.prof = prof;

    // ---- vesi / jää / hiekka ----
    const Wt = layer(W, H);
    const waterH = H - hy - 1;
    if (sc.water === 'none') {
      ditherRect(Wt.ctx, 0, hy + 1, W, waterH, gp.pal);
      for (let k = 0; k < 5; k++) {
        const y0 = hy + 2 + waterH * (0.06 + k * 0.17), ph2 = rand() * 6;
        for (let x = 0; x < W; x++) {
          const y = Math.round(y0 + Math.sin(x * 0.045 + ph2) * 2.5 + Math.sin(x * 0.11 + k) * 1);
          rect(Wt.ctx, x, y, 1, 1, gp.hi);
          rect(Wt.ctx, x, y + 1, 1, 1, dark(gp.pal[1], 0.08));
        }
      }
    } else if (sc.frozen) {
      ditherRect(Wt.ctx, 0, hy + 1, W, waterH, mixPal(['#c9d6ea', '#d8e2f2', '#e6edf8', '#f2f6fc'], sky.slice(0, 4), ph === 'day' ? 0.2 : 0.6));
      Wt.ctx.fillStyle = mix('#b2c2dc', sky[2], 0.3);
      for (let i = 0; i < W / 6; i++) Wt.ctx.fillRect(Math.floor(rand() * W), hy + 2 + Math.floor(rand() * waterH), 3 + Math.floor(rand() * 8), 1);
    } else {
      const sea = sc.water === 'sea';
      const deep = ph === 'night' ? '#050a1c' : ph === 'dusk' ? '#2a1e3c' : sea ? '#0e5a7a' : '#173a6a';
      const wpal = [sky[4], sky[3], sky[2], sky[1], sky[0]].map((c, i) => mix(mix(c, deep, (sea ? 0.4 : 0.25) + i * 0.08), '#000000', 0.12));
      ditherRect(Wt.ctx, 0, hy + 1, W, waterH, wpal);
      if (this.openX) for (let x = this.openX[0]; x < this.openX[1]; x++) rect(Wt.ctx, x, hy + 1, 1, 1, dark(wpal[0], 0.18));
    }
    if (this.openX && sc.frozen) for (let x = this.openX[0]; x < this.openX[1]; x++) rect(Wt.ctx, x, hy + 1, 1, 1, '#b8c6dc');
    this.layers.water = Wt;
    const reflH = Math.min(waterH, Math.round(hy * 0.42));
    const R = layer(W, reflH);
    R.ctx.save();
    R.ctx.scale(1, -1);
    R.ctx.drawImage(F.c, 0, hy - reflH, W, reflH, 0, -reflH, W, reflH);
    R.ctx.restore();
    tint(R, ph === 'night' ? '#8090c0' : '#7486ad');
    this.layers.refl = R;
    this.reflH = reflH;
    // rantajää (järvi alkaa jäätyä tai sulaa)
    this.layers.ice = null;
    if (sc.partialIce && sc.water !== 'none' && !sc.frozen) {
      const I = layer(W, H);
      const ice = ph === 'night' ? '#7c88aa' : ph === 'dusk' ? '#c8b8c8' : '#dce6f2', edge = ph === 'night' ? '#5e6a8a' : '#b0bed6';
      let e1 = 2, e2 = 4;
      for (let x = 0; x < W; x++) {
        if (rand() < 0.4) e1 = clamp(e1 + (rand() < 0.5 ? -1 : 1), 1, 4);
        if (rand() < 0.4) e2 = clamp(e2 + (rand() < 0.5 ? -1 : 1), 2, 8);
        if (allowed(x) > 0) { rect(I.ctx, x, hy + 1, 1, e1, ice); rect(I.ctx, x, hy + 1 + e1, 1, 1, edge); }
        rect(I.ctx, x, prof[x] - e2, 1, e2 + 1, ice);
        rect(I.ctx, x, prof[x] - e2 - 1, 1, 1, edge);
      }
      this.layers.ice = I;
    }
    // aallonharjat merellä (aallonkorkeus datasta tai tuulesta)
    this.crests = [];
    if (sc.water === 'sea' && !sc.frozen) {
      const wv = s.waves != null ? s.waves : Math.min(2.5, (s.wind || 0) * 0.12);
      const n = Math.round(W * (0.05 + 0.1 * Math.min(3, wv)));
      for (let i = 0; i < n; i++) {
        const y = hy + 2 + Math.floor(Math.pow(rand(), 0.8) * (H - hy - 4));
        const depth = (y - hy) / (H - hy);
        this.crests.push({ x: rand() * W, y, len: 1 + Math.round(depth * (1.5 + wv * 1.5) * (0.4 + rand())), sp: (2 + rand() * 4) * (0.5 + depth), ph: rand() * 4 });
      }
    }

    // ---- etuala ----
    const L = layer(W, H);
    const fgLights = [];
    const top = Math.min.apply(null, prof);
    const G = layer(W, H);
    ditherRect(G.ctx, 0, top, W, H - top, gp.pal);
    const tuftP = gp.tuftP != null ? gp.tuftP : 0.18;
    for (let x = 0; x < W; x++) {
      L.ctx.drawImage(G.c, x, prof[x], 1, H - prof[x], x, prof[x], 1, H - prof[x]);
      rect(L.ctx, x, prof[x], 1, 1, gp.hi);
      if (rand() < tuftP) rect(L.ctx, x, prof[x] - 1, 1, 1 + (rand() < 0.3 ? 1 : 0), gp.tuft);
    }
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(W * (0.28 + rand() * 0.42));
      rock(L.ctx, x, prof[clamp(x, 0, W - 1)] + 1, 2 + Math.floor(rand() * 3), sc.snowGround, sc.biome === 'desert' || sc.biome === 'steppe');
    }
    if (sc.water !== 'none' && !sc.snowGround && ['summer', 'spring', 'autumn'].includes(sc.foliage) && !B.open) {
      for (let i = 0; i < W * 0.12; i++) {
        const x = Math.floor(W * 0.25 + rand() * W * 0.5);
        rect(L.ctx, x, prof[x] - 2 - Math.floor(rand() * 3), 1, 3, sc.foliage === 'autumn' ? '#b8963c' : '#6a9a40');
      }
    }
    // isot etualan kasvit: omina kuvinaan, jotta tuuli voi heiluttaa niitä
    let fgKind = B.fg;
    if (fgKind === 'desert') fgKind = americas ? 'cactus' : 'palm';
    if (fgKind === 'bush' && (sc.style === 'africa' || sc.style === 'oceania')) fgKind = 'acacia';
    const SCALE = { spruce: 1, broadleaf: 0.85, evergreen: 0.85, cypress: 1, palm: 0.95, acacia: 0.55, cactus: 0.5, shrub: 0.12, bush: 0.12 };
    this.trees = [];
    const addTree = (kind, x, b, h, xmas) => {
      if (sc.style === 'antarctica') return;
      const sw = Math.ceil(h * 1.7) + 12, sh = Math.ceil(h * 1.35) + 8;
      const T = layer(sw, sh);
      const lx = sw >> 1, lb = sh - 3;
      if (kind === 'spruce') rect(T.ctx, lx - 1, lb - 3, 2, 4, '#4a2e1e');
      plant(T.ctx, kind, lx, kind === 'spruce' ? lb - 2 : lb, env, 0, true, h);
      if (TINT[ph]) tint(T, TINT[ph]);
      if (sc.dark > 0.3 && ph === 'day') tint(T, mix('#ffffff', '#7c8494', sc.dark * 0.6));
      this.trees.push({ img: T.c, x: x - lx, y: b - lb, sh, ph: rand() * 6, lights: xmas ? treeLights(T, rand, Math.max(8, Math.round(h * 0.5))) : null, flex: kind === 'cactus' ? 0 : kind === 'palm' ? 1.3 : 1 });
    };
    [[0.03, 0.36], [0.11, 0.27], [0.19, 0.2], [0.965, 0.3], [0.9, 0.2]].forEach(([fx, fh], i) => {
      if ((fgKind === 'cactus' || fgKind === 'acacia') && i % 2 === 1) return;
      const x = Math.round(W * fx);
      const h = Math.round(H * fh * (0.9 + rand() * 0.2) * (SCALE[fgKind] || 1));
      addTree(fgKind, x, prof[clamp(x, 0, W - 1)], h, sc.ev.fx.xmas && i === 4);
    });
    if (sc.biome === 'tundra' && !sc.snowGround) addTree('spruce', Math.round(W * 0.07), prof[Math.round(W * 0.07)], Math.round(H * 0.12), false);
    // rakennus etualalla: mökki maaseudulla ja kylässä, lyhty ja penkki taajamissa
    const cx = Math.round(W * 0.74);
    let cb = 0;
    for (let x = cx - 3; x < cx + 23; x++) cb = Math.max(cb, prof[clamp(x, 0, W - 1)]);
    this.cabin = null;
    this.pole = null;
    let px;
    if (sc.settlement === 'rural' || sc.settlement === 'village') {
      for (let x = cx - 3; x < cx + 23; x++) {
        const xx = clamp(x, 0, W - 1);
        L.ctx.drawImage(G.c, xx, cb - 1, 1, H - cb, xx, cb - 1, 1, H - cb);
      }
      this.cabin = fgBuilding(L.ctx, cx, cb, sc, st, rand, fgLights);
      // lipputanko pohjoismaiselle mökille
      if (sc.style === 'nordic') {
        const pxp = cx - 8, gy = prof[pxp];
        rect(L.ctx, pxp, gy - 30, 1, 30, '#e8e8ec');
        rect(L.ctx, pxp, gy - 31, 1, 1, '#d8b040');
        this.pole = { x: pxp + 1, y: gy - 29 };
      }
      px = cx + 23;
    } else {
      lamp(L.ctx, Math.round(W * 0.8), prof[Math.round(W * 0.8)], fgLights, sc.snowGround);
      px = Math.round(W * 0.8) - 6;
    }
    if (sc.ev.fx.pumpkin) pumpkin(L.ctx, px, prof[clamp(px + 2, 0, W - 1)], fgLights);
    if (TINT[ph]) tint(L, TINT[ph]);
    if (sc.dark > 0.3 && ph === 'day') tint(L, mix('#ffffff', '#7c8494', sc.dark * 0.6));
    if (ph !== 'day') drawLights(L.ctx, fgLights, 1, rand);
    this.layers.land = L;
    this.tintC = TINT[ph];

    // ---- eläimet (sijoitetaan käyttöliittymän ikkunoiden ulkopuolelle) ----
    this.rand = rand;
    this.buildAnimals(rand);
    this.rehome();
    // ---- tapahtumat ----
    this.fw = sc.ev.fx.fireworks ? { rate: sc.ev.fx.fireworks, rockets: [], parts: [], next: 0 } : null;
    this.sparks = [];
    this.balloons = null;
    if (sc.ev.fx.balloons) {
      const BC = ['#e83a3a', '#f0c830', '#3a8ae8', '#4ac860', '#f070b0', '#f4f4f4'];
      this.balloons = [];
      for (let i = 0; i < 9; i++) this.balloons.push({ x: W * (0.3 + rand() * 0.5), y: H * (0.2 + rand() * 0.7), v: 5 + rand() * 5, c: BC[i % BC.length], ph: rand() * 6 });
    }

    // ---- hiukkaset ----
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
    this.smokeOn = s.temp < 12 && !sc.thunder && !!(this.cabin && this.cabin.chimney);
    // sumuvyöt (ja sademetsän usva)
    this.fogBands = [];
    const bands = sc.fog
      ? [[hy - H * 0.07, H * 0.14, 0.75], [hy + H * 0.05, H * 0.1, 0.6], [H * 0.86, H * 0.1, 0.4]]
      : sc.biome === 'rainforest' ? [[hy - H * 0.09, H * 0.08, 0.4]] : [];
    bands.forEach(([y, h, dens], i) => {
      const fc = P.fog[4];
      const Bd = layer(W * 2, Math.round(h));
      const bh = Bd.c.height;
      Bd.ctx.fillStyle = fc;
      for (let yy = 0; yy < bh; yy++)
        for (let x = 0; x < W * 2; x++) {
          const e = 1 - Math.abs(yy / bh - 0.5) * 2;
          const n2 = 0.6 + 0.4 * Math.sin(x * 0.03 + i) * Math.sin(x * 0.011 + i * 2);
          if (thr(x, yy) < e * dens * n2 * 1.6) Bd.ctx.fillRect(x, yy, 1, 1);
        }
      this.fogBands.push({ img: Bd.c, y: Math.round(y - h / 2), v: 1.5 + i * 0.8 });
    });
    this.flash = 0;
    this.bolt = null;
    this.nextBolt = performance.now() + 2500 + rand() * 4000;
    this.rand = rand;
  };

  PixelScene.prototype.newDrop = function (rand, anywhere) {
    const drizzle = this.sc.precip === 'drizzle';
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
    const dir = sc.windX < 0 ? -1 : 1;
    const windDx = 0.12 + Math.min(0.5, Math.abs(sc.windX) * 0.05);
    this.clouds.forEach((c) => {
      c.x += c.v * dt * dir;
      if (dir > 0 && c.x > W + 10) c.x = -c.img.width - 10 - rand() * 40;
      if (dir < 0 && c.x < -c.img.width - 10) c.x = W + 10 + rand() * 40;
    });
    this.fogBands.forEach((f) => { f.off = ((((f.off || 0) + f.v * dt * dir) % W) + W) % W; });
    this.drops.forEach((d, i) => {
      d.y += d.v * dt;
      d.x += d.v * dt * windDx * dir;
      if (d.y > d.end) {
        if (this.splashes.length < 60) this.splashes.push({ x: Math.round(d.x), y: Math.round(d.end), t: 0 });
        this.drops[i] = this.newDrop(rand, false);
      }
    });
    this.splashes = this.splashes.filter((s) => (s.t += dt) < 0.15);
    this.flakes.forEach((f) => {
      f.y += f.v * dt;
      f.p += dt * 1.5;
      f.x += Math.sin(f.p) * 0.3 + windDx * f.v * dt * 0.6 * dir;
      if (f.y > H) { f.y = -2; f.x = rand() * W; }
      if (f.x > W) f.x -= W;
      if (f.x < 0) f.x += W;
    });
    if (this.smokeOn && this.cabin) {
      if (rand() < dt * 3) this.smoke.push({ x: this.cabin.chimney[0], y: this.cabin.chimney[1], a: 0 });
      this.smoke.forEach((p) => { p.a += dt; p.y -= dt * 6; p.x += dir * dt * (1 + Math.abs(sc.windX) * 0.8) + Math.sin(p.a * 3) * 0.1; });
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
    this.stepAnimals(dt, t);
    // ilotulitus
    if (this.fw) {
      const fw = this.fw;
      if (t > fw.next) {
        fw.rockets.push({ x: W * (0.12 + rand() * 0.76), y: this.hy, ty: H * (0.08 + rand() * 0.3), v: 55 + rand() * 25 });
        fw.next = t + (1000 / fw.rate) * (0.4 + rand() * 1.2);
      }
      const FC = ['#ff5a5a', '#ffd84a', '#5ad0ff', '#7aff7a', '#ff7af0', '#ffffff', '#ffa040'];
      fw.rockets = fw.rockets.filter((r) => {
        r.y -= r.v * dt;
        if (r.y > r.ty) return true;
        const c = pick(rand, FC), c2 = pick(rand, FC), n = 26 + Math.floor(rand() * 18), sp = 20 + rand() * 20;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.2, v = sp * (0.6 + rand() * 0.5);
          fw.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.1 + rand() * 0.8, age: 0, c: i % 3 ? c : c2 });
        }
        return false;
      });
      fw.parts = fw.parts.filter((p) => {
        p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 16 * dt; p.vx *= 0.985;
        return p.age < p.life;
      });
    }
    // juhannuskokon kipinät
    if (this.kokko) {
      if (rand() < dt * 8) this.sparks.push({ x: this.kokko.x + (rand() - 0.5) * 3, y: this.kokko.y - 4, a: 0, vx: dir * (0.5 + rand()) });
      this.sparks.forEach((p) => { p.a += dt; p.y -= dt * (8 + rand() * 4); p.x += p.vx * dt * 3; });
      this.sparks = this.sparks.filter((p) => p.a < 1.6);
    }
    // vapun ilmapallot
    if (this.balloons) this.balloons.forEach((b) => {
      b.y -= b.v * dt;
      b.x += (Math.sin(t / 900 + b.ph) * 0.15 + sc.windX * 0.04) * dt * 10;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) { b.y = H * (0.75 + rand() * 0.1); b.x = W * (0.35 + rand() * 0.4); }
    });
  };

  PixelScene.prototype.draw = function (t) {
    const ctx = this.ctx, W = this.W, H = this.H, hy = this.hy, sc = this.sc;
    if (!sc || !this.layers) return;
    const tt = t / 1000;
    const dir = sc.windX < 0 ? -1 : 1;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.layers.sky.c, 0, 0);
    if (this.stars.length) {
      const k = Math.floor(t / 400);
      this.stars.forEach(([x, y], i) => {
        if ((i * 7 + k) % 5 === 0) { ctx.fillStyle = this.sky[0]; ctx.fillRect(x, y, 1, 1); }
      });
    }
    if (this.aurora) {
      drawAurora(this.aurora, W, t);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(this.aurora.L.c, 0, 0);
      ctx.globalAlpha = 1;
    }
    this.clouds.forEach((c) => ctx.drawImage(c.img, Math.round(c.x), c.y));
    if (this.deck) ctx.drawImage(this.deck.c, 0, 0);
    if (this.bolt) drawBolt(ctx, this.bolt);
    this.drawFlocks(ctx, t, 'far');
    ctx.drawImage(this.layers.far.c, 0, 0);
    // lentoestevalot
    if (this.blinkers.length && Math.floor(t / 700) % 2 === 0) {
      ctx.fillStyle = '#ff3a3a';
      this.blinkers.forEach(([x, y]) => ctx.fillRect(x, y, 1, 1));
    }
    // majakan valo hämärässä ja yöllä
    if (this.lighthouse && sc.phase !== 'day') {
      const L = this.lighthouse, on = (t % 3000) < 450;
      if (on) {
        for (let i = 1; i < 26; i++) if (thr(L.x + i, L.y) < 1 - i / 26) { rect(ctx, L.x + i, L.y, 1, 1, 'rgba(255,240,180,0.7)'); rect(ctx, L.x - i, L.y, 1, 1, 'rgba(255,240,180,0.7)'); }
        rect(ctx, L.x - 1, L.y - 1, 3, 3, 'rgba(255,240,180,0.5)');
      }
      rect(ctx, L.x, L.y, 1, 1, on ? '#ffffff' : '#ffd36b');
    }
    // juhannuskokko
    if (this.kokko) drawKokko(ctx, this.kokko, t, this.sparks, sc.phase);
    if (this.fogBands[0]) drawFog(ctx, this.fogBands[0], W);
    ctx.drawImage(this.layers.water.c, 0, hy + 1, W, H - hy - 1, 0, hy + 1, W, H - hy - 1);
    if (!sc.frozen && sc.water !== 'none') {
      const R = this.layers.refl.c, rh = this.reflH;
      ctx.globalAlpha = 0.55;
      for (let r = 0; r < rh; r++) {
        const off = Math.round(Math.sin(r * 0.9 + tt * 2.2) * (0.4 + (r / rh) * 1.4));
        if ((r + Math.floor(tt * 3)) % 9 === 0) continue;
        ctx.drawImage(R, 0, r, W, 1, off, hy + 1 + r, W, 1);
      }
      ctx.globalAlpha = 1;
      if (this.aurora) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.translate(0, hy * 2 + 2);
        ctx.scale(1, -1);
        ctx.drawImage(this.aurora.L.c, 0, 0);
        ctx.restore();
      }
      if (this.body) {
        const k = Math.floor(t / 220);
        const rr = rngFrom(k * 9973 + 7);
        ctx.fillStyle = this.body.moon ? '#dfe6ff' : this.body.r > 8 ? '#ffd08a' : '#fff4c0';
        const n = this.body.moon ? Math.round(14 * this.body.fraction) : 14;
        for (let i = 0; i < n; i++) {
          const y = hy + 2 + Math.floor(rr() * (H * 0.18));
          const w = 1 + Math.floor(rr() * 4);
          ctx.fillRect(this.body.x - 3 + Math.floor(rr() * 7) - (w >> 1), y, w, 1);
        }
      }
      if (this.kokko) {
        const rr = rngFrom(Math.floor(t / 120) * 131 + 5);
        for (let i = 0; i < 8; i++) rect(ctx, this.kokko.x - 1 + Math.floor(rr() * 3) - 1, hy + 2 + Math.floor(rr() * 12), 1 + Math.floor(rr() * 3), 1, rr() < 0.5 ? '#ffb040' : '#ff7a2a');
      }
      if (sc.water === 'sea') {
        ctx.fillStyle = sc.phase === 'night' ? 'rgba(190,200,235,0.45)' : 'rgba(255,255,255,0.7)';
        this.crests.forEach((c) => {
          if (Math.floor(tt * 2.5 + c.ph) % 4 === 0) return;
          const x = (((c.x + tt * c.sp * dir) % W) + W) % W;
          ctx.fillRect(Math.round(x), c.y, c.len, 1);
        });
      } else {
        const k2 = Math.floor(t / 300);
        const r2 = rngFrom(k2 * 31 + 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < W / 18; i++) ctx.fillRect(Math.floor(r2() * W), hy + 3 + Math.floor(r2() * (H - hy)), 2 + Math.floor(r2() * 3), 1);
      }
    }
    if (this.layers.ice) ctx.drawImage(this.layers.ice.c, 0, 0);
    this.drawAnimals(ctx, t, 'water');
    if (this.fogBands[1]) drawFog(ctx, this.fogBands[1], W);
    ctx.drawImage(this.layers.land.c, 0, 0);
    // etualan puut huojuvat tuulessa
    const A = Math.min(4, (this.state.wind || 0) * 0.28);
    this.trees.forEach((tr) => {
      const a = A * tr.flex;
      const sway = Math.sin(tt * (1.4 + a * 0.15) + tr.ph) * 0.6 + 0.4 * dir;
      const offAt = (r) => Math.round(a * Math.pow(1 - r / tr.sh, 1.6) * sway);
      if (a < 0.6) ctx.drawImage(tr.img, tr.x, tr.y);
      else for (let r = 0; r < tr.sh; r++) ctx.drawImage(tr.img, 0, r, tr.img.width, 1, tr.x + offAt(r), tr.y + r, tr.img.width, 1);
      if (tr.lights) {
        const XC = ['#ff4a4a', '#ffd84a', '#4aa8ff', '#5aff7a', '#ff8af0'];
        tr.lights.forEach(([lx, ly], i) => {
          if ((i + Math.floor(tt * 2.5)) % 3 === 0) return;
          rect(ctx, tr.x + lx + (a < 0.6 ? 0 : offAt(ly)), tr.y + ly, 1, 1, XC[i % XC.length]);
        });
      }
    });
    // jouluvalot mökin räystäällä
    if (sc.ev.fx.xmas && this.cabin && this.cabin.eave) {
      const XC = ['#ff4a4a', '#ffd84a', '#4aa8ff', '#5aff7a'];
      const e = this.cabin.eave;
      for (let x = e.x0, i = 0; x <= e.x1; x += 2, i++) if ((i + Math.floor(tt * 2)) % 4 !== 0) rect(ctx, x, e.y, 1, 1, XC[i % XC.length]);
    }
    if (this.pole) drawFlag(ctx, this.pole, sc.ev.flag === 'FI' ? 'flag' : 'pennant', this.state.cc, sc.windX, t, this.tintC);
    this.drawAnimals(ctx, t, 'land');
    this.smoke.forEach((p) => {
      const a = Math.max(0, 0.6 - p.a / 6);
      ctx.fillStyle = `rgba(210,212,222,${a})`;
      const s = p.a > 1.5 ? 2 : 1;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
    });
    if (this.balloons) this.balloons.forEach((b) => {
      const x = Math.round(b.x), y = Math.round(b.y);
      rect(ctx, x, y, 3, 4, b.c);
      rect(ctx, x + 1, y - 1, 1, 1, b.c);
      rect(ctx, x + 2, y, 1, 1, 'rgba(255,255,255,0.6)');
      rect(ctx, x + 1, y + 4, 1, 3, 'rgba(230,230,230,0.7)');
    });
    if (this.fw) {
      this.fw.rockets.forEach((r) => { rect(ctx, Math.round(r.x), Math.round(r.y), 1, 2, '#ffe0a0'); rect(ctx, Math.round(r.x), Math.round(r.y) + 3, 1, 2, 'rgba(255,200,120,0.5)'); });
      this.fw.parts.forEach((p) => {
        const f = 1 - p.age / p.life;
        if (f < 0.35 && (Math.floor(p.age * 20) % 2)) return; // tuikkiva loppu
        ctx.globalAlpha = Math.min(1, f * 1.6);
        rect(ctx, Math.round(p.x), Math.round(p.y), p.age < 0.3 ? 2 : 1, p.age < 0.3 ? 2 : 1, p.c);
      });
      ctx.globalAlpha = 1;
    }
    if (this.drops.length) {
      ctx.fillStyle = sc.phase === 'night' ? 'rgba(140,160,200,0.7)' : 'rgba(200,220,245,0.75)';
      const slope = (0.12 + Math.min(0.5, Math.abs(sc.windX) * 0.05)) * dir;
      this.drops.forEach((d) => {
        for (let j = 0; j < d.len; j++) ctx.fillRect(Math.round(d.x - j * slope), Math.round(d.y - j), 1, 1);
      });
      this.splashes.forEach((s) => { ctx.fillRect(s.x - 1, s.y, 1, 1); ctx.fillRect(s.x + 1, s.y, 1, 1); });
    }
    if (this.flakes.length) {
      ctx.fillStyle = sc.phase === 'night' ? '#c8d0e8' : '#ffffff';
      this.flakes.forEach((f) => ctx.fillRect(Math.round(f.x), Math.round(f.y), f.s, f.s));
    }
    this.drawFlocks(ctx, t, 'near');
    if (this.fogBands[2]) drawFog(ctx, this.fogBands[2], W);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(230,236,255,${this.flash * 0.55})`;
      ctx.fillRect(0, 0, W, H);
    }
  };

  // ---------- maasto ----------
  function ridgeOf(style, rand, W, base, amp) {
    if (style === 'alpine') {
      const peaks = [];
      const n = Math.max(3, Math.round(W / 38));
      for (let i = 0; i < n; i++) peaks.push([rand() * W, 0.5 + rand() * 0.5, 0.7 + rand() * 0.9]);
      const out = [];
      for (let x = 0; x < W; x++) {
        let v = 0.18;
        peaks.forEach(([c, h, sl]) => (v = Math.max(v, h - (Math.abs(x - c) * sl) / Math.max(1, amp))));
        out.push(Math.round(base - amp * v + (rand() < 0.3 ? 1 : 0)));
      }
      return out;
    }
    if (style === 'mesa') {
      const out = [];
      let target = 0, len = 0, cur = base - amp * 0.3;
      for (let x = 0; x < W; x++) {
        if (len-- <= 0) {
          len = 14 + Math.floor(rand() * 40);
          target = base - amp * (rand() < 0.5 ? 0.6 + rand() * 0.4 : 0.15 + rand() * 0.2);
        }
        cur += clamp(target - cur, -3, 3);
        out.push(Math.round(cur));
      }
      return out;
    }
    if (style === 'dune') {
      const f = 0.025 + rand() * 0.01, ph = rand() * 6, f2 = 0.06, ph2 = rand() * 6;
      const out = [];
      for (let x = 0; x < W; x++) {
        const v = 0.7 * (1 - Math.abs(Math.sin(x * f + ph))) ** 2 + 0.3 * (1 - Math.abs(Math.sin(x * f2 + ph2))) ** 2;
        out.push(Math.round(base - amp * (0.15 + 0.85 * v)));
      }
      return out;
    }
    if (style === 'peaks') {
      const peaks = [];
      const n = Math.max(4, Math.round(W / 26));
      for (let i = 0; i < n; i++) peaks.push([rand() * W, 6 + rand() * 14, 0.45 + rand() * 0.55]);
      const out = [];
      for (let x = 0; x < W; x++) {
        let v = 0.12;
        peaks.forEach(([c, w, h]) => (v = Math.max(v, h * Math.exp(-(((x - c) / w) ** 2)))));
        out.push(Math.round(base - amp * v));
      }
      return out;
    }
    const waves = style === 'hills' ? [[0.008, 1], [0.021, 0.5], [0.05, 0.12]] : [[0.011, 1], [0.027, 0.45], [0.06, 0.12]];
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

  function fieldColors(base, foliage) {
    const k = foliage === 'autumn' ? ['#a08040', '#8a6a3a', '#b09050'] : foliage === 'late' ? ['#7a6a4a', '#6a5a3a', '#8a7a5a'] : ['#8aa040', '#a0a050', '#6a9040'];
    return [base, mix(base, k[0], 0.22), mix(base, k[1], 0.18), mix(base, k[2], 0.2)];
  }

  function drawFell(ctx, prof, hy, col, cap, haze, capDepth, style, fields, capY) {
    const minTop = Math.min.apply(null, prof);
    const span = hy - minTop || 1;
    let seg = 0, segC = col;
    for (let x = 0; x < prof.length; x++) {
      if (fields && seg-- <= 0) { seg = 8 + Math.floor(fields.rand() * 18); segC = pick(fields.rand, fields.colors); }
      const top = prof[x];
      const slope = (prof[x + 1] || top) - (prof[x - 1] || top);
      for (let y = top; y <= hy; y++) {
        const fromTop = y - top;
        const high = (hy - top) / span;
        let c = fields && fromTop > 1 ? segC : col;
        if (style === 'mesa' && (y % 5 === 0)) c = dark(col, 0.12);
        if (style === 'dune' && slope > 0) c = mix(col, '#ffffff', 0.12);
        if (style === 'alpine') c = slope > 0 ? mix(col, '#ffffff', 0.14) : slope < -1 ? dark(col, 0.1) : col;
        if (capY != null) {
          if (y < capY - 1 || (y < capY + 3 && thr(x, y) < (capY + 3 - y) / 5)) c = slope > 0 ? cap : mix(cap, col, 0.25);
        } else if (fromTop < capDepth * high && high > 0.45) c = fromTop === capDepth * high - 1 && thr(x, y) < 0.5 ? col : cap;
        const hz = (y - (hy - 6)) / 6;
        if (hz > 0 && thr(x, y) < hz * 0.7) c = haze;
        rect(ctx, x, y, 1, 1, c);
      }
      if (x > 0 && prof[x - 1] > top) rect(ctx, x, top, 1, 1, cap);
    }
  }

  // ---------- kasvit ----------
  function farKind(far, rand, style) {
    switch (far) {
      case 'tundra': return rand() < 0.08 ? 'spruce' : 'shrub';
      case 'taiga': return rand() < 0.15 ? 'birch' : 'spruce';
      case 'boreal': return rand() < 0.22 ? 'birch' : 'spruce';
      case 'temperate': return rand() < 0.25 ? 'spruce' : 'broadleaf';
      case 'subtropical': return rand() < 0.15 ? 'palm' : 'evergreen';
      case 'med': return rand() < 0.4 ? 'cypress' : 'olive';
      case 'steppe': return (style === 'africa' || style === 'oceania') && rand() < 0.5 ? 'acacia' : 'bush';
      case 'savanna': return rand() < 0.7 ? 'acacia' : 'bush';
      case 'jungle': return rand() < 0.15 ? 'palm' : 'jungle';
      default: return 'spruce';
    }
  }

  /** Piirtää kasvin. haze 0..1 = sumennus taivaan väriin (kaukaiset), big = etualan iso yksilö (h annettu). */
  function plant(ctx, kind, x, base, env, haze, big, hFix) {
    const { sc, rand, H, horizon } = env;
    if (sc.style === 'antarctica') return; // ei puita
    const hz = (pal) => (haze ? mixPal(pal, horizon, haze) : pal);
    const snow = sc.snowGround;
    const fol = sc.foliage;
    const R = (a, b) => Math.round(H * (a + rand() * (b - a)));
    switch (kind) {
      case 'spruce': {
        const p = haze ? { body: mix(PINE.body, horizon, haze), hi: mix(PINE.hi, horizon, haze), dark: mix(PINE.dark, horizon, haze), snow: mix(PINE.snow, horizon, haze * 0.6) } : big ? { body: '#1b4029', hi: '#2e6340', dark: '#0f2a1a', snow: '#f2f7ff' } : PINE;
        spruce(ctx, x, base, hFix || R(haze ? 0.03 : 0.032, haze ? 0.055 : 0.067), p, snow, big ? 0.36 : haze ? 0.4 : 0.33);
        break;
      }
      case 'birch':
        if (fol === 'late' || fol === 'snow') return plant(ctx, 'spruce', x, base, env, haze);
        birch(ctx, x, base, R(0.025, 0.045), fol, rand);
        break;
      case 'broadleaf': {
        const bare = fol === 'late' || fol === 'snow';
        const pal = fol === 'autumn' ? pick(rand, LEAF.autumn) : fol === 'spring' ? LEAF.spring[0] : LEAF.summer[0];
        broadleaf(ctx, x, base, hFix || R(0.03, 0.06), hz(pal), rand, bare, snow);
        break;
      }
      case 'evergreen':
        broadleaf(ctx, x, base, hFix || R(0.03, 0.06), hz(LEAF.evergreen[0]), rand, false, false);
        break;
      case 'jungle':
        broadleaf(ctx, x, base, hFix || R(0.05, 0.085), hz(pick(rand, LEAF.jungle)), rand, false, false);
        break;
      case 'olive':
        broadleaf(ctx, x, base, hFix || R(0.02, 0.035), hz(LEAF.olive[0]), rand, false, false);
        break;
      case 'cypress':
        cypress(ctx, x, base, hFix || R(0.045, 0.075), hz(LEAF.cypress[0]));
        break;
      case 'palm':
        palm(ctx, x, base, hFix || R(0.05, 0.08), hz(LEAF.palm[0]), rand);
        break;
      case 'acacia':
        acacia(ctx, x, base, hFix || R(0.03, 0.05), hz(LEAF.acacia[0]));
        break;
      case 'cactus':
        cactus(ctx, x, base, hFix || R(0.02, 0.04), hz(LEAF.cactus[0]));
        break;
      case 'shrub':
      case 'bush': {
        const pal = kind === 'shrub' && fol === 'autumn' ? LEAF.shrubRuska[0] : fol === 'late' ? LEAF.shrubBare[0] : kind === 'bush' ? LEAF.olive[0] : LEAF.shrub[0];
        const r = big ? Math.max(2, Math.round((hFix || 4) * 0.5)) : 1 + Math.floor(rand() * 2);
        shrub(ctx, x, base, r, snow ? ['#eef3fb', '#c8d4e8', '#ffffff'] : hz(pal));
        break;
      }
    }
  }

  function spruce(ctx, x, base, h, pal, snow, k) {
    h = Math.max(4, h);
    const top = base - h;
    for (let r = 0; r < h; r++) {
      const half = Math.floor(r * k) + (r % 3 === 2 ? 1 : 0) - (r % 3 === 0 && r > 2 ? 1 : 0);
      const y = top + r;
      rect(ctx, x - half, y, half * 2 + 1, 1, pal.body);
      rect(ctx, x - half, y, Math.max(1, half >> 1), 1, pal.dark);
      if (r % 3 === 2 && half > 0) rect(ctx, x + half - 1, y, 2, 1, pal.hi);
      if (snow && r % 3 === 0 && r > 0) {
        rect(ctx, x - half, y, Math.max(1, Math.ceil(half * 0.7)), 1, pal.snow);
        if (half > 1) rect(ctx, x + half, y + 1, 1, 1, pal.snow);
      }
    }
    if (snow) rect(ctx, x, top, 1, 1, pal.snow);
  }

  function birch(ctx, x, base, h, season, rand) {
    rect(ctx, x, base - h, 1, h, '#e8e4da');
    rect(ctx, x, base - Math.round(h * 0.4), 1, 1, '#2a2a2a');
    const [a, b] = BIRCH[season] || BIRCH.summer;
    const cr = Math.max(2, Math.round(h * 0.38));
    const cy = base - h + cr - 1;
    for (let yy = -cr; yy <= cr; yy++)
      for (let xx = -cr; xx <= cr; xx++) {
        if (xx * xx + yy * yy * 1.3 > cr * cr + 0.5) continue;
        if (rand() < 0.12) continue;
        rect(ctx, x + xx, cy + yy, 1, 1, xx - yy > cr * 0.5 ? b : a);
      }
  }

  // Lehtipuu: pyöreä latvus kolmesta pallosta, valo oikealta ylhäältä. Paljas = oksat.
  function broadleaf(ctx, x, base, h, pal, rand, bare, snow) {
    h = Math.max(5, h);
    const trunkH = Math.max(2, Math.round(h * 0.35));
    const tw = h >= 18 ? 2 : 1;
    rect(ctx, x - (tw >> 1), base - trunkH, tw, trunkH, '#5a4232');
    const r = Math.max(2, h * 0.34);
    const cy = Math.round(base - trunkH - r * 0.7);
    if (bare) {
      const bark = '#5e4a3a';
      rect(ctx, x, base - trunkH - Math.round(r * 1.5), 1, Math.round(r * 1.5), bark);
      const n = 2 + Math.floor(h / 7);
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1;
        const sy = base - trunkH - Math.floor((i * r * 1.3) / n);
        const len = Math.max(2, Math.round(r * (0.6 + rand() * 0.6)));
        for (let j = 1; j <= len; j++) rect(ctx, x + dir * j, sy - Math.floor(j * 0.8), 1, 1, bark);
        if (snow) rect(ctx, x + dir * len, sy - Math.floor(len * 0.8) - 1, 1, 1, '#f2f6fd');
      }
      return;
    }
    const blobs = [[0, -r * 0.35, r], [-r * 0.62, r * 0.18, r * 0.75], [r * 0.62, r * 0.18, r * 0.75]];
    const RR = Math.ceil(r * 1.5);
    for (let yy = -RR; yy <= RR; yy++)
      for (let xx = -RR; xx <= RR; xx++) {
        let inside = false;
        for (const [bx, by, br] of blobs) if ((xx - bx) ** 2 + (yy - by) ** 2 <= br * br) { inside = true; break; }
        if (!inside) continue;
        const s = (xx - yy * 0.8) / r;
        let c = pal[0];
        if (s > 0.55) c = pal[2];
        else if (yy > r * 0.45 || s < -0.7) c = pal[1];
        else if (yy > r * 0.1 && thr(x + xx, cy + yy) < 0.35) c = pal[1];
        rect(ctx, x + xx, cy + yy, 1, 1, c);
      }
    if (snow) for (let xx = -Math.round(r * 0.6); xx <= Math.round(r * 0.6); xx++) rect(ctx, x + xx, cy - Math.round(r * 1.35) + Math.abs(xx) % 2, 1, 1, '#f2f6fd');
  }

  function cypress(ctx, x, base, h, pal) {
    h = Math.max(6, h);
    rect(ctx, x, base - 2, 1, 2, '#5a4232');
    const maxHalf = Math.max(1, Math.round(h * 0.12));
    const ch = h - 1;
    for (let r = 0; r < ch; r++) {
      const t = r / ch;
      const half = Math.round(maxHalf * Math.sin(Math.PI * Math.pow(t, 0.7) * 0.92));
      const y = base - 1 - ch + r;
      rect(ctx, x - half, y, half * 2 + 1, 1, pal[0]);
      rect(ctx, x - half, y, Math.max(1, half), 1, pal[1]);
      if (half > 0 && r % 2) rect(ctx, x + half, y, 1, 1, pal[2]);
    }
  }

  function palm(ctx, x, base, h, pal, rand) {
    h = Math.max(8, h);
    const dir = rand() < 0.5 ? -1 : 1;
    const lean = h * 0.2 * dir;
    let tx = x, ty = base;
    const tw = h > 22 ? 2 : 1;
    for (let i = 0; i < h; i++) {
      const t = i / h;
      tx = Math.round(x + lean * t * t);
      ty = base - i;
      rect(ctx, tx, ty, tw, 1, i % 3 === 0 ? '#6a4e36' : '#8a6a4a');
    }
    const L = Math.max(4, Math.round(h * 0.42));
    [-2.95, -2.45, -1.95, -1.2, -0.7, -0.2].forEach((a, k) => {
      for (let j = 1; j <= L; j++) {
        const px = tx + Math.round(Math.cos(a) * j);
        const py = ty + Math.round(Math.sin(a) * j * 0.55 + (j * j) / (L * 1.3));
        rect(ctx, px, py, 1, 1, k % 2 ? pal[0] : pal[2]);
        if (j > 1 && j % 2 === 0) rect(ctx, px, py + 1, 1, 1, pal[1]);
      }
    });
    rect(ctx, tx, ty + 1, 2, 1, '#5a3a22');
  }

  function acacia(ctx, x, base, h, pal) {
    h = Math.max(6, h);
    const th = Math.round(h * 0.6);
    const bark = '#4a3a2a';
    rect(ctx, x, base - th, h > 20 ? 2 : 1, th, bark);
    const bl = Math.max(1, Math.round(h * 0.22));
    for (let j = 1; j <= bl; j++) { rect(ctx, x - j, base - th - j, 1, 1, bark); rect(ctx, x + j, base - th - j, 1, 1, bark); }
    const cw = Math.max(3, Math.round(h * 0.7)), ch = Math.max(2, Math.round(h * 0.17));
    const cy = base - th - bl - ch + 1;
    for (let r = 0; r < ch; r++) {
      const half = r === 0 ? Math.round(cw * 0.7) : cw;
      rect(ctx, x - half, cy + r, half * 2 + 1, 1, r === ch - 1 ? pal[1] : r === 0 ? pal[2] : pal[0]);
    }
  }

  function cactus(ctx, x, base, h, pal) {
    h = Math.max(5, h);
    const w = h >= 14 ? 3 : h >= 8 ? 2 : 1;
    const col = (cx, y0, y1) => {
      for (let y = y0; y <= y1; y++) for (let i = 0; i < w; i++) rect(ctx, cx + i, y, 1, 1, i === 0 ? pal[1] : i === w - 1 && w > 1 ? pal[2] : pal[0]);
    };
    col(x, base - h + 1, base);
    if (h >= 8) {
      const ay = base - Math.round(h * 0.45), lx = x - w - 1;
      rect(ctx, lx, ay, w + 1, w, pal[0]);
      col(lx, ay - Math.round(h * 0.28), ay + w - 1);
      const ay2 = base - Math.round(h * 0.62), rx = x + w + 1;
      rect(ctx, x + w, ay2, w + 1, w, pal[0]);
      col(rx, ay2 - Math.round(h * 0.2), ay2 + w - 1);
    }
  }

  function shrub(ctx, x, base, r, pal) {
    for (let yy = -r; yy <= 0; yy++)
      for (let xx = -r - 1; xx <= r + 1; xx++) {
        if ((xx * xx) / ((r + 1) * (r + 1)) + (yy * yy) / (r * r || 1) > 1) continue;
        rect(ctx, x + xx, base + yy, 1, 1, yy === -r ? pal[2] : xx < 0 ? pal[1] : pal[0]);
      }
  }

  function rock(ctx, x, y, r, snow, warm) {
    const base = warm ? '#9a7a5a' : '#7a7f8c', hi = warm ? '#c4a07a' : '#a4a9b4', lo = warm ? '#6e523c' : '#555a66';
    for (let yy = -r; yy <= 0; yy++)
      for (let xx = -r - 1; xx <= r + 1; xx++) {
        if ((xx * xx) / ((r + 1) * (r + 1)) + (yy * yy) / (r * r) > 1) continue;
        rect(ctx, x + xx, y + yy, 1, 1, yy === -r || (snow && yy <= -r + 1) ? (snow ? '#f4f8ff' : hi) : xx > r * 0.3 ? lo : base);
      }
  }

  // ---------- rakennukset ----------
  /** Talo kaukaisella rannalla tai etualalla (big). Palauttaa { chimney }. */
  function house(ctx, x, b, w, h, st, rand, snow, lights, big) {
    if (st.roof === 'hut') return hut(ctx, x, b, w, snow);
    const wall = pick(rand, st.walls);
    const roofC = st.roofs ? pick(rand, st.roofs) : dark(wall, 0.3);
    const top = b - h;
    rect(ctx, x, top, w, h, wall);
    rect(ctx, x, top, 1, h, dark(wall, 0.18));
    if (st === STYLE.nordic && big) for (let i = 2; i < w - 1; i += 3) rect(ctx, x + i, top, 1, h, dark(wall, 0.12));
    let chimney = null;
    if (st.roof === 'gable' || st.roof === 'curved') {
      const rh = Math.max(2, Math.ceil((w + 2) / 3.2));
      for (let i = 0; i < rh; i++) {
        const len = w + 2 - i * 2;
        if (len <= 0) break;
        rect(ctx, x - 1 + i, top - 1 - i, len, 1, snow ? (i === 0 ? '#d8e2f0' : '#f4f8ff') : i === rh - 1 ? light(roofC, 0.15) : roofC);
        if (st.corrugated && !snow) for (let k = (i % 2); k < len; k += 2) rect(ctx, x - 1 + i + k, top - 1 - i, 1, 1, dark(roofC, 0.15));
      }
      if (st.roof === 'curved') {
        const c = snow ? '#f4f8ff' : roofC;
        rect(ctx, x - 2, top - 1, 1, 1, c); rect(ctx, x + w + 1, top - 1, 1, 1, c);
        rect(ctx, x - 3, top - 2, 1, 1, c); rect(ctx, x + w + 2, top - 2, 1, 1, c);
      }
      if (big && st.chimney) { chimney = [x + Math.round(w * 0.7), top - rh - 2]; rect(ctx, chimney[0], chimney[1], 2, rh + 1, '#6a5c5c'); chimney = [chimney[0] + 1, chimney[1] - 1]; }
    } else {
      rect(ctx, x, top - 1, w, 1, snow ? '#f4f8ff' : dark(wall, 0.25));
      if (w >= 7 && rand() < 0.35) rect(ctx, x + 1 + Math.floor(rand() * (w - 4)), top - 3, 2, 2, dark(wall, 0.35));
    }
    const win = '#2a2a44';
    if (big) {
      for (let wx = x + 2; wx <= x + w - 8; wx += 4) { rect(ctx, wx, b - h + 2, 2, 2, win); lights.push([wx, b - h + 2, 2, 2, '#ffd36b']); }
      rect(ctx, x + w - 5, b - 5, 2, 5, dark(wall, 0.5));
    } else {
      for (let wy = top + 1; wy <= b - 3; wy += 3)
        for (let wx = x + 2; wx <= x + w - 3; wx += 3) {
          rect(ctx, wx, wy, 1, 1, win);
          if (rand() < 0.6) lights.push([wx, wy, 1, 1, '#ffd36b']);
        }
      if (w >= 5) rect(ctx, x + Math.floor(w / 2), b - 2, 1, 2, dark(wall, 0.5));
    }
    return { chimney, eave: big ? { x0: x - 1, x1: x + w, y: top } : null };
  }

  function hut(ctx, x, b, w, snow) {
    const wh = Math.max(2, Math.round(w * 0.45));
    rect(ctx, x, b - wh, w, wh, '#b0703a');
    rect(ctx, x, b - wh, 1, wh, '#8a5428');
    rect(ctx, x + Math.floor(w / 2), b - Math.min(wh, 3), 1, Math.min(wh, 3), '#3a2416');
    const rh = Math.max(2, Math.round(w * 0.55));
    for (let i = 0; i < rh; i++) {
      const half = Math.round(((i + 1) / rh) * (w / 2 + 1));
      rect(ctx, x + Math.floor(w / 2) - half, b - wh - rh + i, half * 2 + (w % 2), 1, snow ? '#f4f8ff' : i % 2 ? '#c8a050' : '#b08a40');
    }
    return { chimney: null };
  }

  // Kerrostalo / toimistotalo ikkunaruudukolla
  function block(ctx, x, b, w, h, color, rand, lights, snow, glass, neon) {
    rect(ctx, x, b - h, w, h, color);
    rect(ctx, x, b - h, 1, h, dark(color, 0.2));
    rect(ctx, x, b - h, w, 1, snow ? '#f4f8ff' : light(color, 0.15));
    if (glass) for (let i = 2; i < w; i += 3) rect(ctx, x + i, b - h + 1, 1, h - 1, light(color, 0.12));
    const win = dark(color, 0.4);
    for (let wy = b - h + 2; wy <= b - 2; wy += 2)
      for (let wx = x + 1; wx <= x + w - 2; wx += 2) {
        rect(ctx, wx, wy, 1, 1, win);
        if (rand() < 0.38) lights.push([wx, wy, 1, 1, rand() < 0.8 ? '#ffe08a' : '#cfe6ff']);
      }
    if (neon && rand() < 0.35) lights.push([x + w - 1, b - h + 2 + Math.floor(rand() * (h / 2)), 1, 4, rand() < 0.5 ? '#ff5a9a' : '#5af0ff']);
  }

  function skyline(ctx, W, H, hy, st, rand, lights, blinkers, snow, horizon, mask) {
    const ok = (x0, w) => !mask || Math.min(mask(x0), mask(x0 + w)) > H * 0.3;
    const cx = W * (0.3 + rand() * 0.4);
    const b = hy - 1;
    const items = [];
    let x = Math.round(W * 0.03);
    while (x < W * 0.97) {
      const w = 5 + Math.floor(rand() * 9);
      const d = Math.abs(x + w / 2 - cx) / (W * 0.45);
      const peak = Math.max(0, 1 - d * d);
      const h = Math.round(H * (0.04 + 0.05 * rand() + 0.22 * peak * Math.pow(rand(), 0.7)));
      items.push([x, w, h]);
      x += w + (rand() < 0.3 ? 1 : 0);
    }
    items.forEach(([bx, w, h]) => {
      if (!ok(bx, w)) return;
      const glass = st.glass && rand() < 0.5;
      const base = glass ? pick(rand, ['#5a7a9a', '#6a8ab0', '#4a6a8a']) : pick(rand, st.city);
      block(ctx, bx, b, w, h, mix(base, horizon, 0.22), rand, lights, snow, glass, st.neon);
      if (h > H * 0.15) {
        rect(ctx, bx + (w >> 1), b - h - 3, 1, 3, '#8a8a92');
        blinkers.push([bx + (w >> 1), b - h - 4]);
      }
    });
    const tx = Math.round(W * (0.1 + rand() * 0.8)), kx = Math.round(W * (0.15 + rand() * 0.7));
    if (st.tower && ok(tx - 3, 7)) tvTower(ctx, tx, b, H, blinkers, lights);
    if (rand() < 0.65 && ok(kx - 7, 24)) crane(ctx, kx, b, H, blinkers);
  }

  /** Talorivi rannalla: kylä (hajallaan), taajama (yhtenäinen rykelmä) tai kaupungin rantakortteli. */
  function settlementRow(ctx, sc, st, W, H, hy, rand, lights, blinkers, occ) {
    const b = hy - 1;
    const kind = sc.settlement;
    const snow = sc.snowGround;
    const mark = (x0, w) => { for (let x = Math.max(0, x0 - 1); x < Math.min(W, x0 + w + 1); x++) occ[x] = 1; };
    const fits = (x0, w, m) => {
      m = m == null ? 2 : m;
      for (let x = Math.max(0, x0 - m); x < Math.min(W, x0 + w + m); x++) if (occ[x]) return false;
      return x0 > 2 && x0 + w < W - 2;
    };
    const landmark = (x0) => {
      const L = kind === 'village' && st.village === 'barn' ? 'barn' : st.landmark;
      if (!L) return;
      const w = { church: 15, pagoda: 15, dome: 16, watertower: 7, barn: 14, mast: 3 }[L];
      if (!fits(x0, w)) return;
      if (L === 'church') church(ctx, x0, b, st, snow, lights);
      else if (L === 'pagoda') pagoda(ctx, x0 + 3, b, snow, lights);
      else if (L === 'dome') dome(ctx, x0 + 1, b, snow, lights);
      else if (L === 'watertower') watertower(ctx, x0, b, snow);
      else if (L === 'barn') barn(ctx, x0, b, snow);
      else if (L === 'mast') mast(ctx, x0, b, H, blinkers);
      mark(x0, w);
    };
    if (st.station) {
      // tutkimusasema: muutama kontti ja masto
      for (let i = 0; i < (kind === 'village' ? 3 : 6); i++) {
        const w = 6 + Math.floor(rand() * 6), x0 = Math.round(W * (0.25 + rand() * 0.5));
        if (!fits(x0, w)) continue;
        block(ctx, x0, b, w, 3 + Math.floor(rand() * 3), pick(rand, st.walls), rand, lights, snow, false, false);
        mark(x0, w);
      }
      landmark(Math.round(W * 0.5));
      return;
    }
    if (kind === 'village') {
      landmark(Math.round(W * (0.35 + rand() * 0.3)));
      const n = 4 + Math.floor(rand() * 4);
      let placed = 0;
      for (let tries = 0; tries < n * 4 && placed < n; tries++) {
        const w = 5 + Math.floor(rand() * 4), x0 = Math.round(W * (0.06 + rand() * 0.88));
        if (!fits(x0, w)) continue;
        if (st.village === 'hut') hut(ctx, x0, b, w, snow);
        else house(ctx, x0, b, w, 3 + Math.floor(rand() * 3), st, rand, snow, lights, false);
        mark(x0, w);
        placed++;
      }
      return;
    }
    // taajama tai kaupunki: yhtenäinen rakennusrivi
    const cover = kind === 'city' ? 0.85 : 0.5;
    const x0 = Math.round(W * (kind === 'city' ? 0.06 : 0.1 + rand() * (0.85 - cover)));
    const x1 = Math.round(x0 + W * cover);
    const lmX = Math.round(x0 + (x1 - x0) * (0.3 + rand() * 0.4));
    landmark(lmX);
    let x = x0;
    while (x < x1) {
      if (occ[x]) { x++; continue; }
      const tall = rand() < (kind === 'city' ? 0.45 : 0.2);
      const w = tall ? 7 + Math.floor(rand() * 5) : 5 + Math.floor(rand() * 5);
      if (!fits(x, w, 0)) { x += 2; continue; }
      if (tall) block(ctx, x, b, w, kind === 'city' ? 7 + Math.floor(rand() * 10) : 6 + Math.floor(rand() * 6), pick(rand, st.city), rand, lights, snow, false, st.neon);
      else house(ctx, x, b, w, 3 + Math.floor(rand() * 4), st, rand, snow, lights, false);
      mark(x, w);
      x += w + (rand() < 0.4 ? 1 : 0);
    }
    // katuvalot rantaviivaan
    for (let lx = x0; lx < x1; lx += 6 + Math.floor(rand() * 4)) lights.push([lx, b, 1, 1, '#ffd890']);
  }

  function church(ctx, x, b, st, snow, lights) {
    const nordic = st === STYLE.nordic;
    const wall = nordic ? '#ece6d8' : st === STYLE.samerica ? '#f0e8d0' : '#d8ccb4';
    const roof = snow ? '#f4f8ff' : nordic ? '#3b2b33' : '#8a4030';
    const spire = nordic ? '#3b2b33' : '#4a8a7a';
    rect(ctx, x + 3, b - 6, 11, 6, wall);
    rect(ctx, x + 3, b - 6, 1, 6, dark(wall, 0.15));
    for (let i = 0; i < 4; i++) rect(ctx, x + 2 + i, b - 7 - i, 13 - i * 2, 1, roof);
    rect(ctx, x, b - 11, 4, 11, wall);
    rect(ctx, x, b - 11, 1, 11, dark(wall, 0.15));
    [4, 4, 2, 2, 2, 2, 1, 1].forEach((w, i) => rect(ctx, x + Math.floor((4 - w) / 2), b - 12 - i, w, 1, snow && i < 2 ? '#f4f8ff' : spire));
    [[x + 1, b - 9], [x + 6, b - 4], [x + 9, b - 4], [x + 12, b - 4]].forEach(([wx, wy]) => {
      rect(ctx, wx, wy, 1, 2, '#2a2a44');
      lights.push([wx, wy, 1, 2, '#ffcf70']);
    });
  }

  function pagoda(ctx, x, b, snow, lights) {
    const wall = '#a8322a', roof = snow ? '#f4f8ff' : '#2e3a44';
    let y = b, w = 9;
    for (let tier = 0; tier < 4; tier++) {
      const ox = x + ((9 - w) >> 1);
      rect(ctx, ox, y - 3, w, 3, wall);
      rect(ctx, ox + (w >> 1), y - 2, 1, 1, '#2a2a44');
      lights.push([ox + (w >> 1), y - 2, 1, 1, '#ffcf70']);
      rect(ctx, ox - 2, y - 4, w + 4, 1, roof);
      rect(ctx, ox - 1, y - 5, w + 2, 1, roof);
      rect(ctx, ox - 3, y - 5, 1, 1, roof);
      rect(ctx, ox + w + 2, y - 5, 1, 1, roof);
      y -= 5;
      w = Math.max(3, w - 2);
    }
    rect(ctx, x + 4, y - 3, 1, 3, '#c8a040');
  }

  function dome(ctx, x, b, snow, lights) {
    const wall = '#ece0c0', dc = snow ? '#f4f8ff' : '#3a9a9a', dh = snow ? '#ffffff' : '#6ac8c0';
    rect(ctx, x + 3, b - 7, 12, 7, wall);
    rect(ctx, x + 3, b - 7, 1, 7, dark(wall, 0.15));
    const cx = x + 9, cy = b - 8;
    for (let yy = -5; yy <= 0; yy++)
      for (let xx = -5; xx <= 5; xx++) if (xx * xx + yy * yy * 1.3 <= 24) rect(ctx, cx + xx, cy + yy, 1, 1, xx > 1 ? dh : dc);
    rect(ctx, cx, cy - 7, 1, 2, '#c8a040');
    rect(ctx, x, b - 17, 2, 17, wall);
    rect(ctx, x - 1, b - 13, 4, 1, dark(wall, 0.2));
    rect(ctx, x, b - 19, 2, 2, dc);
    rect(ctx, x, b - 20, 1, 1, '#c8a040');
    [[x + 6, b - 4], [x + 9, b - 4], [x + 12, b - 4]].forEach(([wx, wy]) => {
      rect(ctx, wx, wy, 1, 2, '#2a2a44');
      lights.push([wx, wy, 1, 2, '#ffcf70']);
    });
  }

  function watertower(ctx, x, b, snow) {
    const leg = '#6a6a72', tank = '#c8d4e0';
    rect(ctx, x + 1, b - 10, 1, 10, leg);
    rect(ctx, x + 5, b - 10, 1, 10, leg);
    for (let i = 2; i < 10; i += 4) rect(ctx, x + 1, b - i, 5, 1, leg);
    rect(ctx, x, b - 15, 7, 5, tank);
    rect(ctx, x, b - 15, 1, 5, dark(tank, 0.2));
    rect(ctx, x + 1, b - 16, 5, 1, snow ? '#ffffff' : '#9aa4b0');
    rect(ctx, x + 2, b - 17, 3, 1, snow ? '#ffffff' : '#9aa4b0');
  }

  function barn(ctx, x, b, snow) {
    const red = '#a8322a', trim = '#efe6d6';
    rect(ctx, x, b - 6, 9, 6, red);
    rect(ctx, x, b - 6, 1, 6, dark(red, 0.2));
    rect(ctx, x + 3, b - 4, 3, 4, trim);
    rect(ctx, x + 4, b - 3, 1, 3, dark(red, 0.3));
    const roof = snow ? '#f4f8ff' : '#3a3a42';
    rect(ctx, x - 1, b - 7, 11, 1, roof);
    rect(ctx, x, b - 8, 9, 1, roof);
    rect(ctx, x + 2, b - 9, 5, 1, roof);
    // siilo
    rect(ctx, x + 10, b - 11, 3, 11, '#a8acb4');
    rect(ctx, x + 10, b - 11, 1, 11, '#7a7e86');
    rect(ctx, x + 10, b - 12, 3, 1, snow ? '#ffffff' : '#c8ccd4');
  }

  function mast(ctx, x, b, H, blinkers) {
    const h = Math.round(H * 0.12);
    for (let y = b - h; y < b; y++) rect(ctx, x + (y % 2), y, 1, 1, '#c8ccd6');
    rect(ctx, x, b - h, 2, h, 'rgba(200,204,214,0.6)');
    blinkers.push([x, b - h - 1]);
  }

  function tvTower(ctx, x, b, H, blinkers, lights) {
    const h = Math.round(H * 0.33);
    rect(ctx, x, b - h, 2, h, '#b8bcc8');
    rect(ctx, x, b - h, 1, h, '#8a8e9a');
    const py = b - Math.round(h * 0.72);
    rect(ctx, x - 2, py, 6, 3, '#d8dce6');
    rect(ctx, x - 2, py + 2, 6, 1, '#8a8e9a');
    lights.push([x - 2, py + 1, 6, 1, '#ffe08a']);
    rect(ctx, x, b - h - 6, 1, 6, '#c8ccd6');
    blinkers.push([x, b - h - 7]);
  }

  function crane(ctx, x, b, H, blinkers) {
    const h = Math.round(H * 0.22);
    for (let y = b - h; y < b; y++) rect(ctx, x, y, 2, 1, y % 3 === 0 ? '#a88018' : '#e8b828');
    rect(ctx, x - 6, b - h, 22, 1, '#e8b828');
    for (let i = -6; i < 16; i += 2) rect(ctx, x + i, b - h + 1, 1, 1, '#a88018');
    rect(ctx, x - 6, b - h + 1, 3, 2, '#5a5a62');
    rect(ctx, x + 12, b - h + 1, 1, Math.round(h * 0.4), '#3a3a42');
    blinkers.push([x + 15, b - h - 1]);
  }

  // Etualan rakennus: pohjoismainen mökki, maja, tutkimusasema tai alueen tyylinen talo
  function fgBuilding(ctx, x, b, sc, st, rand, lights) {
    const snow = sc.snowGround;
    if (sc.style === 'nordic') return cabin(ctx, x, b, snow, lights, sc.ev.fx.candles);
    if (st.village === 'hut') { hut(ctx, x + 2, b, 16, snow); return { chimney: null }; }
    if (st.station) {
      for (let i = 0; i < 4; i++) rect(ctx, x + i * 6, b - 3, 1, 3, '#4a4a52');
      rect(ctx, x, b - 10, 22, 7, '#e8642a');
      rect(ctx, x, b - 10, 1, 7, '#b8481e');
      rect(ctx, x, b - 11, 22, 1, '#f4f8ff');
      for (let wx = x + 3; wx < x + 20; wx += 5) { rect(ctx, wx, b - 8, 2, 2, '#2a2a44'); lights.push([wx, b - 8, 2, 2, '#ffe08a']); }
      return { chimney: null };
    }
    return house(ctx, x, b, 20, 9, st, rand, snow, lights, true);
  }

  function cabin(ctx, x, b, snow, lights, candles) {
    const wall = '#a8322a', wallD = '#86271f', trim = '#efe6d6';
    rect(ctx, x, b - 9, 20, 9, wall);
    for (let i = 2; i < 20; i += 3) rect(ctx, x + i, b - 9, 1, 9, wallD);
    rect(ctx, x, b - 9, 1, 9, trim);
    rect(ctx, x + 19, b - 9, 1, 9, trim);
    for (let i = 0; i < 6; i++) {
      rect(ctx, x - 2 + i, b - 10 - i, 24 - i * 2, 1,
        i === 5 ? (snow ? '#ffffff' : '#5a4650') : snow ? (i > 2 ? '#f2f6fd' : '#dbe4f2') : i % 2 ? '#3b2b33' : '#463540');
    }
    rect(ctx, x + 15, b - 17, 3, 6, '#6a5c5c');
    rect(ctx, x + 15, b - 17, 3, 1, snow ? '#ffffff' : '#867676');
    rect(ctx, x + 3, b - 8, 6, 5, trim);
    rect(ctx, x + 4, b - 7, 4, 3, '#2a2440');
    if (candles) {
      // itsenäisyyspäivän kaksi kynttilää ikkunalla
      lights.push([x + 4, b - 7, 4, 3, '#2a2240', 'glow']);
      [x + 4, x + 7].forEach((cx) => { lights.push([cx, b - 5, 1, 2, '#f4f0e0']); lights.push([cx, b - 6, 1, 1, '#ffd040']); });
    } else lights.push([x + 4, b - 7, 4, 3, '#ffd36b', 'glow']);
    rect(ctx, x + 12, b - 7, 5, 7, trim);
    rect(ctx, x + 13, b - 6, 3, 6, '#5a2c22');
    rect(ctx, x + 15, b - 3, 1, 1, '#d8b040');
    return { chimney: [x + 16, b - 18], eave: { x0: x - 2, x1: x + 21, y: b - 9 } };
  }

  function lamp(ctx, x, b, lights, snow) {
    rect(ctx, x, b - 14, 1, 14, '#2e2e38');
    rect(ctx, x, b - 14, 3, 1, '#2e2e38');
    rect(ctx, x + 2, b - 13, 2, 1, '#4a4a56');
    if (snow) rect(ctx, x, b - 15, 3, 1, '#f4f8ff');
    lights.push([x + 2, b - 12, 2, 1, '#ffe39a', 'glow']);
    rect(ctx, x + 5, b - 5, 7, 1, '#6a4a32');
    rect(ctx, x + 5, b - 3, 7, 1, '#6a4a32');
    rect(ctx, x + 6, b - 2, 1, 2, '#2e2e38');
    rect(ctx, x + 10, b - 2, 1, 2, '#2e2e38');
    if (snow) rect(ctx, x + 5, b - 6, 7, 1, '#f4f8ff');
  }

  /** Valot (ikkunat, katulamput). share < 1 → vain osa ikkunoista palaa (hämärä). */
  function drawLights(ctx, lights, share, rand) {
    lights.forEach(([x, y, w, h, c, glow]) => {
      if (!glow && share < 1 && rand() > share) return;
      if (glow) {
        for (let yy = -7; yy <= 8; yy++)
          for (let xx = -7; xx <= 7; xx++) {
            const d = Math.sqrt(xx * xx + yy * yy) / 8;
            if (d < 1 && thr(x + xx, y + yy) < (1 - d) * 0.45) rect(ctx, x + xx, y + yy, 1, 1, 'rgba(255,215,130,0.35)');
          }
      }
      rect(ctx, x, y, w, h, c);
    });
  }

  // ---------- taivaankappaleet, pilvet, sumu, salama ----------
  function drawBody(ctx, b, ph, sky) {
    const { x, y, r } = b;
    const glow = b.moon ? '#9fb0e8' : ph === 'dusk' ? '#ffb070' : '#fff4c0';
    const gk = b.moon ? (b.pale ? 0 : 0.35 * b.fraction) : 0.5;
    if (gk > 0)
      for (let yy = -r * 3; yy <= r * 3; yy++)
        for (let xx = -r * 3; xx <= r * 3; xx++) {
          const d = Math.sqrt(xx * xx + yy * yy) / r;
          if (d <= 1 || d > 3) continue;
          if (thr(x + xx, y + yy) < ((3 - d) / 2) * gk) rect(ctx, x + xx, y + yy, 1, 1, mix(glow, sky[1], 0.45));
        }
    const cph = b.moon ? Math.cos(2 * Math.PI * b.phase) : 0;
    for (let yy = -r; yy <= r; yy++)
      for (let xx = -r; xx <= r; xx++) {
        const d2 = xx * xx + yy * yy;
        if (d2 > r * r + r * 0.6) continue;
        let c;
        if (b.moon) {
          // valaistu osa: kasvava kuu oikealta (pohjoisella pallonpuoliskolla), vähenevä vasemmalta
          const xn = (b.south ? -xx : xx) / r, yn = yy / r;
          const w = Math.sqrt(Math.max(0, 1 - yn * yn));
          const lit = b.phase < 0.5 ? xn > w * cph : xn < -w * cph;
          if (!lit) {
            if (b.pale) continue;
            c = mix(sky[1], '#000010', 0.2);
          } else {
            c = xx + yy < -r * 0.6 ? '#fffbe6' : (xx * 7 + yy * 3) % 11 === 0 ? '#d8cc98' : '#efe3ad';
            if (b.pale) c = mix(c, sky[2], 0.5);
          }
        } else if (ph === 'dusk') c = yy > r * 0.3 ? '#ff8a4a' : yy < -r * 0.4 ? '#ffe39a' : '#ffb85c';
        else c = xx + yy < -r * 0.7 ? '#ffffff' : d2 > (r - 1.2) ** 2 ? '#ffd65a' : '#fff1a0';
        rect(ctx, x + xx, y + yy, 1, 1, c);
      }
  }

  /** Taivaanpaikka ruudulla: katsoja katsoo pohjoisella pallonpuoliskolla etelään, eteläisellä pohjoiseen. */
  function skyPos(az, alt, W, hy, lat) {
    const view = lat >= 0 ? 180 : 0;
    const d = ((az - view + 540) % 360) - 180;
    const x = Math.round(W * (0.5 + d / 200));
    if (x < -12 || x > W + 12) return null;
    const y = Math.round(hy - 3 - (Math.max(-3, alt) / 55) * hy * 0.92);
    return { x, y: Math.max(10, y) };
  }

  /** Taivaan väripaletit auringon korkeuden mukaan: päivä → hämärä → yö liukuvasti. */
  function skyPalettes(alt) {
    const out = {};
    ['clear', 'over', 'storm', 'fog'].forEach((k) => {
      out[k] = alt >= 8 ? SKY.day[k] : alt >= 0 ? mixPal(SKY.dusk[k], SKY.day[k], alt / 8)
        : alt >= -6 ? SKY.dusk[k] : alt >= -12 ? mixPal(SKY.night[k], SKY.dusk[k], (alt + 12) / 6) : SKY.night[k];
    });
    return out;
  }

  // Revontulet: aaltoilevia verhoja, päivitetään n. 9 kertaa sekunnissa
  function drawAurora(a, W, t) {
    const k = Math.floor(t / 110);
    if (k === a.last) return;
    a.last = k;
    const ah = a.ah, d = a.img.data, s = a.s, tt = t / 1000;
    d.fill(0);
    const G1 = [100, 255, 160], G2 = [40, 210, 130], PU = [190, 110, 255];
    for (let x = 0; x < W; x++) {
      const n = Math.sin(x * 0.031 + tt * 0.25) + 0.8 * Math.sin(x * 0.013 - tt * 0.17 + 1.3) + 0.35 * Math.sin(x * 0.075 + tt * 0.6);
      const I = Math.max(0, Math.min(1, (n + 0.7) / 2.2)) * s;
      if (I < 0.03) continue;
      const base = Math.round(ah * 0.9 + Math.sin(x * 0.021 + tt * 0.3) * ah * 0.07);
      const len = Math.round(ah * (0.3 + 0.4 * I + 0.08 * Math.sin(x * 0.11 + tt)));
      for (let j = 0; j < len; j++) {
        const y = base - j;
        if (y < 0 || y >= ah) continue;
        const f = j / len;
        const br = I * (f < 0.12 ? f / 0.12 : 1 - ((f - 0.12) / 0.88) * 0.9);
        if (thr(x, y) >= br * 1.25) continue;
        const c = f < 0.4 ? G1 : f < 0.7 ? G2 : s > 0.5 ? PU : G2;
        const i = (y * W + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = Math.round(110 + 145 * Math.min(1, br));
      }
    }
    a.L.ctx.putImageData(a.img, 0, 0);
  }

  // Majakka kalliosaarella; palauttaa lyhdyn paikan
  function lighthouse(ctx, x, hy, rand, snow) {
    const rock = '#6a6e7a', rockHi = snow ? '#eef3fb' : '#9aa0aa';
    for (let yy = -3; yy <= 0; yy++)
      for (let xx = -9; xx <= 9; xx++) if ((xx * xx) / 81 + (yy * yy) / 10 <= 1) rect(ctx, x + xx, hy + yy, 1, 1, yy === -3 || (yy === -2 && Math.abs(xx) > 4) ? rockHi : rock);
    for (let i = 0; i < 3; i++) {
      const sx = x + (rand() < 0.5 ? -1 : 1) * (14 + Math.floor(rand() * 20)), sw = 2 + Math.floor(rand() * 3);
      rect(ctx, sx, hy - 1, sw, 1, rockHi);
      rect(ctx, sx - 1, hy, sw + 2, 1, rock);
    }
    const tx = x - 1, top = hy - 17;
    for (let yy = top; yy < hy - 2; yy++) rect(ctx, tx, yy, 3, 1, Math.floor((yy - top) / 3) % 2 ? '#f0f0f4' : '#c8302a');
    rect(ctx, tx, top, 1, hy - 2 - top, 'rgba(0,0,0,0.15)');
    rect(ctx, tx - 1, top - 1, 5, 1, '#2a2a34');
    rect(ctx, tx, top - 3, 3, 2, '#3a3a44');
    rect(ctx, tx + 1, top - 3, 1, 2, '#ffd36b');
    rect(ctx, tx, top - 4, 3, 1, '#c8302a');
    rect(ctx, tx + 1, top - 5, 1, 1, '#c8302a');
    return { x: tx + 1, y: top - 3 };
  }

  // Juhannuskokko: lepattavat liekit, hehku ja kipinät
  function drawKokko(ctx, k, t, sparks, ph) {
    const rr = rngFrom(Math.floor(t / 90) * 7 + 3);
    if (ph !== 'day')
      for (let yy = -10; yy <= 4; yy++)
        for (let xx = -12; xx <= 12; xx++) {
          const d = Math.sqrt(xx * xx + yy * yy * 2) / 12;
          if (d < 1 && thr(k.x + xx, k.y + yy) < (1 - d) * 0.4) rect(ctx, k.x + xx, k.y + yy, 1, 1, 'rgba(255,140,60,0.35)');
        }
    for (let i = -3; i <= 3; i++) {
      const h = Math.round((8 - Math.abs(i) * 2) * (0.6 + rr() * 0.6));
      for (let j = 0; j < h; j++) rect(ctx, k.x + i, k.y - j, 1, 1, j < h * 0.4 ? '#ff6a1a' : j < h * 0.75 ? '#ffb52a' : '#ffe88a');
    }
    sparks.forEach((p) => rect(ctx, Math.round(p.x), Math.round(p.y), 1, 1, p.a < 0.8 ? '#ffd060' : '#ff8030'));
  }

  // Jouluvalot puun latvukseen: satunnaisia näkyviä pikseleitä
  function treeLights(T, rand, n) {
    const w = T.c.width, h = T.c.height;
    const d = T.ctx.getImageData(0, 0, w, h).data;
    const cand = [];
    for (let y = 0; y < h - 6; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 0) cand.push([x, y]);
    const out = [];
    for (let i = 0; i < n && cand.length; i++) out.push(cand.splice(Math.floor(rand() * cand.length), 1)[0]);
    return out;
  }

  function pumpkin(ctx, x, b, lights) {
    rect(ctx, x, b - 3, 5, 3, '#e8781a');
    rect(ctx, x - 1, b - 2, 7, 1, '#e8781a');
    rect(ctx, x + 1, b - 3, 1, 3, '#c85a10');
    rect(ctx, x + 3, b - 3, 1, 3, '#c85a10');
    rect(ctx, x + 2, b - 4, 1, 1, '#3a6a2a');
    lights.push([x + 1, b - 2, 1, 1, '#ffe060']);
    lights.push([x + 3, b - 2, 1, 1, '#ffe060']);
  }

  const mulHex = (c, t) => { const A = rgb(c), B = rgb(t); return hex(A.map((v, i) => (v * B[i]) / 255)); };
  const PENNANT = { FI: ['#2a5ab0', '#f4f6fa'], SE: ['#2a6ab8', '#f0c830'], NO: ['#c8202a', '#f4f6fa'], DK: ['#c8202a', '#f4f6fa'], IS: ['#1a4ab0', '#f4f6fa'] };

  /** Suomen lippu (liputuspäivinä) tai viiri; liehuu tuulen suuntaan, tyynellä roikkuu. */
  function drawFlag(ctx, pole, mode, cc, windX, t, tintC) {
    const cs = (c) => (tintC ? mulHex(c, tintC) : c);
    const dir = windX >= 0 ? 1 : -1, wsp = Math.abs(windX), tt = t / 1000;
    const amp = Math.min(1.2, wsp / 5);
    if (mode === 'flag') {
      const W = '#f4f6fa', Bl = '#1a4ab0';
      if (wsp < 0.8) {
        for (let j = 0; j < 11; j++) for (let i = 0; i < 4; i++) rect(ctx, pole.x + i, pole.y + j, 1, 1, cs(j === 4 || j === 5 || i === 2 ? Bl : W));
        return;
      }
      const fw = 12, fh = 8;
      for (let i = 0; i < fw; i++) {
        const dy = Math.round(Math.sin(i * 0.8 - tt * 7) * amp * (i / fw)) + Math.round((1 - Math.min(1, wsp / 4)) * i * 0.35);
        for (let j = 0; j < fh; j++) rect(ctx, pole.x + (dir > 0 ? i : -2 - i), pole.y + j + dy, 1, 1, cs(j === 3 || j === 4 || i === 3 || i === 4 ? Bl : W));
      }
      return;
    }
    const pc = PENNANT[(cc || '').toUpperCase()] || ['#2a5ab0', '#f4f6fa'];
    const L = 18;
    if (wsp < 0.8) {
      for (let j = 0; j < 12; j++) rect(ctx, pole.x, pole.y + j, j < 10 ? 2 : 1, 1, cs(pc[j % 2 ? 1 : 0]));
      return;
    }
    for (let i = 0; i < L; i++) {
      const th = Math.max(1, Math.round(3 - (i * 2.5) / L));
      const dy = Math.round(Math.sin(i * 0.6 - tt * 6) * amp * (i / L) * 1.5) + Math.round((1 - Math.min(1, wsp / 4)) * i * 0.4);
      for (let j = 0; j < th; j++) rect(ctx, pole.x + (dir > 0 ? i : -2 - i), pole.y + j + dy, 1, 1, cs(j === 0 ? pc[0] : pc[1]));
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
    for (let y = 0; y < h + 2; y++)
      for (let x = 0; x < w + 2; x++) {
        if (!inside(x, y)) continue;
        const up = inside(x, y - 2), dn = inside(x, y + 2);
        let c = pal[1];
        if (!up) c = pal[0];
        else if (!dn) c = pal[2];
        else if (!inside(x, y + 3) && thr(x, y) < 0.5) c = pal[2];
        else if (!inside(x, y - 3) && thr(x, y) < 0.5) c = pal[0];
        rect(C.ctx, x, y, 1, 1, c);
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
          rect(ctx, px - 1, py, 3, 1, '#9fb6ff');
          rect(ctx, px, py, 1, 1, '#ffffff');
        }
      }
    });
  }

  // ---------- eläimet ----------
  // Pikselikartat vasemmalle katsoville eläimille ('.' = läpinäkyvä). Toinen kuva = kävelyaskel.
  const SPR = {
    reindeer: { o: 1, pal: { a: '#9a7a56', h: '#6e5c4c', b: '#7a6650', w: '#d8d0c0', t: '#efe8dc', l: '#4a3a2c' }, frames: [
      ['.a..a.......', 'aa.aa.......', '.aaa........', '..hh........', '.hhhbbbbbb..', 'hh..bbbbbbbt', '....bbbbbbb.', '....wwwwwww.', '....l.l..l.l', '....l.l..l.l'],
      ['.a..a.......', 'aa.aa.......', '.aaa........', '..hh........', '.hhhbbbbbb..', 'hh..bbbbbbbt', '....bbbbbbb.', '....wwwwwww.', '.....l.l.l.l', '....l...l..l'],
    ] },
    camel: { o: 1, pal: { h: '#c8995a', b: '#c8995a', t: '#8a6a3a', l: '#a87a42' }, frames: [
      ['.hh...........', 'hhhh..........', '..hh....bb....', '...h...bbbb...', '...hh.bbbbbb..', '....bbbbbbbbb.', '....bbbbbbbbbt', '.....bbbbbbb.t', '.....l.l..l.l.', '.....l.l..l.l.', '.....l.l..l.l.'],
      ['.hh...........', 'hhhh..........', '..hh....bb....', '...h...bbbb...', '...hh.bbbbbb..', '....bbbbbbbbb.', '....bbbbbbbbbt', '.....bbbbbbb.t', '......l.l.l.l.', '......l.l.l.l.', '.....l...l...l'],
    ] },
    giraffe: { o: 1, pal: { y: '#e0b050', p: '#8a5a2a', o: '#6a4a2a', l: '#c09040', t: '#5a3a1a' }, frames: [
      ['.o.o......', '.yyy......', 'yyyy......', '..yy......', '..yp......', '..yy......', '..py......', '..yy......', '..yyypyyp.', '..pyyyypyy', '..yyypyyyt', '...yyyyyy.', '...l.l.l.l', '...l.l.l.l', '...l.l.l.l', '...l.l.l.l'],
      ['.o.o......', '.yyy......', 'yyyy......', '..yy......', '..yp......', '..yy......', '..py......', '..yy......', '..yyypyyp.', '..pyyyypyy', '..yyypyyyt', '...yyyyyy.', '...l..l.l.', '...l..l.l.', '....l.l..l', '....l.l..l'],
    ] },
    kangaroo: { o: 1, pal: { e: '#8a5a3a', h: '#b07a50', b: '#b07a50', t: '#9a6a44', l: '#8a5a3a' }, frames: [
      ['..e......', '.hhh.....', 'hhhh.....', '..bb.....', '..bbb....', '..bbbb...', '...bbbbtt', '...bb...t', '..ll.....', '.lll.....'],
    ] },
    duck: { o: 0, pal: { g: '#2a6a3a', y: '#e8b030', b: '#8a6a4a', t: '#3a3a3a' }, frames: [['.gg...', 'ygg...', '..bbbb', '.bbbbt']] },
    gull: { o: 0, pal: { w: '#f4f6fa' }, frames: [['w...w', '.www.'], ['.www.', 'w...w']] },
    bird: { o: 0, pal: { k: '#2a2a3a' }, frames: [['k.k', '.k.'], ['...', 'kkk']] },
  };

  function spriteFrames(def, tintC) {
    const h = def.frames[0].length, w = def.frames[0][0].length, o = def.o;
    const make = (rows, flip) => {
      const L = layer(w + o * 2, h + o * 2);
      const solid = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
      for (let y = -o; y < h + o; y++)
        for (let x = -o; x < w + o; x++) {
          const sx = flip ? w - 1 - x : x;
          if (solid(sx, y)) rect(L.ctx, x + o, y + o, 1, 1, def.pal[rows[y][sx]]);
          else if (o && (solid(sx - 1, y) || solid(sx + 1, y) || solid(sx, y - 1) || solid(sx, y + 1))) rect(L.ctx, x + o, y + o, 1, 1, '#241c2c');
        }
      if (tintC) tint(L, tintC);
      return L.c;
    };
    return { w, h, o, L: def.frames.map((f) => make(f, false)), R: def.frames.map((f) => make(f, true)) };
  }

  PixelScene.prototype.buildAnimals = function (rand) {
    const sc = this.sc, s = this.state, W = this.W, H = this.H, hy = this.hy, ph = sc.phase;
    const lat = Math.abs(s.lat || 0);
    const tc = TINT[ph] || (sc.dark > 0.3 ? mix('#ffffff', '#7c8494', sc.dark * 0.6) : null);
    const mk = (k) => spriteFrames(SPR[k], tc);
    const heavy = (sc.amount || 0) > 0.6 || sc.thunder;
    this.animals = [];
    const walkers = (k, n, v, x0, x1) => {
      const spr = mk(k);
      for (let i = 0; i < n; i++)
        this.animals.push({ k, spr, layer: 'land', x: W * (x0 + rand() * (x1 - x0)), dir: rand() < 0.5 ? -1 : 1, v: v * (0.7 + rand() * 0.6), min: W * x0, max: W * x1 - spr.w, ph: rand() * 6, pause: rand() * 3 });
    };
    if (sc.style === 'nordic' && lat >= 64.5 && ['taiga', 'tundra', 'boreal'].includes(sc.biome)) walkers('reindeer', 2 + (rand() < 0.5 ? 1 : 0), 3, 0.3, 0.66);
    if (sc.biome === 'desert' && (sc.style === 'westasia' || sc.style === 'africa')) walkers('camel', 1 + (rand() < 0.5 ? 1 : 0), 2.5, 0.28, 0.68);
    if (sc.style === 'africa' && sc.biome === 'savanna') walkers('giraffe', 1, 2, 0.3, 0.66);
    if (sc.style === 'oceania' && ['steppe', 'desert', 'savanna', 'temperate', 'subtropical', 'mediterranean'].includes(sc.biome)) walkers('kangaroo', 1 + (rand() < 0.5 ? 1 : 0), 6, 0.3, 0.66);
    // sorsat avoimella järvellä lämpimään aikaan
    const warm = sc.seasonal ? ['spring', 'summer', 'autumn'].includes(sc.foliage) : sc.biome !== 'desert';
    if (sc.water === 'lake' && !sc.frozen && warm && ph !== 'night' && !heavy) {
      const spr = mk('duck');
      const yMax = Math.min.apply(null, this.prof.slice(Math.round(W * 0.33), Math.round(W * 0.7))) - 6;
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++)
        this.animals.push({ k: 'duck', spr, layer: 'water', x: W * (0.35 + rand() * 0.28), y: Math.round(hy + 6 + rand() * Math.max(2, yMax - hy - 8)), dir: rand() < 0.5 ? -1 : 1, v: 1 + rand() * 2, min: W * 0.3, max: W * 0.7, ph: rand() * 6, pause: 0 });
    }
    // lokit merenrannalla
    this.gulls = [];
    if (sc.water === 'sea' && ph !== 'night' && !heavy && !sc.fog) {
      const spr = mk('gull');
      const n = 2 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) this.gulls.push({ spr, cx: W * (0.2 + rand() * 0.6), cy: H * (0.18 + rand() * 0.25), R: 15 + rand() * 30, w: (0.25 + rand() * 0.3) * (rand() < 0.5 ? -1 : 1), ph: rand() * 6 });
    }
    // muuttolinnut keväällä ja syksyllä
    this.flock = null;
    if (sc.seasonal && [3, 4, 5, 9, 10].includes(sc.month) && ph !== 'night' && !heavy && !sc.fog) this.flock = { spr: mk('bird'), next: performance.now() + 2000 + rand() * 6000, birds: null };
  };

  PixelScene.prototype.stepAnimals = function (dt, t) {
    const rand = this.rand;
    this.animals.forEach((a) => {
      if (a.pause > 0) { a.pause -= dt; return; }
      a.x += a.dir * a.v * dt;
      if (a.x < a.min) { a.x = a.min; a.dir = 1; }
      if (a.x > a.max) { a.x = a.max; a.dir = -1; }
      if (a.k !== 'duck' && rand() < dt * 0.12) a.pause = 1.5 + rand() * 4; // laiduntaa hetken
      if (rand() < dt * 0.05) a.dir *= -1;
    });
    const f = this.flock;
    if (!f) return;
    if (!f.birds && t > f.next) {
      f.dir = rand() < 0.5 ? -1 : 1;
      f.x = f.dir > 0 ? -20 : this.W + 20;
      f.y = this.visibleSkyRow(this.H * 0.06, this.H * 0.32);
      f.v = 10 + rand() * 6;
      const n = 7 + Math.floor(rand() * 9);
      f.birds = [];
      for (let i = 0; i < n; i++) { const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1; f.birds.push([-f.dir * row * 4, side * row * 2, rand() * 6]); }
    }
    if (f.birds) {
      f.x += f.dir * f.v * dt;
      if ((f.dir > 0 && f.x > this.W + 80) || (f.dir < 0 && f.x < -80)) { f.birds = null; f.next = t + 15000 + rand() * 30000; }
    }
  };

  PixelScene.prototype.drawAnimals = function (ctx, t, which) {
    const prof = this.prof, W = this.W;
    this.animals.forEach((a) => {
      if (a.layer !== which) return;
      const moving = a.pause <= 0;
      const fi = moving ? Math.floor(t / 260 + a.ph) % a.spr.L.length : 0;
      const img = a.dir < 0 ? a.spr.L[fi] : a.spr.R[fi];
      const x = Math.round(a.x), o = a.spr.o;
      let y;
      if (which === 'water') {
        y = a.y + (Math.floor(t / 700 + a.ph) % 2);
        rect(ctx, a.dir < 0 ? x + a.spr.w : x - 3, y + a.spr.h - 1, 3, 1, 'rgba(255,255,255,0.35)'); // vana
      } else {
        y = prof[clamp(x + (a.spr.w >> 1), 0, W - 1)] - a.spr.h + 1;
        if (a.k === 'kangaroo' && moving) y -= Math.round(Math.abs(Math.sin(t / 160 + a.ph)) * 4);
      }
      ctx.drawImage(img, x - o, y - o);
    });
  };

  PixelScene.prototype.drawFlocks = function (ctx, t, which) {
    if (which === 'far' && this.flock && this.flock.birds) {
      const f = this.flock;
      f.birds.forEach(([dx, dy, p]) => {
        const fi = Math.floor(t / 220 + p) % 2;
        ctx.drawImage(f.dir < 0 ? f.spr.L[fi] : f.spr.R[fi], Math.round(f.x + dx), Math.round(f.y + dy));
      });
    }
    if (which === 'near' && this.gulls)
      this.gulls.forEach((g) => {
        const a = (t / 1000) * g.w + g.ph;
        const fi = Math.floor(t / 180 + g.ph) % 2;
        ctx.drawImage(g.spr.L[fi], Math.round(g.cx + Math.cos(a) * g.R), Math.round(g.cy + Math.sin(2 * a) * g.R * 0.25));
      });
  };

  // ---------- käyttöliittymän peittämät alueet ----------
  /** rects: käyttöliittymän ikkunat ruudun pikseleinä [vasen, ylä, oikea, ala] (getBoundingClientRect). */
  PixelScene.prototype.setOcclusion = function (rects) {
    const px = this.px || 1;
    this.occ = rects.map((r) => [Math.floor(r[0] / px), Math.floor(r[1] / px), Math.ceil(r[2] / px), Math.ceil(r[3] / px)]);
    this.rehome();
  };

  PixelScene.prototype.occluded = function (x0, y0, x1, y1) {
    const o = this.occ;
    if (!o) return false;
    for (let i = 0; i < o.length; i++) {
      const r = o[i];
      if (x1 > r[0] && x0 < r[2] && y1 > r[1] && y0 < r[3]) return true;
    }
    return false;
  };

  /** Yhtenäiset vapaat x-välit, joilla w-levyinen laatikko (boxAt(x) → [y0, y1] tai null) näkyy kokonaan. */
  PixelScene.prototype.freeSegments = function (w, boxAt) {
    const segs = [];
    let cur = null;
    for (let x = 2; x <= this.W - 2 - w; x++) {
      const b = boxAt(x);
      if (b && !this.occluded(x, b[0], x + w, b[1])) {
        if (!cur) cur = [x, x];
        cur[1] = x;
      } else if (cur) { segs.push(cur); cur = null; }
    }
    if (cur) segs.push(cur);
    return segs;
  };

  /** Taivaan rivi, jolla on eniten näkyvää tilaa (lintuparville). */
  PixelScene.prototype.visibleSkyRow = function (y0, y1) {
    let best = y0 + (y1 - y0) * this.rand(), bestFree = -1;
    for (let i = 0; i < 12; i++) {
      const y = Math.round(y0 + (y1 - y0) * this.rand());
      let free = 0;
      for (let x = 0; x < this.W; x += 4) if (!this.occluded(x, y - 3, x + 4, y + 8)) free++;
      if (free > bestFree) { bestFree = free; best = y; }
    }
    return best;
  };

  /** Siirtää piiloon jääneet eläimet näkyville ja rajaa näkyvien kulkureitin vapaalle alueelle. */
  PixelScene.prototype.rehome = function () {
    if (!this.animals || !this.prof || !this.rand) return;
    const W = this.W, H = this.H, prof = this.prof, hy = this.hy, rand = this.rand;
    const choose = (a, segs) => {
      const xi = Math.round(a.x);
      let seg = segs.find(([s0, s1]) => xi >= s0 && xi <= s1);
      if (!seg) {
        segs.sort((p, q) => q[1] - q[0] - (p[1] - p[0]));
        seg = segs[Math.floor(rand() * Math.min(2, segs.length))];
        a.x = seg[0] + rand() * (seg[1] - seg[0]);
      }
      a.min = seg[0];
      a.max = seg[1];
    };
    this.animals.forEach((a) => {
      const w = a.spr.w + 2, h = a.spr.h + 2;
      if (!a.home) a.home = [a.min, a.max];
      let segs;
      if (a.layer === 'land') {
        segs = this.freeSegments(w, (x) => { const gy = prof[clamp(x + (w >> 1), 0, W - 1)]; return [gy - h - 4, gy + 1]; });
      } else {
        // sorsat: vesirivi, jonka alla on vettä koko matkalta eikä etualan puu ole edessä
        const behindTree = (x0, x1) => (this.trees || []).some((tr) => {
          const c = tr.x + tr.img.width / 2, r = (tr.sh / 1.35) * 0.45;
          return x1 > c - r && x0 < c + r;
        });
        const rowSegs = (y) => this.freeSegments(w + 3, (x) => (prof[clamp(x, 0, W - 1)] > y + h + 3 && prof[clamp(x + w, 0, W - 1)] > y + h + 3 && !behindTree(x, x + w + 3) ? [y - 1, y + h + 1] : null));
        segs = rowSegs(a.y);
        if (!segs.length) {
          const yMax = Math.max.apply(null, prof) - h - 4;
          for (let i = 0; i < 16 && !segs.length; i++) {
            const y = Math.round(hy + 4 + rand() * Math.max(1, yMax - hy - 4));
            segs = rowSegs(y);
            if (segs.length) a.y = y;
          }
        }
      }
      segs = segs.filter(([s0, s1]) => s1 - s0 >= (a.layer === 'land' ? 6 : 3));
      if (segs.length) choose(a, segs);
      else { a.min = a.home[0]; a.max = a.home[1]; a.x = clamp(a.x, a.min, a.max); }
    });
    // lokit kiertelevät näkyvällä taivaalla
    (this.gulls || []).forEach((g) => {
      if (!this.occluded(g.cx - g.R - 3, g.cy - g.R * 0.3 - 3, g.cx + g.R + 6, g.cy + g.R * 0.3 + 3)) return;
      for (let i = 0; i < 40; i++) {
        const R = 8 + rand() * 22, cx = R + 3 + rand() * (W - 2 * R - 9), cy = H * 0.06 + rand() * (hy - H * 0.06 - 10);
        if (!this.occluded(cx - R - 3, cy - R * 0.3 - 3, cx + R + 6, cy + R * 0.3 + 3)) { g.cx = cx; g.cy = cy; g.R = R; break; }
      }
    });
  };

  WX.PixelScene = PixelScene;
})();
