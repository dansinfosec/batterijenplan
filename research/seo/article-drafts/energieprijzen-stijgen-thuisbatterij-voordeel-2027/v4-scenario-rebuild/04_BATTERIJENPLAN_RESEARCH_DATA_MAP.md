# 04 · Batterijenplan research data map

## Aanwezig in de repo (traceerbaar)
| Bron | Inhoud | Gebruik hier |
|---|---|---|
| `wat-levert-.../CANONICAL_METRICS.json` | 25-cel matrix **totale** batterijwaarde, config 14 kWh/10 kW/EMS/**dynamisch**/**marktjaar 2025**; mediaan EUR 734, gem 744, bereik 654-878 | **Totale-waarde context (A)**, link naar yield-artikel. Niet het 2027-effect. |
| `data/practice/CANONICAL_PRACTICE_REFERENCE.json` (voorheen in de artikelmap) | 9 praktijksystemen (MijnBatterij.nl), EUR/jaar-bereiken | Praktijk-ijking (context) |
| `wat-levert-.../QUANTITATIVE_CLAIM_REGISTRY.json` | classificatie + herkomst per claim | Fact ledger (06) |
| `calculators/stage2.py` | praktijkbanden EUR/kWh/jr per contract (dynamisch 55-95, vast 30-60; BP-PRACTICE) | Totale-waarde banden dynamisch |
| 2027 `PROPOSED_ARTICLE_V2.md` | uitgewerkt voorbeeld (4.300 kWh): 3.010/1.584/1.250 kWh, EUR 502,47, 290/405/519 | Basis afgeleide incrementele model |
| `research/METHODOLOGY.md`, `SOURCE_REGISTER.md` | werkwijze + bronregister | Methode/limieten |

## ONTBREEKT (kritisch)
- **Geen per-profiel PRE-2027 vs POST-2027 batterijwaarde-grid in de repo.** De canonieke matrix is een marktjaar
  (2025) zonder jaar/salderings-dimensie; het 2027-artikel heeft een voorbeeldhuishouden, geen grid.
- Gewogen statistiek (750/764), 21,8 kWh-matrix, 2024-marktjaar: **BLOCKED — pending Render-export**
  (`research/data/render-simulation-export.json` bestaat niet).
- "135 simulaties / 300+ installaties": niet als data aanwezig (placeholder in SOURCE_REGISTER.md).

## Gevolg
Het incrementele 2027-effect is **AFGELEIDE_BEREKENING** uit gedocumenteerde aannames + officiele tarieven
(08_SCENARIO_CALCULATIONS.csv), expliciet gelabeld — niet als per-profiel modeloutput. De totale-waarde matrix
dient alleen als context/link.
