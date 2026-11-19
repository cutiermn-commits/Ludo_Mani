# Outfit Engine — Wardrobe Buddy

Pure TypeScript in `src/engine/`. Input: wardrobe, profile, weather day, mood, history, learning state. Output: ranked outfits + extras + a plain-words reason. Same input gives the same output (any randomness uses a seed, e.g. the date).

> All numbers below are **ASSUMPTIONS / starting values**. Keep them in one `engine.config.ts`, unit-test them, and let the learning tune them.

## 1. Weather → needed warmth
`feels = apparentTemperature + profile.tempOffsetC + learning.tempOffsetC`
| Feels-like (°C) | Band | Target warmth sum (top + bottom + outer) |
|---|---|---|
| ≥ 22 | hot | 2–4 |
| 16–21 | mild | 4–6 |
| 10–15 | cool | 6–8 |
| 3–9 | cold | 8–11 |
| < 3 | freezing | 11+ |

Use the morning-to-afternoon school-hours range. If the day swings by ≥ 8 °C, prefer layers and add a "take it off later" tip.

## 2. Extras rules (starting values)
| Condition | Extra |
|---|---|
| Rain chance ≥ 50 % or rain ≥ 1 mm in school hours | Waterproof outer layer required; umbrella chip |
| Wind ≥ 30 km/h | Prefer windproof; no umbrella; hood or hat tip |
| Feels < 5 °C | Hat + gloves; scarf if < 0 °C |
| Feels < 3 °C or windy and cold | Lip balm / moisturiser chip |
| UV index ≥ 3 | Sunscreen chip; cap if ≥ 6 |
| Snow | Warm, waterproof shoes |

## 3. Building candidates
1. Filter out items that are in the wash, of the wrong category, or don't match her chosen style.
2. Build combinations: (top + bottom) or dress, + shoes, + outerwear if the band is cool or colder or it's raining. Limit to around 300 combinations; sample favourites first.
3. Hard rules: a waterproof outer when raining; warmth sum inside the band ± 1.

## 4. Scoring (0–1 each, weighted sum)
| Factor | Weight | Idea |
|---|---|---|
| Weather fit | 0.35 | Distance from the target warmth band |
| Taste | 0.25 | Average learned item weight, plus favourites |
| Mood match | 0.15 | Style tags vs mood (cozy → soft/knit, sporty → athletic, fancy → dress/skirt…) |
| Variety | 0.15 | Penalty if an item was worn in the last 3 days or is already planned this week |
| Colour harmony | 0.10 | Simple rules: neutrals go with anything; at most 2 bold colours; avoid disliked colours |

Return the top 1 + 2 varied alternatives (different main item each). The "Why this?" text is put together from the top 2 factors, e.g. "Cozy for 7° and wind, and you loved this hoodie last week."

## 5. Week planner
Plan greedily day by day with the variety penalty across the week. Re-plan when the forecast changes by more than one band.

## 6. Learning (on-device)
- Per-item weight starts at 0. After each rating: `w ← w + α·(stars − 3)/2` with α = 0.2, kept between −1 and 1. "Not my style" also lowers the style tag; ♥ raises it.
- Temperature offset: "too cold" → `tempOffsetC −= 0.5`, "too warm" → `+= 0.5`, kept between −4 and +4.
- "Wore it" without changes counts as a mild positive (+0.1).
- Show it in Me: "I've learned you like hoodies and get cold easily". Parent can reset it.

## 7. Tests (minimum)
Every band has an outfit; rain → waterproof; empty wardrobe → helpful message; no outerwear owned → tip to add one; same input gives the same output; learning moves weights the right way and stays inside its limits.
