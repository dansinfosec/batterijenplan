# 07 · Scenario selection

10 representatieve situaties, gekoppeld aan de verbruiksprofielen uit `CANONICAL_METRICS.json`
(1.800/2.650/3.500/4.500/6.500 kWh) en het uitgewerkte 4.300 kWh-voorbeeld.

**Onderscheid:** de verbruiksprofielen en aannames zijn Batterijenplan **research input**; de voor/na-2027-bedragen
zijn een **afgeleid vast-contractscenariomodel**, geen gemeten onderzoeksresultaat. Incrementeel 2027-effect (vast) =
opgeslagen kWh x (afnametarief - terugleververgoeding), geldig alleen onder de vereenvoudigingen (gelijke
terugleverkosten voor/na, saldering tegen vol retail, geen prijssturing, vast/variabel contract).
**Dynamische contracten (S8-S10): NIET GEKWANTIFICEERD met de beschikbare data** — het 2027-verschil vraagt
kwartierdata, de verrekenmethode van de leverancier en de contractvoorwaarden. Prijssturing kan waarde geven,
maar dat is geen salderingseffect.

| ID | Situatie | Contract | Verbruik | PV | Opgeslagen kWh | EUR/jr voor 2027 | EUR/jr na 2027 | Incrementeel 2027 | Classificatie |
|---|---|---|---:|---|---:|---|---|---|---|
| S1 | Weinig zon-overschot, veel dagverbruik | vast/geen EMS | 3500 | 0.5x | 875 | €48 | €206 | €158 | AFGELEID VAST-CONTRACTSCENARIO |
| S2 | Gemiddeld huishouden, beperkt overschot | vast/geen EMS | 2650 | 0.8x | 1378 | €76 | €325 | €249 | AFGELEID VAST-CONTRACTSCENARIO |
| S3 | Gemiddeld verbruik, veel zon-overschot | vast/geen EMS | 3500 | 1.6x | 1760 | €97 | €415 | €318 | AFGELEID VAST-CONTRACTSCENARIO |
| S4 | Hoog verbruik, weinig gebruik overdag | vast/geen EMS | 6500 | 1.0x | 1760 | €97 | €415 | €318 | AFGELEID VAST-CONTRACTSCENARIO |
| S5 | Veel zonproductie, weinig gebruik overdag | vast/geen EMS | 3500 | 1.6x | 1760 | €97 | €415 | €318 | AFGELEID VAST-CONTRACTSCENARIO |
| S6 | Vast contract met substantiele terugleverkosten | vast/geen EMS | 4300 | 1.0x | 1760 | €167 | €485 | €318 | AFGELEID VAST-CONTRACTSCENARIO |
| S7 | Vast contract met lage terugleverkosten | vast/geen EMS | 4300 | 1.0x | 1760 | €-44 | €274 | €318 | AFGELEID VAST-CONTRACTSCENARIO |
| S8 | Dynamisch contract zonder slim EMS | dynamisch/geen EMS | 4300 | 1.0x |  | n.v.t. | n.v.t. | niet gekwantificeerd | DYNAMISCH — NIET GEKWANTIFICEERD MET BESCHIKBARE DATA |
| S9 | Dynamisch contract met slim EMS | dynamisch/EMS | 4300 | 1.0x |  | n.v.t. | n.v.t. | niet gekwantificeerd | DYNAMISCH — NIET GEKWANTIFICEERD MET BESCHIKBARE DATA |
| S10 | Batterij vooral gereserveerd voor handel | dynamisch/EMS | 4300 | 1.0x |  | n.v.t. | n.v.t. | niet gekwantificeerd | DYNAMISCH — NIET GEKWANTIFICEERD MET BESCHIKBARE DATA |

## Methode & limieten
- Direct-verbruikfractie, 220 laaddagen, 8 kWh/dag, 90% rendement en 10 kWh bruikbaar zijn **aannames** (uit het
  bestaande 2027-model). De 1.760 kWh is een **gemodelleerde jaarlijkse doorzet**, geen fysiek batterijmaximum;
  daardoor loopt het vaste-contract 2027-effect bij veel overschot (S3-S7) tegen ~€318 aan. Een grotere/krachtigere
  configuratie verschuift meer.
- Binnen dit vereenvoudigde model beinvloeden terugleverkosten de **totale** waarde, maar vallen ze weg uit het
  berekende 2027-**verschil** (gelijke aanname voor/na). Echte contracten kunnen dat anders doen.
- Kleine/negatieve uitkomsten worden getoond (S7 voor-2027 = -€44).
- Er wordt niet geinterpoleerd tussen profielen zonder documentatie.
