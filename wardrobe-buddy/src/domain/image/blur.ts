import type { RGBAImage } from './png';

/**
 * Selfie privacy blur (D-033 / D-045). There is no first-party face detection in Expo SDK 58,
 * so the upper part of the photo (where the face is in a selfie) is reduced to a very coarse
 * grid of averaged colours and smoothly enlarged again (bilinear). With ~16 cells across the
 * whole width, a face spans only a handful of cells, so no facial features survive.
 * One pass over the pixels: fast enough for the JS thread (architecture review, Phase 3–4).
 * Values are ASSUMPTION starting values.
 */
export const SELFIE_BLUR: BlurOptions = {
  /** Share of the height, from the top, that is fully blurred (1 = the whole photo). */
  blurShare: 0.6,
  /** Share of the height below that, over which the blur fades out. */
  fadeShare: 0.1,
  /** Grid cells across the width. Fewer = stronger. */
  cellsAcross: 16,
};

export interface BlurOptions {
  blurShare: number;
  fadeShare: number;
  cellsAcross: number;
}

export function blurTop(img: RGBAImage, opts: Partial<BlurOptions> = {}): RGBAImage {
  const o = { ...SELFIE_BLUR, ...opts };
  const { width: w, height: h, data } = img;
  const full = Math.min(h, Math.round(h * o.blurShare));
  const fade = full >= h ? 0 : Math.max(1, Math.round(h * o.fadeShare));
  const region = Math.min(h, full + fade); // rows that change at all
  const out = Uint8Array.from(data);
  if (region === 0) return { width: w, height: h, data: out };

  // 1. Average the region into a coarse grid (square-ish cells).
  const gw = Math.max(1, Math.min(w, o.cellsAcross));
  const cell = w / gw;
  const gh = Math.max(1, Math.round(region / cell));
  const sums = new Float64Array(gw * gh * 3);
  const counts = new Float64Array(gw * gh);
  for (let y = 0; y < region; y++) {
    const gy = Math.min(gh - 1, Math.floor((y * gh) / region));
    for (let x = 0; x < w; x++) {
      const g = gy * gw + Math.min(gw - 1, Math.floor((x * gw) / w));
      const i = (y * w + x) * 4;
      sums[g * 3] += data[i];
      sums[g * 3 + 1] += data[i + 1];
      sums[g * 3 + 2] += data[i + 2];
      counts[g]++;
    }
  }
  for (let g = 0; g < gw * gh; g++) for (let c = 0; c < 3; c++) sums[g * 3 + c] /= counts[g] || 1;

  // 2. Bilinear enlarge back over the region, blending into the original in the fade band.
  for (let y = 0; y < region; y++) {
    const t = y < full ? 1 : 1 - (y - full) / fade; // 1 = fully blurred
    const fy = Math.min(gh - 1, Math.max(0, ((y + 0.5) * gh) / region - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(gh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(gw - 1, Math.max(0, ((x + 0.5) * gw) / w - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(gw - 1, x0 + 1);
      const tx = fx - x0;
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const top = sums[(y0 * gw + x0) * 3 + c] * (1 - tx) + sums[(y0 * gw + x1) * 3 + c] * tx;
        const bot = sums[(y1 * gw + x0) * 3 + c] * (1 - tx) + sums[(y1 * gw + x1) * 3 + c] * tx;
        const v = top * (1 - ty) + bot * ty;
        out[i + c] = Math.round(v * t + data[i + c] * (1 - t));
      }
    }
  }
  return { width: w, height: h, data: out };
}
