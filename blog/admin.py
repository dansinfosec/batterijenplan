from django.contrib import admin
from .models import Post, Comment


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "status", "published_at", "reading_minutes"]
    list_filter = ["status", "tags"]
    search_fields = ["title", "body"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["name", "post", "approved", "created_at"]
    list_filter = ["approved"]
    actions = ["approve_comments"]

    @admin.action(description="Geselecteerde reacties goedkeuren")
    def approve_comments(self, request, queryset):
        queryset.update(approved=True)
