import { emptyAppData } from '@/data/repository';

import { buildExport } from '../buildExport';

describe('parent export (JSON + photos)', () => {
  it('embeds every referenced photo once and leaves out the cached forecast', async () => {
    const data = {
      ...emptyAppData(),
      items: [
        { id: 'a', category: 'top', colors: ['red'], warmth: 1, waterproof: false, windproof: false, styleTags: [], occasions: [], favorite: false, inLaundry: false, createdAt: 'x', photoUri: 'file:///p/a.jpg' },
        { id: 'b', category: 'top', colors: ['red'], warmth: 1, waterproof: false, windproof: false, styleTags: [], occasions: [], favorite: false, inLaundry: false, createdAt: 'x' },
      ],
      diary: [{ id: 'd', outfitId: 'o', photoUri: 'file:///p/d.jpg', faceBlurred: true }],
      forecast: { lat: 1, lon: 2, fetchedAt: 'x', days: [] },
    } as never;
    const reader = jest.fn(async (uri: string) => (uri.endsWith('missing.jpg') ? null : `data:image/jpeg;base64,${uri.length}`));
    const out = JSON.parse(await buildExport(data, reader, new Date('2026-11-17T20:00:00Z')));
    expect(out).toMatchObject({ app: 'wardrobe-buddy', schema: 2, exportedAt: '2026-11-17T20:00:00.000Z' });
    expect(Object.keys(out.photos).sort()).toEqual(['file:///p/a.jpg', 'file:///p/d.jpg']);
    expect(out.data.forecast).toBeUndefined();
    expect(out.data.items).toHaveLength(2);
    expect(reader).toHaveBeenCalledTimes(2);
  });
  it('a photo that cannot be read is skipped, not fatal', async () => {
    const data = { ...emptyAppData(), diary: [{ id: 'd', outfitId: 'o', photoUri: 'file:///p/missing.jpg', faceBlurred: true }] };
    const out = JSON.parse(await buildExport(data, async () => Promise.reject(new Error('gone')), new Date(0)));
    expect(out.photos).toEqual({});
  });
});
