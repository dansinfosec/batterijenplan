"""Stage 2: indicatieve terugverdientijd-analyse ná het leadformulier.

Deze service staat volledig los van calculate_battery_advice(): de bestaande
capaciteitsformule (basis = teruglevering / 250, handel × 1,3) blijft exact
ongewijzigd. Stage 2 gebruikt alleen het RESULTAAT van die berekening
(capaciteitsrange) plus de extra antwoorden om een veilige, indicatieve
bandbreedte voor maandvoordeel en terugverdientijd te geven.

Alle bedragen zijn bewust ranges — geen garanties. De telefonische controle
blijft de plek waar het echte advies ontstaat; dit rapport is de teaser die
het gesprek voorbereidt en sales de juiste context geeft.
"""

import re

from .services import _match_product

# ── Indicatieve opbrengst per kWh batterijcapaciteit per jaar (EUR) ────────
# Bewust brede, voorzichtige banden. De ondergrens is conservatief; de
# bovengrens veronderstelt gunstige sturing. Gedifferentieerd naar contract:
# bij een dynamisch contract valt er het meest te sturen, bij vast het minst.
SOLAR_BENEFIT_BANDS = {
    "dynamic": (55, 95),
    "variable": (40, 75),
    "fixed": (30, 60),
    "unknown": (35, 70),
}
# Zonder zonnepanelen is er geen eigen opwek om te verschuiven: vrijwel alle
# waarde komt uit dynamische handel. Zonder dynamisch contract is de band
# bewust laag — dat gesprek hoort telefonisch gevoerd te worden.
NO_SOLAR_BENEFIT_BANDS = {
    "dynamic": (45, 85),
    "variable": (15, 45),
    "fixed": (15, 45),
    "unknown": (20, 55),
}

# Opslagfactoren voor extra elektrificatie: meer eigen verbruik betekent meer
# nuttige inzet van de batterij. Bij elkaar begrensd op ×1,3 zodat de
# indicatie nooit hard wegloopt van de basisband.
HEAT_PUMP_FACTORS = {"all_electric": 1.10, "hybrid": 1.05}
EV_FACTORS = {"yes": 1.10, "soon": 1.05}
RETURN_COSTS_FACTOR = 1.08  # vermeden terugleverkosten (alleen zon-pad)
MAX_TOTAL_FACTOR = 1.3

PAYBACK_MIN_YEARS = 1.0
PAYBACK_MAX_YEARS = 30.0

# ── Warmtefonds-voorbeeld (vast rekenvoorbeeld, geen offerte) ──────────────
WARMTEFONDS_EXAMPLE_AMOUNT = 8500
WARMTEFONDS_EXAMPLE_YEARS = 10
WARMTEFONDS_EXAMPLE_MONTHLY = 71  # 8.500 / 120 maanden bij 0% rente

DISCLAIMER = (
    "Deze uitkomsten zijn indicatief en vormen geen garantie. De werkelijke "
    "besparing hangt af van uw verbruiksprofiel, energiecontract, installatie "
    "en marktomstandigheden. Wij controleren deze berekening telefonisch "
    "voordat u een beslissing neemt."
)
LOW_CONFIDENCE_NOTE = (
    "Voor een nauwkeurige berekening controleren wij dit telefonisch."
)

# Nederlandse labels voor het missing_data-overzicht en de sales-samenvatting.
FIELD_LABELS = {
    "contract_type": "energiecontract",
    "return_costs": "terugleverkosten",
    "heat_pump": "warmtepomp",
    "ev": "elektrische auto / laadpaal",
    "panel_count": "aantal zonnepanelen",
    "panel_power_wp": "vermogen zonnepanelen (Wp)",
    "inverter_power": "omvormervermogen",
    "grid_connection": "netaansluiting",
}

HEAT_PUMP_NL = {
    "none": "nee",
    "hybrid": "hybride",
    "all_electric": "all-electric",
    "unknown": "onbekend",
}
EV_NL = {"no": "nee", "yes": "ja", "soon": "binnenkort", "unknown": "onbekend"}
CONTRACT_NL = {
    "fixed": "vast",
    "variable": "variabel",
    "dynamic": "dynamisch",
    "unknown": "onbekend",
}
RETURN_COSTS_NL = {"yes": "ja", "no": "nee", "unknown": "onbekend"}
GRID_NL = {"1_phase": "1-fase", "3_phase": "3-fase", "unknown": "onbekend"}
WARMTEFONDS_NL = {"yes": "ja", "no": "nee", "maybe": "misschien"}


