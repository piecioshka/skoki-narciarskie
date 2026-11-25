// Fetches career World Cup wins and podiums (individual competitions) from the
// FIS biography of every athlete who finished a season in the overall top 30,
// and writes them to src/data/careers.json.
// Usage: npm run careers
import { readdirSync, readFileSync } from 'node:fs';
import { parsePodiums, type CareerPodiums } from '../src/lib/fis-careers.ts';
import { createFisClient, FIS_URL, fileCache } from '../src/lib/fis-client.ts';
import { standingsSchema } from '../src/lib/schema.ts';
import { writeJson } from '../src/lib/write-json.ts';

const STANDINGS_DIR = new URL('../src/data/standings/', import.meta.url);
// A podium finisher practically always ends some season in the top 30, so
// athletes below that are skipped to keep the number of requests reasonable.
const RANK_LIMIT = 30;
const fis = createFisClient({ cache: fileCache() });

const ids = new Set<number>();

for (const file of readdirSync(STANDINGS_DIR)) {
  const standings = standingsSchema.parse(
    JSON.parse(readFileSync(new URL(file, STANDINGS_DIR), 'utf8')),
  );

  for (const row of standings.rows) {
    if (row.rank <= RANK_LIMIT) {
      ids.add(row.fisCompetitorId);
    }
  }
}

const careers: Record<string, CareerPodiums> = {};
let done = 0;

for (const id of [...ids].sort((a, b) => a - b)) {
  const page = await fis.get(
    `${FIS_URL}/general/athlete-biography.html?sectorcode=JP&competitorid=${id}&type=podiums`,
  );

  careers[String(id)] = parsePodiums(page);
  done += 1;
  if (done % 25 === 0) {
    console.log(`${done}/${ids.size}`);
  }
}

await writeJson(new URL('../src/data/careers.json', import.meta.url), careers);
console.log(`${ids.size} athletes written`);
