---
name: kid-safety-review
description: Check a feature, screen, dependency or text against Wardrobe Buddy's child-safety and privacy rules. Use before finishing any feature, when adding an npm package, a permission, a network call, or user-facing copy.
---

# Kid safety review

Read `docs/PRIVACY_SAFETY.md` first. Then check the change against each item and report PASS / FAIL / NOT VERIFIED with file:line evidence.

1. **Network:** any new `fetch`, socket or SDK call? Only the weather/geocoding hosts in the allowlist are allowed. No identifiers, cookies or device info in requests.
2. **Dependencies:** for each new package, check its README/source for analytics, ads, crash reporting, telemetry or remote config. If unsure → FAIL until checked.
3. **Data collected:** does it add a field? Is it needed? No real name, birthdate, GPS, contacts or free text sent anywhere.
4. **Photos:** stored only in the sandbox; selfie/diary blur on by default; no upload.
5. **Permissions:** asked only at the moment of use, with a kid-friendly explanation first.
6. **Parental gate** guards settings, external links, export, delete and city change. It can't be bypassed or turned off.
7. **Body-image + tone:** search the copy for size, weight, body, slim, flattering, ugly, fat, perfect, beautiful-as-rating. No comparisons, streaks, guilt or pressure.
8. **Content:** no adult content, brands, known characters or links to shops.
9. **i18n:** every new string exists in `en.json` and `da.json`.
10. **Accessibility:** labels, contrast AA, tap targets ≥ 44 pt.

Fix every FAIL before marking the task done. Put each NOT VERIFIED item in the open questions in `PROGRESS.md`.
