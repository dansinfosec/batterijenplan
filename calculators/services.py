SOLAR_DAYS_PER_YEAR = 250
DAYS_PER_YEAR = 365

# Handel/dynamisch contract: ± 30% extra opslagruimte bovenop de basis.
TRADING_MULTIPLIER = 1.3


class BatteryAdviceError(Exception):
    """Raised when the input combination doesn't make sense for an advice."""


# Kernregel van het advies:
#   basis = jaarlijkse teruglevering / 250 zonnige dagen
#   zelfconsumptie: advies = basis
#   handel/dynamisch: advies = basis × 1,3
# Batterijgrootte wordt NOOIT rechtstreeks uit het jaarverbruik berekend;
# hoog verbruik mag niet automatisch een enorm systeem opleveren.

# ── Productcatalogus ──────────────────────────────────────────────────────
# (naam, capaciteit kWh, prijs €, omvormer-notitie of None)
RESIDENTIAL_CATALOG = [
    ("Dyness S3 Tower T7", 7.10, 6872.80, None),
    ("Dyness S3 Tower T10", 10.15, 7453.60, None),
    ("Dyness S3 Tower T14", 14.20, 8034.40, None),
    ("Dyness S3 Tower T17", 17.75, 8615.20, None),
    ("Dyness S3 Tower T21", 21.30, 9231.09, None),
    ("Dyness S3 Tower T28", 28.40, 12026.19, None),
    ("Dyness S3 Tower T35", 34.50, 12705.00, None),
    ("Dyness S3 Tower T42", 42.00, 13878.70, None),
    ("Dyness S3 Tower T53", 53.00, 16637.50, None),
    ("Dyness S3 Tower T63", 63.00, 18960.70, None),
    ("Dyness S3 Tower T85", 85.00, 25857.70, None),
    ("Dyness S3 Tower T88", 88.00, 27672.70, None),
    ("Dyness S3 Tower T106", 106.00, 34811.70, None),
]

BUSINESS_CATALOG = [
    ("Dyness S3 Tower T7", 7.10, 5680, None),
    ("Dyness S3 Tower T10", 10.15, 6160, None),
    ("Dyness S3 Tower T14", 14.20, 6640, None),
    ("Dyness S3 Tower T17", 17.75, 7120, None),
    ("Dyness S3 Tower T21", 21.30, 7629, None),
    ("Dyness S3 Tower T28", 28.40, 9939, None),
    ("Dyness S3 Tower T35", 34.50, 10500, None),
    ("Dyness S3 Tower T42", 42.00, 11470, None),
    ("Dyness S3 Tower T53", 53.00, 13750, None),
    ("Dyness S3 Tower T63", 63.00, 15670, None),
    ("Dyness S3 Tower T85", 85.00, 21370, None),
    ("Dyness S3 Tower T88", 88.00, 22870, None),
    ("Dyness S3 Tower T106", 106.00, 28770, None),
    ("Dyness DH100F", 107.00, 39400, "50 kW"),
    ("BOLT-215kWh", 215.00, 63567, None),
    ("Dyness DH200Y", 232.00, 64259, "100 kW"),
    ("BOLT-430kWh 2x Cabinet", 430.00, 125940, "200 kW"),
    ("BOLT-645kWh 3x Cabinet", 645.00, 166327, "300 kW"),
    ("BOLT-1075kWh 5x Cabinet", 1075.00, 264921, "500 kW"),
]

# ── Nederlandse teksten ───────────────────────────────────────────────────
LIMITED_EXPORT_NOTE = (
    "Uw teruglevering is beperkt: er is weinig zonnestroom-overschot om op "
    "te slaan. Wij adviseren daarom bewust een klein systeem."
)
SELF_CONSUMPTION_EXPLANATION = (
    "Bij zelfconsumptie baseren wij het advies op de hoeveelheid "
    "teruggeleverde zonnestroom die u op een zonnige dag kunt opslaan."
)
TRADING_EXPLANATION = (
    "Bij handel en dynamische sturing rekenen wij ongeveer 30% extra "
    "opslagruimte bovenop uw gemiddelde teruglevering per zonnige dag."
)
BUSINESS_NOTE = (
    "Zakelijke batterijadviezen zijn indicatief. Voor grotere systemen "
    "controleren wij altijd netaansluiting, omvormervermogen, piekverbruik "
    "en EMS-strategie."
)
INVERTER_NOTE = (
    "Het omvormervermogen wordt afgestemd op uw netaansluiting en kan "
    "indien nodig softwarematig worden begrensd."
)

