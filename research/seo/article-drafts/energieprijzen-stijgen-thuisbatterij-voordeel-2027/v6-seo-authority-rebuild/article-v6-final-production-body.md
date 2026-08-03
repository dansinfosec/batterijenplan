**Kort antwoord:** vanaf 2027 ontstaat voor een thuisbatterij een beter berekenbare waarde uit zelfconsumptie, en handelsopbrengsten uit day-ahead en onbalans kunnen daar netto bovenop komen. Onze simulatie berekent alleen de extra waarde uit zelfconsumptie en vermeden terugleverkosten. De mediane totale verandering van ongeveer €592 per jaar (12,6 kWh-batterij, terugleverkost €0,10/kWh, 25 huishoudens) is dus geen raming van de volledige batterijopbrengst. Handelsopbrengsten uit day-ahead, onbalans en andere flexibiliteitsdiensten zijn niet in dit bedrag opgenomen en kunnen daar netto bovenop komen. Binnen die €592 komt de mediane zuivere beleidscomponent (einde salderen) op ongeveer €405 en de mediane waarde van vermeden terugleverkosten op ongeveer €202; dat zijn afzonderlijke verdelingsmedianen die je niet rechtstreeks bij elkaar optelt.

> Alle zelfconsumptiebedragen zijn **scenariowaarden** uit een deterministische kwartiersimulatie op een synthetisch jaar. Het zijn geen voorspellingen, geen gegarandeerde opbrengsten en geen landelijk gemiddelde. Handelsopbrengsten worden in dit artikel niet gesimuleerd.

## Wat verandert er in 2027?

De **salderingsregeling stopt vanaf 1 januari 2027** (Rijksoverheid). Tot en met 2026 mag je je teruggeleverde zonnestroom over het jaar wegstrepen tegen je verbruik; je betaalt dan per saldo. Vanaf 2027 kan dat niet meer: je betaalt het volle tarief voor wat je van het net haalt en krijgt een aparte, lagere vergoeding voor wat je teruglevert. Wettelijk moet die terugleververgoeding **tot 2030 minimaal 50% van het kale leveringstarief** zijn, onder toezicht van de ACM.

Los daarvan rekenen veel leveranciers **terugleverkosten**: een bedrag over de stroom die je teruglevert. De ACM onderzocht deze kosten en concludeerde dat de **onderzochte** terugleverkosten *niet verboden* zijn (8 mei 2024) en *niet onredelijk* ten opzichte van de kosten die leveranciers maken (17 december 2025). Tegelijk stelde de ACM vast dat leveranciers de kosten "op allerlei verschillende manieren doorberekenen", waardoor contracten moeilijk te vergelijken zijn. Daarom schrijft de ACM in het **modelcontract vanaf 1 januari 2026** voor dat terugleverkosten **altijd per teruggeleverde kilowattuur** worden berekend. Let op: dit betekent níet dat elk (toekomstig) leverancierstarief automatisch is toegestaan — vergelijk je eigen contract altijd apart. Belangrijk voor dit artikel: terugleverkosten worden berekend over de **totale (bruto) teruglevering** — niet over een gesaldeerd saldo.

## Twee waardestromen: zelfconsumptie en energiehandel

Een thuisbatterij kan na 2027 op twee manieren waarde opleveren, en die sluiten elkaar niet uit:

**TOTALE BATTERIJWAARDE = ZELFCONSUMPTIEWAARDE + INCREMENTELE NETTO HANDELSWAARDE**

- **Zelfconsumptiewaarde (A)** — de waarde die wij wél doorrekenen: vermeden inkoop en vermeden terugleverkosten, doordat je zonnestroom opslaat en zelf gebruikt in plaats van tegen een lage vergoeding terug te leveren.
- **Incrementele netto handelswaarde (B)** — wat een slim energiebeheersysteem (EMS) er via de markt bovenop kan verdienen. Dit definiëren we als: bruto handelsopbrengst − aggregatoraandeel − EMS-kosten − incrementele degradatie − de opportuniteitskosten van verdrongen zelfconsumptie.
- **Interactie en opportuniteitskosten (C)** — beide stromen gebruiken dezelfde batterij, hetzelfde vermogen en dezelfde State of Charge. Daarom mag je de losse maxima niet naïef optellen; je telt handel pas mee ná aftrek van de zelfconsumptie die je ervoor opgeeft.

