// When competitions happen and what that means "now": slots, phases, which
// competitions count, and how a slot crosses from the static build to the
// browser through data attributes.
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

export interface ScheduledOptions {
  /** Trainings are in the event program, but not in the countdown or alerts. */
  withTraining: boolean;
}

/** The slot of a competition with a known start time. */
export function timedSlot(start: Date): Slot {
  return {
    start,
    end: new Date(start.getTime() + COMPETITION_DURATION_MINUTES * 60_000),
    timed: true,
  };
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
  return timedSlot(
    zonedTimeToUtc(competition.date, competition.time, event.timeZone),
  );
}

/** True between the start and the expected end of a competition with a time. */
export function isLive(now: Date, slot: Slot): boolean {
  return (
    slot.timed &&
    now.getTime() >= slot.start.getTime() &&
    now.getTime() < slot.end.getTime()
  );
}

export function getPhase(now: Date, slot: Slot): Phase {
  if (now.getTime() >= slot.end.getTime()) {
    return 'finished';
  }
  if (now.getTime() < slot.start.getTime()) {
    return 'upcoming';
  }
  return isLive(now, slot) ? 'live' : 'today';
}

/**
 * Phase of a whole event from its competitions: live only while one of them
 * is on, "today" while one is still ahead on the viewer's current day or an
 * untimed one is on its day.
 */
export function getEventPhase(now: Date, slots: Slot[]): Phase {
  const phases = slots.map((slot) => getPhase(now, slot));

  if (phases.includes('live')) {
    return 'live';
  }
  if (phases.every((phase) => phase === 'finished')) {
    return 'finished';
  }
  // An untimed slot is "today" for the whole venue day, which can start on the
  // viewer's previous local day, so its own phase is checked before the day.
  const aheadToday = slots.some(
    (slot, index) =>
      phases[index] === 'today' ||
      (phases[index] === 'upcoming' && isSameLocalDay(now, slot.start)),
  );

  return aheadToday ? 'today' : 'upcoming';
}

/**
 * The one rule for which competitions take part in phases, "next" and start
 * alerts: cancelled ones never do, trainings only when asked for.
 */
export function isScheduled(
  competition: Competition,
  { withTraining }: ScheduledOptions,
): boolean {
  return (
    competition.status !== 'cancelled' &&
    (withTraining || competition.kind !== 'training')
  );
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

/** Scheduled competitions of the season, in chronological order. */
export function listScheduled(
  season: Season,
  options: ScheduledOptions,
): ScheduledCompetition[] {
  return listCompetitions(season).filter((item) =>
    isScheduled(item.competition, options),
  );
}

/** The first item whose slot has not finished; items without one are skipped. */
export function findFirstUnfinished<T>(
  items: readonly T[],
  now: Date,
  slotOf: (item: T) => Slot | undefined,
): T | undefined {
  return items.find((item) => {
    const slot = slotOf(item);

    return slot !== undefined && getPhase(now, slot) !== 'finished';
  });
}

/** The first scheduled competition that has not finished yet. */
export function findNext(
  competitions: ScheduledCompetition[],
  now: Date,
): ScheduledCompetition | undefined {
  return findFirstUnfinished(competitions, now, (item) =>
    isScheduled(item.competition, { withTraining: true })
      ? item.slot
      : undefined,
  );
}

// The DOM seam: the static build writes a slot into data attributes, the
// browser script reads it back and computes the phase for the current time.

export interface TimingAttributes {
  'data-slot-start': string;
  'data-slot-end': string;
  'data-slot-timed': string;
  /** Event cards only: each scheduled competition's own slot. */
  'data-competition-slots'?: string;
}

/** What the browser reads back from an element with timing attributes. */
export interface Timing {
  slot: Slot;
  /** Set on event cards, whose phase comes from their competitions. */
  competitionSlots: Slot[] | undefined;
}

/** Elements carrying timing attributes. */
export const TIMING_SELECTOR = '[data-slot-start]';

interface SerializedSlot {
  start: string;
  end: string;
  timed: boolean;
}

function serializeSlot(slot: Slot): SerializedSlot {
  return {
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    timed: slot.timed,
  };
}

function slotAttributes(slot: Slot): TimingAttributes {
  const serialized = serializeSlot(slot);

  return {
    'data-slot-start': serialized.start,
    'data-slot-end': serialized.end,
    'data-slot-timed': String(serialized.timed),
  };
}

/**
 * Attributes to spread on the element of one competition. A competition that
 * is not scheduled gets none, so the browser gives it no phase.
 */
export function timingAttributes(
  competition: Competition,
  slot: Slot,
): Partial<TimingAttributes> {
  return isScheduled(competition, { withTraining: true })
    ? slotAttributes(slot)
    : {};
}

/** Attributes to spread on an event card: its span and each competition. */
export function eventTimingAttributes(event: SeasonEvent): TimingAttributes {
  const slots = event.competitions.map((competition) =>
    getSlot(event, competition),
  );
  const span: Slot = {
    start: new Date(Math.min(...slots.map((slot) => slot.start.getTime()))),
    end: new Date(Math.max(...slots.map((slot) => slot.end.getTime()))),
    timed: slots.every((slot) => slot.timed),
  };
  const scheduled = event.competitions.flatMap((competition, index) => {
    const slot = slots[index];

    return slot && isScheduled(competition, { withTraining: true })
      ? [serializeSlot(slot)]
      : [];
  });

  return {
    ...slotAttributes(span),
    'data-competition-slots': JSON.stringify(scheduled),
  };
}

function parseSlot(
  start: string | undefined,
  end: string | undefined,
  timed: unknown,
): Slot | undefined {
  if (!start || !end || typeof timed !== 'boolean') {
    return undefined;
  }

  const slot = { start: new Date(start), end: new Date(end), timed };

  return Number.isNaN(slot.start.getTime()) || Number.isNaN(slot.end.getTime())
    ? undefined
    : slot;
}

function parseCompetitionSlots(text: string | undefined): Slot[] | undefined {
  if (text === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(text);

    return (Array.isArray(parsed) ? parsed : []).flatMap((value: unknown) => {
      if (typeof value !== 'object' || value === null) {
        return [];
      }

      const start: unknown = Reflect.get(value, 'start');
      const end: unknown = Reflect.get(value, 'end');
      const slot = parseSlot(
        typeof start === 'string' ? start : undefined,
        typeof end === 'string' ? end : undefined,
        Reflect.get(value, 'timed'),
      );

      return slot ? [slot] : [];
    });
  } catch {
    return [];
  }
}

/** Reads timing back from an element's `dataset`; undefined without any. */
export function readTiming(
  dataset: Readonly<Record<string, string | undefined>>,
): Timing | undefined {
  const timed = dataset['slotTimed'];
  const slot = parseSlot(
    dataset['slotStart'],
    dataset['slotEnd'],
    timed === undefined ? undefined : timed === 'true',
  );

  return slot
    ? {
        slot,
        competitionSlots: parseCompetitionSlots(dataset['competitionSlots']),
      }
    : undefined;
}

/** An event card takes its phase from its competitions, not its whole span. */
export function getTimingPhase(now: Date, timing: Timing): Phase {
  const { slot, competitionSlots } = timing;

  return competitionSlots && competitionSlots.length > 0
    ? getEventPhase(now, competitionSlots)
    : getPhase(now, slot);
}
