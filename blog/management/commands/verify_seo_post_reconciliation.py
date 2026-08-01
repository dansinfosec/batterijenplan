"""
verify_seo_post_reconciliation — READ-ONLY comparison of the live DB `Post.body`
against a proposed reconciled manifest body. Detects content loss before any apply.

Guarantees: never saves/mutates a post, never opens or uploads cover images, never
changes tags, never updates timestamps. It only reads (Post.objects.get + file read)
and prints a report. Exits non-zero (CommandError) on any integrity failure.

Usage:
    python manage.py verify_seo_post_reconciliation --slug <slug> --manifest <path>
"""
from __future__ import annotations

import difflib
import json
import os
import re

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from blog.models import Post
import markdown

MARKER = "[SOURCE REQUIRED]"
BANNED_TERMS = ["zonovershot"]
COVER_HEADROOM = 20
# Guaranteed-claim patterns (a real assertion, not the negated "geen gegarandeerde …").
GUARANTEE_RE = re.compile(r'(?<!geen )gegarandeerd[e]?\s+(besparing|rendement|terugverdientijd|opbrengst|winst)', re.I)

# Required research elements per slug: (label, test) where test(body_lower) -> bool present.
def _has(*subs):
    return lambda b: all(s in b for s in subs)
def _any(*subs):
    return lambda b: any(s in b for s in subs)

REQUIRED = {
    "wat-levert-een-thuisbatterij-op": [
        ("135 simulations", _has("135")),
        ("25 profiles", lambda b: bool(re.search(r'25\s+(profiel|huishoud|combinaties)', b))),
        ("21 suppliers", lambda b: bool(re.search(r'21\s+(leverancier|energ)', b))),
        ("300+ installations", _has("300")),
        ("Zonneplan fleet validation", _has("zonneplan", "267")),
        ("Groene Vrienden practice example", _has("groene vrienden", "praktijkvoorbeeld")),
        ("methodology", _any("hoe wij dit onderzocht", "dispatch", "methode")),
        ("limitations", _has("beperkingen")),
        ("source register", _any("verantwoording en bronnen", "bronnen")),
        ("partnership disclosure", _has("werkt samen", "groene vrienden")),
        ("no guaranteed returns", _has("geen gegarandeerde")),
    ],
    "energieprijzen-stijgen-thuisbatterij-voordeel-2027": [
        ("salderingsregeling context", _any("salderingsregeling", "salderen")),
        ("1 January 2027", _has("1 januari 2027")),
        ("uncertainty wording", _any("onzeker", "kan wijzigen", "aanname", "onbekend", "niet openbaar")),
        ("sources section", _any("bronnen", "bron")),
    ],
    "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie": [
        ("trading", _has("handel")),
        ("self-consumption", _has("zelfconsumptie")),
        ("decision framework", _any("voor wie", "wanneer", "past bij", "belangrijkste vraag")),
        ("capacity/power/cycle trade-offs", _any("capaciteit", "laadcycli", "vermogen")),
    ],
}
# Sections/markers that must NOT appear (would mean duplicating the pillar's heavy analysis).
FORBIDDEN_IN = {
    "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie":
        [("full pillar duplication", _any("135 simulaties", "opbrengstmatrix", "21 leveranciers vergeleken"))],
}


