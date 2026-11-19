import { describe, expect, it } from 'vitest';
import {
  pickVideoType,
  posterFileName,
  posterSize,
  seededRandom,
  splitAtHyphens,
  videoExtension,
} from './poster';

describe('posterSize', () => {
  it('gives a phone story in portrait and Full HD in landscape', () => {
    expect(posterSize('story')).toEqual({ width: 1080, height: 1920 });
    expect(posterSize('wide')).toEqual({ width: 1920, height: 1080 });
  });
});

describe('pickVideoType', () => {
  it('prefers MP4, which Instagram accepts', () => {
    expect(pickVideoType(() => true)).toBe('video/mp4;codecs=avc1.640028');
  });

  it('falls back to WebM', () => {
    expect(pickVideoType((type) => type.startsWith('video/webm'))).toBe(
      'video/webm;codecs=vp9',
    );
  });

  it('gives nothing when the browser cannot record', () => {
    expect(pickVideoType(() => false)).toBeUndefined();
  });
});

describe('videoExtension', () => {
  it('follows the container', () => {
    expect(videoExtension('video/mp4;codecs=avc1')).toBe('mp4');
    expect(videoExtension('video/webm')).toBe('webm');
  });
});

describe('posterFileName', () => {
  it('names the event, the day and the format', () => {
    expect(
      posterFileName(
        'lillehammer',
        new Date('2026-11-20T13:00:00Z'),
        'story',
        'png',
      ),
    ).toBe('countdown-lillehammer-2026-11-20-story.png');
  });
});

describe('splitAtHyphens', () => {
  it('keeps the hyphen at the end of the first line', () => {
    expect(splitAtHyphens('GARMISCH-PARTENKIRCHEN')).toEqual([
      'GARMISCH-',
      'PARTENKIRCHEN',
    ]);
    expect(splitAtHyphens('RUKA')).toEqual(['RUKA']);
  });
});

describe('seededRandom', () => {
  it('repeats the same numbers for the same seed', () => {
    const first = seededRandom(7);
    const second = seededRandom(7);
    const values = [first(), first(), first()];

    expect([second(), second(), second()]).toEqual(values);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
