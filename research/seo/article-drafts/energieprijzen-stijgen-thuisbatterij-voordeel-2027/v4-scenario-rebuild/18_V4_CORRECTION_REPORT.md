# 18 · V4 correction report

Correctiepassage op de V4 scenario-rebuild: conclusies teruggebracht tot wat de data ondersteunt. Structuur en de zes visuals zijn behouden. Niets toegepast op productie.

| # | Gewijzigde claim | Oude formulering | Nieuwe formulering | Reden | Artikelsectie(s) | Visual |
|---|---|---|---|---|---|---|
| 1 | Onderzoeksclaim-grens | '...met de onderzoeksdata en het rekenmodel van Batterijenplan' (impliceert dat EUR158-318 onderzoeksoutput is) | Expliciete scheiding: profielen/aannames = research input; voor/na-2027-bedragen = afgeleid 2027-scenariomodel (geen onderzoeksresultaat, geen per-profiel-uitkomst uit de matrix) | De 25-cel matrix bevat totale jaarwaarden (marktjaar 2025), geen geverifieerde 2027-deltas per profiel | Intro (2 callouts), scenario-tabelcaption, alle figuurbronnen, methodesectie, conclusie | V3, V4 subtitles |
| 2 | Dynamisch 2027-effect | 'Bij een dynamisch contract verandert 2027 nauwelijks iets: ... 2027-effect is EUR0'; S8/S9 = EUR0; V5 dynamisch balken; FAQ 'verandert weinig' | 'Bij een dynamisch contract werkt het anders; het 2027-verschil is NIET GEKWANTIFICEERD met beschikbare data (kwartierdata + verrekenmethode + contractvoorwaarden nodig)' | Dynamische contracten zijn voor 2027 niet uitgezonderd van saldering; zonder contract-specifieke backtest is het effect niet te bepalen; prijssturing is een aparte waarde | Kort antwoord, Situatie 6, Situatie 7, 'weinig verschil'-sectie, checklist, FAQ, conclusie, scenario-tabel (S8/S9=n.v.t.) | V5 (dyn-paneel i.p.v. euro-balken), V6 (dynamisch -> contractspecifieke berekening) |
| 3 | Terugleververgoeding EUR0,070 | 'wettelijk minimaal 50% van het kale leveringstarief ... EUR0,07 ... wettelijk minimum, geen aanname' + tabel 'ACM-ondergrens' + captions 'ACM 50%-ondergrens ~EUR0,070' | Wettelijke regel apart: 'tot 1-1-2030 >=50% van de overeengekomen leveringsprijs EXCL. energiebelasting en btw'. EUR0,07 = SCENARIOWAARDE (50% x gekozen kaal leveringstarief); expliciet 'geen officieel/landelijk/gegarandeerd tarief'; berekening getoond | EUR0,070 is geen landelijk vastgesteld tarief; het is een afgeleide rekenaanname uit de 50%-ondergrens | 'Wat verandert er' (regel + scenariowaarde apart), uitgangspunten-tabel, V4-caption, bronnen | V4 caption/subtitle |
| 4 | Batterij-doorzet 1.760 kWh | 'de batterij is vol' / 'het maximum dat een 10 kWh-batterij kan verschuiven' / 'plafond van een 10 kWh-batterij' / tabel 'max. 1.760 kWh' | 'gemodelleerde jaarlijkse doorzet (220x8 kWh, aanname), geen fysiek batterijmaximum'; +uitleg dat een 10 kWh-batterij technisch meer cycli kan maken en dat werkelijke doorzet van overschot/profiel/laadvermogen/seizoen/EMS/werkgrenzen afhangt | 1.760 kWh volgt uit 220 aangenomen laaddagen x 8 kWh, niet uit een fysieke celgrens; EUR318-verzadiging is een gevolg van die aanname | Uitgangspunten-tabel, scenario-interpretatie, Situatie 3, batterij-maatparagraaf | V4 subtitle |
| 5 | Terugleverkosten-onafhankelijkheid | 'het 2027-effect is onafhankelijk van de terugleverkosten' | 'binnen dit vereenvoudigde model (gelijke TLK-aanname voor en na 2027) bepalen terugleverkosten de TOTALE waarde maar vallen ze weg uit het berekende 2027-VERSCHIL; echte contracten (vaste maandbedragen, staffels, volumegrenzen, wijzigende 2027-voorwaarden) kunnen dat anders doen' | De onafhankelijkheid is een artefact van de modelaanname, geen algemene waarheid | Scenario-interpretatie, Situatie 4 | - |
| 6 | Rekenledger + gevoeligheid | Alleen totalen (EUR167/485/318) zonder componenten of gevoeligheid | Volledige ledger per component (opgeslagen/bruikbaar/verlies/vermeden inkoop/gemiste vergoeding/vermeden TLK/voor/na/incrementeel/bron), de algebra 'incrementeel = opgeslagen kWh x (tarief - vergoeding)' met geldigheidsvoorwaarden, en een gevoeligheidstabel (EUR166-477) | Toont reproduceerbaarheid en dat EUR318 een van vele scenario-uitkomsten is, geen voorspelling | Nieuwe sectie 'Zo is het gerekend ... en hoe gevoelig het is' | - |
| 7 | Officiele bronwoorden | 'terugleververgoeding minimaal 50% van het kale leveringstarief (2027-2030)' | 'tot 1-1-2030 minimaal 50% van de overeengekomen leveringsprijs, excl. energiebelasting en btw; afname/teruglevering apart afgerekend; terugleverkosten kunnen van toepassing zijn; werkelijke uitkomst verschilt per contract'; bronnen geraadpleegd 2026-08-02 | Precieze wettelijke formulering (Energiewet/ACM) en toegangsdatum; geen toekomstige leveranciersprijzen als vaststaand | 'Wat verandert er', FAQ, bronnen/methode | - |

## Factuele classificatie per correctie
- **Onderzoeksclaim-grens** -> RESEARCH INPUT vs DERIVED MODEL
- **Dynamisch 2027-effect** -> NOT QUANTIFIED WITH AVAILABLE DATA
- **Terugleververgoeding EUR0,070** -> SCENARIO VALUE DERIVED FROM STATUTORY 50% FLOOR
- **Batterij-doorzet 1.760 kWh** -> SCENARIO ASSUMPTION
- **Terugleverkosten-onafhankelijkheid** -> DERIVED CALCULATION (gekwalificeerd)
- **Rekenledger + gevoeligheid** -> DERIVED CALCULATION + SENSITIVITY
- **Officiele bronwoorden** -> VERIFIED OFFICIAL FACT

## Eindasserties (geverifieerd)
- Geen dynamisch-contract EUR0-claim meer (vervangen door 'niet gekwantificeerd').
- Geen EUR0,070 'officieel tarief'-claim meer (gelabeld als scenariowaarde uit de 50%-ondergrens).
- Geen fysiek 1.760 kWh batterijmaximum-claim meer (gelabeld als gemodelleerde doorzet).
- Geen universele terugleverkosten-onafhankelijkheid meer (gekwalificeerd tot 'binnen dit model').
- Elk afgeleid getal is gelabeld (afgeleid/scenariowaarde/aanname).
- Vaste-contractberekeningen reproduceren exact (08_SCENARIO_CALCULATIONS.csv; incrementeel = opgeslagen kWh x (tarief - vergoeding)).
- Artikelbody bevat geen codeblokken (0 <pre>/<code>, 0 fences); geen dubbele H1.
- Visuals laden zonder horizontale overflow (docW==winW op 1440 en 360).
- Productie ongewijzigd; geen Render-toegang; niets gecommit of gepusht.
