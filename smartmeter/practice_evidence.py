"""Gerapporteerde-praktijk-laag (MijnBatterij.nl 2025) voor de smartmeter-API.

Twee strikt gescheiden bewijslagen voor handelsopbrengst:

A. ``calculator_trading_band_block`` — de bestaande conservatieve
   Batterijenplan-praktijkband uit ``calculators.stage2``
   (BP-PRACTICE-006/-007). De bandwaarden worden geïMPORTEERD, nooit
   gedupliceerd; de Stage 1/Stage 2-methodiek blijft ongewijzigd.
B. ``reported_practice_evidence_block`` — de onderliggende GERAPPORTEERDE
   MijnBatterij-praktijksystemen uit het canonieke, getrackte bronbestand
   ``data/practice/CANONICAL_PRACTICE_REFERENCE.json``. Batterijenplan bezit
   geen ruwe individuele waarnemingen: de bron bevat gepubliceerde
   praktijk-ranges met gerapporteerde steekproefaantallen. Terminologie is
   daarom overal "gerapporteerde praktijkresultaten", nooit "door
   Batterijenplan waargenomen resultaten".

REFERENTIESELECTIE: er is bewust GEEN hard statistisch matchvenster (zo'n
drempel zou niet empirisch onderbouwd zijn en creëert een kunstmatige klif).
Alle systemen worden deterministisch gerangschikt op gelijkenis — uitsluitend
capaciteitsverschil en vermogensverschil — en de dichtstbijzijnde worden als
referentie getoond mét expliciete afstandscontext (capacity_difference_pct,
power_difference_pct, beschrijvend label). Een verre referentie zegt dat
letterlijk; gelijkwaardigheid wordt nooit geïmpliceerd.

HARDE REGELS (zie ook de tests in test_practice_evidence.py):
- Geen afgeleide statistiek: de bron publiceert uitsluitend min–max-ranges;
  mediaan/gemiddelde/P10/P50/P90 mogen daar NIET uit worden afgeleid.
- Euro's worden nooit aangepast, geschaald of geïnterpoleerd — rijen zijn een
  read-only doorgeefluik; providers worden nooit samengevoegd.
- Huishoudverbruik, PV-omvang of metertiming veranderen de gerapporteerde
  euro's nooit.
- N=1-rijen blijven N1/anekdotisch gelabeld en worden nooit gegeneraliseerd.
- De praktijkeuro's en de zelfconsumptie-modelwaarde worden nergens opgeteld:
  ze concurreren om dezelfde batterij (mogelijke dubbeltelling).
"""

import json
from pathlib import Path

from django.conf import settings

from calculators.stage2 import NO_SOLAR_BENEFIT_BANDS, SOLAR_BENEFIT_BANDS

# Canonieke, getrackte bron — de ENIGE plek met de praktijkgetallen.
# Handmatig gecontroleerde bron-momentopname; onderhoud en validatie via
# scripts/practice/refresh_practice_reference.py (zie data/practice/README.md).
PRACTICE_REFERENCE_PATH = (
    Path(settings.BASE_DIR) / "data" / "practice"
    / "CANONICAL_PRACTICE_REFERENCE.json"
)

EVIDENCE_TYPE = "reported_practice_results"
# Observatieperiode zoals benoemd in de bronregel van het canonieke bestand
# ("MijnBatterij.nl 2025, as reported"). Fijnmaziger (maand/kwartaal) is in de
# bron niet vastgelegd.
PERIOD = "2025"

# Aantal dichtstbijzijnde hardware-referenties in het API-blok. Een
# presentatiekeuze (klein houden), géén statistisch relevantievenster: de
# volledige ranking blijft deterministisch en de sterkste steekproef wordt
# apart als large_sample_reference getoond.
NEAREST_REFERENCE_COUNT = 3

# Provider-/EMS-associatie per systeem-id, uitsluitend waar die associatie al
# in de repository is gedocumenteerd (artikelteksten en
# research/recovered-model/RESEARCH_NOTE_Thuisbatterij_Onderzoek.md). Waar de
# bron alleen een systeemnaam publiceert, blijft provider None — er wordt
# geen leverancier verzonnen.
PROVIDER_LABELS = {
    "zonneplan_nexus_20": "Zonneplan",
    "tibber_homevolt_133": "Tibber",
    "bliq_20": "Bliq",
    "alphaess_19": "Frank",
    # Associatie Groene Vrienden <-> Dyness Tower 21,3 kWh: RESEARCH_NOTE
    # ("[[Groene Vrienden]] Dyness Tower 21,3 kWh: 1 rapportage €1.139,71")
    # en het artikel wat-levert-een-thuisbatterij-op. N=1 — zie warnings.
    "dyness_solis_213": "Groene Vrienden",
    "sigenergy_242": None,
    "sigenergy_242_single": None,
    "givenergy_204": None,
    "hyxipower_212": None,
}

