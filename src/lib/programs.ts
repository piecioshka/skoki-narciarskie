import type { ImageMetadata } from 'astro';
import { z } from 'zod';
import { programSchema, type Program } from './schema';

// Metadata lives in src/data/programs/<season>.json, the scans next to it in
// src/assets/programs/<season>/ so that Astro can resize them at build time.
const metaFiles = import.meta.glob('../data/programs/*.json', {
  eager: true,
  import: 'default',
});
const images = import.meta.glob<ImageMetadata>(
  '../assets/programs/*/*.{png,jpg,jpeg,webp}',
  { eager: true, import: 'default' },
);

export interface ProgramSheet extends Program {
  image: ImageMetadata;
}

export function getPrograms(seasonId: string): ProgramSheet[] {
  const raw = metaFiles[`../data/programs/${seasonId}.json`];

  if (raw === undefined) {
    return [];
  }
  return z
    .array(programSchema)
    .parse(raw)
    .map((program) => {
      const image = images[`../assets/programs/${seasonId}/${program.file}`];

      if (!image) {
        throw new Error(`Missing program scan: ${seasonId}/${program.file}`);
      }
      return { ...program, image };
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
