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

/** The newest earlier season that has a table; shown before a season starts. */
export function getPreviousStandings(seasonId: string): Standings | undefined {
  return allStandings.find(
    (item) => item.season < seasonId && item.rows.length > 0,
  );
}

export function getTeams(seasonId: string): Teams | undefined {
  return Object.values(teamsFiles)
    .map((raw) => teamsSchema.parse(raw))
    .find((item) => item.season === seasonId);
}
