import { nationsCupSchema, type NationsCup } from './schema';

const files = import.meta.glob('../data/nations-cup/*.json', {
  eager: true,
  import: 'default',
});

// Newest season first.
const allNationsCups: NationsCup[] = Object.values(files)
  .map((raw) => nationsCupSchema.parse(raw))
  .sort((a, b) => b.season.localeCompare(a.season));

export function getNationsCup(seasonId: string): NationsCup | undefined {
  return allNationsCups.find((item) => item.season === seasonId);
}

/** Seasons that have a Nations Cup file, newest first. */
export function getNationsCupSeasons(): string[] {
  return allNationsCups.map((item) => item.season);
}

/**
 * The season the nations page links to: the newest one with a table, or the
 * newest file while no season has one.
 */
export function getLatestNationsCupSeason(): string | undefined {
  return (
    allNationsCups.find((item) => item.rows.length > 0)?.season ??
    allNationsCups[0]?.season
  );
}
