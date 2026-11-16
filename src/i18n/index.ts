import type { CompetitionKind, EventTag, SeasonEvent } from '../lib/schema';
import type { Phase } from '../lib/schedule';

export const LANGUAGES = ['pl', 'en'] as const;
export type Lang = (typeof LANGUAGES)[number];

export function isLang(value: string | undefined): value is Lang {
  return LANGUAGES.some((lang) => lang === value);
}

export function otherLang(lang: Lang): Lang {
  return lang === 'pl' ? 'en' : 'pl';
}

interface Dictionary {
  siteName: string;
  siteDescription: string;
  skipToContent: string;
  navSchedule: string;
  switchLanguage: string;
  switchTheme: string;
  repository: string;
  shortcutsButton: string;
  nextCompetition: string;
  upcomingEvents: string;
  fullSchedule: string;
  seasonOver: string;
  scheduleTitle: (season: string) => string;
  scheduleLead: string;
  season: string;
  watch: string;
  broadcastUnknown: string;
  liveResults: string;
  results: string;
  eventPage: string;
  fisEventPage: string;
  program: string;
  timeUnknown: string;
  timeZoneNote: string;
  addToCalendar: string;
  backToSchedule: string;
  hill: string;
  kinds: Record<CompetitionKind, string>;
  tags: Record<EventTag, string>;
  types: Record<SeasonEvent['type'], string>;
  phases: Record<Phase, string>;
  statuses: { cancelled: string; moved: string };
  countdownUnits: {
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
  };
  startsIn: string;
  footerSource: string;
  footerSourceLink: string;
  footerData: string;
  notFoundTitle: string;
  notFoundLead: string;
  goHome: string;
  shortcutsTitle: string;
  shortcutsClose: string;
  shortcuts: {
    help: string;
    theme: string;
    language: string;
    home: string;
    schedule: string;
  };
}

const pl: Dictionary = {
  siteName: 'Skoki narciarskie',
  siteDescription:
    'Terminarz Pucharu Świata w skokach narciarskich: daty i godziny konkursów, linki do transmisji i wyników na żywo.',
  skipToContent: 'Przejdź do treści',
  navSchedule: 'Terminarz',
  switchLanguage: 'Switch to English',
  switchTheme: 'Przełącz motyw',
  repository: 'Repozytorium na GitHubie',
  shortcutsButton: 'Skróty klawiaturowe',
  nextCompetition: 'Najbliższy konkurs',
  upcomingEvents: 'Kolejne zawody',
  fullSchedule: 'Cały terminarz',
  seasonOver: 'Sezon zakończony. Wszystkie konkursy znajdziesz w terminarzu.',
  scheduleTitle: (season) => `Terminarz sezonu ${season}`,
  scheduleLead: 'Puchar Świata mężczyzn i Mistrzostwa Świata.',
  season: 'Sezon',
  watch: 'Transmisja',
  broadcastUnknown: 'Nadawca nie jest jeszcze znany',
  liveResults: 'Wyniki na żywo',
  results: 'Wyniki',
  eventPage: 'Program zawodów',
  fisEventPage: 'Strona zawodów w FIS',
  program: 'Program',
  timeUnknown: 'godzina nieznana',
  timeZoneNote: 'Godziny w strefie czasowej:',
  addToCalendar: 'Dodaj do kalendarza (ICS)',
  backToSchedule: 'Wróć do terminarza',
  hill: 'Skocznia',
  kinds: {
    qualification: 'Kwalifikacje',
    individual: 'Konkurs indywidualny',
    team: 'Konkurs drużynowy',
    'mixed-team': 'Konkurs drużyn mieszanych',
  },
  tags: { 'four-hills': 'Turniej Czterech Skoczni', 'ski-flying': 'Loty' },
  types: {
    'world-cup': 'Puchar Świata',
    'world-championships': 'Mistrzostwa Świata',
  },
  phases: {
    upcoming: 'Przed nami',
    today: 'Dzisiaj',
    live: 'Trwa',
    finished: 'Zakończony',
  },
  statuses: { cancelled: 'Odwołany', moved: 'Przeniesiony' },
  countdownUnits: { days: 'd', hours: 'h', minutes: 'min', seconds: 's' },
  startsIn: 'Start za',
  footerSource: 'Terminarz spisany na podstawie kartki przygotowanej przez',
  footerSourceLink: 'autora odręcznych programów',
  footerData: 'Daty i godziny zweryfikowane z kalendarzem FIS.',
  notFoundTitle: 'Nie ma takiej strony',
  notFoundLead: 'Adres jest błędny albo strona została przeniesiona.',
  goHome: 'Strona główna',
  shortcutsTitle: 'Skróty klawiaturowe',
  shortcutsClose: 'Zamknij',
  shortcuts: {
    help: 'Pokaż tę ściągę',
    theme: 'Przełącz motyw',
    language: 'Zmień język',
    home: 'Strona główna',
    schedule: 'Terminarz',
  },
};

