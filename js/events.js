/* Juhlapyhät ja tapahtumat taustakuvaan: juhannuskokko, vapun ilmapallot, jouluvalot,
 * uudenvuoden ilotulitus, itsenäisyyspäivän kynttilät, halloween-kurpitsa ja Suomen liputuspäivät.
 * Päivämäärä annetaan paikallisaikana "naiivina" UTC-päivämääränä (getUTC*). */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});

  const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  /** n:s viikonpäivä wd kuukaudessa (n = -1 → viimeinen) */
  function nthWeekday(y, m, wd, n) {
    if (n > 0) {
      let d = 1;
      while (dow(y, m, d) !== wd) d++;
      return d + (n - 1) * 7;
    }
    let d = new Date(Date.UTC(y, m, 0)).getUTCDate();
    while (dow(y, m, d) !== wd) d--;
    return d;
  }
  function juhannus(y) { // juhannuspäivä: lauantai 20.–26.6.
    for (let d = 20; d <= 26; d++) if (dow(y, 6, d) === 6) return d;
    return 20;
  }

  /** Suomen liputuspäivät (viralliset ja vakiintuneet) vuodelle y: { 'M-D': nimi } */
  function flagDays(y) {
    const f = {
      '2-5': 'J. L. Runebergin päivä', '2-28': 'Kalevalan päivä', '3-19': 'Minna Canthin päivä',
      '4-9': 'Mikael Agricolan päivä', '4-27': 'Kansallinen veteraanipäivä', '5-1': 'Vappu',
      '5-9': 'Eurooppa-päivä', '5-12': 'J. V. Snellmanin päivä', '6-4': 'Puolustusvoimien lippujuhla',
      '7-6': 'Eino Leinon päivä', '8-9': 'Tove Janssonin päivä', '10-10': 'Aleksis Kiven päivä',
      '10-24': 'YK:n päivä', '11-6': 'Ruotsalaisuuden päivä', '12-6': 'Itsenäisyyspäivä', '12-8': 'Jean Sibeliuksen päivä',
    };
    f['5-' + nthWeekday(y, 5, 0, 2)] = 'Äitienpäivä';
    f['5-' + nthWeekday(y, 5, 0, 3)] = 'Kaatuneitten muistopäivä';
    f['6-' + juhannus(y)] = 'Juhannuspäivä';
    f['8-' + nthWeekday(y, 8, 6, -1)] = 'Suomen luonnon päivä';
    f['11-' + nthWeekday(y, 11, 0, 2)] = 'Isänpäivä';
    return f;
  }

  const XMAS_STYLES = ['nordic', 'europe', 'namerica', 'samerica', 'oceania'];

  /**
   * Aktiiviset tapahtumat. now = paikallisaika naiivina Date-oliona, cc = maakoodi, style = rakennustyyli.
   * Palauttaa { fx: {fireworks, kokko, balloons, xmas, candles, pumpkin}, flag: 'FI'|null, greeting, flagDay }
   */
  function active(now, cc, style, override) {
    const y = now.getUTCFullYear(), m = now.getUTCMonth() + 1, d = now.getUTCDate(), h = now.getUTCHours();
    const fi = (cc || '').toUpperCase() === 'FI';
    const nordic = style === 'nordic';
    const fx = {};
    let greeting = null, flag = null, flagDay = null;
    const ov = override || '';

    // Liputus (Suomi, päiväsaikaan)
    const fd = flagDays(y)[m + '-' + d];
    if (fi && fd && h >= 8 && h < 21) { flag = 'FI'; flagDay = fd; }

    if (ov === 'uusivuosi' || (m === 12 && d === 31 && h >= 18) || (m === 1 && d === 1 && h < 2)) {
      fx.fireworks = ov === 'uusivuosi' ? 1.5 : (m === 12 && (h < 23 || now.getUTCMinutes() < 30)) ? 0.6 : m === 1 && h >= 1 ? 0.6 : 3;
      greeting = 'Hyvää uutta vuotta!';
    }
    const jp = juhannus(y);
    const inJuhannus = m === 6 && ((d === jp - 1 && h >= 17) || d === jp || (d === jp + 1 && h < 3));
    if (ov === 'juhannus' || (nordic && inJuhannus)) {
      fx.kokko = true;
      greeting = 'Hyvää juhannusta!';
      if (fi || ov === 'juhannus') flag = 'FI'; // lippu salossa aattoillasta juhannuspäivän iltaan
    }
    if (ov === 'vappu' || (nordic && ((m === 4 && d === 30 && h >= 12) || (m === 5 && d === 1)))) {
      fx.balloons = true;
      greeting = 'Hyvää vappua!';
    }
    if (ov === 'joulu' || (XMAS_STYLES.includes(style) && ((m === 12) || (m === 1 && d <= 6)))) {
      fx.xmas = true;
      if (ov === 'joulu' || (m === 12 && d >= 24 && d <= 26)) greeting = 'Hyvää joulua!';
    }
    if (ov === 'itsenaisyyspaiva' || (fi && m === 12 && d === 6)) {
      fx.candles = true;
      greeting = 'Hyvää itsenäisyyspäivää!';
      if (ov === 'itsenaisyyspaiva') { flag = 'FI'; flagDay = 'Itsenäisyyspäivä'; }
    }
    if (ov === 'halloween' || (m === 10 && d === 31 && (style === 'namerica' || ['US', 'CA', 'GB', 'IE'].includes((cc || '').toUpperCase())))) {
      fx.pumpkin = true;
      greeting = 'Hyvää halloweenia!';
    }
    if (ov === 'liputus') { flag = 'FI'; flagDay = 'Liputuspäivä'; }
    if (!greeting && flagDay) greeting = 'Liputuspäivä: ' + flagDay;
    return { fx, flag, greeting, flagDay };
  }

  WX.events = { active, flagDays, juhannus };
})();
