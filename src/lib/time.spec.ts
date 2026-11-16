import { describe, expect, it } from 'vitest';
import { addDays, countdown, formatInZone, zonedTimeToUtc } from './time';

describe('zonedTimeToUtc', () => {
  it('converts winter time in Central Europe', () => {
    const instant = zonedTimeToUtc('2026-11-21', '16:50', 'Europe/Oslo');

    expect(instant.toISOString()).toBe('2026-11-21T15:50:00.000Z');
  });

  it('converts a zone ahead of UTC across midnight', () => {
    const instant = zonedTimeToUtc('2027-01-24', '09:30', 'Asia/Tokyo');

    expect(instant.toISOString()).toBe('2027-01-24T00:30:00.000Z');
  });

  it('converts a zone behind UTC', () => {
    const instant = zonedTimeToUtc('2027-02-06', '18:00', 'America/New_York');

    expect(instant.toISOString()).toBe('2027-02-06T23:00:00.000Z');
  });

  it('uses summer time after the DST change', () => {
    const instant = zonedTimeToUtc('2027-03-28', '12:00', 'Europe/Warsaw');

    expect(instant.toISOString()).toBe('2027-03-28T10:00:00.000Z');
  });
});

describe('formatInZone', () => {
  it('formats an instant as ISO date and 24-hour time', () => {
    const instant = new Date('2027-01-24T00:30:00Z');

    expect(formatInZone(instant, 'Europe/Warsaw')).toBe('2027-01-24 01:30');
    expect(formatInZone(instant, 'Asia/Tokyo')).toBe('2027-01-24 09:30');
  });
});

describe('addDays', () => {
  it('rolls over the year', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('countdown', () => {
  it('splits the remaining time into units', () => {
    const now = new Date('2026-11-20T10:00:00Z');
    const target = new Date('2026-11-21T15:50:30Z');

    expect(countdown(now, target)).toEqual({
      days: 1,
      hours: 5,
      minutes: 50,
      seconds: 30,
    });
  });

  it('never goes below zero', () => {
    const now = new Date('2026-11-22T00:00:00Z');
    const target = new Date('2026-11-21T00:00:00Z');

    expect(countdown(now, target)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
