"""
seo_release_v2 - guarded, dry-run-by-default V2 release for a single blog post.

Two modes (from the manifest 'mode' field):
  - full_body    : replace the body with an approved editorial V2 body.
  - visual_patch : insert approved images at exact-once anchors; body text otherwise unchanged.

Hard guards (NEVER warning-only - every mismatch aborts before the write or rolls back after):
  1. Pre-write: current body chars, SHA-256, H2, H3, table counts, status and published_at
     MUST equal the manifest 'precondition'. Otherwise CommandError (no write).
  2. full_body : the proposed body's SHA/structure must match the manifest 'proposed' block.
     visual_patch : every anchor must occur EXACTLY once; the patched body must keep H2/H3/table
     counts and contain all required image URLs.
  3. A full JSON backup is written before any mutation.
  4. The write runs in one atomic transaction; after save the post is reloaded and the final
     SHA-256 + structure are re-verified. Any difference raises and rolls the transaction back.
  5. slug, status, published_at and the cover are always preserved.

Usage:
    python manage.py seo_release_v2 --slug <slug> --manifest <path>            # dry-run (default)
    python manage.py seo_release_v2 --slug <slug> --manifest <path> --apply    # write
"""
from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from blog.models import Post


def body_sha(body: str) -> str:
    return hashlib.sha256((body or "").encode("utf-8")).hexdigest()


def body_struct(body: str) -> dict:
    """Count H2/H3/tables in a body that may be Markdown, HTML, or a mix.

    A given heading/table is written in exactly ONE syntax, so summing the
    Markdown and HTML patterns (which match disjoint text) never double-counts.
    - Markdown: line-anchored '## ' / '### ' (multiline) and table separator rows.
      '## ' does not match '### ' (the third char is '#', not a space), so H3 is
      never counted as H2.
    - HTML: <h2 ...> / <h3 ...> / <table ...>, case-insensitive, attributes allowed.
      '<h2' does not match '<h3' or '<h20', so H3/other tags are never counted as H2.
    """
    b = body or ""
    md_h2 = re.findall(r"(?m)^## ", b)
    md_h3 = re.findall(r"(?m)^### ", b)
    md_tables = re.findall(r"(?m)^\|[ :|-]*-[ :|-]*\|\s*$", b)
    html_h2 = re.findall(r"(?i)<h2(?:\s[^>]*)?>", b)
    html_h3 = re.findall(r"(?i)<h3(?:\s[^>]*)?>", b)
    html_tables = re.findall(r"(?i)<table(?:\s[^>]*)?>", b)
    return {
        "chars": len(b),
        "sha256": body_sha(b),
        "h2": len(md_h2) + len(html_h2),
        "h3": len(md_h3) + len(html_h3),
        "tables": len(md_tables) + len(html_tables),
    }


def lint_body(body: str) -> list:
    """Return a list of presentation defects (empty = clean). Article prose must not render as code."""
    b = body or ""
    issues = []
    if "```" in b:
        issues.append("fenced_code")
    if re.search(r"(?i)<pre\b|<code\b", b):
        issues.append("pre_code")
    if re.search(r"(?m)^ {4,}\S", b):
        issues.append("indented_prose")          # 4-space indent -> Markdown code block
    if re.search(r"(?m)^ {8,}\S", b):
        issues.append("giant_preformatted")      # deep indent -> giant ASCII/code block
    return issues


