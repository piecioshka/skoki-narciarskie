import type { Channel, Competition, Season, SeasonEvent } from './schema';

const FIS = 'https://www.fis-ski.com/DB';

export const FIS_LIVE_URL = `${FIS}/ski-jumping/live.html`;

/**
 * Live scoring of a single competition, or the FIS list of live competitions
 * when the codex is not known (training, imported seasons).
 */
export function getLiveUrl(competition: Competition): string {
  return competition.fisCodex === undefined
    ? FIS_LIVE_URL
    : `https://live.fis-ski.com/jp-${competition.fisCodex}/results-pda.htm`;
}

/**
 * FIS page of a single competition: start list, live scoring link, results.
 * Null for training, which FIS does not publish as a race.
 */
export function getResultsUrl(competition: Competition): string | null {
  return competition.fisRaceId === null
    ? null
    : `${FIS}/general/results.html?sectorcode=JP&raceid=${competition.fisRaceId}`;
}

export function getFisEventUrl(season: Season, event: SeasonEvent): string {
  const seasonCode = season.id.slice(5);

  return `${FIS}/general/event-details.html?sectorcode=JP&eventid=${event.fisEventId}&seasoncode=${seasonCode}`;
}

/**
 * Every channel showing a competition, with its ways to watch: the
 * competition's own list, or the event's when it has none, each channel once.
 */
export function getChannels(
  season: Season,
  event: SeasonEvent,
  competition: Competition,
): Channel[] {
  return getChannelIds(season, event, competition).flatMap((id) => {
    const channel = season.channels[id];

    return channel ? [channel] : [];
  });
}

/** Keys of the channels from `getChannels`, in the same order. */
export function getChannelIds(
  season: Season,
  event: SeasonEvent,
  competition: Competition,
): string[] {
  return [...new Set(competition.channels ?? event.channels)].filter(
    (id) => season.channels[id] !== undefined,
  );
}

/**
 * Element id of the shared where-to-watch panel of one channel set: every
 * competition shown on the same channels points at the same panel.
 */
export function watchPanelId(channelIds: readonly string[]): string {
  // Keys may contain any character; encoded keys never contain `+`, so two
  // different channel sets never share an id.
  return `watch-panel-${channelIds.map(encodeURIComponent).join('+')}`;
}

/** Regional indicator symbols for an ISO 3166-1 alpha-2 country code. */
export function getFlag(countryCode: string): string {
  return [...countryCode]
    .map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65))
    .join('');
}

// FIS uses its own three-letter nation codes; flags need ISO 3166-1 alpha-2.
const FIS_NATIONS: Record<string, string> = {
  AUT: 'AT',
  BLR: 'BY',
  BUL: 'BG',
  CAN: 'CA',
  CHN: 'CN',
  CZE: 'CZ',
  EST: 'EE',
  FIN: 'FI',
  FRA: 'FR',
  GEO: 'GE',
  GER: 'DE',
  GRE: 'GR',
  HUN: 'HU',
  ITA: 'IT',
  JPN: 'JP',
  KAZ: 'KZ',
  KGZ: 'KG',
  KOR: 'KR',
  LAT: 'LV',
  NED: 'NL',
  NOR: 'NO',
  POL: 'PL',
  ROU: 'RO',
  RUS: 'RU',
  SLO: 'SI',
  SUI: 'CH',
  SVK: 'SK',
  SWE: 'SE',
  TUR: 'TR',
  UKR: 'UA',
  USA: 'US',
};

/** Flag for a FIS nation code, or an empty string for an unmapped code. */
export function getNationFlag(nation: string): string {
  const countryCode = FIS_NATIONS[nation];

  return countryCode ? getFlag(countryCode) : '';
}

export function getAthleteUrl(fisCompetitorId: number): string {
  return `${FIS}/general/athlete-biography.html?sectorcode=JP&competitorid=${fisCompetitorId}`;
}

/** ISO 3166-1 alpha-2 code for a FIS nation code, if it is known. */
export function getNationCountryCode(nation: string): string | undefined {
  return FIS_NATIONS[nation];
}

/** Country name for a FIS nation code in the given language. */
export function getNationName(lang: string, nation: string): string {
  const countryCode = FIS_NATIONS[nation];

  return countryCode
    ? (new Intl.DisplayNames([lang], { type: 'region' }).of(countryCode) ??
        nation)
    : nation;
}