const en: Dictionary = {
  siteName: 'Ski Jumping',
  siteDescription:
    'Ski Jumping World Cup schedule: competition dates and times, links to broadcasts and live results.',
  skipToContent: 'Skip to content',
  navSchedule: 'Schedule',
  switchLanguage: 'Przełącz na polski',
  switchTheme: 'Toggle theme',
  repository: 'GitHub repository',
  shortcutsButton: 'Keyboard shortcuts',
  nextCompetition: 'Next competition',
  upcomingEvents: 'Upcoming events',
  fullSchedule: 'Full schedule',
  seasonOver:
    'The season is over. Every competition is listed in the schedule.',
  scheduleTitle: (season) => `Schedule of the ${season} season`,
  scheduleLead: "Men's World Cup and World Championships.",
  season: 'Season',
  watch: 'Broadcast',
  broadcastUnknown: 'Broadcaster not announced yet',
  liveResults: 'Live results',
  results: 'Results',
  eventPage: 'Event program',
  fisEventPage: 'Event page at FIS',
  program: 'Program',
  timeUnknown: 'time not announced',
  timeZoneNote: 'Times shown in time zone:',
  addToCalendar: 'Add to calendar (ICS)',
  backToSchedule: 'Back to schedule',
  hill: 'Hill',
  kinds: {
    qualification: 'Qualification',
    individual: 'Individual competition',
    team: 'Team competition',
    'mixed-team': 'Mixed team competition',
  },
  tags: { 'four-hills': 'Four Hills Tournament', 'ski-flying': 'Ski flying' },
  types: {
    'world-cup': 'World Cup',
    'world-championships': 'World Championships',
  },
  phases: {
    upcoming: 'Upcoming',
    today: 'Today',
    live: 'Live',
    finished: 'Finished',
  },
  statuses: { cancelled: 'Cancelled', moved: 'Rescheduled' },
  countdownUnits: { days: 'd', hours: 'h', minutes: 'min', seconds: 's' },
  startsIn: 'Starts in',
  footerSource: 'Schedule based on a sheet prepared by',
  footerSourceLink: 'the author of handwritten programs',
  footerData: 'Dates and times verified against the FIS calendar.',
  notFoundTitle: 'Page not found',
  notFoundLead: 'The address is wrong or the page has moved.',
  goHome: 'Home page',
  shortcutsTitle: 'Keyboard shortcuts',
  shortcutsClose: 'Close',
  shortcuts: {
    help: 'Show this cheat sheet',
    theme: 'Toggle theme',
    language: 'Change language',
    home: 'Home page',
    schedule: 'Schedule',
  },
};

const dictionaries: Record<Lang, Dictionary> = { pl, en };

export function t(lang: Lang): Dictionary {
  return dictionaries[lang];
}

export function getCountryName(lang: Lang, countryCode: string): string {
  return (
    new Intl.DisplayNames([lang], { type: 'region' }).of(countryCode) ??
    countryCode
  );
}
