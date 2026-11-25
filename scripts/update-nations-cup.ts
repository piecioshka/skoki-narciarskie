// Fetches the men's World Cup Nations Cup from FIS and writes it to
// src/data/nations-cup/<season>.json.
// Usage: npm run nations-cup -- [season]   one season, the newest by default
//        npm run nations-cup -- --all      every season with a standings file
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createFisClient, fileCache, FIS_URL } from '../src/lib/fis-client.ts';
import { writeJson } from '../src/lib/write-json.ts';
import {
  cupFileToWrite,
  NATIONS_CUP,
  parseNationsCup,
} from '../src/lib/fis-standings.ts';
import { latestSeason } from '../src/lib/season-files.ts';
import { nationsCupSchema } from '../src/lib/schema.ts';

const all = process.argv[2] === '--all';
// The hourly refresh goes without a cache, as it must see the current table;
// the backfill of past seasons keeps pages in tmp/ so a rerun costs nothing.
const fis = createFisClient(all ? { cache: fileCache() } : {});
const latest = latestSeason();

function standingsSeasons(): string[] {
  return readdirSync(new URL('../src/data/standings/', import.meta.url))
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace('.json', ''))
    .sort();
}

async function update(season: string): Promise<void> {
  if (!/^\d{4}-\d{4}$/.test(season)) {
    throw new Error(`Season must look like 2026-2027, got: ${season}`);
  }

  const sourceUrl = `${FIS_URL}/ski-jumping/cup-standings.html?sectorcode=JP&seasoncode=${season.slice(5)}&cupcode=${NATIONS_CUP}&disciplinecode=ALL&gendercode=M&nationcode=`;
  const parsed = parseNationsCup(await fis.get(sourceUrl));
  const target = new URL(
    `../src/data/nations-cup/${season}.json`,
    import.meta.url,
  );
  const existing = existsSync(target)
    ? nationsCupSchema.parse(JSON.parse(readFileSync(target, 'utf8')))
    : undefined;
  // Only the latest season gets an empty file, waiting for its first
  // competition; older seasons without a Nations Cup get no file and no page.
  const file = cupFileToWrite({
    cupCode: parsed.cupCode,
    expectedCup: NATIONS_CUP,
    rows: parsed.rows,
    existingRows: existing?.rows,
    createEmpty: season === latest,
    today: new Date().toISOString().slice(0, 10),
  });

  if (!file) {
    console.log(`${season}: unchanged (cup on page: ${parsed.cupCode})`);
    return;
  }
  const nationsCup = nationsCupSchema.parse({ season, sourceUrl, ...file });

  await writeJson(target, nationsCup);
  console.log(
    `${season}: ${file.rows.length} rows (cup on page: ${parsed.cupCode})`,
  );
}

for (const season of all ? standingsSeasons() : [process.argv[2] ?? latest]) {
  await update(season);
}
