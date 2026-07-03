from rest_framework import generics, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from blog.models import Post, Comment
from .serializers import (
    PostListSerializer, PostDetailSerializer,
    CommentSerializer, CommentCreateSerializer,
)


class PostListView(generics.ListAPIView):
    """GET /api/posts/  — filters: ?tag=thuisbatterij  ?search=lfp"""
    serializer_class = PostListSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "excerpt", "tags__name"]

    def get_queryset(self):
        qs = Post.objects.filter(status="published").prefetch_related("tags")
        tag = self.request.query_params.get("tag")
        if tag:
            qs = qs.filter(tags__name=tag)
        return qs


class PostDetailView(generics.RetrieveAPIView):
    """GET /api/posts/<slug>/"""
    serializer_class = PostDetailSerializer
    queryset = Post.objects.filter(status="published")
    lookup_field = "slug"


class TagListView(APIView):
    """GET /api/tags/"""
    def get(self, request):
        from taggit.models import Tag
        names = (Tag.objects.filter(post__status="published")
                 .distinct().values_list("name", flat=True))
        return Response(sorted(names))


class CommentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/posts/<slug>/comments/ — nieuwe reacties gaan naar moderatie"""
    def get_post(self):
        return get_object_or_404(Post, slug=self.kwargs["slug"], status="published")

    def get_queryset(self):
        return Comment.objects.filter(post=self.get_post(), approved=True)

    def get_serializer_class(self):
        return CommentCreateSerializer if self.request.method == "POST" else CommentSerializer

    def perform_create(self, serializer):
        serializer.save(post=self.get_post())