Handel is dus een **optionele, aanvullende** waardestroom. Handel kan extra netto waarde toevoegen wanneer de opbrengst hoger is dan de kosten en de waarde van het alternatief. Bij vrije en intelligente dispatch hoeft handel de zelfconsumptiewaarde niet te verlagen: het EMS handelt alleen wanneer de verwachte incrementele waarde positief is. Fabrikanten of contracten met een vast EMS-abonnement of beperkende voorwaarden kunnen deelname alsnog onaantrekkelijk maken. In dit artikel kwantificeren we alleen stroom A; stroom B lichten we kwalitatief toe.

## Hoeveel extra zelfconsumptiewaarde ontstaat na 2027?

> **Methode in het kort.** Deterministische kwartiersimulatie over een heel synthetisch jaar (35.040 intervallen van 15 minuten). Eén gedeelde batterij-laadtoestand, met omzetverlies (90% retour), standby-verbruik en degradatie per doorgezette kWh. **Alleen zelfconsumptie**: geen laden van het net, geen teruglevering voor handel. We rekenen elk huishouden twee keer af op exact dezelfde fysieke stromen: één keer met **jaarsaldering** (vóór 2027) en één keer **zonder saldering** (na 2027). Alleen de afrekening verschilt, nooit de fysica. 25 huishoudprofielen (verbruik 2.500–8.000 kWh × PV-verhouding 0,6–2,0) × 4 batterijen × 8 kostenstructuren.

De cijfers hieronder zijn **ongewogen scenariostatistieken** over die 25 profielen — een spreiding, geen gemiddelde Nederlander. Ze beschrijven waardestroom A (zelfconsumptie), niet de handelswaarde. Zolang je mag salderen, is een batterij die stroom met omzet- en standby-verliezen opslaat eigenlijk **verliesgevend**: de batterijwaarde vóór 2027 is mediaan **−€117 per jaar** voor de 12,6 kWh-batterij (spreiding −€231 … −€57). Over stroom die je zelf opwekt en direct gebruikt, betaal je bovendien geen belasting en geen kosten aan je leverancier (Rijksoverheid). Zodra salderen wegvalt, wordt [zelf opgewekte stroom opslaan](/post/stroom-opslaan-zonnepanelen) pas echt lonend en springt de batterijwaarde ná 2027 naar mediaan **€297 per jaar** (12,6 kWh, zonder terugleverkosten).

## Zuiver effect van het einde van salderen

Om te weten wat het **einde van salderen op zichzelf** doet, vergelijken we de batterijwaarde ná 2027 met die vóór 2027 — beide **zonder** terugleverkosten. Dat is het zuivere beleidseffect:

| grootheid (12,6 kWh, zonder terugleverkosten) | mediaan | spreiding (25 huishoudens) |
|---|--:|--:|
| batterijwaarde vóór 2027 (jaarsaldering) | −€117 | −€231 … −€57 |
| batterijwaarde ná 2027 (geen saldering) | €297 | €97 … €588 |
| **zuiver effect van einde salderen** | **€405** | **€172 … €760** |

![Warmtekaart van het zuivere beleidseffect per huishoudprofiel (12,6 kWh, zonder terugleverkosten), oplopend van €172 bij laag verbruik en weinig PV tot €761 bij hoog verbruik en veel PV.](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/pure-policy-effect-heatmap.svg)

*Zuiver beleidseffect (einde saldering) per huishoudprofiel, 12,6 kWh. ENGINE RESULT — spreiding over 25 profielen, geen voorspelling en geen landelijk gemiddelde.*

Dus: puur door het wegvallen van saldering wordt een 12,6 kWh-batterij mediaan zo'n **€405 per jaar** meer waard. Bij huishoudens met veel zonnepanelen en hoog verbruik loopt dat op tot €760; bij kleine profielen blijft het rond €172. Merk op: dit cijfer bevat **nog geen** terugleverkosten en **geen** handelsopbrengst.

## Hoeveel voordeel komt door vermeden terugleverkosten?

Een batterij verlaagt hoeveel je teruglevert, en verlaagt daarmee je terugleverkosten. Bij een tarief van **€0,10/kWh** is de mediane waarde daarvan **€202 per jaar** voor de 12,6 kWh-batterij (spreiding €76 … €385 over de 25 huishoudens).

