# Product — Wardrobe Buddy

## Problem
A girl aged 11–15 wakes up and can't decide what to wear to school. Her clothes, the weather, her mood and her sense of style all pull in different directions. Copenhagen weather (wind, rain, quick temperature changes) makes this harder. She also forgets the extras: rain jacket, gloves, sunscreen, lip balm.

## Goal
In under 30 seconds each morning, she gets one confident outfit suggestion from her own wardrobe, plus a short "don't forget" list. She can swap any item. Over time the app learns her taste.

## Primary user
- Girls aged 11–15 (first user: a child in the owner's family, in Denmark)
- Uses a phone or tablet in the morning, sometimes a browser
- Cares about: looking like herself, comfort, not being cold or wet, and variety (not wearing the same thing twice in a row)

## Secondary user
- A parent: sets it up, approves settings behind a parental gate, can export or delete all data

## Features (v1 = public store release)
| # | Feature | Notes |
|---|---|---|
| F1 | Parent setup + parental gate | First launch is a parent-led setup. Settings, links and delete sit behind the gate |
| F2 | Profile | Nickname, age band (11–12 / 13–15), style likes, colours she likes and dislikes, "I run cold/warm", school dress rules (free text, optional). No real name, no birthdate |
| F3 | Avatar or photo | Default: a built-in avatar maker. Optional selfie with **face blur ON by default**. Stored on-device only |
| F4 | Wardrobe | Photograph each item, pick a category, auto-detect its main colour, add warmth level, waterproof yes/no, style tags and a ♥ favourite |
| F5 | Weather | City search (no GPS by default). Today + 7 days: temperature, feels-like, rain, wind, UV |
| F6 | Daily suggestion | One main outfit + 2 alternatives, "Why this?" in kid-friendly words, plus extras (jacket, gloves, hat, umbrella, sunscreen, lip balm or moisturiser) |
| F7 | Mood | Emoji mood picker (e.g. happy, cozy, sporty, fancy, chill), which nudges the style |
| F8 | Week planner | Up to 7 days, avoids repeats, respects items "in the wash" |
| F9 | Rating | 1–5 stars + quick reason chips (too cold, too warm, not my style, love it, uncomfortable) |
| F10 | "I wore this" photo | Optional outfit-of-the-day photo, face blur on. Used for her diary. Learning uses the tagged items, not the image |
| F11 | Learning | On-device: item preference weights + personal temperature offset, explained in plain words |
| F12 | Themes | Pink, blue, green, purple, plus dark mode |
| F13 | Languages | Danish + English, complete at launch. Picks the device language by default; she can switch anytime in Me. Clothing names, mood words, weather tips and "Why this?" texts are written for each language, not machine-translated |
| F14 | Data controls | Parent can export or delete everything (behind the gate) |

## Out of scope for v1
Accounts, cloud sync, sharing, friends/social, shopping or links to shops, virtual try-on on a real body, cloud AI, notifications that nag. (In scope since D-059: the drawn avatar wears cut-outs of her own clothes in standard slots, with no body sizing.) Possible later: a gentle morning reminder (opt-in, set by the parent).

## Success criteria (measured on-device, with no analytics SDK)
- She opens it on most school mornings (self-reported in a parent review after 4 weeks)
- Average rating ≥ 4/5 after 2 weeks
- Suggestion shown in < 2 s once the weather is cached
- Passes App Store + Google Play review on the first or second submission

## Inspiration (look at, don't copy)
Adult wardrobe apps such as Stylebook, Acloset, Whering and Cladwell. NOT VERIFIED: their current features and age ratings. Claude Code should look them up before borrowing ideas. Borrow interaction patterns only, never assets or text.
