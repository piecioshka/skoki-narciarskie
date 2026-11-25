// Imports a finished World Cup season (men's and mixed competitions with
// podiums) from FIS into src/data/seasons/<season>.json.
// Usage: npm run import-season -- 2025-2026
// Responses are cached in tmp/fis-cache, so a rerun costs no requests.

import { createFisClient, FIS_URL, fileCache } from '../src/lib/fis-client.ts';
import { writeJson } from '../src/lib/write-json.ts';
import {
  parsePodium,
  parseRaces,
  slugify,
  toHillType,
  toKind,
} from '../src/lib/fis-season.ts';
import { decodeEntities } from '../src/lib/html-text.ts';
import { getNationCountryCode } from '../src/lib/links.ts';
import { seasonSchema } from '../src/lib/schema.ts';

const FOUR_HILLS = [
  'oberstdorf',
  'garmisch-partenkirchen',
  'innsbruck',
  'bischofshofen',
];

const season = process.argv[2] ?? '';

if (!/^\d{4}-\d{4}$/.test(season)) {
  throw new Error('Usage: npm run import-season -- 2025-2026');
}

const seasonCode = season.slice(5);

function toCountryCode(nation: string): string {
  const code = getNationCountryCode(nation);

  // An unknown host would end up without a flag, so the import stops instead.
  if (!code) {
    throw new Error(
      `Unknown host nation: ${nation}; add it to FIS_NATIONS in src/lib/links.ts`,
    );
  }
  return code;
}

// FIS leaves the time zone of some older events empty; the host country
// decides then (Russia hosted only in Nizhny Tagil, Canada only in Whistler).
const ZONES: Record<string, string> = {
  AT: 'Europe/Vienna',
  CA: 'America/Vancouver',
  CH: 'Europe/Zurich',
  CN: 'Asia/Shanghai',
  CZ: 'Europe/Prague',
  DE: 'Europe/Berlin',
  FI: 'Europe/Helsinki',
  IT: 'Europe/Rome',
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  KZ: 'Asia/Almaty',
  NO: 'Europe/Oslo',
  PL: 'Europe/Warsaw',
  RO: 'Europe/Bucharest',
  RU: 'Asia/Yekaterinburg',
  SE: 'Europe/Stockholm',
  SI: 'Europe/Ljubljana',
  US: 'America/New_York',
};

function toTimeZone(fromFis: string | undefined, countryCode: string): string {
  const zone = fromFis || ZONES[countryCode];

  if (!zone) {
    throw new Error(`No time zone for host country: ${countryCode}`);
  }
  return zone;
}

const fis = createFisClient({ cache: fileCache() });

const calendar = await fis.get(
  `${FIS_URL}/ski-jumping/calendar-results.html?sectorcode=JP&seasoncode=${seasonCode}&categorycode=WC&gendercode=M&seasonmonth=X-${seasonCode}&saveselection=-1`,
);
const eventIds = [
  ...new Set([...calendar.matchAll(/eventid=(\d+)/g)].map((match) => match[1])),
];
const usedSlugs = new Map<string, number>();
const events = [];

for (const eventId of eventIds) {
  const page = await fis.get(
    `${FIS_URL}/general/event-details.html?sectorcode=JP&eventid=${eventId}&seasoncode=${seasonCode}`,
  );
  const title = /<title>\s*FIS \| (.+?) \(([A-Z]{3})\) - Event Details/.exec(
    page,
  );
  const races = parseRaces(page);

  // The Four Hills overall row has no venue of its own.
  if (
    !title ||
    races.length === 0 ||
    /tournament|\btour\b/i.test(title[1] ?? '')
  ) {
    continue;
  }

  const city = decodeEntities(title[1] ?? '');
  const base = slugify(city);
  const count = (usedSlugs.get(base) ?? 0) + 1;
  const competitions = [];

  usedSlugs.set(base, count);
  for (const race of races) {
    const kind = toKind(race);
    const results = race.cancelled
      ? []
      : parsePodium(
          await fis.get(
            `${FIS_URL}/general/results.html?sectorcode=JP&raceid=${race.fisRaceId}`,
          ),
          kind !== 'individual',
        );

    competitions.push({
      fisRaceId: race.fisRaceId,
      kind,
      hillSize: null,
      hillType: toHillType(race.description),
      date: race.date,
      time: race.time,
      status: race.cancelled ? 'cancelled' : 'scheduled',
      results,
    });
  }

  const first = races[0];
  const month = Number(first?.date.slice(5, 7));
  const day = Number(first?.date.slice(8, 10));
  const aroundNewYear =
    (month === 12 && day >= 27) || (month === 1 && day <= 7);
  const flying = competitions.every((item) => item.hillType === 'flying');

  events.push({
    slug: count === 1 ? base : `${base}-${count}`,
    type: 'world-cup',
    tags: [
      ...(FOUR_HILLS.includes(base) && aroundNewYear ? ['four-hills'] : []),
      ...(flying ? ['ski-flying'] : []),
    ],
    fisEventId: Number(eventId),
    city,
    countryCode: toCountryCode(title[2] ?? ''),
    hillName: null,
    timeZone: toTimeZone(first?.timeZone, toCountryCode(title[2] ?? '')),
    channels: [],
    officials: [],
    competitions,
  });
  console.log(`${city}: ${competitions.length} competitions`);
}

const data = seasonSchema.parse({ id: season, channels: {}, events });

await writeJson(
  new URL(`../src/data/seasons/${season}.json`, import.meta.url),
  data,
);
console.log(`${season}: ${events.length} events written`);