Het beleidseffect en het kosteneffect zijn **onafhankelijk**: in alle gesimuleerde gevallen is de interactie tussen die twee exact €0, omdat terugleverkosten worden geheven over de bruto teruglevering, die in beide werelden identiek is. Je mag ze **per huishouden** optellen (alleen voor deze zelfconsumptie-berekening), maar let op: dat geldt *per scenario*, niet voor de losse medianen van de hele verdeling — de mediaan van een som is niet de som van de medianen.

Een transparante voorbeeldberekening voor één representatief scenario — het scenario waarvan de totale verandering het dichtst bij de mediaan ligt (profiel C3500\_R2.00: 3.500 kWh verbruik, PV-verhouding 2,0; 12,6 kWh; terugleverkost €0,10/kWh):

- batterijwaarde vóór 2027 (saldering): **−€93**
- zuiver beleidseffect (einde saldering): **+€390**
- vermeden terugleverkosten: **+€202**
- interactie: **€0**
- totale verandering: **€592 per jaar** (de zelfconsumptiewaarde ná 2027 mét kosten is voor dit scenario €499)

Voor dít scenario tellen de zelfconsumptie-componenten exact op: €390 + €202 + €0 = €592. Dit is **één representatief scenario — geen landelijk gemiddelde en geen decompositie van de afzonderlijke medianen** — en het beschrijft alleen zelfconsumptie, niet de handelswaarde.

![Waterval voor representatief scenario C3500_R2.00: zuiver beleidseffect €390 plus vermeden terugleverkosten €202 plus interactie €0 is samen €592 totale verandering per jaar.](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/policy-versus-fee-waterfall.svg)

*Opbouw van de €592 voor één representatief scenario (C3500_R2.00). ENGINE RESULT — representatief scenario, geen landelijk gemiddelde en geen decompositie van de losse medianen.*

### Waarom de kostenstructuur telt

"Een batterij haalt je terugleverkosten weg" klopt niet altijd. Het hangt volledig af van **hoe** je leverancier ze rekent:

| kostenstructuur | mediaan vermeden per jaar | maximum |
|---|--:|--:|
| per kWh €0,15 | €303 | €577 |
| per kWh €0,10 | €202 | €385 |
| per kWh €0,05 | €101 | €192 |
| hybride (vast + per kWh) | €101 | €192 |
| maandstaffel | €92 | €164 |
| jaarstaffel | €90 | €240 |
| **vast bedrag per maand** | **€0** | **€0** |

*(mediaan over 25 huishoudens, 12,6 kWh-referentiebatterij)*

Bij een **per-kWh**-tarief bespaart elke vermeden kilowattuur geld; bij een **staffel** alleen als je onder een grens zakt; bij een **vast bedrag** bespaart een batterij niets. Reken dus nooit met "de terugleverkosten verdwijnen" zonder eerst je eigen contract te kennen.

![Staafgrafiek van mediane vermeden terugleverkosten (12,6 kWh): per kWh €0,15 €303, €0,10 €202, €0,05 €101, hybride €101, maandstaffel €92, jaarstaffel €90, vast bedrag €0.](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/feed-in-structure-comparison.svg)

*Mediaan vermeden terugleverkosten per tariefstructuur, 12,6 kWh. ENGINE RESULT — mediaan over 25 huishoudens, geen landelijk gemiddelde.*

## Resultaten voor 25 huishoudprofielen

De totale extra zelfconsumptiewaarde door 2027 (einde saldering + vermeden terugleverkosten €0,10/kWh, 12,6 kWh) is over de 25 profielen:

| statistiek | totaal extra door 2027 (alleen zelfconsumptie) |
|---|--:|
| minimum | €248 |
| mediaan | €592 |
| maximum | €1.145 |

De spreiding is groot omdat het effect meestijgt met verbruik én met de hoeveelheid zonne-overschot. Dit is een **spreiding over scenario's**, geen gemiddelde Nederlander, en het betreft alleen zelfconsumptie — handelsopbrengst kan hier netto bovenop komen.

## Welke batterijcapaciteit past bij zelfconsumptie?

Puur voor **zelfconsumptie** is meer kWh niet evenredig meer waarde. Het mediane zuivere beleidseffect vlakt af:

