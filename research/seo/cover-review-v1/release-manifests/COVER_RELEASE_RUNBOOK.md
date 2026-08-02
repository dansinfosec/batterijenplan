# Cover release runbook V1 — 12 guarded cover-only releases

**Operator-executed on Render. Nothing here is run by the author. One post = one transaction, one backup, one rollback point.**
`thuisbatterij-vergelijken` is PASS and is intentionally **not** in this runbook.

## Guarantees per post (enforced by `seo_release_v2 --mode cover_only`)
- verifies the live `Post.body` SHA-256 before upload (captured; printed by dry-run);
- writes a full JSON backup before the write;
- uploads the local 1600×900 file through the Cloudinary-backed `Post.cover_image` field;
- assigns only `cover_image` + `cover_alt`; **body byte-for-byte preserved**; slug/status/published_at preserved;
- reloads the post and re-verifies the body SHA is unchanged; **rolls back automatically on any mismatch.**

## Sequence (repeat per post, one at a time)
1. **Dry-run** — prints current cover, upload source, proposed filename, `body: PRESERVED EXACTLY`, and the live body SHA-256.
2. **Stop** if any precondition fails (status/published_at mismatch, missing source, headroom, empty alt) — do not apply.
3. **Apply** that one post (its own atomic transaction + backup).
4. **Verify** post-apply body SHA equals the dry-run value and the Cloudinary cover changed.
5. Only then **continue** to the next post. Never bulk-apply.

> Optional hard pin: after step 1 reveals the live SHA, add `"sha256":"<value>"` and `"chars":<n>` to the manifest `precondition` for a pre-write hard check.

Backups: `research/seo/production-backups/cover-release-v1/<slug>_<UTC-timestamp>_cover.json`.

---

## 1. `wat-levert-een-thuisbatterij-op`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug wat-levert-een-thuisbatterij-op --manifest research/seo/cover-review-v1/release-manifests/wat-levert-een-thuisbatterij-op-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug wat-levert-een-thuisbatterij-op --manifest research/seo/cover-review-v1/release-manifests/wat-levert-een-thuisbatterij-op-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='wat-levert-een-thuisbatterij-op'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug wat-levert-een-thuisbatterij-op --backup research/seo/production-backups/cover-release-v1/wat-levert-een-thuisbatterij-op_<UTC-timestamp>_cover.json --apply
```

## 2. `energieprijzen-stijgen-thuisbatterij-voordeel-2027`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --manifest research/seo/cover-review-v1/release-manifests/energieprijzen-stijgen-thuisbatterij-voordeel-2027-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --manifest research/seo/cover-review-v1/release-manifests/energieprijzen-stijgen-thuisbatterij-voordeel-2027-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='energieprijzen-stijgen-thuisbatterij-voordeel-2027'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --backup research/seo/production-backups/cover-release-v1/energieprijzen-stijgen-thuisbatterij-voordeel-2027_<UTC-timestamp>_cover.json --apply
```

## 3. `warmtefonds-thuisbatterij-lening`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug warmtefonds-thuisbatterij-lening --manifest research/seo/cover-review-v1/release-manifests/warmtefonds-thuisbatterij-lening-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug warmtefonds-thuisbatterij-lening --manifest research/seo/cover-review-v1/release-manifests/warmtefonds-thuisbatterij-lening-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='warmtefonds-thuisbatterij-lening'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug warmtefonds-thuisbatterij-lening --backup research/seo/production-backups/cover-release-v1/warmtefonds-thuisbatterij-lening_<UTC-timestamp>_cover.json --apply
```

## 4. `enphase-vs-dyness`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug enphase-vs-dyness --manifest research/seo/cover-review-v1/release-manifests/enphase-vs-dyness-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug enphase-vs-dyness --manifest research/seo/cover-review-v1/release-manifests/enphase-vs-dyness-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='enphase-vs-dyness'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug enphase-vs-dyness --backup research/seo/production-backups/cover-release-v1/enphase-vs-dyness_<UTC-timestamp>_cover.json --apply
```

## 5. `groene-vrienden-vs-zonneplan-vs-tibber`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug groene-vrienden-vs-zonneplan-vs-tibber --manifest research/seo/cover-review-v1/release-manifests/groene-vrienden-vs-zonneplan-vs-tibber-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug groene-vrienden-vs-zonneplan-vs-tibber --manifest research/seo/cover-review-v1/release-manifests/groene-vrienden-vs-zonneplan-vs-tibber-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='groene-vrienden-vs-zonneplan-vs-tibber'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug groene-vrienden-vs-zonneplan-vs-tibber --backup research/seo/production-backups/cover-release-v1/groene-vrienden-vs-zonneplan-vs-tibber_<UTC-timestamp>_cover.json --apply
```

## 6. `terugverdientijd-thuisbatterij-handel-of-zelfconsumptie`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --manifest research/seo/cover-review-v1/release-manifests/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --manifest research/seo/cover-review-v1/release-manifests/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='terugverdientijd-thuisbatterij-handel-of-zelfconsumptie'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --backup research/seo/production-backups/cover-release-v1/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie_<UTC-timestamp>_cover.json --apply
```

