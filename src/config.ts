export const REPOSITORY_URL = 'https://github.com/piecioshka/skoki-narciarskie';

// Author of the handwritten season programs the schedule starts from.
export const SOURCE_AUTHOR_URL =
  'https://www.facebook.com/profile.php?id=100064595445494';

export const STORAGE_KEYS = {
  theme: 'ski-jumping:theme',
  lang: 'ski-jumping:lang',
  homeOnly: 'ski-jumping:home-only',
  posterFormat: 'ski-jumping:poster-format',
  startAlerts: 'ski-jumping:start-alerts',
  startAlertsShown: 'ski-jumping:start-alerts-shown',
  // Versioned: a change of the entry shape gets a new key instead of a
  // migration, the log is disposable.
  alertLog: 'ski-jumping:alert-log:v1',
} as const;
