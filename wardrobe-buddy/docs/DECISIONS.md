# Decisions & Open Questions — Wardrobe Buddy

Format: ID · date · decision · why · alternatives · status. Claude Code adds new entries; the owner approves anything marked **OWNER**.

## Decided
- **D-001 · 2026-11-17 · Public store launch (iOS + Google Play) + web.** Owner's choice. Means child-safety store rules are hard requirements.
- **D-002 · 2026-11-17 · Expo (React Native) + TypeScript.** One codebase for iOS, Android and web; managed builds; strong tooling. Alternatives: Flutter (weaker web), native ×2 (double the cost).
- **D-003 · 2026-11-17 · On-device only, no backend, no accounts.** Lowest privacy risk and simplest store review for kids' apps. Trade-off: no sync between phone and web; web data lives in that browser only.
- **D-005 · 2026-11-17 · No cloud AI. Rule-based engine + on-device learning.** Sending children's photos to an AI provider would break the "no data to third parties" rule for kids' apps. The engine stays explainable and testable.
- **D-006 · 2026-11-17 · City search instead of GPS.** Avoids the location permission; Google Families bans precise location.
- **D-007 · 2026-11-17 · Hands-off build mode.** Claude Code works phase by phase and stops only for the cases listed in CLAUDE.md.
- **D-012 · 2026-11-17 · Target age 11–15** (was 11–14). Owner's choice. Profile age bands are 11–12 and 13–15. The parent-led setup stays for all ages.
- **D-013 · 2026-11-17 · Non-profit app.** Free forever. No ads, no subscriptions, no in-app purchases and no in-app donation button in v1 (any payment flow would need a parental gate and would change the Open-Meteo position).
- **D-014 · 2026-11-17 · Danish + English, equal status, both complete at launch.** Owner's choice. Default comes from the device language, with an in-app switch (no gate). The store listings, privacy policies and screenshots are in both languages too. A key-parity test in CI keeps the two languages in step.

## Open — need the owner
- **D-004 · OWNER · App Store listing:** Kids category (9–11 band) or a general category with an age rating? Decide before Phase 8. Build to Kids standards regardless.
- **D-008 · OWNER (low risk now) · Open-Meteo licence.** Their terms list "private or non-profit websites or apps that do not have subscriptions or advertising" as non-commercial, which matches D-013. Remaining step: a short confirmation email to info@open-meteo.com and keep the reply on file. Show CC BY 4.0 attribution. Free limits: under 10,000 calls a day; cache forecasts on-device for about 1 hour. `WeatherProvider` keeps the provider swappable.
- **D-009 · OWNER · Legal review** of the privacy policy and the on-device GDPR position (NOT VERIFIED). Also confirm Denmark's current consent age (sources conflict: 13 vs 15).
- **D-010 · OWNER · Developer accounts:** Apple Developer Program + Google Play Console in whose name? Individual or organisation decides the seller name shown in the stores. Apple waives its yearly fee only for registered non-profit organisations (not individuals) in eligible countries publishing free apps. **NOT VERIFIED** whether Denmark is currently eligible; check Apple's fee-waiver page. Being "non-profit" as an individual developer doesn't qualify for the waiver.
- **D-011 · Copy review in both languages** by native speakers (Danish and English) before release. Ideally the first user and a friend test the Danish wording too.

