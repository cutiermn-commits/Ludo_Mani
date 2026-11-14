# Ludo: iOS, Android and web (Expo / React Native) + online game server

Ludo for 2–4 players:
- **On one device**: pass-and-play, with any seat played by the computer (Easy / Medium / Hard).
- **Online with friends**: create a room, share the 6-letter code, play in real time. Empty seats can be computer players.
- **Resume**: an unfinished game on one device is saved on the device and offered as "Resume game" after the app is closed.
- Configurable house rules. No accounts, no ads, no tracking.

## Architecture

```
 iPhone / iPad app (Expo)                     Game server (Node.js, single process)
 ┌──────────────────────────┐   wss://   ┌──────────────────────────────────────┐
 │ UI (src/ui)              │◀──JSON────▶│ server/src/server.ts  sockets, limits │
 │ useOnlineRoom (src/net)  │            │ server/src/room.ts    rooms, turns,   │
 │ Local bots (src/engine)  │            │                       timers, bots    │
 └────────────┬─────────────┘            └──────────────────┬───────────────────┘
              │      same code, imported by both            │
              └──────────▶ src/engine (rules + AI) ◀────────┘
                          src/net/protocol.ts (message types + validation)
```

- **One rules engine** (`src/engine`) is used by the app for local play and by the server for online play, so the rules cannot drift apart.
- **The server is authoritative online**: it rolls the dice (`crypto.randomInt`), validates every move and drives bots. A modified app cannot cheat.
- **No user-generated content**: players are identified only by colour (no names, no chat). This keeps the app out of App Store Review Guideline 1.2, which requires filtering, reporting and blocking for apps where users post content.
- **Games never stall**: if it's an online player's turn and they don't act within 30 s (8 s if they've disconnected), the server plays that turn for them. A player who leaves is replaced by a computer player. A dropped connection resumes automatically with a secret session token.

| Path | What it is |
|---|---|
| `src/engine/board.ts` | Board geometry: track, home columns, safe squares |
| `src/engine/game.ts` | Pure rules engine (dice values are passed in, so it is deterministic) |
| `src/engine/ai.ts` | Computer players: easy / medium / hard |
| `src/engine/persist.ts` | Versioned save format + strict validation of saved games |
| `src/storage/savedGame.ts` | On-device save/load (AsyncStorage), writes queued in order |
| `src/net/protocol.ts` | Wire protocol + strict validation of client messages |
| `src/net/useOnlineRoom.ts` | Client connection hook: reconnect with backoff, resume after the app returns from background |
| `src/ui/*` | Menu, local game, online lobby/game, shared board view, privacy policy |
| `server/` | WebSocket game server, tests, Dockerfile |
| `store/` | App Store listing draft + screenshots |
| `PRIVACY.md` + `site.config.json` | Single source for the privacy policy and support email. Run `npm run sync-privacy` after editing |
| `docs/` | Generated public pages (GitHub Pages): `index.html` = Support URL, `privacy.html` = Privacy Policy URL |

### Computer player strength (measured, not estimated)
Two-player games with seeded dice, colours alternated, 1,000 games per pairing:

| Pairing | Win rate of first |
|---|---|
| Hard vs Easy | 86.5% |
| Medium vs Easy | 82.9% |
| Hard vs Medium | 54.6% (≈56% after tuning, 2,000 games) |

Ludo is dominated by dice luck, so even a much smarter player wins only somewhat more often. Hard plans one move ahead using capture probabilities. A deeper search would add only a little strength.

## Platforms

One codebase builds all three:

| Platform | How it ships | Command |
|---|---|---|
| **Web** (phone, desktop and TV browsers) | Static site in `docs/play/`, served by GitHub Pages at https://cutiermn-commits.github.io/Ludo_Mani/play/ | `npm run build:web`, then commit and push `docs/play` |
| **iOS** (App Store) | EAS Build + Submit | `npx eas-cli@latest build --platform ios --profile production` |
| **Android** (Google Play) | EAS Build produces an `.aab` for the Play Console | `npx eas-cli@latest build --platform android --profile production` |

**Web extras:**
- Invite links `…/play/?join=CODE` join a room in one tap; native apps share the same link, so friends without the app can join in a browser.
- Keyboard and TV-remote controls: Space/Enter roll or move, arrows choose a token, 1–4 move a token, Tab moves between buttons.
- Dice and text scale up on large screens.
- The server address comes from `eas.json` (production `EXPO_PUBLIC_SERVER_URL`), so web and native always use the same server.
- The web base path comes from `site.config.json` → `webUrl`.

