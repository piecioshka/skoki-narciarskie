import type { Competition, Season, SeasonEvent } from './schema';
import { addDays, zonedTimeToUtc } from './time';

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
  return [...new Set(event.competitions.map((item) => item.hillSize))].sort(
    (a, b) => a - b,
  );
}

export interface CompetitionDay {
  date: string;
  competitions: Competition[];
}

export function groupByDay(event: SeasonEvent): CompetitionDay[] {
  const days = new Map<string, Competition[]>();
  const sorted = [...event.competitions].sort(
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
  return [...season.events].sort((a, b) =>
    getEventRange(a).start.localeCompare(getEventRange(b).start),
  );
}
