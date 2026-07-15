from django.db.models import Count, Q
from django.utils.html import strip_tags
from django.utils.text import Truncator
from rest_framework import serializers
from blog.models import Post, Comment
import markdown

RELATED_POSTS_COUNT = 3


class PostListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    tags = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    meta_description = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "title", "slug", "author", "cover_image",
                  "cover_image_url", "cover_alt", "excerpt",
                  "seo_title", "seo_description",
                  "meta_description", "tags", "reading_minutes",
                  "published_at", "updated_at", "created_at"]

    def get_tags(self, obj):
        return list(obj.tags.names())

    def get_cover_image(self, obj):
        request = self.context.get("request")
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None

    def get_cover_image_url(self, obj):
        # Cloudinary geeft al een volledige https-URL; lokale opslag geeft
        # een relatief pad dat we absoluut maken via het request.
        if not obj.cover_image:
            return None
        url = obj.cover_image.url
        if url.startswith(("http://", "https://")):
            return url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_meta_description(self, obj):
        # Voorkeursvolgorde: expliciete SEO-description > excerpt > korte
        # platte-tekst versie van de body.
        if obj.seo_description and obj.seo_description.strip():
            return obj.seo_description.strip()
        if obj.excerpt and obj.excerpt.strip():
            return obj.excerpt.strip()
        text = " ".join(strip_tags(markdown.markdown(obj.body)).split())
        return Truncator(text).chars(160, truncate="…")


class PostDetailSerializer(PostListSerializer):
    body_html = serializers.SerializerMethodField()
    related_posts = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["body_html", "related_posts"]

    def get_body_html(self, obj):
        return markdown.markdown(obj.body, extensions=["fenced_code", "tables", "nl2br"])

    def get_related_posts(self, obj):
        """3 gerelateerde artikelen: voorkeur voor overlappende tags, aangevuld
        met de meest recente gepubliceerde posts als er te weinig tag-matches
        zijn. Eén query: sorteren op aantal gedeelde tags, dan op datum."""
        tag_names = list(obj.tags.names())
        qs = (
            Post.objects.filter(status="published")
            .exclude(pk=obj.pk)
            .prefetch_related("tags")
        )

        if tag_names:
            qs = qs.annotate(
                shared_tags=Count(
                    "tags", filter=Q(tags__name__in=tag_names), distinct=True
                )
            ).order_by("-shared_tags", "-published_at", "-created_at")
        else:
            qs = qs.order_by("-published_at", "-created_at")

        related = qs[:RELATED_POSTS_COUNT]
        return PostListSerializer(related, many=True, context=self.context).data


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["id", "name", "body", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["name", "email", "body"]
