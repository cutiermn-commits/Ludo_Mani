# Progress — Wardrobe Buddy

_Last updated: 2026-11-17 (Claude Code)_

## Status by phase
| Phase | Status | Notes |
|---|---|---|
| 0. Foundation | ✅ Done (web verified; iOS/Android not run, see Blocked) | Expo SDK 58 + TS strict + Expo Router (`src/app`), Jest, 4 themes × light/dark (WCAG AA test), DA/EN i18n with parity test, `StorageAdapter`, `safeFetch` host allowlist, dependency gate, `npm run ci` |
| 1. Engine first | ✅ Done | `src/engine`: bands, extras, scoring, hard rules, 1 + 2 alternatives, reasons, week planner, learning. Coverage 98.8 % statements / 93.6 % branches |
| 2. Weather | ✅ Done (forecast fields NOT VERIFIED live) | City search, forecast, 1 h cache, stale/offline fallback, "What's it like outside?", attribution, no identifiers (tested) |
| 3. Wardrobe | 🟢 Built (device test pending) | Grid, filters, ♥, laundry toggle, add/edit/delete; **photos** from camera or library, resized on the device, metadata (EXIF/GPS) stripped, stored in the sandbox, colours suggested from the photo (D-042). Exit criterion "add 20 items smoothly on a mid-range Android" needs a real phone |
| 4. Me | ✅ Done (device test pending) | Onboarding (6 steps), parental gate (screen test: can't be skipped, 30 s pause after 3 misses), profile, avatar maker, theme, language, likes, **optional selfie, always blurred above the shoulders** (D-045; checked in a web test). Front-camera behaviour on Android depends on the phone's camera app (Expo docs) |
| 5. Today + Week | 🟡 First version | Weather card, mood picker, avatar wearing the outfit, swap tabs, "Why this?", don't-forget chips, week view |
| 6. Rating + learning | 🟡 First version | Stars + reason chips, "I wore this", learning shown in Me, reset in the parent area. Diary photo not built |
| 7. Polish | ⬜ Not started | |
| 8. Release prep | ⬜ Not started | |

## What she can do now (5-line note)
1. Pick Dansk/English; a grown-up answers the maths gate; she picks a nickname, age band, style, avatar and town.
2. Add clothes (type, colours, warmth, waterproof, style tags, ♥, in the wash). No photos yet.
3. Today: the weather, a mood, an outfit on her avatar, "Why this?", swaps and "don't forget" chips; then "I'll wear this" and a star rating.
4. Week: a 7-day plan that avoids repeats; Me: themes, dark mode, language, colours, "what I've learned".
5. Run it: `cd wardrobe-buddy && npm install && npx expo start` (press `w` for web, or scan with Expo Go).

## How to run / check
- `npm test` · `npm run test:engine` (coverage) · `npm run typecheck` · `npm run lint` · `npm run ci` (all three)
- Web build: `npx expo export --platform web`

## Blocked / needs the owner
- **D-015** where the code should live (own repo recommended). The `Ludo_Mani` repository is public, so personal details about the first user were removed from the docs and the sketch photo is kept out of git (`docs/sketch.jpeg` is git-ignored); see D-041.
- First Android build (needs your Expo login, see Next).
- Existing: D-004 store category, D-008 Open-Meteo confirmation email, D-009 legal review, D-010 developer accounts, D-011 native-speaker copy review.

## Open questions / NOT VERIFIED
- Open-Meteo **forecast** variable names (`temperature_2m`, `apparent_temperature`, `precipitation_probability`, `precipitation`, `wind_speed_10m`, `uv_index`, `snowfall`): the live call from the build sandbox returned HTTP 429 ("Daily API request limit exceeded", shared IP). The geocoding fields WERE verified live. Re-check on a device.
- The app has not been run on an iOS simulator or Android emulator (none in this cloud sandbox). The web build was exercised end-to-end in headless Chromium with the weather mocked.
- Apple 1.3 / 5.1.4 and the Google Families Policy were not re-read in this session (those hosts aren't on this sandbox's network allowlist). The rules in `docs/PRIVACY_SAFETY.md` (checked 17 Nov 2026) were used as given.
- Whether `Intl` weekday/number formatting in Hermes matches the web output exactly for `da-DK` (tests run on Node).
- Danish copy was written by Claude, so it needs a native-speaker review (D-011). Two places to check: the item names ("hættetrøje i grå") and "why" sentences.
- The clothing glyphs are emoji, which look different on each platform; they are temporary until photos.
- App icon and splash are still the Expo template images. The co-designer's sketch (pink/blue girl with clothes) needs original art.

## Next (priority: Google Play → web → iOS, D-043)
1. Android (package `dk.mani.wardrobebuddy`, D-044): `npx eas-cli@latest init` once, then `npx eas-cli@latest build -p android --profile preview` → install the APK on her phone and run the Phase 3 exit test (20 items).
2. Phase 5 polish of Today/Week, then Phase 6: the diary photo (it reuses the selfie blur).
3. Play paperwork drafts: Families target audience, Data safety form, privacy policy (kid + parent, DA + EN), start the closed test early (14 days).
4. Web hosting decision, then iOS last.

## Review of the starter docs (kickoff step 2)
| # | What | Suggested fix | Done? |
|---|---|---|---|
| 1 | ARCHITECTURE puts routes in `app/`; the Expo template and AGENTS.md use `src/app/` | Follow AGENTS.md (`src/app/`) | ✅ followed |
| 2 | OUTFIT_ENGINE doesn't say which value of the school-hours range sets the band | Coldest school hour + layers tip (D-016) | ✅ |
| 3 | Variety penalty on every item would push away her only jacket/shoes | Main pieces only (D-019) | ✅ |
| 4 | Hard rules can leave zero outfits (e.g. no rain jacket) | Soft fallback + tip (D-020) | ✅ |
| 5 | "Re-plan when > one band" is ambiguous | Literal for now, owner to confirm (D-021) | ❓ owner |
| 6 | Export "JSON + photos zip" needs a zip library (a new dependency) or per-file sharing | Decide in Phase 8; JSON export works now | ❓ |
| 7 | Face blur "on-device detection" has no first-party Expo module in SDK 58 | Crop/blur by default + manual brush (D-033) | ❓ owner |
| 8 | Apple Kids category tops out at 9–11; the audience is 11–15 | Already D-004; build to Kids standards regardless | ❓ owner |
| 9 | ROADMAP Phase 0 exit "runs on iOS sim + Android emulator" can't be checked in a cloud sandbox | Owner runs `npx expo start` once on a phone; web verified here | ❓ |

## Facts checked against current sources (kickoff step 3)
| Fact | Status | Source |
|---|---|---|
| Latest stable Expo SDK is 58 (`expo@58.0.26`) | VERIFIED 2026-11-17 | npm registry `npm view expo` |
| `expo-sqlite` works on web but needs wasm + COOP/COEP headers | VERIFIED | https://docs.expo.dev/versions/v58.0.0/sdk/sqlite (Web setup) |
| `expo-sqlite/kv-store` has an AsyncStorage-compatible API | VERIFIED | same page (Key-value storage) + package typings |
| `expo-localization` `getLocales()[0].languageCode` | VERIFIED | https://docs.expo.dev/versions/v58.0.0/sdk/localization |
| Jest setup with `jest-expo` | VERIFIED | https://docs.expo.dev/develop/unit-testing |
| `android.blockedPermissions` in app config | VERIFIED | https://docs.expo.dev/versions/v58.0.0/config/app |
| `expo-image-picker` ~58.0.10, `expo-image-manipulator` ~58.0.16 exist for SDK 58 | VERIFIED (versions only) | `expo/bundledNativeModules.json`; APIs to check in Phase 3 |
| No first-party face detection module in SDK 58 | VERIFIED-ish (absent from the docs index) | https://docs.expo.dev/llms.txt |
| Open-Meteo geocoding fields (`results[].name/latitude/longitude/country/admin1/timezone`), `language=da` works | VERIFIED live | geocoding-api.open-meteo.com |
| Open-Meteo forecast hourly variable names | **NOT VERIFIED** (HTTP 429 from shared sandbox IP) | — |
| Apple 1.3 / 5.1.4, Google Play Families Policy | **NOT VERIFIED this session** (hosts not reachable); taken from PRIVACY_SAFETY.md | — |

## Phase-end reviews (2026-11-17)
These were run as internal subagent reviews by the same AI system that wrote the code. They are not an independent human audit.

**privacy-safety-auditor**: 0 blockers, 4 major, 7 minor.
| Finding | Status |
|---|---|
| Gate too easy (2-digit × 1-digit, unlimited tries) | ✅ Now 2-digit × 2-digit with a 30 s pause after 3 misses; owner to confirm (D-025) |
| IP address goes to Open-Meteo without explicit parent consent | ✅ Consent step + parent switch; no consent = no network (D-035). Legal check still open (D-009) |
| In-app privacy text inaccurate ("no identifier", "only the town name", "uninstall removes it" on web) | ✅ Reworded in DA + EN; still needs your sign-off as privacy text |
| City search sent text while typing | ✅ Submit-only, sanitised, 40 characters (D-038) |
| Me changes preferences without the gate | 📝 D-036, owner to confirm |
| `/onboarding` could overwrite an existing profile | ✅ Redirects when a profile exists |
| Export goes through the OS share sheet; no photo zip | ⏳ Phase 3/8 |
| Ban-list regex missed nested packages; fetch scan too narrow | ✅ Broadened |
| `expo-image` unused | ✅ Removed (D-040) |
| Apple 2.3.8: no "for kids" wording outside the Kids category | ⏳ Add to D-004 / store listing (Phase 8) |
| No privacy-policy screen or link | ⏳ Phase 8 (needs your approval to publish) |

**architecture-reviewer**
| Finding | Status |
|---|---|
| High: re-rating could double-count learning | ✅ Fixed + provider test (D-039) |
| High: weather requests could race (old city wins) | ✅ Request sequence + city check + test |
| Forecast shown for the wrong city; no refresh on app resume or at midnight | ✅ City check; refresh + new date when the app returns to the foreground |
| Null forecast values became 0 °C | ✅ Hours without temperature dropped + test |
| Combination cap could trim the only rain jacket | ✅ Waterproof outers kept when raining + test |
| Swap logic in the screen, untested | ✅ `engine/swap.ts` + tests |
| `needsReplan` unused | ✅ Removed (D-021) |
| No provider tests | ✅ `AppState.test.tsx` (4 tests) |
| Boundary tests read their numbers from config | ✅ Hard-coded spec numbers test |
| Duplicated rain/wind thresholds in the UI | ✅ Uses engine `isRainy`/`isWindy` |
| tagWeights not in the spec | 📝 D-037 |
| Writes aren't atomic (two keys per action) | ⏳ Accepted for now; revisit with photos |
| Context re-renders everything | ⏳ Accepted; profile when photos arrive |

**Verification at commit:** 625 unit tests pass; engine coverage 98.8 % statements / 95.3 % branches; `tsc` and `expo lint` clean. The web export was driven end-to-end in headless Chromium (consent → gate → set-up → 7 items → Today → rate → Week → Me → language switch → parent gate → parent area). Weather was mocked, there were no console errors, and the only hosts contacted were localhost and the two Open-Meteo hosts.
