#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Validate the 12 public V4 visual assets (6 SVG + 6 PNG) before the DB release.

Local file checks run offline (CI-safe). The live-URL checks (HTTP 200 / Content-Type)
are printed as an operator checklist and are NOT required during unit tests.
"""
import os, sys, re
try:
    from PIL import Image
except Exception:
    Image = None

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
VDIR = os.path.join(ROOT, "frontend", "public", "article-visuals",
                    "energieprijzen-stijgen-thuisbatterij-voordeel-2027", "v4")
URL_BASE = "https://www.batterijenplan.nl/article-visuals/energieprijzen-stijgen-thuisbatterij-voordeel-2027/v4"
NAMES = ["voor-en-na-salderen-2027-v4", "scenario-matrix-thuisbatterij-2027-v4",
         "profielvergelijking-vast-contract-2027-v4", "waardeopbouw-thuisbatterij-2027-v4",
         "vast-versus-dynamisch-2027-v4", "beslisboom-thuisbatterij-2027-v4"]

def main():
    fails = []
    print(f"Checking {len(NAMES)*2} local asset files in {VDIR}\n")
    for n in NAMES:
        svg = os.path.join(VDIR, f"{n}.svg"); png = os.path.join(VDIR, f"{n}.png")
        # SVG
        if not (os.path.isfile(svg) and os.path.getsize(svg) > 0):
            fails.append(f"SVG missing/empty: {n}")
        else:
            s = open(svg, encoding="utf-8").read()
            if "viewBox" not in s: fails.append(f"SVG has no viewBox: {n}")
            if re.search(r'(href|src|srcset)\s*=\s*"https?://', s): fails.append(f"SVG has remote asset: {n}")
        # PNG
        if not (os.path.isfile(png) and os.path.getsize(png) > 0):
            fails.append(f"PNG missing/empty: {n}")
        elif Image:
            w, h = Image.open(png).size
            if w < 1200: fails.append(f"PNG too small ({w}px): {n}")
            print(f"  OK  {n}: svg {os.path.getsize(svg)}B, png {w}x{h}")
    print("\nOperator live-URL checklist (expect HTTP 200 + correct Content-Type):")
    for n in NAMES:
        print(f"  curl -sI {URL_BASE}/{n}.svg   # image/svg+xml")
        print(f"  curl -sI {URL_BASE}/{n}.png   # image/png")
    print("\nRESULT:", "PASS" if not fails else f"FAIL ({len(fails)})")
    for f in fails: print("  -", f)
    return 1 if fails else 0

if __name__ == "__main__":
    sys.exit(main())
