import { z } from 'zod';
import rawHills from '../data/hills.json';
import { describeHill } from './schedule';
import { hillSchema, type Hill, type SeasonEvent } from './schema';

const hills: Hill[] = z.array(hillSchema).parse(rawHills);

/** Hills used by an event, smallest first (Falun has two). */
export function getHills(eventSlug: string): Hill[] {
  return hills
    .filter((hill) => hill.eventSlug === eventSlug)
    .sort((a, b) => a.hillSize - b.hillSize);
}

/** Formats a number with a decimal comma for Polish and a point for English. */
export function formatNumber(value: number, lang: 'pl' | 'en'): string {
  const text = String(value);

  return lang === 'pl' ? text.replace('.', ',') : text;
}

/** Groups thousands with a non-breaking space, e.g. 26 000. */
export function formatThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+$)/g, '\u00a0');
}

/** Hills of the venue that match the kind of the event (flying or not). */
export function getEventHills(event: SeasonEvent): Hill[] {
  // A second visit to the same town in one season gets a numbered slug.
  const flying = event.tags.includes('ski-flying');

  return getHills(event.slug.replace(/-\d+$/, '')).filter(
    (hill) => hill.hillSize >= 185 === flying,
  );
}

/**
 * Hill line of an event. Imported seasons have neither a hill name nor a hill
 * size, so the name comes from the hill data and the type from FIS.
 */
export function describeEventHill(
  event: SeasonEvent,
  typeLabels: Record<'normal' | 'large' | 'flying', string>,
): string {
  const own = describeHill(event);

  if (own) {
    return own;
  }

  const names = [...new Set(getEventHills(event).map((hill) => hill.name))];
  const types = [
    ...new Set(
      event.competitions.flatMap((item) =>
        item.hillType ? [typeLabels[item.hillType]] : [],
      ),
    ),
  ];

  return [names.join(', '), types.join(', ')].filter(Boolean).join(' · ');
}
