# App Store listing draft

Character limits below are App Store Connect field limits; confirm them in the form when you paste.

**App name** (max 30): `[Your unique name] – Ludo` — check availability in App Store Connect.

**Subtitle** (max 30): `Classic board game, offline`

**Category**: Games → Board (secondary: Family)

**Promotional text**: Play the classic race game online with friends, on one device, or against the computer. No ads, no accounts.

**Description**:
Roll, race and capture in the classic board game for 2–4 players.

• Play online with friends: create a room and share the 6-letter code
• Pass-and-play with family on one iPhone or iPad
• Computer opponents with three levels: Easy, Medium and Hard
• Mix and match: friends and computer players in the same game
• Close the app any time: your game on this device is saved for later
• Choose your house rules: bonus rolls for captures and getting home, three-sixes penalty
• No ads, no accounts, no chat: just the game
• Offline play works without internet

**Keywords** (max 100, comma-separated): `ludo,board game,dice,family,offline,pachisi,multiplayer,classic,race,strategy`
(Avoid other companies' brand or game names in keywords; Apple can reject keyword metadata that uses trademarks.)

**Support URL**: [required]
**Privacy Policy URL**: [required, the hosted PRIVACY.md]

**Review notes**: "No login required. Local: tap seats to choose player/computer, then 'Start game on this device'. Online: 'Play online with friends' > 'Create a room'. With one device, tap the open seats to add computer players, then Start game. To test with two devices, enter the room code on the second device. Players are shown only as colours; there is no chat or user-generated content."

## Screenshots (in `screenshots/`)
| File | Slot |
|---|---|
| `iphone-6.3-*.png` (1206×2622) | iPhone with Dynamic Island (medium display), required |
| `ipad-13-*.png` (2064×2752) | iPad 13-inch display, required because iPad is supported |

These were rendered from the web build. Before final submission, replace them with captures from TestFlight on a real device or simulator, so they exactly match the iOS app.

## Differentiation ideas (guideline 4.3(b) risk)
Pick at least one before submitting:
1. Step-by-step token movement animation and sound effects.
2. ~~Resume an unfinished game~~ (done).
4. A distinctive visual theme or art style rather than the standard board look.
5. Local stats or achievements (Game Center).
6. ~~Online multiplayer~~ (done: room codes, server-authoritative).
7. ~~Bot difficulty levels~~ (done).