N1_WARNING = (
    "N=1 — anekdotisch gerapporteerd praktijkresultaat; niet generaliseren "
    "naar een gemiddelde of vlootresultaat."
)
PARTIAL_YEAR_WARNING = (
    "Bevat deeljaar-resultaten; de gepubliceerde range is geen "
    "representatieve volledige jaaropbrengst."
)
EVIDENCE_DISCLAIMER = (
    "Gerapporteerde praktijkresultaten van andere installaties (extern, "
    "MijnBatterij.nl) — geen eigen waarnemingen van Batterijenplan, geen "
    "garantie en geen voorspelling van uw eigen opbrengst."
)

_reference_cache = None


def load_practice_reference():
    """Laad (en cache) het canonieke praktijkbestand — read-only doorgeefluik."""
    global _reference_cache
    if _reference_cache is None:
        with open(PRACTICE_REFERENCE_PATH, encoding="utf-8") as fh:
            _reference_cache = json.load(fh)
    return _reference_cache


def evidence_rows():
    """Alle praktijkrijen in het API-veldformaat, waarden 1-op-1 uit de bron."""
    ref = load_practice_reference()
    rows = []
    for system in ref["systems"]:
        warnings = []
        if system["n"] == 1:
            warnings.append(N1_WARNING)
        if system["partial_year"]:
            warnings.append(PARTIAL_YEAR_WARNING)
        rows.append({
            "id": system["id"],
            "provider": PROVIDER_LABELS.get(system["id"]),
            "system": system["name"],
            "capacity_kwh": system["capacity_kwh"],
            "inverter_power_kw": system["inverter_kw"],
            "sample_n": system["n"],
            "sample_class": system["sample"],
            "period": PERIOD,
            "partial_year": system["partial_year"],
            "annual_return_min_eur": system["eur_min"],
            "annual_return_max_eur": system["eur_max"],
            "return_per_kwh_min": system["eur_per_kwh_min"],
            "return_per_kwh_max": system["eur_per_kwh_max"],
            "source": ref["source"],
            "evidence_class": ref["classification"],
            "warnings": warnings,
        })
    return rows


def dataset_metadata():
    """Bronmetadata voor het methodology-blok. total_reported_installations is
    een simpele optelling van de GERAPPORTEERDE N's (inclusief N=1- en
    deeljaar-rijen) — een telling, geen verdelingsstatistiek en geen eigen
    waarnemingen."""
    ref = load_practice_reference()
    rows = evidence_rows()
    return {
        "source": ref["source"],
        "classification": ref["classification"],
        "schema": ref["schema"],
        "path": "data/practice/CANONICAL_PRACTICE_REFERENCE.json",
        "period": PERIOD,
        "systems_count": len(rows),
        "total_reported_installations": sum(r["sample_n"] for r in rows),
        "capacity_coverage_kwh": [
            min(r["capacity_kwh"] for r in rows),
            max(r["capacity_kwh"] for r in rows),
        ],
        "statistics_policy": (
            "De bron publiceert per systeem uitsluitend een min–max-range; "
            "mediaan, gemiddelde en percentielen worden hier bewust NIET uit "
            "afgeleid."
        ),
    }


def _difference_pct(row_value, candidate_value):
    return round((row_value - candidate_value) / candidate_value * 100.0, 1)


def _distance_label(rank, capacity_difference_pct):
    prefix = (
        "Dichtstbijzijnde beschikbare praktijkreferentie"
        if rank == 1
        else "Praktijkreferentie"
    )
    magnitude = abs(capacity_difference_pct)
    if magnitude == 0.0:
        size = "systeemcapaciteit is vrijwel gelijk aan de kandidaat"
    else:
        direction = "groter" if capacity_difference_pct > 0 else "kleiner"
        size = f"systeemcapaciteit is {magnitude:g}% {direction} dan de kandidaat"
    return (
        f"{prefix}; {size}; gerapporteerd resultaat van een ander "
        "systeem/EMS — geen gelijkwaardigheid."
    )


