// Web: the browser downloads the file locally. Nothing is uploaded. Web photos are already
// stored inline (data URIs) inside the items, so the export has no separate photo map.
import type { AppData } from '@/data/repository';

import { buildExport } from './buildExport';

export const EXPORT_PREFIX = 'wardrobe-buddy-export';

export async function shareExport(data: AppData, now: Date): Promise<boolean> {
  const json = await buildExport(data, async () => null, now);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${EXPORT_PREFIX}-${now.toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
