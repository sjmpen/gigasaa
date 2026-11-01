# Gigasää

Sääsivu IS Supersään hengessä. Mukana nykyhetki, päivän ja viikon sää sekä lämpötilavertailu
viime vuoteen. Taustalla on 16-bittisten JRPG-pelien (Final Fantasy V -tyyli) henkeen piirretty
pikseligrafiikkamaisema. Se vaihtuu vallitsevan sään, vuorokaudenajan ja vuodenajan mukaan sekä
paikan asutuksen, maanosan ja ilmaston mukaan.

## Ominaisuudet

- **Nyt**: lämpötila, sääsymboli, tuntuu kuin -lämpötila, tuuli ja puuskat, kosteus, ilmanpaine,
  pilvisyys, päivän sademäärä, auringonnousu ja -lasku, kuun vaihe sekä tarvittaessa lumensyvyys,
  aallonkorkeus ja revontulten todennäköisyys.
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
- **Sijainnin mukainen maisema** (paikan nimen alla näkyy, mihin luokkiin paikka kuuluu):
  - **Asutus** DEGURBA-luokituksen väkilukurajoilla: kaupunki (≥ 50 000 as.) näyttää siluetin,
    TV-tornin, nosturit ja lentoestevalot. Pikkukaupunki tai taajama (≥ 5 000) on yhtenäinen talorivi
    maamerkin ja katuvalojen kanssa, kylä (≥ 500) muutama talo ja kirkko, haja-asutus pelkkä mökki.
    Kaupungissa valosaaste himmentää tähtitaivaan.
  - **Alue** määrää rakennustyylin: Pohjola (punamullatut puutalot, puukirkko), muu Eurooppa
    (tiilikatot, kirkko), Pohjois-Amerikka (latot, siilot, vesitornit), Etelä-Amerikka (värikkäät
    talot), Itä-Aasia (kaarevat katot, pagodi, neonvalot), Länsi- ja Etelä-Aasia (tasakatot,
    kupolirakennus), Afrikka (pyöreät majat kylissä), Oseania (peltikatot) ja Antarktis (tutkimusasema).
  - **Kasvillisuus** tulee Köppenin ilmastoluokasta, joka lasketaan paikan viimeisen vuoden
    säädatasta: tundra, taiga, havu- ja sekametsä, lehtimetsä, subtrooppinen metsä, välimeren
    kasvillisuus, aro, aavikko, savanni tai sademetsä. Vyöhyke vaikuttaa maastoon (tunturit, kukkulat,
    mesat, dyynit, jyrkät huiput), puulajeihin, maan väriin ja vesistöön.
- **Taivas ja luonto todellisen datan mukaan**:
  - **Aurinko ja kuu** näkyvät oikeilla paikoillaan taivaalla (korkeus ja suunta lasketaan kellonajasta
    ja sijainnista). Taivaan väri muuttuu liukuvasti auringon korkeuden mukaan, joten kaamos ja
    yötön yö näkyvät oikein. Kuu piirretään oikeassa vaiheessaan, ja kalpea päiväkuu näkyy myös päivällä.
  - **Revontulet** näkyvät kirkkaina öinä, kun NOAA:n Kp-indeksi ja paikan geomagneettinen
    leveysaste riittävät. Voimakkailla revontulilla verhojen yläosa muuttuu violetiksi.
  - **Lumi ja jää**: maassa on lunta, kun lumensyvyys on vähintään 1 cm. Järven jäätila (avoin,
    rantajää, jäässä) lasketaan viimeisten noin 150 päivän pakkasvuorokausista, merelle korkeammilla
    rajoilla.
  - **Meri vai järvi**: jos merenranta on 5 km säteellä, toisella laidalla on avomeri, saari ja
    majakka, joka vilkkuu öisin. Aallonharjojen määrä riippuu aallonkorkeudesta, ja rannikolla
    lentää lokkeja.
  - **Korkeuserot** lähiseudun maastosta: tasaisella maalla matalat kukkulat, tuntureilla
    pyöreät tunturit ja yli 900 m:n korkeuseroilla jyrkät alppihuiput. Huiput ovat lumisia, jos
    ne yltävät lumirajan yläpuolelle.
  - **Tuuli** heiluttaa etualan puita ja liputtaa mökin viiriä tuulen suuntaan. Sade, lumi,
    savu ja pilvet kulkevat samaan suuntaan.
- **Juhlapyhät**: juhannuskokko vastarannalla ja siniristilippu salossa, vapun ilmapallot,
  jouluvalot mökin räystäällä ja kuusessa, uudenvuoden ilotulitus, itsenäisyyspäivän kaksi
  kynttilää ikkunalla ja halloween-kurpitsa. Suomen liputuspäivinä mökin tangossa on lippu, muulloin
  viiri. Juhlapäivän toivotus näkyy säätietojen alla.
