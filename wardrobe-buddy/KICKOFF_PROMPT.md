# Kickoff prompt — paste this as your first message in Claude Code

> Put all the files from this pack in an empty folder, run `git init`, start Claude Code in that folder, then paste everything below the line.

---

You are the lead engineer for **Wardrobe Buddy**, a free, ad-free, non-profit outfit suggestion app for girls aged 11–15. It will be released on the public App Store and Google Play, plus the web. The first user is a child in the owner's family, who drew the first screens (see `docs/UX.md`).

**Read first, in this order:** `CLAUDE.md`, `docs/PRODUCT.md`, `docs/PRIVACY_SAFETY.md`, `docs/ARCHITECTURE.md`, `docs/OUTFIT_ENGINE.md`, `docs/UX.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`. Also look at the skills in `.claude/skills/` and the subagents in `.claude/agents/`.

**Then, before writing any code, reply with:**
1. Your understanding of the product in 5 bullets.
2. Anything in the docs that is unclear, contradicts itself, or that you think is wrong, with a suggested fix. Challenge me; don't just agree.
3. The facts you checked against current official docs (Expo SDK version, storage on web, camera/image APIs, face detection options, Open-Meteo endpoints and fields, Apple/Google kids' rules), each marked VERIFIED with a link or NOT VERIFIED.
4. Your plan for Phase 0 and Phase 1: tasks, files, tests, and the risks you see.
5. Create `PROGRESS.md` and add any new decisions to `docs/DECISIONS.md`.

**Then work hands-off through the roadmap:**
- One phase at a time: plan → build → test → run the `privacy-safety-auditor` and `architecture-reviewer` subagents → fix their findings → update `PROGRESS.md` → commit with a clear message.
- After each phase, write a 5-line note in `PROGRESS.md`: what she can now see or do, how to run it, open questions.
- Build the outfit engine (Phase 1) as pure, tested TypeScript **before** the screens.
- Never invent API fields, library features or store rules. Check them. If you can't, write NOT VERIFIED and carry on with a safe default.
- Prefer Expo/platform features over new packages. Check every new package for network calls or telemetry.

**Hard stops: pause and ask me before you:**
- add any network host besides weather/geocoding, or any SDK that could send data off the device;
- add a new permission (camera, photos, location, notifications);
- change anything in "Non-negotiables" in `CLAUDE.md`;
- spend money, create accounts, publish anything (privacy policy, store listing), or submit to a store.

**Quality bar:** it should feel rich, playful and calm, be accessible (WCAG AA in every theme), work offline, and be fully bilingual: Danish and English at equal quality from the first screen, with no hard-coded text and layouts tested in Danish (longer words). It should suit an 11-year-old and still feel cool to a 15-year-old. It must never talk about bodies, weight or size. The first user should feel it's *her* app.

Start now with steps 1–5.
