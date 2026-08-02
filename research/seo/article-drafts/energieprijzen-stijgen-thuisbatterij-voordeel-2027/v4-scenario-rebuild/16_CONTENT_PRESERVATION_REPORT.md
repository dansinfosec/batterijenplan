# 16 · Content preservation report

Vergelijking van de huidige live-versie met de voorgestelde scenario-rebuild. Doel: bewust behouden wat klopt en
in scope is; corrigeren wat onjuist/verouderd is; verplaatsen/verwijderen wat elders thuishoort of niet onderbouwd is.

## Behouden (retained)
- Officiele feiten: saldering stopt 1-1-2027; terugleververgoeding >=50% kaal leveringstarief 2027-2030; gescheiden
  afrekening; CBS-tarief EUR 0,25055/kWh; ACM day-ahead-context.
- Fysieke energiestromen van het voorbeeldhuishouden (3.010/1.584/1.250 kWh) en de vast-contract berekening.
- De kernboodschap dat zelf gebruiken waardevoller wordt.

## Gecorrigeerd (corrected)
- Terugleververgoeding-aanname EUR 0,06 -> **EUR 0,070** (50% van het kale leveringstarief, officiele ondergrens).
- **Herkadering** van EUR 502 e.d.: niet langer gepresenteerd als 'nieuw 2027-voordeel', maar gesplitst in totale
  waarde (A) en het **incrementele 2027-effect** (B, ~EUR 318). Dit was de belangrijkste inhoudelijke fout.
- Alle bedragen expliciet gelabeld als AFGELEIDE_BEREKENING met navraagbare invoer.

## Verplaatst (moved -> canoniek artikel)
- Volledige terugverdientijd-tabel -> terugverdientijd-thuisbatterij-handel-of-zelfconsumptie.
- Beursprijs/dynamische-leveranciers-uitleg -> dynamisch-energiecontract-thuisbatterij.
- 'EMS belangrijker dan de batterij' + energiehandel-detail -> ems-systeem-... / terugverdientijd-...
- (Verwijzingen vervangen door beschrijvende interne links, zie 10.)

## Verwijderd (removed)
- Aparte Groene Vrienden-sectie (commercieel, tijdsgebonden) — hooguit als gelabeld voorbeeld elders.
- 'Onderzoek met 135 simulaties / 300+ installaties' — niet onderbouwd in de repo (placeholder in SOURCE_REGISTER.md).
- Lange algemene stroomprijs-uitleg — ingekort tot day-ahead-context.

## Niet gewijzigd (buiten scope van deze fase)
- Productie-Post (body, titel, excerpt, SEO, tags, slug, status, published_at) — ongewijzigd; dit is een reviewdraft.

## V4-correctiepassage (samenvatting)

Deze passage bracht vijf overzekere conclusies terug tot wat de data ondersteunt: (1) dynamisch 2027-effect nu NIET GEKWANTIFICEERD i.p.v. ~EUR0; (2) EUR0,070 als scenariowaarde i.p.v. officieel tarief; (3) 1.760 kWh als gemodelleerde doorzet i.p.v. fysiek batterijmax; (4) terugleverkosten-onafhankelijkheid gekwalificeerd tot 'binnen dit model'; (5) research-input vs afgeleid model expliciet gescheiden. Detail: 18_V4_CORRECTION_REPORT.md.
