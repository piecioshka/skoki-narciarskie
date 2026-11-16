// Parser of the FIS cup standings page. It has no imports on purpose: the
// update script runs it directly under Node, outside of the Astro build.

export interface ParsedRow {
  rank: number;
  givenName: string;
  familyName: string;
  nation: string;
  points: number;
  fisCompetitorId: number;
}

export interface ParsedStandings {
  /** Cup the rows belong to, e.g. `WC`; undefined when the page has no rows. */
  cupCode: string | undefined;
  rows: ParsedRow[];
}

function capitalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/(^|[-'\s])(\p{L})/gu, (_, prefix: string, letter: string) => {
      return `${prefix}${letter.toUpperCase()}`;
    });
}

/** Splits the FIS notation `FAMILY NAME Given Name` into its two parts. */
export function splitName(raw: string): {
  givenName: string;
  familyName: string;
} {
  const words = raw.trim().split(/\s+/);
  const isFamily = (word: string): boolean =>
    word === word.toUpperCase() && /\p{L}/u.test(word);
  const family = words.filter(isFamily);
  const given = words.filter((word) => !isFamily(word));

  return {
    givenName: given.join(' '),
    familyName: family.map(capitalize).join(' '),
  };
}

function toNumber(text: string | undefined): number {
  return Number((text ?? '').replace(/\D/g, ''));
}

function parseRow(html: string): ParsedRow | undefined {
  const id = /competitorid=(\d+)/.exec(html)?.[1];
  const name = /<div[^>]*>\s*([^<\s][^<]*?)\s*</.exec(html)?.[1];
  const nation = /country__name-short">([A-Z]{3})</.exec(html)?.[1];
  const [rank, points] = [
    ...html.matchAll(/justify-right bold">([^<]+)</g),
  ].map((match) => match[1]);

  if (!id || !name || !nation || !rank || !points) {
    return undefined;
  }
  return {
    ...splitName(name),
    rank: toNumber(rank),
    nation,
    points: toNumber(points),
    fisCompetitorId: Number(id),
  };
}

export function parseStandings(html: string): ParsedStandings {
  const chunks = html.split('<a class="table-row').slice(1);
  const rows = chunks.flatMap((chunk) => {
    const row = parseRow(chunk);

    return row ? [row] : [];
  });

  return {
    cupCode: /athlete-biography[^"]*cupcode=([A-Z]+)/.exec(html)?.[1],
    rows,
  };
}
