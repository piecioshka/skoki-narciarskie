import { toPersonKey } from './people';
import type { CompetitionKind } from './schema';
import { getSeasons } from './seasons';
import { getStandings, getStandingsSeasons } from './standings';
import { getTournaments } from './tournaments';

export interface AthleteSummary {
  name: string;
  fisCompetitorId: number;
  seasons: number;
  firstSeason: string;
  lastSeason: string;
  /** World Cup points summed over every season in the standings data. */
  points: number;
  bestRank: number;
  /** Overall World Cup titles. */
  titles: number;
  /** Top-three finishes in the overall standings. */
  overallPodiums: number;
  tournamentWins: string[];
  /** Individual competition wins and podiums in the archived seasons. */
  wins: number;
  podiums: number;
}

export interface TeamResult {
  seasonId: string;
  eventSlug: string;
  city: string;
  date: string;
  kind: CompetitionKind;
  rank: number;
}

export interface NationSummary {
  nation: string;
  points: number;
  titles: number;
  athletes: AthleteSummary[];
  teamResults: TeamResult[];
}

const TEAM_KINDS: CompetitionKind[] = ['team', 'super-team', 'mixed-team'];

function collectAthletes(): Map<string, Map<number, AthleteSummary>> {
  const nations = new Map<string, Map<number, AthleteSummary>>();

  // Oldest season first, so `firstSeason` and the latest spelling of a name
  // fall out of the iteration order.
  for (const seasonId of [...getStandingsSeasons()].reverse()) {
    for (const row of getStandings(seasonId)?.rows ?? []) {
      const athletes =
        nations.get(row.nation) ?? new Map<number, AthleteSummary>();
      const known = athletes.get(row.fisCompetitorId);

      nations.set(row.nation, athletes);
      athletes.set(row.fisCompetitorId, {
        name: `${row.givenName} ${row.familyName}`,
        fisCompetitorId: row.fisCompetitorId,
        seasons: (known?.seasons ?? 0) + 1,
        firstSeason: known?.firstSeason ?? seasonId,
        lastSeason: seasonId,
        points: (known?.points ?? 0) + row.points,
        bestRank: Math.min(known?.bestRank ?? row.rank, row.rank),
        titles: (known?.titles ?? 0) + (row.rank === 1 ? 1 : 0),
        overallPodiums: (known?.overallPodiums ?? 0) + (row.rank <= 3 ? 1 : 0),
        tournamentWins: known?.tournamentWins ?? [],
        wins: known?.wins ?? 0,
        podiums: known?.podiums ?? 0,
      });
    }
  }
  return nations;
}

function addTournamentWins(athletes: AthleteSummary[]): void {
  const byKey = new Map(athletes.map((item) => [toPersonKey(item.name), item]));

  for (const tournament of getTournaments()) {
    for (const winner of tournament.winners) {
      for (const place of [winner.podium[0], winner.coWinner]) {
        const athlete = place?.name
          ? byKey.get(toPersonKey(place.name))
          : undefined;

        athlete?.tournamentWins.push(`${tournament.name} ${winner.edition}`);
      }
    }
  }
}

function addCompetitionResults(athletes: AthleteSummary[]): void {
  const byId = new Map(athletes.map((item) => [item.fisCompetitorId, item]));

  for (const season of getSeasons()) {
    for (const event of season.events) {
      for (const competition of event.competitions) {
        for (const place of competition.results) {
          const athlete = place.fisCompetitorId
            ? byId.get(place.fisCompetitorId)
            : undefined;

          if (athlete) {
            athlete.podiums += 1;
            athlete.wins += place.rank === 1 ? 1 : 0;
          }
        }
      }
    }
  }
}

function collectTeamResults(nation: string): TeamResult[] {
  return getSeasons().flatMap((season) =>
    season.events.flatMap((event) =>
      event.competitions
        .filter((competition) => TEAM_KINDS.includes(competition.kind))
        .flatMap((competition) =>
          competition.results
            .filter((place) => place.nation === nation)
            .map((place) => ({
              seasonId: season.id,
              eventSlug: event.slug,
              city: event.city,
              date: competition.date,
              kind: competition.kind,
              rank: place.rank,
            })),
        ),
    ),
  );
}

let cache: NationSummary[] | undefined;

/** Every nation with at least one athlete in the standings, best first. */
export function getNations(): NationSummary[] {
  if (cache) {
    return cache;
  }

  const all = [...collectAthletes()].map(([nation, byId]) => {
    const athletes = [...byId.values()];

    addTournamentWins(athletes);
    addCompetitionResults(athletes);
    athletes.sort((a, b) => b.points - a.points);
    return {
      nation,
      points: athletes.reduce((sum, item) => sum + item.points, 0),
      titles: athletes.reduce((sum, item) => sum + item.titles, 0),
      athletes,
      teamResults: collectTeamResults(nation).sort((a, b) =>
        b.date.localeCompare(a.date),
      ),
    };
  });

  cache = all.sort((a, b) => b.points - a.points);
  return cache;
}
