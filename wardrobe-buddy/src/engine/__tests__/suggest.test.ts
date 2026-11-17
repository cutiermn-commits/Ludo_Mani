import { BANDS, ENGINE_CONFIG } from '../engine.config';
import { suggest } from '../suggest';
import { bandFor } from '../weather';
import { day, input, item, wardrobe } from './fixtures';

const byId = (ids: string[]) => ids.map((id) => wardrobe().find((i) => i.id === id)!);

describe('suggest: bands', () => {
  // A representative feels-like value inside each band.
  const reps: Record<string, number> = { hot: 25, mild: 18, cool: 12, cold: 6, freezing: -2 };

  it.each(BANDS.map((b) => b.name))('returns an outfit inside the %s band (± tolerance)', (name) => {
    const res = suggest(input({ weather: day(reps[name]) }));
    const band = BANDS.find((b) => b.name === name)!;
    expect(res.status).toBe('ok');
    expect(res.band).toBe(name);
    expect(res.outfits.length).toBeGreaterThan(0);
    const w = res.outfits[0].warmth;
    expect(w).toBeGreaterThanOrEqual(band.targetMin - ENGINE_CONFIG.warmthTolerance);
    expect(w).toBeLessThanOrEqual(band.targetMax + ENGINE_CONFIG.warmthTolerance);
  });

  it('band boundaries match the spec table', () => {
    expect(bandFor(22).name).toBe('hot');
    expect(bandFor(21.9).name).toBe('mild');
    expect(bandFor(16).name).toBe('mild');
    expect(bandFor(15).name).toBe('cool');
    expect(bandFor(10).name).toBe('cool');
    expect(bandFor(9).name).toBe('cold');
    expect(bandFor(3).name).toBe('cold');
    expect(bandFor(2.9).name).toBe('freezing');
  });

  it('includes outerwear when cool or colder, and not when hot and dry', () => {
    const cold = suggest(input({ weather: day(6) }));
    expect(byId(cold.outfits[0].itemIds).some((i) => i.category === 'outerwear')).toBe(true);
    const hot = suggest(input({ weather: day(25) }));
    expect(byId(hot.outfits[0].itemIds).some((i) => i.category === 'outerwear')).toBe(false);
  });

  it('applies profile and learned temperature offsets', () => {
    const res = suggest(input({ weather: day(17), profile: { ...input().profile, tempOffsetC: -2 } }));
    expect(res.band).toBe('cool');
    const learned = suggest(input({ weather: day(17), learning: { ...input().learning, tempOffsetC: -1.5 } }));
    expect(learned.band).toBe('cool');
  });
});

describe('suggest: rain and wind', () => {
  it('requires a waterproof outer layer when rain chance ≥ 50 %', () => {
    const res = suggest(input({ weather: day(18, { rainChanceMaxPct: 60 }) }));
    for (const o of res.outfits) {
      const outer = byId(o.itemIds).find((i) => i.category === 'outerwear');
      expect(outer?.waterproof).toBe(true);
    }
    expect(res.extras).toContain('umbrella');
  });

  it('requires a waterproof outer when rain ≥ 1 mm even with low chance', () => {
    const res = suggest(input({ weather: day(12, { rainChanceMaxPct: 20, rainMm: 1.2 }) }));
    const outer = byId(res.outfits[0].itemIds).find((i) => i.category === 'outerwear');
    expect(outer?.waterproof).toBe(true);
  });

  it('tips her to add a rain jacket when she owns none', () => {
    const items = wardrobe().filter((i) => !i.waterproof || i.category !== 'outerwear');
    const res = suggest(input({ items, weather: day(12, { rainChanceMaxPct: 90 }) }));
    expect(res.status).toBe('ok');
    expect(res.tips).toContain('addRainJacket');
  });

  it('prefers a windproof outer when windy', () => {
    const res = suggest(input({ weather: day(12, { windMaxKmh: 40 }) }));
    const outer = byId(res.outfits[0].itemIds).find((i) => i.category === 'outerwear');
    expect(outer?.windproof).toBe(true);
    expect(res.extras).not.toContain('umbrella');
  });
});

