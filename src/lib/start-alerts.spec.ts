import { describe, expect, it } from 'vitest';
import type { Competition, Season } from './schema';
import {
  buildStartAlerts,
  findDueAlerts,
  isAnyLive,
  type StartAlert,
} from './start-alerts';

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

function season(competitions: Competition[]): Season {
  return {
    id: '2026-2027',
    channels: {},
    events: [
      {
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
      },
    ],
  };
}

function alert(id: string, start: string): StartAlert {
  return { id, start, title: '', body: '', url: '' };
}

describe('buildStartAlerts', () => {
  it('describes a timed competition and links to its event page', () => {
    const [first] = buildStartAlerts(season([competition({})]), 'pl');

    expect(first).toEqual({
      id: '2026-2027/lillehammer/2026-11-21/individual/16:50',
      start: '2026-11-21T15:50:00.000Z',
      title: 'Zawody wystartowały: Lillehammer',
      body: 'Konkurs indywidualny HS140 (K123). Kliknij, aby otworzyć stronę zawodów.',
      url: '/pl/2026-2027/lillehammer/',
    });
  });

  it('skips trainings, cancelled competitions and unknown times', () => {
    const alerts = buildStartAlerts(
      season([
        competition({ kind: 'training', fisRaceId: null, time: '12:00' }),
        competition({ status: 'cancelled', date: '2026-11-22' }),
        competition({ time: null, date: '2026-11-23' }),
        competition({ kind: 'qualification', date: '2026-11-24' }),
      ]),
      'en',
    );

    expect(alerts.map((item) => item.id)).toEqual([
      '2026-2027/lillehammer/2026-11-24/qualification/16:50',
    ]);
  });
});

describe('findDueAlerts', () => {
  const alerts = [
    alert('early', '2026-11-21T15:30:00.000Z'),
    alert('now', '2026-11-21T15:50:00.000Z'),
    alert('later', '2026-11-21T16:00:00.000Z'),
  ];
  const now = new Date('2026-11-21T15:51:00.000Z');

  it('returns starts from the last few minutes only', () => {
    expect(findDueAlerts(alerts, now, new Set())).toEqual([alerts[1]]);
  });

  it('includes the exact start second', () => {
    const at = new Date('2026-11-21T15:50:00.000Z');

    expect(findDueAlerts(alerts, at, new Set()).map((a) => a.id)).toEqual([
      'now',
    ]);
  });

  it('skips alerts already shown', () => {
    expect(findDueAlerts(alerts, now, new Set(['now']))).toEqual([]);
  });
});

describe('isAnyLive', () => {
  const alerts = [alert('a', '2026-11-21T15:50:00.000Z')];

  it('is true from the start until the expected end', () => {
    expect(isAnyLive(alerts, new Date('2026-11-21T15:50:00.000Z'))).toBe(true);
    expect(isAnyLive(alerts, new Date('2026-11-21T18:19:59.000Z'))).toBe(true);
  });

  it('is false before the start and after the end', () => {
    expect(isAnyLive(alerts, new Date('2026-11-21T15:49:59.000Z'))).toBe(false);
    expect(isAnyLive(alerts, new Date('2026-11-21T18:20:00.000Z'))).toBe(false);
  });
});
