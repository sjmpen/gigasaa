/* Demotila (?demo=1): tuottaa synteettistä, mutta uskottavaa säädataa samassa
 * muodossa kuin Open-Meteon rajapinnat. Käytetään testaukseen ilman verkkoa. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const DAY = 86400000;
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const doy = (d) => Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;

  function clim(d, lat) {
    const amp = Math.min(14, Math.abs(lat) * 0.19);
    const base = 27 - Math.abs(lat) * 0.35;
    const s = lat < 0 ? -1 : 1;
    return base + 4 + s * amp * Math.sin((2 * Math.PI * (doy(d) - 115)) / 365);
  }
  function anomaly(ms, seed) {
    const n = ms / DAY;
    return 3 * Math.sin(n * 0.21 + seed) + 2 * Math.sin(n * 0.53 + seed * 2) + 1.2 * Math.sin(n * 1.3 + seed * 3);
  }
  function temp(ms, lat, seed) {
    const d = new Date(ms);
    const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
    return clim(d, lat) + anomaly(ms, seed) + 2.4 * Math.sin(((hour - 8) / 24) * 2 * Math.PI);
  }
  function wet(ms) {
    const n = ms / DAY;
    return 0.6 * Math.sin(n * 0.9) + 0.45 * Math.sin(n * 2.3 + 1) + 0.25 * Math.sin(n * 7.1);
  }
  function weather(ms, t) {
    const w = wet(ms);
    const snow = t < 0.8;
    if (w > 0.95) return [snow ? 75 : 65, 1.6 + (w - 0.95) * 4];
    if (w > 0.72) return [snow ? 73 : 63, 0.7 + (w - 0.72) * 3];
    if (w > 0.5) return [snow ? 71 : (Math.floor(ms / DAY) % 3 === 0 ? 80 : 61), 0.2 + (w - 0.5) * 2];
    if (w > 0.2) return [3, 0];
    if (w > -0.2) return [2, 0];
    if (w > -0.55) return [1, 0];
    return [0, 0];
  }
  function sun(dayMs, lat, lon, off) {
    const d = new Date(dayMs);
    const decl = (-23.44 * Math.cos(((2 * Math.PI) / 365) * (doy(d) + 10)) * Math.PI) / 180;
    const cosw = -Math.tan((lat * Math.PI) / 180) * Math.tan(decl);
    if (cosw <= -1) return ['polar-day'];
    if (cosw >= 1) return ['polar-night'];
    const half = (Math.acos(cosw) * 180) / Math.PI / 15;
    const noon = 12 + ((off / 3600) * 15 - lon) / 15;
    return [dayMs + (noon - half) * 3600000, dayMs + (noon + half) * 3600000];
  }
  const r1 = (v) => Math.round(v * 10) / 10;

  const demo = {};
  demo.forecastRaw = async function (lat, lon) {
    const off = -new Date().getTimezoneOffset() * 60;
    const now = Date.now() + off * 1000;
    const today = Math.floor(now / DAY) * DAY;
    const start = today - 31 * DAY, end = today + 16 * DAY;
    const H = { time: [], temperature_2m: [], precipitation: [], precipitation_probability: [], weather_code: [], wind_speed_10m: [], wind_direction_10m: [], is_day: [] };
    const D = { time: [], weather_code: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], precipitation_probability_max: [], wind_speed_10m_max: [], wind_direction_10m_dominant: [], sunrise: [], sunset: [] };
    for (let day = start; day < end; day += DAY) {
      const st = sun(day, lat, lon, off);
      let mx = -99, mn = 99, ps = 0, pp = 0, wmax = 0, worst = 0;
      for (let h = 0; h < 24; h++) {
        const ms = day + h * 3600000;
        const t = temp(ms, lat, 1);
        const [code, mm] = weather(ms, t);
        const isDay = st[0] === 'polar-day' ? 1 : st[0] === 'polar-night' ? 0 : ms >= st[0] && ms < st[1] ? 1 : 0;
        const wind = 3 + 2.5 * Math.sin(ms / DAY * 1.7) + 1.5 * Math.sin(ms / 3600000 * 0.4) + (mm > 0 ? 2 : 0);
        const prob = Math.round(Math.max(0, Math.min(100, (wet(ms) + 0.1) * 90)));
        H.time.push(fmt(new Date(ms)));
        H.temperature_2m.push(r1(t));
        H.precipitation.push(r1(mm));
        H.precipitation_probability.push(prob);
        H.weather_code.push(code);
        H.wind_speed_10m.push(r1(Math.max(0.5, wind)));
        H.wind_direction_10m.push(Math.round((200 + 80 * Math.sin(ms / DAY)) % 360));
        H.is_day.push(isDay);
        mx = Math.max(mx, t); mn = Math.min(mn, t); ps += mm; pp = Math.max(pp, prob); wmax = Math.max(wmax, wind);
        if (h >= 8 && h <= 20 && code > worst) worst = code;
      }
      D.time.push(fmt(new Date(day)).slice(0, 10));
      D.weather_code.push(worst);
      D.temperature_2m_max.push(r1(mx));
      D.temperature_2m_min.push(r1(mn));
      D.precipitation_sum.push(r1(ps));
      D.precipitation_probability_max.push(pp);
      D.wind_speed_10m_max.push(r1(wmax));
      D.wind_direction_10m_dominant.push(Math.round((200 + 80 * Math.sin(day / DAY)) % 360));
      D.sunrise.push(typeof st[0] === 'number' ? fmt(new Date(st[0])) : null);
      D.sunset.push(typeof st[1] === 'number' ? fmt(new Date(st[1])) : null);
    }
    const cur = Math.floor(now / 900000) * 900000;
    const ct = temp(cur, lat, 1);
    const [cc, cmm] = weather(cur, ct);
    const st = sun(today, lat, lon, off);
    return {
      latitude: lat, longitude: lon, utc_offset_seconds: off, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      current: {
        time: fmt(new Date(cur)), temperature_2m: r1(ct), apparent_temperature: r1(ct - 3.2), relative_humidity_2m: 84,
        precipitation: r1(cmm), weather_code: cc, cloud_cover: cc >= 3 ? 100 : cc * 30, pressure_msl: 1008.4,
        wind_speed_10m: 4.6, wind_direction_10m: 225, wind_gusts_10m: 9.8,
        is_day: typeof st[0] === 'number' ? (cur >= st[0] && cur < st[1] ? 1 : 0) : st[0] === 'polar-day' ? 1 : 0,
      },
      hourly: H, daily: D,
    };
  };

  demo.ensembleRaw = async function (lat) {
    const off = -new Date().getTimezoneOffset() * 60;
    const today = Math.floor((Date.now() + off * 1000) / DAY) * DAY;
    const out = { time: [], temperature_2m: [] };
    for (let m = 1; m <= 30; m++) out['temperature_2m_member' + pad(m)] = [];
    for (let ms = today; ms < today + 35 * DAY; ms += 3600000) {
      out.time.push(fmt(new Date(ms)));
      const lead = (ms - today) / DAY;
      const truth = temp(ms, lat, 1) - 0.8; // tahallinen harha → testaa harhakorjauksen
      out.temperature_2m.push(r1(truth));
      for (let m = 1; m <= 30; m++) {
        const noise = Math.sin(lead * (0.3 + m * 0.05) + m) * (0.3 + lead * 0.13) + Math.sin(lead * 0.9 + m * 2) * lead * 0.05;
        out['temperature_2m_member' + pad(m)].push(r1(truth + noise - lead * 0.05 * Math.sin(lead / 5)));
      }
    }
    return { utc_offset_seconds: off, hourly: out };
  };

  demo.archiveRaw = async function (lat, lon, start, end) {
    const D = { time: [], temperature_2m_mean: [], temperature_2m_max: [], temperature_2m_min: [] };
    for (let ms = Date.parse(start); ms <= Date.parse(end); ms += DAY) {
      const m = clim(new Date(ms), lat) + anomaly(ms, 7);
      D.time.push(fmt(new Date(ms)).slice(0, 10));
      D.temperature_2m_mean.push(r1(m));
      D.temperature_2m_max.push(r1(m + 2.6));
      D.temperature_2m_min.push(r1(m - 2.4));
    }
    return { daily: D };
  };

  WX.demo = demo;
})();
