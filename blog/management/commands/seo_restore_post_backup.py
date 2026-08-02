"""
seo_restore_post_backup - dry-run-by-default, transaction-protected restore of a single post
from a JSON backup produced by seo_release_v2 (or seo_update_posts).

Guards:
  - dry-run by default; writes only with --apply.
  - the backup slug must equal --slug.
  - restores body + metadata exactly; preserves/restores status and published_at exactly.
  - after the write the post is reloaded and the body SHA-256 is verified against the backup;
    any mismatch raises and rolls the transaction back.

Usage:
    python manage.py seo_restore_post_backup --slug <slug> --backup <file>            # dry-run
    python manage.py seo_restore_post_backup --slug <slug> --backup <file> --apply    # restore
"""
from __future__ import annotations

import hashlib
import json
import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from blog.models import Post


def body_sha(body: str) -> str:
    return hashlib.sha256((body or "").encode("utf-8")).hexdigest()


class Command(BaseCommand):
    help = "Dry-run-by-default, transaction-protected restore of one post from a JSON backup."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--backup", required=True)
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **o):
        slug = o["slug"]
        apply = o["apply"] and not o["dry_run"]
        if not os.path.isfile(o["backup"]):
            raise CommandError(f"Backup not found: {o['backup']}")
        snap = json.load(open(o["backup"], encoding="utf-8"))
        if snap.get("slug") != slug:
            raise CommandError(f"Backup slug {snap.get('slug')!r} != --slug {slug!r}.")
        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise CommandError(f"No post with slug '{slug}'.")

        target_sha = snap.get("body_sha256") or body_sha(snap["body"])
        if body_sha(snap["body"]) != target_sha:
            raise CommandError("Backup body does not match its recorded SHA-256; refusing to restore.")
        self.stdout.write(self.style.MIGRATE_HEADING(f"seo_restore_post_backup [{'APPLY' if apply else 'DRY-RUN'}] slug={slug}"))
        self.stdout.write(f"  current body sha {body_sha(post.body)[:16]} -> restore to {target_sha[:16]}")
        self.stdout.write(self.style.WARNING(f"  will restore: body, title, excerpt, seo_title, seo_description, status, published_at"))

        if not apply:
            self.stdout.write(self.style.SUCCESS("\nDRY-RUN complete. No changes. Re-run with --apply to restore."))
            return

        try:
            with transaction.atomic():
                post.body = snap["body"]
                for f in ("title", "excerpt", "seo_title", "seo_description", "cover_alt"):
                    if snap.get(f) is not None:
                        setattr(post, f, snap[f])
                if snap.get("status"):
                    post.status = snap["status"]
                if snap.get("published_at"):
                    post.published_at = parse_datetime(snap["published_at"])
                post.full_clean(exclude=["slug", "author"])
                post.save()
                post.refresh_from_db()
                if body_sha(post.body) != target_sha:
                    raise CommandError(f"restore verification failed: {body_sha(post.body)[:16]} != {target_sha[:16]}")
                if post.slug != slug:
                    raise CommandError("slug changed during restore")
        except Exception as exc:
            raise CommandError(f"Restore aborted, transaction rolled back: {exc}")
        self.stdout.write(self.style.SUCCESS(f"\nRESTORED. body sha {target_sha} verified; slug preserved."))