describe('suggest: empty and edge cases', () => {
  it('empty wardrobe → helpful message', () => {
    const res = suggest(input({ items: [] }));
    expect(res).toMatchObject({ status: 'empty', tips: ['emptyWardrobe'], outfits: [] });
  });

  it('missing forecast → asks for weather', () => {
    expect(suggest(input({ weather: null })).status).toBe('needWeather');
  });

  it('everything in the wash → says so', () => {
    const items = wardrobe().map((i) => ({ ...i, inLaundry: true }));
    expect(suggest(input({ items })).tips).toEqual(['allInLaundry']);
  });

  it('no outerwear owned → still suggests, with a tip to add one', () => {
    const items = wardrobe().filter((i) => i.category !== 'outerwear');
    const res = suggest(input({ items, weather: day(6) }));
    expect(res.status).toBe('ok');
    expect(res.tips).toContain('addOuterwear');
  });

  it('only tops → asks for bottoms', () => {
    const items = wardrobe().filter((i) => i.category === 'top');
    expect(suggest(input({ items })).tips).toEqual(['addTopsAndBottoms']);
  });

  it('only dresses (no shoes) → dress outfit plus a shoes tip', () => {
    const items = [item({ id: 'd1', category: 'dress', warmth: 2 }), item({ id: 'd2', category: 'dress', warmth: 1 })];
    const res = suggest(input({ items, weather: day(20) }));
    expect(res.status).toBe('ok');
    expect(res.outfits[0].itemIds).toHaveLength(1);
    expect(res.tips).toContain('addShoes');
  });

  it('too few warm clothes in freezing weather → still an outfit + addWarmerClothes tip', () => {
    const items = [item({ id: 't', category: 'top', warmth: 1 }), item({ id: 'b', category: 'bottom', warmth: 1 })];
    const res = suggest(input({ items, weather: day(-10) }));
    expect(res.outfits).toHaveLength(1);
    expect(res.tips).toEqual(expect.arrayContaining(['addOuterwear', 'addWarmerClothes']));
  });

  it('only warm clothes on a hot day → addLighterClothes tip', () => {
    const items = [item({ id: 't', category: 'top', warmth: 5 }), item({ id: 'b', category: 'bottom', warmth: 5 })];
    expect(suggest(input({ items, weather: day(28) })).tips).toContain('addLighterClothes');
  });

  it('a large wardrobe stays under the combination cap and is fast', () => {
    const items = [
      ...Array.from({ length: 30 }, (_, k) => item({ id: `t${k}`, category: 'top', warmth: ((k % 5) + 1) as 1 })),
      ...Array.from({ length: 30 }, (_, k) => item({ id: `b${k}`, category: 'bottom', warmth: ((k % 5) + 1) as 1 })),
      ...Array.from({ length: 10 }, (_, k) => item({ id: `s${k}`, category: 'shoes' })),
      ...Array.from({ length: 10 }, (_, k) => item({ id: `o${k}`, category: 'outerwear', warmth: ((k % 5) + 1) as 1, waterproof: k % 2 === 0 })),
    ];
    const t0 = performance.now();
    const res = suggest(input({ items, weather: day(6, { rainChanceMaxPct: 70 }) }));
    expect(performance.now() - t0).toBeLessThan(200);
    expect(res.outfits).toHaveLength(3);
  });
});

