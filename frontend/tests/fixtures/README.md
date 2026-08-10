# Testfixtures

## smartmeter-analysis-physical.json / smartmeter-analysis-financial.json

**Afgeleide contract-snapshots** van `POST /api/smartmeter/analysis/`
(smartmeter-analysis-v1), vastgelegd tegen lokale Django met het synthetische
jaarbestand `homewizard/homewizard-365days-solar-synthetic.csv` (physical =
zonder `financial_scenario`; financial = met `study_2027_post_fixed`).

**Gesanitiseerd:** de gerapporteerde praktijk-eurowaarden
(`annual_return_min/max_eur`, `return_per_kwh_min/max`) zijn vervangen door
SYNTHETISCHE plaatsvervangers. De echte MijnBatterij-getallen bestaan in de
repository uitsluitend in `data/practice/CANONICAL_PRACTICE_REFERENCE.json`
(één canonieke bron, test-enforced in `smartmeter/test_practice_evidence.py`)
— deze fixtures mogen die nooit dupliceren en zijn dus géén tweede,
handmatig te onderhouden kopie. Structuurvelden (id's, providers, kWh, kW,
N, sample-klassen, afstandscontext) zijn wél de echte responsewaarden: de
frontend-tests toetsen vorm en doorgifte, geen euro-hoogtes.

**Regenereren:** draai lokale Django, POST het jaarbestand via de echte
parser + `analysisClient.requestAnalysis`, en vervang daarna de praktijk-
euro's weer door synthetische waarden (vorm behouden: min ≤ max; N=1-rijen
min == max; per-kWh = euro ÷ capaciteit, 1 decimaal). De `_fixture_note`
bovenin elk bestand markeert de sanitisatie.