| batterij | mediaan beleidseffect | maximum |
|---|--:|--:|
| 7 kWh | €391 | €539 |
| 10 kWh | €404 | €669 |
| 12,6 kWh | €405 | €761 |
| 21,8 kWh | €407 | €895 |

![Staafgrafiek: mediaan beleidseffect loopt van €391 (7 kWh) naar €407 (21,8 kWh) — nauwelijks hoger — terwijl het maximum doorstijgt van €539 naar €895.](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/battery-size-diminishing-returns.svg)

*Mediaan beleidseffect per batterijgrootte. ENGINE RESULT — geen voorspelling en geen landelijk gemiddelde.*

De mediaan loopt van €391 (7 kWh) naar €407 (21,8 kWh) — nauwelijks meer, ondanks veel meer capaciteit — omdat de batterij 's avonds al leeg is en 's nachts nog niet bijgevuld. Alleen bij veel structureel overschot vult een grote batterij nog bij (het maximum stijgt wél door). **Belangrijk:** dit gaat over zelfconsumptie. Voor **handel** kan extra capaciteit juist wél waarde toevoegen, want die reikt verder dan wat je zelf verbruikt. De optimale maat hangt dus af van of je alleen zelfconsumptie wilt of ook wilt handelen — reken je situatie door met de [thuisbatterij-calculator](/calculator).

## Hoe kan handel extra waarde toevoegen?

De berekende zelfconsumptiewaarde is niet de volledige opbrengst van een thuisbatterij. Een EMS kan daarnaast waarde zoeken op de day-aheadmarkt, onbalansmarkt of andere flexibiliteitsmarkten. Onze engine heeft die handelsopbrengst **nog niet gevalideerd** — er is geen causale onbalans-controller — dus we presenteren **geen** exacte handelsraming. Wat we wél kunnen laten zien, is hoe kosten en opportuniteitskosten de *netto* aanvullende waarde bepalen.

De relevante maatstaf is de **incrementele netto handelswaarde**: bruto handelsopbrengst − aggregatoraandeel − EMS-kosten − incrementele degradatie − de opportuniteitskosten van verdrongen zelfconsumptie. En bij optionele deelname geldt:

**TOTALE OPTIMALE WAARDE = ZELFCONSUMPTIEWAARDE + max(0, INCREMENTELE NETTO HANDELSWAARDE)**

De `max(0, …)` is de kern: een intelligent EMS hoeft niet te handelen als handelen onaantrekkelijk is. De batterij blijft dan gewoon beschikbaar voor zelfconsumptie. Handel is daarmee een **optionele** extra waardestroom, die de zelfconsumptiewaarde niet verlaagt zolang het EMS vrij kan kiezen.

Reserveren van batterijcapaciteit voor handel kost meestal wéinig zelfconsumptie. In onze opportuniteitskosten-analyse verliest de meeste huishoudens weinig als een deel van de capaciteit voor handel apart wordt gezet:

| gereserveerd voor handel | mediaan verlies zelfconsumptie | gemiddelde | maximum | ≤ €5 |
|---|--:|--:|--:|--:|
| 10% | €0,6 | €11,6 | €62,6 | 65% |
| 20% | €1,4 | €26,7 | €131,1 | 58% |
| 30% | €8,0 | €46,6 | €205,6 | 48% |
| 50% | €65,2 | €107,8 | €379,1 | 30% |

![Verdeling van het zelfconsumptieverlies wanneer een deel van de batterijcapaciteit voor handel wordt gereserveerd: bij 10% reserve mediaan €0,6 (max €62,6), bij 50% reserve mediaan €65,2 (max €379,1).](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/reserve-opportunity-cost-distribution.svg)

*Zelfconsumptieverlies bij capaciteit die voor handel wordt gereserveerd, 12,6 kWh. ENGINE RESULT — scenariostudie, geen voorspelling.*

Voor de meeste huishoudens is de opportuniteitskost bij een beperkte reserve (10–20%) klein (mediaan €0,6–€1,4), dus er blijft veel ruimte om handel bovenop zelfconsumptie te doen. Alleen een minderheid met veel PV-overschot levert meer in. Er is dus geen universeel reservecijfer.

### Wat als de handelsopbrengst lager uitvalt?

