from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import LeadSerializer


class LeadCreateAPIView(APIView):
    """POST /api/leads/ — lead vanuit de React-calculator."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LeadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Honeypot ingevuld → bot. Doe alsof het gelukt is, maar sla niets op.
        if serializer.validated_data.get("website"):
            return Response({"ok": True}, status=status.HTTP_201_CREATED)

        serializer.save()
        return Response({"ok": True}, status=status.HTTP_201_CREATED)
