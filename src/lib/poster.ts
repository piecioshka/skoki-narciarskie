export type PosterFormat = 'wide' | 'story';

export const POSTER_VIDEO_SECONDS = 15;

/** Pixel size of an exported poster: Full HD, landscape or a phone story. */
export function posterSize(format: PosterFormat): {
  width: number;
  height: number;
} {
  return format === 'story'
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

// Instagram takes MP4 only, so MP4 wins wherever the browser can record it.
const VIDEO_TYPES = [
  'video/mp4;codecs=avc1.640028',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm',
];

export function pickVideoType(
  isSupported: (type: string) => boolean,
): string | undefined {
  return VIDEO_TYPES.find((type) => isSupported(type));
}

export function videoExtension(type: string): string {
  return type.startsWith('video/mp4') ? 'mp4' : 'webm';
}

/** File name such as `countdown-lillehammer-2026-11-20-story.png`. */
export function posterFileName(
  slug: string,
  start: Date,
  format: PosterFormat,
  extension: string,
): string {
  return `countdown-${slug}-${start.toISOString().slice(0, 10)}-${format}.${extension}`;
}

/**
 * Splits a city name that is too wide for one line after its hyphens, e.g.
 * "GARMISCH-PARTENKIRCHEN" into "GARMISCH-" and "PARTENKIRCHEN".
 */
export function splitAtHyphens(text: string): string[] {
  return text.split(/(?<=-)/);
}

/** Deterministic pseudo random numbers, so the snow looks the same each time. */
export function seededRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}
