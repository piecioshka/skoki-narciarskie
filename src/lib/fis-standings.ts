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

function rowChunks(html: string): string[] {
  return html.split('<a class="table-row').slice(1);
}

export function parseStandings(html: string): ParsedStandings {
  const rows = rowChunks(html).flatMap((chunk) => {
    const row = parseRow(chunk);

    return row ? [row] : [];
  });

  return {
    cupCode: /athlete-biography[^"]*cupcode=([A-Z]+)/.exec(html)?.[1],
    rows,
  };
}

export interface ParsedNationRow {
  rank: number;
  nation: string;
  points: number;
}

export interface ParsedNationsCup {
  /** Cup selected in the page's cup menu, e.g. `NC-WC`. */
  cupCode: string | undefined;
  rows: ParsedNationRow[];
}

/** Cup the page shows, read from the selected option of its cup menu. */
export function selectedCupCode(html: string): string | undefined {
  const menu = /<select[^>]*id="cupcode"[^>]*>([\s\S]*?)<\/select>/.exec(
    html,
  )?.[1];

  return menu
    ? /<option value="([A-Z-]+)" selected/.exec(menu)?.[1]
    : undefined;
}

function parseNationRow(html: string): ParsedNationRow | undefined {
  const nation = /country__name-short">([A-Z]{3})</.exec(html)?.[1];
  const [rank, points] = [
    ...html.matchAll(/justify-right bold">([^<]+)</g),
  ].map((match) => match[1]);

  if (!nation || !rank || !points) {
    return undefined;
  }
  return { rank: toNumber(rank), nation, points: toNumber(points) };
}

export const NATIONS_CUP = 'NC-WC';

/** What a refresh found on a FIS cup page for one season. */
export interface CupUpdate<Row> {
  /** Cup the page shows; undefined when FIS sent no cup menu. */
  cupCode: string | undefined;
  /** Cup the refresh asked for, e.g. `WC` or `NC-WC`. */
  expectedCup: string;
  rows: Row[];
  /** Rows of the file on disk, or undefined when there is no file yet. */
  existingRows: Row[] | undefined;
  /** Whether a season without a table still gets a file with no rows. */
  createEmpty: boolean;
  /** Day of the refresh, `YYYY-MM-DD`. */
  today: string;
}

function sameRow(a: object, b: object): boolean {
  const left = Object.entries(a);
  const right = new Map(Object.entries(b));

  return (
    left.length === right.size &&
    left.every(([key, value]) => right.get(key) === value)
  );
}

function sameRows(a: object[], b: object[]): boolean {
  return a.length === b.length && a.every((row, i) => sameRow(row, b[i] ?? {}));
}

/**
 * The file content a refresh writes for a season, or undefined to leave the
 * file alone. FIS shows another cup when it has no table for the season (or
 * a broken page has no cup menu), and that never wipes rows already stored;
 * an unchanged table keeps its old date, so the hourly job commits nothing.
 */
export function cupFileToWrite<Row extends object>(
  update: CupUpdate<Row>,
): { updatedAt: string | null; rows: Row[] } | undefined {
  const { existingRows } = update;
  const rows = update.cupCode === update.expectedCup ? update.rows : [];

  if (rows.length === 0 && (existingRows?.length ?? 0) > 0) {
    return undefined;
  }
  if (
    existingRows
      ? sameRows(rows, existingRows)
      : !update.createEmpty && rows.length === 0
  ) {
    return undefined;
  }
  return { updatedAt: rows.length > 0 ? update.today : null, rows };
}

/** Rows of a nations cup page: one country per row, no athletes. */
export function parseNationsCup(html: string): ParsedNationsCup {
  const rows = rowChunks(html).flatMap((chunk) => {
    const row = parseNationRow(chunk);

    return row ? [row] : [];
  });

  return { cupCode: selectedCupCode(html), rows };
}
