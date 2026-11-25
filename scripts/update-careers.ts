// Fetches career World Cup wins and podiums (individual competitions) from the
// FIS biography of every athlete who finished a season in the overall top 30,
// and writes them to src/data/careers.json.
// Usage: npm run careers
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { standingsSchema } from '../src/lib/schema.ts';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CACHE_DIR = new URL('../tmp/fis-cache/', import.meta.url);
const STANDINGS_DIR = new URL('../src/data/standings/', import.meta.url);
// A podium finisher practically always ends some season in the top 30, so
// athletes below that are skipped to keep the number of requests reasonable.
const RANK_LIMIT = 30;
const REQUEST_GAP_MS = 3000;
const RETRY_WAIT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get(url: string): Promise<string> {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
  const file = new URL(`${key}.html`, CACHE_DIR);

  if (existsSync(file)) {
    return readFileSync(file, 'utf8');
  }
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (response.ok) {
      const body = await response.text();

      writeFileSync(file, body);
      await sleep(REQUEST_GAP_MS);
      return body;
    }
    if (response.status !== 429) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    await sleep(RETRY_WAIT_MS);
  }
  throw new Error(`FIS keeps answering 429 for ${url}`);
}

/** Sums the "World Cup Podiums Individual" table: one row per season. */
export function parsePodiums(html: string): {
  wins: number;
  second: number;
  third: number;
} {
  const text = html
    .replace(
      /<script\b[\s\S]*?<\/script[^>]*>|<style\b[\s\S]*?<\/style[^>]*>/gi,
      ' ',
    )
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
  const table =
    /Position 1 Position 2 Position 3 Podiums((?: \d{4} \d+ \d+ \d+ \d+)*)/.exec(
      text,
    );
  const numbers = (table?.[1] ?? '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(Number);
  const totals = { wins: 0, second: 0, third: 0 };

  for (let index = 0; index + 4 < numbers.length + 1; index += 5) {
    totals.wins += numbers[index + 1] ?? 0;
    totals.second += numbers[index + 2] ?? 0;
    totals.third += numbers[index + 3] ?? 0;
  }
  return totals;
}

mkdirSync(CACHE_DIR, { recursive: true });

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

const careers: Record<string, { wins: number; second: number; third: number }> =
  {};
let done = 0;

for (const id of [...ids].sort((a, b) => a - b)) {
  const page = await get(
    `https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=JP&competitorid=${id}&type=podiums`,
  );

  careers[String(id)] = parsePodiums(page);
  done += 1;
  if (done % 25 === 0) {
    console.log(`${done}/${ids.size}`);
  }
}

writeFileSync(
  new URL('../src/data/careers.json', import.meta.url),
  `${JSON.stringify(careers, null, 2)}\n`,
);
console.log(`${ids.size} athletes written`);
