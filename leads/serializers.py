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
