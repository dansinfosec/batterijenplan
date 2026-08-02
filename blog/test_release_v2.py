# -*- coding: utf-8 -*-
"""Tests for the guarded V2 release + restore commands (seo_release_v2, seo_restore_post_backup)."""
import json
import os
import tempfile
from datetime import datetime, timezone
from unittest import mock

from django.contrib.auth.models import User
from django.core.files.storage import InMemoryStorage
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from blog.models import Post
from blog.management.commands.seo_release_v2 import body_sha, body_struct, lint_body


class BoomStorage(InMemoryStorage):
    """Storage whose save() always fails — simulates a Cloudinary upload failure."""
    def save(self, *a, **k):
        raise IOError("simulated Cloudinary upload failure")


BOOM_STORAGE = {
    "default": {"BACKEND": "blog.test_release_v2.BoomStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# The 12 READY release slugs (confirmed against the live public API at manifest-generation time).
RELEASE_SLUGS_V1 = [
    "wat-levert-een-thuisbatterij-op",
    "energieprijzen-stijgen-thuisbatterij-voordeel-2027",
    "warmtefonds-thuisbatterij-lening",
    "enphase-vs-dyness",
    "groene-vrienden-vs-zonneplan-vs-tibber",
    "terugverdientijd-thuisbatterij-handel-of-zelfconsumptie",
    "dynamisch-energiecontract-thuisbatterij",
    "elektrische-auto-ems-systeem",
    "ems-systeem-thuisbatterij-controle-over-stroom",
    "thuisbatterij-installatie",
    "stroom-opslaan-zonnepanelen",
    "batterijopslag-woonstichtingen-vve",
]

ART_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                       "research", "seo", "article-drafts",
                       "energieprijzen-stijgen-thuisbatterij-voordeel-2027")
FIXED_BODY_PATH = os.path.join(ART_DIR, "PROPOSED_ARTICLE_FORMAT_FIXED_V3.md")

# In-memory storage so cover_image.save() never touches Cloudinary / the network in tests.
MEM_STORAGE = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

PUB = datetime(2026, 7, 4, 9, 25, 45, tzinfo=timezone.utc)
PUB_STR = "2026-07-04T09:25:45+00:00"
CUR = "## Sectie een\n\nTekst een.\n\n## Sectie twee\n\nTekst twee.\n"
PROP = ("## Nieuw een\n\nZie [wat levert een thuisbatterij op](/post/wat-levert-een-thuisbatterij-op) en de "
        "[calculator](/calculator).\n\n## Nieuw twee\n\n### Sub\n\nMeer.\n")
CUR_VG = "## Vergelijkingschecklist\n\nItems.\n\n## Capaciteit versus vermogen\n\nUitleg.\n"
URL1 = "https://www.batterijenplan.nl/article-visuals/thuisbatterij-vergelijken/wat-moet-u-vergelijken.png"
URL2 = "https://www.batterijenplan.nl/article-visuals/thuisbatterij-vergelijken/capaciteit-versus-vermogen.png"


def write(tmp, obj):
    p = os.path.join(tmp, "m.json")
    json.dump(obj, open(p, "w", encoding="utf-8"), ensure_ascii=False)
    return p


class Base(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.user = User.objects.create(username="tester")

    def mkpost(self, slug, body):
        return Post.objects.create(title=slug, slug=slug, author=self.user, body=body,
                                   status="published", published_at=PUB, seo_title="t", seo_description="d", excerpt="e")

    def precond(self, body, **over):
        s = body_struct(body)
        d = dict(chars=s["chars"], sha256=s["sha256"], h2=s["h2"], h3=s["h3"], tables=s["tables"],
                 status="published", published_at=PUB_STR)
        d.update(over); return d

    def full_manifest(self, slug, cur, prop, pre_over=None, prop_over=None):
        ps = body_struct(prop)
        man = {"schema": "x", "mode": "full_body", "slug": slug,
               "precondition": self.precond(cur, **(pre_over or {})),
               "preserve": {"slug": slug, "status": "published", "published_at": PUB_STR, "cover_change": False},
               "proposed": {"chars": ps["chars"], "sha256": ps["sha256"], "h2": ps["h2"], "h3": ps["h3"],
                            "tables": ps["tables"], "title": "Nieuw", "excerpt": "e2", "seo_title": "s2",
                            "seo_description": "d2", "body": prop}}
        if prop_over: man["proposed"].update(prop_over)
        return write(self.tmp, man)

    def patch_manifest(self, slug, cur, anchors, inv_over=None):
        inv = {"final_h2": body_struct(cur)["h2"], "final_h3": 0, "final_tables": 0,
               "must_contain_urls": [URL1, URL2]}
        if inv_over: inv.update(inv_over)
        man = {"schema": "x", "mode": "visual_patch", "slug": slug,
               "precondition": self.precond(cur),
               "preserve": {"slug": slug, "status": "published", "published_at": PUB_STR, "cover_change": False},
               "invariants": inv, "anchors": anchors}
        return write(self.tmp, man)

    def anchors(self):
        return [{"id": "a1", "anchor": "## Vergelijkingschecklist", "insertion": f"\n\n![alt]({URL1})\n\n*cap*\n"},
                {"id": "a2", "anchor": "## Capaciteit versus vermogen", "insertion": f"\n\n![alt]({URL2})\n\n*cap*\n"}]


class FullBodyGuards(Base):
    def test_pre_hash_mismatch(self):
        self.mkpost("s1", CUR)
        m = self.full_manifest("s1", CUR, PROP, pre_over={"sha256": "0" * 64})
        with self.assertRaises(CommandError):
            call_command("seo_release_v2", "--slug", "s1", "--manifest", m, "--apply")
        self.assertEqual(Post.objects.get(slug="s1").body, CUR)

    def test_pre_length_mismatch(self):
        self.mkpost("s2", CUR)
        m = self.full_manifest("s2", CUR, PROP, pre_over={"chars": 999})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "s2", "--manifest", m)

    def test_pre_h2_mismatch(self):
        self.mkpost("s3", CUR)
        m = self.full_manifest("s3", CUR, PROP, pre_over={"h2": 99})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "s3", "--manifest", m)

    def test_pre_h3_and_table_mismatch(self):
        self.mkpost("s3b", CUR)
        for over in ({"h3": 5}, {"tables": 7}):
            m = self.full_manifest("s3b", CUR, PROP, pre_over=over)
            self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "s3b", "--manifest", m)

    def test_status_and_published_at_mismatch(self):
        self.mkpost("s3c", CUR)
        for over in ({"status": "draft"}, {"published_at": "2020-01-01T00:00:00+00:00"}):
            m = self.full_manifest("s3c", CUR, PROP, pre_over=over)
            self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "s3c", "--manifest", m)

    def test_proposed_hash_mismatch(self):
        self.mkpost("s4", CUR)
        m = self.full_manifest("s4", CUR, PROP, prop_over={"sha256": "1" * 64})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "s4", "--manifest", m)

    def test_apply_success_and_preservation_and_backup(self):
        self.mkpost("s5", CUR)
        bdir = os.path.join(self.tmp, "bk")
        m = self.full_manifest("s5", CUR, PROP)
        call_command("seo_release_v2", "--slug", "s5", "--manifest", m, "--apply", "--backup-dir", bdir)
        p = Post.objects.get(slug="s5")
        self.assertEqual(p.body, PROP)
        self.assertEqual(body_sha(p.body), body_struct(PROP)["sha256"])
        self.assertEqual(p.slug, "s5")
        self.assertEqual(p.status, "published")
        self.assertEqual(p.published_at, PUB)
        self.assertTrue(any(f.endswith(".json") for f in os.listdir(bdir)))

    def test_dry_run_makes_no_change(self):
        self.mkpost("s6", CUR)
        m = self.full_manifest("s6", CUR, PROP)
        call_command("seo_release_v2", "--slug", "s6", "--manifest", m)  # dry-run default
        self.assertEqual(Post.objects.get(slug="s6").body, CUR)