Omdat we handel niet simuleren, gebruiken we externe **referentiescenario's** (€300/€600/€900/€1.200 bruto per jaar) om te tonen hoe kosten en opportuniteitskosten de netto aanvullende waarde beïnvloeden. Dit zijn geen voorspellingen en geen bewijs dat de opbrengst daalt. De onderstaande break-even laat zien welk deel van zo'n bruto-referentie je moet overhouden om net quitte te spelen na EMS-kosten, degradatie, aggregatoraandeel en reserveverlies:

| bruto-referentie | benodigde marktfactor om break-even te halen |
|---|--:|
| €300/jaar | 42% |
| €600/jaar | 21% |
| €900/jaar | 14% |
| €1.200/jaar | 10% |

![Staafgrafiek van de benodigde break-even marktfactor per bruto-referentie: 42% bij €300, 21% bij €600, 14% bij €900, 10% bij €1.200; er is geen universele 25%.](/blog-assets/energieprijzen-stijgen-thuisbatterij-voordeel-2027/optional-trading-downside.svg)

*Benodigde break-even marktfactor per bruto-handelsreferentie. SCENARIO-OVERLAY — geen gesimuleerde handelsopbrengst en geen voorspelling.*

De break-even bruto-referentie ligt rond **€126/jaar**. Er is dus geen universele "je hoeft maar 25% te halen": het hangt af van welke (onzekere) referentie je gelooft. Bij een marktfactor van 0% doet het EMS simpelweg niet mee en houd je gewoon je zelfconsumptiewaarde — precies de `max(0, …)`-logica. Kort gezegd: hoe lager de kosten en hoe hoger de marktwaarde, hoe meer netto waarde handel bovenop zelfconsumptie legt.

## Waarom zelfconsumptie en handel dezelfde batterijcapaciteit gebruiken

Je mag de losse maxima van zelfconsumptie en handel **niet naïef optellen**. Beide gebruiken dezelfde batterij, hetzelfde vermogen en dezelfde State of Charge. Een geïntegreerde EMS-regelaar moet daarom per interval de meest waardevolle actie kiezen. Handelswaarde tel je pas mee ná aftrek van de zelfconsumptie die je ervoor opgeeft — de relevante grootheid is de incrementele netto handelswaarde, niet de standalone bruto handelsopbrengst.

Dat verklaart ook waarom een grotere batterij voor zelfconsumptie afvlakt maar voor handel wél kan lonen: zodra de zelfconsumptiebehoefte is gedekt, is de resterende capaciteit "vrij" voor handel, zonder dat het de zelfconsumptie verdringt.

## Betekenen meer thuisbatterijen automatisch minder handelsopbrengst?

Nee. Meer batterijen vergroten het aanbod van flexibiliteit, wat de concurrentie kan vergroten, maar het aantal batterijen alleen bepaalt niet de toekomstige handelsopbrengst. Er werken twee krachten tegelijk.

Mogelijke **neerwaartse** druk:

- meer flexibel vermogen dat om dezelfde activatie concurreert;
- minder schaarste tijdens identieke marktvensters;
- veranderingen in aggregatormarge en klantaandeel;
- veel strategieën die op hetzelfde signaal reageren.

Mogelijke **steun of groei** van de waarde:

- meer variabele opwek uit zon en wind;
- groeiende voorspelfouten in absolute energievolumes;
- elektrificatie van vervoer en verwarming;
- veranderende verbruiksprofielen;
- netcongestie en lokale flexibiliteitsbehoefte;
- meer volatiele of negatieve prijsperiodes;
- nieuwe marktproducten;
- snellere en preciezere batterijrespons;
- aggregatie die kleine batterijen toegang tot markten geeft;
- marktvraag die even snel of sneller groeit dan de batterijcapaciteit.

De toekomstige opbrengst per batterij hangt dus af van de verhouding tussen de **vraag naar flexibiliteit** en het **beschikbare flexibele vermogen**. Het aantal batterijen alleen is niet genoeg om de richting te voorspellen. We claimen daarom niet dat de marktopbrengst zeker gelijk blijft of stijgt, en ook niet dat verzadiging onvermijdelijk is.

## Day-ahead en onbalans: twee verschillende markten

Deze twee worden vaak door elkaar gehaald, maar het zijn verschillende markten. Op de **day-ahead**-markt worden prijzen een dag vooruit vastgesteld; je kunt je batterij plannen op bekende uurprijzen, bijvoorbeeld met een [dynamisch energiecontract](/post/dynamisch-energiecontract-thuisbatterij). De **onbalansmarkt** draait om het real-time bijsturen van vraag en aanbod, in kwartieren, en is veel onvoorspelbaarder en risicovoller. Opbrengsten uit de één zeggen niets over de ander, en marketingcijfers gooien ze soms op één hoop. In dit artikel houden we ze strikt gescheiden en presenteren we geen van beide als gesimuleerde opbrengst.

