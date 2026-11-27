const MINUTE = 60_000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Offset of a time zone from UTC, in minutes, at the given instant.
 * `Intl` is used only to read the zone rules, never to format dates for UI.
 */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );

  return Math.round((asUtc - instant.getTime()) / MINUTE);
}

/** Converts a wall-clock date and time in a time zone to an instant. */
export function zonedTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const wallClock = new Date(`${date}T${time}:00Z`).getTime();
  const firstGuess = new Date(
    wallClock - zoneOffsetMinutes(new Date(wallClock), timeZone) * MINUTE,
  );

  // The second pass fixes instants that fall next to a DST change.
  return new Date(wallClock - zoneOffsetMinutes(firstGuess, timeZone) * MINUTE);
}

/** Formats an instant as `YYYY-MM-DD HH:mm` in the given time zone. */
export function formatInZone(instant: Date, timeZone: string): string {
  const shifted = new Date(
    instant.getTime() + zoneOffsetMinutes(instant, timeZone) * MINUTE,
  );

  return shifted.toISOString().slice(0, 16).replace('T', ' ');
}

/** True when both instants fall on the same calendar day of the runtime. */
export function isSameLocalDay(a: Date, b: Date): boolean {
  return formatLocal(a).slice(0, 10) === formatLocal(b).slice(0, 10);
}

/** Formats an instant as `YYYY-MM-DD HH:mm` in the runtime's own time zone. */
export function formatLocal(instant: Date): string {
  const date = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;

  return `${date} ${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);

  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Day of the week of an ISO date: 0 is Sunday, 6 is Saturday. */
export function weekdayIndex(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdown(now: Date, target: Date): Countdown {
  const total = Math.max(
    0,
    Math.floor((target.getTime() - now.getTime()) / 1000),
  );

  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
