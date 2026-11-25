import type { Competition, Season, SeasonEvent } from './schema';
import { addDays, isSameLocalDay, zonedTimeToUtc } from './time';

// A competition with two rounds takes about two hours; the margin keeps the
// "live" state on screen until the broadcast really ends.
export const COMPETITION_DURATION_MINUTES = 150;

export type Phase = 'upcoming' | 'today' | 'live' | 'finished';

export interface Slot {
  /** Start instant, or the start of the venue's day when the time is unknown. */
  start: Date;
  end: Date;
  timed: boolean;
}

export interface ScheduledCompetition {
  event: SeasonEvent;
  competition: Competition;
  slot: Slot;
}

export function getSlot(event: SeasonEvent, competition: Competition): Slot {
  if (competition.time === null) {
    return {
      start: zonedTimeToUtc(competition.date, '00:00', event.timeZone),
      end: zonedTimeToUtc(
        addDays(competition.date, 1),
        '00:00',
        event.timeZone,
      ),
      timed: false,
    };
  }

  const start = zonedTimeToUtc(
    competition.date,
    competition.time,
    event.timeZone,
  );

  return {
    start,
    end: new Date(start.getTime() + COMPETITION_DURATION_MINUTES * 60_000),
    timed: true,
  };
}

export function getPhase(now: Date, slot: Slot): Phase {
  if (now.getTime() >= slot.end.getTime()) {
    return 'finished';
  }
  if (now.getTime() < slot.start.getTime()) {
    return 'upcoming';
  }
  return slot.timed ? 'live' : 'today';
}

/**
 * Phase of a whole event from its competitions: live only while one of them
 * is on, "today" while one is still ahead on the viewer's current day.
 */
export function getEventPhase(now: Date, slots: Slot[]): Phase {
  const phases = slots.map((slot) => getPhase(now, slot));

  if (phases.includes('live')) {
    return 'live';
  }
  if (phases.every((phase) => phase === 'finished')) {
    return 'finished';
  }
  const aheadToday = slots.some(
    (slot, index) =>
      phases[index] !== 'finished' && isSameLocalDay(now, slot.start),
  );

  return aheadToday ? 'today' : 'upcoming';
}

/** Every competition of the season, in chronological order. */
export function listCompetitions(season: Season): ScheduledCompetition[] {
  return season.events
    .flatMap((event) =>
      event.competitions.map((competition) => ({
        event,
        competition,
        slot: getSlot(event, competition),
      })),
    )
    .sort((a, b) => a.slot.start.getTime() - b.slot.start.getTime());
}

/** The first competition that has not finished yet. */
export function findNext(
  competitions: ScheduledCompetition[],
  now: Date,
): ScheduledCompetition | undefined {
  return competitions.find(
    (item) =>
      item.competition.status !== 'cancelled' &&
      getPhase(now, item.slot) !== 'finished',
  );
}

export interface DateRange {
  start: string;
  end: string;
}

export function getEventRange(event: SeasonEvent): DateRange {
  const dates = event.competitions.map((item) => item.date).sort();

  return { start: dates[0] ?? '', end: dates[dates.length - 1] ?? '' };
}

export function getEventEnd(event: SeasonEvent): Date {
  const ends = event.competitions.map((item) =>
    getSlot(event, item).end.getTime(),
  );

  return new Date(Math.max(...ends));
}

export function getHillSizes(event: SeasonEvent): number[] {
  const sizes = event.competitions.flatMap((item) =>
    item.hillSize === null ? [] : [item.hillSize],
  );

  return [...new Set(sizes)].sort((a, b) => a - b);
}

/** Short hill description: name and sizes, whatever of them is known. */
export function describeHill(
  event: SeasonEvent,
  sizeLabel: (size: number) => string = (size) => `HS${size}`,
): string {
  const sizes = getHillSizes(event).map(sizeLabel);

  return [event.hillName, sizes.join(', ')].filter(Boolean).join(' · ');
}

export interface CompetitionDay {
  date: string;
  competitions: Competition[];
}

export function groupByDay(event: SeasonEvent): CompetitionDay[] {
  const days = new Map<string, Competition[]>();
  const sorted = event.competitions.toSorted(
    (a, b) =>
      getSlot(event, a).start.getTime() - getSlot(event, b).start.getTime(),
  );

  for (const competition of sorted) {
    days.set(competition.date, [
      ...(days.get(competition.date) ?? []),
      competition,
    ]);
  }
  return [...days].map(([date, competitions]) => ({ date, competitions }));
}

export function sortEvents(season: Season): SeasonEvent[] {
  return season.events.toSorted((a, b) =>
    getEventRange(a).start.localeCompare(getEventRange(b).start),
  );
}

export interface PastWinner {
  seasonId: string;
  eventSlug: string;
  date: string;
  kind: Competition['kind'];
  /** Athlete name; undefined when a national team won. */
  name: string | undefined;
  nation: string;
}

const PAST_WINNERS_LIMIT = 5;

function venueOf(event: SeasonEvent): string {
  // A second visit to the same town in one season gets a numbered slug, and
  // ski flying is held on a different hill than the other events of a town.
  const flying = event.tags.includes('ski-flying') ? 'flying' : 'hill';

  return `${event.slug.replace(/-\d+$/, '')}:${flying}`;
}

/**
 * The most recent winners at the venue of an event, from competitions held
 * before it: individual competitions and team competitions separately.
 */
export function getPastWinners(
  seasons: Season[],
  event: SeasonEvent,
): { individual: PastWinner[]; team: PastWinner[] } {
  const before = getEventRange(event).start;
  const winners = seasons
    .flatMap((season) =>
      season.events
        .filter((item) => venueOf(item) === venueOf(event))
        .flatMap((item) =>
          item.competitions.flatMap((competition) => {
            const first = competition.results.find((place) => place.rank === 1);

            return first && competition.date < before
              ? [
                  {
                    seasonId: season.id,
                    eventSlug: item.slug,
                    date: competition.date,
                    kind: competition.kind,
                    name: first.name,
                    nation: first.nation,
                  },
                ]
              : [];
          }),
        ),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    individual: winners
      .filter((item) => item.kind === 'individual')
      .slice(0, PAST_WINNERS_LIMIT),
    team: winners
      .filter((item) => item.kind !== 'individual')
      .slice(0, PAST_WINNERS_LIMIT),
  };
}
