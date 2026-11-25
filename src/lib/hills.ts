import type { ImageMetadata } from 'astro';
import { z } from 'zod';
import rawHills from '../data/hills.json';
import {
  hillSchema,
  type Competition,
  type Hill,
  type SeasonEvent,
} from './schema';

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

/** Ski flying hills are HS185 and above; every other hill is below that. */
const FLYING_MIN_HILL_SIZE = 185;

/**
 * Slug of the town an event is held in: a second visit to the same town in
 * one season gets a numbered slug ("zakopane-2").
 */
function venueSlug(event: SeasonEvent): string {
  return event.slug.replace(/-\d+$/, '');
}

function isFlyingEvent(event: SeasonEvent): boolean {
  return event.tags.includes('ski-flying');
}

/**
 * Key of the venue of an event: its town and whether it is ski flying, since
 * ski flying is held on a different hill than the other events of a town.
 */
export function venueKey(event: SeasonEvent): string {
  return `${venueSlug(event)}:${isFlyingEvent(event) ? 'flying' : 'hill'}`;
}

/** Hills of the venue that match the kind of the event, smallest first. */
export function getEventHills(event: SeasonEvent): Hill[] {
  const flying = isFlyingEvent(event);

  return getHills(venueSlug(event)).filter(
    (hill) => hill.hillSize >= FLYING_MIN_HILL_SIZE === flying,
  );
}

/** Distinct hill sizes of the competitions of an event, smallest first. */
export function getHillSizes(event: SeasonEvent): number[] {
  const sizes = event.competitions.flatMap((item) =>
    item.hillSize === null ? [] : [item.hillSize],
  );

  return [...new Set(sizes)].sort((a, b) => a - b);
}

/** The hill a competition is held on: the venue hill of the same size. */
export function hillOfCompetition(
  event: SeasonEvent,
  competition: Pick<Competition, 'hillSize'>,
): Hill | undefined {
  return getEventHills(event).find(
    (hill) => hill.hillSize === competition.hillSize,
  );
}

/**
 * The hill that stands for a whole event (photo, map point): the largest hill
 * its competitions use, or the largest venue hill when no size is known.
 */
export function hillOfEvent(event: SeasonEvent): Hill | undefined {
  const venueHills = getEventHills(event);
  const sizes = getHillSizes(event);
  const used = venueHills.filter((hill) => sizes.includes(hill.hillSize));

  return (used.length > 0 ? used : venueHills).at(-1);
}

/** "HS142 (K120)": the K-point is shown wherever the hill size is. */
export function formatHillSize(
  hill: Pick<Hill, 'hillSize' | 'kPoint'>,
): string {
  return `HS${hill.hillSize} (K${hill.kPoint})`;
}

/**
 * Size of a hill used by an event, with its K-point when the hill data knows
 * a hill of that size there.
 */
function hillSizeLabel(event: SeasonEvent, size: number): string {
  const hill = hillOfCompetition(event, { hillSize: size });

  return hill ? formatHillSize(hill) : `HS${size}`;
}

export type HillTypeLabels = Record<'normal' | 'large' | 'flying', string>;

/**
 * Hill of a competition as a label: "HS142 (K120)", plain "HS142" when the
 * hill data has no hill of that size, the hill type when the size is unknown,
 * and an empty string when neither is known.
 */
export function competitionHillLabel(
  event: SeasonEvent,
  competition: Pick<Competition, 'hillSize' | 'hillType'>,
  typeLabels: HillTypeLabels,
): string {
  if (competition.hillSize !== null) {
    return hillSizeLabel(event, competition.hillSize);
  }
  return competition.hillType ? typeLabels[competition.hillType] : '';
}

/**
 * Hill line of an event. Imported seasons have neither a hill name nor a hill
 * size, so the name comes from the hill data and the type from FIS.
 */
export function describeEventHill(
  event: SeasonEvent,
  typeLabels: HillTypeLabels,
): string {
  const sizes = getHillSizes(event).map((size) => hillSizeLabel(event, size));
  const own = [event.hillName, sizes.join(', ')].filter(Boolean).join(' · ');

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

const photos = import.meta.glob<ImageMetadata>(
  '../assets/hills/*.{jpg,jpeg,png,webp}',
  { eager: true, import: 'default' },
);

export function getAllHills(): Hill[] {
  return hills.toSorted((a, b) => a.name.localeCompare(b.name));
}

export function getHillPhoto(hill: Hill): ImageMetadata | undefined {
  return hill.photo ? photos[`../assets/hills/${hill.photo.file}`] : undefined;
}

/** URL slug of a hill profile, built from the hill name. */
export function getHillProfileSlug(hill: Hill): string {
  const base = hill.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const shared = hills.filter((item) => item.name === hill.name).length > 1;

  return shared ? `${base}-hs${hill.hillSize}` : base;
}

/** Whether a hill is the one an event of any season was held on. */
export function isEventHill(hill: Hill, event: SeasonEvent): boolean {
  return getEventHills(event).some((item) => item.slug === hill.slug);
}

export interface HillPoint {
  lat: number;
  lon: number;
  hills: Hill[];
}

/** Hills grouped by location, so two hills of one venue share a marker. */
export function groupByLocation(items: Hill[]): HillPoint[] {
  const points = new Map<string, HillPoint>();

  for (const hill of items) {
    if (hill.lat !== null && hill.lon !== null) {
      const key = `${hill.lat},${hill.lon}`;
      const point = points.get(key) ?? {
        lat: hill.lat,
        lon: hill.lon,
        hills: [],
      };

      point.hills.push(hill);
      points.set(key, point);
    }
  }
  return [...points.values()];
}
