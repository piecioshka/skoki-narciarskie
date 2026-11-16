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
