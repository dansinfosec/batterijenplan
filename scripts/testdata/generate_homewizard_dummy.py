"""SYNTHETIC HomeWizard-style test fixture generator.

Genereert DETERMINISTISCHE, volledig synthetische slimme-meterdata (vaste
RNG-seed, geen enkel klantgegeven) in een schema dat lijkt op de HomeWizard
cumulatieve T1/T2 import/export-CSV. Dit bestand mag nooit worden
gepresenteerd als een echte HomeWizard-export.

Structuur van het CSV-bestand:
- 35.040 kwartier-INTERVALLEN voor een volledig jaar (365 x 24 x 4);
- cumulatieve tellerstanden hebben daarvoor 35.041 meetregels nodig:
  de stand aan het BEGIN van elk interval plus één afsluitende stand op
  2026-01-01 00:00 die het laatste interval afsluit.

Naast de CSV wordt een .expected.json geschreven met de bedoelde
jaartotalen, zodat de integratietest tegen de generator-doelen kan
verifiëren zonder de CSV zelf als orakel te gebruiken.

Gebruik:  python scripts/testdata/generate_homewizard_dummy.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "frontend" / "tests" / "fixtures" / "homewizard"
OUT_CSV = OUT_DIR / "homewizard-365days-solar-synthetic.csv"
OUT_EXPECTED = OUT_DIR / "homewizard-365days-solar-synthetic.expected.json"

# Interval-STARTtijden: 35.040 kwartieren (2025-01-01 00:00 t/m 2025-12-31 23:45).
iv = pd.date_range("2025-01-01 00:00", "2025-12-31 23:45", freq="15min")
n = len(iv)
assert n == 365 * 24 * 4 == 35040

rng = np.random.default_rng(20260809)

hour = iv.hour.to_numpy() + iv.minute.to_numpy() / 60
dow = iv.dayofweek.to_numpy()
doy = iv.dayofyear.to_numpy()

# Huishoudprofiel: basislast + ochtend-/avondpiek, weekend- en seizoenseffect.
base_kw = 0.23 + 0.04 * np.cos((hour - 3) / 24 * 2 * np.pi)
morning_kw = 0.85 * np.exp(-0.5 * ((hour - 7.6) / 1.15) ** 2)
evening_kw = 1.35 * np.exp(-0.5 * ((hour - 19.0) / 1.8) ** 2)
midday_kw = 0.22 * np.exp(-0.5 * ((hour - 12.5) / 2.3) ** 2)
weekend_kw = np.where(dow >= 5, 0.10, 0.0)
winter_factor = 1.0 + 0.16 * np.cos((doy - 15) / 365 * 2 * np.pi)
noise = rng.normal(1.0, 0.10, n)
load_kw = np.clip(
    (base_kw + morning_kw + evening_kw + midday_kw + weekend_kw) * winter_factor * noise,
    0.08,
    None,
)
spike_mask = rng.random(n) < 0.012
load_kw += spike_mask * rng.uniform(0.8, 3.5, n)
load_kwh = load_kw * 0.25
load_kwh *= 4500.0 / load_kwh.sum()

# PV-profiel: zonneklok met seizoenssterkte en dagelijkse bewolking.
day_angle = 2 * np.pi * (doy - 172) / 365
day_length = 12.0 + 4.2 * np.cos(day_angle)
sunrise = 12 - day_length / 2
sunset = 12 + day_length / 2
x = (hour - sunrise) / np.maximum(day_length, 1e-6)
daylight = (hour >= sunrise) & (hour <= sunset)
solar_shape = np.zeros(n)
solar_shape[daylight] = np.sin(np.pi * np.clip(x[daylight], 0, 1)) ** 1.7
season_strength = np.clip(0.12 + 0.88 * (0.5 + 0.5 * np.cos(day_angle)), 0.06, 1.0)
daily_cloud = rng.beta(5.0, 2.2, 366)
cloud_factor = daily_cloud[doy]
pv_kw = 6.3 * solar_shape * season_strength * cloud_factor
pv_kw *= np.where(daylight, np.clip(rng.normal(1.0, 0.10, n), 0.55, 1.18), 0.0)
pv_kw = np.clip(pv_kw, 0.0, 7.0)
pv_kwh = pv_kw * 0.25
pv_kwh *= 5500.0 / pv_kwh.sum()

# Nettostroom per interval → afname (import) en teruglevering (export).
net_kwh = load_kwh - pv_kwh
import_kwh = np.clip(net_kwh, 0, None)
export_kwh = np.clip(-net_kwh, 0, None)
is_t1 = (dow < 5) & (hour >= 7) & (hour < 23)

imp_t1_inc = np.where(is_t1, import_kwh, 0.0)
imp_t2_inc = np.where(~is_t1, import_kwh, 0.0)
exp_t1_inc = np.where(is_t1, export_kwh, 0.0)
exp_t2_inc = np.where(~is_t1, export_kwh, 0.0)

# Cumulatieve tellerstanden: stand[i] = start + som van alle increments vóór
# tijdstip i. Er zijn n+1 standen: één aan het begin van elk interval en één
# afsluitende stand (2026-01-01 00:00) die het laatste interval afsluit.
starts = (8354.542, 4651.780, 3095.875, 7482.698)
imp_t1 = starts[0] + np.r_[0.0, np.cumsum(imp_t1_inc)]
imp_t2 = starts[1] + np.r_[0.0, np.cumsum(imp_t2_inc)]
exp_t1 = starts[2] + np.r_[0.0, np.cumsum(exp_t1_inc)]
exp_t2 = starts[3] + np.r_[0.0, np.cumsum(exp_t2_inc)]

reading_times = iv.append(pd.DatetimeIndex([iv[-1] + pd.Timedelta(minutes=15)]))
assert len(reading_times) == n + 1
assert reading_times[-1] == pd.Timestamp("2026-01-01 00:00")

df = pd.DataFrame(
    {
        "time": reading_times.strftime("%Y-%m-%d %H:%M"),
        "Import T1 kWh": np.round(imp_t1, 3),
        "Import T2 kWh": np.round(imp_t2, 3),
        "Export T1 kWh": np.round(exp_t1, 3),
        "Export T2 kWh": np.round(exp_t2, 3),
    }
)
OUT_DIR.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT_CSV, index=False)

# Bedoelde (ongeronde) doelwaarden voor de integratietest.
expected = {
    "synthetic": True,
    "seed": 20260809,
    "interval_minutes": 15,
    "reading_rows": int(n + 1),
    "interval_count": int(n),
    "first_reading": "2025-01-01 00:00",
    "last_reading": "2026-01-01 00:00",
    "total_import_kwh": round(float(import_kwh.sum()), 3),
    "total_export_kwh": round(float(export_kwh.sum()), 3),
    "max_interval_import_kwh": round(float(import_kwh.max()), 4),
    "max_interval_export_kwh": round(float(export_kwh.max()), 4),
    "target_annual_load_kwh": 4500.0,
    "target_annual_pv_kwh": 5500.0,
}
OUT_EXPECTED.write_text(json.dumps(expected, indent=2) + "\n", encoding="utf-8")

print(f"Wrote {len(df):,} reading rows ({n:,} intervals) to {OUT_CSV}")
print(f"Wrote expected values to {OUT_EXPECTED}")
