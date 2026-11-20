# Privacy & Child Safety — Wardrobe Buddy

> These rules are **acceptance criteria**. A feature that breaks one is not done. Legal points marked NOT VERIFIED need a lawyer's or privacy expert's review before store submission. Claude is not a lawyer.

## 1. Legal context (checked 17 Nov 2026)
| Topic | Finding | Status |
|---|---|---|
| Denmark: age at which a child can give data consent herself | Raised from 13 to 15 by an amendment in force from 1 Jan 2024 (Lovguiden; consolidated act LBK 289 of 8 Mar 2024). One secondary source says this is still unenacted, so the sources conflict | VERIFIED-ish: most authoritative source says 15. **Design: parent-led setup for every user, 11–15.** Ages 11–14 are below 15 under either rule, so a parent must consent. 15-year-olds could consent themselves, but one simple flow for everyone is safer and easier to review |
| GDPR Art. 8 | EU countries may set this age between 13 and 16; below it, a parent must consent | VERIFIED FACT |
| On-device only | If the developer never receives personal data, much of the GDPR controller duty may not apply. A privacy policy is still required by both stores | **NOT VERIFIED**: get legal review |
| Apple 1.3 / 5.1.4 | Kids apps: no third-party ads or analytics, no sending personal or device data to third parties, parental gate before links out or purchases. Kids category age bands are 5 & under, 6–8 and 9–11 | VERIFIED FACT (Apple developer pages) |
| Google Play Families Policy | Apps for children must follow it: privacy policy, no transmitting identifiers like the advertising ID, no precise location, children-safe content | VERIFIED FACT (Google Play Console help) |

## 2. Product rules
1. **No accounts, email, real name, birthdate, GPS or contacts.**
2. **Network:** only the weather + geocoding endpoints. No other host, ever. Enforce this with a test that scans the bundle and dependencies for analytics/ads SDKs, and with a single fetch wrapper that has a host allowlist.
3. **Photos:** stay in the app sandbox. Selfie and diary photos get face blur ON by default. **Exception (owner, D-063):** during the owner's test period the full-body try-on photo is stored unblurred; deciding the release rule is a release BLOCKER (RELEASE_CHECKLIST). Clothing photos: tell her (once, friendly) "Take photos of clothes only".
4. **Permissions:** ask for camera/photos only when she taps "add photo", with a kid-friendly explanation first. Location permission is not used in v1 (she searches for her city instead).
5. **Parental gate** (adult-level task, e.g. a multi-digit maths question, never "tap here") before: settings, the about/legal links, export, delete-all, changing the city.
6. **Body-image safety:** no body measurements, weight, sizes, "flattering", rankings, comparisons or beauty scores. The engine scores weather fit, comfort, mood and taste only. **Approved exception (owner, D-062):** the avatar's height and shape are three drawn choices each, with no numbers, no comparison words and no "ideal" option; nothing is measured from her photo except where to lay the clothes (D-064/D-065; since D-068 also which way her arms point, so sleeves can follow them).
7. **No social or sharing features. No open text sent anywhere.** Free text (e.g. school dress rules) stays on the device.
8. **Content:** all clothing categories and art suit children. No known characters or brands in assets.
9. **Data rights:** parent can export (JSON + photos zip) and delete everything; uninstalling removes everything.
10. **Privacy policy:** two versions, one for kids (simple words) and one for parents. EN + DA. Hosted on a static page with no trackers.

## 3. Store listing decision (owner must decide, see DECISIONS D-004)
Apple's Kids category tops out at the 9–11 band, but our audience is 11–15. Options: (a) Kids category, 9–11 band, which has the strictest review and fits the youngest users, or (b) a general category (e.g. Lifestyle) with a suitable age rating. **Either way, build to Kids-category standards**, because Apple's rule 5.1.4 covers apps meant for kids. Google: choose target age groups in Play Console, which triggers the Families policy. Check the exact age group options in the current Play Console (NOT VERIFIED).

## 4. Release gate checklist
See skill `.claude/skills/release-checklist/SKILL.md`.
