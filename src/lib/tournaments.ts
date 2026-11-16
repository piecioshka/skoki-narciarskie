import type { ImageMetadata } from 'astro';
import { z } from 'zod';
import rawTournaments from '../data/tournaments.json';
import { tournamentSchema, type Tournament } from './schema';

const tournaments: Tournament[] = z
  .array(tournamentSchema)
  .parse(rawTournaments);

export function getTournaments(): Tournament[] {
  return tournaments;
}

/** Tournaments that a given event of a season belongs to. */
export function getEventTournaments(
  seasonId: string,
  eventSlug: string,
): Tournament[] {
  return tournaments.filter((tournament) =>
    (tournament.events[seasonId] ?? []).includes(eventSlug),
  );
}

const photos = import.meta.glob<ImageMetadata>(
  '../assets/tournaments/*.{jpg,jpeg,png,webp}',
  { eager: true, import: 'default' },
);

export function getTournamentPhoto(
  tournament: Tournament,
): ImageMetadata | undefined {
  return tournament.photo
    ? photos[`../assets/tournaments/${tournament.photo.file}`]
    : undefined;
}
