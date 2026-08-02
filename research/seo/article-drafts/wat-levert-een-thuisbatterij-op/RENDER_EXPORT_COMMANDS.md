# Render Shell export commands — 21.8 kWh simulation data (READ-ONLY)

**You run these on Render. Claude never runs them and never sees `DATABASE_URL`.**

How to use:
1. Render dashboard → your backend service → **Shell**.
2. Run `python manage.py shell`.
3. Paste **Stage 1**, read the catalog it prints.
4. Set `CANDIDATE_TABLES` in **Stage 2** from that catalog, paste it, run.
5. Copy the JSON that Stage 2 prints into `research/data/render-simulation-export.json` locally.

Safety built into both blocks: aborts if the DB is not PostgreSQL; sets the
transaction `READ ONLY`; **always `ROLLBACK`** (never commits); blocks any
`INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE`; skips every table matching
`leads_*, auth_*, django_session, django_admin_log, account_*, users_*,
contact*, customer*, email*, newsletter*`; drops PII-named columns; caps output
at 1,000 rows; prints no credentials.

---

## Stage 1 — discovery (compact catalog only)

```python
# === Batterijenplan · READ-ONLY simulation-data DISCOVERY (stage 1) ===
import re, json
from django.db import connection, transaction
assert connection.vendor == "postgresql", "ABORT: database is not PostgreSQL"

TERMS = ["simulation","simulatie","battery","batterij","capacity","inverter","omvormer",
         "profile","profiel","yield","opbrengst","result","resultaat","scenario","market",
         "epex","tennet","imbalance","onbalans","dispatch","research","dataset"]
PII = re.compile(r'^(leads_|auth_|django_session|django_admin_log|account_|users_|contact|customer|email|newsletter)', re.I)
FORBIDDEN = re.compile(r'\b(insert|update|delete|drop|alter|create|truncate)\b', re.I)

def q(sql, params=None):
    assert not FORBIDDEN.search(sql), "ABORT: non-SELECT statement blocked"
    with connection.cursor() as c:
        c.execute(sql, params or []); return c.fetchall()

report = []
try:
    with transaction.atomic():
        with connection.cursor() as c:
            c.execute("SET TRANSACTION READ ONLY")
        like  = " OR ".join(["table_name ILIKE %s"]*len(TERMS))
        likec = " OR ".join(["column_name ILIKE %s"]*len(TERMS))
        cand   = q(f"SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND ({like})",  [f"%{t}%" for t in TERMS])
        colhit = q(f"SELECT DISTINCT table_name FROM information_schema.columns WHERE table_schema='public' AND ({likec})", [f"%{t}%" for t in TERMS])
        for tname in sorted({r[0] for r in (cand+colhit)}):
            if PII.match(tname):
                continue
            cols = q("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name=%s ORDER BY ordinal_position", [tname])
            n = q(f'SELECT COUNT(*) FROM "{tname}"')[0][0]
            jsonkeys = {}
            for cn, dt in cols:
                if dt in ("json","jsonb"):
                    try:
                        ks = q(f'SELECT DISTINCT jsonb_object_keys("{cn}"::jsonb) FROM "{tname}" LIMIT 50')
                        jsonkeys[cn] = sorted({k[0] for k in ks})[:40]
                    except Exception:
                        jsonkeys[cn] = "<keys unreadable>"
            report.append({"table": tname, "rows": n,
                           "columns": [f"{cn}:{dt}" for cn, dt in cols],
                           "json_keys": jsonkeys})
        transaction.set_rollback(True)   # ROLLBACK — never commit
except Exception as e:
    print("ABORT:", e)
print(json.dumps(report, indent=2, ensure_ascii=False))
```

---

## Stage 2 — export (run only after reviewing Stage 1)

