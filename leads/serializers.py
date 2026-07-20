from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    # Honeypot: onzichtbaar veld in het formulier; mensen laten het leeg.
    website = serializers.CharField(
        required=False, allow_blank=True, write_only=True, default=""
    )

    class Meta:
        model = Lead
        fields = [
            "id", "name", "phone", "email", "postcode", "message",
            "calculator_inputs", "calculator_result", "source", "consent",
            "created_at", "website",
        ]
        extra_kwargs = {"source": {"required": False}}
        read_only_fields = ["id", "created_at"]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Vul uw naam in.")
        return value

    def validate_phone(self, value):
        digits = [c for c in value if c.isdigit()]
        if len(digits) < 8:
            raise serializers.ValidationError("Vul een geldig telefoonnummer in.")
        return value.strip()

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError(
                "U moet akkoord gaan voordat wij contact mogen opnemen."
            )
        return value

    def create(self, validated_data):
        validated_data.pop("website", None)
        return Lead.objects.create(**validated_data)


# ── Stage 2: extra analysevragen ná het leadformulier ──────────────────────
# De vier hoofdvragen zijn verplicht (elke lijst heeft een "weet ik niet"-
# optie, dus altijd beantwoordbaar); de geavanceerde velden zijn optioneel.
HEAT_PUMP_CHOICES = ["none", "hybrid", "all_electric", "unknown"]
EV_CHOICES = ["no", "yes", "soon", "unknown"]
STAGE2_CONTRACT_CHOICES = ["fixed", "variable", "dynamic", "unknown"]
RETURN_COSTS_CHOICES = ["yes", "no", "unknown"]
GRID_CONNECTION_CHOICES = ["1_phase", "3_phase", "unknown"]
WARMTEFONDS_CHOICES = ["yes", "no", "maybe"]


class LeadStage2Serializer(serializers.Serializer):
    # Bewijs dat de inzender de lead zojuist zelf heeft aangemaakt.
    stage2_token = serializers.UUIDField()

    heat_pump = serializers.ChoiceField(choices=HEAT_PUMP_CHOICES)
    ev = serializers.ChoiceField(choices=EV_CHOICES)
    contract_type = serializers.ChoiceField(choices=STAGE2_CONTRACT_CHOICES)
    return_costs = serializers.ChoiceField(choices=RETURN_COSTS_CHOICES)

    # Optionele verdieping — nooit verplicht, ruime maar redelijke grenzen.
    panel_count = serializers.IntegerField(
        required=False, allow_null=True, min_value=1, max_value=10000
    )
    panel_power_wp = serializers.IntegerField(
        required=False, allow_null=True, min_value=100, max_value=10000000
    )
    inverter_power = serializers.FloatField(
        required=False, allow_null=True, min_value=0.1, max_value=10000
    )
    grid_connection = serializers.ChoiceField(
        choices=GRID_CONNECTION_CHOICES, required=False, allow_blank=True
    )
    warmtefonds_check = serializers.ChoiceField(
        choices=WARMTEFONDS_CHOICES, required=False, allow_blank=True
    )
