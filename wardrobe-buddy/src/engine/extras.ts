import type { ExtraKind, WeatherDay } from '@/domain/types';

import { ENGINE_CONFIG as C } from './engine.config';
import { isRainy, isWindy, swingC } from './weather';

/** "Don't forget" chips (OUTFIT_ENGINE §2). Order is stable, duplicates removed. */
export function extrasFor(day: WeatherDay, feelsC: number): ExtraKind[] {
  const out = new Set<ExtraKind>();
  const rainy = isRainy(day);
  const windy = isWindy(day);

  if (rainy) {
    out.add('rainJacket');
    if (!windy) out.add('umbrella'); // no umbrella in strong wind
  }
  if (windy) out.add('hood');
  if (feelsC < C.hatGlovesBelowC) {
    out.add('hat');
    out.add('gloves');
  }
  if (feelsC < C.scarfBelowC) out.add('scarf');
  if (feelsC < C.lipBalmBelowC || (windy && feelsC < C.windyColdBelowC)) out.add('lipBalm');
  if (day.uvMax >= C.uv.sunscreen) out.add('sunscreen');
  if (day.uvMax >= C.uv.cap) out.add('cap');
  if (day.snow) out.add('warmBoots');
  if (swingC(day) >= C.layersSwingC) out.add('layers');

  return [...out];
}
