import type { ColorName } from '@/domain/types';

import type { RGBAImage } from './png';

/**
 * Dominant clothing colour from a small thumbnail (ARCHITECTURE "Colour detection").
 * Each pixel in the centre region votes for its nearest reference colour; the result
 * is a suggestion she can change. Reference shades are ASSUMPTION starting values.
 */
const REFERENCES: [ColorName, string[]][] = [
  ['black', ['#111111', '#262626']],
  ['white', ['#F7F7F7', '#FFFFFF', '#EDEDED']],
  ['grey', ['#808080', '#A6A6A6', '#5E5E5E', '#C9C9C9']],
  ['beige', ['#D8C3A5', '#E8DCC4', '#C8B28E']],
  ['brown', ['#6B4423', '#8B5A2B', '#4A2F1B']],
  ['navy', ['#1C2541', '#202A5A', '#1B1F3B']],
  ['denim', ['#4A6FA5', '#5B7DB1', '#3B5998', '#6E8CB8']],
  ['blue', ['#2F6FE0', '#1E4FD8', '#0057B8']],
  ['lightblue', ['#9CC8F2', '#ADD8E6', '#87CEEB']],
  ['green', ['#3C9A5F', '#2E7D32', '#6B8E23', '#98C98F']],
  ['yellow', ['#F2CF3A', '#FFE066', '#F5D90A']],
  ['orange', ['#F08A2C', '#FF7F27', '#E5671B']],
  ['red', ['#D6383A', '#B22222', '#8B0000', '#E53935']],
  ['pink', ['#F28DB5', '#FFC0CB', '#E75480', '#F7A8C8']],
  ['purple', ['#8B5CD6', '#6A0DAD', '#B39DDB', '#7E57C2']],
];

const REF_RGB = REFERENCES.flatMap(([name, hexes]) =>
  hexes.map((h) => ({ name, r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) })),
);

/** "Redmean" perceptual RGB distance (cheap and good enough for naming colours). */
function dist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

export function nearestColorName(r: number, g: number, b: number): ColorName {
  let best = REF_RGB[0];
  let bestD = Infinity;
  for (const ref of REF_RGB) {
    const d = dist2(r, g, b, ref.r, ref.g, ref.b);
    if (d < bestD) {
      bestD = d;
      best = ref;
    }
  }
  return best.name;
}

/** Up to 2 colour names, main colour first; ['multi'] when no colour clearly dominates. */
export function detectColors(img: RGBAImage, centreShare = 0.6): ColorName[] {
  const votes = new Map<ColorName, number>();
  const x0 = Math.floor((img.width * (1 - centreShare)) / 2);
  const y0 = Math.floor((img.height * (1 - centreShare)) / 2);
  const x1 = Math.max(x0 + 1, Math.ceil(img.width - x0));
  const y1 = Math.max(y0 + 1, Math.ceil(img.height - y0));
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] < 128) continue; // transparent
      const name = nearestColorName(img.data[i], img.data[i + 1], img.data[i + 2]);
      votes.set(name, (votes.get(name) ?? 0) + 1);
      total++;
    }
  }
  if (total === 0) return [];
  const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const share = (k: number) => (ranked[k] ? ranked[k][1] / total : 0);
  if (share(0) < 0.3 && ranked.filter((_, k) => share(k) >= 0.15).length >= 3) return ['multi'];
  return ranked.filter((_, k) => k < 2 && (k === 0 || share(k) >= 0.2)).map(([n]) => n);
}
