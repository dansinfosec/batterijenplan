from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from blog.models import Post


def make_post(title, tags=(), days_ago=0, status="published", author=None):
    post = Post.objects.create(
        title=title,
        author=author,
        body=f"Inhoud van {title}.",
        status=status,
        published_at=timezone.now() - timedelta(days=days_ago),
    )
    if tags:
        post.tags.add(*tags)
    return post


class RelatedPostsTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(username="auteur", password="x")

    def test_related_posts_prefers_tag_overlap(self):
        current = make_post(
            "Thuisbatterij kiezen", tags=["thuisbatterij", "advies"],
            days_ago=0, author=self.author,
        )
        matching = make_post(
            "Batterijcapaciteit uitgelegd", tags=["thuisbatterij"],
            days_ago=10, author=self.author,
        )
        unrelated_recent = make_post(
            "Zonnepanelen plaatsen", tags=["zonnepanelen"],
            days_ago=1, author=self.author,
        )

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        self.assertEqual(response.status_code, 200)
        related_slugs = [p["slug"] for p in response.data["related_posts"]]

        # De tag-match staat eerst, ook al is hij ouder dan de niet-matchende post.
        self.assertEqual(related_slugs[0], matching.slug)
        self.assertIn(unrelated_recent.slug, related_slugs)

    def test_related_posts_excludes_current_post(self):
        current = make_post("Huidige post", tags=["thuisbatterij"], author=self.author)
        make_post("Andere post", tags=["thuisbatterij"], author=self.author)

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        related_slugs = [p["slug"] for p in response.data["related_posts"]]
        self.assertNotIn(current.slug, related_slugs)

    def test_related_posts_fills_with_recent_when_not_enough_tag_matches(self):
        current = make_post(
            "Huidige post", tags=["thuisbatterij"], days_ago=0, author=self.author
        )
        older = make_post("Ouder artikel", days_ago=20, author=self.author)
        newer = make_post("Nieuwer artikel", days_ago=2, author=self.author)

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        related_slugs = [p["slug"] for p in response.data["related_posts"]]
        self.assertEqual(len(related_slugs), 2)
        # Geen enkele tag-overlap: puur op datum, meest recent eerst.
        self.assertEqual(related_slugs, [newer.slug, older.slug])

    def test_related_posts_returns_at_most_three(self):
        current = make_post("Huidige post", tags=["thuisbatterij"], author=self.author)
        for i in range(5):
            make_post(f"Artikel {i}", tags=["thuisbatterij"], days_ago=i, author=self.author)

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        self.assertEqual(len(response.data["related_posts"]), 3)

    def test_related_posts_excludes_draft_posts(self):
        current = make_post("Huidige post", tags=["thuisbatterij"], author=self.author)
        make_post(
            "Concept artikel", tags=["thuisbatterij"], status="draft", author=self.author
        )

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        self.assertEqual(response.data["related_posts"], [])

    def test_related_post_card_data_shape(self):
        current = make_post("Huidige post", tags=["thuisbatterij"], author=self.author)
        related_post = make_post(
            "Gerelateerd artikel", tags=["thuisbatterij"], author=self.author
        )
        related_post.excerpt = "Korte samenvatting."
        related_post.save()

        response = self.client.get(
            reverse("post-detail", kwargs={"slug": current.slug})
        )

        card = response.data["related_posts"][0]
        for field in ("title", "slug", "excerpt", "tags"):
            self.assertIn(field, card)
        self.assertEqual(card["excerpt"], "Korte samenvatting.")
