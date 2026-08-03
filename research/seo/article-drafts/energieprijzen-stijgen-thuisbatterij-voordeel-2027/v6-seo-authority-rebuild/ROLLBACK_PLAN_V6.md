# ROLLBACK PLAN — V6 (2027 article) — PREPARED, NOT EXECUTED

## What a rollback restores to
The **current** production Post state (the pre-release baseline):
- body = `placeholder energieprijzen-stijgen-thuisbatterij-voordeel-2027`
- **body SHA-256 = `f5eb25d80b6255c484ab3c09e84b1e340186bb435c2ea9ba37a641b990b83599`** (expected restored SHA)
- title = slug, excerpt/seo_title/seo_description empty, status=published, published_at=2026-08-02T10:30:19.261283+00:00, author=seed_local, cover=none.

## Backup path (auto-created by the release)
`seo_release_v2 --apply` writes a full JSON snapshot BEFORE any mutation to:
`research/seo/production-backups/release-v2-backups/energieprijzen-stijgen-thuisbatterij-voordeel-2027_<UTC-timestamp>.json`
The snapshot includes body, title, excerpt, seo_title, seo_description, cover_image, cover_alt, published_at,
author, and `body_sha256`. (No backup exists yet — nothing has been applied.)

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
1. After `--apply`, re-read the post body SHA:
   `python -c "import sqlite3,hashlib;c=sqlite3.connect('db.sqlite3');b=c.execute(\"SELECT body FROM blog_post WHERE slug='energieprijzen-stijgen-thuisbatterij-voordeel-2027'\").fetchone()[0];print(hashlib.sha256(b.encode()).hexdigest())"`
2. Confirm it equals the **expected restored SHA** `f5eb25d80b6255c484ab3c09e84b1e340186bb435c2ea9ba37a641b990b83599`.
3. Confirm status=published and published_at=2026-08-02T10:30:19.261283+00:00 unchanged.
4. Load /post/energieprijzen-stijgen-thuisbatterij-voordeel-2027 and confirm the placeholder body is back.

## Visual rollback
The full_body release inserts NO images, so there is nothing visual to roll back for it. If a later
`visual_patch` added `<img>` tags, roll that back the same way (restore from that patch's auto-backup);
the referenced SVGs on Cloudinary can be left in place or deleted separately (a human/Cloudinary action).

## Note on production DB
This plan targets the environment the management command runs against (`config.settings`, default DB =
`db.sqlite3` locally; the real production DB is on Render). Rollback on the Render production DB must be run
by a human in that environment — this task does not access Render.
