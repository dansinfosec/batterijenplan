from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import BatteryCalculatorSerializer
from .services import BatteryAdviceError, calculate_battery_advice


class CalculatorAPIView(APIView):
    """POST /api/calculator/ — hergebruikt calculators.services.calculate_battery_advice"""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = BatteryCalculatorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = calculate_battery_advice(**serializer.validated_data)
        except BatteryAdviceError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)
