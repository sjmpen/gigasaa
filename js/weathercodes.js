/* WMO-säätilakoodit (Open-Meteo) → suomenkielinen kuvaus, ikoni ja taustan säätila. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});

  // icon: ikonin perusmuoto, scene: taustan parametrit
  //   clouds 0..1 = pilvisyys, dark 0..1 = pilvien tummuus,
  //   precip = none|drizzle|rain|snow|sleet, amount 0..1 = sateen voimakkuus
  const C = (text, icon, clouds, dark, precip, amount, extra) =>
    Object.assign({ text, icon, scene: { clouds, dark, precip, amount, thunder: false, fog: false } }, extra || {});

  const CODES = {
    0: C('Selkeää', 'clear', 0, 0, 'none', 0),
    1: C('Enimmäkseen selkeää', 'mostlyclear', 0.2, 0, 'none', 0),
    2: C('Puolipilvistä', 'partly', 0.5, 0.1, 'none', 0),
    3: C('Pilvistä', 'cloudy', 1, 0.35, 'none', 0),
    45: C('Sumua', 'fog', 0.9, 0.2, 'none', 0),
    48: C('Huurtuvaa sumua', 'fog', 0.9, 0.2, 'none', 0),
    51: C('Heikkoa tihkusadetta', 'drizzle', 1, 0.4, 'drizzle', 0.25),
    53: C('Tihkusadetta', 'drizzle', 1, 0.45, 'drizzle', 0.4),
    55: C('Voimakasta tihkusadetta', 'drizzle', 1, 0.5, 'drizzle', 0.6),
    56: C('Jäätävää tihkua', 'sleet', 1, 0.45, 'sleet', 0.35),
    57: C('Voimakasta jäätävää tihkua', 'sleet', 1, 0.5, 'sleet', 0.6),
    61: C('Heikkoa sadetta', 'rain', 1, 0.5, 'rain', 0.35),
    63: C('Sadetta', 'rain', 1, 0.6, 'rain', 0.6),
    65: C('Voimakasta sadetta', 'heavyrain', 1, 0.75, 'rain', 1),
    66: C('Jäätävää sadetta', 'sleet', 1, 0.6, 'sleet', 0.5),
    67: C('Voimakasta jäätävää sadetta', 'sleet', 1, 0.75, 'sleet', 0.9),
    71: C('Heikkoa lumisadetta', 'snow', 1, 0.3, 'snow', 0.35),
    73: C('Lumisadetta', 'snow', 1, 0.4, 'snow', 0.65),
    75: C('Voimakasta lumisadetta', 'heavysnow', 1, 0.5, 'snow', 1),
    77: C('Lumijyväsiä', 'snow', 1, 0.35, 'snow', 0.4),
    80: C('Heikkoja sadekuuroja', 'showers', 0.6, 0.45, 'rain', 0.35),
    81: C('Sadekuuroja', 'showers', 0.75, 0.55, 'rain', 0.65),
    82: C('Voimakkaita sadekuuroja', 'heavyrain', 0.9, 0.75, 'rain', 1),
    85: C('Lumikuuroja', 'snowshowers', 0.7, 0.35, 'snow', 0.5),
    86: C('Voimakkaita lumikuuroja', 'heavysnow', 0.9, 0.5, 'snow', 0.9),
    95: C('Ukkosta', 'thunder', 1, 0.9, 'rain', 0.8),
    96: C('Ukkosta ja raekuuroja', 'thunder', 1, 0.9, 'rain', 0.9),
    99: C('Voimakasta ukkosta ja rakeita', 'thunder', 1, 1, 'rain', 1),
  };
  CODES[45].scene.fog = true;
  CODES[48].scene.fog = true;
  [95, 96, 99].forEach((c) => (CODES[c].scene.thunder = true));

  const FALLBACK = C('Tuntematon sää', 'cloudy', 0.6, 0.3, 'none', 0);

  /** Palauttaa { text, icon, scene } annetulle WMO-koodille. */
  WX.describe = function (code) {
    const d = CODES[code] || FALLBACK;
    return { text: d.text, icon: d.icon, scene: Object.assign({}, d.scene) };
  };

  // Taustan esikatselua varten nimetyt säätilat (?scene=...)
  WX.PRESETS = {
    clear: 0,
    partly: 2,
    cloudy: 3,
    fog: 45,
    drizzle: 53,
    rain: 63,
    heavyrain: 65,
    sleet: 66,
    snow: 73,
    heavysnow: 75,
    thunder: 95,
  };
})();
