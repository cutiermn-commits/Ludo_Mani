# Google Play: Data safety, target audience and content rating (DRAFT)

> Draft answers for the owner to enter in Play Console. **Nothing is submitted by Claude.** Written 2026-11-17 for app version 0.1.0 (package `dk.mani.wardrobebuddy`). Google's help pages could not be opened from the build sandbox, so the rule summaries below come from secondary sources (marked NOT VERIFIED). Check them in Play Console before you submit.

## How Google defines it (NOT VERIFIED against Google's own page)
- "Collected" means data transmitted **off the device**. Data processed only on the device is not declared.
- Data sent off the device and processed "ephemerally" (kept in memory only, just long enough to serve the request) is entered in the form but not shown publicly. Secondary sources give a weather lookup as an example.

## What actually leaves the device (from the code)
| Data | When | To | How |
|---|---|---|---|
| Town name typed in the search | Only with parent consent (D-035), when the town is searched | Open-Meteo geocoding (`geocoding-api.open-meteo.com`) | HTTPS GET, no identifiers, no cookies, no referrer |
| Approximate coordinates of the chosen town (rounded to ~1 km) | Only with consent, about once an hour | Open-Meteo forecast (`api.open-meteo.com`) | Same |
| Device IP address | With every request above | Open-Meteo | Unavoidable network property |

Everything else (profile, clothes, photos, selfie, diary, ratings, learning) **never leaves the device**. There is no analytics, ads, crash reporting or backend. Android Auto Backup is off (D-046).

## Recommended answers (conservative)
| Play Console question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **Yes** | The town search text and coordinates are sent to a third party |
| Location → **Approximate location** | **Collected: yes. Shared: yes** (with the weather service). **Optional: yes** (parent can say no). Purpose: **App functionality**. Processed ephemerally: **leave unticked unless Open-Meteo confirms it** | We can't verify how Open-Meteo stores requests, so don't claim "ephemeral" on their behalf. Ask in the D-008 email |
| App activity → In-app search history / Other | **No.** The town search is declared as approximate location above | Owner decision; NOT VERIFIED which category Google expects for a town search |
| Personal info, photos and videos, files, contacts, identifiers, financial, health, messages | **Not collected** | They stay on the device |
| Is all user data encrypted in transit? | **Yes** | HTTPS only (allowlist test) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: "Delete everything" in the grown-up settings, plus uninstalling | Nothing is stored by the developer |
| Independent security review | No | — |

## Target audience and content (Families policy)
- **Target age groups:** pick the groups that include **11–12 and 13–15** in Play Console. Groups that include under-13 users make the **Families policy** apply (privacy policy, no ad ID, no precise location, child-safe content). The app is built to that standard already. Play Console's exact age options are NOT VERIFIED.
- **Ads:** "No, my app does not contain ads."
- **Content rating questionnaire (IARC):** no violence, no sexual content, no bad language, no gambling, no controlled substances. Users don't interact or share content; no location sharing with other users; no in-app purchases; no unrestricted internet browsing. A low age rating is expected (NOT VERIFIED until the questionnaire is done).
- **App access:** no login needed. Tell the reviewer the parental gate is a multiplication question.
- **Privacy policy URL:** needed. Publish `docs/legal/privacy-parents.*` (and the kids' version) on a tracker-free page after legal review (D-009). Needs owner approval to publish.

## Before production (personal developer account)
If the Play developer account is personal and was created after 13 Nov 2023, a **closed test with at least 12 testers opted in for 14 days in a row** is required before production access (support.google.com/googleplay/android-developer/answer/14151465, read via search results).
