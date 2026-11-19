import { sanitizeCityQuery } from '../CitySearch';

jest.mock('@/data/kv', () => ({ deviceStorage: {} }));

describe('sanitizeCityQuery: only a town name leaves the device', () => {
  it.each([
    ['København', 'København'],
    ['  Køge  ', 'Køge'],
    ['Nørrebrogade 12, 2200 København', 'Nørrebrogade København'],
    ['me@mail.dk', 'me mail.dk'],
    ['Saint-Denis', 'Saint-Denis'],
  ])('%p → %p', (input, out) => expect(sanitizeCityQuery(input)).toBe(out));
  it('caps the length at 40', () => {
    expect(sanitizeCityQuery('a'.repeat(100))).toHaveLength(40);
  });
});