class VisualPatchGuards(Base):
    def test_missing_anchor(self):
        self.mkpost("v1", "## Vergelijkingschecklist\n\nItems.\n")  # second anchor missing
        m = self.patch_manifest("v1", "## Vergelijkingschecklist\n\nItems.\n", self.anchors(),
                                 inv_over={"final_h2": 1})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "v1", "--manifest", m, "--apply")

    def test_duplicate_anchor(self):
        dup = "## Vergelijkingschecklist\n\nA.\n\n## Vergelijkingschecklist\n\nB.\n\n## Capaciteit versus vermogen\n\nC.\n"
        self.mkpost("v2", dup)
        m = self.patch_manifest("v2", dup, self.anchors(), inv_over={"final_h2": 3})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "v2", "--manifest", m, "--apply")
        self.assertEqual(Post.objects.get(slug="v2").body, dup)

    def test_final_structural_invariant_mismatch(self):
        self.mkpost("v3", CUR_VG)
        m = self.patch_manifest("v3", CUR_VG, self.anchors(), inv_over={"final_h2": 99})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "v3", "--manifest", m, "--apply")

    def test_missing_required_url(self):
        self.mkpost("v4", CUR_VG)
        m = self.patch_manifest("v4", CUR_VG, self.anchors(),
                                 inv_over={"must_contain_urls": [URL1, URL2, "https://x/none.png"]})
        self.assertRaises(CommandError, call_command, "seo_release_v2", "--slug", "v4", "--manifest", m, "--apply")

    def test_apply_success_inserts_and_preserves(self):
        self.mkpost("v5", CUR_VG)
        m = self.patch_manifest("v5", CUR_VG, self.anchors())
        call_command("seo_release_v2", "--slug", "v5", "--manifest", m, "--apply", "--backup-dir", os.path.join(self.tmp, "bk"))
        p = Post.objects.get(slug="v5")
        self.assertIn(URL1, p.body)
        self.assertIn(URL2, p.body)
        self.assertEqual(body_struct(p.body)["h2"], 2)  # unchanged
        self.assertEqual(body_struct(p.body)["tables"], 0)
        self.assertEqual(p.slug, "v5")
        self.assertEqual(p.published_at, PUB)


