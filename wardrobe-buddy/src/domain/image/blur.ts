import type { RGBAImage } from './png';

/**
 * Selfie privacy blur (D-033 / D-045). There is no first-party face detection in Expo SDK 58,
 * so the whole upper part of the photo (where the face is in a selfie) is blurred heavily,
 * fading out towards the shoulders so the outfit below stays visible.
 * Values are ASSUMPTION starting values; tests check that the face area loses its detail.
 */
export const SELFIE_BLUR = {
  /** Share of the height, from the top, that is fully blurred. */
  blurShare: 0.6,
  /** Share of the height below that, over which the blur fades out. */
  fadeShare: 0.1,
  /** Box radius as a share of the image width; 3 box passes ≈ a Gaussian. */
  radiusShare: 0.08,
  passes: 3,
} as const;

function boxBlurH(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const span = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[row + Math.min(w - 1, Math.max(0, k)) * 4 + c];
      for (let x = 0; x < w; x++) {
        dst[row + x * 4 + c] = Math.round(sum / span);
        const add = Math.min(w - 1, x + r + 1);
        const sub = Math.max(0, x - r);
        sum += src[row + add * 4 + c] - src[row + sub * 4 + c];
      }
    }
  }
}

function boxBlurV(src: Uint8Array, dst: Uint8Array, w: number, h: number, r: number) {
  const span = 2 * r + 1;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += src[(Math.min(h - 1, Math.max(0, k)) * w + x) * 4 + c];
      for (let y = 0; y < h; y++) {
        dst[(y * w + x) * 4 + c] = Math.round(sum / span);
        const add = Math.min(h - 1, y + r + 1);
        const sub = Math.max(0, y - r);
        sum += src[(add * w + x) * 4 + c] - src[(sub * w + x) * 4 + c];
      }
    }
  }
}

/** Returns a new image with the top region blurred (the input is not changed). */
export function blurTop(img: RGBAImage, opts: Partial<typeof SELFIE_BLUR> = {}): RGBAImage {
  const o = { ...SELFIE_BLUR, ...opts };
  const { width: w, height: h } = img;
  const r = Math.max(2, Math.round(w * o.radiusShare));
  const a: Uint8Array = Uint8Array.from(img.data);
  const b: Uint8Array = new Uint8Array(a.length);
  for (let p = 0; p < o.passes; p++) {
    boxBlurH(a, b, w, h, r);
    boxBlurV(b, a, w, h, r);
  }
  const blurred = a;
  const out = Uint8Array.from(img.data);
  const full = Math.round(h * o.blurShare);
  const fade = Math.max(1, Math.round(h * o.fadeShare));
  for (let y = 0; y < Math.min(h, full + fade); y++) {
    const t = y < full ? 1 : 1 - (y - full) / fade; // 1 = fully blurred
    for (let x = 0; x < w * 4; x++) {
      const i = y * w * 4 + x;
      out[i] = Math.round(blurred[i] * t + img.data[i] * (1 - t));
    }
  }
  return { width: w, height: h, data: out };
}
