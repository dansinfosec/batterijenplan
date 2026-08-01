"""
seo_update_posts — admin-safe, dry-run-by-default updater for blog posts.

Applies a reviewed content manifest to a SINGLE existing post. Designed to be run
in the production shell (Render) after a backup. Safety model:

- Dry-run is the DEFAULT. Writes happen ONLY with --apply (and never with --dry-run).
- One slug at a time (--slug), with field data from a reviewed --manifest file.
- Validates every field; rejects "[SOURCE REQUIRED]" markers and missing content.
- Preserves the slug and published_at; never publishes a draft unless --publish.
- Backs up the current post to JSON before writing; all writes run in one atomic
  transaction that rolls back on any error.
- Never deletes a post and never touches unrelated models.

Usage:
    python manage.py seo_update_posts --slug <slug> --manifest <path>            # dry-run (default)
    python manage.py seo_update_posts --slug <slug> --manifest <path> --apply    # write
"""
from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from blog.models import Post

logger = logging.getLogger("blog.seo_update_posts")

# Routes that exist in the React app (frontend/src/App.jsx) — used to validate
# internal links inside article copy. /post/<slug> links are checked against the DB.
KNOWN_ROUTES = {"/", "/calculator", "/artikelen", "/contact", "/privacy"}

REQUIRED_TEXT_FIELDS = ["title", "excerpt", "body", "seo_title", "seo_description"]
MARKER = "[SOURCE REQUIRED]"

# Known incorrect spellings / typos that must never reach production copy.
# 'zonovershot' was a non-word typo corrected in production to 'zonne-overschot'.
BANNED_TERMS = ["zonovershot"]

# Field length limits mirrored from blog.models.Post (fail early, before the DB).
MAX_LEN = {"title": 250, "seo_title": 70, "excerpt": 400, "cover_alt": 160}

# Reserved headroom for the generated cover storage path. The generated name
# (upload_to + filename) is NOT the final stored value: Django's storage.save()
# calls get_available_name(), which on a name collision appends a uniqueness
# suffix ("_" + 7 random chars ≈ 8 chars), and the Cloudinary backend may apply
# its own transformations. A name that fits at generate_filename() time can
# therefore still overflow the ImageField's varchar(max_length) after save().
# We require the generated path to be <= (max_length - headroom) so those extra
# characters always fit. 20 comfortably covers the 8-char collision suffix.
COVER_FILENAME_HEADROOM = 20

INTERNAL_LINK_RE = re.compile(r"\]\((/[^)\s]+)\)")