- **Eläimet**: porot Lapissa, kamelit aavikolla, kirahvi savannilla, kenguru Australiassa,
  sorsat kesäjärvellä, lokit merenrannalla ja muuttolintujen aurat keväällä ja syksyllä.
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
| `pop`, `cc` | `&pop=215000&cc=FI` | Paikan väkiluku ja maakoodi. Ne lisätään automaattisesti; jos ne puuttuvat, ne haetaan paikan nimellä. |
| `demo` | `?demo=1` | Synteettinen demodata, joka toimii ilman verkkoyhteyttä. |
| `scene` | `?scene=snow` | Taustan esikatselu: `clear`, `partly`, `cloudy`, `fog`, `drizzle`, `rain`, `heavyrain`, `sleet`, `snow`, `heavysnow`, `thunder` |
| `time` | `?time=night` | Taustan vuorokaudenaika: `day`, `dusk`, `night` |
| `season` | `?season=winter` | Taustan vuodenaika: `spring`, `summer`, `autumn`, `late`, `winter` |
| `settle` | `?settle=city` | Taustan asutus: `rural`, `village`, `town`, `city` |
| `region` | `?region=eastasia` | Taustan rakennustyyli: `nordic`, `europe`, `namerica`, `samerica`, `eastasia`, `westasia`, `africa`, `oceania`, `antarctica` |
| `biome` | `?biome=desert` | Taustan kasvillisuus: `tundra`, `taiga`, `boreal`, `temperate`, `subtropical`, `mediterranean`, `steppe`, `desert`, `savanna`, `rainforest` |
| `coast` | `?coast=1` | Meri (`1`) tai järvi (`0`) |
| `relief` | `?relief=1800` | Maaston korkeusero metreinä (esim. `30`, `400`, `1800`) |
| `kp` | `?kp=5` | Revontulien Kp-indeksi |
| `wind` | `?wind=14` | Tuulen nopeus m/s (puiden huojunta, liput) |
| `event` | `?event=juhannus` | Tapahtuma: `juhannus`, `vappu`, `joulu`, `uusivuosi`, `itsenaisyyspaiva`, `halloween`, `liputus` |

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
  Samalla haulla saadaan myös viimeisen vuoden päivälämpötilat ja sademäärät. Niistä lasketaan
  Köppenin ilmastoluokka (Peel ym. 2007), joka määrää taustan kasvillisuuden.
- **Paikkahaku**: Open-Meteo Geocoding API, joka antaa myös paikan väkiluvun (GeoNames) ja
  maakoodin. Oman sijainnin nimen ja maan hakee BigDataCloudin ilmainen käänteisgeokoodaus.
- **Taustan ympäristötiedot** haetaan sivun latauduttua, joten ne eivät hidasta sääsivua. Jos
  jokin haku epäonnistuu, käytetään oletusarvoja.
  - Lumensyvyys tulee Open-Meteon tuntiennusteesta (`snow_depth`).
  - Kp-indeksi: [NOAA SWPC](https://www.swpc.noaa.gov/), välimuisti 15 min.
  - Merenranta: OpenStreetMapin `natural=coastline` [Overpass API:n](https://overpass-api.de/)
    kautta. Tulos tallennetaan selaimeen paikkakohtaisesti.
  - Aallonkorkeus: Open-Meteo Marine API.
  - Korkeuserot: Open-Meteo Elevation API, 17 pistettä (keskusta sekä 10 ja 25 km:n kehä).
  - Auringon ja kuun paikat sekä kuun vaihe lasketaan selaimessa tavanomaisilla matalan
    tarkkuuden kaavoilla.

### Asutusluokan arviointi

Virallinen DEGURBA-luokitus (Eurostat ja GHSL) perustuu 1 km²:n väestöruutuihin. Sitä ei voi kysyä
selaimesta ilman isoja aineistoja, joten Gigasää arvioi luokan DEGURBAn väkilukurajoilla paikan
väkiluvusta: kaupunkikeskus ≥ 50 000, kaupunkiklusteri ≥ 5 000, kylä ≥ 500 asukasta. Kun sijainti
on haettu paikannuksella ja se on kaukana taajaman keskustasta, luokkaa pudotetaan (esim. kaupungin
laidalta tulee pikkukaupunki ja metsästä haja-asutusalue).

Jos pitkä ennuste tai viime vuoden data ei ole saatavilla, sivu toimii silti, ja kaavion alla
kerrotaan, mitä puuttuu.

## Rakenne

```
index.html          sivun rakenne
css/style.css       tyylit (JRPG-henkiset ikkunat)
js/weathercodes.js  WMO-säätilakoodit → suomenkielinen kuvaus, symboli, taustan säätila
js/place.js         paikan luokittelu: asutus (DEGURBA-arvio), alue/rakennustyyli, Köppenin ilmastoluokka
js/astro.js         auringon ja kuun paikka, kuun vaihe, geomagneettinen leveys ja revontulten näkyvyys
js/events.js        juhlapyhät, tapahtumat ja Suomen liputuspäivät
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
- Ilmanlaatu tai siitepöly näkyviin utuna taustassa.
