"""Valideer/ververs het canonieke praktijkbestand (MijnBatterij-referentie).

Het bestand ``data/practice/CANONICAL_PRACTICE_REFERENCE.json`` is een
handmatig gecontroleerde bron-momentopname: de gepubliceerde ranges en
gerapporteerde N's worden bij een bronupdate direct in de JSON bewerkt en
reviewd. Dit script bevat daarom bewust GEEN datavelden (de JSON is de enige
numerieke bron); het automatiseert uitsluitend wat afleidbaar of controleerbaar
is:

- structuurvalidatie (verplichte velden, bekende sample-klassen);
- consistentie (eur_min <= eur_max; n == 1 <=> sample "N1");
- herberekening van de afgeleide velden eur_per_kwh_min/max
  (= eur / capacity_kwh, afgerond op 1 decimaal);
- verversen van ``generated_at`` bij een schrijfactie.

Gebruik:
    python scripts/practice/refresh_practice_reference.py --check   # alleen valideren
    python scripts/practice/refresh_practice_reference.py           # valideren + herschrijven

Exitcode 1 bij validatiefouten of (in --check-modus) afwijkende afgeleide
velden. Mediaan/gemiddelde/percentielen worden nooit berekend: de bron
publiceert uitsluitend min-max-ranges.
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL = REPO_ROOT / "data" / "practice" / "CANONICAL_PRACTICE_REFERENCE.json"

REQUIRED_DOC_FIELDS = ("schema", "classification", "source", "systems")
REQUIRED_SYSTEM_FIELDS = (
    "id", "name", "capacity_kwh", "inverter_kw", "n", "eur_min", "eur_max",
    "sample", "partial_year",
)
SAMPLE_CLASSES = {"LARGE", "SMALL", "N1"}


def _derived(system):
    return (
        round(system["eur_min"] / system["capacity_kwh"], 1),
        round(system["eur_max"] / system["capacity_kwh"], 1),
    )


def validate(doc):
    problems = []
    for field in REQUIRED_DOC_FIELDS:
        if field not in doc:
            problems.append(f"documentveld ontbreekt: {field}")
    for system in doc.get("systems", []):
        sid = system.get("id", "<zonder id>")
        for field in REQUIRED_SYSTEM_FIELDS:
            if field not in system:
                problems.append(f"{sid}: veld ontbreekt: {field}")
                break
        else:
            if system["eur_min"] > system["eur_max"]:
                problems.append(f"{sid}: eur_min > eur_max")
            if system["sample"] not in SAMPLE_CLASSES:
                problems.append(f"{sid}: onbekende sample-klasse {system['sample']!r}")
            if (system["n"] == 1) != (system["sample"] == "N1"):
                problems.append(f"{sid}: n={system['n']} strijdig met sample={system['sample']!r}")
            if system["capacity_kwh"] <= 0 or system["n"] < 1:
                problems.append(f"{sid}: ongeldige capaciteit of n")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true",
                        help="alleen valideren; niets herschrijven")
    args = parser.parse_args()

    with open(CANONICAL, encoding="utf-8") as fh:
        doc = json.load(fh)

    problems = validate(doc)
    stale = []
    for system in doc.get("systems", []):
        per_kwh_min, per_kwh_max = _derived(system)
        if (system.get("eur_per_kwh_min") != per_kwh_min
                or system.get("eur_per_kwh_max") != per_kwh_max):
            stale.append(system["id"])
            system["eur_per_kwh_min"] = per_kwh_min
            system["eur_per_kwh_max"] = per_kwh_max

    if problems:
        for problem in problems:
            print(f"FOUT: {problem}", file=sys.stderr)
        return 1

    if args.check:
        if stale:
            print("Afgeleide eur_per_kwh-velden verouderd voor: "
                  + ", ".join(stale), file=sys.stderr)
            return 1
        print(f"OK: {len(doc['systems'])} systemen, afgeleide velden consistent.")
        return 0

    doc["generated_at"] = datetime.now(timezone.utc).isoformat()
    with open(CANONICAL, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(doc, ensure_ascii=False, indent=2))
    print(f"Herschreven: {CANONICAL.relative_to(REPO_ROOT)} "
          f"({len(doc['systems'])} systemen; afgeleid ververst: {len(stale)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
