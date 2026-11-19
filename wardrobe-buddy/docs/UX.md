# UX — Wardrobe Buddy

## Co-designer's sketch (source: a paper sketch by the co-designer; the photo is kept outside the public repo, D-041)
| Her page | What it shows | How we build it |
|---|---|---|
| Page 1 | App icon: a girl with clothes around her, pink + blue | App icon direction: friendly character, pink/blue split. Icon is original art, no known characters |
| Page 2 | "Choose gender": two stick figures | Becomes **"Choose your style"** (e.g. dresses & skirts / trousers & hoodies / a mix). Style, not identity; no gender data is stored |
| Page 2b | "Make your avatar or take a photo of yourself" | Avatar maker (default) or selfie with face blur on |
| Page 3 | "Take photo of all your clothes", with a T-shirt card, ♥ and buttons | Wardrobe capture: big camera button, item card, ♥ favourite |
| Page 4 | "Choose what you want to wear for the day": avatar on the left, tabs T-shirts / Pants / Shorts with item cards | The **Today** screen: avatar wearing the suggested outfit cards. Category tabs underneath to swap items |

Keep her structure: **Me → My clothes → Today**. Show her the builds and let her vote on details.

## Navigation (bottom tabs)
1. **Today**: weather strip, mood picker, outfit on the avatar, "Why this?", the "don't forget" chips, rate button
2. **Week**: 7 day cards, tap to see or edit
3. **Wardrobe**: grid by category, filters, add button, "in the wash" toggle
4. **Me**: avatar, theme, likes, diary of outfit photos
Settings (gear icon) → parental gate → parent area.

## Onboarding (≤ 6 screens, skippable after step 3)
**Language (Dansk / English, preselected from the device)** → parent welcome + gate → nickname + age band (11–12 / 13–15) → choose your style → avatar → city → "Add your first 5 clothes" (shows the value fast).

## Growing with her (11 → 15)
- 11–12: more playful: bigger illustrations, emoji, the animated avatar is front and centre
- 13–15: calmer, more "grown-up" look: fewer emoji, a photo-forward wardrobe grid, an option to hide the avatar and show just the outfit cards
- She can change the look anytime in Me → Style of app (playful / clean). The age band only sets the default

## Language
- Language switch in Me → Language (Dansk / English), with no parental gate. It takes effect straight away without a restart
- Write the Danish copy first or in parallel, not as an afterthought. Keep sentences short in both languages; Danish words are often longer, so test the layouts in Danish (no cut-off text)
- Weather words, clothing categories and mood labels have their own carefully chosen terms in each language (e.g. "regnjakke", "hættetrøje", "hyggelig")

## Look and feel
- Rich but calm: rounded cards, soft shadows, playful micro-animations (e.g. clothes "dropping" onto the avatar), haptics on choice
- Themes: pink, blue, green, purple, each with dark mode. Must meet WCAG 2.1 AA contrast in every theme
- Large tap targets (≥ 44 pt), works with Dynamic Type / font scaling, screen-reader labels on every control
- Empty states that teach ("Add a jacket so I can keep you dry on rainy days ☔")

## Tone of voice
Friendly older-cousin voice. Short sentences, no slang that dates quickly.
- ✅ "It's windy and 6° — your puffy jacket will keep you cozy."
- ❌ Never mention body shape, weight, size, "flattering", "slimming", or compare her to others
- ❌ No pressure, streaks, guilt or FOMO mechanics
- Every string goes through i18n (DA + EN). Both languages must be checked by a native speaker before release
