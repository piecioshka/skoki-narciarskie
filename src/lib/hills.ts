import { z } from 'zod';
import rawHills from '../data/hills.json';
import { hillSchema, type Hill } from './schema';

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
