import * as fs from 'fs';
import * as path from 'path';

import type { Rating } from '@/domain/types';

import { ENGINE_CONFIG } from '../engine.config';
import { applyRating, initialLearning, pruneLearning, summarizeLearning } from '../learning';
import { suggest } from '../suggest';
import { planWeek } from '../week';
import { day, input, wardrobe } from './fixtures';

const rating = (p: Partial<Rating>): Rating => ({ outfitId: 'o1', stars: 3, reasons: [], wore: false, createdAt: '2026-11-17T18:00:00Z', ...p });
const outfit = { itemIds: ['hoodie', 'jeans'], source: 'suggested' as const };

describe('learning', () => {
  it('5 stars raises, 1 star lowers item weights by α·(stars−3)/2', () => {
    const up = applyRating(initialLearning(), rating({ stars: 5 }), outfit, wardrobe());
    expect(up.itemWeights.hoodie).toBeCloseTo(0.2);
    const down = applyRating(initialLearning(), rating({ stars: 1 }), outfit, wardrobe());
    expect(down.itemWeights.jeans).toBeCloseTo(-0.2);
    expect(up.updatedAt).toBe('2026-11-17T18:00:00Z');
  });

  it('weights stay inside [-1, 1] and the temperature offset inside [-4, 4]', () => {
    let s = initialLearning();
    for (let k = 0; k < 50; k++) s = applyRating(s, rating({ stars: 5, reasons: ['loveIt', 'tooCold'], wore: true }), outfit, wardrobe());
    expect(s.itemWeights.hoodie).toBe(1);
    expect(s.tagWeights.cozy).toBe(1);
    expect(s.tempOffsetC).toBe(-4);
    for (let k = 0; k < 50; k++) s = applyRating(s, rating({ stars: 1, reasons: ['notMyStyle', 'tooWarm'] }), outfit, wardrobe());
    expect(s.itemWeights.hoodie).toBe(-1);
    expect(s.tagWeights.cozy).toBe(-1);
    expect(s.tempOffsetC).toBe(4);
  });

  it('"too cold" lowers the offset by 0.5, "too warm" raises it', () => {
    expect(applyRating(initialLearning(), rating({ reasons: ['tooCold'] }), outfit, []).tempOffsetC).toBe(-0.5);
    expect(applyRating(initialLearning(), rating({ reasons: ['tooWarm'] }), outfit, []).tempOffsetC).toBe(0.5);
  });

  it('"wore it" on an unchanged suggestion is a mild positive; not on edited outfits', () => {
    expect(applyRating(initialLearning(), rating({ wore: true }), outfit, []).itemWeights.hoodie).toBeCloseTo(ENGINE_CONFIG.learning.woreBonus);
    expect(applyRating(initialLearning(), rating({ wore: true }), { ...outfit, source: 'edited' }, []).itemWeights.hoodie).toBe(0);
  });

  it('does not mutate the previous state', () => {
    const s0 = initialLearning();
    applyRating(s0, rating({ stars: 5, reasons: ['loveIt'] }), outfit, wardrobe());
    expect(s0).toEqual(initialLearning());
  });

  it('ratings change the next suggestion the right way', () => {
    const base = input({ weather: day(6) });
    const before = suggest(base);
    const topId = before.outfits[0].mainId;
    let learning = base.learning;
    for (let k = 0; k < 5; k++) {
      learning = applyRating(learning, rating({ stars: 1, reasons: ['notMyStyle'] }), { itemIds: before.outfits[0].itemIds, source: 'suggested' }, base.items);
    }
    const after = suggest({ ...base, learning });
    expect(after.outfits[0].mainId).not.toBe(topId);
  });

  it('"too cold" ratings move her into a warmer band', () => {
    const base = input({ weather: day(10.2) });
    expect(suggest(base).band).toBe('cool');
    const learning = applyRating(base.learning, rating({ reasons: ['tooCold'] }), outfit, []);
    expect(suggest({ ...base, learning }).band).toBe('cold');
  });

  it('summarizes what it learned in plain facts', () => {
    expect(summarizeLearning(initialLearning()).hasLearned).toBe(false);
    let s = initialLearning();
    for (let k = 0; k < 3; k++) s = applyRating(s, rating({ stars: 5, reasons: ['loveIt', 'tooCold'] }), outfit, wardrobe());
    const sum = summarizeLearning(s);
    expect(sum).toMatchObject({ runsCold: true, runsWarm: false, hasLearned: true });
    expect(sum.likedItemIds).toEqual(['hoodie', 'jeans']);
    expect(sum.likedTags).toEqual(['casual', 'comfy']); // tie → alphabetical, top 2
    expect(summarizeLearning({ ...initialLearning(), tempOffsetC: 1 }).runsWarm).toBe(true);
  });

  it('prunes weights of deleted items', () => {
    const s = { ...initialLearning(), itemWeights: { a: 0.5, b: -0.2 } };
    expect(pruneLearning(s, new Set(['a'])).itemWeights).toEqual({ a: 0.5 });
  });
});

describe('week planner', () => {
  const days = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'].map((date) => day(12, { date }));

  it('plans every day and spreads main pieces out', () => {
    const plan = planWeek(days, input());
    expect(plan).toHaveLength(5);
    const mains = plan.map((p) => p.result.outfits[0].mainId);
    expect(mains[0]).not.toBe(mains[1]);
    expect(new Set(mains).size).toBeGreaterThanOrEqual(3);
  });

  it('respects items in the wash', () => {
    const items = wardrobe().map((i) => (i.id === 'hoodie' ? { ...i, inLaundry: true } : i));
    const plan = planWeek(days, input({ items }));
    plan.forEach((p) => expect(p.result.outfits[0].itemIds).not.toContain('hoodie'));
  });

  it('re-plans from the latest forecast: a colder day gets a warmer plan', () => {
    const warm = planWeek([day(18)], input())[0].result.outfits[0].warmth;
    const cold = planWeek([day(1)], input())[0].result.outfits[0].warmth;
    expect(cold).toBeGreaterThan(warm);
  });
});

describe('engine purity', () => {
  it('src/engine has no React, I/O, Date.now() or Math.random()', () => {
    const dir = path.join(__dirname, '..');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts'));
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      expect(src).not.toMatch(/from 'react|expo-|@\/(data|services|features|ui|i18n)|fetch\(|Date\.now\(|Math\.random\(|new Date\(\)/);
    }
  });
});
