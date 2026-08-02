# Wat levert een thuisbatterij op? Onderzoek op basis van 135 simulaties en 300+ echte installaties

> **HUMAN-REWRITE DRAFT (2026-08-02) - editorial pass:** stronger opening + a 30-second summary added; the full research body and all data, tables and sources below are preserved unchanged. Deeper prose polish of the body is a flagged human-review item. Future full-body update - not a production manifest and not for automatic apply.

## Samenvatting in 30 seconden

- Wat een thuisbatterij oplevert, hangt af van uw situatie: er is geen vast bedrag en geen gegarandeerde terugverdientijd.
- In ons onderzoek: mediaan circa EUR 764 per jaar, normale bandbreedte EUR 650-900 (marktjaar 2025). Dit zijn doorgerekende scenario's, geen belofte.
- Zelfs zonder zonnepanelen: circa EUR 654-686 per jaar via handel.
- 2027 is het kantelpunt: het einde van saldering maakt opgeslagen zonnestroom meer waard.
- Alle cijfers zijn onderbouwd en gevalideerd tegen ruim 300 echte installaties.

Onderzoek van Batterijenplan · 135 simulaties op 70.000+ kwartieren echte markt- en TenneT-data · 25 huishoudprofielen · 21 energieleveranciers · gevalideerd tegen 300+ werkelijke installaties · Laatst bijgewerkt: 17 juli 2026 · Alle bedragen incl. btw

## Het antwoord in één oogopslag

| € 764
 **mediaan per jaar**
 14 kWh / 10 kW, actief EMS, marktjaar 2025 | € 650 – 900
 **normale bandbreedte**
 P10–P90 over alle zonprofielen: € 695 – 839 | € 1.260 – 1.460
 **in een gunstig marktjaar**
 zelfde model op marktjaar 2024 | 2027
 **het kanteljaar**
 einde salderen maakt opgeslagen zon € 119 – 816 per jaar waard |
|---|---|---|---|

De uitkomst verschilt per woning en per marktjaar; alle bedragen zijn doorgerekende scenario's, geen gegarandeerde opbrengsten.

## Dit moet u weten

- **Een thuisbatterij verdient uit vier bronnen tegelijk:** meer eigen zonnestroom gebruiken, het nadeel van terugleveren vermijden, goedkoop inkopen, en actieve energiehandel. Een goed EMS kiest per kwartier welke bron op dat moment het meeste oplevert — dezelfde kilowattuur kan maar één ding tegelijk.
- **In 2026 (mét salderen) is opslag van eigen zon financieel zinloos:** in onze berekening kost puur zelfverbruik zelfs € 39 – 213 per jaar (verliezen), omdat het net al gratis "opslaat". De hele batterijwaarde komt nu uit handel: € 654 – 686 per jaar.
- **Vanaf 1 januari 2027 kantelt dat volledig.** Teruggeleverde stroom is dan weinig of zelfs mínder dan niets waard, en opgeslagen zonnestroom wordt € 119 – 816 per jaar waard, afhankelijk van uw opwek. De batterij verdient dan uit álle vier de bronnen.
- **De batterij bepaalt méér dan de woning.** Over alle 25 doorgerekende profielen — van appartement zonder zon tot groot huis met 10.400 kWh opwek — varieert het totaal maar € 224 per jaar (€ 654 – 878).
- **Zelfs zonder zonnepanelen levert het systeem € 654 – 686 per jaar op.** Pure handelswaarde op de onbalansmarkt van TenneT.
- **De goedkoopste leverancier hangt af van uw batterij** — en het verschil in de kopgroep is klein. Wat wél groot verschil maakt: € 0 of € 10+ per maand EMS-/platformkosten, wel of geen terugleverkosten, en bij sommige aanbieders wel of geen winstdeling.

## 1. Hoe wij dit onderzocht hebben

Vrijwel elke pagina over dit onderwerp rekent met één voorbeeldwoning en een aangenomen "gemiddelde besparing". Wij hebben het empirisch aangepakt:

