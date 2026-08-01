# Detailkaart per calculatorwaarde

Per onderzoeks-ID: waarde, classificatie, bron, verifieerbaarheid, gebruik en
openstaande registratie. Waarden zijn **ongewijzigd** overgenomen uit de code.

Legenda classificatie: zie `../README.md`.

---

## BP-PRACTICE-001 — `SOLAR_DAYS_PER_YEAR = 250`
- **Bestand:** `calculators/services.py`
- **Classificatie:** DOCUMENTATION GAP
- **Betekenis:** rekenbasis; jaarlijkse teruglevering / 250 = teruglevering per zonnige dag.
- **Bron:** modelmatig; geen externe registratie. Mogelijk te koppelen aan PVGIS/KNMI-zonuren.
- **Onafhankelijk verifieerbaar:** nog niet (bron te registreren).
- **Gebruikt in:** `calculate_battery_advice` capaciteitsbasis; op de site getoond als "250 (zonnige) dagen".
- **Nog vast te leggen:** onderbouwing/referentie voor 250 dagen.

## BP-PRACTICE-002 — `TRADING_MULTIPLIER = 1.3`
- **Bestand:** `calculators/services.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION
- **Betekenis:** handel/dynamisch krijgt ~30% extra opslagruimte bovenop de basis.
- **Bron:** afgeleid van MijnBatterij-praktijkobservaties (BRON 1).
- **Onafhankelijk verifieerbaar:** deels — pas volledig na aanvulling brondossier.
- **Gebruikt in:** capaciteitsformule + zonnige-dag-override.
- **Nog vast te leggen:** waarom precies 1,3 (spreiding in de praktijkdata).

## BP-PRACTICE-003 — `SUNNY_DAY_TRIGGER_RATIO = 2`
- **Bestand:** `calculators/services.py`
- **Classificatie:** DOCUMENTATION GAP
- **Betekenis:** toon de zonnige-dag-vraag als jaarverbruik ≥ 2× jaarlijkse teruglevering.
- **Bron:** heuristiek; geen registratie.
- **Onafhankelijk verifieerbaar:** nog niet.
- **Gebruikt in:** `sunny_day_question_required`; UX-spiegeling in React + Django-template (server herberekent zelf).
- **Nog vast te leggen:** onderbouwing drempel 2×.

## BP-PRACTICE-004 — `SUNNY_DAY_EXPORT_VALUES` (middelpunten 5–640 kWh)
- **Bestand:** `calculators/services.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION
- **Betekenis:** representatieve kWh-waarde per gekozen teruglever-bandbreedte.
- **Bron:** afgeleid van praktijkverdelingen (BRON 1).
- **Onafhankelijk verifieerbaar:** deels.
- **Gebruikt in:** zonnige-dag-override in `calculate_battery_advice`.
- **Nog vast te leggen:** hoe de middelpunten uit de praktijkverdeling zijn gekozen.

## BP-PRACTICE-005 — `RESIDENTIAL_CATALOG` / `BUSINESS_CATALOG`
- **Bestand:** `calculators/services.py`
- **Classificatie:** DOCUMENTATION GAP
- **Betekenis:** productnamen, capaciteiten en prijzen.
- **Bron:** leveranciers-/inkoopprijslijst (BRON 2) — **geen** MijnBatterij-data.
- **Onafhankelijk verifieerbaar:** ja, tegen de leverancier-prijslijst (bron nog te registreren).
- **Gebruikt in:** `_match_product`; prijs/product in beide resultaatweergaven en Stage-2-investering.
- **Nog vast te leggen:** leverancier, peildatum, btw/installatie-conventie.

## BP-PRACTICE-006 — `SOLAR_BENEFIT_BANDS`
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** **PRACTICE DATA — MANUALLY VERIFIED**
- **Betekenis:** indicatieve opbrengst (€/kWh capaciteit/jaar) per contracttype, mét zonnepanelen.
- **Bron:** MijnBatterij.nl-praktijkresultaten, handmatig gecontroleerd door de projecteigenaar (BRON 1).
- **Onafhankelijk verifieerbaar:** nog niet vanuit de repo (brondossier ontbreekt); methode in `METHODOLOGY.md`.
- **Gebruikt in:** Stage-2 maandvoordeel/jaaropbrengst/terugverdientijd.
- **Nog vast te leggen:** aantal cases, periode, aggregatiewijze (zie `SOURCE_REGISTER.md`).

## BP-PRACTICE-007 — `NO_SOLAR_BENEFIT_BANDS`
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** **PRACTICE DATA — MANUALLY VERIFIED**
- **Betekenis:** opbrengstbanden voor het geen-zonnepanelen-pad (waarde vooral uit dynamische handel).
- **Bron:** zelfde herkomst/methode als BP-PRACTICE-006.
- **Onafhankelijk verifieerbaar:** nog niet vanuit de repo.
- **Gebruikt in:** Stage-2, geen-zon-pad.
- **Nog vast te leggen:** idem BP-PRACTICE-006.

