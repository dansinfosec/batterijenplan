from django import forms


class BatteryCalculatorForm(forms.Form):

    CUSTOMER_TYPES = [
        ("residential", "Particulier"),
        ("business", "Zakelijk"),
    ]

    GOALS = [
        ("trading", "Handel / Dynamisch energiecontract"),
        ("self_consumption", "Zelfconsumptie"),
    ]

    customer_type = forms.ChoiceField(
        choices=CUSTOMER_TYPES,
        label="Type klant",
        widget=forms.Select(
            attrs={
                "class": "form-select",
            }
        ),
    )

    yearly_usage = forms.FloatField(
        min_value=0.1,
        label="Jaarlijks stroomverbruik (kWh)",
        widget=forms.NumberInput(
            attrs={
                "class": "form-control",
                "placeholder": "Bijvoorbeeld 3500",
                "step": "0.1",
            }
        ),
    )

    goal = forms.ChoiceField(
        choices=GOALS,
        label="Doel van de batterij",
        widget=forms.Select(
            attrs={
                "class": "form-select",
            }
        ),
    )

    exported_energy = forms.FloatField(
        min_value=0,
        label="Jaarlijkse teruglevering (kWh)",
        widget=forms.NumberInput(
            attrs={
                "class": "form-control",
                "placeholder": "Bijvoorbeeld 5000",
                "step": "0.1",
            }
        ),
    )