def _annotate(row, rank, nominal_kwh, power_kw):
    annotated = dict(row)
    annotated["rank"] = rank
    annotated["capacity_difference_pct"] = _difference_pct(
        row["capacity_kwh"], nominal_kwh
    )
    annotated["power_difference_pct"] = (
        _difference_pct(row["inverter_power_kw"], power_kw) if power_kw else None
    )
    annotated["evidence_distance"] = _distance_label(
        rank, annotated["capacity_difference_pct"]
    )
    return annotated


def rank_references(nominal_kwh, power_kw):
    """Deterministische gelijkenis-ranking van ALLE praktijkrijen.

    Géén hard matchvenster: elke rij krijgt een rang op basis van uitsluitend
    (|capaciteitsverschil|, |vermogensverschil|, id). Vermogen is alleen
    tiebreaker/context, nooit filter of correctie; euro's blijven onaangepast.
    """
    rows = sorted(
        evidence_rows(),
        key=lambda r: (
            abs(r["capacity_kwh"] - nominal_kwh) / nominal_kwh,
            abs(r["inverter_power_kw"] - power_kw) / power_kw if power_kw else 0.0,
            r["id"],
        ),
    )
    return [
        _annotate(row, rank, nominal_kwh, power_kw)
        for rank, row in enumerate(rows, start=1)
    ]


def _large_sample_reference(ranked):
    """De sterkste steekproef in de dataset (bron-gelabeld sample_class LARGE),
    apart van de dichtstbijzijnde hardware-referenties. Deterministisch:
    hoogste N, dan id. Geeft None als de bron geen LARGE-rij bevat."""
    large = [r for r in ranked if r["sample_class"] == "LARGE"]
    if not large:
        return None
    best = sorted(large, key=lambda r: (-r["sample_n"], r["id"]))[0]
    reference = dict(best)
    reference["reference_type"] = "large_sample_market_context"
    reference["role"] = (
        "grote-steekproef markt-/praktijkcontext (N=%d) — GEEN "
        "hardware-equivalente referentie; zie evidence_distance voor de "
        "afstand tot de kandidaat" % best["sample_n"]
    )
    reference["also_listed_in_nearest_hardware_matches"] = (
        best["rank"] <= NEAREST_REFERENCE_COUNT
    )
    return reference


def reported_practice_evidence_block(nominal_kwh, power_kw):
    """Het per-kandidaat evidence-blok: individuele gerapporteerde rijen met
    expliciete afstandscontext — geen samenvatting, geen blending."""
    ranked = rank_references(nominal_kwh, power_kw)
    nearest = ranked[:NEAREST_REFERENCE_COUNT]
    meta = dataset_metadata()
    coverage = {
        "capacity_coverage_kwh": meta["capacity_coverage_kwh"],
        "systems_count": meta["systems_count"],
        "total_reported_installations": meta["total_reported_installations"],
    }
    low, high = meta["capacity_coverage_kwh"]
    if not (low <= nominal_kwh <= high):
        coverage["note"] = (
            "De kandidaat (%.1f kWh) valt buiten het gedekte capaciteitsbereik "
            "(%.1f–%.1f kWh); onderstaande referenties zijn de dichtstbijzijnde "
            "beschikbare, geen gelijkwaardige systemen." % (nominal_kwh, low, high)
        )
    return {
        "evidence_type": EVIDENCE_TYPE,
        "candidate_capacity_kwh": nominal_kwh,
        "candidate_power_kw": power_kw,
        "ranking_rule": (
            "deterministische gelijkenis-ranking op |capaciteitsverschil|, "
            "dan |vermogensverschil|, dan id; geen hard matchvenster, geen "
            "huishoudvariabelen, euro's onaangepast"
        ),
        "nearest_hardware_matches": nearest,
        "large_sample_reference": _large_sample_reference(ranked),
        "coverage": coverage,
        "disclaimer": EVIDENCE_DISCLAIMER,
    }


