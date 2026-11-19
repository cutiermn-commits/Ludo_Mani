---
name: release-checklist
description: Pre-submission gate for Wardrobe Buddy on the App Store and Google Play. Use in Phase 8 or before any store build. Never submits by itself; it ends with a report for the owner.
disable-model-invocation: true
---

# Release checklist

Check the **current** Apple App Store Review Guidelines (1.3, 5.1, 5.1.4), Apple's kids-apps and parental-gate pages, and the Google Play Families Policy before you start; rules change. Note the date you checked.

## Code & build
- [ ] Tests, lint and typecheck green; release build runs on a real iOS and Android device
- [ ] Dependency scan: no ads/analytics/crash/telemetry SDKs (list every package that makes network calls)
- [ ] Network allowlist test passes; capture the traffic of one full session and confirm only the weather/geocoding hosts appear
- [ ] Android: no AD_ID permission; no location permission; manifest permissions are only what's needed
- [ ] iOS: purpose strings for camera/photos, kid-friendly; privacy manifest present if required (check current Apple rules)

## Product
- [ ] `kid-safety-review` skill passes on the whole app
- [ ] Parental gate on settings, links, export, delete and city change
- [ ] Export and delete-all work; uninstall leaves nothing behind
- [ ] **D-063 blocker:** the full-body try-on photo blur rule is decided and `BODY_PHOTO_BLURRED` in `src/services/photos/selfie.ts` matches it (the release-gate test fails while it is `false` unless this blocker is still open in docs/RELEASE_CHECKLIST.md)
- [ ] Pose detection (D-064) checked on a real Android release build: works offline, time to result noted; WebView metrics opt-out present in the merged manifest
- [ ] Third-party licences credited (MoveNet / TensorFlow.js Apache-2.0, TF.js conversion MIT: `vendor/movenet/README.md`)
- [ ] DA + EN complete (key-parity test green); both reviewed by native speakers (D-011); no cut-off text in Danish layouts
- [ ] Store listings, screenshots and privacy policies exist in both Danish and English
- [ ] No payment, subscription, ad or donation flow anywhere (non-profit, D-013)
- [ ] Open-Meteo attribution shown; licence question D-008 resolved

## Store paperwork (draft only; the owner submits)
- [ ] Privacy policy (kid + parent versions) on a tracker-free URL; legal review done (D-009)
- [ ] App Store privacy "nutrition label" answers: data not collected (if on-device only holds true)
- [ ] Google Play Data safety form + target audience answers
- [ ] Age rating questionnaire answers; listing category per D-004
- [ ] Screenshots with demo clothes and avatar only (no real child photos)

Finish with a report: PASS / FAIL / NOT VERIFIED per line, plus the decisions the owner must make. **Stop. Do not submit.**
