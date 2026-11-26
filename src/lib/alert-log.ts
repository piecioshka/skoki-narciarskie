// The log of notifications this browser has shown, kept in localStorage: the
// site is static, so there is no server that could remember them.

/** Old entries are dropped, so the log in storage stays small. */
export const ALERT_LOG_LIMIT = 200;

export const ALERT_KINDS = ['start'] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_OUTCOMES = ['shown', 'error'] as const;
export type AlertOutcome = (typeof ALERT_OUTCOMES)[number];

export interface AlertLogEntry {
  /** Id of the notification, e.g. the id of the competition start. */
  id: string;
  /** When the notification fired, as an ISO instant. */
  at: string;
  kind: AlertKind;
  title: string;
  body: string;
  /** Page of this site the notification leads to. */
  url: string;
  outcome: AlertOutcome;
}

function isKind(value: unknown): value is AlertKind {
  return ALERT_KINDS.some((kind) => kind === value);
}

function isOutcome(value: unknown): value is AlertOutcome {
  return ALERT_OUTCOMES.some((outcome) => outcome === value);
}

function isEntry(value: unknown): value is AlertLogEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const texts = ['id', 'at', 'title', 'body', 'url'].every(
    (key) => typeof Reflect.get(value, key) === 'string',
  );

  return (
    texts &&
    !Number.isNaN(Date.parse(String(Reflect.get(value, 'at')))) &&
    isKind(Reflect.get(value, 'kind')) &&
    isOutcome(Reflect.get(value, 'outcome'))
  );
}

/** Reads the stored log, skipping anything that is not a valid entry. */
export function parseAlertLog(text: string | null): AlertLogEntry[] {
  try {
    const parsed: unknown = JSON.parse(text ?? '[]');

    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Puts the entry first (the log is newest first) and drops the oldest. */
export function addToAlertLog(
  entries: readonly AlertLogEntry[],
  entry: AlertLogEntry,
  limit: number = ALERT_LOG_LIMIT,
): AlertLogEntry[] {
  return [entry, ...entries].slice(0, limit);
}

// Pages are plain paths such as /pl/2026-2027/ruka/ (with the base path in
// front on GitHub Pages).
const SITE_PATH = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/;

/**
 * True for a path of a page of this site. Addresses from page data and from
 * storage go through this check, so a full URL or a `javascript:` one is
 * never opened or linked.
 */
export function isSitePath(target: string): boolean {
  return SITE_PATH.test(target);
}