## Added by Claude Code — 2026-11-17 (Phases 0–2 + first screens)
- **D-015 · Decided (owner, 2026-11-17) · Where the code lives.** Wardrobe Buddy stays a self-contained project in the `wardrobe-buddy/` folder of the public `Ludo_Mani` repository (own `package.json`, lockfile, docs). The owner withdrew the private-repository idea. Because the repo is public, no personal details go into it (D-041). It can still be split out later with `git subtree split --prefix wardrobe-buddy`.
- **D-016 · School hours = 08:00–14:59 local; dress for the coldest school hour.** The spec says "use the school-hours range" but not which value. We use `feelsMin` over 08–15 (she leaves in the cold morning) and add the "layers" tip when the day swings ≥ 8 °C. Alternative: the mean. Tunable in `engine.config.ts`.
- **D-017 · A dress counts double in the warmth sum** (it replaces top + bottom). ASSUMPTION.
- **D-018 · "Choose your style" filter.** Only "Trousers & hoodies" filters (removes dresses and skirts); "Dresses & skirts" and "Mix" do not filter. If the filter would leave nothing to wear, it is ignored rather than showing an empty screen.
- **D-019 · The variety penalty applies only to tops, bottoms and dresses.** Shoes and jackets are reworn daily in real life; penalising them would push odd picks.
- **D-020 · Hard rules fall back softly.** If no combination passes the hard rules (waterproof when raining, warmth in band ± 1), the best-scoring outfit is still shown with a tip ("add warmer clothes" / "add a rain jacket"). The waterproof rule only applies if she owns a waterproof outer layer.
- **D-021 · Re-planning.** The week plan is not stored; it is recomputed from the latest forecast every time the Week screen renders, so any forecast change re-plans at once. The unused `needsReplan` helper was removed after the architecture review. Revisit if she wants to "lock" a planned day.
- **D-022 · Colour-harmony and taste constants** (base 0.8, −0.5 for > 2 bold colours or per disliked colour, +0.2 liked colour, favourite bonus 0.2) are ASSUMPTION starting values in `engine.config.ts`.
- **D-023 · Storage.** iOS/Android: `expo-sqlite/kv-store` (VERIFIED in the SDK 58 docs, "Key-value storage"). Web: `localStorage`, because `expo-sqlite` on web needs WebAssembly plus COOP/COEP response headers on the host (VERIFIED in the SDK 58 docs, "Web setup"), which simple static hosts can't set. Both sit behind `StorageAdapter`.
- **D-024 · Dependency gate.** `approved-dependencies.json` lists every runtime dependency with its network behaviour. A test fails if a dependency is not listed, and another test fails if a known ads/analytics/crash/telemetry SDK appears anywhere in the lockfile. Removed from the template: `expo-web-browser` (opens external links), `expo-glass-effect`, `expo-symbols`, `@expo/ui`, `expo-device`. Added: `expo-localization`, `expo-sqlite` (first-party Expo modules, no fetch/XHR found in their build output); dev only: `jest-expo`, `jest`, `@testing-library/react-native`, `@types/jest`, `@types/node`.
- **D-025 · Decided (owner confirmed 2026-11-17: keep the maths question, no PIN) · Parental gate** = a typed answer to a two-digit × two-digit multiplication (e.g. 47 × 26), a new question after each wrong answer, and a 30-second pause after 3 wrong answers. It cannot be turned off and resets every time the parent area is opened. The privacy audit judged the first version (× one digit) too easy for 11–15-year-olds against Apple's "adult-level task" wording. Alternative: a parent PIN chosen at setup (stronger, but can be forgotten). Your call.
- **D-026 · State = React context** (`src/features/app/AppState.tsx`), no Zustand. Fewer dependencies; the app's state is small.
- **D-027 · i18n = a small in-house `translate()`** with typed keys from `en.json` (a missing static key fails the typecheck), plus `expo-localization` for the device language. No i18next. Tests check: identical key sets, no empty values, matching `{placeholders}`, a label for every domain value, no hard-coded JSX text or label props, and no body/weight/size words in either language.
- **D-028 · Tests.** Jest via `jest-expo` (VERIFIED in the Expo docs, "Unit testing with Jest"). E2E for now: a Playwright script against the web export (not committed; Maestro for native is still open).
- **D-029 · Items can be added without a photo** (colour block + clothing glyph) until photo capture lands in Phase 3, which needs your approval for the camera/photo permission. The avatar is drawn from simple shapes and "wears" the outfit colours, so no image assets or known characters are involved.
- **D-030 · Coordinates are rounded to 2 decimals (≈ 1 km)** before any request. Requests carry no headers, cookies, credentials or referrer (`safeFetch`, tested).
- **D-031 · Today's mood is not stored** in the profile. It lives in memory for the session and is saved only on the outfit she chooses ("I'll wear this").
- **D-032 · Web output = single-page app** (`web.output: "single"`); the template's server output isn't needed (no backend).
- **D-033 · Decided (owner confirmed 2026-11-17) · Face blur (Phase 4).** The Expo SDK 58 docs index lists no first-party face-detection module (checked llms.txt, 2026-11-17). Proposal: a selfie is optional and is cropped and blurred above the shoulders by default, with a manual "unblur" brush only for the parent. Needs your decision before Phase 4.
- **D-034 · Phase order.** Phases 0–2 were done in order (engine before screens). Simple first versions of the Today, Week, Wardrobe, Me, rating and parent screens (Phases 4–6 scope, minus photos) were built early so she can try the flow now. Phases 3–7 still need their full exit criteria.
- **D-035 · Decided (owner confirmed 2026-11-17) · Explicit parent consent for weather lookups.** Open-Meteo unavoidably sees the device's IP address (and, on web, the browser's User-Agent). Apple's kids rules (per the audit, VERIFIED on developer.apple.com) ask for explicit parental consent before device information goes to third parties. Set-up therefore asks the parent "Yes, look up the weather / No, we will tell it ourselves", and the parent area has a switch. Without consent the app makes no network calls at all (enforced in `AppState`, tested) and uses "What's it like outside?". NOT VERIFIED: whether this counts as "explicit consent" legally; it goes to the legal review (D-009).
- **D-036 · Decided (owner confirmed 2026-11-17) · The Me screen is hers, not "settings".** Theme, colours, language, style and "I get cold/warm" are her own preferences and are not gated. Everything that touches data, the network or the outside world is gated: city, weather consent, export, reset, delete. This reads PRIVACY_SAFETY §2.5 "settings" as parent settings.
- **D-037 · Learned style-tag weights.** Beyond the spec's per-item weights, ♥ "love it" and "not my style" also nudge the outfit's style tags (±0.1, kept between −1 and 1), and taste scoring uses them at half weight. This is how "not my style" can affect items she hasn't rated yet.
- **D-038 · City search runs only when she taps Search.** Digits and symbols are stripped and the query is capped at 40 characters, so a street address or e-mail can't be sent by accident.
- **D-039 · One rating per day.** Changing today's outfit after saving keeps the day's outfit id, and a second rating for the same outfit is ignored, so learning never counts a day twice (architecture review; tested in `AppState.test.tsx`).
- **D-040 · Removed `expo-image`** until photos land (Phase 3), so there is one fewer network-capable dependency in the bundle.
- **D-041 · Public repository → no personal details.** The project is in the public `Ludo_Mani` repository (D-015), so docs name no family member, age, city or school, and the photo of the co-designer's sketch stays out of git (`docs/sketch.jpeg` is git-ignored; keep it locally or in a private repo). Owner's choice, 2026-11-17.
- **D-042 · Owner approved the camera and photo-library permission (2026-11-17).** Phase 3 implementation:
  - `expo-image-picker`: the system photo picker (no permission prompt) or the camera, which asks only after a one-time explanation in the app.
  - `expo-image-manipulator`: resizes and re-encodes on the device (900 px on phones, 480 px on web).
  - The JPEG's APP1/APP13 metadata (EXIF, which can hold GPS; XMP; IPTC) is always stripped by our own code.
  - Photos are saved in the app sandbox with `expo-file-system`, or inline in browser storage on web.
  - Colours are suggested from a 24×24 thumbnail decoded by our own PNG decoder (no extra dependency).
  - Android: RECORD_AUDIO and SYSTEM_ALERT_WINDOW are blocked. The legacy storage permissions apply to Android ≤ 12 only (`maxSdkVersion 32`). Checked by running `expo prebuild` on a scratch copy.
