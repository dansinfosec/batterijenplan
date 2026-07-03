from rest_framework import serializers

from .forms import BatteryCalculatorForm


class BatteryCalculatorSerializer(serializers.Serializer):
    customer_type = serializers.ChoiceField(choices=BatteryCalculatorForm.CUSTOMER_TYPES)
    yearly_usage = serializers.FloatField(min_value=0.1)
    goal = serializers.ChoiceField(choices=BatteryCalculatorForm.GOALS)
    exported_energy = serializers.FloatField(min_value=0)
