# Changelog — `energieprijzen-stijgen-thuisbatterij-voordeel-2027` package

**Status:** PROPOSED (not applied). Slug + published_at + status preserved.

- Repositioned for cluster role: Tijdsgebonden 2027-beslisartikel.
- Fresh 2027/btw facts verified 2026-08-01 (see SOURCE_REQUIREMENTS).
- Cover: thuisbatterij-2027.png (V2 family, real logo overlay).
- **Human-review before apply:** reconcile proposed body with the rich live body (raw markdown via prod dumpdata) so existing analysis/data is not lost.


## Reconciliation (2026-08-01)
- Discarded the earlier short repositioning (~470 words) — it would have removed valuable production content.
- Reconciled manifest now PRESERVES the full production body (~2802 words) + adds 3 internal links.
- CONTENT LOSS CHECK: PASS — no valuable unique content was lost.
- Body reconstructed from production body_html; confirm against raw dumpdata before apply.


## FULL-BODY APPLY BLOCKED (2026-08-02)

The proposed body was reconstructed from API body_html rather than copied from the exact raw production Markdown. Production dry-runs showed substantial character loss (e.g. -10,381 chars for the pillar, -19,102 for the 2027 article) and incompatible heading/table detection (production Post.body is stored as HTML, proposal is Markdown). Full-body manifests may only be reconsidered after an exact raw-Markdown patch workflow exists.

Safe release now = `production-manifest-metadata-only.json` (preserve_body=true; body untouched).


## Quality upgrade (2026-08-02)
- Editorial rewrite/pass for a more human, scannable tone (see HUMAN_EDIT_NOTES.md, STYLE_AUDIT.md).
- Added hero with Dutch text overlay + OG + an editable explainer diagram (see IMAGE_PLAN.md).
- Local only; not for automatic production apply.
