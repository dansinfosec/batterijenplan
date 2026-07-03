from django.urls import include, path
from . import views
from calculators.api import CalculatorAPIView

urlpatterns = [
    path("leads/", include("leads.urls")),
    path("posts/", views.PostListView.as_view(), name="post-list"),
    path("posts/<slug:slug>/", views.PostDetailView.as_view(), name="post-detail"),
    path("posts/<slug:slug>/comments/", views.CommentListCreateView.as_view(), name="comment-list"),
    path("tags/", views.TagListView.as_view(), name="tag-list"),
    path("calculator/", CalculatorAPIView.as_view(), name="calculator-api"),
]