def _capacity_midpoint(calculator_result):
    """Bepaal de indicatieve capaciteit (kWh) uit het Stage 1-resultaat.

    Zon-pad: het API-resultaat bevat lower_range/upper_range (floats).
    Geen-zon-pad: de eerste indicatie bevat een tekstrange als "10 – 14 kWh";
    daaruit parsen we de getallen. Lukt geen van beide, dan is de capaciteit
    onbekend en zakt het vertrouwen (missing_data) — nooit gokken.
    """
    if not isinstance(calculator_result, dict):
        return None

    lower = calculator_result.get("lower_range")
    upper = calculator_result.get("upper_range")
    if isinstance(lower, (int, float)) and isinstance(upper, (int, float)) and upper > 0:
        return (lower + upper) / 2

    range_text = calculator_result.get("range")
    if isinstance(range_text, str):
        numbers = [float(n.replace(",", ".")) for n in re.findall(r"\d+(?:[.,]\d+)?", range_text)]
        if len(numbers) >= 2:
            return (numbers[0] + numbers[1]) / 2
        if len(numbers) == 1:
            return numbers[0]

    return None


def _round_to_5(value):
    return int(round(value / 5.0) * 5)


def _round_half_year(value):
    return round(value * 2) / 2


def build_stage2_report(calculator_inputs, calculator_result, answers):
    """Bouw het Stage 2-rapport uit Stage 1-data + de extra antwoorden.

    Geeft altijd een compleet rapport terug: bij ontbrekende data worden de
    banden breder, zakt confidence_level en groeit missing_data — er wordt
    nooit een fout gegooid richting de bezoeker die net een lead achterliet.
    """
    inputs = calculator_inputs if isinstance(calculator_inputs, dict) else {}
    has_solar = inputs.get("has_solar")
    solar_path = has_solar in ("yes", "planned")
    customer_type = inputs.get("customer_type", "residential")

    contract = answers.get("contract_type") or "unknown"
    heat_pump = answers.get("heat_pump") or "unknown"
    ev = answers.get("ev") or "unknown"
    return_costs = answers.get("return_costs") or "unknown"
    grid_connection = answers.get("grid_connection") or ""
    warmtefonds_check = answers.get("warmtefonds_check") or ""
    panel_count = answers.get("panel_count")
    panel_power_wp = answers.get("panel_power_wp")
    inverter_power = answers.get("inverter_power")

    # ── Capaciteit + investering ──
    capacity = _capacity_midpoint(calculator_result)
    missing_data = []
    if capacity is None:
        # Zonder Stage 1-resultaat rekenen we met een gangbaar woningsysteem;
        # dat staat expliciet in missing_data en drukt het vertrouwen.
        capacity = 10.0
        missing_data.append("capaciteitsberekening uit stap 1")

    _, _, investment, _ = _match_product(capacity, customer_type)

    # ── Jaaropbrengst-band ──
    bands = SOLAR_BENEFIT_BANDS if solar_path else NO_SOLAR_BENEFIT_BANDS
    band_min, band_max = bands.get(contract, bands["unknown"])

    factor = 1.0
    factor *= HEAT_PUMP_FACTORS.get(heat_pump, 1.0)
    factor *= EV_FACTORS.get(ev, 1.0)
    if solar_path and return_costs == "yes":
        factor *= RETURN_COSTS_FACTOR
    factor = min(factor, MAX_TOTAL_FACTOR)

    yearly_min = max(_round_to_5(capacity * band_min * factor), 5)
    yearly_max = max(_round_to_5(capacity * band_max * factor), yearly_min + 5)
    monthly_min = max(int(yearly_min / 12), 1)
    monthly_max = max(int(round(yearly_max / 12)), monthly_min + 1)

    # ── Terugverdientijd (investering / jaaropbrengst, begrensd) ──
    payback_min = _round_half_year(
        min(max(investment / yearly_max, PAYBACK_MIN_YEARS), PAYBACK_MAX_YEARS)
    )
    payback_max = _round_half_year(
        min(max(investment / yearly_min, PAYBACK_MIN_YEARS), PAYBACK_MAX_YEARS)
    )

    # ── Ontbrekende gegevens + confidence ──
    if contract == "unknown":
        missing_data.append(FIELD_LABELS["contract_type"])
    if return_costs == "unknown":
        missing_data.append(FIELD_LABELS["return_costs"])
    if heat_pump == "unknown":
        missing_data.append(FIELD_LABELS["heat_pump"])
    if ev == "unknown":
        missing_data.append(FIELD_LABELS["ev"])
    if solar_path and not panel_count:
        missing_data.append(FIELD_LABELS["panel_count"])
    if solar_path and not panel_power_wp:
        missing_data.append(FIELD_LABELS["panel_power_wp"])
    if solar_path and not inverter_power:
        missing_data.append(FIELD_LABELS["inverter_power"])
    if grid_connection in ("", "unknown"):
        missing_data.append(FIELD_LABELS["grid_connection"])

    core_known = (
        contract != "unknown"
        and return_costs != "unknown"
        and (heat_pump != "unknown" or ev != "unknown")
    )
    advanced_known = sum(
        1
        for v in (panel_count, panel_power_wp, inverter_power)
        if v
    ) + (1 if grid_connection in ("1_phase", "3_phase") else 0)

    if core_known and advanced_known >= 2:
        confidence_level = "hoog"
    elif core_known:
        confidence_level = "normaal"
    else:
        confidence_level = "laag"

    # ── Warmtefonds-voorbeeld (alleen als de bezoeker erom vraagt) ──
    warmtefonds = None
    if warmtefonds_check in ("yes", "maybe"):
        if monthly_min >= WARMTEFONDS_EXAMPLE_MONTHLY:
            comparison = (
                "Uw indicatieve maandvoordeel ligt daarmee rond of boven het "
                "voorbeeldmaandbedrag — indicatief en geen garantie."
            )
        else:
            comparison = (
                "Uw indicatieve maandvoordeel kan lager liggen dan het "
                "voorbeeldmaandbedrag — indicatief en geen garantie."
            )
        warmtefonds = {
            "example_amount": WARMTEFONDS_EXAMPLE_AMOUNT,
            "example_years": WARMTEFONDS_EXAMPLE_YEARS,
            "example_interest": "0%",
            "example_monthly": WARMTEFONDS_EXAMPLE_MONTHLY,
            "text": (
                "Rekenvoorbeeld Warmtefonds: € 8.500 lenen over 10 jaar tegen "
                "0% rente komt onder voorwaarden neer op ongeveer € 71 per "
                f"maand. {comparison} Wij controleren dit telefonisch."
            ),
        }

    # ── Sales-samenvatting (compact, voor het belgesprek) ──
    summary_parts = [
        f"Warmtepomp: {HEAT_PUMP_NL.get(heat_pump, heat_pump)}",
        f"EV/laadpaal: {EV_NL.get(ev, ev)}",
        f"Contract: {CONTRACT_NL.get(contract, contract)}",
        f"Terugleverkosten: {RETURN_COSTS_NL.get(return_costs, return_costs)}",
    ]
    if panel_count:
        summary_parts.append(f"Panelen: {panel_count}")
    if panel_power_wp:
        summary_parts.append(f"PV-vermogen: {panel_power_wp} Wp")
    if inverter_power:
        summary_parts.append(f"Omvormer: {inverter_power} kW")
    if grid_connection:
        summary_parts.append(
            f"Netaansluiting: {GRID_NL.get(grid_connection, grid_connection)}"
        )
    if warmtefonds_check:
        summary_parts.append(
            f"Warmtefonds-check: {WARMTEFONDS_NL.get(warmtefonds_check, warmtefonds_check)}"
        )
    summary_parts.append(
        f"Indicatie: € {monthly_min}–{monthly_max}/mnd, "
        f"terugverdientijd {payback_min:g}–{payback_max:g} jaar "
        f"(vertrouwen: {confidence_level})"
    )

    report = {
        "estimated_monthly_benefit_min": monthly_min,
        "estimated_monthly_benefit_max": monthly_max,
        "estimated_yearly_benefit_min": yearly_min,
        "estimated_yearly_benefit_max": yearly_max,
        "estimated_payback_years_min": payback_min,
        "estimated_payback_years_max": payback_max,
        "confidence_level": confidence_level,
        "missing_data": missing_data,
        "sales_summary": " · ".join(summary_parts),
        "disclaimer": DISCLAIMER,
        "warmtefonds": warmtefonds,
    }
    if confidence_level == "laag":
        report["confidence_note"] = LOW_CONFIDENCE_NOTE
    return report