## Hoe een EMS per kwartier de beste keuze maakt

Een [slim energiebeheersysteem (EMS)](/post/ems-systeem-thuisbatterij-controle-over-stroom) neemt elk kwartier een beslissing. Op een bepaald moment kan het:

1. energie vasthouden voor het huishouden (zelfconsumptie);
2. verkopen of ontladen voor een marktkans (handel);
3. capaciteit bewaren voor een latere kans;
4. niets doen.

Het EMS kiest de actie met de hoogste verwachte netto waarde. Daardoor verlaagt handel de zelfconsumptiewaarde niet: het systeem handelt alleen wanneer de verwachte incrementele waarde positief is, en valt anders terug op zelfconsumptie. Dit is precies waarom je zelfconsumptie en handel als samenwerkende — niet concurrerende — waardestromen moet zien.

## Wat weten we nog niet over handelsopbrengsten?

Onze engine simuleert alleen PV-zelfconsumptie, vermeden inkoop, vermeden terugleverkosten en het verschil tussen wel/niet salderen. Wat we (nog) **niet** gevalideerd hebben:

- een causale onbalans-controller;
- de toekomstige omvang van de onbalansmarkt;
- de toekomstige vraag naar balanceervermogen;
- het effect van landelijke batterij-adoptie op marktprijzen;
- geïntegreerde commerciële EMS-dispatch.

Daarom presenteren we geen exacte handelsraming en gebruiken we de zelfconsumptiestudie **niet** om te beweren dat handelsinkomsten zullen dalen of stijgen.