- **D-043 · Platform order: Google Play first, then web, then iOS (owner, 2026-11-17).** All three still share one codebase. Release work, device testing and store paperwork follow this order. `eas.json` has a `preview` profile (installable APK for family testing) and a `production` profile (AAB for Play, submitted to the internal track as a draft).
- **D-044 · Decided (owner, 2026-11-17) · Android package name `dk.mani.wardrobebuddy`** (permanent after the first Play upload). Google Play developer account: the owner's personal account. Google's help page says personal accounts created after 13 Nov 2023 must run a closed test with at least 12 testers for 14 days in a row before going to production (support.google.com/googleplay/android-developer/answer/14151465). Account creation date and whether this applies: NOT VERIFIED.
- **D-045 · Selfie blur (Phase 4).** No face detection exists in Expo SDK 58, so the top 60 % of every selfie (the face area) is blurred, fading out over the next 10 % so the outfit stays visible.
  - **How:** the area is averaged into a grid 16 cells across, then smoothly enlarged again (bilinear). This replaced a 3-pass box blur after the architecture review: it takes ~5 ms instead of ~38 ms for 360×480 in Node; Hermes on a phone is NOT VERIFIED.
  - **"Blur the whole photo":** a button that re-blurs the saved selfie completely, for when the face sits lower in the picture (privacy audit).
  - **Copy:** "Only photos of yourself, no friends or family." 
  - It runs in our own code on a 360 px copy. The JPEG is re-encoded and its metadata stripped. The picker's copy, our temporary files and the picker's and manipulator's whole cache folders (`ImagePicker`, `ImageManipulator`) are deleted after every photo, on success and on error, and again at start-up. The audit found that Android's crop step writes its own copy whose URI the app never receives (checked in the library source).
  - **The unblurred original is never saved.** Simplification of D-033: there is no "unblur brush" for parents in v1. Unblurring would mean keeping the original face photo, which is the risk the blur exists to avoid.
  - Web test: the face area's pixel detail went from a sharp pattern to 0.0, while the outfit area kept 22.1.
  - A selfie can be added in setup (her sketch, page 2b: "avatar or a photo of yourself") or in Me. Today shows it instead of the drawn avatar when she chooses "My photo".
