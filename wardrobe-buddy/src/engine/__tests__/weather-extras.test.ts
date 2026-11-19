import type { WeatherHour } from '@/domain/types';

import { extrasFor } from '../extras';
import { manualWeatherDay, summarizeSchoolHours } from '../weather';
import { day } from './fixtures';

describe('extrasFor', () => {
  it('rain → rain jacket + umbrella', () => {
    expect(extrasFor(day(12, { rainChanceMaxPct: 50 }), 12)).toEqual(['rainJacket', 'umbrella']);
  });
  it('rain + wind → no umbrella, hood instead, lip balm when also cold', () => {
    const e = extrasFor(day(8, { rainMm: 2, windMaxKmh: 30 }), 8);
    expect(e).toEqual(expect.arrayContaining(['rainJacket', 'hood', 'lipBalm']));
    expect(e).not.toContain('umbrella');
  });
  it('cold → hat + gloves; below zero adds scarf; below 3 adds lip balm', () => {
    expect(extrasFor(day(4), 4)).toEqual(['hat', 'gloves']);
    expect(extrasFor(day(-1), -1)).toEqual(['hat', 'gloves', 'scarf', 'lipBalm']);
  });
  it('UV → sunscreen, and cap from 6', () => {
    expect(extrasFor(day(20, { uvMax: 3 }), 20)).toEqual(['sunscreen']);
    expect(extrasFor(day(25, { uvMax: 6 }), 25)).toEqual(['sunscreen', 'cap']);
  });
  it('snow → warm boots; big swing → layers', () => {
    expect(extrasFor(day(-2, { snow: true }), -2)).toContain('warmBoots');
    expect(extrasFor(day(5, { feelsMaxC: 14 }), 5)).toContain('layers');
  });
  it('mild calm dry day → nothing to remember', () => {
    expect(extrasFor(day(18), 18)).toEqual([]);
  });
});

describe('summarizeSchoolHours', () => {
  const h = (time: string, p: Partial<WeatherHour> = {}): WeatherHour => ({
    time,
    tempC: 5,
    feelsC: 3,
    rainChancePct: 10,
    rainMm: 0,
    windKmh: 10,
    uvIndex: 0,
    snowCm: 0,
    ...p,
  });

  it('uses only 08:00–14:59 and aggregates per day', () => {
    const days = summarizeSchoolHours([
      h('2026-11-18T07:00', { feelsC: -10 }), // before school, ignored
      h('2026-11-18T08:00', { feelsC: 1, tempC: 3, rainMm: 0.4 }),
      h('2026-11-18T12:00', { feelsC: 6, tempC: 8, rainMm: 0.7, windKmh: 25, rainChancePct: 70, uvIndex: 1 }),
      h('2026-11-18T15:00', { feelsC: 20 }), // after school, ignored
      h('2026-11-17T09:00', { snowCm: 0.2 }),
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-11-17', '2026-11-18']);
    expect(days[0].snow).toBe(true);
    expect(days[1]).toEqual({
      date: '2026-11-18',
      tempMinC: 3,
      tempMaxC: 8,
      feelsMinC: 1,
      feelsMaxC: 6,
      rainChanceMaxPct: 70,
      rainMm: 1.1,
      windMaxKmh: 25,
      uvMax: 1,
      snow: false,
    });
  });

  it('skips days without school-hour data', () => {
    expect(summarizeSchoolHours([h('2026-11-18T20:00')])).toEqual([]);
  });
});

describe('manualWeatherDay', () => {
  it.each(['sunny', 'rainy', 'cold'] as const)('%s is marked manual', (k) => {
    expect(manualWeatherDay('2026-11-17', k)).toMatchObject({ manual: true, date: '2026-11-17' });
  });
  it('rainy counts as rain, cold as cold', () => {
    expect(manualWeatherDay('2026-11-17', 'rainy').rainChanceMaxPct).toBeGreaterThanOrEqual(50);
    expect(manualWeatherDay('2026-11-17', 'cold').feelsMinC).toBeLessThan(3);
  });
});
