// Fetches the PDF attachments (start lists, results, media stats, event
// program) from the FIS event pages and writes them to the season file.
// Usage: npm run documents -- [season] [event slug]
// Without a slug it checks every event that has not finished yet.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { assignDocuments, parseDocuments } from '../src/lib/fis-documents.ts';
import { seasonSchema } from '../src/lib/schema.ts';

const FIS = 'https://www.fis-ski.com/DB';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// FIS answers 429 after about fifty quick requests.
const REQUEST_GAP_MS = 3000;
const SEASONS_DIR = new URL('../src/data/seasons/', import.meta.url);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function latestSeason(): string {
  const latest = readdirSync(SEASONS_DIR)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .at(-1);

  if (!latest) {
    throw new Error('No season files found');
  }
  return latest.replace('.json', '');
}

const season = process.argv[2] ?? latestSeason();
const onlySlug = process.argv[3];

if (!/^\d{4}-\d{4}$/.test(season)) {
  throw new Error(`Season must look like 2026-2027, got: ${season}`);
}

const file = new URL(`${season}.json`, SEASONS_DIR);
// The raw file is edited in place, so keys keep their order and defaults
// filled in by the schema do not end up in the data.
const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
const data = seasonSchema.parse(raw);
const rawEvents: unknown[] =
  typeof raw === 'object' && raw !== null && 'events' in raw
    ? Array.isArray(raw.events)
      ? raw.events
      : []
    : [];
// An event still gets new files (results) on its last day.
const today = new Date().toISOString().slice(0, 10);

function isWanted(event: (typeof data.events)[number]): boolean {
  const lastDay = event.competitions
    .map((item) => item.date)
    .sort()
    .at(-1);

  return onlySlug
    ? event.slug === onlySlug
    : lastDay !== undefined && lastDay >= today;
}

async function fetchDocuments(eventId: number) {
  const url = `${FIS}/general/event-details.html?sectorcode=JP&eventid=${eventId}&seasoncode=${season.slice(5)}`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return parseDocuments(await response.text());
}

function writeDocuments(
  target: unknown,
  documents: { label: string; url: string }[] | undefined,
): void {
  if (typeof target !== 'object' || target === null) {
    return;
  }
  if (documents && documents.length > 0) {
    Reflect.set(target, 'documents', documents);
  } else {
    Reflect.deleteProperty(target, 'documents');
  }
}

for (const [index, event] of data.events.entries()) {
  if (isWanted(event)) {
    const updated = assignDocuments(
      event,
      await fetchDocuments(event.fisEventId),
    );
    const rawEvent = rawEvents[index];
    const rawCompetitions: unknown =
      typeof rawEvent === 'object' && rawEvent !== null
        ? Reflect.get(rawEvent, 'competitions')
        : undefined;

    writeDocuments(rawEvent, updated.documents);
    updated.competitions.forEach((competition, position) => {
      writeDocuments(
        Array.isArray(rawCompetitions) ? rawCompetitions[position] : undefined,
        competition.documents,
      );
    });
    console.log(
      `${event.slug}: ${updated.documents?.length ?? 0} event documents, ${updated.competitions.reduce((sum, item) => sum + (item.documents?.length ?? 0), 0)} competition documents`,
    );
    await sleep(REQUEST_GAP_MS);
  }
}

seasonSchema.parse(raw);
writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
