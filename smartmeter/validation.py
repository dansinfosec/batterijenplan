"""Strikte, stateloze validatie van het smartmeter-analyse-request.

Privacy: deze module logt niets en bewaart niets. Intervaldata bestaat alleen
in het request-geheugen; foutmeldingen bevatten hooguit indexen en aantallen,
nooit de energiegegevens zelf.
"""

import math
from datetime import datetime, timezone

SUPPORTED_SOURCES = {"homewizard"}
SUPPORTED_INTERVAL_MINUTES = {15}
# Financiële scenario's; None = alleen fysieke simulatie.
SUPPORTED_FINANCIAL_SCENARIOS = {"study_2027_post_fixed"}

# Ondergrens: minimaal één volledige dag aan kwartieren; minder data levert
# geen zinvolle batterijsimulatie op.
MIN_INTERVALS = 96
# Bovengrens: een vol jaar kwartieren (35.040) plus ~5% tolerantie voor
# schrikkeljaren/overlap. Grotere payloads worden geweigerd, niet ingekort.
MAX_INTERVALS = 36_864
# Fysieke absurditeitsgrens per kwartier (100 kWh in 15 min = 400 kW).
MAX_KWH_PER_INTERVAL = 100.0


class SmartMeterValidationError(Exception):
    """Gestructureerde API-fout: code + detail (veilig om terug te geven)."""

    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


def _err(code: str, detail: str):
    raise SmartMeterValidationError(code, detail)


def _parse_timestamp(value, index: int) -> int:
    """Epoch-ms (number) of ISO-8601 (string) -> epoch-ms (int, UTC).

    Metertijden zijn een naïeve uniforme klok; naïeve ISO-strings worden als
    UTC geïnterpreteerd — zelfde conventie als de frontend-parser.
    """
    if isinstance(value, bool):
        _err("INVALID_TIMESTAMP", f"interval[{index}].timestamp is geen tijdstip")
    if isinstance(value, (int, float)):
        if not math.isfinite(value):
            _err("INVALID_TIMESTAMP", f"interval[{index}].timestamp is niet eindig")
        ms = int(value)
        # plausibiliteitsvenster: 2000-01-01 .. 2100-01-01
        if not (946_684_800_000 <= ms <= 4_102_444_800_000):
            _err("INVALID_TIMESTAMP", f"interval[{index}].timestamp valt buiten het geldige bereik")
        return ms
    if isinstance(value, str):
        raw = value.strip().replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            _err("INVALID_TIMESTAMP", f"interval[{index}].timestamp is geen geldig tijdstip")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1000)
    _err("INVALID_TIMESTAMP", f"interval[{index}].timestamp heeft een ongeldig type")


def _parse_energy(obj, key: str, index: int) -> float:
    value = obj.get(key)
    if value is None or isinstance(value, bool) or not isinstance(value, (int, float)):
        _err("INVALID_ENERGY", f"interval[{index}].{key} ontbreekt of is geen getal")
    v = float(value)
    if not math.isfinite(v):
        _err("INVALID_ENERGY", f"interval[{index}].{key} is niet eindig (NaN/Infinity)")
    if v < 0:
        _err("NEGATIVE_ENERGY", f"interval[{index}].{key} is negatief")
    if v > MAX_KWH_PER_INTERVAL:
        _err("IMPLAUSIBLE_ENERGY", f"interval[{index}].{key} overschrijdt {MAX_KWH_PER_INTERVAL} kWh per interval")
    return v


def validate_request(data) -> dict:
    """Valideer en normaliseer het request.

    Returns: {"source", "interval_minutes", "intervals": [(ts_ms, import_kwh,
    export_kwh), ...] chronologisch}, of raiset SmartMeterValidationError.
    """
    if not isinstance(data, dict):
        _err("INVALID_BODY", "Request-body moet een JSON-object zijn")

    source = data.get("source")
    if source not in SUPPORTED_SOURCES:
        _err("UNSUPPORTED_SOURCE", f"source moet één van {sorted(SUPPORTED_SOURCES)} zijn")

    interval_minutes = data.get("interval_minutes")
    if interval_minutes not in SUPPORTED_INTERVAL_MINUTES:
        _err(
            "UNSUPPORTED_INTERVAL",
            f"interval_minutes moet één van {sorted(SUPPORTED_INTERVAL_MINUTES)} zijn",
        )

    # Financieel scenario is opt-in: veld weggelaten of expliciet null ->
    # None (alleen fysieke simulatie). Alleen een expliciet ondersteund
    # scenario schakelt financiële waardering in.
    scenario = data.get("financial_scenario")
    if scenario is not None and scenario not in SUPPORTED_FINANCIAL_SCENARIOS:
        _err(
            "UNKNOWN_FINANCIAL_SCENARIO",
            f"financial_scenario moet null of één van {sorted(SUPPORTED_FINANCIAL_SCENARIOS)} zijn",
        )

    raw = data.get("intervals")
    if not isinstance(raw, list) or not raw:
        _err("MISSING_INTERVALS", "intervals moet een niet-lege lijst zijn")
    if len(raw) > MAX_INTERVALS:
        _err("TOO_MANY_INTERVALS", f"maximaal {MAX_INTERVALS} intervallen per analyse (±1 jaar)")
    if len(raw) < MIN_INTERVALS:
        _err("TOO_FEW_INTERVALS", f"minimaal {MIN_INTERVALS} intervallen (één volledige dag) vereist")

    parsed = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            _err("INVALID_INTERVAL", f"interval[{i}] is geen object")
        ts = _parse_timestamp(item.get("timestamp"), i)
        imp = _parse_energy(item, "import_kwh", i)
        exp = _parse_energy(item, "export_kwh", i)
        parsed.append((ts, imp, exp))

    # Chronologisch normaliseren is veilig; duplicaten zijn dat niet — die
    # wijzen op een defecte export en worden geweigerd (niet stilletjes
    # gededupliceerd).
    parsed.sort(key=lambda t: t[0])
    step_ms = interval_minutes * 60_000
    for i in range(1, len(parsed)):
        if parsed[i][0] == parsed[i - 1][0]:
            _err("DUPLICATE_TIMESTAMP", f"dubbel tijdstip op gesorteerde index {i}")

    # Het opgegeven meetinterval moet ook het dominante werkelijke raster
    # zijn; gaten zijn toegestaan (worden gerapporteerd, nooit bijverzonnen).
    diffs = {}
    for i in range(1, len(parsed)):
        d = parsed[i][0] - parsed[i - 1][0]
        diffs[d] = diffs.get(d, 0) + 1
    if diffs:
        modal = max(diffs.items(), key=lambda kv: (kv[1], -kv[0]))[0]
        if modal != step_ms:
            _err(
                "INTERVAL_MISMATCH",
                f"dominante tijdstap ({modal // 60000} min) wijkt af van interval_minutes ({interval_minutes})",
            )

    return {
        "source": source,
        "interval_minutes": interval_minutes,
        "financial_scenario": scenario,
        "intervals": parsed,
    }
