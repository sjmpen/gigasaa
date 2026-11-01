# Gigasää

Sääsivu IS Supersään hengessä. Mukana nykyhetki, päivän ja viikon sää sekä lämpötilavertailu
viime vuoteen. Taustalla on 16-bittisten JRPG-pelien (Final Fantasy V -tyyli) henkeen piirretty
pikseligrafiikkamaisema, joka vaihtuu vallitsevan sään, vuorokaudenajan ja vuodenajan mukaan.

## Ominaisuudet

- **Nyt**: lämpötila, sääsymboli, tuntuu kuin -lämpötila, tuuli ja puuskat, kosteus, ilmanpaine,
  pilvisyys, päivän sademäärä, auringonnousu ja -lasku.
- **Päivän sää**: tuntiennuste seuraaville 24 tunnille, mukana lämpötilakäyrä, sade ja tuuli.
  Viikkolistan päivää klikkaamalla näet sen päivän tunnit.
- **Viikon sää**: 7 päivää (tai 14 päivää), ylin ja alin lämpötila, vaihteluväli, sade ja tuuli.
- **Lämpötila: tämä vuosi vs. viime vuosi**: viivakaavio 30 päivää taaksepäin ja 30 päivää
  eteenpäin. Valittavana keski-, ylin tai alin lämpötila. Kaaviossa on hiiren ja näppäimistön
  työkaluvihje (nuolinäppäimet), ja sen voi avata myös taulukkona.
- **Pikseligrafiikkatausta**: tunturit, kuusimetsä, järvi heijastuksineen ja punainen mökki.
  Säätila tuo mukaan pilvet, sateen, lumen, ukkosen tai sumun. Vuorokaudenajat ovat päivä, hämärä
  ja yö (kuu ja tähdet), ja vuodenajat kevät, kesä, ruska, myöhäissyksy ja talvi (lumi ja jäätynyt
  järvi). Maisema arvotaan paikkakunnan nimen perusteella, joten jokaisella paikalla on oma maisemansa.
- **Paikkahaku** ja **oma sijainti** (selaimen paikannus).

## Käyttö

Sivu on puhdasta HTML:ää, CSS:ää ja JavaScriptiä. Kääntämistä tai riippuvuuksia ei tarvita.

```bash
python3 -m http.server 8000
```

Avaa sitten <http://localhost:8000/>. Sivun voi julkaista sellaisenaan esimerkiksi GitHub Pagesissa.

### URL-parametrit

| Parametri | Esimerkki | Selitys |
|---|---|---|
| `name`, `lat`, `lon` | `?name=Oulu&lat=65.01&lon=25.47` | Näytettävä paikka. Viimeisin paikka muistetaan myös selaimessa. |
| `demo` | `?demo=1` | Synteettinen demodata, joka toimii ilman verkkoyhteyttä. |
| `scene` | `?scene=snow` | Taustan esikatselu: `clear`, `partly`, `cloudy`, `fog`, `drizzle`, `rain`, `heavyrain`, `sleet`, `snow`, `heavysnow`, `thunder` |
| `time` | `?time=night` | Taustan vuorokaudenaika: `day`, `dusk`, `night` |
| `season` | `?season=winter` | Taustan vuodenaika: `spring`, `summer`, `autumn`, `late`, `winter` |

Samat taustavalinnat löytyvät sivun alalaidan kohdasta **Taustan esikatselu**.

## Data

Kaikki säätiedot tulevat [Open-Meteosta](https://open-meteo.com/) (CC BY 4.0, ei API-avainta):

- **Ennuste** (`api.open-meteo.com/v1/forecast`): nykyhetki sekä tunti- ja päiväennuste 16 päivälle.
  Lisäksi haetaan 31 päivää taaksepäin, jolloin saadaan tämän vuoden kuluneen kuukauden lämpötilat.
- **Pitkä ennuste** (`ensemble-api.open-meteo.com`, GFS-parviennuste, 35 päivää) täydentää
  kaavion päiville +16…+30. Arvona käytetään parven jäsenten keskiarvoa, ja kaaviossa näytetään
  10–90 %:n vaihteluväli. Parviennusteen harha korjataan vertaamalla sitä päivien +6…+15
  pääennusteeseen.
- **Viime vuosi** (`archive-api.open-meteo.com`, ERA5-uusanalyysi): sama ajanjakso vuotta aiemmin.
- **Paikkahaku**: Open-Meteo Geocoding API. Oman sijainnin nimen hakee BigDataCloudin
  ilmainen käänteisgeokoodaus.

Jos pitkä ennuste tai viime vuoden data ei ole saatavilla, sivu toimii silti, ja kaavion alla
kerrotaan, mitä puuttuu.

## Rakenne

```
index.html          sivun rakenne
css/style.css       tyylit (JRPG-henkiset ikkunat)
js/weathercodes.js  WMO-säätilakoodit → suomenkielinen kuvaus, symboli, taustan säätila
js/icons.js         pikseligrafiikkaiset sääsymbolit, osoitinkäsi ja tuulinuoli (piirretään koodilla)
js/pixelbg.js       pikseligrafiikkatausta (canvas, matala resoluutio, Bayer-ditteröinti)
js/api.js           Open-Meteo-haut ja datan jäsentäminen
js/demo.js          synteettinen demodata (?demo=1)
js/chart.js         vertailukaavio (SVG)
js/app.js           sovelluslogiikka ja näkymät
fonts/              DotGothic16 ja Jersey 10 (SIL Open Font License)
```

## Jatkokehitysideoita

- Graafinen viimeistely: käsin piirretyt sprite-sheetit sääsymboleille ja maisemalle.
- Siirtymäanimaatio, kun sää tai paikka vaihtuu.
- Varoitukset (esim. Ilmatieteen laitoksen avoin data) ja sadetutka.
