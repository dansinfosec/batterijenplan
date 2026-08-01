# Render Shell — Backup, Update & Rollback (Option A)

All commands run **by you** in the Render **Shell** of the Django web service (has `DATABASE_URL` +
`CLOUDINARY_URL`). Nothing here shares a secret with Claude. App labels verified in source:
`blog` (Post, Comment) + `taggit` (Tag, TaggedItem). `Post.author → auth.User`; `leads` is independent
and **not** needed for blog FK integrity on a same-DB rollback.

## 0. Prereqs in the production environment
- The reviewed files must be present in the deployed checkout (they live in the repo):
  - `research/seo/article-drafts/thuisbatterij-vergelijken/production-manifest.json`
  - `brand-assets/higgsfield-thuisbatterij-vergelijken/generated/v2/…_v2_final.png` (the cover)
- If `research/` or `brand-assets/` are **not** in the deployed image, upload those two files to the
  shell working directory first, or upload the cover via Django Admin instead.

## 1. Authoritative backup (REQUIRED before any write)
```bash
# UTC-timestamped filename; raw markdown bodies + tags + relations
python manage.py dumpdata blog taggit --indent 2 --output "production-blog-backup_$(date -u +%Y%m%dT%H%M%SZ).json"
```
*(Optional, for a fully portable backup that also carries the author rows: add `auth.User`:
`python manage.py dumpdata blog taggit auth.User --indent 2 --output …`. Not required for a same-DB rollback.)*

### Verify the backup parses
```bash
python -m json.tool production-blog-backup_*.json > /dev/null && echo "JSON OK"
```
### Count exported posts (expect 13)
```bash
python -c "import json,glob; f=sorted(glob.glob('production-blog-backup_*.json'))[-1]; d=json.load(open(f)); print(f, sum(1 for o in d if o['model']=='blog.post'), 'posts')"
```
Download this file and store it next to `research/seo/production-backups/`.

## 2. Dry-run (default — makes NO changes)
```bash
python manage.py seo_update_posts \
  --slug thuisbatterij-vergelijken \
  --manifest research/seo/article-drafts/thuisbatterij-vergelijken/production-manifest.json
```
Review the printed old→new field diff. It must end with "DRY-RUN complete. No database changes were made."

## 3. Apply (ONLY after approval)
```bash
python manage.py seo_update_posts \
  --slug thuisbatterij-vergelijken \
  --manifest research/seo/article-drafts/thuisbatterij-vergelijken/production-manifest.json \
  --apply
```
The command writes a pre-write per-post backup JSON (under `research/seo/production-backups/command-backups/`),
updates fields inside one `transaction.atomic()`, preserves slug + `published_at`, and does **not** change
status (no `--publish` passed). The cover image is uploaded to Cloudinary via the `cover_image` field.

## 4. Rollback
### Full restore (authoritative)
```bash
python manage.py loaddata production-blog-backup_<timestamp>.json
```
### Single-post revert (from the command's pre-write backup)
Re-apply the saved snapshot via Admin, or craft a tiny manifest from
`research/seo/production-backups/command-backups/thuisbatterij-vergelijken_<ts>.json` and run `--apply`.

## 5. Post-write verification (Render + frontend)
```bash
# API reflects the change:
curl -s https://api.batterijenplan.nl/api/posts/thuisbatterij-vergelijken/ | python -m json.tool | head
```
Then rebuild the frontend (prerender + sitemap) and spot-check the page (desktop + mobile) and JSON-LD.

## Safety notes
- Never paste `SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_URL`, or admin passwords into chat or logs.
- The command never deletes posts, never touches unrelated models, and refuses `[SOURCE REQUIRED]`.
- Keep the temporary staff account only as a manual Admin fallback; revoke it after the overhaul.
