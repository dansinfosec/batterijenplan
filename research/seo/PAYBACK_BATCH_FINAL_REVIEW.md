# Payback batch — final review

Date: 2026-08-01. Three payback-cluster articles reconciled against the full production content. No production apply performed.

## Raw-content provenance
Authoritative raw Markdown is NOT available locally (no dumpdata). Bodies were reconstructed from the read-only production `body_html`; this is complete for content-loss auditing. Before any apply, confirm against a raw `dumpdata` export from Render (instructions below).

## Render raw-body extraction (run by you in the Render Shell)
```bash
python manage.py dumpdata blog.post --indent 2 --output blog_posts_raw_$(date -u +%Y%m%dT%H%M%SZ).json
# or per slug via shell_plus/ORM:
python manage.py shell -c "from blog.models import Post; import json; print(json.dumps({p.slug:p.body for p in Post.objects.filter(slug__in=['wat-levert-een-thuisbatterij-op','terugverdientijd-thuisbatterij-handel-of-zelfconsumptie','energieprijzen-stijgen-thuisbatterij-voordeel-2027'])}, ensure_ascii=False))"
```

### wat-levert-een-thuisbatterij-op
- title (preserved): Wat levert een thuisbatterij op? Onderzoek op basis van 135 simulaties en 300+ echte installaties
- old word count: ~3467 · earlier proposed: ~465 (discarded) · **reconciled: ~3507**
- sections retained: ALL · sections removed: NONE
- unique research preserved: yes (see CONTENT_RECONCILIATION.md)
- current sources: re-verified 2027/btw (Rijksoverheid, Belastingdienst) + existing in-article register
- SEO title: `Wat levert een thuisbatterij op? | Batterijenplan` (49 chars) · slug: `wat-levert-een-thuisbatterij-op` (unchanged)
- cover: `brand-assets/higgsfield-blog/wat-levert-een-thuisbatterij-op/final/opbrengst-thuisbatterij.png`
- internal links: 5 · calculator CTA: yes (contextual /calculator link)
- manifest validation: see Phase G
- **CONTENT LOSS CHECK: PASS — no valuable unique content was lost**

### terugverdientijd-thuisbatterij-handel-of-zelfconsumptie
- title (preserved): Terugverdientijd thuisbatterij: handel of zelfconsumptie?
- old word count: ~1225 · earlier proposed: ~400 (discarded) · **reconciled: ~1257**
- sections retained: ALL · sections removed: NONE
- unique research preserved: yes (see CONTENT_RECONCILIATION.md)
- current sources: re-verified 2027/btw (Rijksoverheid, Belastingdienst) + existing in-article register
- SEO title: `Handel of zelfconsumptie thuisbatterij? | Batterijenplan` (56 chars) · slug: `terugverdientijd-thuisbatterij-handel-of-zelfconsumptie` (unchanged)
- cover: `brand-assets/higgsfield-blog/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie/final/handel-vs-zelfconsumptie.png`
- internal links: 4 · calculator CTA: yes (contextual /calculator link)
- manifest validation: see Phase G
- **CONTENT LOSS CHECK: PASS — no valuable unique content was lost**

### energieprijzen-stijgen-thuisbatterij-voordeel-2027
- title (preserved): Energieprijzen stijgen: waarom een thuisbatterij vanaf 2027 meer kan opleveren
- old word count: ~2777 · earlier proposed: ~470 (discarded) · **reconciled: ~2802**
- sections retained: ALL · sections removed: NONE
- unique research preserved: yes (see CONTENT_RECONCILIATION.md)
- current sources: re-verified 2027/btw (Rijksoverheid, Belastingdienst) + existing in-article register
- SEO title: `Thuisbatterij vanaf 2027: einde saldering | Batterijenplan` (58 chars) · slug: `energieprijzen-stijgen-thuisbatterij-voordeel-2027` (unchanged)
- cover: `brand-assets/higgsfield-blog/energieprijzen-stijgen-thuisbatterij-voordeel-2027/final/thuisbatterij-2027.png`
- internal links: 3 · calculator CTA: yes (contextual /calculator link)
- manifest validation: see Phase G
- **CONTENT LOSS CHECK: PASS — no valuable unique content was lost**

## Overall CONTENT LOSS CHECK: PASS — no valuable unique content was lost in any article.