## 7. `dynamisch-energiecontract-thuisbatterij`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug dynamisch-energiecontract-thuisbatterij --manifest research/seo/cover-review-v1/release-manifests/dynamisch-energiecontract-thuisbatterij-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug dynamisch-energiecontract-thuisbatterij --manifest research/seo/cover-review-v1/release-manifests/dynamisch-energiecontract-thuisbatterij-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='dynamisch-energiecontract-thuisbatterij'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug dynamisch-energiecontract-thuisbatterij --backup research/seo/production-backups/cover-release-v1/dynamisch-energiecontract-thuisbatterij_<UTC-timestamp>_cover.json --apply
```

## 8. `elektrische-auto-ems-systeem`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug elektrische-auto-ems-systeem --manifest research/seo/cover-review-v1/release-manifests/elektrische-auto-ems-systeem-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug elektrische-auto-ems-systeem --manifest research/seo/cover-review-v1/release-manifests/elektrische-auto-ems-systeem-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='elektrische-auto-ems-systeem'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug elektrische-auto-ems-systeem --backup research/seo/production-backups/cover-release-v1/elektrische-auto-ems-systeem_<UTC-timestamp>_cover.json --apply
```

## 9. `ems-systeem-thuisbatterij-controle-over-stroom`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug ems-systeem-thuisbatterij-controle-over-stroom --manifest research/seo/cover-review-v1/release-manifests/ems-systeem-thuisbatterij-controle-over-stroom-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug ems-systeem-thuisbatterij-controle-over-stroom --manifest research/seo/cover-review-v1/release-manifests/ems-systeem-thuisbatterij-controle-over-stroom-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='ems-systeem-thuisbatterij-controle-over-stroom'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug ems-systeem-thuisbatterij-controle-over-stroom --backup research/seo/production-backups/cover-release-v1/ems-systeem-thuisbatterij-controle-over-stroom_<UTC-timestamp>_cover.json --apply
```

## 10. `thuisbatterij-installatie`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug thuisbatterij-installatie --manifest research/seo/cover-review-v1/release-manifests/thuisbatterij-installatie-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug thuisbatterij-installatie --manifest research/seo/cover-review-v1/release-manifests/thuisbatterij-installatie-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='thuisbatterij-installatie'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug thuisbatterij-installatie --backup research/seo/production-backups/cover-release-v1/thuisbatterij-installatie_<UTC-timestamp>_cover.json --apply
```

## 11. `stroom-opslaan-zonnepanelen`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug stroom-opslaan-zonnepanelen --manifest research/seo/cover-review-v1/release-manifests/stroom-opslaan-zonnepanelen-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug stroom-opslaan-zonnepanelen --manifest research/seo/cover-review-v1/release-manifests/stroom-opslaan-zonnepanelen-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='stroom-opslaan-zonnepanelen'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug stroom-opslaan-zonnepanelen --backup research/seo/production-backups/cover-release-v1/stroom-opslaan-zonnepanelen_<UTC-timestamp>_cover.json --apply
```

## 12. `batterijopslag-woonstichtingen-vve`

```bash
# 1) DRY-RUN
python manage.py seo_release_v2 --slug batterijopslag-woonstichtingen-vve --manifest research/seo/cover-review-v1/release-manifests/batterijopslag-woonstichtingen-vve-cover-v1.json

# 3) APPLY (own transaction + backup)
python manage.py seo_release_v2 --slug batterijopslag-woonstichtingen-vve --manifest research/seo/cover-review-v1/release-manifests/batterijopslag-woonstichtingen-vve-cover-v1.json --apply --backup-dir research/seo/production-backups/cover-release-v1

# 4) VERIFY
python manage.py shell -c "import hashlib; from blog.models import Post; p=Post.objects.get(slug='batterijopslag-woonstichtingen-vve'); print('cover', p.cover_image.name); print('alt', p.cover_alt); print('body_sha', hashlib.sha256(p.body.encode()).hexdigest()); print('body_chars', len(p.body)); print('status', p.status, 'published_at', p.published_at)"

# ROLLBACK (only if verify fails; use the backup file the APPLY step printed)
python manage.py seo_restore_post_backup --slug batterijopslag-woonstichtingen-vve --backup research/seo/production-backups/cover-release-v1/batterijopslag-woonstichtingen-vve_<UTC-timestamp>_cover.json --apply
```
