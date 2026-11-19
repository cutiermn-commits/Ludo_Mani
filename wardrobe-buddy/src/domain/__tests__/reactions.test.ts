import da from '@/i18n/da.json';
import en from '@/i18n/en.json';

import { LINES, pickReaction, REACTION_KEYS, type Cue } from '../reactions';

describe('avatar reactions (D-067)', () => {
  it('every line exists, non-empty, in Danish and English', () => {
    for (const k of REACTION_KEYS) {
      expect((en as Record<string, string>)[k]?.trim()).toBeTruthy();
      expect((da as Record<string, string>)[k]?.trim()).toBeTruthy();
    }
  });

  it('never talks about her body or looks (only clothes and fun)', () => {
    const banned = /\b(body|weight|thin|fat|slim|skinny|pretty|beautiful|figur|krop|vægt|tynd|tyk|slank|smuk|pæn)\b/i;
    for (const k of REACTION_KEYS) {
      expect((en as Record<string, string>)[k]).not.toMatch(banned);
      expect((da as Record<string, string>)[k]).not.toMatch(banned);
    }
  });

  it('picks a move, face and line for every cue, also at the edges of the random range', () => {
    for (const cue of Object.keys(LINES) as Cue[]) {
      for (const r of [0, 0.5, 0.999999]) {
        const x = pickReaction(cue, () => r);
        expect(REACTION_KEYS).toContain(x.say);
        expect(x.burst.length).toBeGreaterThan(0);
      }
    }
  });

  it('does not say the same line twice in a row', () => {
    const first = pickReaction('wear', () => 0);
    expect(pickReaction('wear', () => 0, first.say).say).not.toBe(first.say);
  });

  it('the wash cue looks a bit sorry, not cheerful', () => {
    expect(pickReaction('wash').face).toBe('oops');
  });
});
