/* Paikan luokittelu taustagrafiikkaa varten:
 *   - asutus: DEGURBA-luokituksen väkilukurajoja mukaileva arvio (kaupunki / taajama / kylä / haja-asutus)
 *   - tyyli: maanosa (ja osa-alue) rakennustyyliä varten
 *   - ilmasto: Köppenin ilmastoluokka viimeisen vuoden päivädatasta → kasvillisuusvyöhyke */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const P = {};

  // ---------- asutus ----------
  // DEGURBA: kaupunkikeskus ≥ 50 000 as., kaupunkiklusteri ≥ 5 000 as., kylä (maaseutuklusteri) ≥ 500 as.
  // Paikan väkiluku (GeoNames Open-Meteon paikkahaun kautta) on likiarvo tiheästi asutun ruudukon väkiluvulle.
  const ORDER = ['rural', 'village', 'town', 'city'];
  P.settlement = function (pop, featureCode, distKm) {
    let cls;
    if (pop >= 50000) cls = 'city';
    else if (pop >= 5000) cls = 'town';
    else if (pop >= 500) cls = 'village';
    else if (pop > 0) cls = 'rural';
    else cls = featureCode && /^PPL/.test(featureCode) ? 'village' : 'rural';
    // Jos sijainti on kaukana taajaman keskustasta, pudotetaan luokkaa (karkea arvio taajaman koosta)
    if (distKm > 0 && pop > 0) {
      const r = 1.5 + Math.sqrt(pop / 1000) * 0.6;
      let i = ORDER.indexOf(cls);
      if (distKm > r * 3) i = 0;
      else if (distKm > r) i = Math.max(0, i - 1);
      cls = ORDER[i];
    }
    return cls;
  };

  // ---------- maanosa ja rakennustyyli ----------
  const CC = {
    europe: 'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
    asia: 'AE AF AM AZ BD BH BN BT CC CN CX GE HK ID IL IN IO IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
    africa: 'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
    namerica: 'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI UM',
    samerica: 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE GS',
    oceania: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV VU WF WS',
    antarctica: 'AQ TF BV HM',
  };
  const CC_MAP = {};
  Object.keys(CC).forEach((k) => CC[k].split(' ').forEach((c) => (CC_MAP[c] = k)));

  function continentFromCoords(lat, lon) {
    if (lat < -60) return 'antarctica';
    if (lon >= -170 && lon < -30) return lat > 12.5 || (lat > 7.2 && lon < -77) ? 'namerica' : 'samerica';
    if (lon >= -30 && lon < 60) {
      if (lat > 35) {
        if (lon > 26 && lon < 45 && lat < 42) return 'asia'; // Anatolia
        return lon > 50 && lat < 50 ? 'asia' : 'europe';
      }
      return lon > 34 && lat > 12 ? 'asia' : 'africa';
    }
    if (lon >= 60 || lon < -170) {
      if (lat > 50 && lon > 150) return 'asia';
      if ((lon > 110 && lat < -10) || (lon > 141 && lat < 0) || lon > 165 || lon < -170) return 'oceania';
      return 'asia';
    }
    return 'europe';
  }

  P.continent = function (cc, lat, lon) {
    let c = cc && CC_MAP[cc.toUpperCase()];
    if (c === 'europe' && cc.toUpperCase() === 'RU' && lon > 60) c = 'asia';
    return c || continentFromCoords(lat, lon);
  };

  /** Rakennustyyli: maanosa tarkennettuna osa-alueella */
  P.style = function (cc, lat, lon) {
    const c = P.continent(cc, lat, lon);
    if (c === 'europe') return lat >= 54 ? 'nordic' : 'europe';
    if (c === 'asia') return lat >= 50 ? 'nordic' : lon >= 95 ? 'eastasia' : 'westasia';
    return c;
  };

  // ---------- Köppenin ilmastoluokka ----------
  /** days: [{date:'YYYY-MM-DD', mean, precip}] noin vuoden ajalta. Palauttaa { code, biome, Tc, Tw } tai null. */
  P.koppen = function (days, lat) {
    const m = Array.from({ length: 12 }, () => ({ t: 0, n: 0, p: 0, pn: 0 }));
    days.forEach((d) => {
      const i = +d.date.slice(5, 7) - 1;
      if (d.mean != null) { m[i].t += d.mean; m[i].n++; }
      if (d.precip != null) { m[i].p += d.precip; m[i].pn++; }
    });
    if (m.some((x) => x.n < 10)) return null;
    const T = m.map((x) => x.t / x.n);
    const Pm = m.map((x) => (x.pn ? (x.p / x.pn) * 30.4 : 0)); // kuukausisumma
    const Tw = Math.max.apply(null, T), Tc = Math.min.apply(null, T);
    const Tann = T.reduce((a, b) => a + b, 0) / 12;
    const Pann = Pm.reduce((a, b) => a + b, 0);
    const sumIdx = lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
    const winIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].filter((i) => !sumIdx.includes(i));
    const Ps = sumIdx.map((i) => Pm[i]), Pw = winIdx.map((i) => Pm[i]);
    const frac = Pann > 0 ? Ps.reduce((a, b) => a + b, 0) / Pann : 0.5;
    const Pth = 20 * Tann + (frac >= 0.7 ? 280 : frac <= 0.3 ? 0 : 140); // Peel ym. 2007
    let code;
    if (Tw < 10) code = Tw > 0 ? 'ET' : 'EF';
    else if (Pann < Pth) code = (Pann < Pth / 2 ? 'BW' : 'BS') + (Tann >= 18 ? 'h' : 'k');
    else if (Tc >= 18) {
      const Pdry = Math.min.apply(null, Pm);
      code = Pdry >= 60 ? 'Af' : Pdry >= 100 - Pann / 25 ? 'Am' : 'Aw';
    } else {
      const Psdry = Math.min.apply(null, Ps), Pswet = Math.max.apply(null, Ps);
      const Pwdry = Math.min.apply(null, Pw), Pwwet = Math.max.apply(null, Pw);
      const second = Psdry < 40 && Psdry < Pwwet / 3 ? 's' : Pwdry < Pswet / 10 ? 'w' : 'f';
      const warm = T.filter((t) => t >= 10).length;
      const third = Tw >= 22 ? 'a' : warm >= 4 ? 'b' : Tc < -38 ? 'd' : 'c';
      code = (Tc > 0 ? 'C' : 'D') + second + third;
    }
    return { code, biome: P.biomeOf(code), Tc, Tw };
  };

  P.biomeOf = function (code) {
    const g = code[0];
    if (g === 'E') return 'tundra';
    if (g === 'B') return code[1] === 'W' ? 'desert' : 'steppe';
    if (g === 'A') return code[1] === 'w' || code[1] === 's' ? 'savanna' : 'rainforest';
    if (g === 'C') return code[1] === 's' ? 'mediterranean' : code[2] === 'a' ? 'subtropical' : 'temperate';
    return code[2] === 'a' ? 'temperate' : code[2] === 'b' ? 'boreal' : 'taiga';
  };

  /** Varalla, jos ilmastodataa ei saatu: karkea arvio leveyspiiristä */
  P.biomeFallback = function (lat) {
    const a = Math.abs(lat);
    return a >= 66 ? 'taiga' : a >= 52 ? 'boreal' : a >= 36 ? 'temperate' : a >= 23.5 ? 'subtropical' : 'rainforest';
  };

  P.koppenLabel = function (code) {
    const exact = { ET: 'tundrailmasto', EF: 'jäätikköilmasto', Af: 'sademetsäilmasto', Am: 'monsuuni-ilmasto', Aw: 'savanni-ilmasto', BWh: 'kuuma aavikkoilmasto', BWk: 'kylmä aavikkoilmasto', BSh: 'kuuma aroilmasto', BSk: 'kylmä aroilmasto' };
    if (exact[code]) return exact[code];
    if (code[0] === 'C') return code[1] === 's' ? 'välimerenilmasto' : code[2] === 'a' ? 'kostea subtrooppinen ilmasto' : code[1] === 'w' ? 'subtrooppinen ylänköilmasto' : 'lauhkea meri-ilmasto';
    if (code[0] === 'D') return code[2] === 'a' || code[2] === 'b' ? 'kostea mannerilmasto' : 'subarktinen ilmasto';
    return '';
  };

  P.LABELS = {
    settlement: { city: 'Kaupunki', town: 'Pikkukaupunki tai taajama', village: 'Kylä', rural: 'Haja-asutusalue' },
    style: {
      nordic: 'Pohjola', europe: 'Eurooppa', namerica: 'Pohjois-Amerikka', samerica: 'Etelä-Amerikka',
      eastasia: 'Itä-Aasia', westasia: 'Länsi- ja Etelä-Aasia', africa: 'Afrikka', oceania: 'Oseania', antarctica: 'Antarktis',
    },
    biome: {
      tundra: 'tunturi ja tundra', taiga: 'pohjoinen havumetsä', boreal: 'havu- ja sekametsä', temperate: 'lehtimetsä',
      subtropical: 'subtrooppinen metsä', mediterranean: 'välimeren kasvillisuus', steppe: 'aro', desert: 'aavikko',
      savanna: 'savanni', rainforest: 'sademetsä',
    },
  };

  WX.place = P;
})();
