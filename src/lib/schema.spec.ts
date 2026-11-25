import { describe, expect, it } from 'vitest';
import { nationsCupSchema } from './schema';

describe('nationsCupSchema', () => {
  const valid = {
    season: '2025-2026',
    updatedAt: '2026-11-25',
    sourceUrl:
      'https://www.fis-ski.com/DB/ski-jumping/cup-standings.html?cupcode=NC-WC',
    rows: [{ rank: 1, nation: 'AUT', points: 6157 }],
  };

  it('accepts a season table', () => {
    expect(nationsCupSchema.parse(valid)).toEqual(valid);
  });

  it('accepts a season FIS has no table for', () => {
    expect(
      nationsCupSchema.safeParse({ ...valid, updatedAt: null, rows: [] })
        .success,
    ).toBe(true);
  });

  it('rejects a nation that is not a FIS code', () => {
    expect(
      nationsCupSchema.safeParse({
        ...valid,
        rows: [{ rank: 1, nation: 'Austria', points: 6157 }],
      }).success,
    ).toBe(false);
  });
});
