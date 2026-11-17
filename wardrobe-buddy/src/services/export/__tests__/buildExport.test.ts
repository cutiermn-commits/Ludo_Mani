import { emptyAppData } from '@/data/repository';

import { buildExport } from '../buildExport';

const item = (id: string, photoUri?: string) => ({ id, category: 'top', colors: ['red'], warmth: 1, waterproof: false, windproof: false, styleTags: [], occasions: [], favorite: false, inLaundry: false, createdAt: 'x', photoUri });

describe('parent export (JSON + photos)', () => {
  it('embeds every photo under an id key, leaves no device paths and no forecast, and is valid JSON', async () => {
    const data = {
      ...emptyAppData(),
      profile: { selfieUri: 'file:///var/App/UUID/Documents/photos/s.jpg' },
      items: [item('a', 'file:///var/App/UUID/Documents/photos/a.jpg'), item('b')],
      diary: [{ id: 'd', outfitId: 'o', photoUri: 'file:///var/App/UUID/Documents/photos/d.jpg', faceBlurred: true }],
      forecast: { lat: 1, lon: 2, fetchedAt: 'x', days: [] },
    } as never;
    const reader = jest.fn(async () => 'data:image/jpeg;base64,AAAA');
    const json = await buildExport(data, reader, new Date('2026-11-17T20:00:00Z'));
    const out = JSON.parse(json);
    expect(out).toMatchObject({ app: 'wardrobe-buddy', schema: 3, exportedAt: '2026-11-17T20:00:00.000Z' });
    expect(Object.keys(out.photos).sort()).toEqual(['diary:d', 'item:a', 'selfie']);
    expect(out.data.items[0].photoUri).toBe('photo:item:a');
    expect(out.data.profile.selfieUri).toBe('photo:selfie');
    expect(out.data.diary[0].photoUri).toBe('photo:diary:d');
    expect(json).not.toContain('file://');
    expect(out.data.forecast).toBeUndefined();
  });
  it('web: inline data-URI photos stay inline and are not repeated', async () => {
    const data = { ...emptyAppData(), items: [item('a', 'data:image/jpeg;base64,AAAA')] } as never;
    const reader = jest.fn();
    const out = JSON.parse(await buildExport(data, reader, new Date(0)));
    expect(out.photos).toEqual({});
    expect(reader).not.toHaveBeenCalled();
    expect(out.data.items[0].photoUri).toBe('data:image/jpeg;base64,AAAA');
  });
  it('a photo that cannot be read is skipped, not fatal', async () => {
    const data = { ...emptyAppData(), diary: [{ id: 'd', outfitId: 'o', photoUri: 'file:///p/missing.jpg', faceBlurred: true }] };
    const out = JSON.parse(await buildExport(data, async () => Promise.reject(new Error('gone')), new Date(0)));
    expect(out.photos).toEqual({});
  });
});
