from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from calculators.stage2 import build_stage2_report

from .models import Lead
from .serializers import LeadSerializer, LeadStage2Serializer


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

        lead = serializer.save()
        # id + token maken de Stage 2-vervolgvragen mogelijk; alleen deze
        # browser kent het token, dus alleen hij kan de lead aanvullen.
        return Response(
            {"ok": True, "id": lead.id, "stage2_token": str(lead.stage2_token)},
            status=status.HTTP_201_CREATED,
        )


class LeadStage2APIView(APIView):
    """POST /api/leads/<id>/stage2/ — extra analysevragen ná het leadformulier.

    Berekent het indicatieve terugverdientijd-rapport (calculators.stage2) en
    bewaart antwoorden + rapport bij de lead. Het token uit de create-response
    is verplicht, zodat niemand andermans lead kan aanvullen.
    """

    permission_classes = [AllowAny]

    def post(self, request, pk):
        serializer = LeadStage2Serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = dict(serializer.validated_data)
        token = data.pop("stage2_token")
        lead = Lead.objects.filter(pk=pk, stage2_token=token).first()
        if lead is None:
            return Response(
                {"error": "Lead niet gevonden."}, status=status.HTTP_404_NOT_FOUND
            )

        report = build_stage2_report(
            lead.calculator_inputs, lead.calculator_result, data
        )
        lead.stage2_answers = data
        lead.calculation_report = report
        lead.save(update_fields=["stage2_answers", "calculation_report"])

        return Response(report)