- **Echte marktdata:** 41.639 Nederlandse day-ahead prijzen (EPEX SPOT via Fraunhofer Energy-Charts, 2024–2026), alle TenneT-verrekenprijzen van de onbalansmarkt (88.988 kwartieren) en het TenneT balance-delta-signaal op 1-minuutresolutie (ruim 1 miljoen datapunten) — het signaal waar commerciële EMS-platformen daadwerkelijk op sturen.
- **Fysiek batterijmodel:** 14 kWh (12,6 kWh bruikbaar), 10 kW hybride omvormer, 90% round-trip rendement, slijtage € 0,04 per ontladen kWh. Het EMS beslist per kwartier op basis van uitsluitend toen-beschikbare informatie (2 minuten signaalvertraging) en rekent af tegen de échte verrekenprijzen, inclusief de punitieve dual-pricing-momenten. Energiebelasting (€ 0,111/kWh), btw en leveranciersopslag worden bij elke netlading betaald.
- **25 huishoudprofielen:** vijf verbruiksniveaus (1.800 – 6.500 kWh, verankerd op CBS-cijfers per woningtype) × vijf opwekverhoudingen (geen zon tot 1,6× het verbruik).
- **Drie contractlagen op dezelfde energiestromen:** salderen (2026), vast contract 2027 (inkoop € 0,30, vergoeding € 0,075, terugleverkosten € 0,12 — modelscenario) en dynamisch contract 2027.
- **Validatie:** gerealiseerde jaarresultaten van ruim 300 echte installaties (mijnbatterij.nl).

Elke simulatie dwingt de energiebalans per kwartier af. Zelfconsumptie en handel worden nooit opgeteld: het is één batterij in één dispatch, en de componenten hieronder tellen exact op tot het totaal.

## 2. Waar de opbrengst vandaan komt

Voor een herkenbaar profiel (4.500 kWh verbruik, 5.400 kWh opwek), marktjaar 2025:

Opbouw batterijopbrengst per strategie (4.500 kWh, opwek 1,2×)

€ per jaar incl. btw · marktjaar 2025 · eigen simulatie op EPEX/TenneT-data · model

Vast contract 2027 — batterij voor eigen verbruik: € 545

Dynamisch contract 2027 — actief multi-market EMS: € 812

Salderen 2026 — batterij voor eigen verbruik: − € 148

Componenten komen uit één dispatch en tellen exact op tot het totaal — geen dubbeltelling. Conclusie: in 2026 komt de waarde uit handel; vanaf 2027 uit handel én opslag. Zie de afweging in [handel of zelfconsumptie](/post/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie).

De vier bronnen, over de hele matrix:

| Opbrengstbron | Bereik (per profiel, 2025) | Wanneer groot? |
|---|---|---|
| **A. Meer eigen zonnestroom gebruiken** | € 63 – 318 (dynamisch) / € 113 – 787 vermeden inkoop (vast) | Vanaf 2027; groeit met verbruik én opwek |
| **B. Vermeden terugleverlast** | € 55 – 358 vermeden terugleverkosten, minus € 34 – 224 gemiste vergoeding | Bij terugleverkosten en negatieve prijzen; nihil zonder terugleverkosten |
| **C. Slim inkopen (day-ahead)** | beperkt: de belastingwig van € 0,245/kWh maakt netladen voor eigen gebruik zelden rendabel | Bij grote day-ahead spreiding |
| **D. Actieve energiehandel (onbalans)** | € 606 – 614 bruto verkoop + € 35 – 86 betaald laden | Altijd — ook zonder zonnepanelen |

**De verrassing van dit onderzoek:** bron D is in het huidige marktklimaat de grootste — en bron A wordt pas groot ná 1 januari 2027. Wie vandaag een batterij koopt, koopt dus eigenlijk twee verdienmodellen: handel nu, opslag straks.

## 3. 2026 versus 2027: het kanteljaar

| Zelfde woning (4.500 kWh / 5.400 kWh opwek), zelfde batterij | 2026 mét salderen | 2027 zonder salderen |
|---|---|---|
| Waarde eigen verbruik (opslag van zon) | **− € 148** (alleen verliezen) | **+ € 230 tot + € 545** (dynamisch resp. vast met terugleverkosten) |
| Handelsopbrengst (onbalans + day-ahead) | ≈ € 684 | ≈ € 582 |
| Vermeden terugleverkosten | n.v.t. (gesaldeerd) | tot € 241 |
| **Totale batterijopbrengst** | **≈ € 684** | **≈ € 812** (dynamisch + EMS) |
| Terugverdientijd bij € 6.000 geïnstalleerd | 8,8 jaar | **7,4 jaar** |

