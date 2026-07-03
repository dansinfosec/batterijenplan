from rest_framework import serializers
from blog.models import Post, Comment
import markdown


class PostListSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    tags = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "title", "slug", "author", "cover_image", "excerpt",
                  "tags", "reading_minutes", "published_at", "created_at"]

    def get_tags(self, obj):
        return list(obj.tags.names())

    def get_cover_image(self, obj):
        request = self.context.get("request")
        if obj.cover_image and request:
            return request.build_absolute_uri(obj.cover_image.url)
        return None


class PostDetailSerializer(PostListSerializer):
    body_html = serializers.SerializerMethodField()

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["body_html", "updated_at"]

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