- **D-046 · Android auto-backup off** (`android.allowBackup: false`, VERIFIED in the SDK 58 app-config docs). Otherwise Android would copy the profile, wardrobe and photos to the family's Google Drive, which contradicts "stays on this device". Trade-off: data does not move to a new phone by itself; the parent export is the way to keep it. iOS iCloud backup of app documents: NOT VERIFIED, decide before the iOS release.
- **D-047 · In-house image code instead of a dependency.** This covers PNG decoding/inflate, the PNG encoder, the blur, colour naming and JPEG metadata stripping. No Expo module gives pixel access, so some custom code was needed anyway; the inputs come only from our own image manipulator; and every extra package is a privacy review (non-negotiable 7).
  - **Hardening after the review:** zlib header, stored-block length and over-subscribed Huffman checks; output and size caps; a fuzz test; 16-bit PNG support.
  - **Alternative if it ever causes trouble:** `fflate` for inflate (no dependencies), keeping the rest in-house.
- **D-048 · Photo-file lifecycle.** New data is saved before an old photo file is deleted. A start-up sweep deletes saved photos that no item or profile refers to (abandoned edits or set-up) and empties the image caches. Storage errors (e.g. full browser storage) are shown instead of silently losing data. Web photos are 320 px at quality 0.5 to fit browser storage.
- **D-049 · Expo project linked (owner, 2026-11-17).** The project is `@cutiermn/wardrobe-buddy` (EAS project ID in `app.json`), the same Expo account as the Ludo app.
  - **Android signing key:** created and stored by Expo (remote credentials). Google Play needs this same key for every future update, so it must not be deleted from the Expo account.
  - **versionCode:** managed remotely and starts at 1.
  - **Builds from the cloud session:** they use an Expo access token kept as a network secret on the session environment; it is never in the repository.
  - **EAS uploads the project through git,** so git-ignored files such as the sketch photo are not sent.
  - **Expo CLI's own tracking:** the CLI tries to reach `cdp.expo.dev`, likely usage analytics (NOT VERIFIED). It is blocked in the cloud session. This concerns the build tool only, not the app.
