# V2 release runbook (guarded, two-phase)

Phase 1 (local): tooling + manifests + tests + assets committed & pushed to `deployment-ready`.
Phase 2 (Render, run by the operator): dry-run → apply → verify, one article at a time.
The Render dry-run is the production precondition verification (current body SHA/struct must match the manifest).
Never apply without a PASS dry-run. wat-levert-een-thuisbatterij-op is out of scope.

## Payback — terugverdientijd-thuisbatterij-handel-of-zelfconsumptie
Precondition: 8546 chars / c71e722edcb77f733299e1c788f810b247181db47ecd66f4b677c5dd5efd7903 / 15H2 0H3 0tbl
Proposed:     acb106da498b1a760b9518e41bdddffc2e71a4c5b08d96a898556b0078362488  (19H2 6H3 1tbl)
- Dry-run/verify: `python manage.py seo_release_v2 --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --manifest research/seo/article-drafts/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie/production-manifest-v2.json`
- Apply:          `python manage.py seo_release_v2 --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --manifest research/seo/article-drafts/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie/production-manifest-v2.json --apply`
- Post-apply verify: `python manage.py shell -c "import hashlib;from blog.models import Post;print(hashlib.sha256(Post.objects.get(slug='terugverdientijd-thuisbatterij-handel-of-zelfconsumptie').body.encode()).hexdigest())"` (expect acb106da498b1a760b9518e41bdddffc2e71a4c5b08d96a898556b0078362488)
- Rollback:       `python manage.py seo_restore_post_backup --slug terugverdientijd-thuisbatterij-handel-of-zelfconsumptie --backup research/seo/production-backups/release-v2-backups/<backup>.json --apply`

## Vergelijken — thuisbatterij-vergelijken (VISUAL PATCH)
Precondition: 8969 chars / 2b136a6eceac4e62a9a959a83d326df5ddce63769e4440ffc083517f439d9e2a / 15H2 0H3 2tbl
- Dry-run/verify: `python manage.py seo_release_v2 --slug thuisbatterij-vergelijken --manifest research/seo/article-drafts/thuisbatterij-vergelijken/production-visual-patch-v2.json`
- Apply:          `python manage.py seo_release_v2 --slug thuisbatterij-vergelijken --manifest research/seo/article-drafts/thuisbatterij-vergelijken/production-visual-patch-v2.json --apply`
- Post-apply verify: `python manage.py shell -c "from blog.models import Post;b=Post.objects.get(slug='thuisbatterij-vergelijken').body;print('urls',sum(u in b for u in ['welke-batterij-past-bij-mijn-situatie.png','capaciteit-versus-vermogen.png','wat-moet-u-vergelijken.png','batterijsysteem-overzicht.png','een-fase-versus-drie-fasen.png','offerte-vergelijkingschecklist.png']))"` (expect 6)
- Rollback:       `python manage.py seo_restore_post_backup --slug thuisbatterij-vergelijken --backup research/seo/production-backups/release-v2-backups/<backup>.json --apply`
- If dry-run reports a missing/duplicate anchor: NO write occurs; correct only that anchor in production-visual-patch-v2.json and push a follow-up commit.

## 2027 — energieprijzen-stijgen-thuisbatterij-voordeel-2027
Precondition: 40593 chars / a421d52f4962d8fd6cde199c59ebd6caf2d0151d8cd73d4b75d47fa71f775d7e / 19H2 13H3 10tbl
Proposed:     0bc77e4d93a94aeaa49daca412940c305b52b497ef0e4d4b67448e835b29d96b  (19H2 13H3 10tbl)
- Dry-run/verify: `python manage.py seo_release_v2 --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --manifest research/seo/article-drafts/energieprijzen-stijgen-thuisbatterij-voordeel-2027/production-manifest-v2.json`
- Apply:          `python manage.py seo_release_v2 --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --manifest research/seo/article-drafts/energieprijzen-stijgen-thuisbatterij-voordeel-2027/production-manifest-v2.json --apply`
- Post-apply verify: `python manage.py shell -c "import hashlib;from blog.models import Post;print(hashlib.sha256(Post.objects.get(slug='energieprijzen-stijgen-thuisbatterij-voordeel-2027').body.encode()).hexdigest())"` (expect 0bc77e4d93a94aeaa49daca412940c305b52b497ef0e4d4b67448e835b29d96b)
- Rollback:       `python manage.py seo_restore_post_backup --slug energieprijzen-stijgen-thuisbatterij-voordeel-2027 --backup research/seo/production-backups/release-v2-backups/<backup>.json --apply`
