# Batterijenplan — Onderzoeks- en bronregistratie

Deze map legt de **herkomst en classificatie** vast van de waarden die de
Batterijenplan-calculator gebruikt. Doel: elke rekenconstante traceerbaar maken
naar een bron, en eerlijk markeren wat nog niet traceerbaar is.

> **Belangrijk — status van deze map.** Deze documentatie is aangelegd op basis
> van een verklaring van de **projecteigenaar** over de herkomst van de
> calculatorwaarden. De onderliggende praktijkcases en de handmatige
> onderzoeksstappen zijn op dit moment **nog niet als brondossier in deze
> repository aanwezig**. Waar dat zo is, staat dat expliciet gemarkeerd als
> `DOCUMENTATION GAP`. Er zijn in deze documentatie **geen getallen, aantallen,
> periodes of voorbeelden verzonnen**: openstaande gegevens staan als expliciete
> invulplek `[IN TE VULLEN — PROJECTEIGENAAR]`.

## Structuur

| Bestand | Inhoud |
|---|---|
| `README.md` | Deze introductie, classificatielegenda en disclaimers |
| `SOURCE_REGISTER.md` | Register van gebruikte bronnen (MijnBatterij.nl, leveranciersprijslijsten, Warmtefonds) + openstaande invulvelden |
| `METHODOLOGY.md` | Hoe praktijkresultaten handmatig zijn gecontroleerd en vertaald naar conservatieve banden; uitschieterbeleid |
| `CALCULATOR_MAPPING.md` | Koppeling onderzoeks-ID ↔ codeconstante (bestand:regel) ↔ classificatie ↔ status |
| `assumptions/calculator-values.md` | Detailkaart per constante: waarde, classificatie, bron, verifieerbaarheid, gebruik |

## Classificatielegenda

Elke waarde krijgt één van de volgende labels. De labels vervangen de eerdere
kwalificatie "aanname/onbetrouwbaar": een waarde zonder terugvindbare
bronregistratie is een **documentatie-achterstand**, niet automatisch verzonnen.

| Label | Betekenis |
|---|---|
| **PRACTICE DATA — MANUALLY VERIFIED** | Direct afgeleid uit MijnBatterij.nl-praktijkresultaten, handmatig door de projecteigenaar gecontroleerd. Geldt voor de opbrengstbanden. |
| **PRACTICE-DERIVED ASSUMPTION** | Afgeleide factor/aanname, gebaseerd op de praktijkobservaties maar met een interpretatiestap (bijv. correctiefactoren, bandmiddelpunten). |
| **DOCUMENTATION GAP** | Waarde bestaat in de code en is in productie, maar de bronregistratie is (nog) niet terugvindbaar in de repository. Niet "fout" of "verzonnen" — onvolledig gedocumenteerd. |

## Onderzoeks-ID's

Iedere gedocumenteerde constante heeft een ID in de vorm `BP-PRACTICE-NNN`. Het ID
staat als comment bij de constante in de broncode én in `CALCULATOR_MAPPING.md`.
Zie dat bestand voor het volledige overzicht (`BP-PRACTICE-001` t/m
`BP-PRACTICE-013`).

## Disclaimers

- **Privacy (verplicht).** Individuele gebruikersgegevens uit MijnBatterij.nl —
  namen, adressen, installatiedetails herleidbaar tot een persoon, of ruwe
  losse cases — **mogen niet in deze repository of op de website worden
  gepubliceerd**. In dit dossier horen uitsluitend geaggregeerde, geanonimiseerde
  bandbreedtes en methodische beschrijvingen. Zie `SOURCE_REGISTER.md`.
- **Indicatief, geen garantie.** Calculator- en Stage-2-uitkomsten zijn en
  blijven **indicatief**. Ze vormen geen garantie of aanbod. De werkelijke
  besparing hangt af van verbruiksprofiel, energiecontract, installatie en
  marktomstandigheden; de telefonische controle blijft leidend. Deze disclaimer
  staat ook in de code (`calculators/stage2.py` `DISCLAIMER`).
- **Geen gedragswijziging door dit dossier.** Deze map documenteert alleen. De
  toevoeging van onderzoeks-ID's aan de code is **comment-only**: geen enkele
  formule, band, factor, API-contract of frontenduitkomst is gewijzigd.
