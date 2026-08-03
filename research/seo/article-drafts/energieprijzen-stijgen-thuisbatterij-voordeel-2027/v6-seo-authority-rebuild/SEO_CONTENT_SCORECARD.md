# SEO CONTENT SCORECARD — V6

Self-assessment of the V6 draft against search intent, E-E-A-T and the task requirements. Scores are the
author's judgement for human review, not a guarantee of ranking.

## Search-intent coverage (from SEARCH_INTENT_MAP)

| user question | answered in | verdict |
|---|---|---|
| Is a battery more valuable after 2027? | intro + conclusie | ✓ direct, above the fold |
| How much comes purely from ending netting? | Zuiver effect einde salderen (€405) | ✓ |
| How much from avoided feed-in costs? | Vermeden terugleverkosten (€202) | ✓ |
| Can a battery reduce fixed/tiered fees? | Kostenstructuur telt (vast €0, staffel €88–90) | ✓ |
| Which households benefit most? | Voor wie interessant + Resultaten 25 profielen | ✓ |
| Does >10 kWh add much? | Batterijcapaciteit + diminishing returns | ✓ |
| What if imbalance returns decline? | Onbalanshandel minder + break-even range | ✓ |
| Why are day-ahead and imbalance different? | dedicated H2 | ✓ |

## On-page checklist

| item | status |
|---|---|
| Primary kw in H1, title, intro, URL-intent | ✓ (title/H1 "thuisbatterij na 2027") |
| Answer-first (antwoord above the fold) | ✓ "Kort antwoord" opening |
| Secondary kws in H2s (saldering 2027, terugleverkosten, rendabel) | ✓ |
| Word count | 2.349 |
| H2 sections | 15 |
| Data tables | 6 |
| Original visuals | 6 (accessible, Dutch, responsive) |
| FAQ | 9 Q&A (~40–80 words each) + FAQ schema |
| Internal links | 7 articles + calculator CTA (INTERNAL_LINK_MAP) |
| Methodology box | ✓ |
| "Wat deze simulatie niet voorspelt" box | ✓ |
| Representative transparent calculation | ✓ (−€108 → +€462 → +€237 → €591) |
| Structured data (Article + FAQPage JSON-LD) | ✓ draft |
| Legal sourcing | ✓ Rijksoverheid / ACM / Consumentenbond |

## Differentiation vs SERP (from CONTENT_GAP_REPORT)

Only page in the analysed SERP with: original quarter-hour simulation; policy-vs-fee decomposition;
fee-structure dependence; reserve opportunity-cost distribution; imbalance-as-overlay with break-even
range; explicit day-ahead≠imbalance; transparent limitations. **Strong originality/E-E-A-T signal.**

## Risk / watch-items

- Primary keyword volume is modest (140) but rising and low-difficulty; play is topical authority + PAA/AI-overview capture, not high raw traffic.
- "terugleverkosten" (6.600) and "is een thuisbatterij rendabel" (880) are stretch targets (supplier/consumer-org owned) — expect PAA/featured rather than #1.
- Blog URL prefix for internal links not confirmed against the live SPA router (see readiness checklist).
- JSON-LD dates/author/URL are placeholders; validate before use.

## Statistical-integrity note (correction pass 2026-08-03)

The article presents policy/fee as **separate distribution medians** and explicitly warns they do not add
(median of a sum ≠ sum of medians); the one additive example uses a single representative scenario
(C3500_R2.00) that sums exactly. All headline stats use the 12,6 kWh scope (A −€117, C €297, fee €202);
the all-battery pooled €196 is documented as a different scope. ACM claims use official acm.nl primary
sources. This removes the main accuracy risk flagged in the prior draft.

## Overall

Intent coverage: strong. Originality/E-E-A-T: strong. Technical SEO scaffolding: complete (draft).
Statistical integrity: corrected (no median addition). Estimated readiness for human review: **high**;
production-integration items remain (see checklist).
