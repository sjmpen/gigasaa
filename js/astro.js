/* Tähtitiedettä taustakuvaa varten: auringon ja kuun paikka taivaalla, kuun vaihe sekä
 * revontulten näkyvyys geomagneettisesta leveysasteesta ja Kp-indeksistä.
 * Kaavat ovat tavanomaisia matalan tarkkuuden kaavoja (tarkkuus n. 1°), mikä riittää kuvitukseen. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const rad = Math.PI / 180;
  const OBL = rad * 23.4397; // ekliptikan kaltevuus

  const toDays = (ms) => ms / 86400000 - 0.5 + 2440588 - 2451545; // päiviä J2000.0:sta
  const rightAsc = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));
  const declin = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
  const sidereal = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const altitude = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));

  function sunCoords(d) {
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    return { dec: declin(L, 0), ra: rightAsc(L, 0) };
  }
  function moonCoords(d) {
    const L = rad * (218.316 + 13.176396 * d);
    const M = rad * (134.963 + 13.064993 * d);
    const F = rad * (93.272 + 13.22935 * d);
    const l = L + rad * 6.289 * Math.sin(M);
    const b = rad * 5.128 * Math.sin(F);
    return { ra: rightAsc(l, b), dec: declin(l, b), dist: 385001 - 20905 * Math.cos(M) };
  }
  // korkeus ja atsimuutti asteina (atsimuutti pohjoisesta myötäpäivään)
  function altAz(c, d, lat, lon) {
    const lw = rad * -lon, phi = rad * lat;
    const H = sidereal(d, lw) - c.ra;
    return { alt: altitude(H, phi, c.dec) / rad, az: ((azimuth(H, phi, c.dec) / rad + 180) % 360 + 360) % 360 };
  }

  /** Auringon ja kuun sijainnit sekä kuun valaistus hetkellä ms (UTC-millisekunnit). */
  function position(ms, lat, lon) {
    const d = toDays(ms);
    const s = sunCoords(d), m = moonCoords(d);
    const sun = altAz(s, d, lat, lon), moon = altAz(m, d, lat, lon);
    const sdist = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    moon.fraction = (1 + Math.cos(inc)) / 2;
    moon.phase = 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI; // 0 uusi, 0.25 kasvava puolikuu, 0.5 täysi, 0.75 vähenevä puolikuu
    return { sun, moon };
  }

  function moonName(p) {
    if (p < 0.03 || p > 0.97) return 'Uusikuu';
    if (p < 0.22) return 'Kasvava sirppi';
    if (p < 0.28) return 'Kasvava puolikuu';
    if (p < 0.47) return 'Kasvava kuperakuu';
    if (p < 0.53) return 'Täysikuu';
    if (p < 0.72) return 'Vähenevä kuperakuu';
    if (p < 0.78) return 'Vähenevä puolikuu';
    return 'Vähenevä sirppi';
  }

  /** Geomagneettinen leveysaste (dipolimalli, pohjoinen geomagneettinen napa n. 80,8° N 72,7° W). */
  function geomagLat(lat, lon) {
    const pl = 80.8 * rad, pn = -72.7 * rad, p = lat * rad, l = lon * rad;
    return Math.asin(Math.sin(p) * Math.sin(pl) + Math.cos(p) * Math.cos(pl) * Math.cos(l - pn)) / rad;
  }

  /** Revontulten näkyvyys 0..1: revontuliovaalin eteläraja ≈ 66,5° − 2,1·Kp (geomagn.), näkyy n. 4° etelämpää. */
  function auroraStrength(kp, lat, lon) {
    if (kp == null) return 0;
    const m = Math.abs(geomagLat(lat, lon));
    const edge = 66.5 - 2.1 * kp;
    return Math.max(0, Math.min(1, (m - edge + 4) / 6));
  }

  WX.astro = { position, moonName, geomagLat, auroraStrength };
})();
