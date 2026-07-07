from django import forms

from .services import SUNNY_DAY_EXPORT_CHOICES


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
                "class": "form-select field-input",
            }
        ),
    )

    yearly_usage = forms.FloatField(
        min_value=0.1,
        label="Jaarlijks stroomverbruik (kWh)",
        error_messages={
            "required": "Vul uw jaarverbruik in.",
            "invalid": "Vul uw jaarverbruik in.",
            "min_value": "Jaarverbruik kan niet negatief zijn.",
        },
        widget=forms.NumberInput(
            attrs={
                "class": "form-control field-input",
                "placeholder": "Bijvoorbeeld: 4500",
                "step": "0.1",
            }
        ),
    )

    goal = forms.ChoiceField(
        choices=GOALS,
        label="Doel van de batterij",
        widget=forms.Select(
            attrs={
                "class": "form-select field-input",
            }
        ),
    )

    exported_energy = forms.FloatField(
        min_value=0,
        label="Jaarlijkse teruglevering (kWh)",
        error_messages={
            "required": "Vul uw jaarlijkse teruglevering in.",
            "invalid": "Vul uw jaarlijkse teruglevering in.",
            "min_value": "Teruglevering kan niet negatief zijn.",
        },
        widget=forms.NumberInput(
            attrs={
                "class": "form-control field-input",
                "placeholder": "Bijvoorbeeld: 2500",
                "step": "0.1",
            }
        ),
    )

    # Alleen getoond/relevant bij handel + hoog verbruik t.o.v. lage
    # teruglevering (zie services.sunny_day_question_required). Optioneel:
    # de service herberekent de trigger zelf en negeert dit veld anders.
    sunny_day_export = forms.ChoiceField(
        choices=[("", "Maak een keuze")] + SUNNY_DAY_EXPORT_CHOICES,
        label=None,  # label komt uit services.SUNNY_DAY_QUESTION_LABEL in de template
        required=False,
        error_messages={"invalid_choice": "Selecteer een optie."},
        widget=forms.Select(
            attrs={
                "class": "form-select field-input",
            }
        ),
    )
