import { hillSizeLabel } from './hills';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import { eventPath } from './paths';
import { COMPETITION_DURATION_MINUTES, listCompetitions } from './schedule';
import type { Season } from './schema';

// A background tab runs timers late (even once a minute), and a page opened
// just after the start should still announce it, so a start stays "due" for a
// while instead of only in the exact second.
export const START_ALERT_WINDOW_MINUTES = 10;

export interface StartAlert {
  /** Stable across pages and tabs, so one start is announced once. */
  id: string;
  start: string;
  title: string;
  body: string;
  url: string;
}

/** Timed, not cancelled competitions of the season (trainings skipped). */
export function buildStartAlerts(season: Season, lang: Lang): StartAlert[] {
  const dict = t(lang);

  return listCompetitions(season)
    .filter(
      ({ competition, slot }) =>
        slot.timed &&
        competition.kind !== 'training' &&
        competition.status !== 'cancelled',
    )
    .map(({ event, competition, slot }) => ({
      id: `${season.id}/${event.slug}/${competition.date}/${competition.kind}/${competition.time}`,
      start: slot.start.toISOString(),
      title: `${dict.startAlertTitle}: ${event.city}`,
      body: `${dict.kinds[competition.kind]}${
        competition.hillSize === null
          ? ''
          : ` ${hillSizeLabel(event, competition.hillSize)}`
      }. ${dict.startAlertBody}`,
      url: eventPath(lang, season.id, event.slug),
    }));
}

/** Alerts whose start has just passed and that were not shown yet. */
export function findDueAlerts(
  alerts: StartAlert[],
  now: Date,
  shown: ReadonlySet<string>,
): StartAlert[] {
  const windowStart = now.getTime() - START_ALERT_WINDOW_MINUTES * 60_000;

  return alerts.filter((alert) => {
    const start = Date.parse(alert.start);

    return (
      start <= now.getTime() && start > windowStart && !shown.has(alert.id)
    );
  });
}

/** True while any competition is between its start and its expected end. */
export function isAnyLive(alerts: StartAlert[], now: Date): boolean {
  return alerts.some((alert) => {
    const start = Date.parse(alert.start);

    return (
      start <= now.getTime() &&
      now.getTime() < start + COMPETITION_DURATION_MINUTES * 60_000
    );
  });
}
