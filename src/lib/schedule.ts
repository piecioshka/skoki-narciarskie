import type { Competition, Season, SeasonEvent } from './schema';
import { getSlot } from './timing';

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
