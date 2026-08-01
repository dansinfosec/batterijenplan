# First Article Dry-Run — `thuisbatterij-vergelijken`

**Date:** 2026-08-01 · **Command:** `seo_update_posts` (dry-run, default) · **No production write performed.**
Diff computed by seeding a throwaway migrated SQLite DB from the read-only production snapshot
(`research/seo/production-backups/2026-08-01T203751Z/`) so "old" = the real live values.

## Decisions locked
- **Slug preserved:** `thuisbatterij-vergelijken` (no change → no redirect).
- **published_at preserved:** 2026-07-06 (never modified).
- **status preserved:** `published` (no `--publish` flag → unchanged).
- **All 8 `[SOURCE REQUIRED]` markers resolved** by rewording to general/source-free statements — 0 markers remain (validated).
- **6 contextual internal links** inserted, all resolving to existing live posts / `/calculator`.

## Complete old → new field diff

| Field | Old (live) | New (manifest) |
|---|---|---|
| title | Thuisbatterij vergelijken: waar moet u op letten? | Thuisbatterij vergelijken: waar moet u écht op letten? (2026) |
| seo_title | Thuisbatterij vergelijken \| Batterijenplan | Thuisbatterij vergelijken: waar op letten? \| Batterijenplan (59 chars) |
| seo_description | Vergelijk thuisbatterijen op capaciteit, prijs, merk, installatie, EMS-sturing en geschiktheid voor zonnepanelen en dynamische energiecontracten. | Thuisbatterij vergelijken? Let op bruikbare capaciteit, vermogen, AC/DC, EMS, garantie en noodstroom — niet alleen prijs. Bereken gratis welke batterij past. |
| excerpt | Wilt u een thuisbatterij vergelijken? Ontdek de belangrijkste verschillen in capaciteit, garantie, omvormers, EMS-systemen en prijs. | Een thuisbatterij vergelijkt u niet op prijs alleen. Ontdek op welke punten — bruikbare capaciteit, vermogen, AC/DC, EMS, garantie en noodstroom — u echt moet letten. |
| cover_alt | Thuisbatterij vergelijken op capaciteit, prijs, merk en slimme energiesturing | Thuisbatterij vergelijken op capaciteit, vermogen, EMS en garantie |
| body | ~3,774 chars (rendered; 2-min) | 8,854 chars markdown — answer-first pillar, 16 sections, 2 tables, FAQ |
| tags | EMS, batterij vergelijken, energieopslag, thuisaccu, thuisbatterij, thuisbatterij vergelijken | thuisbatterij, thuisbatterij vergelijken, EMS, energieopslag (consolidated, deduped) |
| cover_image | (none set) | upload `…/v2/thuisbatterij-vergelijken-v2.png` (V2, with real logo) |

> Note: the "old" body char count reflects the API's rendered `body_html`. Against production, the
> command diffs the raw markdown body directly; the substantial expansion + full rewrite is the same.

## Captured CLI output (dry-run)
```
seo_update_posts [DRY-RUN] slug=thuisbatterij-vergelijken
Validation passed (no [SOURCE REQUIRED], fields OK, links resolve).

Field diff for 'thuisbatterij-vergelijken':
  title:
    - old: 'Thuisbatterij vergelijken: waar moet u op letten?'
    + new: 'Thuisbatterij vergelijken: waar moet u écht op letten? (2026)'
  excerpt: (old → new, see table)
  seo_title:
    - old: 'Thuisbatterij vergelijken | Batterijenplan'
    + new: 'Thuisbatterij vergelijken: waar op letten? | Batterijenplan'
  seo_description: (old → new, see table)
  cover_alt:
    - old: 'Thuisbatterij vergelijken op capaciteit, prijs, merk en slimme energiesturing'
    + new: 'Thuisbatterij vergelijken op capaciteit, vermogen, EMS en garantie'
  body: 3774 -> 8854 chars (CHANGED)
  tags: [EMS, batterij vergelijken, energieopslag, thuisaccu, thuisbatterij, thuisbatterij vergelijken]
        -> [thuisbatterij, thuisbatterij vergelijken, EMS, energieopslag]
  cover_image: None -> upload '…/v2/thuisbatterij-vergelijken-v2.png'
  PRESERVED: slug='thuisbatterij-vergelijken', published_at=2026-07-06 00:03:50+00:00, status='published' (status will NOT change)

DRY-RUN complete. No database changes were made. Re-run with --apply to write.
```

## Internal links inserted (contextual, in body)
`/calculator` · `/post/stroom-opslaan-zonnepanelen` · `/post/ems-systeem-thuisbatterij-controle-over-stroom`
· `/post/dynamisch-energiecontract-thuisbatterij` · `/post/thuisbatterij-installatie` · `/post/wat-levert-een-thuisbatterij-op`
(all verified to exist; command fails if any target is missing).

## Not done (awaiting approval)
`--apply` was **not** run. No image uploaded. No production mutation. Awaiting your approval of this
payload + the backup step before the first write.
