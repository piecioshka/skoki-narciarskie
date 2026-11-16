import {
  standingsSchema,
  teamsSchema,
  type Standings,
  type Teams,
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

export function getTeams(seasonId: string): Teams | undefined {
  return Object.values(teamsFiles)
    .map((raw) => teamsSchema.parse(raw))
    .find((item) => item.season === seasonId);
}

/** Seasons that have a standings file, newest first. */
export function getStandingsSeasons(): string[] {
  return allStandings.map((item) => item.season);
}
