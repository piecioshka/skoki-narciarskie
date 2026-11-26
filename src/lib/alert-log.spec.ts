import { describe, expect, it } from 'vitest';
import {
  addToAlertLog,
  ALERT_LOG_LIMIT,
  isSitePath,
  parseAlertLog,
  type AlertLogEntry,
} from './alert-log';

function entry(
  id: string,
  overrides: Partial<AlertLogEntry> = {},
): AlertLogEntry {
  return {
    id,
    at: '2026-11-21T15:51:00.000Z',
    kind: 'start',
    title: 'Competition started: Lillehammer',
    body: 'Individual HS140.',
    url: '/en/2026-2027/lillehammer/',
    outcome: 'shown',
    ...overrides,
  };
}

describe('parseAlertLog', () => {
  it('reads back what was stored', () => {
    const entries = [entry('a'), entry('b', { outcome: 'error' })];

    expect(parseAlertLog(JSON.stringify(entries))).toEqual(entries);
  });

  it('gives an empty log for missing or broken storage', () => {
    expect(parseAlertLog(null)).toEqual([]);
    expect(parseAlertLog('{not json')).toEqual([]);
    expect(parseAlertLog('{"id":"a"}')).toEqual([]);
  });

  it('skips entries with a wrong shape', () => {
    const stored = [
      entry('ok'),
      null,
      'text',
      { ...entry('no-title'), title: 5 },
      { ...entry('bad-kind'), kind: 'weather' },
      { ...entry('bad-outcome'), outcome: 'maybe' },
      { ...entry('bad-time'), at: 'yesterday' },
    ];

    expect(
      parseAlertLog(JSON.stringify(stored)).map((item) => item.id),
    ).toEqual(['ok']);
  });
});

describe('addToAlertLog', () => {
  it('puts the new entry first', () => {
    const log = addToAlertLog([entry('old')], entry('new'));

    expect(log.map((item) => item.id)).toEqual(['new', 'old']);
  });

  it('does not change the given log', () => {
    const before = [entry('old')];

    addToAlertLog(before, entry('new'));
    expect(before).toHaveLength(1);
  });

  it('drops the oldest entries above the limit', () => {
    const log = addToAlertLog([entry('b'), entry('a')], entry('c'), 2);

    expect(log.map((item) => item.id)).toEqual(['c', 'b']);
  });

  it('keeps at most the default limit', () => {
    const full = Array.from({ length: ALERT_LOG_LIMIT }, (_, index) =>
      entry(String(index)),
    );

    expect(addToAlertLog(full, entry('new'))).toHaveLength(ALERT_LOG_LIMIT);
  });
});

describe('isSitePath', () => {
  it.each(['/pl/2026-2027/ruka/', '/skoki-narciarskie/en/2026-2027/wisla/'])(
    'accepts the page path %s',
    (path) => {
      expect(isSitePath(path)).toBe(true);
    },
  );

  it.each([
    'https://example.com/pl/',
    '//example.com/pl/',
    'javascript:alert(1)',
    '/pl/2026-2027/ruka',
    '/pl/?next=/en/',
    '',
  ])('rejects %s', (path) => {
    expect(isSitePath(path)).toBe(false);
  });
});
