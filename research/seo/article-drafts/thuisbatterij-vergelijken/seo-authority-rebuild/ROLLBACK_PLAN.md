# Rollback Plan — thuisbatterij-vergelijken (seo-authority-rebuild)

**Status:** PREPARED, NOT EXECUTED. No production write has occurred.

## What a rollback restores to
The **current production** article as it exists on Render at release time — a substantive, recently-updated page (live fetch 2026-08-03: title "Thuisbatterij vergelijken: waar moet u écht op letten? (2026)", updated_at 2026-08-02, ~15 H2, 2 tables, 4-item FAQ, 6 PNG diagrams). **It is not the local placeholder** (`db.sqlite3` holds a stub for this slug and must not be used as the baseline).

**Confirmed baseline (Render production DB, read-only — `blog.Post` id 6):** body chars **10427** · SHA-256 **`7df12c30ee1fff0cfd2c3cf0ff3a0d7ae473a53abad23d98f238455ca4991a32`** (the **expected restored SHA**) · **15 H2 / 0 H3 / 2 tables** · status `published` · published_at `2026-07-06T00:03:50+00:00` · author_id 1 (dschu) · cover_image `media/batterijenplan/blog/thuisbatterij-vergelijken-v2_b4wfa1` · cover_alt "Thuisbatterij vergelijken op capaciteit, vermogen, EMS en garantie". This is the manifest `precondition`; it was read read-only from Render, **not** from the local placeholder `db.sqlite3`.

> At apply time `--apply` also writes a **complete JSON backup of the live article before any mutation**, so a rollback restores to exactly this baseline (the backup's `body_sha256` must equal `7df12c30…4991a32`).

## Backup (auto-created by the release, before any write)
`seo_release_v2 --apply` writes a full snapshot — body, title, excerpt, seo_title, seo_description, cover_image, cover_alt, published_at, author, `body_sha256` — to:
`research/seo/production-backups/release-v2-backups/thuisbatterij-vergelijken_<UTC-timestamp>.json`
This is a complete copy of the current production article, sufficient to fully restore it.

## Restore command (dry-run first, then --apply)
```
# 1) DRY-RUN (default; no writes) — shows current sha -> restore-target sha
python manage.py seo_restore_post_backup --slug thuisbatterij-vergelijken --backup <backup.json>

# 2) APPLY (only after a human approves the dry-run)
python manage.py seo_restore_post_backup --slug thuisbatterij-vergelijken --backup <backup.json> --apply
```
Guards: backup slug must equal `--slug`; the backup body must match its recorded SHA-256 (else it refuses); restore runs in one atomic transaction; restores body + title + excerpt + seo_title + seo_description + status + published_at exactly.

## Verification after rollback
1. Re-read the post body SHA in the Render shell and confirm it equals the backup's recorded `body_sha256`.
2. Confirm status=published, published_at=2026-07-06T00:03:50+00:00 unchanged, author=dschu, cover preserved.
3. Load `/post/thuisbatterij-vergelijken` and confirm the previous production body is back.

## Visual rollback
The rebuild embeds 4 SVGs via public URLs `/blog-assets/thuisbatterij-vergelijken/…`. Restoring the previous body removes those `<img>` references automatically (the restored body predates them). The static SVGs in `frontend/public/blog-assets/…` are inert unless referenced; leave or remove separately. The previous PNGs at `/article-visuals/…` are untouched by this task.

## Note on environment
Locally `config.settings` defaults to `db.sqlite3` (placeholder only). The real production DB is on Render; both apply and rollback must be run by a human there. This task performed no production write.
