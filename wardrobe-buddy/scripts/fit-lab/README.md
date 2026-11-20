# Fit lab: testing how clothes are worn (D-068)

No real photos of clothes or people can be used here, so this lab makes **synthetic** ones and
runs the app's own code on them. Nothing in this folder ships in the app.

| Step | Command | What it does |
|---|---|---|
| 1 | `python3 garments.py OUT/photos` | 16 garment types × 4 ways of photographing them (upright, sideways, upside down, a phone photo stored sideways with an EXIF tag) on wood, carpet, a bed sheet, tiles and a dark floor, plus one busy rug. Writes `truth.json` with the real shoulder-seam and waistband points. |
| 2 | `python3 person.py OUT/people` | Three imaginary people (not real persons) standing in a room; one stored sideways with an EXIF tag. |
| 3 | `python3 prep.py OUT/photos OUT/prep300 300` | Turns photos upright from EXIF (as the phone and the browser do) and shrinks them to the cut-out width. |
| 4 | `npx esbuild scripts/fit-lab/lab.ts --bundle --platform=node --alias:@=./src --outfile=OUT/lab.js && node OUT/lab.js OUT/prep300 OUT/photos OUT/cut` | Cut-out, way-up and shape against the ground truth (`turn x/y` = found/expected; `err` = shoulder or waistband error as % of its width). |
| 5 | `npm run build:web`, serve `dist-site` with a plain static server (no single-page rewrites, e.g. `python3 -m http.server 8092 -d dist-site`), then `node scripts/fit-lab/e2e.js OUT/photos OUT/people OUT/shots girl-a` | The real app in Chromium: her photo, all garments added through the UI, ten outfits worn on the avatar and on the photo; screenshots of the mirror. |
| 6 | `python3 sheet_cuts.py OUT` / `python3 sheet_outfits.py OUT OUT/sheet.png` | Contact sheets to look at. |

Needs Python 3 with Pillow and NumPy, and the pre-installed Playwright. Results of the run on
2026-11-20 are in `docs/DECISIONS.md` (D-068).
