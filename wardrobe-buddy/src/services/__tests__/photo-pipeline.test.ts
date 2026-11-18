/**
 * The privacy promise of D-042/D-045, end to end through the photo pipeline with fakes for the
 * native modules: only a metadata-free JPEG is saved, a selfie's face area is blurred in what is
 * saved, and every picker/manipulator/temp copy is discarded and the caches purged — also on errors.
 */
import { bytesToBase64 } from '@/domain/image/base64';
import { decodePng, type RGBAImage } from '@/domain/image/png';

import { processPhoto } from '../photos/capture';
import { processSelfie } from '../photos/selfie';
import type { PhotoStore } from '../photos/types';

const W = 120;
const H = 160;
function checker(): RGBAImage {
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = (x + y) % 2 ? 255 : 0;
      data.set([v, v, v, 255], (y * W + x) * 4);
    }
  return { width: W, height: H, data };
}

// Fake JPEG: SOI + EXIF (with "GPS") + COM, then the image as a PNG inside the scan data.
const EXIF = [0xff, 0xe1, 0, 9, ...Array.from(Buffer.from('ExifGPS'))];
const COM = [0xff, 0xfe, 0, 7, ...Array.from(Buffer.from('Phone'))];
const mockFakeJpeg = (png: Uint8Array) => new Uint8Array([0xff, 0xd8, ...EXIF, ...COM, 0xff, 0xda, 0, 2, ...png, 0xff, 0xd9]);
const pngFromFakeJpeg = (jpeg: Uint8Array) => {
  const sos = jpeg.findIndex((b, i) => b === 0xff && jpeg[i + 1] === 0xda);
  return jpeg.subarray(sos + 4, jpeg.length - 2);
};

/** URI → image the fake manipulator "loads". */
const mockState = { images: new Map<string, RGBAImage>(), fileNo: 0 };
const images = mockState.images;
let failSave = false;

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: {
    manipulate: (uri: string) => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { decodePng: dec } = require('@/domain/image/png');
      const { base64ToBytes: b2b, bytesToBase64: b2s } = require('@/domain/image/base64');
      const { encodePng: enc } = require('@/domain/image/pngEncode');
      /* eslint-enable @typescript-eslint/no-require-imports */
      const load = (): RGBAImage => {
        if (uri.startsWith('data:')) return dec(b2b(uri));
        const img = mockState.images.get(uri);
        if (!img) throw new Error(`unknown uri ${uri}`);
        return img;
      };
      return {
        resize: jest.fn(),
        release: jest.fn(),
        renderAsync: async () => {
          const img = load();
          return {
            width: img.width,
            height: img.height,
            release: jest.fn(),
            saveAsync: async (o: { format: string }) => {
              const png = enc(img);
              const out = `file:///cache/ImageManipulator/${++mockState.fileNo}.${o.format}`;
              mockState.images.set(out, img);
              return { uri: out, width: img.width, height: img.height, base64: b2s(o.format === 'png' ? png : mockFakeJpeg(png)) };
            },
          };
        },
      };
    },
  },
}));
jest.mock('expo-image-picker', () => ({}));

function fakeStore() {
  const saved: Uint8Array[] = [];
  const store: PhotoStore & { saved: Uint8Array[] } = {
    saved,
    save: jest.fn(async (b: Uint8Array) => {
      if (failSave) throw new Error('disk full');
      saved.push(b);
      return `file:///docs/photos/${saved.length}.jpg`;
    }),
    remove: jest.fn(async () => undefined),
    removeAll: jest.fn(async () => undefined),
    temp: jest.fn(async (b: Uint8Array, mime: string) => `data:${mime};base64,${bytesToBase64(b)}`),
    discard: jest.fn(async () => undefined),
    purgeCaches: jest.fn(async () => undefined),
    listSaved: jest.fn(async () => []),
  };
  return store;
}

function detail(img: RGBAImage, y0: number, y1: number) {
  let s = 0;
  let n = 0;
  for (let y = y0; y < y1; y++)
    for (let x = 1; x < img.width; x++) {
      s += Math.abs(img.data[(y * img.width + x) * 4] - img.data[(y * img.width + x - 1) * 4]);
      n++;
    }
  return s / n;
}

beforeEach(() => {
  images.clear();
  images.set('file:///cache/ImagePicker/picked.jpg', checker());
  failSave = false;
});
const picked = { uri: 'file:///cache/ImagePicker/picked.jpg', width: W, height: H };

