/* Sovelluslogiikka: paikan valinta, datan haku ja näkymien piirto. */
(function () {
  'use strict';
  const WX = window.WX;
  const { iso, parseLocal, addDays, yearAgo } = WX.dates;
  const $ = (id) => document.getElementById(id);

  // ---------- muotoilu ----------
  const nf0 = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0, signDisplay: 'exceptZero' });
  const nf1s = new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' });
  const nf1 = new Intl.NumberFormat('fi-FI', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nfi = new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0, useGrouping: false });
  const r0 = (v) => Math.round(v) || 0;
  const r1 = (v) => Math.round(v * 10) / 10 || 0;
  WX.fmt = {
    temp: (v) => (v == null ? '–' : nf0.format(r0(v)) + '°'),
    signed: (v) => nf0.format(r0(v)),
    temp1: (v) => (v == null ? '–' : nf1s.format(r1(v)) + ' °C'),
    signed1: (v) => nf1s.format(r1(v)),
    num1: (v) => nf1.format(v || 0),
    int: (v) => nfi.format(v),
    hm: (d) => `${d.getUTCHours()}.${String(d.getUTCMinutes()).padStart(2, '0')}`,
  };
  const F = WX.fmt;
  const WD_SHORT = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
  const WD_LONG = ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'];
  const dm = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
  const COMPASS = ['pohjoisesta', 'koillisesta', 'idästä', 'kaakosta', 'etelästä', 'lounaasta', 'lännestä', 'luoteesta'];
  const compass = (deg) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

  // Lämpötilan väri vaihteluväli-palkkiin: kylmä sininen ↔ neutraali harmaa (0 °C) ↔ lämmin oranssi
  function tempColor(t) {
    const mixc = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const cold = [64, 140, 240], mid = [210, 214, 226], warm = [240, 120, 50];
    const c = t < 0 ? mixc(mid, cold, Math.min(1, -t / 20)) : mixc(mid, warm, Math.min(1, t / 25));
    return `rgb(${c.join(',')})`;
  }

  // ---------- tila ----------
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const DEFAULT = { name: 'Helsinki', lat: 60.1699, lon: 24.9384 };
  // Varahaku, jos paikkahaku ei vastaa (ja demotila). Väkiluvut: kunnan/taajaman likimääräinen asukasluku.
  const FALLBACK_PLACES = [
    ['Helsinki', 'Uusimaa', 60.1699, 24.9384, 658000], ['Espoo', 'Uusimaa', 60.2052, 24.6522, 305000], ['Vantaa', 'Uusimaa', 60.2934, 25.0378, 240000],
    ['Tampere', 'Pirkanmaa', 61.4978, 23.761, 250000], ['Turku', 'Varsinais-Suomi', 60.4518, 22.2666, 200000], ['Oulu', 'Pohjois-Pohjanmaa', 65.0121, 25.4651, 215000],
    ['Jyväskylä', 'Keski-Suomi', 62.2426, 25.7473, 147000], ['Kuopio', 'Pohjois-Savo', 62.8924, 27.677, 124000], ['Lahti', 'Päijät-Häme', 60.9827, 25.6612, 121000],
    ['Pori', 'Satakunta', 61.4851, 21.7974, 84000], ['Joensuu', 'Pohjois-Karjala', 62.601, 29.7636, 78000], ['Vaasa', 'Pohjanmaa', 63.096, 21.6158, 68000],
    ['Rovaniemi', 'Lappi', 66.5039, 25.7294, 65000], ['Kajaani', 'Kainuu', 64.2222, 27.7278, 36000], ['Inari', 'Lappi', 68.9058, 27.0288, 550],
    ['Utsjoki', 'Lappi', 69.9078, 27.0286, 250], ['Mikkeli', 'Etelä-Savo', 61.6886, 27.2723, 52000], ['Kotka', 'Kymenlaakso', 60.4664, 26.9458, 51000],
    ['Hanko', 'Uusimaa', 59.8236, 22.9681, 8000], ['Nuuksio', 'Uusimaa', 60.3, 24.53, 0],
  ].map(([name, detail, lat, lon, pop]) => ({ name, detail: detail + ', Suomi', lat, lon, pop: pop || null, cc: 'FI', fc: pop ? 'PPL' : 'PRK' }));

  const state = { place: null, data: null, selected: null, metric: 'mean', weekDays: 7, loading: 0 };
  let scene, chart, mascot;

  function readPlace() {
    const lat = parseFloat(params.get('lat')), lon = parseFloat(params.get('lon'));
    if (isFinite(lat) && isFinite(lon)) {
      const p = { name: params.get('name') || 'Valittu sijainti', lat, lon };
      if (params.has('pop')) p.pop = parseInt(params.get('pop'), 10) || null;
      if (params.get('cc')) p.cc = params.get('cc');
      return p;
    }
    try {
      const s = JSON.parse(localStorage.getItem('gigasaa.place') || 'null');
      if (s && isFinite(s.lat) && isFinite(s.lon) && s.name) return s;
    } catch (e) { /* ei tallennettua paikkaa */ }
    return null;
  }
  function savePlace(p) {
    try { localStorage.setItem('gigasaa.place', JSON.stringify(p)); } catch (e) { /* yksityinen tila tms. */ }
    const u = new URLSearchParams(location.search);
    u.set('name', p.name); u.set('lat', p.lat.toFixed(4)); u.set('lon', p.lon.toFixed(4));
    if (p.pop !== undefined) u.set('pop', p.pop || 0); else u.delete('pop');
    if (p.cc) u.set('cc', p.cc); else u.delete('cc');
    history.replaceState(null, '', '?' + u.toString());
  }

  // ---------- lataus ----------
  async function load(place, quiet) {
    const my = ++state.loading;
    state.place = place;
    $('place').textContent = place.name;
    $('main').classList.add('is-loading');
    if (!quiet) setStatus('');
    try {
      const [data] = await Promise.all([WX.api.loadAll(place.lat, place.lon, DEMO), resolveMeta(place)]);
      if (my !== state.loading) return;
      state.data = data;
      if (!quiet) state.env = null;
      if (!state.selected || state.selected < data.today || !quiet) state.selected = data.today;
      renderAll();
      savePlace(place);
      setStatus('');
      // ympäristötiedot (Kp, ranta, aallot, korkeuserot) tulevat perässä eivätkä hidasta sivua
      WX.api.loadEnv(place.lat, place.lon, DEMO).then((env) => {
        if (my !== state.loading) return;
        state.env = env;
        renderNow();
        updateScene();
      });
    } catch (e) {
      if (my !== state.loading) return;
      console.error(e);
      setStatus(`Säätietojen haku epäonnistui (${e.message || e}).`, true);
    } finally {
      if (my === state.loading) $('main').classList.remove('is-loading');
    }
  }

  // ---------- paikan tiedot (väkiluku, maa) ----------
  const km = (a, b) => {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  /** Täydentää paikalle väkiluvun ja maakoodin hakemalla nimellä ja valitsemalla lähimmän osuman. */
  async function resolveMeta(place) {
    if (place.pop !== undefined && place.cc) return place;
    let res = [];
    try { res = DEMO ? [] : await WX.api.geocode(place.name); } catch (e) { /* ei haittaa */ }
    if (!res.length) res = FALLBACK_PLACES.filter((p) => p.name.toLowerCase() === place.name.toLowerCase());
    let best = null, bestD = Infinity;
    res.forEach((r) => { const d = km(place, r); if (d < bestD) { bestD = d; best = r; } });
    if (best && bestD < 40) {
      if (place.pop === undefined) place.pop = best.pop;
      if (!place.cc) place.cc = best.cc;
      if (!place.fc) place.fc = best.fc;
      if (place.geo) place.dist = bestD;
    } else if (place.pop === undefined) {
      place.pop = null;
    }
    return place;
  }

  function placeClass() {
    const p = state.place, d = state.data;
    const climate = d && d.climate;
    return {
      settlement: WX.place.settlement(p.pop, p.fc, p.dist),
      style: WX.place.style(p.cc, p.lat, p.lon),
      biome: climate ? climate.biome : WX.place.biomeFallback(p.lat),
      climate,
    };
  }

  function renderPlaceInfo() {
    const c = placeClass(), L = WX.place.LABELS;
    const clim = c.climate ? `${c.climate.code}-ilmasto (${WX.place.koppenLabel(c.climate.code)})` : L.biome[c.biome];
    const el = $('placeInfo');
    el.textContent = `${L.settlement[c.settlement]} · ${L.style[c.style]} · ${clim}`;
    el.title = 'Taustakuvan maisema: asutuksen tiheys (DEGURBA-luokituksen väkilukurajoilla arvioituna), alue ja ' +
      (c.climate ? 'Köppenin ilmastoluokka viimeisen vuoden säädatasta.' : 'leveyspiiristä arvioitu kasvillisuusvyöhyke.');
  }

  function setStatus(msg, retry) {
    const s = $('status');
    s.textContent = '';
    if (!msg) { s.hidden = true; return; }
    s.hidden = false;
    const p = document.createElement('span');
    p.textContent = msg;
    s.appendChild(p);
    if (retry) {
      const b = document.createElement('button');
      b.className = 'btn small';
      b.type = 'button';
      b.textContent = 'Yritä uudelleen';
      b.onclick = () => load(state.place);
      s.appendChild(b);
    }
  }

  function renderAll() {
    setTimeout(updateOcclusion, 0);
    renderPlaceInfo();
    renderNow();
    renderWeek();
    renderHours();
    renderChart();
    updateScene();
  }

  // ---------- nyt ----------
  function dayOf(date) { return state.data.daily.find((d) => d.date === date); }

  function renderNow() {
    const d = state.data, c = d.current, desc = WX.describe(c.code);
    const today = dayOf(d.today);
    $('nowIcon').src = WX.iconURL(desc.icon, c.isDay);
    $('nowIcon').alt = desc.text;
    $('nowTemp').textContent = F.temp(c.temp);
    $('nowDesc').textContent = desc.text;
    $('nowMeta').textContent = '';
    const meta = [`Tuntuu kuin ${F.temp(c.feels)}`];
    if (today) meta.push(`Ylin ${F.temp(today.tmax)} · Alin ${F.temp(today.tmin)}`);
    meta.forEach((t) => { const s = document.createElement('span'); s.textContent = t; $('nowMeta').appendChild(s); });

    const dl = $('nowStats');
    dl.textContent = '';
    const add = (label, value, extra) => {
      const w = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = value;
      if (extra) dd.prepend(extra);
      w.append(dt, dd);
      dl.appendChild(w);
    };
    add('Tuuli', `${F.num1(c.wind)} m/s ${compass(c.windDir)}`, arrow(c.windDir));
    add('Puuskat', `${F.num1(c.gust)} m/s`);
    add('Kosteus', `${F.int(c.humidity)} %`);
    add('Ilmanpaine', `${F.int(c.pressure)} hPa`);
    add('Sade (päivä)', `${F.num1(today ? today.precip : c.precip)} mm`);
    add('Pilvisyys', `${F.int(c.cloud)} %`);
    if (today && today.sunrise && today.sunset) {
      add('Aurinko', `${F.hm(today.sunrise)} – ${F.hm(today.sunset)}`);
      const len = Math.round((today.sunset - today.sunrise) / 60000);
      add('Päivän pituus', `${Math.floor(len / 60)} h ${len % 60} min`);
    } else if (today) {
      add('Aurinko', c.isDay ? 'Ei laske (yötön yö)' : 'Ei nouse (kaamos)');
    }
    // kuu, lumi, aallot ja revontulet
    const p = state.place, env = state.env || {};
    const a = WX.astro.position(Date.now(), p.lat, p.lon);
    add('Kuu', `${WX.astro.moonName(a.moon.phase)} ${Math.round(a.moon.fraction * 100)}\u00a0%`);
    if (c.snowDepth > 0.005) add('Lumensyvyys', `${Math.round(c.snowDepth * 100)} cm`);
    if (env.waves != null) add('Aallonkorkeus', `${F.num1(env.waves)} m`);
    if (env.kp != null && (Math.abs(WX.astro.geomagLat(p.lat, p.lon)) >= 50 || env.kp >= 6)) {
      const st = WX.astro.auroraStrength(env.kp, p.lat, p.lon);
      let txt = st < 0.15 ? 'epätodennäköisiä' : st < 0.5 ? 'mahdollisia' : 'todennäköisiä';
      if (st >= 0.15) txt += a.sun.alt > -6 ? ' pimeällä' : c.cloud >= 80 ? ' (pilvistä)' : '';
      add('Revontulet', `${txt}, Kp\u00a0${F.num1(env.kp)}`);
    }
    add('Päivitetty', `klo ${F.hm(c.time)}${DEMO ? ' (demo)' : ''}`);
    const ev = currentEvents();
    $('greeting').textContent = ev.greeting || '';
    $('greeting').hidden = !ev.greeting;
    if (ev.greeting && state.greeted !== ev.greeting) { state.greeted = ev.greeting; setTimeout(() => mascot.react(ev.greeting), 600); }
  }

  function arrow(dir) {
    const img = document.createElement('img');
    img.className = 'px arrow';
    img.src = WX.arrowURL();
    img.alt = '';
    img.width = 18; img.height = 18;
    // nuoli osoittaa tuulen kulkusuuntaan (tuulee suunnasta dir)
    img.style.transform = `rotate(${(dir + 180) % 360}deg)`;
    return img;
  }

  // ---------- päivän sää (tunnit) ----------
  function renderHours() {
    const d = state.data, sel = state.selected;
    let hours;
    if (sel === d.today) {
      const start = Math.floor(d.now.getTime() / 3600000) * 3600000;
      hours = d.hourly.filter((h) => h.time.getTime() >= start).slice(0, 25);
    } else {
      hours = d.hourly.filter((h) => h.date === sel);
    }
    const selDate = parseLocal(sel);
    $('todayWhen').textContent = sel === d.today ? 'Seuraavat 24 tuntia' :
      sel === iso(addDays(parseLocal(d.today), 1)) ? `Huomenna, ${WD_LONG[selDate.getUTCDay()]} ${dm(selDate)}` :
        `${WD_LONG[selDate.getUTCDay()][0].toUpperCase() + WD_LONG[selDate.getUTCDay()].slice(1)} ${dm(selDate)}`;

    const box = $('hours');
    box.textContent = '';
    if (!hours.length) return;
    box.style.setProperty('--n', hours.length);
    const row = (cls) => { const r = document.createElement('div'); r.className = 'h-row ' + cls; box.appendChild(r); return r; };
    const times = row('h-times'), icons = row('h-icons');
    const curve = document.createElement('div'); curve.className = 'h-curve'; box.appendChild(curve);
    const prec = row('h-prec'), wind = row('h-wind');

    const temps = hours.map((h) => h.temp);
    const tmin = Math.min.apply(null, temps), tmax = Math.max.apply(null, temps);
    const CH = 64, PAD = 24;
    const ty = (t) => (tmax === tmin ? CH / 2 + 8 : PAD + (1 - (t - tmin) / (tmax - tmin)) * (CH - PAD - 6));
    const col = 60;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', hours.length * col);
    svg.setAttribute('height', CH);
    svg.setAttribute('aria-hidden', 'true');
    const pts = hours.map((h, i) => `${i * col + col / 2},${ty(h.temp).toFixed(1)}`).join(' ');
    const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', pts);
    pl.setAttribute('class', 'h-line');
    svg.appendChild(pl);
    curve.appendChild(svg);

    hours.forEach((h, i) => {
      const desc = WX.describe(h.code);
      const t = document.createElement('div');
      t.className = 'h-time' + (h.isDay ? '' : ' night');
      const hh = h.time.getUTCHours();
      t.textContent = i === 0 && sel === d.today ? 'Nyt' : String(hh);
      if (hh === 0 && i > 0) { const s = document.createElement('small'); s.textContent = WD_SHORT[h.time.getUTCDay()]; t.appendChild(s); t.classList.add('midnight'); }
      times.appendChild(t);

      const ic = document.createElement('div');
      const img = document.createElement('img');
      img.className = 'px';
      img.src = WX.iconURL(desc.icon, h.isDay);
      img.alt = desc.text;
      img.title = desc.text;
      img.width = 48; img.height = 48;
      ic.appendChild(img);
      icons.appendChild(ic);

      const lab = document.createElement('span');
      lab.className = 'h-temp';
      lab.textContent = F.temp(h.temp);
      lab.style.left = i * col + col / 2 + 'px';
      lab.style.top = ty(h.temp) - 22 + 'px';
      curve.appendChild(lab);
      const dot = document.createElement('span');
      dot.className = 'h-dot';
      dot.style.left = i * col + col / 2 + 'px';
      dot.style.top = ty(h.temp) + 'px';
      curve.appendChild(dot);

      const p = document.createElement('div');
      const mm = h.precip || 0;
      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.style.height = Math.min(18, mm > 0 ? 2 + mm * 6 : 0) + 'px';
      const pv = document.createElement('span');
      pv.textContent = mm > 0 ? F.num1(mm) : '';
      p.title = `Sade ${F.num1(mm)} mm` + (h.prob != null ? `, todennäköisyys ${h.prob} %` : '');
      p.append(bar, pv);
      prec.appendChild(p);

      const w = document.createElement('div');
      w.appendChild(arrow(h.windDir));
      const ws = document.createElement('span');
      ws.textContent = Math.round(h.wind);
      w.appendChild(ws);
      w.title = `Tuuli ${F.num1(h.wind)} m/s ${compass(h.windDir)}`;
      wind.appendChild(w);
    });
    const dry = hours.every((h) => !(h.precip > 0));
    if (dry) prec.classList.add('dry');
    const leg = document.createElement('div');
    leg.className = 'h-units';
    leg.textContent = dry ? 'Ei sadetta · Tuuli m/s' : 'Sade mm · Tuuli m/s';
    box.appendChild(leg);
    box.parentElement.scrollLeft = 0;
  }

  // ---------- viikon sää ----------
  function renderWeek() {
    const d = state.data;
    const list = $('days');
    list.textContent = '';
    const days = d.daily.filter((x) => x.date >= d.today).slice(0, state.weekDays);
    const lo = Math.min.apply(null, days.map((x) => x.tmin)), hi = Math.max.apply(null, days.map((x) => x.tmax));
    const pct = (t) => ((t - lo) / (hi - lo || 1)) * 100;
    days.forEach((day, i) => {
      const date = parseLocal(day.date);
      const desc = WX.describe(day.code);
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'day';
      b.setAttribute('aria-pressed', String(day.date === state.selected));
      const name = i === 0 ? 'Tänään' : i === 1 ? 'Huomenna' : WD_SHORT[date.getUTCDay()];
      b.setAttribute('aria-label', `${i < 2 ? name : WD_LONG[date.getUTCDay()]} ${dm(date)}: ${desc.text}, ylin ${F.temp(day.tmax)}, alin ${F.temp(day.tmin)}, sade ${F.num1(day.precip)} mm. Näytä tuntiennuste.`);
      b.innerHTML = `
        <img class="px hand" alt="" width="32" height="22">
        <span class="d-name"><b></b><small class="d-date"></small></span>
        <img class="px d-icon" width="48" height="48">
        <span class="d-max"></span>
        <span class="d-min"></span>
        <span class="d-range"><span></span></span>
        <span class="d-prec"></span>
        <span class="d-wind"></span>`;
      b.querySelector('.hand').src = WX.handURL();
      b.querySelector('.d-name b').textContent = name;
      b.querySelector('.d-date').textContent = dm(date);
      const ic = b.querySelector('.d-icon');
      ic.src = WX.iconURL(desc.icon, true);
      ic.alt = desc.text;
      ic.title = desc.text;
      b.querySelector('.d-max').textContent = F.temp(day.tmax);
      b.querySelector('.d-min').textContent = F.temp(day.tmin);
      const rg = b.querySelector('.d-range span');
      rg.style.left = pct(day.tmin) + '%';
      rg.style.width = Math.max(3, pct(day.tmax) - pct(day.tmin)) + '%';
      rg.style.background = `linear-gradient(90deg, ${tempColor(day.tmin)}, ${tempColor(day.tmax)})`;
      b.querySelector('.d-prec').textContent = `${F.num1(day.precip)} mm`;
      const wd = b.querySelector('.d-wind');
      if (day.windDir != null) wd.appendChild(arrow(day.windDir));
      wd.appendChild(document.createTextNode(`${Math.round(day.wind)} m/s`));
      b.addEventListener('click', () => {
        state.selected = day.date;
        list.querySelectorAll('.day').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        renderHours();
        if (window.innerWidth < 900) document.querySelector('.today').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  // ---------- vertailukaavio ----------
  function buildSeries(metric) {
    const d = state.data;
    const today = parseLocal(d.today);
    const byDate = {};
    d.daily.forEach((x) => (byDate[x.date] = x));
    const key = { mean: 'tmean', max: 'tmax', min: 'tmin' }[metric];
    const ext = d.extended || {};
    // Parviennusteen harhakorjaus: verrataan päätenneusteeseen päivinä +6…+15
    let bias = 0, n = 0;
    for (let o = 6; o <= 15; o++) {
      const ds = iso(addDays(today, o));
      const f = byDate[ds], e = ext[ds];
      if (f && e && f[key] != null && e[metric] != null) { bias += f[key] - e[metric]; n++; }
    }
    bias = n ? bias / n : 0;
    const days = [];
    for (let o = -30; o <= 30; o++) {
      const ds = iso(addDays(today, o));
      const f = byDate[ds];
      let cur = f ? f[key] : null, kind = o < 0 ? 'obs' : o === 0 ? 'now' : 'fc', lo = null, hi = null;
      if (o > 0 && (cur == null || o > 15) && ext[ds]) {
        cur = ext[ds][metric] + bias;
        kind = 'ext';
        if (metric === 'mean') { lo = ext[ds].lo + bias; hi = ext[ds].hi + bias; }
      }
      if (o > 15 && kind !== 'ext') cur = null;
      const ly = d.lastYear && d.lastYear[yearAgo(ds)];
      days.push({ offset: o, date: ds, cur, prev: ly ? ly[metric] : null, kind, lo, hi });
    }
    // Yhdistetään vaihteluväli edelliseen ennustepäivään, ettei kaistaan jää aukkoa
    const firstExt = days.findIndex((x) => x.kind === 'ext');
    if (firstExt > 0 && days[firstExt - 1].cur != null) { days[firstExt - 1].lo = days[firstExt - 1].hi = days[firstExt - 1].cur; }
    return days;
  }

  function avgDiff(days, from, to) {
    let s = 0, n = 0;
    days.forEach((x) => { if (x.offset >= from && x.offset <= to && x.cur != null && x.prev != null) { s += x.cur - x.prev; n++; } });
    return n >= 5 ? s / n : null;
  }

  function renderChart() {
    const d = state.data, metric = state.metric;
    const days = buildSeries(metric);
    const y = parseLocal(d.today).getUTCFullYear();
    const curLabel = String(y), prevLabel = String(y - 1);
    $('lgCur').textContent = `${curLabel} (tämä vuosi)`;
    $('lgPrev').textContent = `${prevLabel} (viime vuosi)`;
    const what = { mean: 'keskilämpötila', max: 'ylin lämpötila', min: 'alin lämpötila' }[metric];

    const phrase = (diff) => {
      if (diff == null) return null;
      const a = Math.abs(diff);
      if (a < 0.3) return 'suunnilleen sama kuin vuotta aiemmin';
      return `keskimäärin ${F.num1(a)} °C ${diff > 0 ? 'korkeampi' : 'matalampi'} kuin vuotta aiemmin`;
    };
    const past = phrase(avgDiff(days, -30, -1));
    const next = phrase(avgDiff(days, 1, 30));
    const parts = [];
    if (past) parts.push(`Viimeisten 30 päivän ${what} on ollut ${past}.`);
    if (next) parts.push(`Ennusteen mukaan seuraavan kuukauden ${what} on ${next}.`);
    if (!d.lastYear) parts.push('Viime vuoden vertailutietoja ei saatu haettua.');
    $('cmpSummary').textContent = parts.join(' ');

    const lastFc = days.filter((x) => x.cur != null).pop();
    const notes = [];
    if (!d.extended) notes.push('Pitkää ennustetta ei saatu, joten tämän vuoden käyrä päättyy noin kahden viikon päähän.');
    else notes.push('Yli 2 viikon päähän ulottuva osa on GFS-parviennusteen keskiarvo; varjostettu alue kertoo 10–90 %:n vaihteluvälin.');
    if (d.lastYear) notes.push('Viime vuoden arvot: ERA5-uusanalyysi.');
    $('cmpNote').textContent = notes.join(' ');

    chart.render({ days, curLabel, prevLabel, aria: `Viivakaavio: ${what} ${curLabel} ja ${prevLabel}, 30 päivää taaksepäin ja ${lastFc ? lastFc.offset : 0} päivää eteenpäin. ${parts.join(' ')}` });

    // taulukkonäkymä
    const tb = $('cmpTable');
    tb.textContent = '';
    const cap = document.createElement('caption');
    cap.textContent = `${what[0].toUpperCase() + what.slice(1)}, °C`;
    tb.appendChild(cap);
    const thead = tb.createTHead().insertRow();
    ['Päivä', curLabel, prevLabel, 'Ero'].forEach((h) => { const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; thead.appendChild(th); });
    const tbody = tb.createTBody();
    days.forEach((x) => {
      const tr = tbody.insertRow();
      if (x.offset === 0) tr.className = 'is-today';
      const dd = parseLocal(x.date);
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = `${WD_SHORT[dd.getUTCDay()]} ${dm(dd)}`;
      tr.appendChild(th);
      const kind = x.kind === 'fc' ? ' (e)' : x.kind === 'ext' ? ' (pe)' : '';
      [x.cur == null ? '–' : F.signed1(x.cur) + kind, x.prev == null ? '–' : F.signed1(x.prev), x.cur != null && x.prev != null ? F.signed1(x.cur - x.prev) : '–']
        .forEach((v) => { const td = tr.insertCell(); td.textContent = v; });
    });
  }

  // ---------- tausta ----------
  /** Vuorokaudenvaihe auringon korkeudesta: päivä ≥ 6°, hämärä ≥ −8°, muuten yö. */
  const phaseFromSun = (alt) => (alt >= 6 ? 'day' : alt >= -8 ? 'dusk' : 'night');

  /** Auringon ja kuun tiedot nyt (tai esikatselun vuorokaudenajalla). */
  function skyNow(lat, lon, previewTime) {
    const a = WX.astro.position(Date.now(), lat, lon);
    const south = lat < 0;
    const r = {
      sunAlt: a.sun.alt, sunAz: a.sun.az, moonAlt: a.moon.alt, moonAz: a.moon.az,
      moonPhase: a.moon.phase, moonFrac: a.moon.fraction,
    };
    if (previewTime) {
      const P = { day: [35, 20], dusk: [4.5, 50], night: [-25, 0] }[previewTime] || [35, 20];
      r.sunAlt = P[0];
      r.sunAz = (south ? 0 : 180) + P[1] * (south ? -1 : 1);
      if (previewTime === 'night' && r.moonAlt < 10) { r.moonAlt = 30; r.moonAz = south ? 40 : 140; }
    }
    r.phase = phaseFromSun(r.sunAlt);
    return r;
  }

  /** Jäätilanne pakkasvuorokausista (viimeiset ~150 päivää): open / partial / frozen. */
  function iceState(d, sea) {
    const today = parseLocal(d.today);
    const byDate = {};
    d.daily.forEach((x) => (byDate[x.date] = x));
    let fdd = 0, n = 0;
    for (let o = -150; o <= 0; o++) {
      const ds = iso(addDays(today, o));
      let t = byDate[ds] && byDate[ds].tmean != null ? byDate[ds].tmean : null;
      if (t == null && d.lastYear && d.lastYear[ds]) t = d.lastYear[ds].mean;
      if (t == null) continue;
      n++;
      fdd = t < 0 ? Math.min(600, fdd - t) : Math.max(0, fdd - t * 1.5); // sulaminen nopeampaa kuin jäätyminen
    }
    if (n < 20) return null;
    const k = sea ? 2.5 : 1;
    return fdd >= 30 * k ? 'frozen' : fdd >= 8 * k ? 'partial' : 'open';
  }

  function currentEvents() {
    const d = state.data, p = state.place;
    if (!d || !p) return { fx: {}, flag: null, greeting: null };
    const pe = $('pvEvent').value || params.get('event');
    const style = ($('pvStyle').value || params.get('region')) || placeClass().style;
    return WX.events.active(d.now, p.cc, style, pe);
  }

  function updateScene() {
    const d = state.data, p = state.place, env = state.env || {};
    const lat = p ? p.lat : 60, lon = p ? p.lon : 25;
    const pt = $('pvTime').value || params.get('time');
    const sky = skyNow(lat, lon, pt);
    const s = Object.assign({
      code: d ? d.current.code : 2,
      temp: d ? d.current.temp : 10,
      month: d ? d.now.getUTCMonth() + 1 : new Date().getMonth() + 1,
      lat,
      wind: d ? d.current.wind : 3,
      windDir: d ? d.current.windDir : 270,
      seed: WX.hashString(p ? p.name : 'gigasää'),
      season: null,
      settlement: 'rural',
      style: 'nordic',
      biome: 'boreal',
      evergreen: false,
      ice: false,
      cc: p ? p.cc : null,
      snowDepth: d ? d.current.snowDepth : null,
      iceState: null,
      coast: env.coast != null ? env.coast : null,
      waves: env.waves,
      relief: env.relief ? env.relief.relief : null,
      peak: env.relief ? env.relief.peak : null,
      aurora: env.kp != null ? WX.astro.auroraStrength(env.kp, lat, lon) : 0,
      ev: currentEvents(),
    }, sky);
    if (p && d) {
      const c = placeClass();
      Object.assign(s, { settlement: c.settlement, style: c.style, biome: c.biome });
      if (c.climate) { s.evergreen = c.climate.Tc >= 10; s.ice = c.climate.code === 'EF'; }
      s.iceState = iceState(d, env.coast === true);
    }
    const pick = (id, key) => $(id).value || params.get(key);
    if (pick('pvSettle', 'settle')) s.settlement = pick('pvSettle', 'settle');
    if (pick('pvStyle', 'region')) s.style = pick('pvStyle', 'region');
    if (pick('pvBiome', 'biome')) { s.biome = pick('pvBiome', 'biome'); s.evergreen = false; s.ice = false; }
    if (pick('pvCoast', 'coast')) s.coast = pick('pvCoast', 'coast') === '1';
    if (pick('pvKp', 'kp')) s.aurora = WX.astro.auroraStrength(parseFloat(pick('pvKp', 'kp')), lat, lon);
    if (pick('pvWind', 'wind')) s.wind = parseFloat(pick('pvWind', 'wind'));
    if (pick('pvRelief', 'relief')) { s.relief = parseFloat(pick('pvRelief', 'relief')); s.peak = s.relief * 2.2; }
    const pv = $('pvScene').value || params.get('scene');
    const ps = $('pvSeason').value || params.get('season');
    if (pv && WX.PRESETS[pv] != null) s.code = WX.PRESETS[pv];
    if (ps) s.season = ps;
    if (s.season === 'winter' && s.temp > 0) s.temp = -4;
    if (s.season && s.season !== 'winter' && s.temp < 2) s.temp = 8;
    if (s.season || pv) { s.snowDepth = null; s.iceState = null; }
    document.body.dataset.phase = s.phase;
    scene.set(s);
    updateOcclusion();
    mascot.set({ cc: s.cc, kind: pick('pvMascot', 'mascot') || null, temp: s.temp, code: s.code, phase: s.phase, windX: scene.sc ? scene.sc.windX : 0, ev: s.ev });
    labelMascot();
  }

  // ---------- haku ----------
  function setupSearch() {
    const input = $('q'), box = $('suggest');
    let items = [], active = -1, timer, seq = 0;
    const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
    const choose = (p) => { close(); input.value = ''; input.blur(); state.selected = null; load({ name: p.name, lat: p.lat, lon: p.lon, pop: p.pop, cc: p.cc, fc: p.fc }); };
    const draw = () => {
      box.textContent = '';
      if (!items.length) { close(); return; }
      items.forEach((p, i) => {
        const li = document.createElement('li');
        li.role = 'option';
        li.id = 'sg' + i;
        li.setAttribute('aria-selected', String(i === active));
        const hand = document.createElement('img');
        hand.className = 'px hand'; hand.src = WX.handURL(); hand.alt = ''; hand.width = 32; hand.height = 22;
        const n = document.createElement('b'); n.textContent = p.name;
        const s = document.createElement('small'); s.textContent = p.detail;
        li.append(hand, n, s);
        li.addEventListener('mousedown', (e) => { e.preventDefault(); choose(p); });
        box.appendChild(li);
      });
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      input.setAttribute('aria-activedescendant', active >= 0 ? 'sg' + active : '');
    };
    async function search(q) {
      const my = ++seq;
      let res;
      try {
        res = DEMO ? [] : await WX.api.geocode(q);
      } catch (e) {
        res = [];
      }
      if (!res.length) {
        const qq = q.toLowerCase();
        res = FALLBACK_PLACES.filter((p) => p.name.toLowerCase().startsWith(qq));
      }
      if (my !== seq) return items;
      items = res; active = res.length ? 0 : -1;
      draw();
      return items;
    }
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const q = input.value.trim();
      if (q.length < 2) { items = []; close(); return; }
      timer = setTimeout(() => search(q), 250);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        draw();
      } else if (e.key === 'Escape') close();
    });
    input.addEventListener('blur', () => setTimeout(close, 150));
    $('search').addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) return;
      if (!items.length) await search(q);
      if (items.length) choose(items[Math.max(0, active)]);
      else setStatus(`Paikkaa ”${q}” ei löytynyt.`);
    });
  }

  function setupLocate() {
    $('locate').addEventListener('click', () => {
      if (!navigator.geolocation) { setStatus('Selaimesi ei tue paikannusta.'); return; }
      $('locate').classList.add('busy');
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const rev = (DEMO ? null : await WX.api.reverse(lat, lon)) || {};
        $('locate').classList.remove('busy');
        state.selected = null;
        load({ name: rev.name || 'Oma sijainti', lat, lon, cc: rev.cc || undefined, geo: true });
      }, (err) => {
        $('locate').classList.remove('busy');
        setStatus(err.code === 1 ? 'Sijainnin käyttö estettiin selaimessa.' : 'Sijaintia ei saatu selvitettyä.');
      }, { timeout: 10000, maximumAge: 600000 });
    });
  }

  // ---------- maskotti ----------
  const regionName = (() => {
    try {
      const dn = new Intl.DisplayNames(['fi'], { type: 'region' });
      return (cc) => { try { return cc ? dn.of(cc.toUpperCase()) : null; } catch (e) { return null; } };
    } catch (e) { return () => null; }
  })();

  function labelMascot() {
    const p = state.place, cn = p && p.cc ? regionName(p.cc) : null;
    const t = `Maskotti: ${mascot.name()}${cn ? ' (' + cn + ')' : ''}. Paina, niin se kommentoi säätä.`;
    $('mascotBtn').setAttribute('aria-label', t);
    $('mascotBtn').title = t;
  }

  /** Maskotin kommentti vallitsevaan säähän. */
  function remark() {
    const d = state.data;
    if (!d) return 'Hetki, haen säätä…';
    const c = d.current, sc = WX.describe(c.code).scene, ev = currentEvents();
    const t = c.temp, phase = scene.sc ? scene.sc.phase : 'day';
    if (ev.greeting && Math.random() < 0.5) return ev.greeting;
    if (sc.thunder) return 'Ukkonen jyrisee – pysy sisällä!';
    if (sc.precip === 'snow') return t <= -10 ? `Brr! ${F.temp(t)} ja lunta sataa.` : 'Lunta sataa! Hyvä hiihtokeli.';
    if (sc.precip !== 'none') return sc.amount > 0.7 ? 'Nyt sataa kunnolla – sateenvarjo mukaan!' : 'Ota sateenvarjo mukaan!';
    if (c.wind >= 12) return 'Tuulee kovaa – pidä hatusta kiinni!';
    if (sc.fog) return 'Sumuista – liiku varovasti.';
    if (t <= -15) return `Brr, ${F.temp(t)}! Pipo päähän ja lapaset käteen.`;
    if (phase === 'night') {
      const kp = state.env && state.env.kp;
      return kp != null && WX.astro.auroraStrength(kp, state.place.lat, state.place.lon) > 0.3 && sc.clouds < 0.6 ? 'Katso taivaalle – revontulia!' : 'Hyvää yötä! Zzz…';
    }
    if (t <= 0) return 'Pakkasta – muista lapaset!';
    if (t >= 27) return 'Helle! Juo vettä ja muista aurinkorasva.';
    if (sc.clouds <= 0.25) return 'Ihana poutapäivä!';
    if (sc.clouds >= 0.9) return 'Pilvistä, mutta poutaa.';
    return `Sää on ${WX.describe(c.code).text.toLowerCase()}, ${F.temp(t)}.`;
  }

  // ---------- taustan näkyvät alueet ja maisematila ----------
  /** Kertoo taustalle, mitkä ruudun kohdat käyttöliittymä peittää, jotta eläimet osaavat pysyä näkyvillä. */
  let occPending = false;
  function updateOcclusion() {
    if (occPending || !scene) return;
    occPending = true;
    requestAnimationFrame(() => {
      occPending = false;
      const rects = [];
      document.querySelectorAll('.window:not([hidden]), .topbar .search, .topbar .btn').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || r.bottom < 0 || r.top > window.innerHeight) return;
        rects.push([r.left, r.top, r.right, r.bottom]);
      });
      scene.setOcclusion(rects);
    });
  }

  function setScenic(on) {
    document.body.classList.toggle('scenic', on);
    const b = $('scenic');
    b.setAttribute('aria-pressed', String(on));
    b.title = on ? 'Näytä säätiedot' : 'Näytä koko maisema';
    b.setAttribute('aria-label', b.title);
    if (on) window.scrollTo(0, 0);
    updateOcclusion();
  }

  // ---------- käynnistys ----------
  function init() {
    scene = WX.scene = new WX.PixelScene($('bg'));
    mascot = new WX.Mascot($('mascot'), $('mascotBtn'), $('mascotBubble'));
    $('mascotBtn').addEventListener('click', () => mascot.react(remark()));
    WX.MASCOT_KINDS.forEach(([k, n]) => { const o = document.createElement('option'); o.value = k; o.textContent = n; $('pvMascot').appendChild(o); });
    chart = new WX.YearChart($('chart'));
    const PV = { scene: 'pvScene', time: 'pvTime', season: 'pvSeason', settle: 'pvSettle', region: 'pvStyle', biome: 'pvBiome', coast: 'pvCoast', kp: 'pvKp', event: 'pvEvent', wind: 'pvWind', relief: 'pvRelief', mascot: 'pvMascot' };
    Object.entries(PV).forEach(([k, id]) => {
      const sel = $(id);
      if (params.get(k)) sel.value = params.get(k);
      sel.addEventListener('change', () => { updateScene(); if (state.data && k === 'event') renderNow(); });
    });
    if (Object.keys(PV).some((k) => params.get(k))) document.querySelector('.preview').open = true;
    updateScene();
    setupSearch();
    setupLocate();
    $('scenic').addEventListener('click', () => setScenic(!document.body.classList.contains('scenic')));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('scenic') && document.activeElement !== $('q')) setScenic(false);
    });
    window.addEventListener('scroll', updateOcclusion, { passive: true });
    let rz;
    window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(updateOcclusion, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateOcclusion);
    document.querySelectorAll('.seg button').forEach((b) =>
      b.addEventListener('click', () => {
        state.metric = b.dataset.metric;
        document.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (state.data) renderChart();
      }));
    $('weekMore').addEventListener('click', () => {
      state.weekDays = state.weekDays === 7 ? 14 : 7;
      $('weekMore').textContent = state.weekDays === 7 ? 'Näytä 2 viikkoa' : 'Näytä viikko';
      $('weekMore').setAttribute('aria-expanded', String(state.weekDays > 7));
      $('weekTitle').textContent = state.weekDays === 7 ? 'Viikon sää' : 'Kahden viikon sää';
      if (state.data) renderWeek();
      updateOcclusion();
    });
    load(readPlace() || DEFAULT);
    // päivitys 15 min välein ja kun välilehti palaa näkyviin
    let lastLoad = Date.now();
    const refresh = () => { if (state.place && Date.now() - lastLoad > 14 * 60000) { lastLoad = Date.now(); load(state.place, true); } };
    setInterval(refresh, 60000);
    setInterval(() => { if (state.data && !document.hidden) updateScene(); }, 5 * 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }

  init();
})();
