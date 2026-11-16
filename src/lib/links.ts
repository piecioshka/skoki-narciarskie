import type { Broadcaster, Competition, Season, SeasonEvent } from './schema';

const FIS = 'https://www.fis-ski.com/DB';

export const FIS_LIVE_URL = `${FIS}/ski-jumping/live.html`;

/** FIS page of a single competition: start list, live scoring link, results. */
export function getResultsUrl(competition: Competition): string {
  return `${FIS}/general/results.html?sectorcode=JP&raceid=${competition.fisRaceId}`;
}

export function getFisEventUrl(season: Season, event: SeasonEvent): string {
  const seasonCode = season.id.slice(5);

  return `${FIS}/general/event-details.html?sectorcode=JP&eventid=${event.fisEventId}&seasoncode=${seasonCode}`;
}

export function getBroadcasters(
  season: Season,
  event: SeasonEvent,
): Broadcaster[] {
  return event.broadcasts.flatMap((id) => {
    const broadcaster = season.broadcasters[id];

    return broadcaster ? [broadcaster] : [];
  });
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
