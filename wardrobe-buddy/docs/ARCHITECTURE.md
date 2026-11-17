# Architecture — Wardrobe Buddy

## Principles
Offline-first and on-device only. Pure logic is kept apart from the UI. Every outside service sits behind an interface. Use the platform's own features before adding libraries. Use as few dependencies as possible, and check each one.

## Stack
| Layer | Choice | Status |
|---|---|---|
| App framework | Expo (latest stable SDK) + React Native + TypeScript strict | Decided |
| Navigation | Expo Router (file-based) | Decided |
| State | React context (D-026) | Decided |
| Storage | `StorageAdapter`: SQLite on iOS/Android; on web, use SQLite if the current Expo SDK supports it there, otherwise IndexedDB | **NOT VERIFIED**: check web support in the current Expo docs |
| Images | Camera/picker via Expo modules; files stored in the app sandbox; resized and compressed on-device | Check current Expo APIs |
| Face blur | On-device face detection + blur before saving | **NOT VERIFIED**: pick a library with no network calls; if none is reliable, use a manual blur brush |
| Colour detection | Simple dominant-colour calculation on a downscaled image, in TypeScript | Decided |
| Weather | Open-Meteo Forecast + Geocoding API behind `WeatherProvider` | Decided (licence question open, see DECISIONS) |
| i18n | expo-localization to detect the device language + an i18n library (e.g. i18next) with `da.json` / `en.json`. A test fails on missing keys, empty values or hard-coded strings in components | Library choice open; bilingual requirement decided |
| Tests | Jest, React Native Testing Library; E2E tool to be decided (e.g. Maestro) | Open |
| Builds | EAS Build / Submit | Decided |

## Folder structure
> Updated 2026-11-17: routes live in `src/app/` (AGENTS.md / Expo template), state is React context (D-026), web storage is localStorage (D-023).

```
src/app/             # Expo Router screens
src/
  engine/            # Outfit engine: pure TS, no imports from UI/storage/network
  domain/            # Types: ClothingItem, Outfit, Rating, Profile, WeatherDay
  data/              # StorageAdapter + repositories
  services/weather/  # WeatherProvider + OpenMeteoProvider + cache
  features/          # today/, week/, wardrobe/, me/, parent/
  ui/                # Design system: theme tokens, components
  i18n/              # da.json, en.json (+ key-parity test)
```

## Data model (first version)
- `Profile { id, nickname, ageBand: '11-12'|'13-15', uiStyle: 'playful'|'clean', stylePrefs[], likedColors[], dislikedColors[], tempOffsetC, theme, locale: 'da'|'en', cityName, lat, lon }` (lat/lon are the city centre from geocoding, not GPS)
- `ClothingItem { id, photoUri, category, subcategory?, colors[], warmth(1–5), waterproof, windproof, styleTags[], occasions[], favorite, inLaundry, createdAt }`
- `category ∈ top | bottom | dress | outerwear | shoes | accessory`
- `Outfit { id, date, itemIds[], extras[], mood?, weatherSnapshot, source: suggested|edited|manual }`
- `Rating { outfitId, stars(1–5), reasons[], wore: boolean, createdAt }`
- `ItemPreference { itemId, weight }` and `LearningState { tempOffsetC, updatedAt }`
- `DiaryPhoto { id, outfitId, photoUri, faceBlurred }`

## Weather flow
City search (Open-Meteo geocoding returns place names in the chosen language) → geocoding → store the city centre's lat/lon → fetch the forecast (today + 7 days: temperature, apparent temperature, rain chance/amount, wind, UV index) → cache for ~1 h → the engine reads from the cache. If offline, show the last forecast with its time, or ask her "What's it like outside?" (sunny / rainy / cold).
Requests must not include any identifier, cookie or custom header. Show Open-Meteo attribution (CC BY 4.0) in the About screen.

## Security
Data stays in the app sandbox. Turn on OS-level file protection where the platform supports it. No logging of personal data. No remote config. No WebViews to outside sites.
