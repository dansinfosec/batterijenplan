# ROLLBACK PLAN — V6 (2027 article) — PREPARED, NOT EXECUTED

> **BASELINE CORRECTED (V6.1).** The Render production preflight confirmed the live post is a **substantive
> older article**, NOT the local 62-char placeholder. This plan restores to that confirmed production baseline.
> It is **not** a placeholder. Do not treat it as one.

## What a rollback restores to
The **confirmed current production** Post state (the pre-release baseline on Render):
- model/id: `blog.Post` id **13**
- title: `Energieprijzen stijgen: waarom een thuisbatterij vanaf 2027 meer kan opleveren`
- **body SHA-256 = `03c6c3ab6785df87cda2d5d98dfbd2fbc662efac8c56ff8db91521359efd7659`** (expected restored SHA)
- body chars = **23265**, structure **19 H2 / 13 H3 / 10 tables**
- status = `published`, published_at = **2026-07-15T20:53:41+00:00**, author = **dschu**
- cover_image = `media/batterijenplan/blog/thuisbatterij-2027-cover-v4_bh5rfd`
- cover_alt = `Thuisbatterij vanaf 2027 — Batterijenplan beleidscover met titel en logo`

## Backup path (auto-created by the release, BEFORE any mutation)
`seo_release_v2 --apply` writes a full JSON snapshot BEFORE any write to:
`research/seo/production-backups/release-v2-backups/energieprijzen-stijgen-thuisbatterij-voordeel-2027_<UTC-timestamp>.json`
The snapshot (`_snapshot`) captures body, title, excerpt, seo_title, seo_description, cover_image, cover_alt,
published_at, author (+username), updated_at and `body_sha256` — i.e. a **complete copy of the current
production article** sufficient to fully restore it. (No backup exists yet — nothing has been applied.)

## Restore command (dry-run first, then --apply)
```
# 1) DRY-RUN (default; no writes) — shows current sha -> restore-target sha
python manage.py seo_restore_post_backup --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --backup <backup.json>

# 2) APPLY (only after a human approves the dry-run)
python manage.py seo_restore_post_backup --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --backup <backup.json> --apply
```
Guards: backup slug must equal --slug; the backup's body must match its recorded SHA-256 (else it refuses);
restore runs in one atomic transaction; restores body + title + excerpt + seo_title + seo_description + status
+ published_at exactly.

## Rollback verification procedure
1. After `--apply`, re-read the post body SHA in the Render shell (read-only), e.g. via the Django ORM:
   `python manage.py shell -c "from blog.models import Post,hashlib;import hashlib;b=Post.objects.get(slug='energieprijzen-stijgen-thuisbatterij-voordeel-2027').body;print(hashlib.sha256(b.encode()).hexdigest())"`
2. Confirm it equals the **expected restored SHA** `03c6c3ab6785df87cda2d5d98dfbd2fbc662efac8c56ff8db91521359efd7659`.
3. Confirm status=published and published_at=2026-07-15T20:53:41+00:00 unchanged, author=dschu, cover preserved.
4. Load `/post/energieprijzen-stijgen-thuisbatterij-voordeel-2027` and confirm the older production body is back.

## Visual rollback
The V6 `full_body` release embeds the 6 branded SVGs **inline** (Markdown `![](…)` → `<img>`) using public
URLs under `/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/…`. Rolling the body back to the
`03c6…` baseline removes those `<img>` references automatically (the restored body predates them). The static
SVG files in `frontend/public/blog-assets/…` can be left in place or removed separately; they are inert unless
referenced.

## Note on production DB
This plan targets the environment the management command runs against. Locally, `config.settings` defaults to
`db.sqlite3` (which currently holds only the 62-char placeholder, sha `f5eb25…`, id 3 — NOT the production
article). The **real production DB is on Render**. Both the V6 apply and any rollback on the Render production
DB must be run by a human in that environment — this task does not access Render and performs no production
write.
