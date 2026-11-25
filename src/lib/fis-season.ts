// Parsers of the FIS event and results pages used to import a finished
// season. Runtime imports carry the `.ts` extension: the import script runs
// this module directly under Node, outside of the Astro build.
import { splitName } from './fis-standings.ts';
import { decodeEntities, htmlToText, stripComments } from './html-text.ts';

export interface Race {
  fisRaceId: number;
  date: string;
  time: string | null;
  timeZone: string;
  description: string;
  cancelled: boolean;
  mixed: boolean;
}

export type PodiumPlace =
  | { rank: number; nation: string }
  | { rank: number; name: string; nation: string; fisCompetitorId: number };

export function slugify(city: string): string {
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

/** Men's and mixed World Cup races of an event page (no qualifications, no women). */
export function parseRaces(html: string): Race[] {
  return splitRows(html).flatMap((row) => {
    const id = /raceid=(\d+)/.exec(row)?.[1];
    const when =
      /data-date="([^"]*)"\s+data-time="([^"]*)"\s+data-timezone="([^"]*)"/.exec(
        row,
      );
    const text = htmlToText(row);
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

export function toKind(race: Race): string {
  if (race.mixed) {
    return 'mixed-team';
  }
  if (/super team/i.test(race.description)) {
    return 'super-team';
  }
  return /team/i.test(race.description) ? 'team' : 'individual';
}

export function toHillType(description: string): string {
  if (/flying/i.test(description)) {
    return 'flying';
  }
  return /normal/i.test(description) ? 'normal' : 'large';
}

/**
 * Top three of a results page. In team results only the team rows have a
 * bold rank, so the athletes listed under a team are skipped.
 */
export function parsePodium(html: string, team: boolean): PodiumPlace[] {
  const places = splitRows(html).flatMap((row): PodiumPlace[] => {
    const clean = stripComments(row, '');
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

    const { givenName, familyName } = splitName(decodeEntities(name));

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