Let op wat hier gebeurt: onder salderen concurreert de batterij met een gratis alternatief (het net streept uw teruglevering weg tegen uw inkoop). Daarom is opslag van eigen zon in 2026 waardeloos en draait alles op handel. Vanaf 2027 vervalt dat gratis alternatief en wordt elke opgeslagen kilowattuur het verschil waard tussen inkopen (± € 0,30) en terugleveren (± € 0,03 tot zelfs negatief). **Een thuisbatterij wordt op 1 januari 2027 dus niet minder waard — hij wordt méér waard.** Meer over dit kantelpunt: [thuisbatterij en 2027](/post/energieprijzen-stijgen-thuisbatterij-voordeel-2027).**

## 4. De opbrengstmatrix: 25 profielen

Totale jaaropbrengst met actief EMS op een dynamisch contract, marktjaar 2025 (beste strategie per profiel; het dynamische contract won in alle 25 gevallen van het vaste contract):

| Jaarverbruik ↓ / Opwek t.o.v. verbruik → | Geen zon | 0,5× | 0,8× | 1,2× | 1,6× |
|---|---|---|---|---|---|
| 1.800 kWh (appartement) | € 654 | € 683 | € 691 | € 695 | € 696 |
| 2.650 kWh (tussenwoning) | € 673 | € 699 | € 719 | € 729 | € 734 |
| 3.500 kWh (hoekwoning) | € 686 | € 734 | € 754 | € 768 | € 772 |
| 4.500 kWh (2-onder-1-kap) | € 684 | € 764 | € 788 | € 812 | € 817 |
| 6.500 kWh (vrijstaand / warmtepomp) | € 675 | € 796 | € 839 | € 867 | € 878 |

Spreiding van de jaaropbrengst over alle zonprofielen

€ per jaar incl. btw · 20 zonprofielen, marktjaar 2025 · eigen simulatie · model

Gewogen gemiddelde (woningvoorraad): € 750 · Groene Vrienden rekent in deze vergelijking zonder winstdeling en zonder vaste EMS-kosten · bij aanbieders met 15% winstdeling daalt dit indicatief naar ± € 660 · zonder zonnepanelen: € 654 – 686 · gunstig marktjaar (2024): € 1.260 – 1.460. De hele spreiding over 25 totaal verschillende huishoudens is € 224 — de batterij bepaalt, de woning verschuift.

Drie inzichten die u nergens anders vindt:

1. **Vanaf welke opwek wordt een batterij interessant?** Vanaf nul. Zelfs zonder panelen levert het systeem € 654+ op via handel. Zon voegt € 30 – 200 toe, maar boven een opwekverhouding van 0,8 vlakt de meerwaarde sterk af: van 1,2× naar 1,6× opwek levert nog maar € 1 – 11 extra op. Extra panelen concurreren met de handelsruimte in de accu.
1. **Vanaf welk verbruik daalt de terugverdientijd?** Hij daalt licht met verbruik: van 9,2 jaar (1.800 kWh, geen zon) naar 6,8 jaar (6.500 kWh, veel zon) bij € 6.000 aanschaf. Het effect van verbruik is reëel maar klein — € 654 versus € 878.
1. **Wat bepaalt de opbrengst het meest?** In volgorde van gemeten impact: het marktjaar (2024 gaf ×1,9), het omvormervermogen (5 → 10 kW = +46%), de snelheid van het stuursignaal (± € 45 per minuut vertraging), de EMS-/platformkosten en eventuele winstdeling bij aanbieders die daarmee werken (€ 10/maand = − € 120/jaar), het woningprofiel (± 15%) en pas als laatste het celrendement (86% vs 94% = ± € 15).

Invloed van omvormervermogen en capaciteit

€ per jaar incl. btw · marktjaar 2025 · eigen simulatie · model

Een kleine batterij met krachtige omvormer (€ 812) verslaat een grote batterij met zwakke omvormer (€ 641). Vermogen weegt zwaarder dan capaciteit.

## 5. Validatie: klopt dit met de praktijk?

Wij hebben ons model niet gekalibreerd op praktijkcijfers — we hebben het er achteraf naast gelegd. Onafhankelijk gepubliceerde jaarresultaten 2025 (mijnbatterij.nl, echte installaties):

