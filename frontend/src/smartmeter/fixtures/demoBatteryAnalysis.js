// ═══════════════════════════════════════════════════════════════════════════
// ONTWIKKELFIXTURE — GEEN PRODUCTIEDATA
//
// De batterijvergelijking draait inmiddels op de echte backend
// (POST /api/smartmeter/analysis/, zie src/smartmeter/analysisClient.js);
// DEMO_BATTERY_ANALYSIS is uit de gebruikersflow verwijderd. Dit bestand
// bevat alleen nog het deterministische voorbeeld-CSV voor de dev-knop in
// de uploadstap (buildDemoHomeWizardCsv) — dat CSV gaat door de echte
// parser en de echte API en wordt nergens als klantdata gepresenteerd.
// ═══════════════════════════════════════════════════════════════════════════

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
