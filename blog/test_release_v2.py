# -*- coding: utf-8 -*-
"""Tests for the guarded V2 release + restore commands (seo_release_v2, seo_restore_post_backup)."""
import json
import os
import tempfile
from datetime import datetime, timezone

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from blog.models import Post
from blog.management.commands.seo_release_v2 import body_sha, body_struct

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
