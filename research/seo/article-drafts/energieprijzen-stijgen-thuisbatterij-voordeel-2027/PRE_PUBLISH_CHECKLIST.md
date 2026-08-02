# Pre-publish checklist — `energieprijzen-stijgen-thuisbatterij-voordeel-2027`

- [ ] Reconcile proposed body with live raw markdown (no data loss)
- [ ] 0 `[SOURCE REQUIRED]`; 0 banned terms (zonovershot)
- [ ] Time-sensitive claims re-verified at publish time (esp. 2027/btw)
- [ ] seo_title ≤ 60; seo_description accurate
- [ ] tags normalized (no dup casing)
- [ ] cover uploaded; cover_alt set; storage path ≤ 80
- [ ] internal links resolve; one calculator CTA
- [ ] dry-run passes; slug/published_at/status preserved
- [ ] backup (dumpdata) before apply


## FULL-BODY APPLY BLOCKED (2026-08-02)

The proposed body was reconstructed from API body_html rather than copied from the exact raw production Markdown. Production dry-runs showed substantial character loss (e.g. -10,381 chars for the pillar, -19,102 for the 2027 article) and incompatible heading/table detection (production Post.body is stored as HTML, proposal is Markdown). Full-body manifests may only be reconsidered after an exact raw-Markdown patch workflow exists.

Safe release now = `production-manifest-metadata-only.json` (preserve_body=true; body untouched).


## Quality upgrade (2026-08-02)
- Editorial rewrite/pass for a more human, scannable tone (see HUMAN_EDIT_NOTES.md, STYLE_AUDIT.md).
- Added hero with Dutch text overlay + OG + an editable explainer diagram (see IMAGE_PLAN.md).
- Local only; not for automatic production apply.