**Android notes:**
- Package `com.ludomani.app` (`app.json`). Adaptive icon assets are in `assets/android-icon-*.png`; the artwork sits inside the 66dp safe circle.
- Google Play needs its own developer account. The first upload to the Play Console is usually done by hand; after that, `eas submit --platform android` can upload with a Google service-account key.

## Develop

```bash
npm install
```

```bash
cd server && npm install && cd ..
```

Run the server and the app in two terminals:

```bash
cd server && npm run dev
```

```bash
cp .env.example .env    # EXPO_PUBLIC_SERVER_URL=ws://<your computer's LAN IP>:8080 for a real phone
```

```bash
npx expo start
```

Tests and type checks:

```bash
npm test && npm run typecheck
```

```bash
cd server && npm test && npm run typecheck
```

## Deploy the game server

Any host that runs a long-lived Node.js process or Docker container **and supports WebSockets over TLS** works (for example Fly.io, Render, Railway, or a small VM behind Caddy or nginx). Steps:

1. Build the image from the **repository root**: `docker build -f server/Dockerfile -t ludo-server .` (the build also runs the server tests). Or, without Docker: `cd server && npm ci && npm run build && node dist/index.js`.
2. Expose port `8080` (or set `PORT`). Health check: `GET /health`.
3. Terminate TLS at the host so the public URL is `wss://…`. iOS blocks unencrypted connections to remote servers in release builds.
4. Put the URL in `eas.json` → `build.production.env.EXPO_PUBLIC_SERVER_URL` (and `preview`). It is baked into the app at build time.
5. Optional: `ALLOWED_ORIGINS` (comma-separated) restricts browser origins. The native app sends none.

**Current limits (by design, for v1):**
- **Single process, in memory.** Rooms are not shared between instances. Run exactly **one** instance. Restarting or redeploying ends all live games, so deploy at quiet times. Scaling out later needs shared room state (e.g. Redis) or room-to-instance routing.
- Default capacity cap: 2,000 rooms (`maxRooms`). Per-connection rate limit: 10 msgs/s. Message size limit: 1 KB.
- Logs are structured JSON with no IPs and no tokens.

## Ship to the App Store (no Mac required)

### 1. One-time accounts
1. **Apple Developer Program**: https://developer.apple.com/programs/enroll/. Apple lists it at 99 USD per membership year; local pricing may differ.
2. **Expo account**: https://expo.dev/signup.

### 2. Make the app yours
- `app.json` → `ios.bundleIdentifier`: replace `com.yourcompany.ludo`. It cannot be changed after the first upload.
- `eas.json` → `EXPO_PUBLIC_SERVER_URL`: your deployed `wss://` server.
- `PRIVACY.md` and `src/ui/PrivacyModal.tsx`: fill in the date and the support email. Host `PRIVACY.md` publicly, and set up a Support URL.

### 3. Create the app record
App Store Connect → Apps → **+** → New App. Copy the app's numeric Apple ID into `eas.json` → `submit.production.ios.ascAppId`.

### 4. Build and upload
```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios --latest
```

### 5. TestFlight
Install via TestFlight on at least two devices and play an online game between them. Test switching apps mid-game and toggling airplane mode; the game should resume.

### 6. Store listing and questionnaires
- Use `store/listing.md` and `store/screenshots/`. Retake the screenshots from TestFlight before submitting.
- **App Privacy**: online play transmits gameplay data, which is used only to run the game and kept only in memory, with no identifiers linked to a person. Apple's definition of "collect" covers data sent off the device and stored longer than needed to serve the request in real time, so **"Data Not Collected"** is a defensible answer **if** you keep the server as built (no logging of IPs or gameplay). This is our reading of Apple's definition, not legal advice; confirm it against Apple's current App Privacy Details page when you fill in the form. Apple's definition (verified 2026-11-14): "transmitting data off the device in a way that allows you and/or your third-party partners to access it for a period longer than what is necessary to service the transmitted request in real time." If you want to be cautious, declare **Gameplay Content → App Functionality, not linked to identity, not used for tracking** instead. Over-declaring is lower risk than under-declaring.
- **Age rating**: no gambling, no real money, and no user-generated content or chat.
- **Review notes**: tell the reviewer online play needs a second device or uses computer players. A single reviewer can create a room, set the empty seats to computer players and start.

### 7. Submit for review

## Known review risk
App Store Review Guideline **4.3(b)** rejects apps "indistinguishable from what's already widely available", and Ludo is a crowded category. Online rooms with three AI levels and no ads or accounts help, but a distinctive visual style or other unique features further lower the risk.
