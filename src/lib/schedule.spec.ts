import { describe, expect, it } from 'vitest';
import { buildCalendar } from './ics';
import { getPastWinners, getEventRange, groupByDay } from './schedule';
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
    results: [],
    polishAthletes: [],
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
    channels: [],
    officials: [],
    competitions,
  };
}

function season(events: SeasonEvent[]): Season {
  return { id: '2026-2027', channels: {}, events };
}

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

  it('gives training a stable identifier and no FIS link', () => {
    const training = buildCalendar(
      season([
        event([
          competition({ fisRaceId: null, kind: 'training', time: '12:00' }),
        ]),
      ]),
      'en',
      new Date('2026-11-01T00:00:00Z'),
    );

    expect(training).toContain(
      'UID:training-lillehammer-2026-11-21-12:00@skoki-narciarskie',
    );
    expect(training).toContain('SUMMARY:Lillehammer: Official training');
    expect(training).not.toContain('URL:');
  });
});

describe('getPastWinners', () => {
  const won = (
    fisRaceId: number,
    date: string,
    kind: Competition['kind'],
    winner: { name?: string; nation: string },
  ): Competition =>
    competition({
      fisRaceId,
      date,
      kind,
      results: [{ rank: 1, ...winner }],
    });
  const older = season([
    event([
      won(1, '2024-11-23', 'individual', {
        name: 'Pius Paschke',
        nation: 'GER',
      }),
      won(2, '2024-11-22', 'mixed-team', { nation: 'GER' }),
    ]),
  ]);
  const newer = {
    ...season([
      event([
        won(3, '2025-11-22', 'individual', {
          name: 'Daniel Tschofenig',
          nation: 'AUT',
        }),
      ]),
    ]),
    id: '2025-2026',
  };
  const upcoming = event([competition({ fisRaceId: 9, date: '2026-11-21' })]);

  it('lists earlier winners at the same venue, newest first', () => {
    const past = getPastWinners([older, newer], upcoming);

    expect(past.individual.map((item) => item.name)).toEqual([
      'Daniel Tschofenig',
      'Pius Paschke',
    ]);
    expect(past.team.map((item) => item.nation)).toEqual(['GER']);
  });

  it('ignores competitions held on or after the event itself', () => {
    const past = getPastWinners(
      [older, newer],
      event([competition({ date: '2024-11-23' })]),
    );

    expect(past.individual).toEqual([]);
    expect(past.team.map((item) => item.date)).toEqual(['2024-11-22']);
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
