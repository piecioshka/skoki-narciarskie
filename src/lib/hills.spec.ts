import { describe, expect, it } from 'vitest';
import {
  competitionHillLabel,
  describeEventHill,
  getHillSizes,
  hillOfCompetition,
  hillOfEvent,
  venueKey,
} from './hills';
import type { Competition, SeasonEvent } from './schema';

const typeLabels = {
  normal: 'normal hill',
  large: 'large hill',
  flying: 'flying hill',
};

function competition(overrides: Partial<Competition>): Competition {
  return {
    fisRaceId: 1,
    kind: 'individual',
    hillSize: 140,
    date: '2026-11-21',
    time: '16:50',
    status: 'scheduled',
    results: [],
    polishAthletes: [],
    ...overrides,
  };
}

function event(
  slug: string,
  competitions: Competition[],
  overrides: Partial<SeasonEvent> = {},
): SeasonEvent {
  return {
    slug,
    type: 'world-cup',
    tags: [],
    fisEventId: 1,
    city: slug,
    countryCode: 'NO',
    hillName: null,
    timeZone: 'Europe/Oslo',
    channels: [],
    officials: [],
    competitions,
    ...overrides,
  };
}

const falun = event('falun', [
  competition({ hillSize: 95 }),
  competition({ hillSize: 132 }),
]);
const planica = event(
  'planica',
  [competition({ hillSize: 240 }), competition({ hillSize: 240 })],
  { tags: ['ski-flying'] },
);

describe('getHillSizes', () => {
  it('lists unique hill sizes in ascending order', () => {
    const sample = event('lillehammer', [
      competition({ hillSize: 140 }),
      competition({ hillSize: 100 }),
      competition({ hillSize: 140 }),
      competition({ hillSize: null }),
    ]);

    expect(getHillSizes(sample)).toEqual([100, 140]);
  });
});

describe('hillOfCompetition', () => {
  it('picks the hill of the competition at a two-hill venue', () => {
    expect(hillOfCompetition(falun, { hillSize: 95 })?.slug).toBe(
      'falun-normal',
    );
    expect(hillOfCompetition(falun, { hillSize: 132 })?.slug).toBe(
      'falun-large',
    );
  });

  it('picks the flying hill for a ski flying event', () => {
    expect(hillOfCompetition(planica, { hillSize: 240 })?.slug).toBe('planica');
  });

  it('finds the hill of a second visit to the same town', () => {
    const second = event('zakopane-2', [competition({ hillSize: 140 })]);

    expect(hillOfCompetition(second, { hillSize: 140 })?.slug).toBe('zakopane');
  });

  it('returns undefined for an unknown or missing size', () => {
    expect(hillOfCompetition(falun, { hillSize: 100 })).toBeUndefined();
    expect(hillOfCompetition(falun, { hillSize: null })).toBeUndefined();
  });
});

describe('hillOfEvent', () => {
  it('takes the largest hill used by the competitions', () => {
    expect(hillOfEvent(falun)?.slug).toBe('falun-large');
  });

  it('takes only the hills used by the competitions', () => {
    const normalOnly = event('falun', [competition({ hillSize: 95 })]);

    expect(hillOfEvent(normalOnly)?.slug).toBe('falun-normal');
  });

  it('keeps ski flying apart from the other hill of the town', () => {
    expect(hillOfEvent(planica)?.slug).toBe('planica');
    expect(
      hillOfEvent(event('planica', [competition({ hillSize: 138 })]))?.slug,
    ).toBe('planica-large');
  });

  it('falls back to the largest venue hill when no size is known', () => {
    const imported = event('falun', [
      competition({ hillSize: null, hillType: 'normal' }),
      competition({ hillSize: null, hillType: 'large' }),
    ]);

    expect(hillOfEvent(imported)?.slug).toBe('falun-large');
  });

  it('finds the hill of a second visit to the same town', () => {
    expect(
      hillOfEvent(event('zakopane-2', [competition({ hillSize: 140 })]))?.slug,
    ).toBe('zakopane');
  });

  it('returns undefined for a venue without hill data', () => {
    expect(hillOfEvent(event('nowhere', [competition({})]))).toBeUndefined();
  });
});

describe('competitionHillLabel', () => {
  it('shows the hill size with its K-point', () => {
    expect(competitionHillLabel(falun, { hillSize: 132 }, typeLabels)).toBe(
      'HS132 (K120)',
    );
  });

  it('shows the plain size when the hill data has no such hill', () => {
    expect(competitionHillLabel(falun, { hillSize: 100 }, typeLabels)).toBe(
      'HS100',
    );
  });

  it('falls back to the hill type and then to nothing', () => {
    expect(
      competitionHillLabel(
        falun,
        { hillSize: null, hillType: 'large' },
        typeLabels,
      ),
    ).toBe('large hill');
    expect(competitionHillLabel(falun, { hillSize: null }, typeLabels)).toBe(
      '',
    );
  });
});

describe('describeEventHill', () => {
  it('lists the hill name and every size', () => {
    expect(
      describeEventHill({ ...falun, hillName: 'Lugnet' }, typeLabels),
    ).toBe('Lugnet · HS95 (K90), HS132 (K120)');
  });

  it('uses the hill data and hill types for imported seasons', () => {
    const imported = event('falun', [
      competition({ hillSize: null, hillType: 'normal' }),
      competition({ hillSize: null, hillType: 'large' }),
    ]);

    expect(describeEventHill(imported, typeLabels)).toBe(
      'Lugnet · normal hill, large hill',
    );
  });
});

describe('venueKey', () => {
  it('matches a second visit and separates ski flying', () => {
    expect(venueKey(event('zakopane-2', []))).toBe(
      venueKey(event('zakopane', [])),
    );
    expect(venueKey(planica)).not.toBe(
      venueKey(event('planica', [competition({ hillSize: 138 })])),
    );
  });
});
