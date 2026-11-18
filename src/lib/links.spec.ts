import { describe, expect, it } from 'vitest';
import { getBroadcasters, getResultsUrl } from './links';
import { competitionSchema, type Competition, type Season } from './schema';
import { getCurrentSeason } from './seasons';

const season: Season = getCurrentSeason();
const lillehammer = season.events.find((item) => item.slug === 'lillehammer');

function namesOf(kind: string): string[][] {
  if (!lillehammer) {
    throw new Error('Lillehammer is missing from the current season');
  }
  return lillehammer.competitions
    .filter((item) => item.kind === kind)
    .map((item) =>
      getBroadcasters(season, lillehammer, item).map(
        (broadcaster) => broadcaster.name,
      ),
    );
}

describe('getBroadcasters', () => {
  it('uses the broadcasters of the competition when it has its own', () => {
    expect(namesOf('mixed-team')).toEqual([
      ['HBO Max', 'Eurosport', 'TTV (Player)'],
    ]);
    expect(namesOf('qualification')[0]).toEqual(['HBO Max', 'Eurosport']);
    expect(namesOf('training')).toEqual([[]]);
  });

  it('falls back to the broadcasters of the event', () => {
    expect(namesOf('individual')[0]).toEqual([
      'HBO Max',
      'Eurosport',
      'TVN (Player)',
    ]);
  });
});

describe('getResultsUrl', () => {
  const base: Competition = {
    fisRaceId: 7795,
    kind: 'individual',
    hillSize: 140,
    date: '2026-11-21',
    time: '16:50',
    status: 'scheduled',
    results: [],
  };

  it('links a race to its FIS page', () => {
    expect(getResultsUrl(base)).toContain('raceid=7795');
  });

  it('has no link for training', () => {
    expect(
      getResultsUrl({ ...base, kind: 'training', fisRaceId: null }),
    ).toBeNull();
  });
});

describe('competitionSchema', () => {
  it('lets only training go without a FIS race id', () => {
    const input = {
      kind: 'qualification',
      hillSize: 140,
      date: '2026-11-20',
      time: '14:00',
      status: 'scheduled',
      fisRaceId: null,
    };

    expect(competitionSchema.safeParse(input).success).toBe(false);
    expect(
      competitionSchema.safeParse({ ...input, kind: 'training' }).success,
    ).toBe(true);
  });
});
