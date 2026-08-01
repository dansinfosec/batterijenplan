"""
verify_seo_post_reconciliation - READ-ONLY safety check comparing the live DB
`Post.body` against a proposed manifest, to decide whether a change is safe.

It never saves/mutates a post, never opens or uploads cover images, never changes
tags, never updates timestamps. It only reads (Post.objects.get + file read).

Verdict:
- METADATA-ONLY manifests (preserve_body:true / no body): body is untouched, so
  no content-loss risk - verify metadata only and PASS if clean.
- FULL-BODY manifests: BLOCK. Production `Post.body` is stored as rendered HTML,
  while proposed bodies are Markdown - the two are incompatible representations,
  so a section/heading comparison cannot guarantee no content loss, and a
  wholesale replacement would silently drop characters. These are refused until an
  exact raw-Markdown anchor-patch workflow exists.

Exits non-zero (CommandError) on any BLOCK or integrity failure.
"""
from __future__ import annotations

import difflib
import json
import os
import re

from django.core.management.base import BaseCommand, CommandError

from blog.models import Post
import markdown

MARKER = "[SOURCE REQUIRED]"
BANNED_TERMS = ["zonovershot"]
COVER_HEADROOM = 20
MATERIAL_SHORTER = 0.95  # proposed shorter than 95% of current = material loss
GUARANTEE_RE = re.compile(r'(?<!geen )gegarandeerd[e]?\s+(besparing|rendement|terugverdientijd|opbrengst|winst)', re.I)
HTML_TAG_RE = re.compile(r'</?(h[1-6]|p|table|thead|tbody|tr|t[dh]|ul|ol|li|div|strong|em|a|blockquote)\b', re.I)
MD_SIGNAL_RE = re.compile(r'(?:^|\n)#{2,6}\s|\]\((?:/|https?://)|\|\s*-{3,}')


