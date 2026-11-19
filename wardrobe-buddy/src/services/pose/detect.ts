import { base64ToBytes } from '@/domain/image/base64';
import { decodePose, letterbox, MOVENET_SIZE, type PoseDecode } from '@/domain/fit/movenet';
import { decodePng } from '@/domain/image/png';

import { resizeAndSave, type Picked } from '../photos/pipeline';
import type { PhotoStore } from '../photos/types';
import type { RunPose } from './types';

/**
 * Finds her shoulders, hips and feet in a saved photo, on the device (D-064):
 * small PNG copy → letterboxed 192 × 192 RGB → MoveNet in the offline pose page → pose as shares
 * of the photo. The temporary copy is discarded afterwards.
 */
export async function detectPose(photo: Picked, store: PhotoStore, run: RunPose): Promise<PoseDecode> {
  const temps: (string | undefined)[] = [];
  try {
    const aspect = photo.width > 0 && photo.height > 0 ? photo.width / photo.height : 0.75;
    const width = aspect >= 1 ? MOVENET_SIZE : Math.max(1, Math.round(MOVENET_SIZE * aspect));
    const png = await resizeAndSave(photo, width, { format: 'png' });
    temps.push(png.uri);
    if (!png.base64) throw new Error('no image data');
    const img = decodePng(base64ToBytes(png.base64));
    const lb = letterbox(img);
    const kp = await run(lb.bytes);
    return decodePose(kp, lb, img.width, img.height);
  } finally {
    for (const u of temps) if (u) await store.discard(u).catch(() => undefined);
  }
}