class RestoreCommand(Base):
    def _backup(self, post):
        snap = {"slug": post.slug, "title": post.title, "body": post.body, "excerpt": post.excerpt,
                "seo_title": post.seo_title, "seo_description": post.seo_description, "cover_alt": post.cover_alt,
                "status": post.status, "published_at": post.published_at.isoformat(), "body_sha256": body_sha(post.body)}
        return write(self.tmp, snap)

    def test_restore_dry_run_no_change(self):
        p = self.mkpost("r1", CUR); bk = self._backup(p)
        p.body = "## Gewijzigd\n\nx.\n"; p.save()
        call_command("seo_restore_post_backup", "--slug", "r1", "--backup", bk)  # dry-run
        self.assertEqual(Post.objects.get(slug="r1").body, "## Gewijzigd\n\nx.\n")

    def test_restore_apply_and_hash_verified(self):
        p = self.mkpost("r2", CUR); bk = self._backup(p)
        p.body = "## Gewijzigd\n\nx.\n"; p.save()
        call_command("seo_restore_post_backup", "--slug", "r2", "--backup", bk, "--apply")
        p2 = Post.objects.get(slug="r2")
        self.assertEqual(p2.body, CUR)
        self.assertEqual(body_sha(p2.body), body_struct(CUR)["sha256"])
        self.assertEqual(p2.slug, "r2")
        self.assertEqual(p2.published_at, PUB)

    def test_restore_rejects_tampered_backup(self):
        p = self.mkpost("r3", CUR)
        snap = {"slug": "r3", "body": "## Anders\n\ny.\n", "body_sha256": "0" * 64, "status": "published",
                "published_at": PUB.isoformat()}
        bk = write(self.tmp, snap)
        self.assertRaises(CommandError, call_command, "seo_restore_post_backup", "--slug", "r3", "--backup", bk, "--apply")


