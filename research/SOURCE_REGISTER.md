# Bronregister

Overzicht van de bronnen achter de calculatorwaarden. Per bron: aard, wat ervan is
gebruikt, en welke gegevens nog door de projecteigenaar moeten worden vastgelegd.

> Geen enkel getal hieronder is door de assistent ingevuld waar het niet in de
> repository staat. Ontbrekende registraties staan als `[IN TE VULLEN —
> PROJECTEIGENAAR]`.

---

## BRON 1 — MijnBatterij.nl (praktijkbron)

- **Aard:** Praktijkresultaten die Nederlandse thuisbatterij-gebruikers zelf delen
  (werkelijke resultaten van batterij, leverancier, EMS en dynamische handel).
- **Rol:** Primaire onderbouwing van de **opbrengstbanden** (`BP-PRACTICE-006`,
  `BP-PRACTICE-007`) en, via interpretatie, van de **afgeleide factoren**
  (`BP-PRACTICE-002`, `-004`, `-008` t/m `-011`).
- **Verwerking:** Handmatig door de projecteigenaar gecontroleerd en vertaald naar
  conservatieve rekenbanden. Zie `METHODOLOGY.md`.
- **Traceerbaarheid in repo:** **DOCUMENTATION GAP** — de oorspronkelijke cases en
  handmatige onderzoeksstappen staan nog niet in deze repository.

### Nog vast te leggen door de projecteigenaar
| Veld | Waarde |
|---|---|
| Aantal beoordeelde installaties/cases | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Periode van dataverzameling (van–tot) | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Peildatum laatste controle | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Verdeling contracttypen (dynamisch/variabel/vast) | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Voorbeeld-geaggregeerde uitkomst (bijv. mediaan €/jaar) | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Wijze van anonimiseren / aggregeren | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Verwijzing/URL of exportlocatie van het brondossier | `[IN TE VULLEN — PROJECTEIGENAAR]` |

> **Let op:** de eerder in de vraagstelling genoemde specifieke getallen
> (mediaan €764/jaar, bandbreedte €650–€900, gunstige scenario's €1.260–€1.460,
> "300+ installaties") komen **niet** in de repository voor. Ze zijn hier bewust
> **niet** als feit opgenomen; vul ze in bovenstaande tabel in zodra het
> brondossier beschikbaar is, met verwijzing naar de onderliggende registratie.

---

## BRON 2 — Leveranciers-/inkoopprijslijsten (productcatalogus)

- **Aard:** Productnamen, capaciteiten (kWh) en prijzen (€) van batterijsystemen.
- **Rol:** `BP-PRACTICE-005` — `RESIDENTIAL_CATALOG` / `BUSINESS_CATALOG` in
  `calculators/services.py`.
- **Herkomst:** Leveranciers-/inkoopprijslijsten. **Geen** MijnBatterij-praktijkdata.
- **Traceerbaarheid:** **DOCUMENTATION GAP**.

### Nog vast te leggen
| Veld | Waarde |
|---|---|
| Leverancier(s) van de prijslijst | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Peildatum prijzen | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Incl./excl. btw en installatie (staat deels in code) | `[IN TE VULLEN — PROJECTEIGENAAR]` |

---

## BRON 3 — Nationaal Warmtefonds (publiek rekenvoorbeeld)

- **Aard:** Publieke voorwaarden voor een energiebespaarlening.
- **Rol:** `BP-PRACTICE-013` — `WARMTEFONDS_EXAMPLE_*` (€ 8.500 / 10 jaar / ~€ 71 p.m.
  bij 0% rente) in `calculators/stage2.py`, als vast rekenvoorbeeld.
- **Herkomst:** Publieke Warmtefonds-voorwaarden. **Geen** MijnBatterij-data,
  **geen** offerte.
- **Traceerbaarheid:** **DOCUMENTATION GAP**.

### Nog vast te leggen
| Veld | Waarde |
|---|---|
| Exacte bron/URL Warmtefonds-voorwaarden | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Peildatum voorwaarden | `[IN TE VULLEN — PROJECTEIGENAAR]` |

---

## BRON 4 — Modelmatige rekenbases (geen externe bron)

- **Aard:** Modelkeuzes zonder externe databron: `SOLAR_DAYS_PER_YEAR = 250`
  (`BP-PRACTICE-001`), `SUNNY_DAY_TRIGGER_RATIO = 2` (`BP-PRACTICE-003`),
  terugverdientijd-grenzen 1–30 jaar (`BP-PRACTICE-012`).
- **Traceerbaarheid:** **DOCUMENTATION GAP** — onderbouwing te registreren of te
  koppelen aan een externe referentie (bijv. PVGIS/zonuren voor de 250 dagen).

### Nog vast te leggen
| Veld | Waarde |
|---|---|
| Onderbouwing "250 zonnige dagen" (bijv. PVGIS/KNMI-referentie) | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Onderbouwing drempel "verbruik ≥ 2× teruglevering" | `[IN TE VULLEN — PROJECTEIGENAAR]` |
| Onderbouwing terugverdientijd-grenzen 1–30 jaar | `[IN TE VULLEN — PROJECTEIGENAAR]` |

---

## Privacyregel (bindend)

Individuele, tot een persoon herleidbare gegevens uit MijnBatterij.nl worden
**nooit** in deze repository of op de website opgenomen. Alleen geaggregeerde,
geanonimiseerde bandbreedtes en methodiek horen hier thuis.
