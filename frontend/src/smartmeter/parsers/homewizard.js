// ── HomeWizard CSV-adapter ─────────────────────────────────────────────────
// Eerste parser/adapter voor slimme-meterdata. Leest een geëxporteerde
// HomeWizard Energy(+) CSV en normaliseert die naar het intervalmodel uit
// ../model.js. De herkenning is bewust tolerant (NL/EN-koppen, ; of , als
// scheidingsteken, decimale komma, cumulatieve tellerstanden óf waarden per
// interval) zodat kleine exportvarianten niet meteen stuklopen.
//
// Puur JavaScript zonder browser-API's: de aanroeper leest het bestand
// (File.text()) en geeft hier alleen tekst door. Daardoor is deze module ook
// direct testbaar onder node --test.

export class SmartMeterParseError extends Error {
  constructor(code, userMessage) {
    super(userMessage);
    this.name = "SmartMeterParseError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

const fail = (code, msg) => {
  throw new SmartMeterParseError(code, msg);
};

// ── Kolomherkenning ──
// Volgorde is belangrijk: "teruglevering" bevat "levering", dus export-
// patronen worden vóór importpatronen getest.
const EXPORT_RE = /export|teruglever|terug\s*lever|injectie|production|opwek|feed[\s_-]?in|gener/;
const IMPORT_RE = /import|afname|verbruik|consumption|usage|delivered/;
const T1_RE = /(^|[^a-z0-9])t1([^0-9]|$)|tarief\s*1|laag|\bdal\b|low/;
const T2_RE = /(^|[^a-z0-9])t2([^0-9]|$)|tarief\s*2|hoog|normaal|piek|high/;
const TIMESTAMP_RE = /^(time[\s_-]?stamp|datum.*tijd|date.*time|tijdstip|datetime|periode|period|van|from|start|tijd\s*van)/;
const DATE_ONLY_RE = /^(datum|date)$/;
const TIME_ONLY_RE = /^(tijd|time)$/;
// Kolommen die we bewust negeren (gas/water/spanning/kosten).
const IGNORE_RE = /gas|m3|m³|water|volt|ampere|current|kosten|cost|eur|€/;

function normalizeHeader(raw) {
  return raw
    .replace(/﻿/g, "")
    .replace(/["']/g, "")
    .replace(/[([].*?[)\]]/g, "") // eenheden zoals (kWh) / [kWh] strippen
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function detectDelimiter(headerLine) {
  const counts = [
    [";", (headerLine.match(/;/g) || []).length],
    ["\t", (headerLine.match(/\t/g) || []).length],
    [",", (headerLine.match(/,/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ";";
}

// Getallen met decimale komma ("1.234,56") én punt ("1234.56") accepteren.
function parseNumber(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/["'\s]/g, "");
  if (!s || s === "-") return NaN;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

// Tijdstempels: ISO (2025-01-01T00:15 / 2025-01-01 00:15) en Nederlands
// (01-01-2025 00:15, ook met "/"). Zonder tijdcomponent → 00:00.
// Naïeve metertijden worden als UTC geïnterpreteerd: het is een uniforme
// 15-minutenklok, geen kalendertijd. Lokaal parsen zou rond de zomertijd-
// overgang kunstmatige duplicaten (voorjaar) of gaten opleveren die niets
// met de data te maken hebben.
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;
const NL_RE = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/;

function parseTimestamp(dateStr, timeStr) {
  let s = String(dateStr || "").replace(/["']/g, "").trim();
  if (timeStr) s = `${s} ${String(timeStr).replace(/["']/g, "").trim()}`;
  let m = ISO_RE.exec(s);
  if (m) {
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  m = NL_RE.exec(s);
  if (m) {
    return Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }
  return NaN;
}

// Cumulatieve tellerstanden herkennen: vrijwel altijd stijgend én duidelijk
// groter dan wat één meetinterval aan kWh kan bevatten. De ratio is bewust
// niet 100%: een meterwissel/reset mag de herkenning niet breken.
function looksCumulative(values) {
  if (values.length < 3) return false;
  let nonDecreasing = 0;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > max) max = values[i];
    if (i > 0 && values[i] >= values[i - 1]) nonDecreasing++;
  }
  const ratio = nonDecreasing / (values.length - 1);
  return ratio >= 0.9 && max > 20;
}

function mapColumns(headers) {
  const map = {
    timestamp: -1,
    date: -1,
    time: -1,
    importCols: [],
    exportCols: [],
  };
  headers.forEach((raw, i) => {
    const h = normalizeHeader(raw);
    if (!h) return;
    if (IGNORE_RE.test(h)) return;
    if (map.timestamp === -1 && TIMESTAMP_RE.test(h)) {
      map.timestamp = i;
      return;
    }
    if (DATE_ONLY_RE.test(h)) { map.date = i; return; }
    if (TIME_ONLY_RE.test(h)) { map.time = i; return; }
    if (EXPORT_RE.test(h)) { map.exportCols.push(i); return; }
    if (IMPORT_RE.test(h)) { map.importCols.push(i); return; }
  });
  return map;
}

// Splits een regel op het scheidingsteken, met minimale ondersteuning voor
// aanhalingstekens (HomeWizard-exports gebruiken die zelden, maar veilig).
function splitLine(line, delim) {
  if (!line.includes('"')) return line.split(delim);
  const out = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function parseHomeWizardCsv(text, { source = "homewizard" } = {}) {
  if (typeof text !== "string" || !text.trim()) {
    fail("EMPTY_FILE", "Het bestand lijkt leeg te zijn. Controleer of u het juiste exportbestand heeft gekozen.");
  }
  // Binaire bestanden (bijv. .xlsx = zip, begint met "PK") vroeg afvangen.
  if (text.startsWith("PK") || text.includes(String.fromCharCode(0))) {
    fail(
      "BINARY_FILE",
      "Dit lijkt geen CSV-tekstbestand te zijn. Excel-bestanden worden nog niet ondersteund — exporteer uw data als CSV."
    );
  }

  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    fail("TOO_FEW_ROWS", "Het bestand bevat te weinig meetregels om een profiel op te bouwen.");
  }

  const delim = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delim);
  const cols = mapColumns(headers);

  // Volgorde van tijdbron: expliciete timestamp-kolom → datum(+tijd) →
  // een losse "time"-kolom die volledige datum-tijden bevat (zoals de
  // HomeWizard-export met kop "time").
  const hasTimestamp = cols.timestamp !== -1 || cols.date !== -1 || cols.time !== -1;
  if (!hasTimestamp) {
    fail(
      "NO_TIMESTAMP",
      "Er is geen datum/tijd-kolom herkend. Controleer of dit een HomeWizard-export met meetintervallen is."
    );
  }
  if (cols.importCols.length === 0 && cols.exportCols.length === 0) {
    fail(
      "NO_ENERGY_COLUMNS",
      "Er zijn geen afname- of terugleverkolommen herkend in dit bestand. Dit formaat wordt nog niet ondersteund."
    );
  }

  // ── Regels inlezen ──
  const rows = [];
  let skippedRows = 0;
  for (let i = 1; i < lines.length; i++) {
    const parts = splitLine(lines[i], delim);
    const ts =
      cols.timestamp !== -1
        ? parseTimestamp(parts[cols.timestamp])
        : cols.date !== -1
          ? parseTimestamp(parts[cols.date], cols.time !== -1 ? parts[cols.time] : "")
          : parseTimestamp(parts[cols.time]);
    if (!Number.isFinite(ts)) { skippedRows++; continue; }

    // Per kolom apart bewaren: cumulatief-detectie gebeurt per kanaal.
    const imp = cols.importCols.map((idx) => parseNumber(parts[idx]));
    const exp = cols.exportCols.map((idx) => parseNumber(parts[idx]));
    if (imp.every((v) => !Number.isFinite(v)) && exp.every((v) => !Number.isFinite(v))) {
      skippedRows++;
      continue;
    }
    rows.push({ ts, imp, exp });
  }

  if (rows.length < 2) {
    fail("TOO_FEW_ROWS", "Er zijn te weinig geldige meetregels gevonden om een profiel op te bouwen.");
  }

  // Sorteren + dubbele tijdstempels overslaan.
  rows.sort((a, b) => a.ts - b.ts);
  let duplicateTimestamps = 0;
  const uniq = [];
  for (const r of rows) {
    if (uniq.length && uniq[uniq.length - 1].ts === r.ts) { duplicateTimestamps++; continue; }
    uniq.push(r);
  }

  // ── Meetinterval: meest voorkomende tijdsverschil (modus) ──
  // Robuuster dan een mediaan bij gaten in de data: vrijwel alle verschillen
  // zijn het echte meetinterval, gaten zijn uitzonderingen.
  const diffCounts = new Map();
  for (let i = 1; i < uniq.length; i++) {
    const d = uniq[i].ts - uniq[i - 1].ts;
    diffCounts.set(d, (diffCounts.get(d) || 0) + 1);
  }
  let modeMs = 0;
  let modeCount = -1;
  for (const [d, count] of diffCounts) {
    if (count > modeCount || (count === modeCount && d < modeMs)) {
      modeMs = d;
      modeCount = count;
    }
  }
  const intervalMinutes = Math.round(modeMs / 60000) || null;

  // ── Cumulatief vs. per interval, per kanaal ──
  const importChannels = cols.importCols.map((_, c) => uniq.map((r) => r.imp[c]).filter(Number.isFinite));
  const exportChannels = cols.exportCols.map((_, c) => uniq.map((r) => r.exp[c]).filter(Number.isFinite));
  const importCumulative = importChannels.map(looksCumulative);
  const exportCumulative = exportChannels.map(looksCumulative);
  const anyCumulative = importCumulative.some(Boolean) || exportCumulative.some(Boolean);

  let negativeDeltas = 0;
  const channelValue = (curr, prev, c, cumulativeFlags, key) => {
    const v = curr[key][c];
    if (!Number.isFinite(v)) return 0;
    if (!cumulativeFlags[c]) return Math.max(0, v);
    const p = prev ? prev[key][c] : NaN;
    if (!Number.isFinite(p)) return 0;
    const d = v - p;
    if (d < 0) { negativeDeltas++; return 0; }
    return d;
  };

  const intervals = [];
  // Bij cumulatieve tellers is de eerste regel alleen het startpunt: de delta
  // tussen stand i-1 en stand i beslaat het interval [t(i-1), t(i)) en wordt
  // — zoals gebruikelijk voor energiedata — gelabeld met de STARTtijd t(i-1).
  const startIdx = anyCumulative ? 1 : 0;
  for (let i = startIdx; i < uniq.length; i++) {
    const prev = i > 0 ? uniq[i - 1] : null;
    let importKwh = 0;
    let exportKwh = 0;
    for (let c = 0; c < cols.importCols.length; c++) {
      importKwh += channelValue(uniq[i], prev, c, importCumulative, "imp");
    }
    for (let c = 0; c < cols.exportCols.length; c++) {
      exportKwh += channelValue(uniq[i], prev, c, exportCumulative, "exp");
    }
    intervals.push({
      timestamp: anyCumulative ? uniq[i - 1].ts : uniq[i].ts,
      import_kwh: importKwh,
      export_kwh: exportKwh,
    });
  }

  return {
    intervals,
    meta: {
      source,
      intervalMinutes,
      cumulativeCounters: anyCumulative,
      columns: {
        importColumns: cols.importCols.map((i) => headers[i].trim()),
        exportColumns: cols.exportCols.map((i) => headers[i].trim()),
      },
      anomalies: { skippedRows, negativeDeltas, duplicateTimestamps },
    },
  };
}

// Adapter-descriptor voor het register in ./index.js.
export const homeWizardAdapter = {
  id: "homewizard",
  label: "HomeWizard",
  acceptedFormatsLabel: "CSV-export uit de HomeWizard Energy-app (.csv)",
  parse: (text) => parseHomeWizardCsv(text, { source: "homewizard" }),
};