class FormatLint(TestCase):
    """lint_body rejects article prose that would render as code blocks / <pre><code>."""

    def test_clean_body_passes(self):
        b = "## Kop\n\nNormale zin.\n\n- item een\n- item twee\n\n| a | b |\n|---|---|\n| 1 | 2 |\n"
        self.assertEqual(lint_body(b), [])

    def test_detects_fenced_code_with_prose(self):
        b = "```\nDit is een lange Nederlandse alinea die per ongeluk als code rendert.\n```\n"
        self.assertIn("fenced_code", lint_body(b))

    def test_detects_four_space_indented_prose(self):
        b = "## Kop\n\n    Deze alinea is met vier spaties ingesprongen en wordt een codeblok.\n"
        self.assertIn("indented_prose", lint_body(b))

    def test_detects_pre_code(self):
        self.assertIn("pre_code", lint_body("<pre><code>rekenvoorbeeld</code></pre>"))
        self.assertIn("pre_code", lint_body('<pre class="x">grafiek</pre>'))

    def test_detects_giant_preformatted_block(self):
        b = "## Grafiek\n\n        prijs |####       64\n        prijs |########   95\n"
        issues = lint_body(b)
        self.assertIn("indented_prose", issues)
        self.assertIn("giant_preformatted", issues)

    def test_fixed_2027_article_is_clean_and_intact(self):
        """The delivered format-fixed body must be code-block-free and structurally preserved."""
        if not os.path.isfile(FIXED_BODY_PATH):
            self.skipTest("format-fixed article not present")
        raw = open(FIXED_BODY_PATH, encoding="utf-8").read()
        body = raw[raw.index("\n") + 1:].strip() + "\n"      # Post.body = drop the H1 title line
        self.assertEqual(lint_body(body), [])                 # no code blocks / pre / indent
        st = body_struct(body)
        self.assertEqual((st["h2"], st["h3"], st["tables"]), (19, 13, 10))  # counts unchanged
        # day-ahead visual + its source caption present
        self.assertIn("nederlandse-day-ahead-prijzen-2025-2026-v3.png", body)
        self.assertIn("Bron: ACM", body)
        # disclosure + calculator CTA + canonical internal link unchanged
        self.assertIn("Groene Vrienden", body)
        self.assertIn("/calculator", body)
        self.assertIn("/post/wat-levert-een-thuisbatterij-op", body)
        # no giant ASCII chart survived (no run of many box-drawing / pipe chars)
        self.assertNotIn("```", body)


@override_settings(STORAGES=MEM_STORAGE)
class CoverOnly(Base):
    """cover_only mode: assign a Cloudinary-workflow cover while preserving body byte-for-byte."""

    def _png(self):
        from PIL import Image
        p = os.path.join(self.tmp, "hero.png")
        Image.new("RGB", (8, 4), (255, 209, 0)).save(p)
        return p

    def _manifest(self, slug, src, upname="cover-v3.png", alt="hero met titel", pre=None):
        man = {"schema": "x", "mode": "cover_only", "slug": slug,
               "precondition": pre if pre is not None else {"status": "published"},
               "preserve": {"slug": slug, "status": "published", "body": "PRESERVED_EXACTLY"},
               "cover": {"cover_source": src, "cover_upload_name": upname, "cover_alt": alt}}
        return write(self.tmp, man)

    def test_apply_sets_cover_and_preserves_body(self):
        p = self.mkpost("c1", CUR)
        before = body_sha(p.body)
        m = self._manifest("c1", self._png(), alt="Wat levert een thuisbatterij op? hero")
        call_command("seo_release_v2", "--slug", "c1", "--manifest", m, "--apply",
                     "--backup-dir", os.path.join(self.tmp, "bk"))
        p2 = Post.objects.get(slug="c1")
        self.assertTrue(p2.cover_image.name)                  # cover assigned
        self.assertEqual(body_sha(p2.body), before)           # body byte-for-byte
        self.assertEqual(p2.body, CUR)
        self.assertEqual(p2.cover_alt, "Wat levert een thuisbatterij op? hero")
        self.assertEqual(p2.slug, "c1")
        self.assertEqual(p2.status, "published")
        self.assertEqual(p2.published_at, PUB)
        self.assertTrue(any(f.endswith("_cover.json") for f in os.listdir(os.path.join(self.tmp, "bk"))))

    def test_dry_run_makes_no_change(self):
        self.mkpost("c2", CUR)
        m = self._manifest("c2", self._png())
        call_command("seo_release_v2", "--slug", "c2", "--manifest", m)  # dry-run default
        self.assertFalse(Post.objects.get(slug="c2").cover_image.name)

    def test_precondition_status_mismatch_aborts(self):
        self.mkpost("c3", CUR)
        m = self._manifest("c3", self._png(), pre={"status": "draft"})
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c3", "--manifest", m, "--apply")
        self.assertFalse(Post.objects.get(slug="c3").cover_image.name)

    def test_missing_cover_source_aborts(self):
        self.mkpost("c4", CUR)
        m = self._manifest("c4", os.path.join(self.tmp, "does-not-exist.png"))
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c4", "--manifest", m, "--apply")

    def test_no_headroom_long_upload_name_aborts(self):
        self.mkpost("c5", CUR)
        m = self._manifest("c5", self._png(), upname="x" * 90 + ".png")
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c5", "--manifest", m, "--apply")

    def test_empty_cover_alt_aborts(self):
        self.mkpost("c6", CUR)
        m = self._manifest("c6", self._png(), alt="   ")
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c6", "--manifest", m, "--apply")

    def test_body_sha_precondition_mismatch_aborts(self):
        self.mkpost("c7", CUR)
        m = self._manifest("c7", self._png(), pre={"status": "published", "sha256": "0" * 64})
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c7", "--manifest", m, "--apply")
        self.assertFalse(Post.objects.get(slug="c7").cover_image.name)  # no write

    def test_wrong_manifest_slug_aborts(self):
        self.mkpost("c8", CUR)
        man = {"schema": "x", "mode": "cover_only", "slug": "some-other-slug",
               "precondition": {"status": "published"},
               "cover": {"cover_source": self._png(), "cover_upload_name": "c-v1.png", "cover_alt": "x"}}
        m = write(self.tmp, man)
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c8", "--manifest", m, "--apply")

    def test_body_change_rolls_back(self):
        p = self.mkpost("c9", CUR)
        before = body_sha(p.body)
        m = self._manifest("c9", self._png())
        # Force the reloaded body to differ -> command must detect and roll back.
        with mock.patch.object(Post, "refresh_from_db", autospec=True,
                               side_effect=lambda self, *a, **k: setattr(self, "body", CUR + " MUTATED")):
            self.assertRaises(CommandError, call_command,
                              "seo_release_v2", "--slug", "c9", "--manifest", m, "--apply",
                              "--backup-dir", os.path.join(self.tmp, "bk"))
        fresh = Post.objects.get(slug="c9")
        self.assertEqual(fresh.body, CUR)              # body rolled back (unchanged)
        self.assertEqual(body_sha(fresh.body), before)
        self.assertFalse(fresh.cover_image.name)       # cover assignment rolled back

    @override_settings(STORAGES=BOOM_STORAGE)
    def test_cover_upload_failure_rolls_back(self):
        p = self.mkpost("c10", CUR)
        before = body_sha(p.body)
        m = self._manifest("c10", self._png())
        self.assertRaises(CommandError, call_command,
                          "seo_release_v2", "--slug", "c10", "--manifest", m, "--apply",
                          "--backup-dir", os.path.join(self.tmp, "bk"))
        fresh = Post.objects.get(slug="c10")
        self.assertFalse(fresh.cover_image.name)       # no cover persisted
        self.assertEqual(body_sha(fresh.body), before)  # body untouched


