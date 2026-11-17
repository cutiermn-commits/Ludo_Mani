/**
 * Minimal PNG decoder (8/16-bit RGB/RGBA, non-interlaced) with a small inflate (RFC 1951).
 * Reads PNGs produced by our own image manipulator: the 24×24 colour thumbnail and the
 * ~360 px selfie before blurring. No image library dependency (CLAUDE.md non-negotiable 7).
 * Malformed input throws an Error (fuzz-tested); output is capped against decompression bombs.
 */

class BitReader {
  pos = 0;
  bit = 0;
  constructor(readonly d: Uint8Array) {}
  read(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      if (this.pos >= this.d.length) throw new Error('inflate: unexpected end');
      v |= ((this.d[this.pos] >> this.bit) & 1) << i;
      if (++this.bit === 8) {
        this.bit = 0;
        this.pos++;
      }
    }
    return v;
  }
  align(): void {
    if (this.bit) {
      this.bit = 0;
      this.pos++;
    }
  }
}

interface Huffman {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function buildHuffman(lengths: ArrayLike<number>): Huffman {
  const counts = new Uint16Array(16);
  for (let i = 0; i < lengths.length; i++) counts[lengths[i]]++;
  counts[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
  // Reject over-subscribed code sets (more codes than the bit lengths allow).
  let left = 1;
  for (let len = 1; len < 16; len++) {
    left = (left << 1) - counts[len];
    if (left < 0) throw new Error('inflate: over-subscribed code');
  }
  const symbols = new Uint16Array(lengths.length);
  for (let i = 0; i < lengths.length; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
  return { counts, symbols };
}

function decodeSym(br: BitReader, h: Huffman): number {
  let code = 0;
  let first = 0;
  let index = 0;
  for (let len = 1; len < 16; len++) {
    code |= br.read(1);
    const count = h.counts[len];
    if (code - first < count) return h.symbols[index + code - first];
    index += count;
    first = (first + count) << 1;
    code <<= 1;
  }
  throw new Error('inflate: bad code');
}

const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

let fixed: { lit: Huffman; dist: Huffman } | null = null;
function fixedTables() {
  if (!fixed) {
    const l = new Uint8Array(288);
    l.fill(8, 0, 144);
    l.fill(9, 144, 256);
    l.fill(7, 256, 280);
    l.fill(8, 280, 288);
    fixed = { lit: buildHuffman(l), dist: buildHuffman(new Uint8Array(30).fill(5)) };
  }
  return fixed;
}

/** Raw DEFLATE → bytes. `maxOut` guards against decompression bombs. */
export function inflateRaw(data: Uint8Array, maxOut = 4 * 1024 * 1024): Uint8Array {
  const br = new BitReader(data);
  let out = new Uint8Array(1024);
  let n = 0;
  const push = (b: number) => {
    if (n >= out.length) {
      if (out.length >= maxOut) throw new Error('inflate: output too large');
      const bigger = new Uint8Array(Math.min(out.length * 2, maxOut));
      bigger.set(out);
      out = bigger;
    }
    out[n++] = b;
  };
  let final = 0;
  while (!final) {
    final = br.read(1);
    const type = br.read(2);
    if (type === 0) {
      br.align();
      if (br.pos + 4 > data.length) throw new Error('inflate: bad stored block');
      const len = data[br.pos] | (data[br.pos + 1] << 8);
      const nlen = data[br.pos + 2] | (data[br.pos + 3] << 8);
      if ((len ^ 0xffff) !== nlen) throw new Error('inflate: bad stored length');
      br.pos += 4;
      if (br.pos + len > data.length) throw new Error('inflate: bad stored block');
      for (let i = 0; i < len; i++) push(data[br.pos + i]);
      br.pos += len;
      continue;
    }
    let lit: Huffman;
    let dist: Huffman;
    if (type === 1) ({ lit, dist } = fixedTables());
    else if (type === 2) {
      const hlit = br.read(5) + 257;
      const hdist = br.read(5) + 1;
      const hclen = br.read(4) + 4;
      const cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) cl[CL_ORDER[i]] = br.read(3);
      const clh = buildHuffman(cl);
      const lens = new Uint8Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist; ) {
        const sym = decodeSym(br, clh);
        if (sym < 16) lens[i++] = sym;
        else {
          let rep = 0;
          let val = 0;
          if (sym === 16) {
            if (i === 0) throw new Error('inflate: bad repeat');
            val = lens[i - 1];
            rep = 3 + br.read(2);
          } else if (sym === 17) rep = 3 + br.read(3);
          else rep = 11 + br.read(7);
          if (i + rep > lens.length) throw new Error('inflate: bad lengths');
          while (rep--) lens[i++] = val;
        }
      }
      lit = buildHuffman(lens.subarray(0, hlit));
      dist = buildHuffman(lens.subarray(hlit));
    } else throw new Error('inflate: bad block type');

    for (;;) {
      const sym = decodeSym(br, lit);
      if (sym < 256) push(sym);
      else if (sym === 256) break;
      else {
        const li = sym - 257;
        if (li >= LBASE.length) throw new Error('inflate: bad length');
        const len = LBASE[li] + br.read(LEXT[li]);
        const di = decodeSym(br, dist);
        if (di >= DBASE.length) throw new Error('inflate: bad distance');
        const d = DBASE[di] + br.read(DEXT[di]);
        if (d > n) throw new Error('inflate: distance too far');
        for (let k = 0; k < len; k++) push(out[n - d]);
      }
    }
  }
  return out.subarray(0, n);
}

export interface RGBAImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. */
  data: Uint8Array;
}

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function decodePng(bytes: Uint8Array): RGBAImage {
  for (let i = 0; i < 8; i++) if (bytes[i] !== SIG[i]) throw new Error('png: bad signature');
  const u32 = (o: number) => ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  let depth = 8;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= bytes.length) {
    const len = u32(pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const body = bytes.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = u32(pos + 8);
      height = u32(pos + 12);
      depth = body[8];
      colorType = body[9];
      if ((depth !== 8 && depth !== 16) || (colorType !== 2 && colorType !== 6) || body[12] !== 0) throw new Error('png: unsupported format');
      if (width * height > 1_000_000) throw new Error('png: too large');
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!width || !idat.length) throw new Error('png: missing data');
  const z = new Uint8Array(idat.reduce((s, c) => s + c.length, 0));
  let off = 0;
  for (const c of idat) {
    z.set(c, off);
    off += c.length;
  }
  if (z.length < 2 || (z[0] & 0x0f) !== 8 || ((z[0] << 8) | z[1]) % 31 !== 0) throw new Error('png: bad zlib header');
  const raw = inflateRaw(z.subarray(2));
  const bpp = (colorType === 6 ? 4 : 3) * (depth / 8);
  const stride = width * bpp;
  if (raw.length < height * (stride + 1)) throw new Error('png: short data');
  const px = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const ft = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0;
      const b = y > 0 ? px[dst - stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[dst - stride + x - bpp] : 0;
      const v = raw[src + x];
      let p: number;
      switch (ft) {
        case 0:
          p = v;
          break;
        case 1:
          p = v + a;
          break;
        case 2:
          p = v + b;
          break;
        case 3:
          p = v + ((a + b) >> 1);
          break;
        case 4: {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          p = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default:
          throw new Error('png: bad filter');
      }
      px[dst + x] = p & 0xff;
    }
  }
  const channels = colorType === 6 ? 4 : 3;
  const step = depth / 8; // 16-bit: keep the high byte
  if (channels === 4 && step === 1) return { width, height, data: px };
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    for (let c = 0; c < channels; c++) rgba[p * 4 + c] = px[(p * channels + c) * step];
    if (channels === 3) rgba[p * 4 + 3] = 255;
  }
  return { width, height, data: rgba };
}