describe('suggest: ranking', () => {
  it('is deterministic for the same input', () => {
    expect(suggest(input())).toEqual(suggest(input()));
  });

  it('returns 1 + 2 alternatives with different main items', () => {
    const res = suggest(input({ weather: day(18) }));
    expect(res.outfits).toHaveLength(3);
    expect(new Set(res.outfits.map((o) => o.mainId)).size).toBe(3);
  });

  it('style "trousers" leaves out dresses and skirts', () => {
    const items = [...wardrobe(), item({ id: 'skirt', category: 'bottom', subcategory: 'skirt', warmth: 2 })];
    const res = suggest(input({ items, weather: day(25), profile: { ...input().profile, stylePref: 'trousers' } }));
    const all = res.outfits.flatMap((o) => o.itemIds);
    expect(all).not.toContain('dress');
    expect(all).not.toContain('skirt');
  });

  it('style "trousers" falls back to dresses if that is all she has', () => {
    const items = [item({ id: 'd', category: 'dress', warmth: 2 })];
    const res = suggest(input({ items, weather: day(20), profile: { ...input().profile, stylePref: 'trousers' } }));
    expect(res.outfits[0].itemIds).toEqual(['d']);
  });

  it('mood "fancy" lifts the dress on a warm day', () => {
    const res = suggest(input({ weather: day(25), mood: 'fancy' }));
    expect(res.outfits[0].itemIds).toContain('dress');
    expect(res.outfits[0].reasons.some((r) => r.kind === 'mood')).toBe(true);
  });

  it('avoids a top worn yesterday', () => {
    const first = suggest(input({ weather: day(6) }));
    const yesterdayTop = first.outfits[0].mainId;
    const next = suggest(input({ weather: day(6), history: [{ date: '2026-11-16', itemIds: [yesterdayTop] }] }));
    expect(next.outfits[0].mainId).not.toBe(yesterdayTop);
  });

  it('avoids disliked colours', () => {
    const res = suggest(input({ weather: day(25), profile: { ...input().profile, dislikedColors: ['white', 'yellow'] } }));
    const colors = byId(res.outfits[0].itemIds).flatMap((i) => i.colors);
    expect(colors).not.toContain('yellow');
  });

  it('explains itself with a weather reason and never anything body-related', () => {
    const res = suggest(input({ weather: day(6, { windMaxKmh: 35 }) }));
    const r = res.outfits[0].reasons;
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r[0]).toMatchObject({ kind: 'weather', band: 'cold', windy: true });
    const allowed = ['weather', 'taste', 'mood', 'variety', 'colors'];
    res.outfits.flatMap((o) => o.reasons).forEach((x) => expect(allowed).toContain(x.kind));
  });

  it('mentions a favourite or a liked colour when they drive the pick', () => {
    const items = wardrobe().map((i) => (i.id === 'hoodie' ? { ...i, favorite: true } : i));
    const res = suggest(
      input({ items, weather: day(6), profile: { ...input().profile, likedColors: ['grey'] }, learning: { ...input().learning, itemWeights: { hoodie: 1 } } }),
    );
    expect(res.outfits[0].itemIds).toContain('hoodie');
    const kinds = res.outfits[0].reasons.map((r) => r.kind);
    expect(kinds).toContain('taste');
  });
});

describe('Phase 5 exit: suggestion in < 2 s with a cached forecast', () => {
  it('a big wardrobe (120 items) gets today + a 7-day plan well under the budget', () => {
    const cats = ['top', 'bottom', 'dress', 'outerwear', 'shoes'] as const;
    const items = Array.from({ length: 120 }, (_, k) =>
      item({ id: `i${k}`, category: cats[k % 5], warmth: ((k % 5) + 1) as 1, waterproof: k % 7 === 0, favorite: k % 9 === 0 }),
    );
    const { planWeek } = jest.requireActual('../week') as typeof import('../week');
    const t0 = performance.now();
    suggest(input({ items, weather: day(6, { rainChanceMaxPct: 60 }), mood: 'cozy' }));
    planWeek(
      ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'].map((date, i) => day(4 + i * 2, { date })),
      input({ items }),
    );
    // Budget is 2000 ms on a mid-range phone; Node is much faster, so a tenth of it is a safe margin here.
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
