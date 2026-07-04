SOLAR_DAYS_PER_YEAR = 250
DAYS_PER_YEAR = 365


class BatteryAdviceError(Exception):
    """Raised when the input combination doesn't make sense for an advice."""


def _product_advice_for(average_capacity):
    if average_capacity <= 8:
        return "7 kWh systeem"
    elif average_capacity <= 12:
        return "10 kWh systeem"
    elif average_capacity <= 17:
        return "14 kWh systeem"
    elif average_capacity <= 25:
        return "21 kWh systeem"
    elif average_capacity <= 35:
        return "28 kWh systeem"
    elif average_capacity <= 52:
        return "42 kWh systeem"
    elif average_capacity <= 75:
        return "63 kWh systeem"
    elif average_capacity <= 95:
        return "88 kWh systeem"
    elif average_capacity <= 125:
        return "100 kWh zakelijk systeem"
    elif average_capacity <= 180:
        return "150 kWh zakelijk systeem"
    elif average_capacity <= 275:
        return "250 kWh+ zakelijk systeem"
    else:
        return "Maatwerk batterijopslag systeem"


def calculate_battery_advice(customer_type, yearly_usage, goal, exported_energy):
    """Core thuisbatterij-advies berekening, gedeeld door de Django-view en de API."""

    # Particulier: extreem hoog verbruik afvangen
    if customer_type == "residential" and yearly_usage > 50000:
        raise BatteryAdviceError(
            "Voor particulier gebruik lijkt dit verbruik erg hoog. "
            "Kies eventueel zakelijk."
        )

    # Particulier: max 10.000 kWh opgewekte/teruggeleverde stroom per jaar
    if customer_type == "residential" and exported_energy > 10000:
        raise BatteryAdviceError(
            "Voor particulier gebruik ondersteunen we maximaal 10.000 kWh "
            "opgewekte/teruggeleverde stroom per jaar. Kies eventueel zakelijk."
        )

    # Particulier: teruglevering mag niet extreem hoger zijn dan verbruik
    if customer_type == "residential" and exported_energy > yearly_usage * 3:
        raise BatteryAdviceError(
            "De teruglevering lijkt erg hoog vergeleken met het verbruik. "
            "Controleer de invoer of kies zakelijk."
        )

    # Zakelijk: geen harde bovengrens op verbruik of teruglevering

    daily_export = exported_energy / SOLAR_DAYS_PER_YEAR
    daily_usage = yearly_usage / DAYS_PER_YEAR

    if goal == "self_consumption":
        goal_label = "zelfconsumptie"
        advice_base = daily_export
        lower_range = advice_base * 0.8
        upper_range = advice_base * 1.0
    else:
        goal_label = "handel / dynamisch energiecontract"
        advice_base = max(daily_export, daily_usage)
        lower_range = advice_base * 1.5
        upper_range = advice_base * 2.5

    average_capacity = (lower_range + upper_range) / 2

    return {
        "goal_label": goal_label,
        "daily_export": round(daily_export, 1),
        "daily_usage": round(daily_usage, 1),
        "lower_range": round(lower_range, 1),
        "upper_range": round(upper_range, 1),
        "product_advice": _product_advice_for(average_capacity),
    }