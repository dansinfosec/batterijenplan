// ── Genormaliseerd intervalmodel voor slimme-meterdata ─────────────────────
// Elke parser/adapter (HomeWizard is de eerste) levert hetzelfde model op:
//
//   { timestamp: number (ms), import_kwh: number, export_kwh: number,
//     import_power_kw?: number, export_power_kw?: number,
//     phase_l1_kw?: number, phase_l2_kw?: number, phase_l3_kw?: number }
//
// De presentatie (SmartMeterProfileSummary e.d.) rekent nooit zelf op ruwe
// CSV-regels; alles loopt via dit model + buildEnergyProfile hieronder.

// Bekende meetintervallen → Nederlandse benaming voor "meetpunten".
const INTERVAL_LABELS = [
  { minutes: 15, singular: "kwartier", plural: "kwartieren" },
  { minutes: 60, singular: "uur", plural: "uren" },
  { minutes: 1440, singular: "dag", plural: "dagen" },
];

export function intervalLabel(intervalMinutes, count) {
  const known = INTERVAL_LABELS.find((l) => l.minutes === intervalMinutes);
  if (!known) return count === 1 ? "meetpunt" : "meetpunten";
  return count === 1 ? known.singular : known.plural;
}

// Aggregatie van genormaliseerde intervallen naar het energieprofiel dat de
// samenvattingskaart toont. Pure functie: geen afronding of presentatie hier.
export function buildEnergyProfile(intervals, meta = {}) {
  if (!intervals || intervals.length === 0) return null;

  const intervalMinutes = meta.intervalMinutes || null;
  const intervalHours = intervalMinutes ? intervalMinutes / 60 : null;

  let totalImportKwh = 0;
  let totalExportKwh = 0;
  let maxImportIntervalKwh = 0;
  let maxExportIntervalKwh = 0;

  for (const iv of intervals) {
    totalImportKwh += iv.import_kwh;
    totalExportKwh += iv.export_kwh;
    if (iv.import_kwh > maxImportIntervalKwh) maxImportIntervalKwh = iv.import_kwh;
    if (iv.export_kwh > maxExportIntervalKwh) maxExportIntervalKwh = iv.export_kwh;
  }

  const periodStart = intervals[0].timestamp;
  const periodEnd = intervals[intervals.length - 1].timestamp;

  // Piekvermogen is afleidbaar als gemiddeld vermogen per meetinterval
  // (kWh / uur). Alleen zinvol bij intervallen t/m een uur; bij dagtotalen
  // zegt zo'n gemiddelde niets over pieken en tonen we "—".
  const powerDerivable = intervalHours !== null && intervalMinutes <= 60;
  const maxImportKw = powerDerivable ? maxImportIntervalKwh / intervalHours : null;
  const maxExportKw = powerDerivable ? maxExportIntervalKwh / intervalHours : null;

  // Datacompleetheid: aantal aanwezige meetpunten t.o.v. het verwachte aantal
  // tussen het eerste en laatste tijdstip.
  let completenessPct = null;
  if (intervalMinutes) {
    const spanMs = periodEnd - periodStart;
    const expected = Math.round(spanMs / (intervalMinutes * 60 * 1000)) + 1;
    if (expected > 0) {
      completenessPct = Math.min(100, (intervals.length / expected) * 100);
    }
  }

  const spanDays = (periodEnd - periodStart) / (24 * 60 * 60 * 1000);

  return {
    periodStart,
    periodEnd,
    spanDays,
    intervalMinutes,
    pointCount: intervals.length,
    totalImportKwh,
    totalExportKwh,
    maxImportKw,
    maxExportKw,
    completenessPct,
    anomalies: meta.anomalies || { skippedRows: 0, negativeDeltas: 0, duplicateTimestamps: 0 },
    source: meta.source || null,
  };
}

// Jaarextrapolatie voor de brug naar de bestaande snelle berekening. Bewust
// simpel (lineair op kalenderdagen) — dit vult alleen invoervelden voor van
// de bezoeker zelf afkomstige data; het vervangt geen rekenmodel.
export function annualizeProfile(profile) {
  if (!profile || profile.spanDays <= 0) return null;
  const factor = 365 / Math.max(profile.spanDays, 1);
  const round10 = (v) => Math.max(10, Math.round(v / 10) * 10);
  return {
    yearlyUsageKwh: round10(profile.totalImportKwh * factor),
    yearlyExportKwh: round10(profile.totalExportKwh * factor),
    scaled: Math.abs(profile.spanDays - 365) > 14,
  };
}
