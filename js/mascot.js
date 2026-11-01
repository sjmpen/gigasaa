/* Maan maskotti: maan kansalliseläimestä tehty pikselihahmo maan lipun värisellä kaulahuivilla.
 * Jos kansalliseläintä ei ole määritelty, maskottina on Gigasään oma pilvihahmo maan väreissä.
 * Hahmo räpyttelee, heiluttaa, osoittaa säätä, hyppää ja reagoi säähän ja juhlapäiviin. */
(function () {
  'use strict';
  const WX = (window.WX = window.WX || {});
  const GW = 26, GH = 30, CX = 13;
  const OUT = '#1c1426', EYE = '#1a1424';

  const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const hex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return hex(A.map((v, i) => v + (B[i] - v) * t)); };
  const dark = (c, k) => mix(c, '#000000', k == null ? 0.25 : k);
  const lum = (c) => { const [r, g, b] = rgb(c); return 0.299 * r + 0.587 * g + 0.114 * b; };

  // ---------- lippujen värit (kaulahuiviin) ----------
  const FLAGS_RAW =
    'AD:1060a0,f0d000,d01030;AL:e01020,101010;AT:e01030,ffffff,e01030;BA:002395,fecb00,ffffff;BE:101010,fdda24,ef3340;' +
    'BG:ffffff,00966e,d62612;BY:c8313e,4aa657,ffffff;CH:da291c,ffffff;CY:ffffff,d57800,4e5b31;CZ:ffffff,d7141a,11457e;' +
    'DE:101010,dd0000,ffce00;DK:c8102e,ffffff;EE:0072ce,101010,ffffff;ES:aa151b,f1bf00,aa151b;FI:ffffff,1a4ab0;' +
    'FR:0055a4,ffffff,ef4135;GB:012169,ffffff,c8102e;GR:0d5eaf,ffffff;HR:ff0000,ffffff,171796;HU:ce2939,ffffff,477050;' +
    'IE:169b62,ffffff,ff883e;IS:02529c,ffffff,dc1e35;IT:009246,ffffff,ce2b37;LI:002b7f,ce1126;LT:fdb913,006a44,c1272d;' +
    'LU:ed2939,ffffff,00a1de;LV:9e3039,ffffff,9e3039;MC:ce1126,ffffff;MD:0046ae,ffd200,cc092f;ME:c40308,d4af3a;' +
    'MK:d20000,ffe600;MT:ffffff,cf142b;NL:ae1c28,ffffff,21468b;NO:ba0c2f,ffffff,00205b;PL:ffffff,dc143c;' +
    'PT:046a38,da291c,ffe900;RO:002b7f,fcd116,ce1126;RS:c6363c,0c4076,ffffff;RU:ffffff,0039a6,d52b1e;SE:006aa7,fecc00;' +
    'SI:ffffff,005da4,ed1c24;SK:ffffff,0b4ea2,ee1c25;SM:ffffff,5eb6e4;UA:0057b7,ffd700;VA:ffe000,ffffff;XK:244aa5,d0a650;' +
    'FO:ffffff,005eb8,ef303e;GL:d00c33,ffffff;AX:0064ad,ffd300,da0e15;' +
    'AE:00732f,ffffff,ff0000;AF:101010,be0000,009a00;AM:d90012,0033a0,f2a800;AZ:0092bc,e4002b,00af66;BD:006a4e,f42a41;' +
    'BH:ce1126,ffffff;BN:f7e017,ffffff,101010;BT:ffd520,ff4e12;CN:ee1c25,ffff00;GE:ffffff,ff0000;HK:de2910,ffffff;' +
    'ID:ff0000,ffffff;IL:ffffff,0038b8;IN:ff9933,ffffff,138808;IQ:ce1126,ffffff,101010;IR:239f40,ffffff,da0000;' +
    'JO:101010,ffffff,007a3d;JP:ffffff,bc002d;KG:e8112d,ffef00;KH:032ea1,e00025,ffffff;KP:024fa2,ed1c27,ffffff;' +
    'KR:ffffff,cd2e3a,0047a0;KW:007a3d,ffffff,ce1126;KZ:00afca,fec50c;LA:ce1126,002868,ffffff;LB:ed1c24,ffffff,00a651;' +
    'LK:8d153a,ffbe29,eb7400;MM:fecb00,34b233,ea2839;MN:da2032,015197,ffd900;MO:00785e,ffffff;MV:d21034,007e3a;' +
    'MY:010066,cc0001,ffffff;NP:dc143c,003893;OM:db161b,ffffff,008000;PH:0038a8,ce1126,fcd116;PK:01411c,ffffff;' +
    'PS:101010,ffffff,009736;QA:8a1538,ffffff;SA:006c35,ffffff;SG:ef3340,ffffff;SY:ce1126,ffffff,101010;' +
    'TH:a51931,f4f5f8,2d2a4a;TJ:cc0000,ffffff,006600;TL:dc241f,101010,ffc726;TM:00843d,d22630;TR:e30a17,ffffff;' +
    'TW:fe0000,000095,ffffff;UZ:0099b5,ffffff,1eb53a;VN:da251d,ffff00;YE:ce1126,ffffff,101010;' +
    'AO:cc092f,101010,ffcb00;BF:ef2b2d,009e49,fcd116;BI:ce1126,1eb53a,ffffff;BJ:008751,fcd116,e8112d;BW:75aadb,101010,ffffff;' +
    'CD:007fff,ce1021,f7d618;CF:003082,ffffff,289728;CG:009543,fbde4a,dc241f;CI:f77f00,ffffff,009e60;CM:007a5e,ce1126,fcd116;' +
    'CV:003893,ffffff,cf2027;DJ:6ab2e7,12ad2b,ffffff;DZ:006233,ffffff,d21034;EG:ce1126,ffffff,101010;ER:12ad2b,ea0437,4189dd;' +
    'ET:078930,fcdd09,da121a;GA:009e60,fcd116,3a75c4;GH:ce1126,fcd116,006b3f;GM:ce1126,0c1c8c,3a7728;GN:ce1126,fcd116,009460;' +
    'GQ:3e9a00,ffffff,e32118;GW:ce1126,fcd116,009e49;KE:101010,bb0000,006600;KM:ffc61e,ffffff,ce1126;LR:bf0a30,ffffff,002868;' +
    'LS:00209f,ffffff,009543;LY:e70013,101010,239e46;MA:c1272d,006233;MG:ffffff,fc3d32,007e3a;ML:14b53a,fcd116,ce1126;' +
    'MR:00a95c,ffd700,d01c1f;MU:ea2839,1a206d,ffd500;MW:101010,ce1126,339e35;MZ:007168,101010,fce100;NA:003580,d21034,009543;' +
    'NE:e05206,ffffff,0db02b;NG:008751,ffffff,008751;RW:00a1de,fad201,20603d;SC:003f87,fcd856,d62828;SD:d21034,ffffff,101010;' +
    'SL:1eb53a,ffffff,0072c6;SN:00853f,fdef42,e31b23;SO:4189dd,ffffff;SS:101010,da121a,078930;ST:12ad2b,ffce00,d21034;' +
    'SZ:3e5eb9,ffd900,b10c0c;TD:002664,fecb00,c60c30;TG:006a4e,ffce00,d21034;TN:e70013,ffffff;TZ:1eb53a,fcd116,00a3dd;' +
    'UG:101010,fcdc04,d90000;ZA:007749,ffb81c,de3831;ZM:198a00,de2010,ef7d00;ZW:319208,ffd200,d40000;' +
    'AG:ce1126,101010,fcd116;AR:74acdf,ffffff,74acdf;BB:00267f,ffc726,00267f;BO:d52b1e,f9e300,007934;BR:009c3b,ffdf00,002776;' +
    'BS:00778b,ffc72c,101010;BZ:003f87,ce1126,ffffff;CA:d80621,ffffff,d80621;CL:d52b1e,ffffff,0039a6;CO:fcd116,003893,ce1126;' +
    'CR:002b7f,ffffff,ce1126;CU:002a8f,ffffff,cb1515;DM:006b3f,fcd116,101010;DO:002d62,ce1126,ffffff;EC:ffd100,0072ce,ef3340;' +
    'GD:ce1126,fcd116,007a5e;GT:4997d0,ffffff;GY:009e49,fcd116,ce1126;HN:0073cf,ffffff;HT:00209f,d21034;JM:009b3a,fed100,101010;' +
    'KN:009e49,fcd116,ce1126;LC:66ccff,fcd116,101010;MX:006847,ffffff,ce1126;NI:0067c6,ffffff;PA:da121a,ffffff,072357;' +
    'PE:d91023,ffffff,d91023;PY:d52b1e,ffffff,0038a8;SR:377e3f,ffffff,b40a2d;SV:0f47af,ffffff;TT:ce1126,101010,ffffff;' +
    'US:b22234,ffffff,3c3b6e;UY:ffffff,0038a8,fcd116;VC:0072c6,fcd116,009e60;VE:ffcc00,00247d,cf142b;PR:ed0000,ffffff,0050f0;' +
    'AU:012169,ffffff,e4002b;FJ:68bfe5,ffffff,ce1126;FM:75b2dd,ffffff;KI:ce1126,003f87,fcd116;MH:003893,dd7500,ffffff;' +
    'NR:002b7f,ffc61e,ffffff;NZ:012169,c8102e,ffffff;PG:101010,ce1126,fcd116;PW:4aadd6,ffde00;SB:0051ba,215b33,fcd116;' +
    'TO:c10000,ffffff;TV:5b97b1,012169,ffce00;VU:d21034,009543,fdce12;WS:ce1126,002b7f,ffffff;AQ:ffffff,3a7dce';
  const FLAG = {};
  FLAGS_RAW.split(';').forEach((e) => { const [k, v] = e.split(':'); FLAG[k] = v.split(',').map((c) => '#' + c); });
  const DEFAULT_FLAG = ['#1a4ab0', '#ffd75e'];

  // ---------- kansalliseläimet (virallisia tai vakiintuneita) ----------
  const ANIMAL_OF = {
    FI: 'bear', RU: 'bear', CN: 'panda', EE: 'wolf', IT: 'wolf',
    GB: 'lion', NL: 'lion', BE: 'lion', LU: 'lion', CZ: 'lion', BG: 'lion', NO: 'lion', KE: 'lion', ET: 'lion', MA: 'lion', SG: 'lion', LK: 'lion',
    IN: 'tiger', KR: 'tiger', BD: 'tiger', MY: 'tiger', BR: 'jaguar',
    SE: 'moose', ZA: 'springbok', CR: 'deer', ES: 'bull', PH: 'carabao',
    TH: 'elephant', CI: 'elephant', LA: 'elephant', AU: 'kangaroo', NZ: 'kiwi', CA: 'beaver', ID: 'komodo',
    US: 'baldeagle', ZM: 'fisheagle', DE: 'eagle', AT: 'eagle', AL: 'eagle', PL: 'whiteeagle', MX: 'goldeneagle', EG: 'goldeneagle',
    IS: 'falcon', AE: 'falcon', CO: 'condor', EC: 'condor', BO: 'condor', CL: 'condor', PA: 'harpy',
    FR: 'rooster', PT: 'rooster', DK: 'swan', LT: 'stork', BY: 'stork', UG: 'crane',
    LV: 'wagtail', AR: 'hornero', JP: 'pheasant', IL: 'hoopoe', GT: 'quetzal', JM: 'hummingbird',
  };

  // Hahmopohjat. type: mammal | bird | cloud
  const KINDS = {
    bear: { name: 'karhu', type: 'mammal', fur: '#8a5a34', belly: '#c89a6a', ears: 'round', earIn: '#c89a6a', face: 'muzzle', muzzle: '#d8b088' },
    panda: { name: 'isopanda', type: 'mammal', fur: '#f2f2ee', belly: '#f2f2ee', limbs: '#24242a', ears: 'round', earC: '#24242a', face: 'panda', muzzle: '#ffffff' },
    wolf: { name: 'susi', type: 'mammal', fur: '#8a8e98', belly: '#dcdfe6', ears: 'pointed', earIn: '#5a5e68', face: 'muzzle', muzzle: '#e6e8ee' },
    lion: { name: 'leijona', type: 'mammal', fur: '#e0a848', belly: '#f2d498', ears: 'round', earIn: '#c88a30', mane: '#a8602a', face: 'muzzle', muzzle: '#f6e0b0', tail: 'tuft' },
    tiger: { name: 'tiikeri', type: 'mammal', fur: '#ea8a2c', belly: '#faf2e2', ears: 'round', earIn: '#faf2e2', face: 'muzzle', muzzle: '#faf2e2', pattern: 'stripes' },
    jaguar: { name: 'jaguaari', type: 'mammal', fur: '#e2aa44', belly: '#faeed2', ears: 'round', earIn: '#faeed2', face: 'muzzle', muzzle: '#faeed2', pattern: 'spots', tail: 'tuft' },
    moose: { name: 'hirvi', type: 'mammal', fur: '#6e4c34', belly: '#9a7a5a', ears: 'side', antlers: 'palmate', face: 'longsnout', muzzle: '#4e3626' },
    springbok: { name: 'springbok-antilooppi', type: 'mammal', fur: '#c88a4a', belly: '#f6eee2', ears: 'side', antlers: 'lyre', face: 'muzzle', muzzle: '#f6eee2' },
    deer: { name: 'valkohäntäpeura', type: 'mammal', fur: '#aa7a4c', belly: '#f6eee2', ears: 'side', antlers: 'branch', face: 'muzzle', muzzle: '#f6eee2' },
    bull: { name: 'härkä', type: 'mammal', fur: '#4e3c32', belly: '#6e5c50', ears: 'side', antlers: 'horns', face: 'nose', muzzle: '#c8a090' },
    carabao: { name: 'karabao', type: 'mammal', fur: '#6a6a74', belly: '#8a8a94', ears: 'side', antlers: 'wide', face: 'nose', muzzle: '#9a9aa4' },
    elephant: { name: 'norsu', type: 'mammal', fur: '#9ca2ac', belly: '#b8bec8', ears: 'big', earC: '#8a909a', face: 'trunk' },
    kangaroo: { name: 'kenguru', type: 'mammal', fur: '#b27c52', belly: '#e2c6a2', ears: 'long', earIn: '#e2a8a0', face: 'muzzle', muzzle: '#e2c6a2', tail: 'thick' },
    beaver: { name: 'majava', type: 'mammal', fur: '#7c502c', belly: '#aa7a4c', ears: 'small', face: 'teeth', muzzle: '#c89a6a', tail: 'flat' },
    komodo: { name: 'komodonvaraani', type: 'mammal', fur: '#7c7c5c', belly: '#9c9c74', ears: 'none', face: 'lizard', tail: 'lizard', pattern: 'scales' },
    kiwi: { name: 'kiivi', type: 'bird', fur: '#7c5c3c', head: '#7c5c3c', beak: '#e8d8b0', beakType: 'kiwi', wingless: true, legs: '#c8b896' },
    eagle: { name: 'kotka', type: 'bird', fur: '#3c2e26', head: '#3c2e26', beak: '#f0c030', beakType: 'hook' },
    baldeagle: { name: 'valkopäämerikotka', type: 'bird', fur: '#4a3424', head: '#f4f4f0', beak: '#f0c030', beakType: 'hook' },
    fisheagle: { name: 'afrikanmerikotka', type: 'bird', fur: '#6a3a24', belly: '#7a4a2c', head: '#f4f4f0', beak: '#f0c030', beakType: 'hook' },
    whiteeagle: { name: 'valkokotka', type: 'bird', fur: '#eeeeea', head: '#f6f6f2', wing: '#d0d0cc', beak: '#e8b030', beakType: 'hook' },
    goldeneagle: { name: 'maakotka', type: 'bird', fur: '#6a4a2a', head: '#c8903a', beak: '#e8b030', beakType: 'hook' },
    falcon: { name: 'haukka', type: 'bird', fur: '#6a7080', belly: '#ece8de', head: '#5a6070', beak: '#e8c040', beakType: 'hook' },
    condor: { name: 'kondori', type: 'bird', fur: '#22222a', head: '#d89a8a', ruff: '#f4f4f0', beak: '#e8d8b0', beakType: 'hook' },
    harpy: { name: 'harpyija', type: 'bird', fur: '#4a4a52', belly: '#f0f0ec', head: '#9aa0a8', crest: '#4a4a52', beak: '#3a3a42', beakType: 'hook' },
    rooster: { name: 'kukko', type: 'bird', fur: '#c84a2a', belly: '#e8a040', head: '#d0542e', comb: '#e02a2a', beak: '#f0c030', beakType: 'small', tail: 'plume' },
    swan: { name: 'kyhmyjoutsen', type: 'bird', fur: '#f8f8f4', head: '#f8f8f4', wing: '#e2e2de', beak: '#f08a2a', beakType: 'swan', legs: '#3a3a42' },
    stork: { name: 'kattohaikara', type: 'bird', fur: '#f8f8f4', head: '#f8f8f4', wing: '#e2e2de', wingtip: '#1a1a1a', beak: '#e8402a', beakType: 'long', legs: '#e8402a' },
    crane: { name: 'harmaakruunukurki', type: 'bird', fur: '#8a8e98', head: '#1e1e22', cheek: '#f4f4f0', crest: '#e8b030', beak: '#3a3a3a', beakType: 'small', legs: '#3a3a3a' },
    wagtail: { name: 'västäräkki', type: 'bird', fur: '#7a7e88', belly: '#f4f4f0', head: '#f4f4f0', cap: '#1a1a1a', beak: '#2a2a2a', beakType: 'small', legs: '#2a2a2a' },
    hornero: { name: 'punauunilintu', type: 'bird', fur: '#b0703a', belly: '#e8c8a0', head: '#a2623a', beak: '#5a4a3a', beakType: 'small', legs: '#8a7a6a' },
    pheasant: { name: 'japaninfasaani', type: 'bird', fur: '#2a6a3a', belly: '#2a5a6a', head: '#3a4aa0', cheek: '#e02a2a', beak: '#e8d8a0', beakType: 'small', legs: '#9a9a9a' },
    hoopoe: { name: 'harjalintu', type: 'bird', fur: '#d8a060', belly: '#ecc898', head: '#d8a060', crest: '#e09040', wing: '#2a2a2a', beak: '#3a3a3a', beakType: 'long', legs: '#5a5a5a' },
    quetzal: { name: 'ketsaali', type: 'bird', fur: '#2a9a5a', belly: '#d82a2a', head: '#2a9a5a', crest: '#2a9a5a', beak: '#f0c030', beakType: 'small', tail: 'long', legs: '#8a8a8a' },
    hummingbird: { name: 'kolibri', type: 'bird', fur: '#2a8a6a', belly: '#1e1e1e', head: '#1e1e1e', beak: '#1e1e1e', beakType: 'needle', tail: 'long', legs: '#3a3a3a' },
    cloud: { name: 'Gigapilvi', type: 'cloud' },
  };

  // ---------- pikselipuskuri ----------
  function Buf() { this.p = new Array(GW * GH).fill(null); this.post = []; }
  Buf.prototype.set = function (x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (c && x >= 0 && y >= 0 && x < GW && y < GH) this.p[y * GW + x] = c;
  };
  Buf.prototype.get = function (x, y) { return x < 0 || y < 0 || x >= GW || y >= GH ? null : this.p[y * GW + x]; };
  Buf.prototype.sym = function (x, y, c) { this.set(x, y, c); this.set(2 * CX - 1 - x, y, c); };
  Buf.prototype.rect = function (x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); };
  Buf.prototype.ell = function (cx, cy, rx, ry, c, maxY) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
      if (maxY != null && y > maxY) break;
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    }
  };
  Buf.prototype.line = function (pts, c) {
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) || 1;
      for (let k = 0; k <= n; k++) this.set(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, c);
    }
  };
  Buf.prototype.outline = function () {
    const add = [];
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y]);
      }
    add.forEach(([x, y]) => this.set(x, y, OUT));
    this.post.forEach(([x, y, c]) => this.set(x, y, c));
  };

  // ---------- osat ----------
  function eyes(b, P, y, col) {
    const dx = P.eyeDX || 0;
    if (P.blink || P.sleep) { b.rect(CX - 4 + dx, y + 1, 2, 1, EYE); b.rect(CX + 2 + dx, y + 1, 2, 1, EYE); return; }
    b.rect(CX - 3 + dx, y, 1, 2, col || EYE);
    b.rect(CX + 2 + dx, y, 1, 2, col || EYE);
    if (P.up) { b.set(CX - 3 + dx, y + 1, null); }
  }
  function cheeks(b, y) { b.set(CX - 5, y, '#f2909e'); b.set(CX + 4, y, '#f2909e'); }

  // Kädet (nisäkkäät ja pilvi): armL vasen, arm oikea: down | up | mid | point | hold
  function arms(b, c, P, hd, spread) {
    const s = spread || 0;
    if (P.armL === 'up') b.rect(CX - 8 - s, 13 + hd, 2, 4, c);
    else if (P.armL === 'mid') b.rect(CX - 8 - s, 16 + hd, 2, 3, c);
    else b.rect(CX - 7 - s, 18 + hd, 2, 4, c);
    if (P.arm === 'up') b.rect(CX + 6 + s, 13 + hd, 2, 4, c);
    else if (P.arm === 'mid' || P.arm === 'hold') b.rect(CX + 6 + s, 16 + hd, 2, 3, c);
    else if (P.arm === 'point') b.rect(CX + 5 + s, 18 + hd, 6, 2, c);
    else b.rect(CX + 5 + s, 18 + hd, 2, 4, c);
  }

  function wings(b, K, P, hd) {
    if (K.wingless) return;
    const c = K.wing || dark(K.fur, 0.2);
    const W = (pose, side) => {
      const sx = side < 0 ? -1 : 1;
      if (pose === 'up') b.ell(CX + sx * 7.5, 14.5 + hd, 1.5, 3.2, c);
      else if (pose === 'mid' || pose === 'hold') b.ell(CX + sx * 7, 17 + hd, 1.5, 3, c);
      else if (pose === 'point' && side > 0) b.ell(CX + 8.5, 19 + hd, 3.4, 1.4, c);
      else b.ell(CX + sx * 6, 20 + hd, 1.7, 3.6, c);
      if (K.wingtip && pose === 'down') b.rect(CX + sx * 6 - (sx < 0 ? 1 : 0), 22 + hd, 1, 2, K.wingtip);
    };
    W(P.armL, -1);
    W(P.arm, 1);
  }

  function tail(b, K, hy) {
    switch (K.tail) {
      case 'tuft': b.line([[CX + 4, 24 + hy], [CX + 7, 22 + hy], [CX + 8, 20 + hy]], K.fur); b.ell(CX + 8.5, 19 + hy, 1.4, 1.4, K.mane || dark(K.fur, 0.35)); break;
      case 'thick': b.ell(CX + 6.5, 25.6 + hy, 4, 1.7, K.fur); break;
      case 'flat': b.ell(CX + 7, 26.3 + hy, 3.2, 1.4, '#4a3424'); break;
      case 'lizard': b.ell(CX + 7, 26 + hy, 5, 1.4, K.fur); break;
      case 'plume': b.ell(CX + 7, 17 + hy, 2.2, 4.5, '#1e5a3a'); b.ell(CX + 8, 16 + hy, 1.4, 3, '#1a1a1a'); break;
      case 'long': b.line([[CX + 4, 22 + hy], [CX + 7, 25 + hy], [CX + 10, 28 + hy]], K.fur); b.line([[CX + 5, 22 + hy], [CX + 8, 25 + hy], [CX + 11, 28 + hy]], K.fur); break;
    }
  }

  function mammal(b, K, P) {
    const hy = P.hop ? -2 : 0, hd = hy + (P.bob ? 1 : 0);
    const limbs = K.limbs || dark(K.fur, 0.18);
    tail(b, K, hy);
    b.rect(CX - 4, 25 + hy, 3, 3, K.limbs || dark(K.fur, 0.3));
    b.rect(CX + 1, 25 + hy, 3, 3, K.limbs || dark(K.fur, 0.3));
    b.ell(CX, 21.5 + hy, 5, 4.5, K.fur);
    b.ell(CX, 22.5 + hy, 3, 3, K.belly || K.fur);
    if (K.pattern === 'stripes') [[-4, 19], [-3, 20], [-4, 22], [-3, 23]].forEach(([dx, y]) => b.sym(CX + dx, y + hy, '#2a1a10'));
    if (K.pattern === 'spots') [[-3, 19], [-4, 22], [-1, 25], [-2, 21]].forEach(([dx, y]) => b.sym(CX + dx, y + hy, '#5a3a1a'));
    if (K.pattern === 'scales') [[-3, 19], [-1, 21], [-4, 22], [-2, 24]].forEach(([dx, y]) => b.sym(CX + dx, y + hy, dark(K.fur, 0.2)));
    arms(b, limbs, P, hd);
    if (K.mane) {
      b.ell(CX, 11.5 + hd, 8.6, 7.6, K.mane);
      for (let a = 0; a < 16; a++) { const t = (a / 16) * Math.PI * 2; b.set(CX - 0.5 + Math.cos(t) * 9.3, 11 + hd + Math.sin(t) * 8.2, K.mane); }
    }
    // korvat
    const ec = K.earC || K.fur, ei = K.earIn || dark(ec, 0.15);
    switch (K.ears) {
      case 'round': b.ell(CX - 5, 6.8 + hd, 2.1, 2.1, ec); b.ell(CX + 5, 6.8 + hd, 2.1, 2.1, ec); b.sym(CX - 6, 6 + hd, ei); b.sym(CX - 5, 6 + hd, ei); break;
      case 'pointed':
        [[3, [-6]], [4, [-6, -5]], [5, [-7, -6, -5, -4]], [6, [-7, -6, -5, -4, -3]]].forEach(([y, xs]) => xs.forEach((dx) => b.sym(CX + dx, y + hd, ec)));
        b.sym(CX - 6, 5 + hd, ei); b.sym(CX - 5, 5 + hd, ei);
        break;
      case 'side': [[8, [-9, -8, -7]], [9, [-8, -7]]].forEach(([y, xs]) => xs.forEach((dx) => b.sym(CX + dx, y + hd, ec))); break;
      case 'long': for (let y = 0; y <= 6; y++) { b.sym(CX - 4, y + hd, ec); b.sym(CX - 3, y + hd, y > 0 && y < 6 ? ei : ec); } break;
      case 'big': b.ell(CX - 7.5, 11.5 + hd, 3.2, 4.2, ec); b.ell(CX + 7.5, 11.5 + hd, 3.2, 4.2, ec); break;
      case 'small': b.sym(CX - 6, 6 + hd, ec); b.sym(CX - 6, 7 + hd, ec); b.sym(CX - 5, 6 + hd, ec); break;
    }
    // pää
    if (K.face === 'lizard') b.ell(CX, 12.5 + hd, 7, 4.6, K.fur);
    else b.ell(CX, 11.5 + hd, 6.5, 5.5, K.fur);
    // sarvet
    const horn = '#e8e0c8';
    switch (K.antlers) {
      case 'palmate':
        b.sym(CX - 5, 6 + hd, '#c8b088'); b.sym(CX - 6, 5 + hd, '#c8b088');
        for (let x = -10; x <= -6; x++) b.sym(CX + x, 4 + hd, '#c8b088');
        for (let x = -11; x <= -7; x++) b.sym(CX + x, 3 + hd, '#c8b088');
        [-11, -9, -7].forEach((x) => b.sym(CX + x, 2 + hd, '#c8b088'));
        break;
      case 'branch': [[-4, 6], [-5, 5], [-6, 4], [-6, 3], [-7, 2], [-4, 4], [-4, 3], [-8, 4]].forEach(([x, y]) => b.sym(CX + x, y + hd, '#c8a878')); break;
      case 'lyre': [[-3, 6], [-3, 5], [-4, 4], [-4, 3], [-3, 2], [-3, 1]].forEach(([x, y]) => b.sym(CX + x, y + hd, '#3a2a1a')); break;
      case 'horns': [[-6, 6], [-7, 6], [-8, 5], [-8, 4]].forEach(([x, y]) => b.sym(CX + x, y + hd, horn)); b.sym(CX - 8, 4 + hd, '#8a8070'); break;
      case 'wide': [[-6, 7], [-7, 7], [-8, 6], [-9, 6], [-10, 5], [-11, 5], [-11, 4]].forEach(([x, y]) => b.sym(CX + x, y + hd, '#b8b0a0')); break;
    }
    // kasvot
    const ey = (K.face === 'lizard' ? 10 : 11) + hd;
    if (K.pattern === 'stripes') { [[-1, 7], [-1, 8], [-3, 7]].forEach(([x, y]) => b.sym(CX + x, y + hd, '#2a1a10')); b.sym(CX - 6, 11 + hd, '#2a1a10'); b.sym(CX - 6, 12 + hd, '#2a1a10'); }
    if (K.pattern === 'spots') [[-4, 8], [-2, 7]].forEach(([x, y]) => b.sym(CX + x, y + hd, '#5a3a1a'));
    switch (K.face) {
      case 'muzzle': b.ell(CX, 13.6 + hd, 2.6, 1.8, K.muzzle); b.rect(CX - 1, 12 + hd, 2, 1, EYE); break;
      case 'longsnout': b.ell(CX, 14.6 + hd, 3.2, 2.3, K.muzzle); b.sym(CX - 2, 15 + hd, EYE); break;
      case 'nose': b.ell(CX, 14.3 + hd, 3, 2, K.muzzle); b.sym(CX - 2, 14 + hd, EYE); break;
      case 'panda':
        b.ell(CX - 2.6, 12 + hd, 2.1, 2.1, '#24242a'); b.ell(CX + 2.6, 12 + hd, 2.1, 2.1, '#24242a');
        b.ell(CX, 14 + hd, 2.2, 1.6, K.muzzle); b.rect(CX - 1, 13 + hd, 2, 1, EYE);
        break;
      case 'trunk':
        b.rect(CX - 1, 13 + hd, 2, 4, K.fur); b.set(CX + 1, 17 + hd, K.fur); b.set(CX + 2, 16 + hd, K.fur);
        b.set(CX - 2, 14 + hd, '#f4f0e0'); b.set(CX + 1, 14 + hd, '#f4f0e0');
        break;
      case 'teeth': b.ell(CX, 13.6 + hd, 2.6, 1.8, K.muzzle); b.rect(CX - 1, 12 + hd, 2, 1, EYE); b.rect(CX - 1, 14 + hd, 2, 2, '#ffffff'); break;
      case 'lizard': b.rect(CX - 4, 14 + hd, 8, 1, dark(K.fur, 0.4)); b.sym(CX - 2, 12 + hd, dark(K.fur, 0.4)); break;
    }
    eyes(b, P, ey, K.face === 'panda' ? '#f4f4f4' : null);
    if (K.face !== 'lizard' && K.face !== 'panda') cheeks(b, 13 + hd);
    if (P.talk && K.face !== 'trunk' && K.face !== 'lizard') b.rect(CX - 1, (K.face === 'longsnout' || K.face === 'nose' ? 16 : 15) + hd, 2, 1, '#7a2a3a');
    return { neck: 16.5 + hd, head: 6 + hd, eyeY: ey };
  }

  function bird(b, K, P) {
    const hy = P.hop ? -2 : 0, hd = hy + (P.bob ? 1 : 0);
    const legC = K.legs || '#e8a030';
    tail(b, K, hy);
    b.rect(CX - 3, 25 + hy, 1, 2, legC); b.rect(CX + 2, 25 + hy, 1, 2, legC);
    b.rect(CX - 4, 27 + hy, 3, 1, legC); b.rect(CX + 1, 27 + hy, 3, 1, legC);
    b.ell(CX, 20.5 + hy, 5.6, 5.2, K.fur);
    if (K.belly) b.ell(CX, 21.6 + hy, 3.6, 3.3, K.belly);
    wings(b, K, P, hd);
    if (K.ruff) b.ell(CX, 16.2 + hd, 5.2, 1.4, K.ruff);
    if (K.crest) {
      if (K.name === 'harmaakruunukurki') for (let i = -3; i <= 2; i++) b.line([[CX + i * 0.6, 6 + hd], [CX + i * 1.4, 2 + hd]], K.crest);
      else { b.ell(CX, 5 + hd, 2.6, 2.6, K.crest); if (K.name === 'harjalintu') [[-2, 3], [0, 2], [2, 3]].forEach(([x, y]) => b.set(CX + x, y + hd, '#1a1a1a')); }
    }
    b.ell(CX, 11 + hd, 6, 5.5, K.head || K.fur);
    if (K.cap) b.ell(CX, 7.5 + hd, 5, 2.4, K.cap, 8 + hd);
    if (K.comb) { b.rect(CX - 2, 5 + hd, 4, 1, K.comb); [[-2, 4], [0, 3], [0, 4], [1, 4]].forEach(([x, y]) => b.set(CX + x, y + hd, K.comb)); }
    if (K.cheek) { b.ell(CX - 2.5, 10.8 + hd, 1.9, 1.9, K.cheek); b.ell(CX + 2.5, 10.8 + hd, 1.9, 1.9, K.cheek); }
    eyes(b, P, 10 + hd);
    const bk = K.beak;
    switch (K.beakType) {
      case 'hook': b.rect(CX - 1, 12 + hd, 2, 2, bk); b.set(CX, 14 + hd, dark(bk, 0.3)); break;
      case 'small': b.rect(CX - 1, 12 + hd, 2, 2, bk); break;
      case 'long': b.rect(CX - 1, 12 + hd, 2, 4, bk); break;
      case 'swan': b.rect(CX - 1, 12 + hd, 2, 3, bk); b.rect(CX - 1, 12 + hd, 2, 1, '#1a1a1a'); break;
      case 'kiwi': b.line([[CX - 1, 13 + hd], [CX - 3, 15 + hd], [CX - 5, 17 + hd], [CX - 7, 19 + hd]], bk); break;
      case 'needle': b.line([[CX - 1, 12 + hd], [CX - 1, 16 + hd]], bk); break;
    }
    if (K.comb) { b.set(CX - 1, 14 + hd, K.comb); b.set(CX - 1, 15 + hd, K.comb); }
    if (K.beakType !== 'long' && K.beakType !== 'swan') cheeks(b, 12 + hd);
    return { neck: 15 + hd, head: 5.5 + hd, eyeY: 10 + hd };
  }

  function cloud(b, K, P) {
    const hy = P.hop ? -2 : 0, hd = hy + (P.bob ? 1 : 0);
    const c = P.rainy ? '#c6ccda' : '#f4f6fc', sh = P.rainy ? '#9aa2b4' : '#c8d0e4';
    b.rect(CX - 3, 25 + hy, 2, 3, sh); b.rect(CX + 1, 25 + hy, 2, 3, sh);
    arms(b, sh, P, hd, 1);
    b.ell(CX - 4.5, 19 + hd, 4.2, 3.8, c); b.ell(CX + 4.5, 19 + hd, 4.2, 3.8, c);
    b.ell(CX, 14.5 + hd, 6.6, 6.2, c); b.ell(CX, 20 + hd, 6.4, 4.6, c);
    b.ell(CX, 23.4 + hd, 5.5, 1.2, sh);
    b.ell(CX - 3, 11 + hd, 2.2, 1.6, '#ffffff');
    eyes(b, P, 14 + hd);
    cheeks(b, 16 + hd);
    if (P.talk) b.rect(CX - 1, 17 + hd, 2, 2, '#7a2a3a');
    else if (!P.sleep) { b.set(CX - 2, 17 + hd, EYE); b.rect(CX - 1, 18 + hd, 2, 1, EYE); b.set(CX + 1, 17 + hd, EYE); }
    return { neck: 21 + hd, head: 8 + hd, eyeY: 14 + hd };
  }

  // ---------- asusteet ----------
  function scarf(b, fc, y, P) {
    const n = fc.length;
    const col = (i) => fc[Math.floor(i / 2) % n];
    for (let i = 0; i < 12; i++) { b.set(CX - 6 + i, y, col(i)); b.set(CX - 6 + i, y + 1, col(i)); }
    const wx = P.windX || 0;
    if (Math.abs(wx) > 3) {
      const dir = wx < 0 ? -1 : 1;
      for (let k = 0; k < 5; k++) {
        const x = dir < 0 ? CX - 7 - k : CX + 6 + k, yy = y + 1 + ((k + P.tick) % 2 && k > 1 ? 1 : 0);
        b.set(x, yy, col(k)); b.set(x, yy + 1, col(k));
      }
    } else for (let k = 0; k < 4; k++) { b.set(CX - 5, y + 2 + k, col(k)); b.set(CX - 4, y + 2 + k, col(k)); }
  }

  const solid = (fc) => fc.find((c) => lum(c) < 200) || fc[0];
  const second = (fc) => fc.find((c) => c !== solid(fc)) || '#ffffff';

  function hat(b, kind, fc, top) {
    const t = Math.round(top);
    switch (kind) {
      case 'beanie': {
        const c = solid(fc), c2 = second(fc);
        b.ell(CX, t + 3.6, 6.6, 4, c, t + 2);
        b.rect(CX - 7, t + 3, 14, 2, c2);
        b.ell(CX, t - 1, 1.7, 1.7, c2);
        break;
      }
      case 'santa':
        b.rect(CX - 7, t + 3, 14, 2, '#f4f4f4');
        [[2, -6, 6], [1, -5, 5], [0, -3, 5], [-1, -1, 6], [-2, 2, 7], [-3, 5, 8]].forEach(([y, a, z]) => { for (let x = a; x <= z; x++) b.set(CX + x, t + y, '#d42a2a'); });
        b.ell(CX + 9, t - 3.5, 1.5, 1.5, '#f4f4f4');
        break;
      case 'student':
        b.rect(CX - 6, t - 1, 12, 3, '#f8f8f4');
        b.rect(CX - 6, t - 1, 12, 1, '#ffffff');
        b.rect(CX - 6, t + 2, 12, 1, '#1a1a1a');
        b.rect(CX - 5, t + 3, 10, 1, '#2a2a30');
        b.set(CX - 1, t + 2, '#d8b040'); b.set(CX, t + 2, '#d8b040');
        break;
      case 'flowers': {
        const F = ['#f070a0', '#ffffff', '#f8d030', '#a070e0'];
        for (let i = 0; i < 12; i++) { b.set(CX - 6 + i, t + 2, i % 2 ? '#4a9a3a' : F[(i >> 1) % 4]); if (i % 2 === 0) b.set(CX - 6 + i, t + 1, F[(i >> 1) % 4]); }
        break;
      }
      case 'party':
        for (let y = 0; y < 7; y++) for (let x = -Math.floor(y / 2) - 1; x <= Math.floor(y / 2); x++) b.set(CX + 1 + x, t - 5 + y, (y + x) % 3 === 0 ? second(fc) : solid(fc));
        b.ell(CX + 0.5, t - 6, 1.3, 1.3, '#f8d030');
        break;
    }
  }

  function umbrella(b, fc, hd, tick) {
    const c1 = solid(fc), c2 = second(fc);
    const ux = CX + 3;
    [[0, 3], [1, 6], [2, 8], [3, 9]].forEach(([y, h]) => {
      for (let x = ux - h; x < ux + h; x++) b.set(x, y + hd, Math.floor((x - ux + 30) / 3) % 2 ? c1 : c2);
    });
    for (let x = ux - 9; x < ux + 9; x += 2) b.set(x, 4 + hd, Math.floor((x - ux + 30) / 3) % 2 ? c1 : c2);
    for (let y = 4; y <= 16; y++) b.set(CX + 6, y + hd, '#4a3a32');
    b.set(ux - 1, hd - 1, '#4a3a32');
    // vesipisarat valuvat reunoilta
    b.post.push([ux - 10, 5 + hd + (tick % 4), '#8ac8ff'], [ux + 9, 5 + hd + ((tick + 2) % 4), '#8ac8ff']);
  }

  function flagInHand(b, fc, cc, hd) {
    for (let y = 10; y <= 19; y++) b.set(CX - 9, y + hd, '#8a6a4a');
    for (let x = 0; x < 6; x++)
      for (let y = 0; y < 4; y++) {
        let c;
        if (cc === 'FI') c = y === 1 || y === 2 || x === 1 || x === 2 ? '#1a4ab0' : '#ffffff';
        else c = fc[Math.min(fc.length - 1, Math.floor((y * fc.length) / 4))];
        b.set(CX - 15 + x, 10 + y + hd, c);
      }
  }

  // ---------- maskotti ----------
  function Mascot(canvas, button, bubble) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.btn = button;
    this.bubble = bubble;
    this.o = { cc: null, kind: null, temp: 10, code: 2, phase: 'day', windX: 0, ev: { fx: {}, flag: null } };
    this.tick = 0;
    this.action = null;
    this.actionStart = 0;
    this.nextAction = performance.now() + 2500;
    this.nextBlink = performance.now() + 1500;
    this.talkUntil = 0;
    this.wakeUntil = 0;
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const loop = () => { if (!document.hidden) this.render(performance.now()); };
    this.render(performance.now());
    if (!this.reduced) setInterval(loop, 125);
  }

  Mascot.prototype.kindKey = function () {
    if (this.o.kind && KINDS[this.o.kind]) return this.o.kind;
    return ANIMAL_OF[(this.o.cc || '').toUpperCase()] || 'cloud';
  };
  Mascot.prototype.colors = function () { return FLAG[(this.o.cc || '').toUpperCase()] || DEFAULT_FLAG; };
  Mascot.prototype.name = function () { return KINDS[this.kindKey()].name; };

  Mascot.prototype.set = function (o) {
    Object.assign(this.o, o);
    this.render(performance.now());
  };

  /** Klikkaus: hyppää, heiluttaa ja sanoo jotain. */
  Mascot.prototype.react = function (text) {
    const now = performance.now();
    this.action = 'hop';
    this.actionStart = now;
    this.talkUntil = now + 3500;
    this.wakeUntil = now + 5000;
    if (this.bubble && text) {
      this.bubble.textContent = text;
      this.bubble.hidden = false;
      clearTimeout(this.bubbleT);
      this.bubbleT = setTimeout(() => { this.bubble.hidden = true; }, 4200);
    }
    this.render(now);
  };

  Mascot.prototype.pose = function (now) {
    const o = this.o, d = WX.describe(o.code).scene;
    const fx = (o.ev && o.ev.fx) || {};
    const asleep = o.phase === 'night' && !fx.fireworks && !fx.kokko && now > this.wakeUntil;
    const P = { tick: this.tick, windX: o.windX, arm: 'down', armL: 'down', rainy: d.precip !== 'none' && d.precip !== 'snow' };
    P.umbrella = P.rainy || !!d.thunder;
    P.hat = fx.xmas ? 'santa' : fx.balloons ? 'student' : fx.kokko ? 'flowers' : fx.fireworks ? 'party' : o.temp <= 0 ? 'beanie' : null;
    P.shades = o.phase === 'day' && o.temp >= 24 && d.clouds <= 0.5 && !P.umbrella;
    P.sweat = o.temp >= 28;
    P.flag = !!(o.ev && o.ev.flag) && !P.umbrella;
    P.sleep = asleep;
    P.talk = now < this.talkUntil && !asleep;
    P.bob = Math.floor(now / (asleep ? 1200 : 650)) % 2 === 1;
    // räpäytys
    if (now > this.nextBlink) { this.blinkEnd = now + 140; this.nextBlink = now + 2200 + Math.random() * 3200; }
    P.blink = now < this.blinkEnd;
    // satunnaiset liikkeet
    if (!this.action && now > this.nextAction && !asleep) {
      const opts = ['wave', 'look', 'hop', P.umbrella ? 'wave' : 'point'];
      this.action = opts[Math.floor(Math.random() * opts.length)];
      this.actionStart = now;
    }
    const at = now - this.actionStart;
    const A = this.action;
    if (A === 'wave') {
      const up = Math.floor(at / 220) % 2 === 0;
      if (P.umbrella || P.flag) P.armL = up ? 'up' : 'mid';
      else P.arm = up ? 'up' : 'mid';
      if (at > 1800) this.endAction(now);
    } else if (A === 'point') {
      P.arm = 'point';
      P.eyeDX = 1;
      if (at > 2000) this.endAction(now);
    } else if (A === 'look') {
      P.eyeDX = at < 900 ? -1 : 1;
      if (at > 1800) this.endAction(now);
    } else if (A === 'hop') {
      P.hop = at < 260 || (at > 520 && at < 780);
      P.armL = 'up'; P.arm = P.umbrella ? 'hold' : 'up';
      if (at > 1100) { this.action = 'wave'; this.actionStart = now; }
    }
    if (fx.fireworks && !A) { P.armL = 'up'; P.arm = 'up'; P.up = true; }
    if (P.umbrella) P.arm = 'hold';
    if (P.flag && P.armL === 'down') P.armL = 'mid';
    P.shiver = o.temp <= -10 && !asleep;
    return P;
  };
  Mascot.prototype.endAction = function (now) { this.action = null; this.nextAction = now + 4500 + Math.random() * 6500; };

  Mascot.prototype.render = function (now) {
    this.tick++;
    const K = KINDS[this.kindKey()], fc = this.colors(), P = this.pose(now);
    const b = new Buf();
    const m = K.type === 'bird' ? bird(b, K, P) : K.type === 'cloud' ? cloud(b, K, P) : mammal(b, K, P);
    scarf(b, fc, Math.round(m.neck), P);
    if (P.hat) hat(b, P.hat, fc, m.head);
    if (P.shades) {
      const y = Math.round(m.eyeY);
      b.rect(CX - 4, y, 3, 2, '#141420'); b.rect(CX + 1, y, 3, 2, '#141420'); b.rect(CX - 1, y, 2, 1, '#141420');
      b.post.push([CX - 4, y, '#8a9ac8']);
    }
    if (P.flag) flagInHand(b, fc, (this.o.cc || '').toUpperCase(), P.hop ? -2 : P.bob ? 1 : 0);
    if (P.umbrella) umbrella(b, fc, P.hop ? -2 : 0, this.tick);
    if (P.sweat && !P.sleep) b.post.push([CX + 6, Math.round(m.eyeY) - 2 + (this.tick % 6 > 2 ? 1 : 0), '#7ac8ff'], [CX + 6, Math.round(m.eyeY) - 1 + (this.tick % 6 > 2 ? 1 : 0), '#bfe4ff']);
    if (P.sleep) {
      const Z = ['###', '.#.', '###'];
      for (let k = 0; k < 2; k++) {
        const ph = (this.tick + k * 8) % 16;
        const zx = CX + 6 + k * 3 + Math.floor(ph / 6), zy = 6 - Math.floor(ph / 3);
        if (zy < 0) continue;
        Z.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && b.post.push([zx + i, zy + j, '#cfe6ff'])));
      }
    }
    b.outline();
    // piirto
    const sx = P.shiver ? (this.tick % 2 ? 1 : -1) : 0;
    const img = this.ctx.createImageData(GW, GH);
    for (let y = 0; y < GH; y++)
      for (let x = 0; x < GW; x++) {
        const c = b.p[y * GW + x];
        const tx = x + sx;
        if (!c || tx < 0 || tx >= GW) continue;
        const [r, g, bl] = rgb(c), i = (y * GW + tx) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = bl; img.data[i + 3] = 255;
      }
    this.ctx.putImageData(img, 0, 0);
  };

  WX.Mascot = Mascot;
  WX.MASCOT_KINDS = Object.keys(KINDS).map((k) => [k, KINDS[k].name]);
})();