- **D-050 · Browser version: mobile-first, served by GitHub Pages (owner priority, 2026-11-17).**
  - **Where:** `npm run build:web` builds into `../docs/wardrobe` with `experiments.baseUrl = /Ludo_Mani/wardrobe` (VERIFIED, SDK 58 app-config docs). This is the same GitHub Pages setup as the Ludo web game, so the address is https://cutiermn-commits.github.io/Ludo_Mani/wardrobe/. **Superseded by D-055:** the app gets its own origin, https://wardrobe-buddy.github.io/.
  - **Added:** a web app manifest and icons (installable to the home screen), `viewport-fit=cover`, a theme colour and `referrer: no-referrer`; `404.html` as a copy of the app so deep links survive a reload on GitHub Pages; and a service worker. The service worker caches only the app's own hashed files from the same origin, never the weather host, and stores no personal data, so the app opens offline.
  - **"Take a photo" on web** uses the browser's file input with `capture`. There is no camera stream and no permission prompt (expo-image-picker web source, SDK 58), so the in-app camera explanation is skipped on web.
  - **Tested** on Pixel 5, iPhone SE and Galaxy S9+ emulation in Chromium: no sideways scrolling on any screen, a deep link survives a reload, the manifest is valid, and the app opens offline. Real Safari on an iPhone was NOT tested; on iOS, home-screen apps get separate storage from Safari tabs (NOT VERIFIED).
  - **Privacy:** like any web host, GitHub sees visitors' IP addresses when it serves the files. Its logging and retention were NOT VERIFIED (GitHub's privacy statement); this goes into the web privacy policy (Phase 8). There are no third-party scripts, fonts or analytics.