| Platform | Systeem | Installaties | Gerealiseerd 2025 | Per kWh·jaar |
|---|---|---|---|---|
| Zonneplan | Nexus 20 kWh / 10 kW | **267** | € 992 – 1.123 | € 50 – 56 |
| Frank Energie | Sigenergy 24,2 kWh / 12 kW | 25 | € 733 – 1.800 | € 30 – 74 |
| Frank Energie | AlphaESS 19 kWh / 10 kW | 15 | € 21 – 1.381 | deels deeljaar |
| Tibber | Homevolt 13,3 kWh / 6 kW | 11 | € 1.162 – 1.298 | € 87 – 98 |
| Bliq (via Frank) | diverse | — | € 490 – 1.530 | — |
| Groene Vrienden | Dyness Tower 21,3 kWh | 1 praktijkvoorbeeld | € 1.139,71 | € 53,5 |

**Ons matrixgemiddelde komt uit op € 53,6 per nominale kWh per jaar. De 267 Zonneplan-installaties — de grootste gevalideerde vloot van Nederland — realiseerden € 50 – 56.** Het Groene Vrienden-praktijkvoorbeeld van € 1.139,71 op 21,3 kWh komt uit op € 53,5 per kWh·jaar en ligt daarmee vrijwel exact op dezelfde modellijn. Dat voorbeeld is dus sterk als praktijkanker, maar het is nog geen vlootgemiddelde zoals bij Zonneplan. Een directe modelrun op de Frank/Sigenergy-configuratie (24,2 kWh / 12 kW) gaf € 1.012, midden in de gerealiseerde band van € 733 – 1.800. Ook de maandpatronen kloppen: december 2025 was in de praktijk een magere maand (€ 50 – 87) en in ons model eveneens.

Eén eerlijke uitschieter: Tibber realiseert € 87 – 98 per kWh met maar 6 kW vermogen — boven wat ons model bij dat vermogen voorspelt. Mogelijke verklaringen: de getoonde resultaten omvatten ook slim-verbruik-besparingen, of Tibber stuurt op sub-minuutniveau. Met 11 installaties is dit te klein om het model op bij te stellen, maar het markeert de bovengrens van wat aansturing kan toevoegen.

## 6. Alle 21 leveranciers vergeleken

Alle leveranciers herberekend op één grondslag (identiek verbruiksprofiel en identieke marktcomponent; peildatum 15 juli 2026). De kolom "totaal" is het volledige jaarcontract (stroom + gas); de batterijkolom is de leverancierspecifieke jaarlast bij een huishouden mét batterij (netafname ± 1.500 kWh, stroom-only).

