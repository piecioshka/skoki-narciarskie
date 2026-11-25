// Fetches the men's World Cup overall standings from FIS and writes them to
// src/data/standings/<season>.json. Usage: npm run standings -- [season]
import { writeFileSync } from 'node:fs';
import { createFisClient, FIS_URL } from '../src/lib/fis-client.ts';
import { parseStandings } from '../src/lib/fis-standings.ts';
import { latestSeason } from '../src/lib/season-files.ts';
import { standingsSchema } from '../src/lib/schema.ts';

const CUP = 'WC';
// No cache: the hourly refresh must always see the current standings.
const fis = createFisClient();

const season = process.argv[2] ?? latestSeason();

if (!/^\d{4}-\d{4}$/.test(season)) {
  throw new Error(`Season must look like 2026-2027, got: ${season}`);
}

const sourceUrl = `${FIS_URL}/ski-jumping/cup-standings.html?sectorcode=JP&seasoncode=${season.slice(5)}&cupcode=${CUP}&disciplinecode=ALL&gendercode=M&nationcode=`;
const parsed = parseStandings(await fis.get(sourceUrl));
// Before the first competition FIS answers with another ranking instead of an
// empty World Cup table, so rows of a different cup are dropped.
const rows = parsed.cupCode === CUP ? parsed.rows : [];
const standings = standingsSchema.parse({
  season,
  updatedAt: rows.length > 0 ? new Date().toISOString().slice(0, 10) : null,
  sourceUrl,
  rows,
});
const target = new URL(`../src/data/standings/${season}.json`, import.meta.url);

writeFileSync(target, `${JSON.stringify(standings, null, 2)}\n`);
console.log(`${season}: ${rows.length} rows (cup on page: ${parsed.cupCode})`);
