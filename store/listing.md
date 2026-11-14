# App Store listing draft

Character limits below are App Store Connect field limits; confirm them in the form when you paste.

**App name** (max 30): `[Your unique name] – Ludo` — check availability in App Store Connect.

**Subtitle** (max 30): `Classic board game, offline`

**Category**: Games → Board (secondary: Family)

**Promotional text**: Play the classic race game with friends on one device or against the computer. No ads, no accounts, no internet needed.

**Description**:
Roll, race and capture in the classic board game for 2–4 players.

• Pass-and-play with friends and family on one iPhone or iPad
• Play against computer opponents, or mix humans and computers
• Choose your house rules: bonus rolls for captures and getting home, three-sixes penalty
• Works completely offline: no ads, no accounts, no data collected

**Keywords** (max 100, comma-separated): `ludo,board game,dice,family,offline,pachisi,multiplayer,classic,race,strategy`
(Avoid other companies' brand or game names in keywords; Apple can reject keyword metadata that uses trademarks.)

**Support URL**: [required]
**Privacy Policy URL**: [required, the hosted PRIVACY.md]

**Review notes**: "Fully offline game, no login required. Tap seats on the main menu to choose human/computer players, then Start game. Tap the dice to roll, then tap a highlighted token."

## Screenshots (in `screenshots/`)
| File | Slot |
|---|---|
| `iphone-6.3-*.png` (1206×2622) | iPhone with Dynamic Island (medium display), required |
| `ipad-13-*.png` (2064×2752) | iPad 13-inch display, required because iPad is supported |

These were rendered from the web build. Before final submission, replace them with captures from TestFlight on a real device or simulator, so they exactly match the iOS app.

## Differentiation ideas (guideline 4.3(b) risk)
Pick at least one before submitting:
1. Step-by-step token movement animation and sound effects.
2. Resume an unfinished game (persist state locally).
3. Bot difficulty levels.
4. A distinctive visual theme or art style rather than the standard board look.
5. Local stats or achievements (Game Center).
6. Online multiplayer (Game Center turn-based). This is a much larger scope: it needs networking, a privacy-policy update and moderation considerations.