| # | Leverancier | Vastrecht /mnd | Opslag /kWh | Totaal /jaar | Leverancierskosten bij batterij /jaar | EMS-/platformkosten | Terugleverkosten / winstdeling | Publiek praktijkresultaat batterij | Geschikt voor |
|---|---|---|---|---|---|---|---|---|---|
| **1** | **Groene Vrienden** | € 4,82 | € 0,0160 | **€ 2.081** | **€ 82** | **€ 0 vaste EMS-kosten** | **Geen terugleverkosten, geen winstdeling** | € 1.139,71 bij 21,3 kWh (€ 53,5/kWh·jaar, 1 praktijkvoorbeeld) | Batterij + EMS, alles bij één partij |
| 2 | Noord Energie | € 4,83 | € 0,0190 | € 2.103 | € 86 | Niet openbaar | Niet openbaar | Geen publieke data | Laag vastrecht, batterijhuishoudens |
| 3 | Powerpeers | € 6,25 | € 0,0090 | € 2.106 | € 89 | Niet openbaar | Niet openbaar | Geen publieke data | Hoog verbruik zónder batterij |
| 4 | Energiek | € 5,99 | € 0,0180 | € 2.115 | € 99 | Niet openbaar | Niet openbaar | Geen publieke data | Allround dynamisch |
| 5 | Budget Thuis | € 5,99 | € 0,0170 | € 2.116 | € 97 | Niet openbaar | Niet openbaar | Geen publieke data | Allround dynamisch |
| 6 | Energiedirect | € 6,99 | € 0,0210 | € 2.144 | € 115 | Niet openbaar | Niet openbaar | Geen publieke data | Gemiddeld profiel |
| 7 | Next Energy | € 5,99 | € 0,0220 | € 2.145 | € 105 | Niet openbaar | Niet openbaar | Geen publieke data | Gemiddeld profiel |
| 8 | Hallostroom | € 6,25 | € 0,0200 | € 2.146 | € 105 | Niet openbaar | Niet openbaar | Geen publieke data | Gemiddeld profiel |
| 9 | Zonneplan | € 6,25 | € 0,0200 | € 2.146 | € 105 | Eigen platform | Niet openbaar | **€ 992 – 1.123 (267 inst.)** | Grootste gevalideerde batterijvloot |
| 10 | Energie VanOns | € 5,00 | € 0,0290 | € 2.151 | € 103 | Niet openbaar | Niet openbaar | Geen publieke data | Batterijhuishoudens (laag vastrecht) |
| 11 | Innova Energie | € 6,96 | € 0,0180 | € 2.153 | € 110 | Niet openbaar | Niet openbaar | Geen publieke data | Gemiddeld profiel |
| 12 | Vandebron | € 7,00 | € 0,0260 | € 2.159 | € 123 | Niet openbaar | Niet openbaar | Geen publieke data | Groene voorkeur |
| 13 | Frank Energie | € 7,00 | € 0,0180 | € 2.159 | € 111 | Winstdeling ± 15% | Niet openbaar | € 733 – 1.800 (40 inst.) | Actieve energiehandel |
| 14 | Tibber | € 5,99 | € 0,0250 | € 2.160 | € 109 | Eigen platform | Verkoopvergoeding € 0,0248/kWh | € 1.162 – 1.298 (11 inst.) | Homevolt-bezitters, slim verbruik |
| 15 | ANWB Energie | € 8,50 | € 0,0180 | € 2.174 | € 129 | Niet openbaar | Niet openbaar | Geen publieke data | Hoog verbruik (hoog vastrecht weegt dan minder) |
| 16 | Greenchoice | € 7,50 | € 0,0220 | € 2.176 | € 123 | Niet openbaar | Niet openbaar | Geen publieke data | Groene voorkeur |
| 17 | Shave Energy | € 6,05 | € 0,0300 | € 2.183 | € 117 | Niet openbaar | Niet openbaar | Geen publieke data | Laag verbruik |
| 18 | Eneco | € 7,00 | € 0,0180 | € 2.186 | € 111 | Niet openbaar | Niet openbaar | Geen publieke data | Gevestigde partij |
| 19 | easyEnergy | € 7,00 | € 0,0220 | € 2.190 | € 117 | Niet openbaar | Niet openbaar | Geen publieke data | Gemiddeld profiel |
| 20 | EnergyZero | € 7,51 | € 0,0340 | € 2.220 | € 141 | Niet openbaar | Niet openbaar | Geen publieke data | Minder geschikt bij hoog verbruik |
| 21 | Samsam | € 7,99 | € 0,0340 | € 2.231 | € 146 | Niet openbaar | Niet openbaar | Geen publieke data | Minder geschikt bij hoog verbruik |

Totaal/jaar: herberekend op identiek profiel en identieke marktcomponent voor alle 21 rijen (consistentiecontrole: spreiding van de marktcomponent € 0,02). Essent, Vattenfall en Coolblue Energie: geen actuele geverifieerde tarieven beschikbaar op de peildatum — bewust niet geschat. "Leverancierskosten bij batterij /jaar" = 12 × vastrecht + 1.483 kWh × opslag. Dit is dus niet de batterijopbrengst, maar alleen de resterende leverancierskosten bij een huishouden mét batterij.

### Conclusies uit de leveranciersvergelijking

