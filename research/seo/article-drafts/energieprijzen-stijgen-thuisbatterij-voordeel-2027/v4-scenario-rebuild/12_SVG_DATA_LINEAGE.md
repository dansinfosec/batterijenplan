# 12 · SVG data lineage

Elke visual verwijst naar herleidbare inputs. Bedragen = AFGELEIDE_BEREKENING (08) tenzij anders vermeld.

| Visual | Datavelden | Herkomst |
|---|---|---|
| V1 voor/na 2027 | mechaniek saldering -> apart afrekenen | 05 (O1-O3) |
| V2 matrix | assen dagverbruik x zon-overschot; kwadrant-labels (klein/matig/substantieel/situatie-afhankelijk) | 07 (geen euro's op assen) |
| V3 profielvergelijking | opgeslagen kWh; EUR/jr voor 2027; EUR/jr na 2027; delta | 08 (S1-S7) |
| V4 waterfall | vermeden inkoop / vermeden TLK / gemiste vergoeding / verlies / 2027-deel | 08 (S6) |
| V5 vast vs dynamisch | 2 vaste-contractbalken (2027-effect €318); dynamisch = "contract- en kwartierdata nodig" (geen euro-delta) | 08 (S6,S7 vast); dynamisch NIET GEKWANTIFICEERD |
| V6 beslisboom | ja/nee-takken -> klein/matig/substantieel/meer-data | 07 logica |
| V7 dag | kwalitatief dagprofiel (geen exacte uurdata in repo) | kwalitatief, gelabeld |

Ontbrekend/gelabeld: exacte uur-/kwartierdata en per-profiel pre/post-grid ontbreken in de repo (04);
V2/V6 gebruiken kwalitatieve conclusies, geen verzonnen euro's.
