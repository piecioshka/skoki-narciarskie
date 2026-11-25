// Fetches the PDF attachments (start lists, results, media stats, event
// program) from the FIS event pages and writes them to the season file.
// Usage: npm run documents -- [season] [event slug]
// Without a slug it checks every event that has not finished yet.
import { readFileSync, writeFileSync } from 'node:fs';
import { createFisClient, FIS_URL } from '../src/lib/fis-client.ts';
import { assignDocuments, parseDocuments } from '../src/lib/fis-documents.ts';
import { latestSeason, SEASONS_DIR } from '../src/lib/season-files.ts';
import { seasonSchema } from '../src/lib/schema.ts';

// No cache: the hourly refresh must always see the current pages.
const fis = createFisClient();

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
  return parseDocuments(
    await fis.get(
      `${FIS_URL}/general/event-details.html?sectorcode=JP&eventid=${eventId}&seasoncode=${season.slice(5)}`,
    ),
  );
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
  }
}

seasonSchema.parse(raw);
writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`);
