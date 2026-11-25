import { describe, expect, it } from 'vitest';
import { FIS_LIVE_URL, getChannels, getLiveUrl, getResultsUrl } from './links';
import {
  competitionSchema,
  seasonSchema,
  type Competition,
  type Season,
} from './schema';
import { getCurrentSeason } from './seasons';

const season: Season = getCurrentSeason();
const lillehammer = season.events.find((item) => item.slug === 'lillehammer');

describe('getChannels', () => {
  function channelsOf(kind: string): string[][] {
    if (!lillehammer) {
      throw new Error('Lillehammer is missing from the current season');
    }
    return lillehammer.competitions
      .filter((item) => item.kind === kind)
      .map((item) =>
        getChannels(season, lillehammer, item).map((channel) => channel.name),
      );
  }

  it('uses the channels of the competition when it has its own', () => {
    expect(channelsOf('mixed-team')).toEqual([['Eurosport 1', 'TTV']]);
    expect(channelsOf('qualification')[0]).toEqual(['Eurosport 1']);
  });

  it('falls back to the channels of the event', () => {
    expect(channelsOf('individual')[0]).toEqual(['Eurosport 1', 'TVN']);
  });

  it('is empty when the competition is not on TV', () => {
    expect(channelsOf('training')).toEqual([[]]);
  });

  it('lists each channel once', () => {
    if (!lillehammer) {
      throw new Error('Lillehammer is missing from the current season');
    }
    const [competition] = lillehammer.competitions;

    if (!competition) {
      throw new Error('Lillehammer has no competitions');
    }
    expect(
      getChannels(season, lillehammer, {
        ...competition,
        channels: ['tvn', 'eurosport', 'tvn'],
      }).map((channel) => channel.name),
    ).toEqual(['TVN', 'Eurosport 1']);
  });
});

describe('seasonSchema', () => {
  it('rejects a competition pointing at an unknown channel', () => {
    const [event] = season.events;

    if (!event) {
      throw new Error('The current season has no events');
    }
    expect(
      seasonSchema.safeParse({
        ...season,
        events: [{ ...event, channels: ['missing'] }],
      }).success,
    ).toBe(false);
    expect(seasonSchema.safeParse(season).success).toBe(true);
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
    polishAthletes: [],
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

describe('getLiveUrl', () => {
  it('links the live scoring page of the competition by its codex', () => {
    expect(
      getLiveUrl(competitionSchema.parse({ ...base(), fisCodex: '0002' })),
    ).toBe('https://live.fis-ski.com/jp-0002/results-pda.htm');
  });

  it('falls back to the FIS live list without a codex', () => {
    expect(getLiveUrl(competitionSchema.parse(base()))).toBe(FIS_LIVE_URL);
  });
});

function base(): Omit<Competition, 'results' | 'polishAthletes'> {
  return {
    fisRaceId: 7796,
    kind: 'qualification',
    hillSize: 140,
    date: '2026-11-20',
    time: '14:00',
    status: 'scheduled',
  };
}
