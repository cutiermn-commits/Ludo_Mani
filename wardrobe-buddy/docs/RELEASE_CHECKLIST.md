# Release checklist report (DRAFT, 2026-11-17)

Run against `.claude/skills/release-checklist/SKILL.md` for the **Google Play** release first (D-043). Apple's and Google's current policy pages could not be read from the build sandbox (blocked), so those rules come from `docs/PRIVACY_SAFETY.md` and the audits, and are marked NOT VERIFIED. **This report does not submit anything.**

## Code & build
| Item | Status | Evidence |
|---|---|---|
| Tests, lint, typecheck green | **PASS** | `npm run ci`: 789 tests, engine coverage 98.8 % |
| Release build runs on a real iOS and Android device | **NOT VERIFIED** | Android preview APK queued on EAS; no device run yet. iOS not built (D-043) |
| Dependency scan: no ads/analytics/crash/telemetry SDKs | **PASS** | `approved-dependencies.json` (every runtime dep reviewed) + lockfile ban-list test |
| Network allowlist test; one full session's traffic shows only weather hosts | **PASS (web)** / NOT VERIFIED (device) | Allowlist + "no other fetch" tests; web E2E saw only localhost + the two Open-Meteo hosts |
| Android: no AD_ID, no location permission, minimal permissions | **PASS** | Prebuild manifest: AD_ID, location, contacts, RECORD_AUDIO, SYSTEM_ALERT_WINDOW removed; CAMERA, INTERNET, VIBRATE, storage ≤ SDK 32 |
| iOS purpose strings, privacy manifest | **NOT VERIFIED** | Purpose strings written (camera/photos mention clothes + blurred selfie); privacy manifest needs a check before the iOS release |

## Product
| Item | Status | Evidence |
|---|---|---|
| `kid-safety-review` on the whole app | **PASS with open items** | Phase 0–4 audits fixed; final audit run after Phase 8 (see PROGRESS.md) |
| Parental gate on settings, links, export, delete and city change | **PASS** | Screen test `gate-screen.test.tsx`; Me preferences deliberately open (D-036) |
| Export and delete-all work; uninstall leaves nothing | **PASS (code)** / NOT VERIFIED (device) | Export includes photos (`buildExport.test.ts`); delete-all removes keys + photo folders + caches; Auto Backup off |
| DA + EN complete; native-speaker review; no cut-off Danish text | **PARTLY** | Key-parity test passes; `docs/COPY_REVIEW.md` ready for review (D-011, open); Danish layouts checked on 3 emulated phones |
| Store listings, screenshots, privacy policies in DA + EN | **DRAFT** | `docs/store/google-play-listing.*.md`, `docs/store/screenshots/`, `docs/legal/*` |
| No payment, subscription, ad or donation flow | **PASS** | None in the code |
| Open-Meteo attribution; licence question D-008 resolved | **PARTLY** | Attribution shown in About + listing; D-008 email still to send |

## Store paperwork (draft only; the owner submits)
| Item | Status |
|---|---|
| Privacy policy (kid + parent) on a tracker-free URL; legal review (D-009) | **DRAFT**, needs legal review + owner approval to publish |
| App Store privacy label | Later (iOS last) |
| Google Play Data safety + target audience | **DRAFT**: `docs/store/google-play-data-safety.md` |
| Age rating questionnaire; listing category (D-004) | **DRAFT** answers; category is the owner's decision |
| Screenshots with demo clothes and avatar only | **PASS**: generated from demo data, no real photos |

## Decisions for the owner before submitting
1. Test the APK on a real phone (Phase 3 exit: 20 items; camera; selfie blur; cache folders empty).
2. Native-speaker Danish review (D-011).
3. Legal review of the privacy policies and the on-device GDPR position (D-009); then approve publishing them.
4. Send the Open-Meteo non-commercial confirmation (D-008), and ask whether they keep request logs (Data safety "ephemeral").
5. Store category and age groups (D-004).
6. Closed test (12 testers for 14 days) if the personal account rule applies.

**Stopped here. Nothing was submitted.**
