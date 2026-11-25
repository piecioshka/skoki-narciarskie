import { describe, expect, it } from 'vitest';
import type { Competition, Season, SeasonEvent } from './schema';
import {
  eventTimingAttributes,
  findFirstUnfinished,
  findNext,
  getEventPhase,
  getPhase,
  getSlot,
  getTimingPhase,
  isLive,
  isScheduled,
  listCompetitions,
  listScheduled,
  readTiming,
  timedSlot,
  timingAttributes,
  type Slot,
  type TimingAttributes,
} from './timing';

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

describe('getEventPhase', () => {
  const slot = (start: string, end: string): Slot => ({
    start: new Date(start),
    end: new Date(end),
    timed: true,
  });
  const slots = [
    slot('2026-11-20T11:00:00', '2026-11-20T13:30:00'),
    slot('2026-11-21T16:50:00', '2026-11-21T19:20:00'),
    slot('2026-11-22T15:00:00', '2026-11-22T17:30:00'),
  ];

  it('is live only while a competition is on', () => {
    expect(getEventPhase(new Date('2026-11-20T12:00:00'), slots)).toBe('live');
  });

  it('is today when a competition is still ahead on the current day', () => {
    expect(getEventPhase(new Date('2026-11-21T09:00:00'), slots)).toBe('today');
  });

  it('is upcoming between competition days', () => {
    expect(getEventPhase(new Date('2026-11-20T20:00:00'), slots)).toBe(
      'upcoming',
    );
  });

  it('is finished after the last competition', () => {
    expect(getEventPhase(new Date('2026-11-23T09:00:00'), slots)).toBe(
      'finished',
    );
  });
});

describe('getEventPhase with untimed competitions', () => {
  it('is today, not live, while an untimed competition is on its day', () => {
    const untimed = getSlot(event([]), competition({ time: null }));

    expect(getEventPhase(new Date('2026-11-21T12:00:00Z'), [untimed])).toBe(
      'today',
    );
  });
});

describe('isLive', () => {
  it('is true from the start until the expected end of a timed slot', () => {
    const slot = timedSlot(new Date('2026-11-21T15:50:00Z'));

    expect(isLive(new Date('2026-11-21T15:49:59Z'), slot)).toBe(false);
    expect(isLive(new Date('2026-11-21T15:50:00Z'), slot)).toBe(true);
    expect(isLive(new Date('2026-11-21T18:19:59Z'), slot)).toBe(true);
    expect(isLive(new Date('2026-11-21T18:20:00Z'), slot)).toBe(false);
  });

  it('is never true for a slot without a time', () => {
    const untimed = getSlot(event([]), competition({ time: null }));

    expect(isLive(new Date('2026-11-21T12:00:00Z'), untimed)).toBe(false);
  });
});

describe('scheduled competitions', () => {
  const individual = competition({ fisRaceId: 1, time: '16:50' });
  const training = competition({
    fisRaceId: null,
    kind: 'training',
    time: '12:00',
  });
  const cancelled = competition({ fisRaceId: 3, status: 'cancelled' });
  const moved = competition({ fisRaceId: 4, status: 'moved', time: '18:00' });
  const sample = season([event([individual, training, cancelled, moved])]);

  it('never includes cancelled competitions', () => {
    expect(isScheduled(cancelled, { withTraining: true })).toBe(false);
    expect(isScheduled(cancelled, { withTraining: false })).toBe(false);
  });

  it('includes trainings only when asked for', () => {
    expect(isScheduled(training, { withTraining: true })).toBe(true);
    expect(isScheduled(training, { withTraining: false })).toBe(false);
  });

  it('keeps moved competitions', () => {
    expect(isScheduled(moved, { withTraining: false })).toBe(true);
  });

  it('lists them in chronological order', () => {
    const kinds = (withTraining: boolean): (number | null)[] =>
      listScheduled(sample, { withTraining }).map(
        (item) => item.competition.fisRaceId,
      );

    expect(kinds(true)).toEqual([null, 1, 4]);
    expect(kinds(false)).toEqual([1, 4]);
  });
});

describe('findFirstUnfinished', () => {
  it('skips items without a slot', () => {
    const slot = timedSlot(new Date('2026-11-21T15:50:00Z'));
    const items = [{ slot: undefined }, { slot }];

    expect(
      findFirstUnfinished(
        items,
        new Date('2026-11-21T12:00:00Z'),
        (item) => item.slot,
      ),
    ).toBe(items[1]);
  });
});

/** The `dataset` the browser builds from data attributes. */
function toDataset(
  attributes: Partial<TimingAttributes>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(attributes).map(([name, value]) => [
      name
        .replace(/^data-/, '')
        .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      value,
    ]),
  );
}

describe('timing attributes', () => {
  it('round-trips a timed slot', () => {
    const item = competition({});
    const slot = getSlot(event([item]), item);

    expect(readTiming(toDataset(timingAttributes(item, slot)))).toEqual({
      slot,
      competitionSlots: undefined,
    });
  });

  it('round-trips a slot without a time', () => {
    const item = competition({ time: null });
    const slot = getSlot(event([item]), item);
    const timing = readTiming(toDataset(timingAttributes(item, slot)));

    expect(timing?.slot).toEqual(slot);
    expect(timing?.slot.timed).toBe(false);
  });

  it('gives a cancelled competition no timing', () => {
    const item = competition({ status: 'cancelled' });
    const slot = getSlot(event([item]), item);

    expect(timingAttributes(item, slot)).toEqual({});
    expect(readTiming(toDataset(timingAttributes(item, slot)))).toBeUndefined();
  });

  it('reads nothing from an element without timing', () => {
    expect(readTiming({})).toBeUndefined();
    expect(readTiming({ slotStart: 'nonsense', slotEnd: 'x' })).toBeUndefined();
  });
});

describe('event card timing', () => {
  const qualification = competition({
    fisRaceId: 1,
    kind: 'qualification',
    date: '2026-11-21',
    time: null,
  });
  const cancelled = competition({
    fisRaceId: 2,
    date: '2026-11-21',
    time: '16:50',
    status: 'cancelled',
  });
  const individual = competition({
    fisRaceId: 3,
    date: '2026-11-22',
    time: '15:00',
  });
  const sample = event([individual, cancelled, qualification]);
  const timing = readTiming(toDataset(eventTimingAttributes(sample)));

  it('spans the whole event', () => {
    expect(timing?.slot.start).toEqual(getSlot(sample, qualification).start);
    expect(timing?.slot.end).toEqual(getSlot(sample, individual).end);
  });

  it('lists each scheduled competition with its own slot', () => {
    expect(timing?.competitionSlots).toEqual([
      getSlot(sample, individual),
      getSlot(sample, qualification),
    ]);
  });

  it('is today, not live, on the day of an untimed competition', () => {
    // The cancelled competition at 16:50 must not make the card live either.
    expect(
      timing && getTimingPhase(new Date('2026-11-21T16:00:00Z'), timing),
    ).toBe('today');
  });

  it('is live while a timed competition is on', () => {
    expect(
      timing && getTimingPhase(new Date('2026-11-22T14:30:00Z'), timing),
    ).toBe('live');
  });

  it('ignores a malformed competition list', () => {
    const broken = readTiming({
      ...toDataset(eventTimingAttributes(sample)),
      competitionSlots: '{',
    });

    expect(broken?.competitionSlots).toEqual([]);
  });
});
