import { useEffect, useRef, useState } from 'react';

import { needsShape } from '@/domain/fit/garmentShape';
import { useApp } from '@/features/app/AppState';
import { readGarmentPhoto } from '@/services/photos/capture';

/**
 * Clothes added before garments were measured (D-068) are measured once, quietly, in the
 * background: turned the right way up and given their shape. One at a time; each item is tried
 * at most once per app start.
 */
export function useShapeUpgrade() {
  const { items, updateItem, photos } = useApp();
  const tried = useRef(new Set<string>());
  const busy = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((i) => needsShape(i) && !tried.current.has(i.id));
    if (!next) return;
    busy.current = true;
    tried.current.add(next.id);
    void (async () => {
      try {
        const r = await readGarmentPhoto(next, photos, { auto: !next.turnedByHand });
        if (!r) return;
        // Applied to the latest copy of the item (she may have changed it meanwhile).
        let applied = false;
        await updateItem(next.id, (cur) => {
          if (cur.cutoutUri !== next.cutoutUri) return cur;
          applied = true;
          return { ...cur, cutoutUri: r.cutoutUri, cutoutAspect: r.cutoutAspect, photoUri: r.photoUri, shape: r.shape, ...(r.turned ? { fit: undefined } : {}) };
        });
        if (r.turned && !applied) {
          // She changed the item meanwhile: drop the turned copies instead.
          if (r.cutoutUri !== next.cutoutUri) await photos.remove(r.cutoutUri);
          if (r.photoUri && r.photoUri !== next.photoUri) await photos.remove(r.photoUri);
        } else if (r.turned) {
          if (next.cutoutUri && next.cutoutUri !== r.cutoutUri) await photos.remove(next.cutoutUri);
          if (next.photoUri && next.photoUri !== r.photoUri) await photos.remove(next.photoUri);
        }
      } catch {
        // Measuring is a nice-to-have: the garment is still worn by its outline.
      } finally {
        busy.current = false;
        setTick((n) => n + 1);
      }
    })();
  }, [items, photos, updateItem, tick]);
}
