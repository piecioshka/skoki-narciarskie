import { seasonSchema, type Season } from './schema';

// One JSON file per season: adding a season means adding a file here.
const files = import.meta.glob('../data/seasons/*.json', {
  eager: true,
  import: 'default',
});

const seasons: Season[] = Object.values(files)
  .map((raw) => seasonSchema.parse(raw))
  .sort((a, b) => b.id.localeCompare(a.id));

export function getSeasons(): Season[] {
  return seasons;
}

export function getCurrentSeason(): Season {
  const [latest] = seasons;

  if (!latest) {
    throw new Error('No season data found in src/data/seasons');
  }
  return latest;
}

export function getSeason(id: string): Season {
  const season = seasons.find((item) => item.id === id);

  if (!season) {
    throw new Error(`Unknown season: ${id}`);
  }
  return season;
}

export function formatSeasonLabel(id: string): string {
  return id.replace('-', '/');
}
