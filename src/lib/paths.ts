import type { Lang } from '../i18n';

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefixes an absolute site path with the deployment base path. */
export function url(path: string): string {
  return `${base}${path}`;
}

export function homePath(lang: Lang): string {
  return url(`/${lang}/`);
}

export function seasonPath(lang: Lang, seasonId: string): string {
  return url(`/${lang}/${seasonId}/`);
}

export function eventPath(lang: Lang, seasonId: string, slug: string): string {
  return url(`/${lang}/${seasonId}/${slug}/`);
}

export function calendarPath(lang: Lang, seasonId: string): string {
  return url(`/${lang}/${seasonId}/calendar.ics`);
}
