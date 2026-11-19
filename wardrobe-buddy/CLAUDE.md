# Wardrobe Buddy — Claude Code project memory

Wardrobe Buddy is a free, ad-free, non-profit outfit helper for girls aged 11–15. Every morning it suggests what to wear from her **own** clothes, based on the weather, her mood and what she has liked before. Target: iOS, Android and web from one codebase, **fully bilingual in Danish and English**. It will be **published on the public App Store and Google Play**.

Co-designer: a young member of the owner's family. Their paper sketch is described in `docs/UX.md`. Respect that flow.

## Non-negotiables (break one = stop and ask)
1. **Child safety first.** No ads, no third-party analytics/crash SDKs, no tracking, no social features, no chat, no sharing to other users, no links out without a parental gate. Nothing for adults only, and no body/weight/size talk anywhere. See `docs/PRIVACY_SAFETY.md`.
2. **On-device only.** Photos, profile, wardrobe, ratings and learning data never leave the device. The only network call allowed is the weather/geocoding request, carrying no identifiers. There's no backend and no user accounts in v1.
3. **Use the store compliance rules as acceptance criteria.** Follow Apple Guidelines 1.3 / 5.1.4 and the Google Play Families Policy even if we don't list in the Kids category.
4. **Minimal data.** Collect no name (only a nickname), no birthdate (only an age band), and no precise location (only a city). If a feature needs more, it needs a decision in `docs/DECISIONS.md`.
5. **Non-profit.** No ads, subscriptions, in-app purchases or donation buttons.
6. **Bilingual at all times.** Every user-facing string exists in both `da.json` and `en.json`. No hard-coded text in components. A missing or empty key fails the tests.
7. **No new dependency without a check.** Before adding any npm package, check whether it sends data off-device. Log it in `docs/DECISIONS.md`.

## Stack (see `docs/ARCHITECTURE.md`)
- Expo (React Native) + TypeScript (strict) + Expo Router
- Local storage behind a `StorageAdapter` interface (SQLite on native; check the web option for the current Expo SDK)
- Weather: Open-Meteo forecast + geocoding API behind a `WeatherProvider` interface (swappable)
- Outfit engine: pure TypeScript in `src/engine/`, no UI or I/O, fully unit-tested
- i18n: Danish + English from day one. Default = device language (Danish if the device is Danish, otherwise English). Switch anytime in Me → Language, no gate needed. Dates, temperatures and number formats follow the chosen locale
- Tests: Jest + React Native Testing Library; engine coverage ≥ 90 %

## How to work (hands-off mode)
- Work phase by phase from `docs/ROADMAP.md`. Plan first, then build, test, review and commit.
- Keep `PROGRESS.md` current: done, in progress, blocked, next.
- Before finishing a phase, run the subagents `privacy-safety-auditor` and `architecture-reviewer`, and fix what they find.
- Use the skills `kid-safety-review`, `outfit-engine` and `release-checklist` when relevant.
- Never invent API fields, library features or store rules. Check the current docs. If you can't confirm something, write `NOT VERIFIED` in the code comment or doc and add it to the open questions in `PROGRESS.md`.
- **Stop and ask the owner** only for: store submission, publishing legal/privacy text, anything that costs money, any new permission (camera/photos/location), any network call besides weather, or changing a non-negotiable.

## Commands
- `npx expo start` (dev; press `w` for web)
- `npm test` (unit tests) · `npm run test:engine` (engine + coverage gate)
- `npm run lint` / `npm run typecheck` · `npm run ci` (typecheck + lint + tests with coverage)
- Add packages with `npx expo install <pkg>`, then add them to `approved-dependencies.json` (a test enforces it) and log them in `docs/DECISIONS.md`

## Docs map (read the relevant one before working in that area)
| Area | File |
|---|---|
| Vision, features, MVP scope | `docs/PRODUCT.md` |
| Screens, themes, tone of voice | `docs/UX.md` |
| Stack, data model, folders | `docs/ARCHITECTURE.md` |
| GDPR, Apple/Google kids rules | `docs/PRIVACY_SAFETY.md` |
| Suggestion + learning logic | `docs/OUTFIT_ENGINE.md` |
| Phases and exit criteria | `docs/ROADMAP.md` |
| Decisions and open questions | `docs/DECISIONS.md` |
