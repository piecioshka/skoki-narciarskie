import type { ImageMetadata } from 'astro';
import { z } from 'zod';
import rawAvatars from '../data/avatars.json';

// Portraits of athletes and coaches from Wikimedia Commons, keyed by the
// person's name without diacritics (FIS spells names in plain ASCII).
const avatarSchema = z.record(
  z.string(),
  z.object({
    file: z.string().min(1),
    author: z.string().min(1),
    license: z.string().min(1),
    sourceUrl: z.url(),
  }),
);
const avatars = avatarSchema.parse(rawAvatars);
const images = import.meta.glob<ImageMetadata>(
  '../assets/people/*.{jpg,jpeg,png,webp}',
  { eager: true, import: 'default' },
);

/** Folds a name to the key used in avatars.json: "Piotr Żyła" -> "piotr zyla". */
export function toPersonKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getAvatar(name: string): ImageMetadata | undefined {
  const avatar = avatars[toPersonKey(name)];

  return avatar ? images[`../assets/people/${avatar.file}`] : undefined;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function getAvatarCredits() {
  return Object.entries(avatars).map(([key, avatar]) => ({
    subject: key.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()),
    ...avatar,
  }));
}
