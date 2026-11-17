---
name: outfit-engine
description: Rules for building, changing or debugging the Wardrobe Buddy outfit suggestion and learning logic in src/engine. Use whenever touching scoring, weather bands, extras, the week planner or learning.
---

# Outfit engine work

1. Read `docs/OUTFIT_ENGINE.md`. That spec is the source of truth; if code and spec disagree, update both on purpose and log it in `docs/DECISIONS.md`.
2. Keep `src/engine/` pure: no React, storage, network, `Date.now()` or `Math.random()` inside. Pass in the date and seed.
3. All numbers live in `engine.config.ts` with a comment marking them as ASSUMPTION starting values.
4. Write the test first for any rule change. Include edge cases: empty wardrobe, no outerwear, only dresses, all items in the wash, extreme weather, missing forecast.
5. Every suggestion must come with a `reasons[]` array the UI can turn into kid-friendly text. Never output body-related reasons.
6. Run `npm test -- src/engine` and keep coverage ≥ 90 %.
7. If you change learning, add a test showing that ratings move the next suggestion the right way and that weights stay inside their limits.