## BP-PRACTICE-008 — `HEAT_PUMP_FACTORS` (all_electric 1.10 / hybrid 1.05)
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION
- **Bron:** praktijkobservatie (meer eigen verbruik → meer nuttige inzet).
- **Onafhankelijk verifieerbaar:** deels.
- **Gebruikt in:** Stage-2 opbrengstcorrectie (begrensd door `MAX_TOTAL_FACTOR`).
- **Nog vast te leggen:** onderbouwing factorhoogte.

## BP-PRACTICE-009 — `EV_FACTORS` (yes 1.10 / soon 1.05)
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION
- **Bron:** praktijkobservatie. **Verifieerbaar:** deels. **Gebruikt in:** Stage-2 correctie.
- **Nog vast te leggen:** onderbouwing factorhoogte.

## BP-PRACTICE-010 — `RETURN_COSTS_FACTOR = 1.08`
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION
- **Betekenis:** vermeden terugleverkosten (alleen zon-pad).
- **Bron:** praktijk/leverancierscontext. **Verifieerbaar:** deels. **Gebruikt in:** Stage-2 correctie.
- **Nog vast te leggen:** onderbouwing 8%; relatie tot leveranciersopslagen/terugleverkosten.

## BP-PRACTICE-011 — `MAX_TOTAL_FACTOR = 1.3`
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** PRACTICE-DERIVED ASSUMPTION (modelmatig plafond)
- **Betekenis:** begrenst het product van alle correctiefactoren.
- **Gebruikt in:** Stage-2, zodat de indicatie niet wegloopt van de band.
- **Nog vast te leggen:** onderbouwing plafond 1,3.

## BP-PRACTICE-012 — `PAYBACK_MIN_YEARS = 1.0` / `PAYBACK_MAX_YEARS = 30.0`
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** DOCUMENTATION GAP
- **Betekenis:** begrenzing terugverdientijd (jaren).
- **Bron:** modelmatig. **Verifieerbaar:** nog niet. **Gebruikt in:** `_payback_range`.
- **Nog vast te leggen:** onderbouwing grenzen 1–30 jaar.

## BP-PRACTICE-013 — `WARMTEFONDS_EXAMPLE_*` (8500 / 10 / 71)
- **Bestand:** `calculators/stage2.py`
- **Classificatie:** DOCUMENTATION GAP
- **Betekenis:** vast rekenvoorbeeld (€ 8.500 over 10 jaar bij 0% → ~€ 71/maand).
- **Bron:** publieke Nationaal Warmtefonds-voorwaarden (BRON 3) — geen offerte, geen MijnBatterij-data.
- **Onafhankelijk verifieerbaar:** ja, tegen Warmtefonds-voorwaarden (bron te registreren).
- **Gebruikt in:** Stage-2 Warmtefonds-blok (alleen als de bezoeker erom vraagt).
- **Nog vast te leggen:** bron/URL en peildatum voorwaarden.

---

## BP-PRESENT-001 — Homepage-hero voorbeeldadvies (14 / 21 kWh)
- **Bestand:** `frontend/src/components/home/BatteryPreview.jsx`
- **Classificatie:** **PRESENTATION EXAMPLE / DOCUMENTATION NOTE** — géén
  PRACTICE DATA en géén backend-rekenresultaat.
- **Betekenis:** de interactieve hero-preview toont bij het voorbeeldprofiel
  (4.500 / 3.200 kWh) per doel een vast illustratief advies: 14 kWh
  (eigen verbruik) en 21 kWh (dynamische handel). Beide zijn bewust door de
  projecteigenaar gekozen presentatievoorbeelden, expliciet gelabeld als
  "Voorbeeldberekening".
- **Afbakening:** de waarden worden client-side hardcoded weergegeven, gaan
  nooit een API-payload in en mogen nooit als calculator-uitkomst worden
  hergebruikt; het echte advies komt uitsluitend uit `calculate_battery_advice`.
- **Noot:** de gedocumenteerde formule geeft voor dit profiel bij handel
  ±15–18 kWh; het getoonde 21 kWh is dus een presentatiekeuze, geen
  formule-uitkomst.

---

## Vaste noten
- **Indicatief, geen garantie** — geldt voor alle bovenstaande waarden (zie `DISCLAIMER` in `calculators/stage2.py`).
- **Privacy** — geen individuele MijnBatterij-gebruikersgegevens in dit dossier; alleen geaggregeerd/geanonimiseerd.
- **Geen gedragswijziging** — dit dossier + de ID-comments zijn documentatie; formules, banden, factoren, API-contracten en frontenduitkomsten zijn ongewijzigd.
