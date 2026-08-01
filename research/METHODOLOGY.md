# Methodologie — van praktijkresultaat naar conservatieve rekenband

Dit document beschrijft, zoals verklaard door de projecteigenaar, hoe
MijnBatterij.nl-praktijkresultaten zijn omgezet naar de banden en factoren in de
calculator. Concrete aantallen/periodes zijn invulplekken (zie
`SOURCE_REGISTER.md`); dit document beschrijft de **werkwijze**, niet de ruwe data.

> Waar een processtap nog niet reproduceerbaar in de repository is vastgelegd, is
> dat een `DOCUMENTATION GAP`. Vul de invulplekken aan om het volledig
> reproduceerbaar te maken.

## 1. Welke gegevens zijn handmatig gecontroleerd

Per gedeelde praktijkcase is (volgens de projecteigenaar) gekeken naar:

- type batterij en capaciteit (kWh);
- energieleverancier en contracttype (vast / variabel / dynamisch);
- EMS/sturing (wel/geen dynamische handel);
- aanwezigheid zonnepanelen en teruglevering;
- gerapporteerd financieel resultaat (voordeel per periode).

Cases zonder controleerbare kerngegevens zijn buiten de afleiding gehouden.

**Invulplek:** exacte checklijst en aantallen → `[IN TE VULLEN — PROJECTEIGENAAR]`.

## 2. Vertaling naar conservatieve banden

Leidend principe (ook zichtbaar in de code-comments): **bewust brede, voorzichtige
banden** in plaats van puntschattingen. De werkwijze:

1. Groepeer praktijkresultaten naar contracttype, omdat de stuurruimte daar het
   sterkst van afhangt (dynamisch > variabel > vast).
2. Bepaal per groep een **onder- en bovengrens** in € per kWh batterijcapaciteit
   per jaar. De ondergrens is conservatief; de bovengrens veronderstelt gunstige
   sturing.
3. Kies de grenzen zó dat de **ondergrens ruim binnen** de praktijkobservaties
   valt (onderschatten heeft de voorkeur boven overschatten).
4. Leg het resultaat vast als de banden `SOLAR_BENEFIT_BANDS` /
   `NO_SOLAR_BENEFIT_BANDS` (`BP-PRACTICE-006` / `-007`).

Zonder zonnepanelen komt vrijwel alle waarde uit dynamische handel; de banden voor
dat pad zijn daarom bewust lager gezet en het gesprek hoort telefonisch gevoerd te
worden (zie de comments bij `NO_SOLAR_BENEFIT_BANDS`).

## 3. Afgeleide correctiefactoren

Bovenop de basisband zijn kleine correcties toegepast voor extra elektrificatie en
vermeden kosten, elk begrensd zodat de indicatie nooit hard wegloopt van de band:

- warmtepomp (`HEAT_PUMP_FACTORS`, `BP-PRACTICE-008`);
- elektrische auto/laadpaal (`EV_FACTORS`, `BP-PRACTICE-009`);
- vermeden terugleverkosten, alleen zon-pad (`RETURN_COSTS_FACTOR`, `BP-PRACTICE-010`);
- totaalplafond op de gecombineerde factor (`MAX_TOTAL_FACTOR`, `BP-PRACTICE-011`);
- ~30% extra opslagruimte voor handel/dynamisch in de capaciteitsformule
  (`TRADING_MULTIPLIER`, `BP-PRACTICE-002`);
- representatieve middelpunten per teruglever-bandbreedte (`SUNNY_DAY_EXPORT_VALUES`,
  `BP-PRACTICE-004`).

Deze zijn geclassificeerd als **PRACTICE-DERIVED ASSUMPTION**: gebaseerd op de
praktijk, maar met een interpretatiestap.

**Invulplek:** onderbouwing per factor (waarom precies deze waarde) →
`[IN TE VULLEN — PROJECTEIGENAAR]`.

## 4. Uitschieterbeleid — wat wel/niet is meegenomen

Uitgangspunt van de projecteigenaar:

- **Niet meegenomen:** extreem gunstige uitschieters (bijv. uitzonderlijk actieve
  handelaren onder ideale marktomstandigheden) — deze zouden de bovengrens
  onrealistisch optrekken.
- **Wel meegenomen, dempend:** conservatieve/lagere uitkomsten, om de ondergrens
  veilig te houden.
- **Behandeling twijfelgevallen:** cases met onvolledige gegevens buiten de
  afleiding gehouden i.p.v. geschat.

**Invulplek:** concrete uitsluitcriteria en aantal uitgesloten cases →
`[IN TE VULLEN — PROJECTEIGENAAR]`.

## 5. Reproduceerbaarheid & grenzen

- De banden zijn **indicatief**, geen garantie (zie `DISCLAIMER` in
  `calculators/stage2.py`).
- Zolang de invulplekken open staan, is de afleiding **niet volledig
  reproduceerbaar** vanuit de repository (`DOCUMENTATION GAP`).
- Bij herziening van praktijkdata: pas de banden aan via `calculators/stage2.py`
  en werk het bijbehorende `BP-PRACTICE`-ID + dit document bij, zodat code en
  onderbouwing synchroon blijven.