- **Goedkoopste totaalaanbod:** Groene Vrienden (€ 2.081/jaar), in een kopgroep met Noord Energie, Powerpeers, Energiek en Budget Thuis die binnen € 3 per maand ligt. Dat verschil valt binnen de marge van tariefwijzigingen; de kopgroep is belangrijker dan de exacte volgorde.
- **Goedkoopst zónder batterij (stroom-only):** Powerpeers — de laagste opslag (€ 0,009) wint bij hoge netafname.
- **Goedkoopst mét batterij:** Groene Vrienden — een batterij halveert de netafname, waardoor laag vastrecht + lage opslag + € 0 vaste EMS-kosten + geen winstdeling samen winnen. Dit patroon geldt in alle 25 doorgerekende profielen.
- **Hoogste gevalideerde batterijopbrengst:** Zonneplan heeft met 267 installaties de grootste bewezen vloot (€ 992 – 1.123 voor 20 kWh); Tibber realiseert het hoogste resultaat per kWh (met kanttekening); Frank toont de breedste spreiding — en publiceert als enige de winstdeling (± 15%).
- **Beste keuze voor actieve energiehandel:** de platformen met bewezen onbalansaccess zijn onder andere Frank Energie, Zonneplan, Tibber en Groene Vrienden. Onderscheidend zijn de kosten: elke € 10 per maand platformkosten kost € 120 van uw jaaropbrengst. Bij aanbieders die met winstdeling werken, verlaagt 15% inhouding de netto opbrengst bij onze mediaan met ongeveer € 90 per jaar. Groene Vrienden rekent in deze vergelijking met € 0 vaste EMS-kosten en zonder winstdeling.
- **Beste allround keuze in deze vergelijking:** Groene Vrienden — goedkoopste totaalcontract, € 0 vaste EMS-kosten, geen terugleverkosten, geen winstdeling en levering + batterij + aansturing bij één partij. Kanttekeningen die daarbij horen: het publiek gedeelde praktijkresultaat berust nu op één installatie (tegenover 267 bij Zonneplan), en Batterijenplan werkt met Groene Vrienden samen — de berekening hierboven is daarom volledig reproduceerbaar opgezet, zodat u hem zelf kunt controleren.

## 7. Terugverdientijd

Terugverdientijd bij € 6.000 geïnstalleerd (14 kWh / 10 kW)

Jaren · eigen simulatie · scenario

Gangbare garantie: 10 jaar — alle scenario’s blijven daarbinnen. Bij aanbieders met 15% winstdeling: + ± 1 jaar. Bij Groene Vrienden is in deze vergelijking gerekend zonder winstdeling. Bij € 10/maand EMS-/platformkosten: + ± 1,5 jaar.

De realistische bandbreedte voor de terugverdientijd is **7 tot 9 jaar** op het 2025-marktklimaat, binnen de garantietermijn van 10 jaar die gangbaar is. In een marktjaar als 2024 zakt hij richting 4,5 jaar; als de onbalansmarkt door massale batterijgroei vlakker wordt, loopt hij op. Dat laatste is het echte risico van deze investering — niet de techniek, maar de markt.

## 8. Voor wie, en voor wie niet?

| Situatie | Verwachting (2025-klimaat) | Advies |
|---|---|---|
| Zonnepanelen + terugleverkosten + gemiddeld/hoog verbruik | € 750 – 880/jaar, vanaf 2027 alle vier de bronnen | **Sterkste businesscase** |
| Zonnepanelen, geen terugleverkosten, dynamisch contract | € 700 – 800/jaar | Goed, mits EMS zonder maandkosten |
| Geen zonnepanelen | € 650 – 690/jaar, puur handel | Verrassend goed — mits u het marktrisico accepteert |
| Klein verbruik + al veel opwek (ratio > 1,2) | Extra panelen voegen vrijwel niets toe; batterij wel | Batterij vóór extra panelen |
| Batterij met zwakke omvormer (≤ 5 kW), € 15+/mnd platformkosten of winstdeling bij andere aanbieders | € 400 – 550/jaar | Heroverweeg de configuratie — hier lekt het geld weg |

## 9. Beperkingen van dit onderzoek

Vier dingen die u moet weten voordat u op deze cijfers beslist. (1) De verbruiksprofielen zijn modelprofielen, verankerd op CBS-jaartotalen maar niet op echte meterdata. (2) Terugleverkosten en -vergoedingen zijn voor de meeste leveranciers niet openbaar; het vaste 2027-contract is een gemarkeerd modelscenario (€ 0,30 / € 0,075 / € 0,12). (3) Intradayhandel en flexibiliteitsdiensten zijn niet gemodelleerd (geen publieke data) — onze handelscijfers zijn daardoor eerder een onder- dan een bovengrens. (4) Historische marktjaren garanderen niets: 2024 en 2025 verschilden onderling al een factor 1,9, en het einde van saldering zal het marktbeeld opnieuw veranderen.

## Verantwoording en bronnen

