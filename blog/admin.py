from django.contrib import admin
from .models import Post, Comment


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "status", "published_at", "updated_at", "reading_minutes"]
    list_filter = ["status", "tags", "published_at"]
    search_fields = ["title", "excerpt", "body", "seo_title", "seo_description"]
    prepopulated_fields = {"slug": ("title",)}
    date_hierarchy = "published_at"
    readonly_fields = ["reading_minutes", "created_at", "updated_at"]
    fieldsets = [
        ("Content", {
            "fields": ["title", "slug", "author", "excerpt", "body", "cover_image", "cover_alt"],
        }),
        ("SEO", {
            "fields": ["seo_title", "seo_description"],
        }),
        ("Taxonomy", {
            "fields": ["tags"],
        }),
        ("Publishing", {
            "fields": ["status", "published_at", "reading_minutes", "created_at", "updated_at"],
        }),
    ]


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["name", "post", "approved", "created_at"]
    list_filter = ["approved"]
    actions = ["approve_comments"]

    @admin.action(description="Geselecteerde reacties goedkeuren")
    def approve_comments(self, request, queryset):
        queryset.update(approved=True)
