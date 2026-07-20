from django.urls import path

from .views import LeadCreateAPIView, LeadStage2APIView

urlpatterns = [
    path("", LeadCreateAPIView.as_view(), name="lead-create"),
    path("<int:pk>/stage2/", LeadStage2APIView.as_view(), name="lead-stage2"),
]
