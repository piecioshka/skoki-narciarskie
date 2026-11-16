// Fetches the men's World Cup overall standings from FIS and writes them to
// src/data/standings/<season>.json. Usage: npm run standings -- [season]
import { readdirSync, writeFileSync } from 'node:fs';
import { parseStandings } from '../src/lib/fis-standings.ts';
import { standingsSchema } from '../src/lib/schema.ts';

const CUP = 'WC';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

function latestSeason(): string {
  const seasons = readdirSync(new URL('../src/data/seasons/', import.meta.url))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''))
    .sort();
  const latest = seasons[seasons.length - 1];

  if (!latest) {
    throw new Error('No season files found');
  }
  return latest;
}

const season = process.argv[2] ?? latestSeason();

if (!/^\d{4}-\d{4}$/.test(season)) {
  throw new Error(`Season must look like 2026-2027, got: ${season}`);
}

const sourceUrl = `https://www.fis-ski.com/DB/ski-jumping/cup-standings.html?sectorcode=JP&seasoncode=${season.slice(5)}&cupcode=${CUP}&disciplinecode=ALL&gendercode=M&nationcode=`;
const response = await fetch(sourceUrl, {
  headers: { 'User-Agent': USER_AGENT },
});

if (!response.ok) {
  throw new Error(`FIS responded with HTTP ${response.status}`);
}

const parsed = parseStandings(await response.text());
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
