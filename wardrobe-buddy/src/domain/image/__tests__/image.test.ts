import { crc32, deflateRawSync, deflateSync } from 'zlib';

import { base64ToBytes, bytesToBase64 } from '../base64';
import { detectColors, nearestColorName } from '../colorDetect';
import { hasJpegMetadata, stripJpegMetadata } from '../jpeg';
import { decodePng, inflateRaw } from '../png';

/** Build a real PNG with Node's zlib, using a given filter type per row. */
function makePng(w: number, h: number, pixel: (x: number, y: number) => [number, number, number, number], opts: { rgb?: boolean; filter?: number; level?: number } = {}) {
  const bpp = opts.rgb ? 3 : 4;
  const stride = w * bpp;
  const rows = Buffer.alloc(h * (stride + 1));
  const prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < w; x++) {
      const p = pixel(x, y);
      for (let c = 0; c < bpp; c++) cur[x * bpp + c] = p[c];
    }
    const f = opts.filter ?? 0;
    rows[y * (stride + 1)] = f;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = y > 0 ? prev[i] : 0;
      const c = i >= bpp && y > 0 ? prev[i - bpp] : 0;
      let pred = 0;
      if (f === 1) pred = a;
      else if (f === 2) pred = b;
      else if (f === 3) pred = (a + b) >> 1;
      else if (f === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      rows[y * (stride + 1) + 1 + i] = (cur[i] - pred) & 0xff;
    }
    cur.copy(prev);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = opts.rgb ? 2 : 6;
  return new Uint8Array(
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows, { level: opts.level ?? 6 })), chunk('IEND', Buffer.alloc(0))]),
  );
}

describe('inflateRaw', () => {
  it.each([0, 1, 6, 9])('round-trips zlib level %i (stored, fixed and dynamic blocks)', (level) => {
    const text = Buffer.from('Wardrobe Buddy hættetrøje '.repeat(200) + [...Array(3000)].map((_, i) => String.fromCharCode(33 + ((i * 7919) % 90))).join(''));
    expect(Buffer.from(inflateRaw(new Uint8Array(deflateRawSync(text, { level })))).equals(text)).toBe(true);
  });
  it('refuses oversized output (decompression bomb)', () => {
    expect(() => inflateRaw(new Uint8Array(deflateRawSync(Buffer.alloc(100_000))), 10_000)).toThrow('too large');
  });
  it('throws on garbage', () => {
    expect(() => inflateRaw(new Uint8Array([0xff, 0xff, 0xff]))).toThrow();
  });
});

describe('decodePng', () => {
  const pixel = (x: number, y: number): [number, number, number, number] => [(x * 37) & 255, (y * 59) & 255, (x * y) & 255, 255];
  it.each([0, 1, 2, 3, 4])('decodes RGBA with filter %i', (filter) => {
    const img = decodePng(makePng(9, 7, pixel, { filter }));
    expect(img).toMatchObject({ width: 9, height: 7 });
    expect(Array.from(img.data.subarray((3 * 9 + 5) * 4, (3 * 9 + 5) * 4 + 4))).toEqual(pixel(5, 3));
  });
  it('decodes RGB and adds opaque alpha', () => {
    const img = decodePng(makePng(4, 4, () => [10, 20, 30, 0], { rgb: true, filter: 4 }));
    expect(Array.from(img.data.subarray(0, 4))).toEqual([10, 20, 30, 255]);
  });
  it('rejects non-PNG data', () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toThrow('signature');
  });
});

describe('colour detection', () => {
  it.each([
    [[20, 20, 20], 'black'],
    [[250, 250, 250], 'white'],
    [[150, 150, 150], 'grey'],
    [[214, 56, 58], 'red'],
    [[242, 141, 181], 'pink'],
    [[80, 112, 165], 'denim'],
    [[30, 40, 80], 'navy'],
    [[60, 154, 95], 'green'],
    [[242, 207, 58], 'yellow'],
    [[139, 92, 214], 'purple'],
    [[110, 70, 40], 'brown'],
  ] as const)('%j → %s', (rgb, name) => {
    expect(nearestColorName(rgb[0], rgb[1], rgb[2])).toBe(name);
  });

  it('a red jumper on a white background is "red" (centre region wins)', () => {
    const img = decodePng(makePng(24, 24, (x, y) => (x > 5 && x < 18 && y > 5 && y < 18 ? [214, 56, 58, 255] : [250, 250, 250, 255])));
    expect(detectColors(img)[0]).toBe('red');
  });
  it('two clear colours → both, main first', () => {
    const img = decodePng(makePng(20, 20, (x) => (x < 12 ? [30, 40, 80, 255] : [250, 250, 250, 255])));
    expect(detectColors(img, 1)).toEqual(['navy', 'white']);
  });
  it('many colours → multi', () => {
    const cols: [number, number, number, number][] = [[214, 56, 58, 255], [60, 154, 95, 255], [242, 207, 58, 255], [47, 111, 224, 255]];
    const img = decodePng(makePng(20, 20, (x) => cols[Math.floor(x / 5)]));
    expect(detectColors(img, 1)).toEqual(['multi']);
  });
  it('fully transparent → no suggestion', () => {
    expect(detectColors(decodePng(makePng(4, 4, () => [0, 0, 0, 0])))).toEqual([]);
  });
});

describe('JPEG metadata stripping', () => {
  const seg = (marker: number, payload: number[]) => [0xff, marker, 0, payload.length + 2, ...payload];
  const gps = [...Buffer.from('Exif\0\0GPS-55.67N')];
  const jpeg = new Uint8Array([0xff, 0xd8, ...seg(0xe0, [...Buffer.from('JFIF\0')]), ...seg(0xe1, gps), ...seg(0xed, [1, 2, 3]), ...seg(0xdb, [9, 9]), 0xff, 0xda, 0, 4, 7, 7, 0x12, 0x34, 0xff, 0xd9]);

  it('removes EXIF/XMP and IPTC but keeps the image data', () => {
    expect(hasJpegMetadata(jpeg)).toBe(true);
    const out = stripJpegMetadata(jpeg);
    expect(hasJpegMetadata(out)).toBe(false);
    expect(Buffer.from(out).includes(Buffer.from('GPS'))).toBe(false);
    expect(Buffer.from(out).includes(Buffer.from('JFIF'))).toBe(true);
    expect(Array.from(out.slice(-10))).toEqual([0xff, 0xda, 0, 4, 7, 7, 0x12, 0x34, 0xff, 0xd9]); // scan data untouched
    expect(out.length).toBe(jpeg.length - (gps.length + 4) - (3 + 4));
  });
  it('rejects non-JPEG data', () => {
    expect(() => stripJpegMetadata(new Uint8Array([1, 2, 3]))).toThrow();
  });
});

describe('base64', () => {
  it.each([0, 1, 2, 3, 4, 5, 100])('round-trips %i bytes like Node does', (n) => {
    const bytes = new Uint8Array([...Array(n)].map((_, i) => (i * 97 + 13) & 255));
    const b64 = bytesToBase64(bytes);
    expect(b64).toBe(Buffer.from(bytes).toString('base64'));
    expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(bytes));
  });
  it('accepts data URIs', () => {
    expect(Array.from(base64ToBytes('data:image/png;base64,AQID'))).toEqual([1, 2, 3]);
  });
});
