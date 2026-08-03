# Artikel V6 — SEO-autoriteitsartikel 2027 (DRAFT — NIET GEPUBLICEERD)

**Status:** onderzoeksdraft voor menselijke review. Niet naar productie, niets gecommit/gepusht.
Productie-slug **ongewijzigd**. Reframe: zelfconsumptie = gekwantificeerde waardestroom; energiehandel =
potentiële *aanvullende* netto waardestroom (geen downside, geen vervanging).

**Primair keyword:** `thuisbatterij na 2027` (volume 140, SEO-moeilijkheid 15, informational).
**H1 / titel:** "Thuisbatterij na 2027: zelfconsumptie én handel combineren" (58 tekens).
**Meta:** "Na 2027 wordt zelfconsumptie een beter berekenbare batterijwaarde (mediaan ~€592/jaar); handel op
day-ahead en onbalans kan daar netto bovenop komen." (149 tekens).

## Centrale thesis

> Vanaf 2027 ontstaat voor een thuisbatterij een beter berekenbare waarde uit zelfconsumptie.
> Handelsopbrengsten uit day-ahead en onbalans kunnen daar bovenop komen. Meer batterijen betekenen niet
> automatisch lagere handelsopbrengsten: dat hangt af van hoe het aanbod van flexibiliteit zich ontwikkelt
> ten opzichte van de behoefte aan flexibiliteit.

**TOTALE BATTERIJWAARDE = ZELFCONSUMPTIEWAARDE + INCREMENTELE NETTO HANDELSWAARDE**, met bij optionele
deelname: **TOTALE OPTIMALE WAARDE = ZELFCONSUMPTIEWAARDE + max(0, INCREMENTELE NETTO HANDELSWAARDE)**.

## Cijfers — alleen zelfconsumptie (12,6 kWh, per-kWh €0,10, 25 huishoudens — scenariostudie)

| grootheid | mediaan | spreiding |
|---|--:|--:|
| batterijwaarde vóór 2027 (A, zonder kosten) | −€117 | −€231 … −€57 |
| batterijwaarde ná 2027 (C, zonder kosten) | €297 | €97 … €588 |
| zuiver effect einde salderen (C−A) | €405 | €172 … €760 |
| vermeden terugleverkosten (€0,10/kWh) | €202 | €76 … €385 |
| totale verandering door 2027 (D−A) | €592 | €248 … €1.145 |

> **Let op:** deze €592 is de mediane verandering van de **zelfconsumptie**-waarde en **geen** raming van de
> volledige batterijopbrengst; handelsopbrengst (day-ahead/onbalans) kan er netto bovenop komen. De
> afzonderlijke medianen (€405, €202) tel je niet rechtstreeks op tot €592. Per scenario tellen ze wél exact
> op — zie C3500_R2.00: €390 + €202 + €0 = €592.

## Reader-versie & bestanden

- Productie-body: **`article-v6-final-production-body.md`** (16 H2, 2 H3, 6 tabellen, 10 FAQ, ~3.121 woorden).
- Visuals: `visuals/` + `production-visuals/` (6 SVG). Preview + screenshots: `production-preview/`.
- Structured data: `article-v6-faq.json`, `article-v6-schema.json`, `article-v6-toc.json`.
- Release: `production-release-v6.json` (full_body; dry-run OK). Rollback: `ROLLBACK_PLAN_V6.md`.
- SEO/onderzoek/controle: `KEYWORD_STRATEGY.md`, `FINAL_SEO_VALIDATION.md`, `CLAIM_EVIDENCE_LEDGER.csv`,
  `PRODUCTION_CLAIM_FREEZE.csv`, `ARTICLE_VALIDATION_REPORT.md`, `FINAL_PRODUCTION_READINESS.md`.

## Wat dit artikel bewust NIET zegt

Geen "einde saldering = €592 voordeel" (dat vermengt beleid en kosten), geen "€592 = volledige
batterijopbrengst", geen "handel is een onzekere bonus", geen "meer batterijen ⇒ minder opbrengst", geen
gesimuleerde handelsopbrengst, geen landelijk gemiddelde, geen gegarandeerde opbrengst.
