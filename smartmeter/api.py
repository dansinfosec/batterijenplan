"""POST /api/smartmeter/analysis/ — stateloze batterijanalyse op P1-profiel.

Privacy/retentie (v1): het request wordt volledig in-memory verwerkt. Er zijn
geen database-writes, geen logging van intervaldata en geen opslag van het
profiel; alleen berekende aggregaten gaan terug in de response.

Resourcebescherming: een vol jaar kost ~3 s rekentijd; het endpoint is
daarom per client begrensd met een DRF ScopedRateThrottle (zie
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["smartmeter_analysis"]). Daarnaast
begrenzen validatie (max 36.864 intervallen) en Django's
DATA_UPLOAD_MAX_MEMORY_SIZE de payload.
"""

import time

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .analysis import run_analysis
from .validation import SmartMeterValidationError, validate_request


class SmartMeterAnalysisAPIView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "smartmeter_analysis"

    def post(self, request):
        t0 = time.perf_counter()
        try:
            validated = validate_request(request.data)
        except SmartMeterValidationError as exc:
            return Response(
                {"error": {"code": exc.code, "detail": exc.detail}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        validation_ms = round((time.perf_counter() - t0) * 1000.0, 1)

        result = run_analysis(validated)

        result["timings_ms"]["validation"] = validation_ms
        result["timings_ms"]["request_total"] = round((time.perf_counter() - t0) * 1000.0, 1)
        return Response(result)
