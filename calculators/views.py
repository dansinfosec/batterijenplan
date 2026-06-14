from django.shortcuts import render

from .forms import BatteryCalculatorForm


SOLAR_DAYS_PER_YEAR = 250
DAYS_PER_YEAR = 365


def thuisbatterij_calculator(request):
    result = None
    error = None

    if request.method == "POST":
        form = BatteryCalculatorForm(request.POST)

        if form.is_valid():
            customer_type = form.cleaned_data["customer_type"]
            goal = form.cleaned_data["goal"]
            yearly_usage = form.cleaned_data["yearly_usage"]
            exported_energy = form.cleaned_data["exported_energy"]

            if customer_type == "residential" and yearly_usage > 50000:
                error = (
                    "Voor particulier gebruik lijkt dit verbruik erg hoog. "
                    "Kies eventueel zakelijk."
                )

            elif customer_type == "business" and yearly_usage > 1000000:
                error = "Het zakelijke verbruik lijkt te hoog. Controleer de invoer."

            elif exported_energy > yearly_usage * 3:
                error = "De teruglevering lijkt erg hoog vergeleken met het verbruik."

            else:
                daily_export = exported_energy / SOLAR_DAYS_PER_YEAR
                daily_usage = yearly_usage / DAYS_PER_YEAR

                if goal == "self_consumption":
                    goal_label = "zelfconsumptie"
                    advice_base = daily_export
                    lower_range = advice_base * 0.8
                    upper_range = advice_base * 1.0

                elif goal == "trading":
                    goal_label = "handel / dynamisch energiecontract"
                    advice_base = max(daily_export, daily_usage)
                    lower_range = advice_base * 1.5
                    upper_range = advice_base * 2.5

                average_capacity = (lower_range + upper_range) / 2

                if average_capacity <= 8:
                    product_advice = "7 kWh systeem"
                elif average_capacity <= 12:
                    product_advice = "10 kWh systeem"
                elif average_capacity <= 17:
                    product_advice = "14 kWh systeem"
                elif average_capacity <= 25:
                    product_advice = "21 kWh systeem"
                elif average_capacity <= 35:
                    product_advice = "28 kWh systeem"
                elif average_capacity <= 52:
                    product_advice = "42 kWh systeem"
                elif average_capacity <= 75:
                    product_advice = "63 kWh systeem"
                elif average_capacity <= 95:
                    product_advice = "88 kWh systeem"
                elif average_capacity <= 125:
                    product_advice = "100 kWh zakelijk systeem"
                elif average_capacity <= 180:
                    product_advice = "150 kWh zakelijk systeem"
                elif average_capacity <= 275:
                    product_advice = "250 kWh+ zakelijk systeem"
                else:
                    product_advice = "Maatwerk batterijopslag systeem"

                result = {
                    "goal_label": goal_label,
                    "daily_export": round(daily_export, 1),
                    "daily_usage": round(daily_usage, 1),
                    "lower_range": round(lower_range, 1),
                    "upper_range": round(upper_range, 1),
                    "product_advice": product_advice,
                }

        else:
            error = "Controleer de ingevulde gegevens."

    else:
        form = BatteryCalculatorForm(
            initial={
                "goal": "trading",
                "customer_type": "residential",
            }
        )

    return render(
        request,
        "calculators/thuisbatterij_calculator.html",
        {
            "form": form,
            "result": result,
            "error": error,
        },
    )