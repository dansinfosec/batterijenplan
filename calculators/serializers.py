from rest_framework import serializers

from .forms import BatteryCalculatorForm
from .services import SUNNY_DAY_EXPORT_CHOICES


class BatteryCalculatorSerializer(serializers.Serializer):
    customer_type = serializers.ChoiceField(choices=BatteryCalculatorForm.CUSTOMER_TYPES)
    yearly_usage = serializers.FloatField(min_value=0.1)
    goal = serializers.ChoiceField(choices=BatteryCalculatorForm.GOALS)
    exported_energy = serializers.FloatField(min_value=0)
    # Alleen relevant bij handel/dynamisch + hoog verbruik t.o.v. lage
    # teruglevering; de service herberekent die trigger zelf en negeert dit
    # veld anders. Optioneel, dus bestaande clients blijven werken.
    sunny_day_export = serializers.ChoiceField(
        choices=SUNNY_DAY_EXPORT_CHOICES, required=False, allow_blank=True
    )