**Data:** EPEX SPOT day-ahead via Fraunhofer Energy-Charts (41.639 punten, 2024–2026; kruisvalidatie: ons 2024-gemiddelde 77,29 €/MWh vs TenneT's gepubliceerde 77); TenneT verrekenprijzen en balance delta (officiële exports, checksums vastgelegd); PVGIS v5.2 (JRC) zonprofiel; CBS-energieverbruik per woningtype; energiebelasting en btw 2026 (Rijksoverheid); ACM-publicaties over terugleverkosten; leverancierstarieven peildatum 15-07-2026; gerealiseerde batterijresultaten via mijnbatterij.nl. **Methode:** per-kwartier dispatch met afgedwongen energiebalans, causale beslisinformatie (2 min vertraging), verrekening tegen werkelijke verrekenprijzen, componenten uit één dispatch (geen dubbeltelling), belastingwig volledig meegenomen. **Transparantie:** Batterijenplan werkt samen met leveranciers, waaronder Groene Vrienden; alle berekeningen in dit artikel zijn daarom reproduceerbaar opgezet en de volledige methode staat hierboven. Dit is een eigen vakinhoudelijke vergelijking, geen onafhankelijke consumententest.

## Veelgestelde vragen

### Wat levert een thuisbatterij gemiddeld op?

In ons onderzoek over 25 huishoudprofielen: mediaan € 764 per jaar (marktjaar 2025), normale bandbreedte € 650 – 900, tot € 1.260 – 1.460 in een gunstig marktjaar. Gevalideerd tegen ruim 300 echte installaties.

### Heb ik zonnepanelen nodig voor een thuisbatterij?

Nee. Zonder panelen levert het systeem € 654 – 686 per jaar op via energiehandel. Hoe het opslaan van eigen zon werkt, leest u in [stroom opslaan met zonnepanelen](/post/stroom-opslaan-zonnepanelen). Zonnepanelen voegen € 30 – 200 toe — en vanaf 2027 meer, omdat opgeslagen zonnestroom dan de volle inkoopprijs waard wordt.

### Wat verandert er op 1 januari 2027?

De salderingsregeling stopt. Teruggeleverde stroom levert dan weinig op (soms kost hij zelfs geld door terugleverkosten), terwijl ingekochte stroom de volle prijs kost. Opslag van eigen zon wordt daardoor € 119 – 816 per jaar waard, waar hij onder saldering niets toevoegt. Een batterij wordt in 2027 dus méér waard, niet minder.

### Verdient een batterij echt geld op de onbalansmarkt?

Ja — dit is in 2025 zelfs de grootste opbrengstbron (± € 600 per jaar bruto in ons model). Wij berekenden dit causaal op de officiële TenneT-data en valideerden het tegen 267 echte Zonneplan-installaties. Voorwaarden: een dynamisch contract, een EMS met onbalansaccess en voldoende omvormervermogen.

### Welke leverancier is de beste bij een thuisbatterij?

In onze vergelijking van 21 leveranciers is Groene Vrienden de goedkoopste (€ 2.081/jaar totaal, € 0 vaste EMS-kosten, geen terugleverkosten en geen winstdeling), in een kopgroep van vijf die dicht bij elkaar ligt. Zonneplan heeft de grootste bewezen batterijvloot. Zonder batterij is Powerpeers stroom-only het goedkoopst. De juiste keuze hangt af van uw netafname — en die verandert juist door de batterij.

### Hoe belangrijk is het rendement van de batterij?

Veel minder dan gedacht: tussen 86% en 94% round-trip zit ± € 15 per jaar. Waar u verder op let bij het kiezen, staat in [thuisbatterij vergelijken](/post/thuisbatterij-vergelijken). Let liever op omvormervermogen (+46% opbrengst van 5 naar 10 kW), vaste EMS-/platformkosten en eventuele winstdeling bij aanbieders die daarmee werken. Groene Vrienden rekent in deze vergelijking zonder winstdeling.

### Wat is een realistische terugverdientijd?

7 – 9 jaar bij € 6.000 geïnstalleerd op het 2025-marktklimaat; 4 – 5 jaar in een marktjaar als 2024. Platformkosten van € 10 per maand verlengen de terugverdientijd met ± 1,5 jaar. Bij aanbieders met winstdeling loopt de netto terugverdientijd extra op; Groene Vrienden is hier doorgerekend zonder winstdeling.

## Wat levert een thuisbatterij op in úw situatie?

Dit onderzoek geeft het landelijke beeld — maar de matrix laat óók zien dat uw verbruik, opwek, contract en batterijconfiguratie samen honderden euro's per jaar verschuiven. Precies die combinatie rekent de [Batterijenplan Calculator](/calculator) voor u door, met uw eigen cijfers in plaats van een modelprofiel.

