from django.utils.html import strip_tags
from django.utils.text import Truncator
from rest_framework import serializers
from blog.models import Post, Comment
import markdown


class PostListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    tags = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
    meta_description = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "title", "slug", "author", "cover_image", "excerpt",
                  "meta_description", "tags", "reading_minutes",
                  "published_at", "updated_at", "created_at"]

    def get_tags(self, obj):
        return list(obj.tags.names())

    def get_cover_image(self, obj):
        request = self.context.get("request")
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None

    def get_meta_description(self, obj):
        # Excerpt is leidend; anders een korte platte-tekst versie van de body.
        if obj.excerpt and obj.excerpt.strip():
            return obj.excerpt.strip()
        text = " ".join(strip_tags(markdown.markdown(obj.body)).split())
        return Truncator(text).chars(160, truncate="…")


class PostDetailSerializer(PostListSerializer):
    body_html = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["body_html"]

    def get_body_html(self, obj):
        return markdown.markdown(obj.body, extensions=["fenced_code", "tables", "nl2br"])


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["id", "name", "body", "created_at"]
        read_only_fields = ["id", "created_at"]


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["name", "email", "body"]
