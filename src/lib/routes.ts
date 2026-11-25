import type { t } from '../i18n';
import type { rules } from '../i18n/rules';

/** The identity of one page of the site, without language and base path. */
export type Route =
  | { name: 'home' }
  | { name: 'season'; seasonId: string }
  | { name: 'event'; seasonId: string; slug: string }
  | { name: 'standings'; seasonId: string }
  | { name: 'gallery'; seasonId: string }
  | { name: 'tournaments' }
  | { name: 'tournament'; slug: string }
  | { name: 'hills' }
  | { name: 'hill'; slug: string }
  | { name: 'nations' }
  | { name: 'nation'; nation: string }
  | { name: 'rules' }
  | { name: 'credits' }
  | { name: 'countdown' };

export type NavSection =
  | 'schedule'
  | 'standings'
  | 'gallery'
  | 'hills'
  | 'nations'
  | 'tournaments'
  | 'rules';

/** Page path without the language prefix, e.g. `/2026-2027/wisla/`. */
export function routePath(route: Route): string {
  switch (route.name) {
    case 'home':
      return '/';
    case 'season':
      return `/${route.seasonId}/`;
    case 'event':
      return `/${route.seasonId}/${route.slug}/`;
    case 'standings':
      return `/${route.seasonId}/standings/`;
    case 'gallery':
      return `/${route.seasonId}/gallery/`;
    case 'tournaments':
      return '/tournaments/';
    case 'tournament':
      return `/tournaments/${route.slug}/`;
    case 'hills':
      return '/hills/';
    case 'hill':
      return `/hills/${route.slug}/`;
    case 'nations':
      return '/nations/';
    case 'nation':
      return `/nations/${route.nation.toLowerCase()}/`;
    case 'rules':
      return '/rules/';
    case 'credits':
      return '/credits/';
    case 'countdown':
      return '/countdown/';
  }
}

/** The nav section a page belongs to; home, credits and countdown have none. */
export function sectionOf(route: Route): NavSection | undefined {
  switch (route.name) {
    case 'season':
    case 'event':
      return 'schedule';
    case 'standings':
    case 'gallery':
    case 'tournaments':
    case 'hills':
    case 'nations':
    case 'rules':
      return route.name;
    case 'tournament':
      return 'tournaments';
    case 'hill':
      return 'hills';
    case 'nation':
      return 'nations';
    case 'home':
    case 'credits':
    case 'countdown':
      return undefined;
  }
}

/** Prefixes an absolute site path with a base such as `/` or `/repo/`. */
export function withBase(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

interface NavTexts {
  dict: ReturnType<typeof t>;
  rules: (typeof rules)[keyof typeof rules];
}

interface NavEntry {
  section: NavSection;
  /** Key that follows the link, listed in the `?` cheat sheet. */
  shortcut: string;
  /** The section's landing page; the season ones point at the current season. */
  route: (seasonId: string) => Route;
  label: (texts: NavTexts) => string;
  hint: (texts: NavTexts) => string;
}

/** The top bar sections in display order. */
export const NAV: readonly NavEntry[] = [
  {
    section: 'schedule',
    shortcut: 's',
    route: (seasonId) => ({ name: 'season', seasonId }),
    label: ({ dict }) => dict.navSchedule,
    hint: ({ dict }) => dict.shortcuts.schedule,
  },
  {
    section: 'standings',
    shortcut: 'r',
    route: (seasonId) => ({ name: 'standings', seasonId }),
    label: ({ dict }) => dict.navStandings,
    hint: ({ dict }) => dict.shortcutStandings,
  },
  {
    section: 'gallery',
    shortcut: 'g',
    route: (seasonId) => ({ name: 'gallery', seasonId }),
    label: ({ dict }) => dict.navGallery,
    hint: ({ dict }) => dict.shortcutGallery,
  },
  {
    section: 'hills',
    shortcut: 'k',
    route: () => ({ name: 'hills' }),
    label: ({ dict }) => dict.navHills,
    hint: ({ dict }) => dict.shortcutHills,
  },
  {
    section: 'nations',
    shortcut: 'n',
    route: () => ({ name: 'nations' }),
    label: ({ dict }) => dict.nationsTitle,
    hint: ({ dict }) => dict.shortcutNations,
  },
  {
    section: 'tournaments',
    shortcut: 'u',
    route: () => ({ name: 'tournaments' }),
    label: ({ dict }) => dict.navTournaments,
    hint: ({ dict }) => dict.shortcutTournaments,
  },
  {
    section: 'rules',
    shortcut: 'z',
    route: () => ({ name: 'rules' }),
    label: ({ rules }) => rules.nav,
    hint: ({ rules }) => rules.title,
  },
];
