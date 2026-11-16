import { describe, expect, it } from 'vitest';
import { buildCalendar } from './ics';
import {
  findNext,
  getEventRange,
  getHillSizes,
  getPhase,
  getSlot,
  groupByDay,
  listCompetitions,
} from './schedule';
import type { Competition, Season, SeasonEvent } from './schema';
import { getCurrentSeason, getSeasons } from './seasons';

function competition(overrides: Partial<Competition>): Competition {
  return {
    fisRaceId: 1,
    kind: 'individual',
    hillSize: 140,
    date: '2026-11-21',
    time: '16:50',
    status: 'scheduled',
    ...overrides,
  };
}

function event(competitions: Competition[]): SeasonEvent {
  return {
    slug: 'lillehammer',
    type: 'world-cup',
    tags: [],
    fisEventId: 1,
    city: 'Lillehammer',
    countryCode: 'NO',
    hillName: 'Lysgårdsbakken',
    timeZone: 'Europe/Oslo',
    broadcasts: [],
    competitions,
  };
}

function season(events: SeasonEvent[]): Season {
  return { id: '2026-2027', broadcasters: {}, events };
}

describe('getPhase', () => {
  const timed = getSlot(event([]), competition({}));

  it('is upcoming before the start', () => {
    expect(getPhase(new Date('2026-11-21T15:49:00Z'), timed)).toBe('upcoming');
  });

  it('is live from the start until the assumed end', () => {
    expect(getPhase(new Date('2026-11-21T15:50:00Z'), timed)).toBe('live');
    expect(getPhase(new Date('2026-11-21T18:19:00Z'), timed)).toBe('live');
  });

  it('is finished after the assumed end', () => {
    expect(getPhase(new Date('2026-11-21T18:20:00Z'), timed)).toBe('finished');
  });

  it('marks a competition without a time as "today" for the whole venue day', () => {
    const untimed = getSlot(event([]), competition({ time: null }));

    expect(getPhase(new Date('2026-11-20T22:59:00Z'), untimed)).toBe(
      'upcoming',
    );
    expect(getPhase(new Date('2026-11-20T23:00:00Z'), untimed)).toBe('today');
    expect(getPhase(new Date('2026-11-21T23:00:00Z'), untimed)).toBe(
      'finished',
    );
  });
});

describe('findNext', () => {
  const first = competition({ fisRaceId: 1, date: '2026-11-21' });
  const second = competition({ fisRaceId: 2, date: '2026-11-22' });
  const list = listCompetitions(season([event([second, first])]));

  it('returns the earliest competition that has not finished', () => {
    const next = findNext(list, new Date('2026-11-21T17:00:00Z'));

    expect(next?.competition.fisRaceId).toBe(1);
  });

  it('moves on once a competition is finished', () => {
    const next = findNext(list, new Date('2026-11-21T19:00:00Z'));

    expect(next?.competition.fisRaceId).toBe(2);
  });

  it('skips cancelled competitions', () => {
    const cancelled = competition({ fisRaceId: 1, status: 'cancelled' });
    const items = listCompetitions(season([event([cancelled, second])]));

    expect(
      findNext(items, new Date('2026-11-01T00:00:00Z'))?.competition.fisRaceId,
    ).toBe(2);
  });

  it('returns nothing after the season', () => {
    expect(findNext(list, new Date('2027-06-01T00:00:00Z'))).toBeUndefined();
  });
});

describe('event helpers', () => {
  const sample = event([
    competition({
      fisRaceId: 3,
      date: '2026-11-22',
      time: '16:00',
      hillSize: 140,
    }),
    competition({
      fisRaceId: 1,
      date: '2026-11-20',
      time: '16:00',
      kind: 'mixed-team',
    }),
    competition({
      fisRaceId: 2,
      date: '2026-11-20',
      time: '14:00',
      kind: 'qualification',
      hillSize: 100,
    }),
  ]);

  it('derives the date range from competitions', () => {
    expect(getEventRange(sample)).toEqual({
      start: '2026-11-20',
      end: '2026-11-22',
    });
  });

  it('lists unique hill sizes in ascending order', () => {
    expect(getHillSizes(sample)).toEqual([100, 140]);
  });

  it('groups competitions by day in start order', () => {
    const days = groupByDay(sample);

    expect(days.map((day) => day.date)).toEqual(['2026-11-20', '2026-11-22']);
    expect(days[0]?.competitions.map((item) => item.fisRaceId)).toEqual([2, 1]);
  });
});

describe('buildCalendar', () => {
  const sample = season([
    event([
      competition({ fisRaceId: 7 }),
      competition({ fisRaceId: 8, time: null }),
    ]),
  ]);
  const calendar = buildCalendar(
    sample,
    'en',
    new Date('2026-11-01T00:00:00Z'),
  );

  it('writes timed competitions in UTC', () => {
    expect(calendar).toContain('DTSTART:20261121T155000Z');
    expect(calendar).toContain('DTEND:20261121T182000Z');
  });

  it('writes competitions without a time as all-day entries', () => {
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261121');
    expect(calendar).toContain('DTEND;VALUE=DATE:20261122');
  });

  it('uses CRLF line endings and stable identifiers', () => {
    expect(calendar.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(calendar).toContain('UID:fis-race-7@skoki-narciarskie');
  });
});

describe('season data', () => {
  it('passes schema validation for every season file', () => {
    expect(getSeasons().length).toBeGreaterThan(0);
  });

  it('has unique slugs and race identifiers', () => {
    const current = getCurrentSeason();
    const slugs = current.events.map((item) => item.slug);
    const races = current.events.flatMap((item) =>
      item.competitions.map((entry) => entry.fisRaceId),
    );

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(races).size).toBe(races.length);
  });
});
