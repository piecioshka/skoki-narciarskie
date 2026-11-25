import type { Lang } from '../i18n';
import { routePath, withBase, type Route } from './routes';

/** Prefixes an absolute site path with the deployment base path. */
export function url(path: string): string {
  return withBase(import.meta.env.BASE_URL, path);
}

/** The address of a page in one language, with the base path. */
export function routeUrl(lang: Lang, route: Route): string {
  return url(`/${lang}${routePath(route)}`);
}

export function homePath(lang: Lang): string {
  return routeUrl(lang, { name: 'home' });
}

export function seasonPath(lang: Lang, seasonId: string): string {
  return routeUrl(lang, { name: 'season', seasonId });
}

export function eventPath(lang: Lang, seasonId: string, slug: string): string {
  return routeUrl(lang, { name: 'event', seasonId, slug });
}

export function calendarPath(lang: Lang, seasonId: string): string {
  return url(`/${lang}/${seasonId}/calendar.ics`);
}

export function tournamentsPath(lang: Lang): string {
  return routeUrl(lang, { name: 'tournaments' });
}

export function tournamentPath(lang: Lang, slug: string): string {
  return routeUrl(lang, { name: 'tournament', slug });
}

export function hillsPath(lang: Lang): string {
  return routeUrl(lang, { name: 'hills' });
}

export function hillPath(lang: Lang, slug: string): string {
  return routeUrl(lang, { name: 'hill', slug });
}

export function creditsPath(lang: Lang): string {
  return routeUrl(lang, { name: 'credits' });
}

export function nationsPath(lang: Lang): string {
  return routeUrl(lang, { name: 'nations' });
}

export function nationPath(lang: Lang, nation: string): string {
  return routeUrl(lang, { name: 'nation', nation });
}

export function countdownPath(lang: Lang): string {
  return routeUrl(lang, { name: 'countdown' });
}
