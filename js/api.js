/* Säädatan haku Open-Meteosta (https://open-meteo.com, CC BY 4.0, ei API-avainta).
 *   - forecast:  nykyhetki, tunti- ja päiväennuste 16 päivää + 31 päivää taaksepäin
 *   - ensemble:  GFS-parviennuste 35 päivää → kuukauden lämpötilaennusteen loppuosa
 *   - archive:   ERA5-uusanalyysi → viime vuoden vastaava jakso
 *   - geocoding: paikkahaku
 * Kaikki ajat käsitellään paikallisaikana "naiiveina" UTC-päivämäärinä (getUTC*),
 * jolloin selaimen oma aikavyöhyke ei sekoita laskuja. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});

  const DAY = 86400000;
  const iso = (d) => d.toISOString().slice(0, 10);
  const parseLocal = (s) => new Date(s.length === 10 ? s + 'T00:00:00Z' : s.length === 16 ? s + ':00Z' : s + 'Z');
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  /** Sama päivämäärä vuotta aiemmin (29.2. → 28.2.) */
  function yearAgo(dateStr) {
    let [y, m, d] = dateStr.split('-').map(Number);
    if (m === 2 && d === 29) d = 28;
    return `${y - 1}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  WX.dates = { iso, parseLocal, addDays, yearAgo, DAY };

  async function getJSON(url, timeout) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout || 15000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      let body = null;
      try { body = await res.json(); } catch (e) { /* ei JSONia */ }
      if (!res.ok || (body && body.error)) throw new Error((body && body.reason) || `HTTP ${res.status}`);
      return body;
    } finally {
      clearTimeout(t);
    }
  }
  const qs = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  const CURRENT = 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day';
  const HOURLY = 'temperature_2m,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,is_day,snow_depth';
  const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,sunrise,sunset';

  const api = {};

  api.geocode = async function (name) {
    const r = await getJSON('https://geocoding-api.open-meteo.com/v1/search?' + qs({ name, count: 8, language: 'fi', format: 'json' }), 8000);
    return (r.results || []).map((p) => ({
      name: p.name,
      detail: [p.admin1 && p.admin1 !== p.name ? p.admin1 : null, p.country].filter(Boolean).join(', '),
      lat: p.latitude,
      lon: p.longitude,
      pop: p.population || null,
      cc: p.country_code || null,
      fc: p.feature_code || null,
    }));
  };

  api.reverse = async function (lat, lon) {
    try {
      const r = await getJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?' + qs({ latitude: lat, longitude: lon, localityLanguage: 'fi' }), 6000);
      return { name: r.city || r.locality || r.principalSubdivision || null, cc: r.countryCode || null };
    } catch (e) {
      return null;
    }
  };

  api.forecastRaw = (lat, lon) =>
    getJSON('https://api.open-meteo.com/v1/forecast?' + qs({
      latitude: lat, longitude: lon, current: CURRENT, hourly: HOURLY, daily: DAILY,
      wind_speed_unit: 'ms', timezone: 'auto', past_days: 31, forecast_days: 16,
    }));

  // Kokeillaan malleja järjestyksessä; ensimmäinen toimiva kelpaa.
  api.ensembleRaw = async function (lat, lon) {
    let err;
    for (const model of ['gfs05', 'gfs_seamless']) {
      try {
        return await getJSON('https://ensemble-api.open-meteo.com/v1/ensemble?' + qs({
          latitude: lat, longitude: lon, hourly: 'temperature_2m', models: model, forecast_days: 35, timezone: 'auto',
        }), 20000);
      } catch (e) { err = e; }
    }
    throw err;
  };

  api.archiveRaw = (lat, lon, start, end) =>
    getJSON('https://archive-api.open-meteo.com/v1/archive?' + qs({
      latitude: lat, longitude: lon, start_date: start, end_date: end,
      daily: 'temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum', timezone: 'auto',
    }), 20000);

  // ---------- jäsentäminen ----------
  function mean(a) { const v = a.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }

  api.parseForecast = function (r) {
    const off = r.utc_offset_seconds || 0;
    const now = new Date(Date.now() + off * 1000);
    const c = r.current;
    const current = {
      time: parseLocal(c.time), temp: c.temperature_2m, feels: c.apparent_temperature, humidity: c.relative_humidity_2m,
      precip: c.precipitation, code: c.weather_code, cloud: c.cloud_cover, pressure: c.pressure_msl,
      wind: c.wind_speed_10m, windDir: c.wind_direction_10m, gust: c.wind_gusts_10m, isDay: !!c.is_day,
    };
    const h = r.hourly;
    const hourly = h.time.map((t, i) => ({
      time: parseLocal(t), date: t.slice(0, 10), temp: h.temperature_2m[i], precip: h.precipitation[i],
      prob: h.precipitation_probability ? h.precipitation_probability[i] : null, code: h.weather_code[i],
      wind: h.wind_speed_10m[i], windDir: h.wind_direction_10m[i], isDay: !!h.is_day[i],
      snow: h.snow_depth ? h.snow_depth[i] : null,
    }));
    const byDate = {};
    hourly.forEach((x) => (byDate[x.date] = byDate[x.date] || []).push(x.temp));
    const d = r.daily;
    const daily = d.time.map((t, i) => ({
      date: t, code: d.weather_code[i], tmax: d.temperature_2m_max[i], tmin: d.temperature_2m_min[i],
      tmean: byDate[t] && byDate[t].filter((v) => v != null).length >= 18 ? mean(byDate[t]) : null,
      precip: d.precipitation_sum[i], prob: d.precipitation_probability_max ? d.precipitation_probability_max[i] : null,
      wind: d.wind_speed_10m_max[i], windDir: d.wind_direction_10m_dominant ? d.wind_direction_10m_dominant[i] : null,
      sunrise: d.sunrise[i] ? parseLocal(d.sunrise[i]) : null, sunset: d.sunset[i] ? parseLocal(d.sunset[i]) : null,
    }));
    // lumensyvyys (m) kuluvalta tunnilta
    const hourStart = Math.floor(now.getTime() / 3600000) * 3600000;
    const curHour = hourly.find((x) => x.time.getTime() === hourStart);
    current.snowDepth = curHour && curHour.snow != null ? curHour.snow : null;
    return { offset: off, timezone: r.timezone, elevation: r.elevation, now, today: iso(now), current, hourly, daily };
  };

  /** Parviennusteen päiväkeskiarvot: jäsenten keskiarvo sekä 10/90 %:n vaihteluväli */
  api.parseEnsemble = function (r) {
    const h = r.hourly;
    const keys = Object.keys(h).filter((k) => k.startsWith('temperature_2m'));
    const out = {};
    const dates = [];
    const idx = {};
    h.time.forEach((t, i) => {
      const d = t.slice(0, 10);
      if (!idx[d]) { idx[d] = []; dates.push(d); }
      idx[d].push(i);
    });
    dates.forEach((d) => {
      const means = [], maxs = [], mins = [];
      keys.forEach((k) => {
        const vals = idx[d].map((i) => h[k][i]).filter((v) => v != null);
        if (vals.length < 4) return;
        means.push(vals.reduce((a, b) => a + b, 0) / vals.length);
        maxs.push(Math.max.apply(null, vals));
        mins.push(Math.min.apply(null, vals));
      });
      if (!means.length) return;
      const s = means.slice().sort((a, b) => a - b);
      const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
      out[d] = { mean: mean(means), max: mean(maxs), min: mean(mins), lo: q(0.1), hi: q(0.9), n: means.length };
    });
    return out;
  };

  api.parseArchive = function (r) {
    const d = r.daily, out = {};
    d.time.forEach((t, i) => {
      out[t] = { mean: d.temperature_2m_mean[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], precip: d.precipitation_sum ? d.precipitation_sum[i] : null };
    });
    return out;
  };

  /** Köppenin luokka viimeisen 365 päivän datasta (jos saatavilla) */
  function climateFrom(arch, today, lat) {
    const from = iso(addDays(parseLocal(today), -372));
    const days = Object.keys(arch).filter((k) => k > from).map((k) => ({ date: k, mean: arch[k].mean, precip: arch[k].precip }));
    return days.length >= 330 ? WX.place.koppen(days, lat) : null;
  }

  /** Hakee kaiken tarvittavan. Pakollinen: ennuste. Valinnaiset: parvi ja viime vuosi. */
  api.loadAll = async function (lat, lon, demo) {
    const src = demo ? WX.demo : api;
    const fc = api.parseForecast(await src.forecastRaw(lat, lon));
    const start = iso(addDays(parseLocal(fc.today), -31));
    const end = iso(addDays(parseLocal(fc.today), 31));
    // Yksi arkistohaku kattaa sekä viime vuoden vertailujakson että viimeisen vuoden ilmastoluokitusta varten.
    // ERA5:n viive on n. 5 päivää, joten haku päättyy viikko sitten. Jos pitkä haku epäonnistuu, haetaan vain vertailujakso.
    const climEnd = iso(addDays(parseLocal(fc.today), -7));
    const archive = src.archiveRaw(lat, lon, yearAgo(start), climEnd)
      .catch(() => src.archiveRaw(lat, lon, yearAgo(start), yearAgo(end)))
      .then(api.parseArchive);
    const [ens, arch] = await Promise.allSettled([src.ensembleRaw(lat, lon).then(api.parseEnsemble), archive]);
    fc.extended = ens.status === 'fulfilled' ? ens.value : null;
    fc.lastYear = arch.status === 'fulfilled' ? arch.value : null;
    fc.climate = fc.lastYear ? climateFrom(fc.lastYear, fc.today, lat) : null;
    if (ens.status === 'rejected') console.warn('Pitkä ennuste ei saatavilla:', ens.reason);
    if (arch.status === 'rejected') console.warn('Viime vuoden data ei saatavilla:', arch.reason);
    return fc;
  };

  // ---------- ympäristödata taustakuvaa varten (kaikki valinnaisia) ----------
  const cacheGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const cacheSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ei tilaa */ } };
  const keyOf = (lat, lon) => lat.toFixed(2) + ',' + lon.toFixed(2);

  /** Planetaarinen Kp-indeksi (NOAA SWPC). Välimuisti 15 min. */
  api.kp = async function () {
    const c = cacheGet('gigasaa.kp');
    if (c && Date.now() - c.t < 15 * 60000) return c.v;
    const parse = (arr) => {
      for (let i = arr.length - 1; i >= 0; i--) {
        const r = arr[i];
        const v = Array.isArray(r) ? parseFloat(r[1]) : parseFloat(r.estimated_kp != null ? r.estimated_kp : r.kp_index != null ? r.kp_index : r.Kp != null ? r.Kp : r.kp);
        if (isFinite(v)) return v;
      }
      return null;
    };
    let v = null;
    try { v = parse(await getJSON('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json', 8000)); } catch (e) { /* kokeillaan toista */ }
    if (v == null) v = parse(await getJSON('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', 8000));
    if (v != null) cacheSet('gigasaa.kp', { t: Date.now(), v });
    return v;
  };

  /** Onko merenranta 5 km säteellä (OpenStreetMap natural=coastline, Overpass API). Välimuisti paikkakohtaisesti. */
  api.coast = async function (lat, lon) {
    const k = 'gigasaa.coast.' + keyOf(lat, lon);
    const c = cacheGet(k);
    if (c != null) return c;
    const q = `[out:json][timeout:10];way(around:5000,${lat.toFixed(4)},${lon.toFixed(4)})[natural=coastline];out ids 1;`;
    const r = await getJSON('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q), 12000);
    const v = !!(r.elements && r.elements.length);
    cacheSet(k, v);
    return v;
  };

  /** Aallonkorkeus (m) lähimmästä merilaskentaruudusta (Open-Meteo Marine). */
  api.waves = async function (lat, lon) {
    const r = await getJSON('https://marine-api.open-meteo.com/v1/marine?' + qs({ latitude: lat, longitude: lon, current: 'wave_height' }), 8000);
    return r.current && r.current.wave_height != null ? r.current.wave_height : null;
  };

  /** Maaston korkeuserot: keskipiste ja 16 pistettä 10 ja 25 km:n säteellä (Open-Meteo Elevation). */
  api.relief = async function (lat, lon) {
    const k = 'gigasaa.relief.' + keyOf(lat, lon);
    const c = cacheGet(k);
    if (c) return c;
    const la = [lat], lo = [lon];
    [10, 25].forEach((km) => {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        la.push(lat + (km / 111) * Math.cos(a));
        lo.push(lon + (km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))) * Math.sin(a));
      }
    });
    const r = await getJSON('https://api.open-meteo.com/v1/elevation?' + qs({ latitude: la.map((v) => v.toFixed(4)).join(','), longitude: lo.map((v) => v.toFixed(4)).join(',') }), 8000);
    const e = (r.elevation || []).filter((v) => v != null && isFinite(v));
    if (!e.length) throw new Error('ei korkeusdataa');
    const v = { elev: e[0], peak: Math.max.apply(null, e), relief: Math.max.apply(null, e) - Math.min.apply(null, e) };
    cacheSet(k, v);
    return v;
  };

  /** Kaikki ympäristötiedot rinnakkain; epäonnistuneet jäävät null-arvoiksi. */
  api.loadEnv = async function (lat, lon, demo) {
    const src = demo ? WX.demo : api;
    const [kp, coast, relief] = await Promise.allSettled([src.kp(), src.coast(lat, lon), src.relief(lat, lon)]);
    const env = {
      kp: kp.status === 'fulfilled' ? kp.value : null,
      coast: coast.status === 'fulfilled' ? coast.value : null,
      relief: relief.status === 'fulfilled' ? relief.value : null,
      waves: null,
    };
    if (env.coast) { try { env.waves = await src.waves(lat, lon); } catch (e) { /* ei aaltodataa */ } }
    return env;
  };

  WX.api = api;
})();
