// Imports a finished World Cup season (men's and mixed competitions with
// podiums) from FIS into src/data/seasons/<season>.json.
// Usage: npm run import-season -- 2025-2026
// Responses are cached in tmp/fis-cache, so a rerun costs no requests.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { splitName } from '../src/lib/fis-standings.ts';
import { seasonSchema } from '../src/lib/schema.ts';

const FIS = 'https://www.fis-ski.com/DB';
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CACHE_DIR = new URL('../tmp/fis-cache/', import.meta.url);
// FIS answers 429 after about fifty quick requests, so the import is slow.
const REQUEST_GAP_MS = 3000;
const RETRY_WAIT_MS = 60_000;
const MAX_ATTEMPTS = 6;
const FOUR_HILLS = [
  'oberstdorf',
  'garmisch-partenkirchen',
  'innsbruck',
  'bischofshofen',
];
// FIS nation code -> ISO 3166-1 alpha-2 of the host country.
const COUNTRIES: Record<string, string> = {
  AUT: 'AT',
  BUL: 'BG',
  CAN: 'CA',
  CHN: 'CN',
  CZE: 'CZ',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  GER: 'DE',
  ITA: 'IT',
  JPN: 'JP',
  KAZ: 'KZ',
  KOR: 'KR',
  NOR: 'NO',
  POL: 'PL',
  ROU: 'RO',
  RUS: 'RU',
  SLO: 'SI',
  SUI: 'CH',
  SVK: 'SK',
  SWE: 'SE',
  TUR: 'TR',
  USA: 'US',
};

const season = process.argv[2] ?? '';

if (!/^\d{4}-\d{4}$/.test(season)) {
  throw new Error('Usage: npm run import-season -- 2025-2026');
}

const seasonCode = season.slice(5);

function toCountryCode(nation: string): string {
  const code = COUNTRIES[nation];

  // An unknown host would end up without a flag, so the import stops instead.
  if (!code) {
    throw new Error(`Unknown host nation: ${nation}; add it to COUNTRIES`);
  }
  return code;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
}

function toText(html: string): string {
  return decode(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function get(url: string): Promise<string> {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
  const file = new URL(`${key}.html`, CACHE_DIR);

  if (existsSync(file)) {
    return readFileSync(file, 'utf8');
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
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
    console.log(`429 from FIS, waiting (attempt ${attempt})`);
    await sleep(RETRY_WAIT_MS);
  }
  throw new Error(`FIS keeps answering 429 for ${url}`);
}

function slugify(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function splitRows(html: string): string[] {
  return html.split(/<(?:a|div)[^>]*class="table-row[^"]*"/).slice(1);
}

interface Race {
  fisRaceId: number;
  date: string;
  time: string | null;
  timeZone: string;
  description: string;
  cancelled: boolean;
  mixed: boolean;
}

function parseRaces(html: string): Race[] {
  return splitRows(html).flatMap((row) => {
    const id = /raceid=(\d+)/.exec(row)?.[1];
    const when =
      /data-date="([^"]*)"\s+data-time="([^"]*)"\s+data-timezone="([^"]*)"/.exec(
        row,
      );
    const text = toText(row);
    const kind = /\d{4} (.+?) (WC|QUA) ([AMW])\b/.exec(text);

    if (!id || !when || !kind || kind[2] !== 'WC' || kind[3] === 'W') {
      return [];
    }

    const words = (kind[1] ?? '').split(' ');

    return [
      {
        fisRaceId: Number(id),
        date: when[1] ?? '',
        time: when[2] || null,
        timeZone: when[3] ?? 'UTC',
        // The page prints the description twice (desktop and mobile).
        description: words.slice(0, words.length / 2).join(' '),
        cancelled: /\bCancelled\b/.test(text),
        mixed: kind[3] === 'A',
      },
    ];
  });
}

function toKind(race: Race): string {
  if (race.mixed) {
    return 'mixed-team';
  }
  if (/super team/i.test(race.description)) {
    return 'super-team';
  }
  return /team/i.test(race.description) ? 'team' : 'individual';
}

function toHillType(description: string): string {
  if (/flying/i.test(description)) {
    return 'flying';
  }
  return /normal/i.test(description) ? 'normal' : 'large';
}

function parsePodium(html: string, team: boolean) {
  const places = splitRows(html).flatMap((row) => {
    const clean = row.replace(/<!--[\s\S]*?-->/g, '');
    const rank = /<div class="[^"]*justify-right[^"]*">\s*(\d+)\s*<\/div>/.exec(
      clean,
    );
    const isRank =
      rank && /\bbold\b/.test(rank[0]) && !/\bgray\b/.test(rank[0]);
    const name = /justify-left bold">\s*([^<]+?)\s*</.exec(clean)?.[1];
    const nation = /country__name-short">([A-Z]{3})</.exec(clean)?.[1];
    const competitor = /competitorid=(\d+)/.exec(clean)?.[1];

    if (!isRank || !rank || !name || !nation) {
      return [];
    }

    const { givenName, familyName } = splitName(decode(name));

    return [
      team
        ? { rank: Number(rank[1]), nation }
        : {
            rank: Number(rank[1]),
            name: `${givenName} ${familyName}`.trim(),
            nation,
            fisCompetitorId: Number(competitor),
          },
    ];
  });

  return places.filter((place) => place.rank <= 3).slice(0, 3);
}

mkdirSync(CACHE_DIR, { recursive: true });

const calendar = await get(
  `${FIS}/ski-jumping/calendar-results.html?sectorcode=JP&seasoncode=${seasonCode}&categorycode=WC&gendercode=M&seasonmonth=X-${seasonCode}&saveselection=-1`,
);
const eventIds = [
  ...new Set([...calendar.matchAll(/eventid=(\d+)/g)].map((match) => match[1])),
];
const usedSlugs = new Map<string, number>();
const events = [];

for (const eventId of eventIds) {
  const page = await get(
    `${FIS}/general/event-details.html?sectorcode=JP&eventid=${eventId}&seasoncode=${seasonCode}`,
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

  const city = decode(title[1] ?? '');
  const base = slugify(city);
  const count = (usedSlugs.get(base) ?? 0) + 1;
  const competitions = [];

  usedSlugs.set(base, count);
  for (const race of races) {
    const kind = toKind(race);
    const results = race.cancelled
      ? []
      : parsePodium(
          await get(
            `${FIS}/general/results.html?sectorcode=JP&raceid=${race.fisRaceId}`,
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
    timeZone: first?.timeZone ?? 'UTC',
    broadcasts: [],
    officials: [],
    competitions,
  });
  console.log(`${city}: ${competitions.length} competitions`);
}

const data = seasonSchema.parse({ id: season, broadcasters: {}, events });

writeFileSync(
  new URL(`../src/data/seasons/${season}.json`, import.meta.url),
  `${JSON.stringify(data, null, 2)}\n`,
);
console.log(`${season}: ${events.length} events written`);
