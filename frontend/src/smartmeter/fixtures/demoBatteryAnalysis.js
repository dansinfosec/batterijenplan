// ═══════════════════════════════════════════════════════════════════════════
// ONTWIKKELFIXTURE — GEEN PRODUCTIEDATA
//
// De batterijvergelijking wordt straks door de backend berekend op basis van
// het geüploade verbruiksprofiel (zie het API-contract onderaan dit bestand).
// Zolang die rekenmodule er niet is, toont de frontend in development deze
// vaste voorbeelddata, altijd met een zichtbare "Conceptweergave"-banner.
// De frontend verzint zelf nooit welke batterij "het beste" is: de aanbeveling
// (recommendation) komt — ook in deze fixture — expliciet uit de datalaag.
// ═══════════════════════════════════════════════════════════════════════════

// Dit object wordt uitsluitend gerefereerd achter import.meta.env.DEV-gates
// (SmartMeterFlow/SmartMeterUpload). Vite vervangt die vlag statisch, waarna
// treeshaking dit hele object uit de productiebundle verwijdert — zie de
// bundle-check in de testrapportage. Bewust géén import.meta.env hier op
// moduleniveau: dit bestand draait ook onder node --test.
export const DEMO_BATTERY_ANALYSIS = {
  demo: true,
  candidates: [
    {
      id: "cand-7",
      label: "7 kWh",
      usable_capacity_kwh: 7,
      inverter_power_kw: 3.0,
      export_captured_pct: 44,
      added_self_consumption_kwh: 980,
      expected_cycles_per_year: 265,
      grid_import_reduction_kwh: 940,
      grid_export_reduction_kwh: 1010,
      modeled_annual_value_eur: 305,
      improvement_over_previous_pct: null,
    },
    {
      id: "cand-10",
      label: "10 kWh",
      usable_capacity_kwh: 10,
      inverter_power_kw: 4.0,
      export_captured_pct: 58,
      added_self_consumption_kwh: 1290,
      expected_cycles_per_year: 240,
      grid_import_reduction_kwh: 1240,
      grid_export_reduction_kwh: 1330,
      modeled_annual_value_eur: 395,
      improvement_over_previous_pct: 30,
    },
    {
      id: "cand-14",
      label: "14 kWh",
      usable_capacity_kwh: 14,
      inverter_power_kw: 5.0,
      export_captured_pct: 71,
      added_self_consumption_kwh: 1580,
      expected_cycles_per_year: 205,
      grid_import_reduction_kwh: 1520,
      grid_export_reduction_kwh: 1640,
      modeled_annual_value_eur: 470,
      improvement_over_previous_pct: 19,
    },
    {
      id: "cand-21",
      label: "21 kWh",
      usable_capacity_kwh: 21,
      inverter_power_kw: 6.0,
      export_captured_pct: 79,
      added_self_consumption_kwh: 1750,
      expected_cycles_per_year: 155,
      grid_import_reduction_kwh: 1690,
      grid_export_reduction_kwh: 1820,
      modeled_annual_value_eur: 515,
      improvement_over_previous_pct: 10,
    },
    {
      id: "cand-28",
      label: "28 kWh",
      usable_capacity_kwh: 28,
      inverter_power_kw: 6.0,
      export_captured_pct: 83,
      added_self_consumption_kwh: 1840,
      expected_cycles_per_year: 120,
      grid_import_reduction_kwh: 1770,
      grid_export_reduction_kwh: 1910,
      modeled_annual_value_eur: 540,
      improvement_over_previous_pct: 5,
    },
  ],
  recommendation: {
    candidate_id: "cand-14",
    reasons: [
      "Voldoende bruikbare capaciteit voor uw typische zonne-overschot per dag.",
      "Een grotere batterij levert bij uw profiel weinig extra benutting op.",
      "Het laad- en ontlaadvermogen sluit aan op uw gemeten pieken per meetinterval.",
      "De batterij wordt bij deze capaciteit regelmatig volledig benut (gezonde cyclus).",
      "De kleinere optie zit bij uw profiel te vaak vol op zonnige dagen.",
    ],
  },
};

// ── Beoogd API-contract (nog te bouwen backend) ────────────────────────────
// POST /api/smartmeter/analysis/
// Request:  { intervals: [{ timestamp, import_kwh, export_kwh, ... }],
//             interval_minutes, source }
//   — of een upload-id als het bestand server-side wordt verwerkt.
// Response: zelfde vorm als DEMO_BATTERY_ANALYSIS hierboven, zonder `demo`,
//           met `recommendation` alleen aanwezig wanneer de rekenmodule een
//           expliciet optimum aanwijst.

// Klein deterministisch HomeWizard-voorbeeldbestand (cumulatieve tellers,
// kwartierwaarden) voor de dev-knop in de uploadstap. Alleen in development
// bereikbaar; het patroon (ochtend/avond-afname, zonne-export rond de middag)
// is herkenbaar nep-netjes en wordt nergens als echt resultaat gepresenteerd.
export function buildDemoHomeWizardCsv(days = 14) {
  const lines = ["time_stamp;import_t1_kwh;import_t2_kwh;export_t1_kwh;export_t2_kwh"];
  let impT1 = 4210.5;
  let impT2 = 3877.2;
  let expT1 = 2955.8;
  let expT2 = 2410.1;
  const start = new Date(2025, 2, 1, 0, 0, 0); // 1 maart 2025
  const pad = (n) => String(n).padStart(2, "0");
  for (let d = 0; d < days; d++) {
    for (let q = 0; q < 96; q++) {
      const t = new Date(start.getTime() + (d * 96 + q) * 15 * 60 * 1000);
      const hour = q / 4;
      // Afname: basislast + ochtend-/avondpiek. Export: zonneklok rond 13:00.
      const load =
        0.045 +
        (hour >= 7 && hour < 9 ? 0.11 : 0) +
        (hour >= 17 && hour < 21 ? 0.16 : 0);
      const sun = Math.max(0, Math.sin(((hour - 6.5) / 13) * Math.PI));
      const pv = 0.55 * sun * (0.75 + 0.25 * Math.sin(d * 1.7));
      const net = pv - load;
      const importKwh = Math.max(0, -net);
      const exportKwh = Math.max(0, net);
      // Verdeling over T1/T2 zoals een echte meter: dal 's nachts/weekend.
      const isT1 = hour < 7 || hour >= 23;
      if (isT1) impT1 += importKwh; else impT2 += importKwh;
      if (isT1) expT1 += exportKwh; else expT2 += exportKwh;
      const stamp = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
      lines.push(
        `${stamp};${impT1.toFixed(3)};${impT2.toFixed(3)};${expT1.toFixed(3)};${expT2.toFixed(3)}`
      );
    }
  }
  return lines.join("\n");
}