class Command(BaseCommand):
    help = "Guarded, dry-run-by-default V2 release (full_body, visual_patch or cover_only) for one post."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--manifest", required=True)
        parser.add_argument("--apply", action="store_true", help="Actually write (default is dry-run).")
        parser.add_argument("--dry-run", action="store_true", help="Force dry-run.")
        parser.add_argument("--backup-dir", default=None)

    # ---- helpers ----
    def _load(self, path, slug):
        if not os.path.isfile(path):
            raise CommandError(f"Manifest not found: {path}")
        try:
            data = json.load(open(path, encoding="utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise CommandError(f"Malformed manifest JSON: {exc}")
        if data.get("slug") != slug:
            raise CommandError(f"Manifest slug {data.get('slug')!r} != --slug {slug!r}.")
        if data.get("mode") not in ("full_body", "visual_patch", "cover_only"):
            raise CommandError("Manifest 'mode' must be 'full_body', 'visual_patch' or 'cover_only'.")
        return data

    def _check_precondition(self, post, pre):
        cur = body_struct(post.body)
        errs = []
        for k in ("chars", "sha256", "h2", "h3", "tables"):
            if k in pre and cur[k] != pre[k]:
                errs.append(f"current {k}={cur[k]} != precondition {k}={pre[k]}")
        if "status" in pre and post.status != pre["status"]:
            errs.append(f"current status={post.status!r} != {pre['status']!r}")
        if "published_at" in pre:
            want = parse_datetime(pre["published_at"])
            if post.published_at != want:
                errs.append(f"current published_at={post.published_at} != {want}")
        if errs:
            raise CommandError("PRECONDITION MISMATCH (no write):\n  - " + "\n  - ".join(errs))
        return cur

    def _build_final(self, post, data):
        if data["mode"] == "full_body":
            prop = data["proposed"]
            final = prop["body"]
            st = body_struct(final)
            if st["sha256"] != prop["sha256"]:
                raise CommandError(f"proposed body SHA mismatch: computed {st['sha256']} != manifest {prop['sha256']}")
            for k in ("chars", "h2", "h3", "tables"):
                if k in prop and st[k] != prop[k]:
                    raise CommandError(f"proposed {k}={st[k]} != manifest {prop[k]}")
            return final, prop["sha256"]
        # visual_patch
        base = post.body
        anchors = data["anchors"]
        for a in anchors:
            n = base.count(a["anchor"])
            if n == 0:
                raise CommandError(f"MISSING anchor (no write): {a['anchor']!r}")
            if n > 1:
                raise CommandError(f"DUPLICATE anchor (no write, occurs {n}x): {a['anchor']!r}")
        final = base
        for a in anchors:
            pos = final.find(a["anchor"])
            eol = final.find("\n", pos)
            eol = len(final) if eol == -1 else eol
            final = final[:eol] + a["insertion"] + final[eol:]
        inv = data.get("invariants", {})
        st = body_struct(final)
        for want_key, cur_key in (("final_h2", "h2"), ("final_h3", "h3"), ("final_tables", "tables")):
            if want_key in inv and st[cur_key] != inv[want_key]:
                raise CommandError(f"post-patch {cur_key}={st[cur_key]} != required {inv[want_key]}")
        for url in inv.get("must_contain_urls", []):
            if url not in final:
                raise CommandError(f"patched body is missing required image URL: {url}")
        return final, st["sha256"]

    def _snapshot(self, post):
        return {
            "id": post.id, "title": post.title, "slug": post.slug, "status": post.status,
            "body": post.body, "excerpt": post.excerpt, "seo_title": post.seo_title,
            "seo_description": post.seo_description,
            "cover_image": post.cover_image.name if post.cover_image else None, "cover_alt": post.cover_alt,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "body_sha256": body_sha(post.body),
        }

    def _cover_only(self, post, data, apply, o):
        """preserve_body cover upload via the existing Cloudinary cover_image workflow."""
        cov = data["cover"]
        src = cov["cover_source"]
        src_path = src if os.path.isabs(src) else os.path.join(settings.BASE_DIR, src)
        if not os.path.isfile(src_path):
            raise CommandError(f"cover_source not found: {src}")
        upload_name = cov["cover_upload_name"]
        if not (cov.get("cover_alt") or "").strip():
            raise CommandError("cover_only requires a non-empty cover_alt.")
        field = Post._meta.get_field("cover_image")
        generated = field.generate_filename(None, upload_name)
        limit = field.max_length - 20
        if len(generated) > limit:
            raise CommandError(f"cover storage path lacks headroom: '{generated}' is {len(generated)} chars > {limit}.")
        pre_sha = body_sha(post.body)
        self.stdout.write(f"  current cover: {post.cover_image.name or None}")
        self.stdout.write(f"  local approved upload source: {src}")
        self.stdout.write(f"  proposed cover filename: {upload_name}")
        self.stdout.write(self.style.WARNING("  body: PRESERVED EXACTLY"))
        self.stdout.write(f"  body SHA-256 (current == required post-write): {pre_sha}")
        if not apply:
            self.stdout.write(self.style.SUCCESS("\nDRY-RUN complete. No database changes. Re-run with --apply to write."))
            return
        backup_dir = o["backup_dir"] or os.path.join(settings.BASE_DIR, "research", "seo", "production-backups", "release-v2-backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"{post.slug}_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}_cover.json")
        json.dump(self._snapshot(post), open(backup_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        try:
            with transaction.atomic():
                pre_slug, pre_status, pre_pub = post.slug, post.status, post.published_at
                with open(src_path, "rb") as fh:
                    post.cover_image.save(upload_name, File(fh), save=False)
                if cov.get("cover_alt"):
                    post.cover_alt = cov["cover_alt"]
                post.full_clean(exclude=["slug", "author"])
                post.save()
                post.refresh_from_db()
                errs = []
                if body_sha(post.body) != pre_sha:
                    errs.append(f"body SHA changed {pre_sha[:16]} -> {body_sha(post.body)[:16]}")
                if post.slug != pre_slug: errs.append("slug changed")
                if post.status != pre_status: errs.append("status changed")
                if post.published_at != pre_pub: errs.append("published_at changed")
                if errs:
                    raise CommandError("COVER-ONLY VERIFICATION FAILED (rolling back):\n  - " + "\n  - ".join(errs))
        except Exception as exc:
            raise CommandError(f"Cover release aborted, transaction rolled back: {exc}")
        self.stdout.write(self.style.SUCCESS(f"\nAPPLIED cover. Backup: {backup_path}"))
        self.stdout.write(self.style.SUCCESS(f"new cover: {post.cover_image.name}; body PRESERVED (sha {pre_sha} unchanged)."))

    # ---- main ----
    def handle(self, *args, **o):
        slug = o["slug"]
        apply = o["apply"] and not o["dry_run"]
        mode_txt = "APPLY" if apply else "DRY-RUN"
        data = self._load(o["manifest"], slug)
        self.stdout.write(self.style.MIGRATE_HEADING(f"seo_release_v2 [{mode_txt}] slug={slug} mode={data['mode']}"))
        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise CommandError(f"No post with slug '{slug}'. Aborting.")

        cur = self._check_precondition(post, data["precondition"])
        self.stdout.write(self.style.SUCCESS(
            f"Precondition OK: {cur['chars']} chars, sha {cur['sha256'][:16]}, {cur['h2']}H2/{cur['h3']}H3/{cur['tables']}tbl"))
        if data["mode"] == "cover_only":
            return self._cover_only(post, data, apply, o)
        final, expected_sha = self._build_final(post, data)
        fst = body_struct(final)
        self.stdout.write(f"Proposed final: {fst['chars']} chars, sha {expected_sha[:16]}, "
                          f"{fst['h2']}H2/{fst['h3']}H3/{fst['tables']}tbl")
        self.stdout.write(self.style.WARNING(
            f"PRESERVED: slug={post.slug!r}, status={post.status!r}, published_at={post.published_at}, cover unchanged"))

        if not apply:
            self.stdout.write(self.style.SUCCESS("\nDRY-RUN complete. No database changes. Re-run with --apply to write."))
            return

        backup_dir = o["backup_dir"] or os.path.join(settings.BASE_DIR, "research", "seo", "production-backups", "release-v2-backups")
        os.makedirs(backup_dir, exist_ok=True)
        stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        backup_path = os.path.join(backup_dir, f"{slug}_{stamp}.json")
        json.dump(self._snapshot(post), open(backup_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

        try:
            with transaction.atomic():
                pre_slug, pre_status, pre_pub = post.slug, post.status, post.published_at
                if data["mode"] == "full_body":
                    prop = data["proposed"]
                    for f in ("title", "excerpt", "seo_title", "seo_description"):
                        if prop.get(f) is not None:
                            setattr(post, f, prop[f])
                post.body = final
                post.full_clean(exclude=["slug", "author"])
                post.save()
                post.refresh_from_db()
                # post-write verification
                errs = []
                if body_sha(post.body) != expected_sha:
                    errs.append(f"final body SHA {body_sha(post.body)[:16]} != expected {expected_sha[:16]}")
                st = body_struct(post.body)
                for k in ("h2", "h3", "tables"):
                    if fst[k] != st[k]:
                        errs.append(f"post-write {k}={st[k]} != {fst[k]}")
                if post.slug != pre_slug: errs.append("slug changed")
                if post.status != pre_status: errs.append("status changed")
                if post.published_at != pre_pub: errs.append("published_at changed")
                if errs:
                    raise CommandError("POST-WRITE VERIFICATION FAILED (rolling back):\n  - " + "\n  - ".join(errs))
        except Exception as exc:
            raise CommandError(f"Release aborted, transaction rolled back: {exc}")

        self.stdout.write(self.style.SUCCESS(f"\nAPPLIED. Backup: {backup_path}"))
        self.stdout.write(self.style.SUCCESS(f"final body sha {expected_sha} verified; slug/status/published_at preserved."))
