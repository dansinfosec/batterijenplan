# Calculator-mapping — onderzoeks-ID ↔ codeconstante

Koppeling tussen elke onderzoeks-ID, de codeconstante, de vindplaats, de
classificatie en waar de waarde in de calculator/website wordt gebruikt.

> Regelnummers zijn de definitieregel van de constante op peildatum van dit
> document. De ID's staan als comment naast de constanten en verschuiven mee bij
> refactors; het `BP-PRACTICE`-ID is de stabiele sleutel, niet het regelnummer.

## Overzichtstabel

| ID | Constante | Bestand:regel | Waarde (ongewijzigd) | Classificatie | Bron | Gebruikt in |
|---|---|---|---|---|---|---|
| BP-PRACTICE-001 | `SOLAR_DAYS_PER_YEAR` | `calculators/services.py:4` | 250 | DOCUMENTATION GAP | Modelmatig (BRON 4) | Capaciteitsbasis `calculate_battery_advice` (`services.py`); getoond als "250 dagen/zonnige dagen" in React (`Calculator.jsx`) en Django-template |
| BP-PRACTICE-002 | `TRADING_MULTIPLIER` | `calculators/services.py:12` | 1.3 | PRACTICE-DERIVED ASSUMPTION | MijnBatterij (BRON 1) | Handel/dynamisch: `recommended_capacity = basis × 1.3`; ook in zonnige-dag-override |
| BP-PRACTICE-003 | `SUNNY_DAY_TRIGGER_RATIO` | `calculators/services.py:99` | 2 | DOCUMENTATION GAP | Modelmatig (BRON 4) | `sunny_day_question_required`; gespiegeld in `Calculator.jsx` en template (server autoritair) |
| BP-PRACTICE-004 | `SUNNY_DAY_EXPORT_VALUES` | `calculators/services.py:136` | dict (5–640) | PRACTICE-DERIVED ASSUMPTION | MijnBatterij (BRON 1) | Zonnige-dag-override in `calculate_battery_advice` |
| BP-PRACTICE-005 | `RESIDENTIAL_CATALOG` / `BUSINESS_CATALOG` | `calculators/services.py:30` e.v. | productlijst | DOCUMENTATION GAP | Leveranciersprijslijst (BRON 2) | `_match_product`; `product_name`/`product_price` in beide resultaatweergaven en Stage-2-investering |
| BP-PRACTICE-006 | `SOLAR_BENEFIT_BANDS` | `calculators/stage2.py:26` | dict (€/kWh/jr) | **PRACTICE DATA — MANUALLY VERIFIED** | MijnBatterij (BRON 1) | Stage-2 maandvoordeel/terugverdientijd (`build_stage2_report`) |
| BP-PRACTICE-007 | `NO_SOLAR_BENEFIT_BANDS` | `calculators/stage2.py:41` | dict (€/kWh/jr) | **PRACTICE DATA — MANUALLY VERIFIED** | MijnBatterij (BRON 1) | Stage-2, geen-zon-pad |
| BP-PRACTICE-008 | `HEAT_PUMP_FACTORS` | `calculators/stage2.py:55` | all_electric 1.10 / hybrid 1.05 | PRACTICE-DERIVED ASSUMPTION | MijnBatterij (BRON 1) | Stage-2 opbrengstcorrectie |
| BP-PRACTICE-009 | `EV_FACTORS` | `calculators/stage2.py:56` | yes 1.10 / soon 1.05 | PRACTICE-DERIVED ASSUMPTION | MijnBatterij (BRON 1) | Stage-2 opbrengstcorrectie |
| BP-PRACTICE-010 | `RETURN_COSTS_FACTOR` | `calculators/stage2.py:57` | 1.08 | PRACTICE-DERIVED ASSUMPTION | MijnBatterij (BRON 1) | Stage-2, alleen zon-pad |
| BP-PRACTICE-011 | `MAX_TOTAL_FACTOR` | `calculators/stage2.py:58` | 1.3 | PRACTICE-DERIVED ASSUMPTION | Modelmatig plafond | Stage-2: begrenst gecombineerde factor |
| BP-PRACTICE-012 | `PAYBACK_MIN_YEARS` / `PAYBACK_MAX_YEARS` | `calculators/stage2.py:62` | 1.0 / 30.0 | DOCUMENTATION GAP | Modelmatig (BRON 4) | Stage-2 terugverdientijd-begrenzing |
| BP-PRACTICE-013 | `WARMTEFONDS_EXAMPLE_*` | `calculators/stage2.py:69` | 8500 / 10 / 71 | DOCUMENTATION GAP | Warmtefonds (BRON 3) | Stage-2 Warmtefonds-rekenvoorbeeld (alleen op verzoek) |

## Classificatietelling

- **PRACTICE DATA — MANUALLY VERIFIED:** 2 (`BP-PRACTICE-006`, `-007`) — de opbrengstbanden.
- **PRACTICE-DERIVED ASSUMPTION:** 5 (`BP-PRACTICE-002`, `-004`, `-008`, `-009`, `-010`; `-011` als modelmatig plafond).
- **DOCUMENTATION GAP:** 5 (`BP-PRACTICE-001`, `-003`, `-005`, `-012`, `-013`).

## Implementatie ↔ onderzoek

De **codewaarden zijn ongewijzigd** en komen exact overeen met wat er in productie
draait; er is in deze stap niets herberekend. Wat nu is toegevoegd, is uitsluitend
de **traceerbaarheidslaag** (ID's + classificatie + bronverwijzing). Volledige
overeenstemming "implementatie ↔ onderzoek" kan pas als VERIFIED worden bevestigd
zodra het onderliggende MijnBatterij-brondossier en de invulplekken in
`SOURCE_REGISTER.md` zijn aangevuld.