class Command(BaseCommand):
    help = "Dry-run-by-default updater that applies a reviewed manifest to one blog post."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True, help="Slug of the existing post to update.")
        parser.add_argument("--manifest", required=True, help="Path to the reviewed JSON manifest.")
        parser.add_argument("--dry-run", action="store_true", help="Force dry-run (default behaviour).")
        parser.add_argument("--apply", action="store_true", help="Actually write the changes.")
        parser.add_argument("--backup-dir", default=None, help="Directory for the pre-write per-post backup.")
        parser.add_argument(
            "--publish",
            action="store_true",
            help="Allow changing status to 'published' (never happens without this flag).",
        )

    # ---- helpers -------------------------------------------------------------

    def _load_manifest(self, path, slug):
        if not os.path.isfile(path):
            raise CommandError(f"Manifest not found: {path}")
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise CommandError(f"Malformed manifest JSON: {exc}")
        posts = data.get("posts") if isinstance(data, dict) else None
        if not isinstance(posts, dict):
            raise CommandError("Manifest must be an object with a 'posts' mapping.")
        if slug not in posts:
            raise CommandError(f"Slug '{slug}' is not present in the manifest.")
        entry = posts[slug]
        if not isinstance(entry, dict):
            raise CommandError(f"Manifest entry for '{slug}' must be an object.")
        return entry

    def _validate(self, slug, entry):
        errors = []

        # Slug is preserved by default: a differing slug in the manifest is rejected.
        if "slug" in entry and entry["slug"] != slug:
            errors.append(
                f"Manifest slug '{entry['slug']}' differs from '{slug}'. Slug changes are not "
                "allowed by this command (would require a 301 redirect workflow)."
            )

        for field in REQUIRED_TEXT_FIELDS:
            val = entry.get(field)
            if not isinstance(val, str) or not val.strip():
                errors.append(f"Missing or empty required field: {field}")

        # Reject unresolved source markers anywhere in the text fields.
        for field in REQUIRED_TEXT_FIELDS + ["cover_alt"]:
            val = entry.get(field)
            if isinstance(val, str) and MARKER.lower() in val.lower():
                errors.append(f"Field '{field}' still contains {MARKER}.")

        # Reject known typos / banned terms anywhere in the text fields.
        for field in REQUIRED_TEXT_FIELDS + ["cover_alt"]:
            val = entry.get(field)
            if isinstance(val, str):
                low = val.lower()
                for term in BANNED_TERMS:
                    if term in low:
                        errors.append(f"Field '{field}' contains banned term/typo: {term!r}.")

        # Length limits (mirror the model).
        for field, limit in MAX_LEN.items():
            val = entry.get(field)
            if isinstance(val, str) and len(val) > limit:
                errors.append(f"Field '{field}' is {len(val)} chars, exceeds {limit}.")

        # Tags: list of non-empty strings, no duplicates after normalisation.
        tags = entry.get("tags")
        if tags is not None:
            if not isinstance(tags, list) or not all(isinstance(t, str) and t.strip() for t in tags):
                errors.append("'tags' must be a list of non-empty strings.")
            else:
                lowered = [t.strip().lower() for t in tags]
                if len(set(lowered)) != len(lowered):
                    errors.append("'tags' contains duplicate values (case-insensitive).")

        # Image + alt: if a cover image change is requested, both file and alt are required.
        # This runs BEFORE any file is opened or uploaded (see handle(): _validate() is
        # called before the atomic apply block that performs storage.save()).
        cover = entry.get("cover_image")
        if cover:
            path = cover if os.path.isabs(cover) else os.path.join(settings.BASE_DIR, cover)
            if not os.path.isfile(path):
                errors.append(f"cover_image file not found: {cover}")
            if not (entry.get("cover_alt") or "").strip():
                errors.append("cover_image change requested but cover_alt is missing/empty.")

            # Storage-path headroom: use the ImageField's own generate_filename logic and
            # require the generated path to leave headroom for storage-generated suffixes.
            field = Post._meta.get_field("cover_image")
            generated = field.generate_filename(None, os.path.basename(path))
            limit = field.max_length - COVER_FILENAME_HEADROOM
            if len(generated) > limit:
                errors.append(
                    f"cover_image storage path lacks safe headroom: generated '{generated}' is "
                    f"{len(generated)} chars, but must be <= {limit} "
                    f"(max_length {field.max_length} minus {COVER_FILENAME_HEADROOM} reserved for "
                    f"storage-generated uniqueness suffixes like '_XXXXXXX' or backend transformations). "
                    f"Use a shorter cover filename."
                )

        # Internal links: manifest-declared links must appear in the body, and every
        # internal link in the body must resolve to a known route or an existing post.
        body = entry.get("body") or ""
        declared = entry.get("internal_links") or []
        for link in declared:
            if link not in body:
                errors.append(f"Declared internal link not found in body: {link}")
        for link in set(INTERNAL_LINK_RE.findall(body)):
            base = link.split("#")[0].rstrip("/") or "/"
            if base.startswith("/post/"):
                target = base[len("/post/"):]
                if not Post.objects.filter(slug=target).exists():
                    errors.append(f"Internal /post/ link targets a non-existent slug: {link}")
            elif base not in KNOWN_ROUTES and link not in KNOWN_ROUTES:
                errors.append(f"Internal link is not a known route or post: {link}")

        # Status / publish guard.
        new_status = entry.get("status")
        if new_status and new_status not in dict(Post.STATUS_CHOICES):
            errors.append(f"Invalid status: {new_status}")

        if errors:
            raise CommandError("Validation failed:\n  - " + "\n  - ".join(errors))

    def _dedupe_tags(self, tags):
        seen, out = set(), []
        for t in tags:
            key = t.strip().lower()
            if key not in seen:
                seen.add(key)
                out.append(t.strip())
        return out

    def _snapshot(self, post):
        return {
            "id": post.id,
            "title": post.title,
            "slug": post.slug,
            "status": post.status,
            "author": post.author.get_username() if post.author_id else None,
            "excerpt": post.excerpt,
            "body": post.body,
            "seo_title": post.seo_title,
            "seo_description": post.seo_description,
            "cover_image": post.cover_image.name if post.cover_image else None,
            "cover_alt": post.cover_alt,
            "tags": sorted(post.tags.names()),
            "reading_minutes": post.reading_minutes,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        }

    def _print_diff(self, post, entry, publish):
        self.stdout.write(self.style.MIGRATE_HEADING(f"\nField diff for '{post.slug}':"))
        simple = ["title", "excerpt", "seo_title", "seo_description", "cover_alt"]
        for field in simple:
            if field in entry and entry[field] is not None:
                old = getattr(post, field) or ""
                new = entry[field]
                if old != new:
                    self.stdout.write(f"  {field}:")
                    self.stdout.write(f"    - old: {old!r}")
                    self.stdout.write(f"    + new: {new!r}")
                else:
                    self.stdout.write(f"  {field}: (unchanged)")
        if "body" in entry:
            old_len, new_len = len(post.body or ""), len(entry["body"])
            self.stdout.write(f"  body: {old_len} -> {new_len} chars ({'CHANGED' if post.body != entry['body'] else 'unchanged'})")
        if "tags" in entry and entry["tags"] is not None:
            old_tags = sorted(post.tags.names())
            new_tags = self._dedupe_tags(entry["tags"])
            self.stdout.write(f"  tags: {old_tags} -> {new_tags}")
        if entry.get("cover_image"):
            self.stdout.write(f"  cover_image: {post.cover_image.name or None!r} -> upload {entry['cover_image']!r}")
        # Always-preserved fields, shown for reassurance.
        self.stdout.write(self.style.WARNING(
            f"  PRESERVED: slug={post.slug!r}, published_at={post.published_at}, "
            f"status={post.status!r}" + ("" if publish else " (status will NOT change)")
        ))

    # ---- main ----------------------------------------------------------------

    def handle(self, *args, **options):
        slug = options["slug"]
        apply_changes = options["apply"] and not options["dry_run"]
        mode = "APPLY" if apply_changes else "DRY-RUN"
        now = datetime.now(timezone.utc)
        logger.info("seo_update_posts %s slug=%s at=%s", mode, slug, now.isoformat())
        self.stdout.write(self.style.MIGRATE_HEADING(f"seo_update_posts [{mode}] slug={slug}"))

        entry = self._load_manifest(options["manifest"], slug)

        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise CommandError(f"No post with slug '{slug}' exists. Aborting (no changes).")

        self._validate(slug, entry)
        self.stdout.write(self.style.SUCCESS("Validation passed (no [SOURCE REQUIRED], fields OK, links resolve)."))
        self._print_diff(post, entry, options["publish"])

        if not apply_changes:
            self.stdout.write(self.style.SUCCESS(
                "\nDRY-RUN complete. No database changes were made. Re-run with --apply to write."
            ))
            return

        # ---- APPLY (atomic) ----
        backup_dir = options["backup_dir"] or os.path.join(
            settings.BASE_DIR, "research", "seo", "production-backups", "command-backups"
        )
        os.makedirs(backup_dir, exist_ok=True)
        stamp = now.strftime("%Y%m%dT%H%M%SZ")
        backup_path = os.path.join(backup_dir, f"{slug}_{stamp}.json")

        try:
            with transaction.atomic():
                # Per-post backup BEFORE mutation.
                with open(backup_path, "w", encoding="utf-8") as fh:
                    json.dump(self._snapshot(post), fh, ensure_ascii=False, indent=2)

                for field in ["title", "excerpt", "seo_title", "seo_description", "cover_alt"]:
                    if field in entry and entry[field] is not None:
                        setattr(post, field, entry[field])
                if "body" in entry:
                    post.body = entry["body"]

                # Status only changes with explicit --publish; published_at never touched here.
                if options["publish"] and entry.get("status"):
                    post.status = entry["status"]

                if entry.get("cover_image"):
                    cover = entry["cover_image"]
                    path = cover if os.path.isabs(cover) else os.path.join(settings.BASE_DIR, cover)
                    with open(path, "rb") as img:
                        post.cover_image.save(os.path.basename(path), File(img), save=False)

                # Model-level validation before persisting (mirrors admin ModelForm).
                post.full_clean(exclude=["slug", "author"])
                post.save()

                if entry.get("tags") is not None:
                    post.tags.set(self._dedupe_tags(entry["tags"]))

            logger.info("seo_update_posts APPLIED slug=%s backup=%s", slug, backup_path)
            self.stdout.write(self.style.SUCCESS(f"\nAPPLIED. Pre-write backup: {backup_path}"))
            self.stdout.write(self.style.SUCCESS(f"post.updated_at is now {post.updated_at.isoformat()}"))
        except ValidationError as exc:
            raise CommandError(f"Model validation failed, transaction rolled back: {exc.messages}")
        except Exception as exc:  # noqa: BLE001 - surface and roll back any failure
            raise CommandError(f"Error during apply, transaction rolled back: {exc}")
