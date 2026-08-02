# Keyword coverage audit — `wat-levert-een-thuisbatterij-op`

*Measured on the on-disk `PROPOSED_ARTICLE.md` (post Part-A interpretation fix, pre pillar-strengthening). Counts are case-insensitive substring counts. Not for production apply.*

## Snapshot

- Word count (approx, `\w+` tokens): **3,737**
- H2/H3 headings: 15 H2 / 8 H3 (see PROPOSED_ARTICLE.md)
- `[SOURCE REQUIRED]`: 0 · `zonovershot`: 0

## Primary & close-variant occurrences (BEFORE strengthening)

| Term | Total | In headings | In first 200 words | Verdict |
|---|---:|---:|:--:|---|
| wat levert een thuisbatterij op | 2 | 2 (H1 + FAQ) | yes | **naturally covered** (not stuffed) |
| opbrengst | 19 | 2 | yes | naturally covered (strong, on-topic) |
| levert / oplevert | 7 / 1 | 3 / 0 | yes / no | covered |
| hoeveel (levert/kWh) | present | 1 | no | weakly covered → add explicit H2 |
| is een thuisbatterij **rendabel** | ~0 | 0 | no | **missing** (880-vol query) → add rendabel framing |
| rendement | 3 | 1 | no | covered (light) |
| besparing | 3 | 0 | no | weakly covered |
| zonder zonnepanelen | 2 | 0 | no | **weak + no heading** → add H2 |
| met zonnepanelen | 1 | 0 | no | **weak + no heading** → add H2 |
| dynamisch contract | 6 | 0 | no | covered (owned by art. 11 — link, don't target) |
| omvormer / vermogen | 9 | 0 | no | covered; add "capaciteit vs vermogen" signpost |
| capaciteit | 3 | 0 | no | weakly covered |
| onbalans | 7 | 1 | no | covered |
| zelfconsumptie | 3 | 0 | no | covered (owned by art. 5/3 — link) |
| 2027 | 19 | 2 | yes | covered (owned by art. 13 — link) |
| terugverdientijd | 9 | 2 | no | **present too often for a term owned by art. 3** → see risk below |

## Per-keyword classification (target cluster)

- **Naturally covered:** wat levert een thuisbatterij op, opbrengst, levert, verdienen, onbalans/handel, 2027, matrix/25 profielen, omvormervermogen, praktijkvalidatie (Zonneplan/Tibber/Groene Vrienden).
- **Weakly covered (strengthen):** zonder zonnepanelen, met zonnepanelen, besparing, capaciteit-vs-vermogen, "hoeveel kWh nodig", rendement.
- **Missing (add, supported by data):** "is een thuisbatterij rendabel" (880), "is een grotere thuisbatterij rendabeler" (now covered by the new practice section), "kan een thuisbatterij meer dan €1.000 opleveren" (FAQ), "wat levert een thuisbatterij zonder zonnepanelen op" (H2).
- **Present too often / cannibalization:** `terugverdientijd` (9 occurrences incl. an H2 "## 7. Terugverdientijd"). This term is assigned to **article 3**. Risk: the pillar's exact-match payback heading competes with the payback pillar.
- **Assigned to another article (link, don't target):** terugverdientijd*, salderen*, dynamisch-contract mechanics, EMS control, installatie, product/merk, subsidie/kosten.

## Risks

- **Stuffing risk:** low overall. `opbrengst` (19) is natural for a yield pillar. The primary exact-match appears only twice — do **not** inflate it.
- **Repeated-phrase risk:** the Part-A evidence labels (`MODEL/SCENARIO`, `PRACTICE/REFERENCE`, "modeluitkomst, geen gegarandeerd minimum") repeat several times. They are deliberate provenance labels, not keyword phrases, but keep them from reading robotically.
- **Cannibalization risk (main one):** section 7 `## 7. Terugverdientijd` + 9 `terugverdientijd` hits overlap article 3. **Planned fix:** reframe the section toward "wat de opbrengst betekent voor de terugverdientijd" as an ROI *input*, keep it short, and link the exact-match query to article 3 rather than competing for it.

## Missing semantic topics to add (without stuffing)

1. `### Wat levert een thuisbatterij op zonder zonnepanelen?` (captures the "zonder panelen" query; content already exists, needs a heading).
2. `### Wat levert een thuisbatterij op met zonnepanelen?` (solar-relationship intent).
3. `### Is een thuisbatterij rendabel?` (880-vol; answer via yield + link to payback).
4. `## Praktijkresultaten van grotere thuisbatterijen (2025)` + "Is een grotere batterij rendabeler?" (size↔ROI, Route B practice data).
5. Featured-snippet FAQ additions: "Kan een thuisbatterij meer dan €1.000 per jaar opleveren?", "Wat is belangrijker: capaciteit of vermogen?".

## Coverage deltas are reported in the Final Report (before → after) once the strengthening edits are applied.
