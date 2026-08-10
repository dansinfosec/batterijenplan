# data/practice — canonieke praktijkdatasets (applicatiegebruik)

## CANONICAL_PRACTICE_REFERENCE.json

**De enige canonieke numerieke bron** van de gerapporteerde
MijnBatterij.nl-2025-praktijkresultaten (9 systemen, gepubliceerde
min–max-ranges + gerapporteerde N's). Op 2026-08-10 verplaatst vanuit
`research/seo/article-drafts/wat-levert-een-thuisbatterij-op/` zodat de
productie-API niet op een artikel-werkmap steunt.

- **Runtime-consument:** `smartmeter/practice_evidence.py`
- **Artikel-lineage:** `QUANTITATIVE_CLAIM_REGISTRY.json` en
  `SVG_DATA_LINEAGE.json` in de artikelmap verwijzen naar dit pad.

## Onderhoudsprocedure (waarheidsgetrouw)

Dit bestand is een **handmatig gecontroleerde bron-momentopname** — het wordt
niet gegenereerd vanuit elders in de getrackte repository. Bij een bronupdate:

1. Bewerk de gepubliceerde waarden (ranges, N's, sample-klassen) direct in
   deze JSON, met bronvermelding in de review.
2. Draai `python scripts/practice/refresh_practice_reference.py` — dat
   valideert de structuur/consistentie en herberekent uitsluitend de
   **afgeleide** velden `eur_per_kwh_min/max` (en ververst `generated_at`).
   Met `--check` alleen valideren.
3. Draai de tests: `python manage.py test smartmeter.test_practice_evidence`
   (bewaakt o.a. dat er precies één numerieke bron is).

*Historische herkomst:* het bestand is oorspronkelijk geassembleerd met een
script in het lokale (bewust niet-getrackte) recovery-archief
`recovered-batterijenplan-model/`; dat archief is provenance-documentatie,
géén onderdeel van de reproduceerbare repository-workflow.

## Regels

1. Geen kopieën van deze getallen elders in de repository (docs mogen citeren,
   gestructureerde bronnen niet dupliceren) — test-enforced in
   `smartmeter/test_practice_evidence.py`.
2. De bron publiceert uitsluitend ranges: **geen** mediaan/gemiddelde/
   percentielen hieruit afleiden.
3. Dit zijn **gerapporteerde** praktijkresultaten (extern), geen eigen
   waarnemingen van Batterijenplan en geen garantie.
