from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
from taggit.managers import TaggableManager


class Post(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
    ]

    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=250, unique=True, blank=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    cover_image = models.ImageField(upload_to="batterijenplan/blog/", blank=True, null=True)
    cover_alt = models.CharField(
        max_length=160,
        blank=True,
        verbose_name="Cover image alt text",
        help_text="Describe the cover image for accessibility and SEO.",
    )
    excerpt = models.TextField(max_length=400, blank=True, help_text="Korte intro op de bloglijst")
    body = models.TextField(help_text="Schrijf in Markdown")
    seo_title = models.CharField(
        max_length=70,
        blank=True,
        verbose_name="SEO title",
        help_text="Optional short title for Google. Keep under 60 characters.",
    )
    seo_description = models.TextField(
        blank=True,
        verbose_name="SEO description",
        help_text="Optional meta description for search engines. Keep around 150–160 characters.",
    )
    tags = TaggableManager(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="draft")
    reading_minutes = models.PositiveSmallIntegerField(default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-published_at", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)

        # Ongeveer 200 woorden per minuut
        self.reading_minutes = max(1, len(self.body.split()) // 200)

        # Bij publiceren automatisch de publicatiedatum zetten als die nog leeg
        # is; bestaande waarden worden nooit overschreven.
        if self.status == "published" and self.published_at is None:
            self.published_at = timezone.now()

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    name = models.CharField(max_length=100)
    email = models.EmailField()
    body = models.TextField()
    approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reactie van {self.name} op {self.post}"