class Command(BaseCommand):
    help = "READ-ONLY: verify a reconciled manifest body against the live DB post body (content-loss check)."

    def add_arguments(self, parser):
        parser.add_argument("--slug", required=True)
        parser.add_argument("--manifest", required=True)
        parser.add_argument("--allow-removed", default="",
                            help="Comma-separated H2 titles that are approved to be removed.")

    # --- helpers (all pure/read-only) ---
    def _h2(self, b): return re.findall(r'^##[ \t]+(\S.*?)\s*$', b, re.M)
    def _h3(self, b): return re.findall(r'^###[ \t]+(\S.*?)\s*$', b, re.M)
    def _tables(self, b): return len(re.findall(r'^\s*\|[\s:\-|]+\|\s*$', b, re.M))
    def _internal(self, b): return sorted(set(re.findall(r'\]\((/[^)\s]+)\)', b)))
    def _external(self, b): return sorted(set(re.findall(r'\]\((https?://[^)\s]+)\)', b)))
    def _calc(self, b): return len(re.findall(r'\]\(/calculator', b))
    def _render(self, b):
        html = markdown.markdown(b or "", extensions=["fenced_code", "tables", "nl2br"])
        return re.sub(r'\s+', ' ', html).strip()

    def handle(self, *args, **o):
        slug = o["slug"]
        allow_removed = {s.strip() for s in o["allow_removed"].split(",") if s.strip()}

        # READ manifest
        if not os.path.isfile(o["manifest"]):
            raise CommandError(f"Manifest not found: {o['manifest']}")
        try:
            posts = json.load(open(o["manifest"], encoding="utf-8")).get("posts", {})
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise CommandError(f"Malformed manifest JSON: {e}")
        if slug not in posts:
            raise CommandError(f"Slug '{slug}' not in manifest.")
        prop = posts[slug]
        pbody = prop.get("body") or ""

        # READ db (read-only)
        try:
            post = Post.objects.get(slug=slug)
        except Post.DoesNotExist:
            raise CommandError(f"No DB post with slug '{slug}' (run this in the environment that has the post).")
        dbody = post.body or ""

        errors = []
        self.stdout.write(self.style.MIGRATE_HEADING(f"verify_seo_post_reconciliation [READ-ONLY] slug={slug}"))

        # counts
        self.stdout.write(f"  raw chars:  db={len(dbody)}  proposed={len(pbody)}")
        self.stdout.write(f"  raw words:  db={len(dbody.split())}  proposed={len(pbody.split())}")
        dh2, ph2 = self._h2(dbody), self._h2(pbody)
        self.stdout.write(f"  H2: db={len(dh2)} proposed={len(ph2)} | H3: db={len(self._h3(dbody))} proposed={len(self._h3(pbody))}")
        self.stdout.write(f"  markdown tables: db={self._tables(dbody)} proposed={self._tables(pbody)}")
        self.stdout.write(f"  internal links (proposed): {self._internal(pbody)}")
        self.stdout.write(f"  external links (proposed): {self._external(pbody)}")
        self.stdout.write(f"  calculator links (proposed): {self._calc(pbody)}")

        # research-phrase occurrence counts
        for label, _ in REQUIRED.get(slug, []):
            pass
        phrases = ["135", "300", "Zonneplan", "Groene Vrienden", "mijnbatterij", "salderingsregeling",
                   "1 januari 2027", "zelfconsumptie", "handel", "beperkingen"]
        occ = {p: (dbody.lower().count(p.lower()), pbody.lower().count(p.lower())) for p in phrases}
        self.stdout.write(f"  phrase occurrences (db, proposed): " +
                          ", ".join(f"{p}={d}/{pp}" for p, (d, pp) in occ.items() if d or pp))

        # equality
        self.stdout.write(f"  exact raw equality: {dbody == pbody}")
        self.stdout.write(f"  normalized rendered-HTML equality: {self._render(dbody) == self._render(pbody)}")

        # section deltas
        only_prod = [h for h in dh2 if h not in ph2]
        only_manifest = [h for h in ph2 if h not in dh2]
        self.stdout.write(f"  sections only in production: {only_prod or 'none'}")
        self.stdout.write(f"  sections only in manifest: {only_manifest or 'none'}")

        # unified diff summary
        diff = list(difflib.unified_diff(dbody.splitlines(), pbody.splitlines(), lineterm="", n=0))
        added = sum(1 for l in diff if l.startswith("+") and not l.startswith("+++"))
        removed = sum(1 for l in diff if l.startswith("-") and not l.startswith("---"))
        self.stdout.write(f"  diff summary: +{added} / -{removed} lines")

        # --- integrity failures (exit non-zero) ---
        for h in only_prod:
            if h not in allow_removed:
                errors.append(f"Production section removed without approval: '{h}'")
        for label, test in REQUIRED.get(slug, []):
            if not test(pbody.lower()):
                errors.append(f"Required research element missing: {label}")
        for label, test in FORBIDDEN_IN.get(slug, []):
            if test(pbody.lower()):
                errors.append(f"Forbidden content present ({label}) — would duplicate the pillar.")
        if MARKER.lower() in pbody.lower():
            errors.append(f"{MARKER} present in proposed body.")
        for t in BANNED_TERMS:
            if t in pbody.lower():
                errors.append(f"Banned term/typo present: {t!r}.")
        if GUARANTEE_RE.search(pbody):
            errors.append("Guaranteed savings/return/payback/tariff claim present.")
        if prop.get("slug", slug) != post.slug:
            errors.append("Manifest would change the slug.")
        if prop.get("status") not in (None, post.status):
            errors.append("Manifest would change the status.")
        if prop.get("published_at") not in (None, post.published_at.isoformat() if post.published_at else None):
            errors.append("Manifest would change published_at.")
        cover = prop.get("cover_image")
        if cover:
            field = Post._meta.get_field("cover_image")
            gen = field.generate_filename(None, os.path.basename(cover))
            if len(gen) > field.max_length - COVER_HEADROOM:
                errors.append(f"Cover storage path too long ({len(gen)} > {field.max_length - COVER_HEADROOM}): {gen}")

        if errors:
            self.stdout.write(self.style.ERROR("\nFAIL:\n  - " + "\n  - ".join(errors)))
            raise CommandError(f"Reconciliation verification FAILED for '{slug}' ({len(errors)} issue(s)).")
        self.stdout.write(self.style.SUCCESS("\nPASS — no content loss; all required elements present; read-only."))