describe('selfie pipeline (D-045)', () => {
  it('saves exactly one JPEG: no metadata, face area blurred, outfit area sharp', async () => {
    const store = fakeStore();
    await processSelfie(picked, store);
    expect(store.saved).toHaveLength(1);
    const bytes = store.saved[0];
    expect(Buffer.from(bytes).includes(Buffer.from('GPS'))).toBe(false);
    expect(Buffer.from(bytes).includes(Buffer.from('Phone'))).toBe(false);
    const img = decodePng(pngFromFakeJpeg(bytes));
    expect(detail(img, 0, Math.round(H * 0.6))).toBeLessThan(5);
    expect(detail(img, Math.round(H * 0.75), H)).toBeGreaterThan(200);
  });

  it('"blur the whole photo" leaves no sharp area', async () => {
    const store = fakeStore();
    await processSelfie(picked, store, { whole: true });
    expect(detail(decodePng(pngFromFakeJpeg(store.saved[0])), 0, H)).toBeLessThan(5);
  });

  it('discards the picker copy and every intermediate, and purges the caches', async () => {
    const store = fakeStore();
    await processSelfie(picked, store);
    const discarded = (store.discard as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(discarded).toContain(picked.uri);
    expect(discarded.filter((u) => u.includes('/cache/ImageManipulator/'))).toHaveLength(2);
    expect(discarded.some((u) => u.startsWith('data:image/png'))).toBe(true);
    expect(store.purgeCaches).toHaveBeenCalled();
  });

  it('cleans up even when saving fails', async () => {
    const store = fakeStore();
    failSave = true;
    await expect(processSelfie(picked, store)).rejects.toThrow('disk full');
    expect(store.discard).toHaveBeenCalledWith(picked.uri);
    expect(store.purgeCaches).toHaveBeenCalled();
  });

  it('re-blurring a saved selfie does not delete the saved file', async () => {
    const store = fakeStore();
    images.set('file:///docs/photos/old.jpg', checker());
    await processSelfie({ uri: 'file:///docs/photos/old.jpg', width: 0, height: 0 }, store, { whole: true, deleteSource: false });
    expect((store.discard as jest.Mock).mock.calls.map((c) => c[0])).not.toContain('file:///docs/photos/old.jpg');
  });
});

describe('clothing photo pipeline (D-042)', () => {
  it('saves one metadata-free JPEG and cleans up, also on failure', async () => {
    const store = fakeStore();
    const res = await processPhoto(picked, store);
    expect(store.saved).toHaveLength(1);
    expect(res.photoUri).toBe('file:///docs/photos/1.jpg');
    expect(Buffer.from(store.saved[0]).includes(Buffer.from('GPS'))).toBe(false);
    expect(store.discard).toHaveBeenCalledWith(picked.uri);
    expect(store.purgeCaches).toHaveBeenCalled();

    const failing = fakeStore();
    failSave = true;
    await expect(processPhoto(picked, failing)).rejects.toThrow('disk full');
    expect(failing.discard).toHaveBeenCalledWith(picked.uri);
    expect(failing.purgeCaches).toHaveBeenCalled();
  });
});

describe('clothing cut-out for the avatar (D-059)', () => {
  function shirtOnFloor(): RGBAImage {
    const w = 120;
    const h = 120;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const shirt = y > 25 && y < 100 && Math.abs(x - 60) < (y < 45 ? 45 : 22);
        data.set(shirt ? [205, 40, 45, 255] : [236, 232, 226, 255], (y * w + x) * 4);
      }
    return { width: w, height: h, data };
  }

  it('a photo on a plain floor gets a PNG cut-out, colours from the garment, and all temps discarded', async () => {
    images.set('file:///cache/ImagePicker/shirt.jpg', shirtOnFloor());
    const store = fakeStore();
    const res = await processPhoto({ uri: 'file:///cache/ImagePicker/shirt.jpg', width: 120, height: 120 }, store);
    expect(res.cutoutUri).toBeDefined();
    expect(res.colors[0]).toBe('red');
    expect((store.save as jest.Mock).mock.calls.map((c) => c[1] ?? 'jpeg')).toEqual(['jpeg', 'png']);
    const discarded = (store.discard as jest.Mock).mock.calls.map((c) => c[0] as string);
    expect(discarded).toContain('file:///cache/ImagePicker/shirt.jpg');
    expect(discarded.some((u) => u.startsWith('data:image/png'))).toBe(true); // uncompressed intermediate
    expect(store.purgeCaches).toHaveBeenCalled();
  });

  it('a busy photo (checkerboard) gets no cut-out but is still saved', async () => {
    const store = fakeStore();
    const res = await processPhoto(picked, store);
    expect(res.cutoutUri).toBeUndefined();
    expect(store.saved).toHaveLength(1);
  });
});