# ── Aanvullende vraag: teruglevering op een zonnige dag ────────────────────
# Jaargemiddelden verbergen dagpieken. Bij een groot PV-systeem en hoog eigen
# verbruik kan de werkelijke teruglevering op een zonnige dag veel hoger
# liggen dan het jaargemiddelde doet vermoeden. Geldt voor béide doelen
# (zelfconsumptie én handel/dynamisch): de batterij moet minimaal kunnen
# opslaan wat één sterke zonnige dag oplevert.
SUNNY_DAY_TRIGGER_RATIO = 2  # jaarverbruik >= 2x jaarlijkse teruglevering

SUNNY_DAY_EXPORT_CHOICES = [
    ("under_10", "Minder dan 10 kWh"),
    ("10_20", "10–20 kWh"),
    ("20_30", "20–30 kWh"),
    ("30_40", "30–40 kWh"),
    ("40_50", "40–50 kWh"),
    ("over_50", "Meer dan 50 kWh"),
    ("unknown", "Ik weet het niet"),
]
# Representatieve kWh-waarde per gekozen bandbreedte (middelpunt; "unknown"
# heeft bewust geen waarde, dat houdt de bestaande berekening ongewijzigd).
SUNNY_DAY_EXPORT_VALUES = {
    "under_10": 5,
    "10_20": 15,
    "20_30": 25,
    "30_40": 35,
    "40_50": 45,
    "over_50": 60,
}

SUNNY_DAY_WARNING_TITLE = (
    "Controleer uw teruglevering op een goede zonnige dag"
)
SUNNY_DAY_WARNING_BODY = (
    "Uw jaarlijkse stroomverbruik is veel hoger dan uw jaarlijkse "
    "teruglevering. Daardoor kan een berekening op basis van jaargemiddelden "
    "uw batterijadvies onderschatten. Kijk daarom in de app van uw "
    "energieleverancier, slimme meter of omvormer hoeveel kWh u op een goede "
    "zonnige dag daadwerkelijk teruglevert aan het elektriciteitsnet. Vul "
    "niet uw totale zonne-opwek in, maar alleen de stroom die u teruglevert "
    "aan het net."
)
SUNNY_DAY_QUESTION_LABEL = (
    "Hoeveel kWh levert u op een goede zonnige dag maximaal terug aan het net?"
)
SUNNY_DAY_OVERRIDE_NOTE = (
    "Dit advies is verhoogd op basis van uw teruglevering op een goede "
    "zonnige dag: de batterij moet minimaal kunnen opslaan wat zo'n dag "
    "oplevert — die piekwaarde is een betrouwbaardere leidraad dan het "
    "jaargemiddelde."
)


def sunny_day_question_required(yearly_usage, exported_energy):
    """True als de aanvullende 'zonnige dag'-vraag getoond moet worden.

    Wanneer het jaarverbruik de jaarlijkse teruglevering ver overstijgt, kan
    een jaargemiddelde een veel hogere piek-teruglevering op zonnige dagen
    verhullen. Geldt voor beide doelen (zelfconsumptie én handel/dynamisch).
    """
    return yearly_usage >= SUNNY_DAY_TRIGGER_RATIO * exported_energy


def _format_number_nl(value):
    """21.3 → '21,3'; 42.0 → '42'; 17.75 → '17,75' (NL-decimaalkomma)."""
    text = f"{value:g}"
    return text.replace(".", ",")