class CoverReleaseManifestsV1(TestCase):
    """Integrity of the 12 shipped cover_only release manifests."""

    DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                       "research", "seo", "cover-review-v1", "release-manifests")

    def _load(self, slug):
        p = os.path.join(self.DIR, f"{slug}-cover-v1.json")
        self.assertTrue(os.path.isfile(p), f"missing manifest {p}")
        return json.load(open(p, encoding="utf-8"))

    def test_exactly_twelve_manifests_for_ready_slugs(self):
        if not os.path.isdir(self.DIR):
            self.skipTest("release-manifests not present")
        files = sorted(f for f in os.listdir(self.DIR) if f.endswith("-cover-v1.json"))
        self.assertEqual(len(files), 12)
        self.assertEqual({f[:-len("-cover-v1.json")] for f in files}, set(RELEASE_SLUGS_V1))
        # thuisbatterij-vergelijken (PASS) must NOT have a manifest
        self.assertNotIn("thuisbatterij-vergelijken-cover-v1.json", files)

    def test_each_manifest_is_wellformed_cover_only(self):
        if not os.path.isdir(self.DIR):
            self.skipTest("release-manifests not present")
        from PIL import Image
        field = Post._meta.get_field("cover_image")
        limit = field.max_length - 20
        root = os.path.dirname(os.path.dirname(__file__))
        for slug in RELEASE_SLUGS_V1:
            man = self._load(slug)
            self.assertEqual(man["mode"], "cover_only", slug)
            self.assertEqual(man["slug"], slug, slug)
            # no content-changing fields anywhere at top level
            for forbidden in ("body", "title", "excerpt", "seo_title", "seo_description", "tags"):
                self.assertNotIn(forbidden, man, f"{slug} has forbidden field {forbidden}")
            cov = man["cover"]
            self.assertTrue(cov["cover_alt"].strip(), f"{slug} empty cover_alt")
            self.assertTrue(cov["cover_upload_name"].endswith(".png"))
            gen = field.generate_filename(None, cov["cover_upload_name"])
            self.assertLessEqual(len(gen), limit, f"{slug} upload name lacks headroom")
            src = os.path.join(root, cov["cover_source"])
            self.assertTrue(os.path.isfile(src), f"{slug} source missing: {src}")
            self.assertEqual(Image.open(src).size, (1600, 900), f"{slug} source not 1600x900")
            self.assertEqual(man["preserve"].get("body"), "PRESERVED_EXACTLY", slug)


