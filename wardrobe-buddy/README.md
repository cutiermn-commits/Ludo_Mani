# Wardrobe Buddy

A free, ad-free, non-profit outfit helper for girls aged 11–15, in Danish and English. Every morning it suggests what to wear from her own clothes, based on the weather, her mood and what she has liked before. Everything stays on the device.

- Product, privacy and design docs: [`docs/`](docs/) (start with `docs/PRODUCT.md`)
- Where things stand: [`PROGRESS.md`](PROGRESS.md) · decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Rules for AI agents working here: [`CLAUDE.md`](CLAUDE.md), [`AGENTS.md`](AGENTS.md)

## Run it
```bash
npm install
npx expo start        # then press w for web, or scan the QR code with Expo Go
```

## Check it
```bash
npm test              # all unit tests
npm run test:engine   # outfit engine with coverage (≥ 90 % enforced)
npm run typecheck
npm run lint
npm run ci            # all of the above
```

## Code map
| Folder | What |
|---|---|
| `src/app/` | Screens (Expo Router). `(tabs)/` = Today, Week, Wardrobe, Me |
| `src/engine/` | Outfit engine: pure TypeScript, no I/O; all tuning numbers in `engine.config.ts` |
| `src/domain/` | Shared types |
| `src/data/` | `StorageAdapter` (SQLite key-value on phones, localStorage on web) + repository |
| `src/services/` | `safeFetch` (host allowlist) and the Open-Meteo `WeatherProvider` + cache |
| `src/features/` | Feature components: app state, today, wardrobe, me, parent gate, weather |
| `src/ui/` | Theme tokens (4 themes × light/dark), shared components |
| `src/i18n/` | `da.json`, `en.json` and formatting helpers |

Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0).
