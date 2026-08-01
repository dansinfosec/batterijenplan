"""Tests for the seo_update_posts management command (dry-run-by-default updater)."""
import json
import os
import tempfile
from datetime import datetime, timezone
from unittest import mock

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.storage import default_storage
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from blog.models import Post

# The exact long basename that shipped originally (generate_filename → 96 chars,
# which under max_length=100 leaves no safe headroom for storage suffixes).
OLD_LONG_BASENAME = "article-cover-thuisbatterij-vergelijken_recraft-v4-1_2026-08-01_v2_final.png"
SHORT_BASENAME = "thuisbatterij-vergelijken-v2.png"


def write_manifest(tmpdir, posts):
    path = os.path.join(tmpdir, "manifest.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"version": 1, "posts": posts}, fh, ensure_ascii=False)
    return path


class SeoUpdatePostsTests(TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.user = User.objects.create_user("editor", password="x")
        self.fixed_pub = datetime(2026, 7, 6, 0, 3, tzinfo=timezone.utc)
        # Target post + one helper so /post/ internal links resolve.
        self.helper = Post.objects.create(
            title="Enphase vs Dyness", slug="enphase-vs-dyness", author=self.user,
            excerpt="x", body="body", status="published",
            seo_title="t", seo_description="d",
        )
        self.post = Post.objects.create(
            title="Oude titel", slug="thuisbatterij-vergelijken", author=self.user,
            excerpt="oud", body="oude body", status="published",
            seo_title="oud", seo_description="oud", cover_alt="oud",
            published_at=self.fixed_pub,
        )
        self.post.tags.set(["thuisbatterij"])

    def _valid_entry(self, **over):
        entry = {
            "title": "Nieuwe titel",
            "excerpt": "Nieuwe excerpt",
            "body": "Antwoord eerst. Zie ook [vergelijking](/post/enphase-vs-dyness) en de [calculator](/calculator).",
            "seo_title": "Nieuwe SEO titel",
            "seo_description": "Nieuwe meta description die lang genoeg is voor Google.",
            "tags": ["thuisbatterij", "EMS", "thuisbatterij vergelijken"],
            "cover_alt": "Nieuwe alt",
            "internal_links": ["/post/enphase-vs-dyness", "/calculator"],
        }
        entry.update(over)
        return entry

    def test_dry_run_makes_no_changes(self):
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": self._valid_entry()})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path)
        p = Post.objects.get(slug="thuisbatterij-vergelijken")
        self.assertEqual(p.title, "Oude titel")
        self.assertEqual(p.body, "oude body")
        self.assertEqual(sorted(p.tags.names()), ["thuisbatterij"])

    def test_apply_updates_only_requested_post(self):
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": self._valid_entry()})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        p = Post.objects.get(slug="thuisbatterij-vergelijken")
        self.assertEqual(p.title, "Nieuwe titel")
        self.assertEqual(p.seo_title, "Nieuwe SEO titel")
        # Other post untouched.
        self.assertEqual(Post.objects.get(slug="enphase-vs-dyness").title, "Enphase vs Dyness")

    def test_unknown_slug_fails_safely(self):
        path = write_manifest(self.tmp, {"nope": self._valid_entry()})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="nope", manifest=path, apply=True, backup_dir=self.tmp)

    def test_source_marker_fails(self):
        entry = self._valid_entry(body="Tekst met [SOURCE REQUIRED] erin. [calculator](/calculator)")
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        self.assertEqual(Post.objects.get(slug="thuisbatterij-vergelijken").body, "oude body")

    def test_slug_unchanged(self):
        entry = self._valid_entry(slug="een-andere-slug")
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)

    def test_published_at_unchanged(self):
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": self._valid_entry()})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        self.assertEqual(Post.objects.get(slug="thuisbatterij-vergelijken").published_at, self.fixed_pub)

    def test_status_not_published_without_flag(self):
        self.post.status = "draft"
        self.post.save()
        entry = self._valid_entry(status="published")
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        self.assertEqual(Post.objects.get(slug="thuisbatterij-vergelijken").status, "draft")

    def test_tags_updated_without_duplicates(self):
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": self._valid_entry()})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        names = Post.objects.get(slug="thuisbatterij-vergelijken").tags.names()
        self.assertEqual(len(names), len(set(names)))
        self.assertEqual(sorted(names), ["EMS", "thuisbatterij", "thuisbatterij vergelijken"])

    def test_duplicate_tags_in_manifest_fail(self):
        entry = self._valid_entry(tags=["thuisbatterij", "Thuisbatterij"])
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)

    def test_image_change_requires_file_and_alt(self):
        # Missing file.
        entry = self._valid_entry(cover_image="does/not/exist.png")
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path)
        # File exists but alt empty.
        imgpath = os.path.join(self.tmp, "c.png")
        with open(imgpath, "wb") as fh:
            fh.write(b"\x89PNG\r\n")
        entry2 = self._valid_entry(cover_image=imgpath, cover_alt="")
        path2 = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry2})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path2)

    def test_malformed_manifest_fails(self):
        bad = os.path.join(self.tmp, "bad.json")
        with open(bad, "w", encoding="utf-8") as fh:
            fh.write("{not valid json")
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=bad)

    def test_internal_link_to_missing_post_fails(self):
        entry = self._valid_entry(
            body="Zie [dood](/post/bestaat-niet) en [calc](/calculator).",
            internal_links=["/post/bestaat-niet"],
        )
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path)

    def test_transaction_rolls_back_on_error(self):
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": self._valid_entry()})
        with mock.patch("blog.models.Post.save", side_effect=RuntimeError("boom")):
            with self.assertRaises(CommandError):
                call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path, apply=True, backup_dir=self.tmp)
        p = Post.objects.get(slug="thuisbatterij-vergelijken")
        self.assertEqual(p.title, "Oude titel")
        self.assertEqual(sorted(p.tags.names()), ["thuisbatterij"])

    # --- cover filename storage-headroom regression tests ---

    def _make_cover(self, basename):
        p = os.path.join(self.tmp, basename)
        with open(p, "wb") as fh:
            fh.write(b"\x89PNG\r\n")
        return p

    def test_long_cover_path_rejected_for_lacking_headroom(self):
        """The 96-char generated path is rejected — not because it exceeds
        max_length (it does not), but because it leaves no safe headroom for
        storage-generated suffixes."""
        field = Post._meta.get_field("cover_image")
        generated = field.generate_filename(None, OLD_LONG_BASENAME)
        self.assertLessEqual(len(generated), field.max_length)        # 96 <= 100 (does NOT overflow yet)
        self.assertGreater(len(generated), field.max_length - 20)     # 96 > 80 (no headroom)
        entry = self._valid_entry(cover_image=self._make_cover(OLD_LONG_BASENAME))
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with self.assertRaises(CommandError):
            call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path)

    def test_short_cover_path_passes(self):
        field = Post._meta.get_field("cover_image")
        self.assertLessEqual(len(field.generate_filename(None, SHORT_BASENAME)), field.max_length - 20)
        entry = self._valid_entry(cover_image=self._make_cover(SHORT_BASENAME))
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        call_command("seo_update_posts", slug="thuisbatterij-vergelijken", manifest=path)  # no raise

    def test_validation_runs_before_storage_save(self):
        """A failing cover validation must abort before storage.save() is ever called."""
        entry = self._valid_entry(cover_image=self._make_cover(OLD_LONG_BASENAME))
        path = write_manifest(self.tmp, {"thuisbatterij-vergelijken": entry})
        with mock.patch.object(default_storage, "save") as msave:
            with self.assertRaises(CommandError):
                call_command("seo_update_posts", slug="thuisbatterij-vergelijken",
                             manifest=path, apply=True, backup_dir=self.tmp)
        msave.assert_not_called()
        # DB untouched.
        self.assertEqual(Post.objects.get(slug="thuisbatterij-vergelijken").title, "Oude titel")

    def test_all_changed_charfields_fit_limits(self):
        """Every changed CharField value in the real production manifest fits its limit."""
        mpath = os.path.join(settings.BASE_DIR,
                             "research/seo/article-drafts/thuisbatterij-vergelijken/production-manifest.json")
        e = json.load(open(mpath, encoding="utf-8"))["posts"]["thuisbatterij-vergelijken"]
        for fname in ["title", "seo_title", "excerpt", "cover_alt"]:
            ml = Post._meta.get_field(fname).max_length
            self.assertIsNotNone(ml)
            self.assertLessEqual(len(e[fname]), ml, f"{fname} exceeds max_length {ml}")
        # cover_image: generated storage path fits with headroom.
        field = Post._meta.get_field("cover_image")
        gen = field.generate_filename(None, os.path.basename(e["cover_image"]))
        self.assertLessEqual(len(gen), field.max_length - 20)