> **Wat deze simulatie niet voorspelt.** Geen echte-jaaropbrengst (het is een synthetisch jaar). Geen landelijk gemiddelde (25 ongewogen profielen). Geen specifiek leverancierstarief (illustratieve structuren; echte tarieven verschillen). Geen handelsopbrengst (day-ahead/onbalans worden niet gesimuleerd; de €300–€1.200 zijn externe referentiescenario's). Geen dynamische-prijs-timing (we rekenen met vaste tarieven €0,30 inkoop / €0,075 teruglevering). De wettelijke terugleververgoeding (≥50% van het kale leveringstarief tot 2030) is hier als vast tarief benaderd.

## Voor wie is een thuisbatterij na 2027 interessant?

Voor de **zelfconsumptiewaarde** profiteren vooral huishoudens met veel zonnepanelen en structureel overschot, met hoger eigen verbruik dat 's avonds valt, en met een leverancier die **per-kWh-terugleverkosten** rekent. Minder interessant is het bij klein verbruik met weinig overschot of bij een **vast** terugleverbedrag (dat vermijd je toch niet). Voor **handel** telt daarnaast of je een geschikt EMS en contract hebt en of je bereid bent capaciteit deels voor de markt te reserveren. Reken jouw situatie door met de [thuisbatterij-calculator](/calculator), en lees ook [wat een thuisbatterij precies oplevert](/post/wat-levert-een-thuisbatterij-op) en [hoe de terugverdientijd werkt](/post/terugverdientijd-thuisbatterij-handel-of-zelfconsumptie).

## Conclusie

De simulatie laat zien hoeveel extra waarde zelfconsumptie na 2027 kan opleveren. Dat is niet de volledige potentiële batterijopbrengst. Day-aheadhandel, onbalans en andere flexibiliteitsdiensten kunnen daar netto waarde aan toevoegen. Hoeveel precies hangt af van marktontwikkelingen, aansturing, kosten en de beschikbare State of Charge. Meer batterijen betekenen daarbij niet automatisch minder opbrengst: doorslaggevend is hoe de vraag naar flexibiliteit zich ontwikkelt ten opzichte van het aanbod.

De zelfconsumptiecijfers in dit artikel zijn dus een berekende waardestroom, niet een bovengrens voor de totale opbrengst van de batterij.

## Veelgestelde vragen

**Is een thuisbatterij interessant in 2027?**
Ja, vooral voor huishoudens met veel zonne-overschot en een per-kWh-terugleverkost. In de 25 onderzochte scenario's was de mediane batterijwaarde na 2027 ongeveer €499 per jaar bij €0,10/kWh terugleverkosten. De mediane verandering ten opzichte van de situatie vóór 2027 was ongeveer €592 per jaar. Dit zijn afzonderlijke verdelingsmedianen en geen gegarandeerde opbrengsten, en ze betreffen alleen zelfconsumptie — handel kan er netto bovenop komen.

**Wat gebeurt er met salderen in 2027?**
De salderingsregeling stopt vanaf 1 januari 2027. Je mag teruggeleverde stroom dan niet meer wegstrepen tegen je verbruik. Je krijgt een aparte terugleververgoeding, die tot 2030 wettelijk minimaal 50% van het kale leveringstarief moet zijn (toezicht ACM).

**Zijn de €592 de volledige opbrengst van een thuisbatterij?**
Nee. De €592 is de mediane verandering van de zelfconsumptie- en terugleverkostenwaarde in de onderzochte scenario's. Day-ahead-, onbalans- en andere handelsopbrengsten zijn niet meegerekend.

**Hoeveel extra bespaart een thuisbatterij zonder saldering?**
Puur door het einde van salderen wordt een 12,6 kWh-batterij mediaan ongeveer €405 per jaar meer waard (spreiding €172–€760 over 25 profielen). Vermeden terugleverkosten vormen een aparte component. De mediane beleidscomponent en de mediane kostencomponent zijn afzonderlijke verdelingsmedianen en mogen niet rechtstreeks worden opgeteld. Binnen ieder individueel scenario tellen de componenten wel exact op.

**Komt handelsopbrengst bovenop zelfconsumptie?**
Dat kan. De relevante maatstaf is de netto incrementele handelswaarde nadat EMS-kosten, aggregatoraandeel, degradatie en eventueel verloren zelfconsumptie zijn afgetrokken. Een geïntegreerd EMS kan alleen handelen wanneer die extra waarde positief is.

**Dalen handelsopbrengsten wanneer meer mensen een batterij kopen?**
Niet automatisch. Meer batterijen vergroten het aanbod van flexibiliteit, maar tegelijkertijd kan de vraag naar flexibiliteit groeien door meer hernieuwbare opwek, elektrificatie, prijsvolatiliteit en netproblemen. De verhouding tussen vraag en aanbod bepaalt de opbrengst, niet het aantal batterijen alleen.

**Kan een thuisbatterij terugleverkosten voorkomen?**
Deels, en alleen bij bepaalde structuren. Bij een tarief per kWh vermijd je met elke opgeslagen kilowattuur kosten (mediaan €202/jaar bij €0,10/kWh, 12,6 kWh). Bij een staffel alleen als je onder een grens zakt. Bij een vast maandbedrag vermijd je niets.

**Zijn terugleverkosten per kWh of per staffel?**
Beide komen voor: sommige leveranciers rekenen per teruggeleverde kWh, andere een vast bedrag verdeeld in staffels, en soms een vast maandbedrag of een combinatie. Alleen de per-kWh-vorm laat een batterij echt besparen. Controleer altijd je eigen contract.

**Welke batterijcapaciteit heb ik nodig?**
Voor zelfconsumptie voegt capaciteit boven ongeveer 10 kWh weinig extra waarde toe: het mediane beleidseffect loopt van €391 (7 kWh) naar €407 (21,8 kWh). Voor handel kan extra capaciteit juist wél lonen, omdat die verder reikt dan je eigen verbruik. Reken je maat na met de calculator.

**Is day-ahead hetzelfde als onbalanshandel?**
Nee. Day-ahead werkt met een dag vooruit vastgestelde uurprijzen; onbalans draait om real-time bijsturen in kwartieren en is veel onvoorspelbaarder. Opbrengsten uit de één zeggen niets over de ander.

*Bron: eigen kwartiersimulatie van Batterijenplan voor de zelfconsumptiewaarde (25 huishoudprofielen, 4 batterijen, meerdere kostenstructuren). Handelsopbrengsten zijn niet gesimuleerd. Juridische feiten: Rijksoverheid (salderingsregeling), ACM (terugleverkosten, 8 mei 2024 en 17 december 2025) en Consumentenbond. Scenariostudie — geen voorspelling of gegarandeerde opbrengst.*

