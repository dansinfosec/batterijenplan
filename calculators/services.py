SOLAR_DAYS_PER_YEAR = 250
DAYS_PER_YEAR = 365


class BatteryAdviceError(Exception):
    """Raised when the input combination doesn't make sense for an advice."""


# Kernregel van het advies:
#   Teruggeleverde stroom bepaalt de basis.
#   Eigen verbruik bepaalt alleen de marge.
# De batterij slaat zonnestroom-overschot op; een hoge jaarafname mag dus
# nooit rechtstreeks de capaciteit opschalen (dat gaf onrealistische adviezen
# zoals 88 kWh bij 2.920 kWh teruglevering).

# Beschikbare systemen voor de match "Mogelijk passend systeem".
RESIDENTIAL_SYSTEMS = [
    (5, "5 kWh systeem"),
    (10, "10 kWh systeem"),
    (15, "15 kWh systeem"),
    (20, "20 kWh systeem"),
    (30, "30 kWh systeem"),
    (40, "40 kWh systeem"),
]
LARGE_SYSTEMS = [
    (63, "63 kWh systeem"),
    (88, "88 kWh systeem"),
    (100, "100 kWh zakelijk systeem"),
    (150, "150 kWh zakelijk systeem"),
    (250, "250 kWh+ zakelijk systeem"),
]

# Plafonds (bovenkant advies) voor particulier, per teruglevering-band.
# NB: de band 1.000–3.000 staat op 20 kWh: de formule komt binnen die band
# nooit hoger uit dan ~19,7 kWh en het referentievoorbeeld (2.920 kWh export
# → 15,0–19,2 kWh, systeem 20 kWh) moet mogelijk blijven.
RESIDENTIAL_CAPS = [
    (1000, 5),
    (3000, 20),
    (6000, 25),
    (10000, 40),
]

LIMITED_EXPORT_NOTE = (
    "Uw teruglevering is beperkt: er is weinig zonnestroom-overschot om op "
    "te slaan. Wij adviseren daarom bewust een klein systeem."
)


def _product_advice_for(average_capacity, customer_type, exported_energy):
    # 63 kWh en groter alleen bij zakelijk gebruik of zeer hoge teruglevering.
    allow_large = customer_type == "business" or exported_energy > 10000
    options = RESIDENTIAL_SYSTEMS + (LARGE_SYSTEMS if allow_large else [])

    # Kleinste systeem dat (met 5% tolerantie) de gemiddelde capaciteit dekt.
    for size, label in options:
        if average_capacity <= size * 1.05:
            return label

    if allow_large:
        return "Maatwerk batterijopslag systeem"
    return options[-1][1]


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

    # Basis: teruggeleverde stroom verdeeld over ± 250 zonnige dagen.
    daily_solar_surplus = exported_energy / SOLAR_DAYS_PER_YEAR
    daily_usage = yearly_usage / DAYS_PER_YEAR

    # Eigen verbruik geeft alleen een beperkte extra marge (max +30%),
    # nooit een vermenigvuldiging van de batterij.
    usage_multiplier = 1.0
    if daily_solar_surplus > 0 and daily_usage > daily_solar_surplus * 2:
        usage_multiplier = 1.2
    if daily_solar_surplus > 0 and daily_usage > daily_solar_surplus * 3.5:
        usage_multiplier = 1.3

    advised_capacity = daily_solar_surplus * usage_multiplier

    if goal == "self_consumption":
        goal_label = "zelfconsumptie"
    else:
        goal_label = "handel / dynamisch energiecontract"
        # Dynamische handel: kleine extra marge, geen enorme systemen.
        advised_capacity *= 1.1

    lower_range = advised_capacity * 0.9
    upper_range = advised_capacity * 1.15

    # Guardrails particulier: bij lage teruglevering geen grote systemen.
    # Boven 40 kWh alleen zakelijk of teruglevering > 10.000 kWh/jaar
    # (particulier > 10.000 is hierboven al afgevangen).
    if customer_type != "business":
        cap = 40
        for threshold, band_cap in RESIDENTIAL_CAPS:
            if exported_energy < threshold:
                cap = band_cap
                break
        upper_range = min(upper_range, cap)
        lower_range = min(lower_range, upper_range)

    average_capacity = (lower_range + upper_range) / 2

    result = {
        "goal_label": goal_label,
        "daily_export": round(daily_solar_surplus, 1),
        "daily_usage": round(daily_usage, 1),
        "lower_range": round(lower_range, 1),
        "upper_range": round(upper_range, 1),
        "product_advice": _product_advice_for(
            average_capacity, customer_type, exported_energy
        ),
    }

    # Weinig overschot om op te slaan: leg dat uit bij het resultaat.
    if exported_energy < 1000:
        result["note"] = LIMITED_EXPORT_NOTE

    return result
