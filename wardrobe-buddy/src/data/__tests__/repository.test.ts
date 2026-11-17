import { checkGateAnswer, makeGateQuestion } from '@/features/parent/gate';

import { createRepository, emptyAppData } from '../repository';
import { createMemoryStorage } from '../storage';

describe('repository', () => {
  it('loads defaults from empty storage', async () => {
    expect(await createRepository(createMemoryStorage()).load()).toEqual(emptyAppData());
  });

  it('round-trips saved values', async () => {
    const repo = createRepository(createMemoryStorage());
    await repo.save('ratings', [{ outfitId: 'o', stars: 4, reasons: [], wore: true, createdAt: 'x' }]);
    expect((await repo.load()).ratings).toHaveLength(1);
  });

  it('falls back to defaults on corrupt JSON instead of crashing', async () => {
    const repo = createRepository(createMemoryStorage({ 'wb:v1:items': '{not json' }));
    expect((await repo.load()).items).toEqual([]);
  });

  it('delete-all removes only this app’s keys', async () => {
    const storage = createMemoryStorage({ 'other:key': '1' });
    const repo = createRepository(storage);
    await repo.save('items', []);
    await repo.save('profile', null);
    await repo.deleteAll();
    expect(await storage.getAllKeys()).toEqual(['other:key']);
  });

});

describe('parental gate', () => {
  it('asks a two-digit × two-digit sum', () => {
    expect(makeGateQuestion(() => 0)).toEqual({ a: 13, b: 12, answer: 156 });
    expect(makeGateQuestion(() => 0.999)).toEqual({ a: 97, b: 29, answer: 2813 });
  });
  it('only accepts the exact answer', () => {
    const q = { a: 47, b: 6, answer: 282 };
    expect(checkGateAnswer(q, '282')).toBe(true);
    expect(checkGateAnswer(q, ' 282 ')).toBe(true);
    for (const bad of ['', ' ', '281', '282.5', 'abc', '0x11A']) expect(checkGateAnswer(q, bad)).toBe(false);
  });
});