- **D-051 · Original placeholder icon** (pink/blue split, white T-shirt with a heart, after the co-designer's sketch) replaces the Expo template icon on all platforms until final art is made.
- **D-052 · Phase 7 polish.** Uses RN `Animated` (no new animation library) for the outfit drop-in and respects the OS reduce-motion setting. `expo-haptics` (first-party, no network) gives a light tap on choices; it is silent on web. A source-scanning accessibility test requires a role and label on every pressable, a label on every switch and text field, and either a description or screen-reader hiding on every image.
- **D-053 · Export format** (PRIVACY_SAFETY §2.9). The export is one JSON file (schema 2) with every photo embedded as a data URI, instead of a zip, so no zip dependency is needed. Selfies and diary photos stay blurred, and the cached forecast is left out. On phones it is written to the cache, shared with `expo-sharing` (first-party, no network), then deleted; on web the browser downloads it. Export is behind the gate.
- **D-054 · Phase 8 paperwork is drafts only.** Privacy policies, store listings, Data safety answers and screenshots live in `docs/legal` and `docs/store`. Publishing a policy or submitting to a store needs the owner (CLAUDE.md hard stops). Data safety declares the town search and approximate coordinates sent to Open-Meteo conservatively, as collected and shared, optional, for app functionality, until Open-Meteo confirms how it handles requests.
- **D-055 · Decided (owner, 2026-11-17): Option A · Give the web app its own address.** Browsers keep `localStorage` per site address (origin), and `https://cutiermn-commits.github.io` is shared by the Ludo game (`/Ludo_Mani/play`) and every GitHub Pages project of this account. Any page published there could read or wipe the web app's data: nickname, town, school-rules text, and the blurred selfie and diary photos (privacy audit, Phases 5–8). Code cannot fix this; only a separate origin can.
  - **Option A:** a GitHub organisation just for the app (e.g. `wardrobe-buddy.github.io`), free, the same Pages setup.
  - **Option B:** a custom (sub)domain, which costs money for the domain.
  - **Option C:** go live here anyway and disclose it. The draft parent policy already mentions it.
  - **Chosen: A.** The owner creates a free GitHub organisation (proposed name `wardrobe-buddy`) with a public repository `wardrobe-buddy.github.io`. The web app is published there at **https://wardrobe-buddy.github.io/** (root path; `web/site.json`). `npm run build:web` now builds into `wardrobe-buddy/dist-site/` (git-ignored), and the copy in Ludo's `docs/wardrobe` was removed, so merging the Ludo PR publishes nothing of Wardrobe Buddy on the shared address. The source code stays in this repository. NOT VERIFIED: whether the org name is free (GitHub user search found no account with that login).
- **D-056 · Honest blur wording.** There is no face detection, so the app and the drafts now say "the top of the photo, where your face usually is, is blurred" and point to "Blur the whole photo", which now exists for diary photos too. "Not backed up to the cloud" is now claimed only for Android (`allowBackup:false`). iOS iCloud backup of app documents is NOT VERIFIED and must be decided before the iOS release.
- **D-057 · Export schema 3.** Photos are keyed by `item:<id>`, `selfie` and `diary:<id>`, and `data` refers to them as `photo:<key>`, so no device file paths leave the phone. Phones write the file photo by photo with `File.write(…, { append: true })`, which never holds the whole export in memory. The file stays in the cache after sharing (the receiving app may still be reading it) and is removed by the start-up sweep. The export has a busy state and an error message.
- **D-058 · Service-worker updates.** A new deploy keeps the previous version's cache, so a tab still open on the old version can load its old route files. The version is a hash of the file contents. Page loads fall back to the cached app after 3 s on a weak network. The open-tab-after-deploy case was not run as a test (NOT VERIFIED).
- **D-059 · Decided (owner, 2026-11-18): the avatar wears her own clothes (option B).** The owner asked for the daily suggestion to dress a model with her real clothes. Three options were weighed:
  - **A. Photo-realistic try-on on her own photo:** rejected. It needs body photos sent to a cloud AI, and body sizing; both break non-negotiables 1–2, PRODUCT.md "out of scope: virtual try-on on a real body, cloud AI", and the store kids' rules.
  - **B. Avatar wearing her own clothes:** chosen.
  - **C. Outfit collage only.**

  **How it works:**
  - Each clothing photo gets an on-device background cut-out (`src/domain/image/cutout.ts`): border-colour flood fill, keeping the large regions (so a pair of shoes works), soft edge, cropped. A quality check refuses busy or patterned backgrounds and garments cut off by the frame.
  - The cut-out is stored as a PNG next to the photo (`ClothingItem.cutoutUri`; 300 px on phones, 200 px on web) and is covered by the start-up sweep, delete, replace and export.
  - Colours are read from the garment only when there is a cut-out.
  - The avatar draws each cut-out in a fixed slot (`garmentLayout.ts`): top, bottoms, dress, jacket over, shoes. The slots are the same for everyone, so there is no body shape, size or "fit" anywhere.
  - Items without a cut-out keep the colour block.
  - In the clean style and next to a selfie, an outfit collage of the cut-outs or photos is shown (`OutfitStack`). Clothes are never put onto her real photo.
  - The photo screen asks for a plain floor, bed or wall, and the item editor has "Make it wearable" for older photos.

  **Limits:** proportions are approximate (garments are scaled to their slot). Cut-out quality depends on the background. It was tested on synthetic and generated photos, not yet on real phone photos (NOT VERIFIED).
- **D-060 · D-059 review fixes.**
  - **Critical:** saving an item no longer deletes its new cut-out (`draftsToDiscard`, tested).
  - **Colour guess:** the cut-out step no longer purges the cache the colour fallback needs.
  - **Placement:** garments keep their shape (`cutoutAspect`) and hang from the shoulders or waist; shoes stand on the floor. A dress hides tops and bottoms even without a cut-out. The body under a real garment is skin, never a colour block.
  - **Cut-out checks:**
    - a gradient is followed only to 1.6×T from the background
    - cut-outs filling < 22 % of their bounding box are refused
    - no more than 20 % of the border ring, or 35 % of any one side, may be garment; this refuses a person photographed from the waist up (test)
    - squared distances, with no allocations in the fill loop
  - **Size and policy:** web cut-outs are 160 px, and the parent policy mentions cut-outs.
  - **NOT VERIFIED:** that the image manipulator keeps transparency on Android, and cut-out speed on a real phone.
- **D-061 · Decided (owner, 2026-11-18): simple flow, no automatic suggestions.** The owner reported that the co-designer doesn't want suggestions. She wants three simple steps:
  1. **Me:** configure herself (avatar and her own photo).
  2. **Wardrobe:** take or upload a photo of each piece and say what it is (T-shirt, jeans, hoodie, jacket…). No colours or anything else to fill in.
  3. **My day:** she picks clothes from her wardrobe and sees them worn by her avatar or on her own photo.

  **Removed from the UI:** moods, suggestions and "why", ratings, the week planner, the outfit diary, colour/warmth/style/occasion entry, liked colours and the "I run cold/warm" setting.

  **Kept:**
  - A small weather line on My day (owner choice), behind the same parent consent (D-035).
  - Her pick for today is saved as today's outfit, so it is still there when she comes back.

  **Not deleted yet:** the engine (`src/engine`, tested) and the rating/learning code in AppState. They are no longer reachable from the UI and can be removed or reused later.

  Colours are still guessed from each photo, without asking her. They are only used to draw clothes whose photo couldn't be cut out.
- **D-062 · Decided (owner, 2026-11-18): rich avatar with drawn height and shape choices, no numbers.**
  - **Request and decision:** the owner asked for height and weight in the profile. Claude advised against it: the non-negotiable "no body/weight/size talk" applies, a typed weight can't make a flat overlay fit any better, and it adds child-safety risk. The owner chose the "body shape picker, no numbers" option.
  - **What she chooses:** height (shorter / medium / taller) and shape (1 / 2 / 3) as pictures of her avatar. Nothing in kg or cm is stored or shown, and the copy uses "Height" and "Shape", never body or size words (i18n test).
  - **The new avatar** (`react-native-svg`) has:
    - 8 skin tones, 10 hair colours and 8 hairstyles
    - 6 eye colours
    - glasses, freckles and earrings
    - a bow, headband or clips
    - a plain base outfit (tank top, shorts, sneakers) that her clothes go over
  - **Dependency check:** `react-native-svg` 15.16.0 is bundled with SDK 58. Its only network code is `SvgUri`/`SvgCssUri`, which a test bans.
- **D-063 · Decided (owner, 2026-11-18): her own full-body photo, NOT blurred during testing.** This replaces the selfie blur (D-033, D-045) for the try-on photo, during the owner's test period only.
  - **Unchanged:** metadata is stripped, the photo stays in the app sandbox, the picker and manipulator copies are deleted, and the photo is in the parent export and in delete-all.
  - **Size:** 720 px wide on phones, 420 px in the browser.
  - **BLOCKER before any store release:** decide on blurring or face handling, then update the privacy drafts and the Play data-safety draft. The blur code (`processSelfie`, `blurTop`) is kept for that.
- **D-064 · Decided (owner, 2026-11-18): "AI on the phone" for automatic fitting.**
  - **Options weighed:** the owner first asked for an AI service. Claude explained the choice between cloud try-on (her photo uploaded, cost, account, child-photo terms) and on-device pose detection. The owner chose on-device.
  - **Model:** MoveNet SinglePose Lightning v4 (Google, Apache-2.0). It finds shoulders, hips and ankles. It is used as the TF.js graph conversion from `@vladmandic/human-models` 3.0.4 (MIT), vendored in `vendor/movenet/`:
    - sha256 json: df8cbde44d00f533ccc4916a7c6ebc17316532fb3fadad114ec667fef22872e9
    - sha256 bin: bf97bc10d9c8a11200b0190ed64ce039b6252f1aff7cb552aca99b3d191c2f34
  - **Where it runs:** on TF.js' plain-JavaScript CPU backend, inside ONE offline page, `assets/pose/pose.html` (6.8 MB, built by `npm run build:pose`). The page's CSP is `default-src 'none'`, so it can make no network request (test).
    - **Phones:** a hidden `react-native-webview`, loaded only while a photo is checked and closed 20 s later. It allows only that file, refuses navigation and has no extra windows.
    - **Browser:** a sandboxed iframe (scripts only). Messages are accepted only from that frame.
    - **Why a WebView:** Hermes has no JIT. A JIT-less run of the same model took about 15 s per image, against about 0.9 s with a JIT (measured 2026-11-18 on the build machine).
  - **Rejected:**
    - **MediaPipe Tasks Vision:** its web bundle posts usage logs to `odml.pa.googleapis.com/v1/log` (found in its code, 2026-11-18).
    - **react-native-fast-tflite:** a native Nitro module, and no `.tflite` file was downloadable here (403).
    - **Cloud try-on:** see above.
  - **Fallback:** if the model finds no person, she taps 6 points (shoulders, hips, feet). Feet outside the photo are estimated, and she is told so.
  - **Results so far:** the browser test found a drawn person in about 1.7 s. Real phone speed and accuracy on real photos are NOT VERIFIED.
  - **New runtime dependencies:** `react-native-webview` 14.0.1 and `expo-asset` (SDK 58). TF.js and esbuild are build-only.
  - **Web:** the 6.8 MB page is not precached by the service worker; it is cached the first time it is used.
- **D-065 · One placement rule set for the avatar and her photo.**
  - **How garments are placed** (`src/domain/fit/place.ts`):
    - Each cut-out is sized from the shoulder span (tops, jackets, dresses) or the hip span (bottoms), keeps its own shape, hangs from just above the shoulders or the waist, and shoes stand at the feet.
    - A dress replaces the top and bottom. One garment per slot (`toggleWorn`).
  - **The avatar:** its geometry (`avatarBody.ts`) produces a pose too, so the avatar is dressed by exactly the same rules as her photo.
  - **Fine-tuning:** she can move a piece or make it bigger or smaller (`ClothingItem.fit`, in shoulder-widths). The adjustment is kept per garment and reset when the photo changes.
  - **Limits:** this is a flat overlay, not a simulation of fabric, and the factors are ASSUMPTION starting values tuned on test pictures.
- **D-066 · D-061–D-065 review fixes (privacy audit + architecture review, 2026-11-18).** Neither review found a way for the photo, the body points or any other data to leave the device.

  **Fixed:**
  - **Permission texts:** no longer promise "your face is blurred" (test).
  - **WebView diagnostics off:** `android.webkit.WebView.MetricsOptOut` is set in the Android manifest by `plugins/withWebViewPrivacy.js`. VERIFIED in `expo config --type introspect`. Source: developer.android.com, Managing WebView objects.
  - **Release gate:** a test keeps the D-063 blocker open in the release checklist, the release skill and the parent policy draft while `BODY_PHOTO_BLURRED` is false.
  - **Drafts rewritten** for the simple flow, still unpublished: the kid and parent policies (DA and EN), the Play listing and the data-safety draft. Open legal question: whether the six pose points count as biometric data (GDPR Art. 4(14)).
  - **PRIVACY_SAFETY.md** records the approved exceptions (D-062, D-063).
  - **Copy:**
    - The photo tip now says "wear your normal clothes, ask a grown-up to take it".
    - "Take everything off" is now "Clear my outfit".
    - Height, shape and hip words are allowed only in the avatar picker and point marking (test).
  - **Pose page and host:**
    - The CSP adds `form-action 'none'; base-uri 'none'`.
    - Tests check that the page never navigates or fetches, and that it is built from the vendored model (sha256 plus content).
    - The phone view accepts only `file://` loads (`isLocalFile`); an exact URI match could break if the platform normalises it.
    - A dead WebView process now unmounts.
    - Timeouts are 15 s for the page to load and 20 s per run, down from 60 s.
    - The idle unload re-arms while a run is busy.
    - A technical failure gets its own message and opens tap-marking straight away.
    - A slow result for an older photo is ignored.
    - "Find me" passes the photo's real shape.
  - **Web cache:** the service worker keeps the pose page in its own `pose-page` cache (newest copy only), so a deploy doesn't mean another 6.8 MB download.
  - **Fit and display code:**
    - Fine-tuning is a pure `nudgeFit` (clamped, tested) applied with a new `updateItem`, which reads the latest stored item, so quick taps don't get lost.
    - The dress rule lives in one place (`visibleWorn`).
    - The SVG gradient ids are unique per avatar.
  - **Old data:** a pre-D-063 blurred head selfie (no `photoAspect`) is dropped on load (`migrateProfile`, tested), and the start-up sweep deletes the file.
  - **Parent screen:** "Reset learning" is removed, since nothing learns any more.

  **Accepted or open:**
  - react-native-webview's manifest `<queries>` for Chromium PAY intents. They are unused, and removing them needs a manifest merge rule; to be revisited before release.
  - Base64 over web `postMessage` (minor).
  - The engine, rating and learning code and their i18n keys are parked, not deleted (ARCHITECTURE.md).
  - **NOT VERIFIED until a phone test:**
    - the native WebView path end to end (`Asset.loadAsync` gives a `file://` copy, load time, memory)
    - whether a service worker serves a sandboxed iframe offline
    - the current Google Play Families policy text (its host is not allowed in this session)