class Command(BaseCommand):
    help = "READ-ONLY: verify a manifest against the live DB post; BLOCK unsafe full-body replacements."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--manifest", required=True)
        parser.add_argument("--approved-patch-list", default="",
                            help="Path to an approved exact-anchor patch list (enables full-body review).")

    # pure/read-only helpers
    def _h2(self, b): return re.findall(r'^##[ \t]+(\S.*?)\s*$', b, re.M)
    def _h3(self, b): return re.findall(r'^###[ \t]+(\S.*?)\s*$', b, re.M)
    def _tables_md(self, b): return len(re.findall(r'^\s*\|[\s:\-|]+\|\s*$', b, re.M))
    def _tables_html(self, b): return len(re.findall(r'<table\b', b, re.I))
    def _internal(self, b): return sorted(set(re.findall(r'\]\((/[^)\s]+)\)', b)))
    def _external(self, b): return sorted(set(re.findall(r'\]\((https?://[^)\s]+)\)', b)))
    def _calc(self, b): return len(re.findall(r'\]\(/calculator', b))
    def _render(self, b):
        return re.sub(r'\s+', ' ', markdown.markdown(b or "", extensions=["fenced_code", "tables", "nl2br"])).strip()

    def handle(self, *args, **o):
        slug = o["slug"]
        if not os.path.isfile(o["manifest"]):
            raise CommandError(f"Manifest not found: {o['manifest']}")
        try:
            posts = json.load(open(o["manifest"], encoding="utf-8")).get("posts", {})
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise CommandError(f"Malformed manifest JSON: {e}")
        if slug not in posts:
            raise CommandError(f"Slug '{slug}' not in manifest.")
        prop = posts[slug]
        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise CommandError(f"No DB post with slug '{slug}'.")
        dbody = post.body or ""

        self.stdout.write(self.style.MIGRATE_HEADING(f"verify_seo_post_reconciliation [READ-ONLY] slug={slug}"))
        metadata_only = prop.get("preserve_body") is True or not prop.get("body")

        # --- shared metadata integrity checks (both modes) ---
        errors = []
        if prop.get("slug", slug) != post.slug:
            errors.append("Manifest would change the slug.")
        if prop.get("status") not in (None, post.status):
            errors.append("Manifest would change the status.")
        pub = post.published_at.isoformat() if post.published_at else None
        if prop.get("published_at") not in (None, pub):
            errors.append("Manifest would change published_at.")
        for f in ("title", "excerpt", "seo_title", "seo_description", "cover_alt"):
            v = prop.get(f)
            if isinstance(v, str):
                if MARKER.lower() in v.lower():
                    errors.append(f"{MARKER} present in field '{f}'.")
                for t in BANNED_TERMS:
                    if t in v.lower():
                        errors.append(f"Banned term {t!r} in field '{f}'.")
        cover = prop.get("cover_image")
        if cover:
            field = Post._meta.get_field("cover_image")
            gen = field.generate_filename(None, os.path.basename(cover))
            if len(gen) > field.max_length - COVER_HEADROOM:
                errors.append(f"Cover storage path too long ({len(gen)} > {field.max_length - COVER_HEADROOM}).")

        if metadata_only:
            self.stdout.write("  mode: METADATA-ONLY (preserve_body) - body is not changed")
            self.stdout.write(f"  body: PRESERVED EXACTLY (db chars={len(dbody)})")
            self.stdout.write("  body comparison: N/A (no replacement proposed)")
            if errors:
                self.stdout.write(self.style.ERROR("\nFAIL:\n  - " + "\n  - ".join(errors)))
                raise CommandError(f"Metadata-only verification FAILED for '{slug}'.")
            self.stdout.write(self.style.SUCCESS("\nPASS - metadata-only; body untouched; read-only."))
            return

        # --- FULL-BODY manifest: report + BLOCK ---
        pbody = prop.get("body") or ""
        db_is_html = bool(HTML_TAG_RE.search(dbody))
        proposed_is_md = bool(MD_SIGNAL_RE.search(pbody))
        exact_equal = dbody == pbody
        rendered_equal = self._render(dbody) == self._render(pbody)
        self.stdout.write(f"  raw chars: db={len(dbody)} proposed={len(pbody)} (delta {len(pbody)-len(dbody)})")
        self.stdout.write(f"  db looks like HTML: {db_is_html} | proposed looks like Markdown: {proposed_is_md}")
        self.stdout.write(f"  db H2(md)={len(self._h2(dbody))} tables(md)={self._tables_md(dbody)} tables(html)={self._tables_html(dbody)}")
        self.stdout.write(f"  proposed H2(md)={len(self._h2(pbody))} tables(md)={self._tables_md(pbody)}")
        self.stdout.write(f"  exact raw equality: {exact_equal} | normalized rendered equality: {rendered_equal}")
        diff = list(difflib.unified_diff(dbody.splitlines(), pbody.splitlines(), lineterm="", n=0))
        self.stdout.write(f"  diff summary: +{sum(1 for l in diff if l[:1]=='+' and l[:3]!='+++')} / "
                          f"-{sum(1 for l in diff if l[:1]=='-' and l[:3]!='---')} lines")

        approved_patch = bool(o["approved_patch_list"]) and os.path.isfile(o["approved_patch_list"])
        blocked = []
        incompatible = (db_is_html and proposed_is_md) or (proposed_is_md and not db_is_html and len(self._h2(dbody)) == 0 and len(dbody) > 500)
        if incompatible:
            blocked.append("incompatible body representations (DB stored as HTML, proposed is Markdown) - "
                           "heading/table comparison cannot guarantee no content loss")
        if not exact_equal and not approved_patch:
            blocked.append("complete body replacement proposed (raw bodies not equal) - not allowed without an "
                           "approved exact-anchor patch list")
        if not rendered_equal and not approved_patch:
            blocked.append("normalized rendered HTML not equal and no approved patch list")
        if len(pbody) < MATERIAL_SHORTER * len(dbody):
            blocked.append(f"proposed body materially shorter (would remove {len(dbody)-len(pbody)} characters)")
        if len(self._h2(dbody)) == 0 and len(dbody) > 500:
            blocked.append("heading extraction on the DB body is unreliable (0 Markdown H2 in a large body) - "
                           "cannot compare sections safely")
        if MARKER.lower() in pbody.lower():
            blocked.append(f"{MARKER} present in proposed body")
        for t in BANNED_TERMS:
            if t in pbody.lower():
                blocked.append(f"banned term {t!r} in proposed body")
        if GUARANTEE_RE.search(pbody):
            blocked.append("guaranteed savings/return/payback claim in proposed body")

        if blocked or errors:
            self.stdout.write(self.style.ERROR("\nBLOCKED - incompatible body representations"))
            for b in blocked + errors:
                self.stdout.write(self.style.ERROR(f"  - {b}"))
            self.stdout.write(self.style.WARNING(
                "  -> Use a metadata-only manifest (preserve_body:true) or an exact raw-Markdown anchor-patch "
                "workflow. Full-body replacement is refused."))
            raise CommandError(f"BLOCKED: full-body replacement for '{slug}' is not safe ({len(blocked)+len(errors)} reason(s)).")

        # Only reachable with an approved patch list AND raw/rendered equality - not used yet.
        self.stdout.write(self.style.SUCCESS("\nPASS - approved patch, representations compatible."))