class ProductionManifestsV3(TestCase):
    """The shipped V3 manifests must be well-formed and internally consistent with their bodies."""

    def _load(self, *parts):
        p = os.path.join(os.path.dirname(os.path.dirname(__file__)), "research", "seo", "article-drafts", *parts)
        if not os.path.isfile(p):
            self.skipTest(f"manifest not present: {p}")
        return json.load(open(p, encoding="utf-8"))

    def test_format_release_matches_fixed_body(self):
        man = self._load("energieprijzen-stijgen-thuisbatterij-voordeel-2027", "production-format-release-v3.json")
        self.assertEqual(man["mode"], "full_body")
        prop = man["proposed"]
        self.assertEqual(body_sha(prop["body"]), prop["sha256"])
        st = body_struct(prop["body"])
        self.assertEqual((st["h2"], st["h3"], st["tables"]), (prop["h2"], prop["h3"], prop["tables"]))
        self.assertEqual((st["h2"], st["h3"], st["tables"]), (19, 13, 10))
        self.assertEqual(lint_body(prop["body"]), [])
        self.assertEqual(man["precondition"]["sha256"],
                         "0bc77e4d93a94aeaa49daca412940c305b52b497ef0e4d4b67448e835b29d96b")

    def test_cover_manifests_are_cover_only(self):
        for slug in ("wat-levert-een-thuisbatterij-op",
                     "energieprijzen-stijgen-thuisbatterij-voordeel-2027"):
            man = self._load(slug, "production-cover-release-v3.json")
            self.assertEqual(man["mode"], "cover_only")
            self.assertEqual(man["slug"], slug)
            self.assertTrue(man["cover"]["cover_source"].endswith(".png"))
            self.assertTrue(man["cover"]["cover_alt"].strip())
            self.assertNotIn("body", man.get("proposed", {}))  # cover-only carries no body


class StructureCounter(TestCase):
    """The shared body_struct must count H2/H3/tables in Markdown, HTML and mixed bodies."""

    def test_pure_markdown(self):
        b = "## A\n\n### a\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n## B\n"
        s = body_struct(b)
        self.assertEqual((s["h2"], s["h3"], s["tables"]), (2, 1, 1))

    def test_pure_html(self):
        b = "<h2>A</h2><h3>a</h3><table><tr><td>1</td></tr></table><h2>B</h2>"
        s = body_struct(b)
        self.assertEqual((s["h2"], s["h3"], s["tables"]), (2, 1, 1))

    def test_mixed_html_and_markdown(self):
        b = "## A\n\n<h2>B</h2>\n\n### c\n\n<h3>d</h3>\n\n| a | b |\n|---|---|\n\n<table></table>"
        s = body_struct(b)
        self.assertEqual((s["h2"], s["h3"], s["tables"]), (2, 2, 2))

    def test_html_headings_with_attributes(self):
        b = ('<h2 id="x" class="y">A</h2>'
             '<h3 data-z aria-level="3">b</h3>'
             '<table class="t" border="1"><tr><td>1</td></tr></table>')
        s = body_struct(b)
        self.assertEqual((s["h2"], s["h3"], s["tables"]), (1, 1, 1))

    def test_ten_html_tables(self):
        b = "<table class='t'><tr><td>x</td></tr></table>" * 10
        self.assertEqual(body_struct(b)["tables"], 10)

    def test_2027_html_precondition_structure(self):
        b = ("".join(f"<h2>H{i}</h2>" for i in range(19))
             + "".join(f"<h3>S{i}</h3>" for i in range(13))
             + "<table></table>" * 10)
        s = body_struct(b)
        self.assertEqual((s["h2"], s["h3"], s["tables"]), (19, 13, 10))

    def test_h3_and_lookalikes_not_counted_as_h2(self):
        self.assertEqual(body_struct("### x\n")["h2"], 0)
        self.assertEqual(body_struct("<h3>x</h3>")["h2"], 0)
        self.assertEqual(body_struct("<h20>x</h20>")["h2"], 0)
        # H2 still counted in both syntaxes
        self.assertEqual(body_struct("## x\n")["h2"], 1)
        self.assertEqual(body_struct("<H2 CLASS='a'>x</H2>")["h2"], 1)
