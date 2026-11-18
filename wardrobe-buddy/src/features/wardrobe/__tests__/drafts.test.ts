import { draftsToDiscard } from '../drafts';

describe('draftsToDiscard (item editor save)', () => {
  it('keeps the saved photo AND its cut-out, deletes the rest', () => {
    expect(draftsToDiscard(['p1', 'c1', 'p2', 'c2'], { photoUri: 'p2', cutoutUri: 'c2' })).toEqual(['p1', 'c1']);
  });
  it('photo removed before saving: every draft goes', () => {
    expect(draftsToDiscard(['p1', 'c1'], {})).toEqual(['p1', 'c1']);
  });
  it('a re-cut cut-out that is kept survives; the old one goes', () => {
    expect(draftsToDiscard(['c-old', 'c-new'], { photoUri: 'p', cutoutUri: 'c-new' })).toEqual(['c-old']);
  });
});