def calculator_trading_band_block(nominal_kwh, has_export):
    """De bestaande Stage 2-praktijkband (BP-PRACTICE-006/-007), ongewijzigd
    geïmporteerd uit calculators.stage2 en hier alleen gepresenteerd.

    De huishoud-correctiefactoren van Stage 2 (warmtepomp/EV/terugleverkosten,
    plafond ×1,3) vereisen vragenlijstantwoorden die niet in P1-data zitten en
    worden hier bewust NIET toegepast; ook de €5-afronding van Stage 2 blijft
    achterwege (dit blok is referentie, geen Stage 2-rapport).
    """
    bands = SOLAR_BENEFIT_BANDS if has_export else NO_SOLAR_BENEFIT_BANDS
    return {
        "source": (
            "calculators.stage2.SOLAR_BENEFIT_BANDS (BP-PRACTICE-006)"
            if has_export
            else "calculators.stage2.NO_SOLAR_BENEFIT_BANDS (BP-PRACTICE-007)"
        ),
        "classification": "PRACTICE DATA — MANUALLY VERIFIED",
        "nature": (
            "Bestaande conservatieve Batterijenplan-praktijkband (Stage 2, "
            "ongewijzigd). GEEN statistisch betrouwbaarheidsinterval, GEEN "
            "mediaan/P10/P90-schatting, en NIET geproduceerd door het "
            "geüploade meterprofiel."
        ),
        "methodology": "research/METHODOLOGY.md (conservatieve banden uit "
                       "MijnBatterij-praktijk, per contracttype)",
        "stage2_band_set": "solar" if has_export else "no_solar",
        "band_set_selection": {
            "basis": "observed_grid_export",
            "observed": (
                "teruglevering aanwezig in het genormaliseerde P1-profiel"
                if has_export
                else "geen teruglevering in het genormaliseerde P1-profiel"
            ),
            "equivalence_note": (
                "Gemeten P1-teruglevering bewijst uitsluitend dat er export "
                "was (export-observed inference: opwek achter de meter "
                "aannemelijk) — niet de opwektechnologie en niet het "
                "expliciete zonnepanelen-antwoord (ja/gepland) van de "
                "bestaande calculator. Er wordt hier dus NIET geclaimd dat "
                "de klant zonnepanelen heeft; die vraag blijft in het "
                "adviesgesprek leidend."
            ),
        },
        "basis_capacity_kwh": nominal_kwh,
        "eur_per_kwh_year_by_contract": {
            contract: [low, high] for contract, (low, high) in bands.items()
        },
        "annual_range_eur_by_contract": {
            contract: [round(nominal_kwh * low), round(nominal_kwh * high)]
            for contract, (low, high) in bands.items()
        },
        "correction_factors_note": (
            "Stage 2 past hierbovenop huishoudfactoren toe (warmtepomp/EV/"
            "terugleverkosten, plafond ×1,3) op basis van vragenlijst-"
            "antwoorden; die inputs ontbreken in P1-data en zijn hier niet "
            "toegepast."
        ),
    }


def methodology_block():
    """Methodology-sectie: bronmetadata + de niet-optellen-regel."""
    return {
        "reported_practice_source": dataset_metadata(),
        "evidence_layers": {
            "calculator_trading_band": (
                "Laag A — bestaande conservatieve Batterijenplan-praktijkband "
                "(BP-PRACTICE-006/-007), de primaire klantgerichte "
                "handelsindicatie."
            ),
            "reported_practice_evidence": (
                "Laag B — gerapporteerde MijnBatterij-praktijksystemen als "
                "referentie: individueel, ongewogen, met expliciete "
                "afstandscontext per rij."
            ),
        },
        "terminology_note": (
            "Dit zijn GERAPPORTEERDE praktijkresultaten (extern gepubliceerde "
            "ranges met gerapporteerde N's), geen door Batterijenplan "
            "waargenomen ruwe individuele resultaten."
        ),
        "personalization_policy": (
            "Praktijkreferenties worden uitsluitend gerangschikt op dimensies "
            "die in de dataset bestaan (capaciteit, vermogen); provider/EMS "
            "blijft per rij zichtbaar. Huishoudverbruik, PV-omvang of "
            "metertiming passen gerapporteerde handelsopbrengsten nooit aan."
        ),
        "not_additive_note": (
            "GERAPPORTEERDE HANDELSPRAKTIJK (laag A/B) en het SELF-CONSUMPTION "
            "MODEL (financial) zijn alternatieve inzetstrategieën voor "
            "dezelfde batterijcapaciteit. De praktijkresultaten kunnen al "
            "batterijen bevatten die meerdere strategieën combineren; de "
            "bedragen mogen daarom NIET bij elkaar worden opgeteld "
            "(dubbeltelling)."
        ),
    }