```python
# === Batterijenplan · READ-ONLY simulation EXPORT (stage 2) ===
import re, json, decimal
from django.db import connection, transaction
assert connection.vendor == "postgresql", "ABORT: database is not PostgreSQL"

# >>> EDIT after Stage 1: table(s) that actually hold the simulation/research rows <<<
CANDIDATE_TABLES = []   # e.g. ["blog_simulationresult", "research_dataset"]

PII_TBL  = re.compile(r'^(leads_|auth_|django_session|django_admin_log|account_|users_|contact|customer|email|newsletter)', re.I)
PII_COL  = re.compile(r'(name|email|e_mail|mail|phone|tel|mobile|ip_address|address|adres|postcode|city|woonplaats|lead|customer|user_id|full_name|voornaam|achternaam)', re.I)
FORBIDDEN= re.compile(r'\b(insert|update|delete|drop|alter|create|truncate)\b', re.I)
CONFIG_TOKENS = ["14 kwh","14kwh","10 kw","10kw","21.2","21,2","21.3","21,3","21.8","21,8",
                 "24.2","24,2","12 kw","12kw","1012","1.012","25 profiel","25 profile","2025"]
ALIAS = {
  "battery_kwh":["battery_kwh","capacity_kwh","batterij_kwh","kwh","capaciteit"],
  "inverter_kw":["inverter_kw","omvormer","inverter","kw_inverter"],
  "market_year":["market_year","marktjaar","year","jaar"],
  "ems":["ems"],
  "annual_consumption_kwh":["annual_consumption","verbruik","consumption_kwh","jaarverbruik"],
  "pv_ratio":["pv_ratio","opwek","pv","solar_ratio"],
  "annual_yield_eur":["annual_yield","opbrengst","yield_eur","jaaropbrengst","result_eur","resultaat"],
  "cycles":["cycles","cycli","laadcycli"],
  "gross_trading_eur":["gross_trading","handel","trading_eur"],
  "charging_cost_eur":["charging_cost","laadkosten","charge_cost"],
  "self_consumption_eur":["self_consumption","zelfconsumptie","selfcons"],
}
def norm_field(cn):
    c = cn.lower()
    for f, keys in ALIAS.items():
        if any(k in c for k in keys): return f
    return None
def jsonable(v): return float(v) if isinstance(v, decimal.Decimal) else v
def q(sql, params=None):
    assert not FORBIDDEN.search(sql), "ABORT: non-SELECT blocked"
    with connection.cursor() as c:
        c.execute(sql, params or []); return c.description, c.fetchall()

PRINTED, out = 0, []
try:
    with transaction.atomic():
        with connection.cursor() as c:
            c.execute("SET TRANSACTION READ ONLY")
        for tname in CANDIDATE_TABLES:
            assert not PII_TBL.match(tname), f"ABORT: {tname} matches PII pattern"
            desc, rows = q(f'SELECT * FROM "{tname}" LIMIT 1000')
            cols = [d[0] for d in desc]
            safe = [c for c in cols if not PII_COL.search(c)]     # drop PII columns
            for row in rows:
                d = dict(zip(cols, row))
                blob = " ".join(str(d[c]).lower() for c in safe)
                if not any(tok in blob for tok in CONFIG_TOKENS):
                    continue
                PRINTED += 1
                assert PRINTED <= 1000, "ABORT: >1000 rows"
                rec = {"source_table": tname,
                       "configuration": {"battery_kwh":None,"inverter_kw":None,"market_year":None,"ems":None},
                       "profiles": [],
                       "summary": {"minimum":None,"maximum":None,"median":None,"weighted_average":None,"p10":None,"p90":None},
                       "assumptions": {}, "provenance": {"source_columns": {}}}
                prof = {"annual_consumption_kwh":None,"pv_ratio":None,"annual_yield_eur":None,"cycles":None,
                        "gross_trading_eur":None,"charging_cost_eur":None,"self_consumption_eur":None}
                for cn in safe:
                    f, val = norm_field(cn), jsonable(d[cn])
                    if   f in rec["configuration"]: rec["configuration"][f] = val
                    elif f in prof:                 prof[f] = val
                    else: rec["provenance"]["source_columns"][cn] = val   # keep raw; nothing manufactured
                if any(v is not None for v in prof.values()):
                    rec["profiles"].append(prof)
                out.append(rec)
        transaction.set_rollback(True)   # ROLLBACK — never commit
except Exception as e:
    print("ABORT:", e)
print(json.dumps(out, indent=2, ensure_ascii=False, default=str))
```

Fields that cannot be mapped stay `null`; unmapped source columns are preserved
verbatim under `provenance.source_columns` so nothing is invented and nothing is
lost. Save the printed JSON to `research/data/render-simulation-export.json`.
