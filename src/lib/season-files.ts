// Season files on disk, as the refresh scripts see them under Node. The site
// reads the same files through `seasons.ts`.
import { readdirSync } from 'node:fs';

export const SEASONS_DIR = new URL('../data/seasons/', import.meta.url);

/** Id of the newest season file, e.g. `2026-2027`. */
export function latestSeason(dir: URL = SEASONS_DIR): string {
  const latest = readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1);

  if (!latest) {
    throw new Error('No season files found');
  }
  return latest.replace('.json', '');
}
