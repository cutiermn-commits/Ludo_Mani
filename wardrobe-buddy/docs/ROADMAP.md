# Roadmap — Wardrobe Buddy

Each phase ends with: tests green, lint/typecheck clean, both reviewer subagents run and their findings fixed, `PROGRESS.md` updated, a git commit and a short demo note for the owner.

| Phase | Scope | Exit criteria |
|---|---|---|
| 0. Foundation | Expo + TS strict + Router scaffold, lint/format, Jest, theme tokens (4 themes + dark), i18n DA/EN with device-language detection, language switch and a key-parity test, StorageAdapter, fetch wrapper with host allowlist, CI script | App runs on iOS sim, Android emulator and web; allowlist test passes |
| 1. Engine first | `src/engine` with config, scoring, extras, week planner, learning, plus unit tests (no UI) | ≥ 90 % engine coverage; all OUTFIT_ENGINE tests pass |
| 2. Weather | City search (geocoding), forecast, cache, offline fallback, attribution | Works offline with a cached forecast; no identifiers in requests (test) |
| 3. Wardrobe | Camera/picker, resize, colour detection, tagging form, grid, filters, laundry toggle | Add 20 items smoothly on a mid-range Android |
| 4. Me | Onboarding, parental gate, profile, avatar maker, optional selfie with face blur | Gate can't be skipped; blur is on by default |
| 5. Today + Week | Today screen as in the co-designer's sketch, mood picker, swap tabs, "Why this?", extras chips, week view | Suggestion in < 2 s with a cached forecast |
| 6. Rating + learning | Stars + reason chips, "I wore this" diary photo, learning shown in Me, reset | Ratings change the next suggestion, shown in a test |
| 7. Polish | Animations, haptics, empty states, accessibility pass, Danish copy review list | WCAG AA contrast in all themes; screen-reader labels everywhere |
| 8. Release prep | Privacy policies (draft), store listings, screenshots, data-safety and privacy-label answers, export/delete | `release-checklist` skill passes; **owner approves the submission** |

After v1, consider: an opt-in morning reminder, background removal for clothing photos (on-device; NOT VERIFIED it's feasible in Expo), school-uniform mode, and other occasions (sport, party).
