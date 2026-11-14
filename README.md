# Ludo — iOS app (Expo / React Native)

Offline Ludo for 2–4 players: pass-and-play and/or computer opponents, with configurable house rules.
No accounts, no network, no ads, no data collection.

## Project layout

| Path | What it is |
|---|---|
| `src/engine/board.ts` | Board geometry: 52-square track, home columns, safe squares, cell coordinates |
| `src/engine/game.ts` | Pure rules engine (deterministic; dice values are passed in) + heuristic bot |
| `src/engine/game.test.ts` | Rules tests, including a seeded full 4-bot game |
| `src/ui/*` | Board (SVG), dice, menu, game screen, in-app privacy policy |
| `app.json` | App config: name, bundle ID, icon, iOS settings |
| `eas.json` | EAS Build / Submit profiles |
| `store/` | App Store listing draft + generated screenshots |
| `PRIVACY.md` | Privacy policy to host at a public URL |

### Rules implemented
- Need a 6 to leave base; a 6 gives another roll.
- Landing on an opponent on a non-safe square sends it back to base. Safe = the 4 start squares + 4 star squares.
- Exact roll needed to reach the centre. First player to finish all 4 tokens wins.
- Toggles in the menu: extra roll after a capture, extra roll when a token gets home, three 6s in a row forfeits the turn.

## Develop

```bash
npm install
```

```bash
npm test          # rules engine tests
```

```bash
npm run typecheck
```

```bash
npx expo start    # scan the QR code with Expo Go on an iPhone, or press w for web
```

All dependencies (`react-native-svg`, `expo-haptics`, `react-native-safe-area-context`) are included in Expo Go, so no custom dev build is needed during development.

## Ship to the App Store (no Mac required)

### 1. One-time accounts
1. **Apple Developer Program**: https://developer.apple.com/programs/enroll/. 99 USD per membership year per Apple; local pricing may differ. Enrolling as an organisation needs a D-U-N-S number. Approval can take a while, so start now.
2. **Expo account**: https://expo.dev/signup (free tier includes a limited number of cloud builds).

### 2. Make the app yours
- `app.json` → `ios.bundleIdentifier`: change `com.yourcompany.ludo` to a reverse-DNS ID you own. It **cannot be changed** after the first upload.
- `app.json` → `name` is the home-screen name. The App Store name is set separately in App Store Connect and must be unique; plain "Ludo" will almost certainly be taken.
- `PRIVACY.md` and `src/ui/PrivacyModal.tsx`: fill in the effective date and the support email, and keep the two texts identical.
- Host `PRIVACY.md` at a public URL (for example GitHub Pages or your website). You also need a **Support URL**.

### 3. Create the app record
App Store Connect → Apps → **+** → New App → platform iOS, bundle ID as above, SKU (any internal string).
Copy the numeric **Apple ID** of the app (App Information page) into `eas.json` → `submit.production.ios.ascAppId`.

### 4. Build and upload
```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init          # links the project to your Expo account (writes projectId into app.json)
```

```bash
npx eas-cli@latest build --platform ios --profile production
```

EAS asks to log in to your Apple account and can create the distribution certificate and provisioning profile for you. Build numbers auto-increment (`appVersionSource: remote` + `autoIncrement`).

```bash
npx eas-cli@latest submit --platform ios --latest
```

This uploads the build to App Store Connect / TestFlight.

### 5. Test on real devices (TestFlight)
In App Store Connect → TestFlight, add yourself as an internal tester and install through the TestFlight app. Check on at least one small iPhone, one large iPhone and one iPad (the app declares iPad support).

### 6. Store listing
Use `store/listing.md` and the screenshots in `store/screenshots/` (sized to Apple's current required specs: iPhone 1206×2622 and iPad 13" 2064×2752).
- **App Privacy** questionnaire: "Data Not Collected" matches the current code (no analytics, ads or network calls). Re-check if you add any SDK.
- **Age rating** questionnaire: answer honestly. There is no gambling, no real-money play and no user-generated content.
- **Export compliance**: `usesNonExemptEncryption: false` is set, so Apple will not ask on each build.

### 7. Submit for review
Select the build → Add for Review → Submit. If rejected, read the cited guideline, fix it, rebuild (step 4) and resubmit.

### Updates
Bump `version` in `app.json` for each App Store release, then repeat steps 4 and 7.

## Known review risk

App Store Review Guideline **4.3(b)** rejects apps "indistinguishable from what's already widely available", and Ludo is a crowded category. Before submitting, add at least one clear differentiator (ideas in `store/listing.md`) and say so in the review notes.
