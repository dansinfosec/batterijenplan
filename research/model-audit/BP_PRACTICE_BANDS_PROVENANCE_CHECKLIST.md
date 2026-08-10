# Provenance-checklist — BP-PRACTICE-006 / BP-PRACTICE-007 (opbrengstbanden)

*Doel: de afleiding van `SOLAR_BENEFIT_BANDS` en `NO_SOLAR_BENEFIT_BANDS`
(`calculators/stage2.py`) reproduceerbaar maken. De bandwaarden zelf worden
NIET gewijzigd; dit document lijst uitsluitend wat de projecteigenaar moet
vastleggen. Geen enkel veld hieronder is door de assistent ingevuld — invullen
mag alleen vanuit het werkelijke brondossier.*

Huidige status (zie `research/SOURCE_REGISTER.md`, `research/METHODOLOGY.md`,
`research/CALCULATOR_MAPPING.md`): classificatie **PRACTICE DATA — MANUALLY
VERIFIED**, methode beschreven, maar case-aantallen, periode en exacte
aggregatie zijn **DOCUMENTATION GAP**.

## In te vullen door de projecteigenaar

| # | Vraag | Antwoord |
|---|---|---|
| 1 | **Bronsnapshot + peildatum** — welke MijnBatterij.nl-momentopname (datum, URL/export) lag onder de afleiding? | `[IN TE VULLEN]` |
| 2 | **Aantal beoordeelde cases** — totaal en per contracttype (dynamisch/variabel/vast) en per pad (zon/geen-zon). | `[IN TE VULLEN]` |
| 3 | **Systemen/cases opgenomen** — lijst (geanonimiseerd) van meegenomen installaties met kWh, kW, EMS/leverancier, contracttype. | `[IN TE VULLEN]` |
| 4 | **Systemen/cases uitgesloten** — welke zijn buiten de afleiding gehouden? | `[IN TE VULLEN]` |
| 5 | **Reden per uitsluiting** — onvolledige kerngegevens, extreem gunstige uitschieter, anders? (METHODOLOGY.md noemt beide categorieën, zonder aantallen.) | `[IN TE VULLEN]` |
| 6 | **Waarnemingsperiode** — van–tot van de gebruikte resultaten; hoe zijn resultaten over verschillende marktjaren behandeld? | `[IN TE VULLEN]` |
| 7 | **Contractgroepering** — hoe is per case het contracttype vastgesteld, en waar vielen twijfelgevallen (bijv. "dynamic_self")? | `[IN TE VULLEN]` |
| 8 | **Ondergrens-regel** — de concrete regel waarmee de bandondergrens per groep is gekozen ("ruim binnen de observaties" — hoe ruim, t.o.v. welk punt?). | `[IN TE VULLEN]` |
| 9 | **Bovengrens-regel** — idem voor de bovengrens ("gunstige sturing" — welk criterium?). | `[IN TE VULLEN]` |
| 10 | **Normalisatie naar €/kWh/jaar** — welke capaciteit is gebruikt (nominaal of bruikbaar), en hoe zijn resultaten van uiteenlopende systeemgroottes genormaliseerd? | `[IN TE VULLEN]` |
| 11 | **Behandeling deeljaar-resultaten** — zijn partial-year-cases geannualiseerd, uitgesloten, of anders behandeld? | `[IN TE VULLEN]` |
| 12 | **Behandeling N=1-meldingen** — telden losse meldingen mee, en zo ja met welk gewicht? | `[IN TE VULLEN]` |
| 13 | **Zon-pad vs geen-zon-pad** — op basis waarvan zijn cases aan `NO_SOLAR_BENEFIT_BANDS` toegewezen; hoeveel geen-zon-cases waren er werkelijk? | `[IN TE VULLEN]` |
| 14 | **Resulterende band per groep** — per contracttype de afgeleide (onder, boven) mét verwijzing naar de onderliggende cases, ter controle tegen de codewaarden. | `[IN TE VULLEN]` |
| 15 | **Relatie tot CANONICAL_PRACTICE_REFERENCE.json** — is de 9-systemendataset (2025) dezelfde bron als het bandendossier, een subset, of een latere snapshot? | `[IN TE VULLEN]` |
| 16 | **Anonimisering/aggregatie** — hoe is geborgd dat geen individuele gebruikersdata herleidbaar is (bindende privacyregel, SOURCE_REGISTER.md)? | `[IN TE VULLEN]` |

## Afgeleide factoren (zelfde dossier, aparte registratie)

Voor `TRADING_MULTIPLIER` (1,3), `HEAT_PUMP_FACTORS`, `EV_FACTORS`,
`RETURN_COSTS_FACTOR` (1,08) en `MAX_TOTAL_FACTOR` (1,3): per factor de
praktijkobservatie(s) waaruit de waarde volgt — zie de open invulplekken in
`research/assumptions/calculator-values.md`.

## Wanneer is dit "af"?

Zodra 1–16 zijn ingevuld en in `research/SOURCE_REGISTER.md` (BRON 1) zijn
verwerkt, kan de classificatie in `CALCULATOR_MAPPING.md` van "MANUALLY
VERIFIED (DOCUMENTATION GAP in afleiding)" naar volledig **VERIFIED /
reproduceerbaar**. Tot die tijd blijven de banden ongewijzigd in gebruik als
conservatieve indicatie.
