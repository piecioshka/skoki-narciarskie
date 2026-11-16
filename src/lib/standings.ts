import {
  standingsSchema,
  teamsSchema,
  type Standings,
  type NationTeams,
} from './schema';

const standingsFiles = import.meta.glob('../data/standings/*.json', {
  eager: true,
  import: 'default',
});
const teamsFiles = import.meta.glob('../data/teams/*.json', {
  eager: true,
  import: 'default',
});

const allStandings: Standings[] = Object.values(standingsFiles)
  .map((raw) => standingsSchema.parse(raw))
  .sort((a, b) => b.season.localeCompare(a.season));

export function getStandings(seasonId: string): Standings | undefined {
  return allStandings.find((item) => item.season === seasonId);
}

/** Squads of one nation for a season, if they are in the data. */
export function getTeams(
  seasonId: string,
  nation: string,
): NationTeams | undefined {
  const file = Object.values(teamsFiles)
    .map((raw) => teamsSchema.parse(raw))
    .find((item) => item.season === seasonId);
  const squads = file?.nations[nation];

  return squads ? { ...squads, season: seasonId } : undefined;
}

/** Seasons that have a standings file, newest first. */
export function getStandingsSeasons(): string[] {
  return allStandings.map((item) => item.season);
}