def _format_price_nl(amount):
    """9231.09 → '9.231,09' (NL-notatie: punt als duizendtal, komma decimaal)."""
    text = f"{amount:,.2f}"  # 9,231.09
    return text.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def _match_product(recommended_capacity, customer_type):
    """Kies het product dat het dichtst bij de geadviseerde capaciteit ligt.

    Valt er één of meer systemen binnen de adviesrange (±10%), dan is het
    dichtstbijzijnde daarvan automatisch ook het dichtstbijzijnde totaal.
    Nooit blind het eerstvolgende grotere systeem kiezen: zo krijgt een lage
    teruglevering nooit een veel te groot systeem geadviseerd.
    """
    catalog = BUSINESS_CATALOG if customer_type == "business" else RESIDENTIAL_CATALOG

    # Dichtstbij; bij gelijke afstand wint het kleinere (goedkopere) systeem.
    return min(catalog, key=lambda p: (abs(p[1] - recommended_capacity), p[1]))


def calculate_battery_advice(
    customer_type, yearly_usage, goal, exported_energy, sunny_day_export=None
):
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
    basis = exported_energy / SOLAR_DAYS_PER_YEAR
    daily_usage = yearly_usage / DAYS_PER_YEAR

    if goal == "self_consumption":
        goal_label = "zelfconsumptie"
        explanation = SELF_CONSUMPTION_EXPLANATION
        recommended_capacity = basis
    else:
        goal_label = "handel / dynamisch energiecontract"
        explanation = TRADING_EXPLANATION
        recommended_capacity = basis * TRADING_MULTIPLIER

    # Veiligheidscheck bij hoog verbruik t.o.v. lage jaarlijkse teruglevering
    # (beide doelen): heeft de klant een piek-teruglevering op een goede
    # zonnige dag opgegeven die boven het jaargemiddelde (basis) ligt, dan
    # moet de batterij minimaal die dagopbrengst kunnen opslaan:
    # advies = max(huidig advies, zonnige-dag-teruglevering). Geen extra
    # vermenigvuldiging. De trigger wordt hier onafhankelijk herberekend
    # (nooit blind een client-waarde vertrouwen); "unknown"/geen antwoord
    # laat de bestaande berekening ongewijzigd.
    sunny_day_override_applied = False
    if sunny_day_question_required(yearly_usage, exported_energy):
        selected_sunny_day_export = SUNNY_DAY_EXPORT_VALUES.get(sunny_day_export)
        if (
            selected_sunny_day_export is not None
            and selected_sunny_day_export > basis
            and selected_sunny_day_export > recommended_capacity
        ):
            recommended_capacity = selected_sunny_day_export
            sunny_day_override_applied = True

    lower_range = recommended_capacity * 0.9
    upper_range = recommended_capacity * 1.1

    name, capacity, price, inverter = _match_product(recommended_capacity, customer_type)

    extra_notes = []
    if sunny_day_override_applied:
        extra_notes.append(SUNNY_DAY_OVERRIDE_NOTE)
    if customer_type == "business":
        extra_notes.append(BUSINESS_NOTE)
    if inverter:
        extra_notes.append(INVERTER_NOTE)

    # Prijsregel: particulier incl. btw, zakelijk excl. btw; beide inclusief
    # installatie door een InstallQ-gecertificeerd bedrijf.
    if customer_type == "business":
        price_line = (
            f"vanaf € {_format_price_nl(price)} excl. btw en inclusief "
            "installatie door een InstallQ-gecertificeerd bedrijf"
        )
    else:
        price_line = (
            f"vanaf € {_format_price_nl(price)} inclusief btw en installatie "
            "door een InstallQ-gecertificeerd bedrijf"
        )

    result = {
        "goal_label": goal_label,
        "daily_export": round(basis, 1),
        "daily_usage": round(daily_usage, 1),
        "lower_range": round(lower_range, 1),
        "upper_range": round(upper_range, 1),
        "product_name": name,
        "product_capacity": f"{_format_number_nl(capacity)} kWh",
        "product_advice": f"{name} — {_format_number_nl(capacity)} kWh",
        "product_price": price_line,
        "explanation": explanation,
        "extra_notes": extra_notes,
        "sunny_day_override_applied": sunny_day_override_applied,
    }

    # Weinig overschot om op te slaan: leg dat uit bij het resultaat.
    if exported_energy < 1000:
        result["note"] = LIMITED_EXPORT_NOTE

    return result
