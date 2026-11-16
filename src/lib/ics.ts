import { t, type Lang } from '../i18n';
import { getResultsUrl } from './links';
import type { Season } from './schema';
import { listCompetitions, type ScheduledCompetition } from './schedule';
import { formatSeasonLabel } from './seasons';
import { addDays } from './time';

function escapeText(value: string): string {
  return value.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\n/g, '\\n');
}

function formatInstant(instant: Date): string {
  return `${instant.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

function formatDay(date: string): string {
  return date.replaceAll('-', '');
}

function buildEvent(
  item: ScheduledCompetition,
  lang: Lang,
  stamp: string,
): string[] {
  const { event, competition, slot } = item;
  const dict = t(lang);
  const summary = `${event.city}: ${dict.kinds[competition.kind]} (HS${competition.hillSize})`;
  const when = slot.timed
    ? [
        `DTSTART:${formatInstant(slot.start)}`,
        `DTEND:${formatInstant(slot.end)}`,
      ]
    : [
        `DTSTART;VALUE=DATE:${formatDay(competition.date)}`,
        `DTEND;VALUE=DATE:${formatDay(addDays(competition.date, 1))}`,
      ];

  return [
    'BEGIN:VEVENT',
    `UID:fis-race-${competition.fisRaceId}@skoki-narciarskie`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${escapeText(summary)}`,
    `LOCATION:${escapeText(`${event.hillName}, ${event.city}`)}`,
    `DESCRIPTION:${escapeText(`${dict.types[event.type]}\n${getResultsUrl(competition)}`)}`,
    `URL:${getResultsUrl(competition)}`,
    `STATUS:${competition.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
  ];
}

/** Builds an iCalendar feed with every competition of the season. */
export function buildCalendar(season: Season, lang: Lang, now: Date): string {
  const stamp = formatInstant(now);
  const name = `${t(lang).siteName} ${formatSeasonLabel(season.id)}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//skoki-narciarskie//schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...listCompetitions(season).flatMap((item) =>
      buildEvent(item, lang, stamp),
    ),
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}
