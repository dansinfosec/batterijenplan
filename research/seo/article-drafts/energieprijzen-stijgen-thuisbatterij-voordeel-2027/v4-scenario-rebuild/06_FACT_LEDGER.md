# 06 · Fact ledger

| Claim | Classificatie | Actie | Bron |
|---|---|---|---|
| Saldering stopt 1-1-2027 | VERIFIED OFFICIAL | RETAIN | O1 |
| Terugleververgoeding >=50% kaal leveringstarief 2027-2030 | VERIFIED OFFICIAL | RETAIN — als kader | O2 |
| Afname/teruglevering apart afgerekend na 2027 | VERIFIED OFFICIAL | RETAIN | O3 |
| Consumententarief 0,25055/kWh (CBS juni 2026) | VERIFIED OFFICIAL | RETAIN | O4 |
| Day-ahead 64/95/440 (ACM) | VERIFIED OFFICIAL | RETAIN — kort | O5 |
| EUR 502,47 netto vast batterijvoordeel | DERIVED CALCULATION | RETAIN — herkaderd als TOTALE post-2027 waarde, niet als 2027-effect | 08 |
| EUR 290/405/519 dynamische scenario's | DERIVED CALCULATION | HERKADERD — totale dynamische waarde-indicatie; incrementeel 2027-effect NIET GEKWANTIFICEERD (kwartierdata/contract nodig) | 08 |
| 3.010/1.584/1.250 kWh energiestromen | DERIVED CALCULATION | RETAIN | V2 s1 |
| 220 laaddagen, 8 kWh/dag, 90% rendement, 30% direct | SCENARIO ASSUMPTION | RETAIN — gelabeld | V2 s1 |
| EUR 0,12 terugleverkosten / 0,06 vergoeding | SCENARIO ASSUMPTION | CORRECT — vergoeding -> 0,070 als **scenariowaarde** (50% × gekozen kaal leveringstarief); geen officieel tarief | O2 |
| "2027-effect onafhankelijk van terugleverkosten" | DERIVED CALCULATION | QUALIFY — geldt alleen binnen dit model (gelijke TLK voor/na); TLK bepaalt wel de totale waarde | 08 |
| "1.760 kWh = batterijmaximum" | SCENARIO ASSUMPTION | CORRECT — gemodelleerde jaarlijkse doorzet (220×8 kWh), geen fysiek max | 08 |
| "Dynamisch 2027-effect ≈ €0" | UNSUPPORTED | REMOVE — vervangen door NIET GEKWANTIFICEERD met beschikbare data | - |
| Terugverdientijd-tabel (6.000 -> 12-20,7 jr) | DERIVED CALCULATION | MOVE -> terugverdientijd-artikel | - |
| Groene Vrienden 'laagste dynamische opslag op peildatum' | TIME-SENSITIVE COMMERCIAL | REMOVE als sectie; hooguit 1 gelabeld voorbeeld | - |
| Volledige leveranciers-/EMS-/handel-uitleg | OUT OF SCOPE | MOVE/REMOVE | - |
| 135 simulaties / 300+ installaties | UNSUPPORTED (repo placeholder) | REMOVE | SOURCE_REGISTER.md |

**Regel:** UNSUPPORTED en OUT OF SCOPE claims overleven de rewrite niet. Oude getallen worden niet stil behouden; elk cijfer is herleidbaar naar 05/08 of een canonieke bron.
