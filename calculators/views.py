from django.shortcuts import render

from .forms import BatteryCalculatorForm
from .services import BatteryAdviceError, calculate_battery_advice


def thuisbatterij_calculator(request):
    result = None
    error = None

    if request.method == "POST":
        form = BatteryCalculatorForm(request.POST)

        if form.is_valid():
            try:
                result = calculate_battery_advice(**form.cleaned_data)
            except BatteryAdviceError as exc:
                error = str(exc)
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
