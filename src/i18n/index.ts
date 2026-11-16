import type {
  CompetitionKind,
  EventTag,
  OfficialRole,
  SeasonEvent,
  StaffRole,
} from '../lib/schema';
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
  navStandings: string;
  navTeam: string;
  navGallery: string;
  mainNav: string;
  shortcutStandings: string;
  shortcutTeam: string;
  shortcutGallery: string;
  galleryTitle: (season: string) => string;
  galleryLead: string;
  galleryAuthor: string;
  seasonProgram: string;
  handwrittenProgram: string;
  openFullSize: string;
  added: string;
  standingsTitle: (season: string) => string;
  standingsLead: string;
  standingsEmpty: string;
  standingsUpdated: string;
  standingsSource: string;
  onlyPoles: string;
  rank: string;
  athlete: string;
  country: string;
  points: string;
  teamTitle: (season: string) => string;
  teamLead: string;
  teamNames: Record<string, string>;
  athletes: string;
  staff: string;
  staffRoles: Record<StaffRole, string>;
  teamSource: string;
  verified: string;
  hillSection: string;
  hillRecord: string;
  hillKPoint: string;
  hillHs: string;
  hillInrun: string;
  hillTakeoff: string;
  hillLanding: string;
  hillOpened: string;
  hillRebuilt: string;
  hillCapacity: string;
  hillSource: string;
  about: string;
  otherSeasons: string;
  navTournaments: string;
  shortcutTournaments: string;
  tournamentsTitle: string;
  tournamentsLead: string;
  tournamentStatuses: Record<'active' | 'paused' | 'ended', string>;
  tournamentSince: string;
  tournamentHosts: string;
  tournamentFormat: string;
  tournamentPrize: string;
  tournamentWinners: string;
  tournamentInSeason: (season: string) => string;
  tournamentSource: string;
  edition: string;
  placeLabels: [string, string, string];
  partOf: string;
  hillTypes: Record<'normal' | 'large' | 'flying', string>;
  podium: string;
  navHills: string;
  shortcutHills: string;
  hillsTitle: string;
  hillsLead: string;
  hillLocation: string;
  tocTitle: string;
  hillsMap: string;
  eventsMap: string;
  groupByCountry: string;
  hillProfile: string;
  hillCompetitions: string;
  hillTournaments: string;
  winner: string;
  photoBy: string;
  creditsTitle: string;
  creditsLead: string;
  photo: string;
  author: string;
  license: string;
  nationsTitle: string;
  shortcutNations: string;
  nationsLead: (range: string) => string;
  nationLead: (range: string) => string;
  crystalGlobes: string;
  seasonsCount: string;
  bestRank: string;
  competitionWins: string;
  competitionWinsNote: () => string;
  trophies: string;
  teamResults: string;
  teamResultsNote: (range: string) => string;
  officials: string;
  officialRoles: Record<OfficialRole, string>;
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
  navStandings: 'Klasyfikacja',
  navTeam: 'Kadra',
  navGallery: 'Galeria',
  mainNav: 'Nawigacja główna',
  shortcutStandings: 'Klasyfikacja generalna',
  shortcutTeam: 'Kadra Polski',
  shortcutGallery: 'Galeria programów',
  galleryTitle: (season) => `Odręczne programy sezonu ${season}`,
  galleryLead:
    'Programy zawodów rysowane odręcznie na każdy weekend Pucharu Świata.',
  galleryAuthor: 'Autor programów',
  seasonProgram: 'Program sezonu',
  handwrittenProgram: 'Odręczny program',
  openFullSize: 'Otwórz w pełnym rozmiarze',
  added: 'Dodano',
  standingsTitle: (season) => `Klasyfikacja generalna ${season}`,
  standingsLead: 'Puchar Świata mężczyzn.',
  standingsEmpty:
    'Sezon jeszcze się nie zaczął. Klasyfikacja pojawi się po pierwszym konkursie.',
  standingsUpdated: 'Stan na',
  standingsSource: 'Źródło: FIS',
  onlyPoles: 'Tylko Polacy',
  rank: 'Miejsce',
  athlete: 'Zawodnik',
  country: 'Kraj',
  points: 'Punkty',
  teamTitle: (season) => `Kadra Polski ${season}`,
  teamLead: 'Kadry narodowe mężczyzn powołane przez Polski Związek Narciarski.',
  teamNames: { a: 'Kadra narodowa A', b: 'Kadra narodowa B' },
  athletes: 'Zawodnicy',
  staff: 'Sztab szkoleniowy',
  staffRoles: {
    'head-coach': 'Trener główny',
    'assistant-coach': 'Asystent trenera',
    'service-technician': 'Serwismen',
    physiotherapist: 'Fizjoterapeuta',
    'team-manager': 'Kierownik drużyny',
  },
  teamSource: 'Źródło: Polski Związek Narciarski',
  verified: 'Sprawdzono',
  hillSection: 'Skocznia',
  hillRecord: 'Rekord skoczni',
  hillKPoint: 'Punkt konstrukcyjny (K)',
  hillHs: 'Rozmiar skoczni (HS)',
  hillInrun: 'Długość najazdu',
  hillTakeoff: 'Kąt progu',
  hillLanding: 'Kąt zeskoku',
  hillOpened: 'Rok otwarcia',
  hillRebuilt: 'Ostatnia przebudowa',
  hillCapacity: 'Pojemność trybun',
  hillSource: 'Źródło: skisprungschanzen.com',
  about: 'ok.',
  otherSeasons: 'Sezony',
  navTournaments: 'Turnieje',
  shortcutTournaments: 'Turnieje',
  tournamentsTitle: 'Turnieje w Pucharze Świata',
  tournamentsLead:
    'Cykle rozgrywane w ramach Pucharu Świata, z własną klasyfikacją i nagrodami.',
  tournamentStatuses: {
    active: 'Rozgrywany',
    paused: 'Zawieszony',
    ended: 'Nierozgrywany',
  },
  tournamentSince: 'Pierwsza edycja',
  tournamentHosts: 'Skocznie',
  tournamentFormat: 'Zasady',
  tournamentPrize: 'Nagrody',
  tournamentWinners: 'Wszystkie edycje',
  tournamentInSeason: (season) => `W sezonie ${season}`,
  tournamentSource: 'Źródło: Wikipedia',
  edition: 'Edycja',
  placeLabels: ['1. miejsce', '2. miejsce', '3. miejsce'],
  partOf: 'Część turnieju',
  hillTypes: {
    normal: 'skocznia normalna',
    large: 'skocznia duża',
    flying: 'skocznia mamucia',
  },
  podium: 'Podium',
  navHills: 'Skocznie',
  shortcutHills: 'Skocznie',
  hillsTitle: 'Skocznie Pucharu Świata',
  hillLocation: 'Lokalizacja',
  tocTitle: 'Na tej stronie',
  hillsMap: 'Mapa skoczni',
  eventsMap: 'Mapa zawodów',
  groupByCountry: 'Grupuj według kraju',
  hillsLead: 'Obiekty z kalendarza: parametry, rekordy i rozegrane konkursy.',
  hillProfile: 'Profil skoczni',
  hillCompetitions: 'Konkursy na tej skoczni',
  hillTournaments: 'Turnieje',
  winner: 'Zwycięzca',
  photoBy: 'Zdjęcie',
  creditsTitle: 'Autorzy zdjęć',
  creditsLead:
    'Zdjęcia pochodzą z Wikimedia Commons i są używane na wolnych licencjach.',
  photo: 'Zdjęcie',
  author: 'Autor',
  license: 'Licencja',
  nationsTitle: 'Reprezentacje',
  shortcutNations: 'Reprezentacje',
  nationsLead: (range) =>
    `Punkty Pucharu Świata zdobyte przez zawodników każdego kraju w sezonach ${range}.`,
  nationLead: (range) =>
    `Punkty z klasyfikacji generalnej Pucharu Świata zsumowane z sezonów ${range}.`,
  crystalGlobes: 'Kryształowe Kule',
  seasonsCount: 'Sezony',
  bestRank: 'Najlepsze miejsce',
  competitionWins: 'Zwycięstwa / podia',
  competitionWinsNote: () =>
    'Zwycięstwa i podia to konkursy indywidualne Pucharu Świata w całej karierze, według FIS.',
  trophies: 'Trofea',
  teamResults: 'Wyniki drużyny',
  teamResultsNote: (range) =>
    `Miejsca na podium konkursów drużynowych w sezonach ${range}.`,
  officials: 'Sędziowie i delegaci',
  officialRoles: {
    'technical-delegate': 'Delegat techniczny FIS',
    'technical-delegate-assistant': 'Asystent delegata technicznego',
    judge: 'Sędzia',
  },
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
    'super-team': 'Konkurs duetów',
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
  navStandings: 'Standings',
  navTeam: 'Team',
  navGallery: 'Gallery',
  mainNav: 'Main navigation',
  shortcutStandings: 'Overall standings',
  shortcutTeam: 'Polish team',
  shortcutGallery: 'Program gallery',
  galleryTitle: (season) => `Handwritten programs of the ${season} season`,
  galleryLead: 'Event programs drawn by hand for every World Cup weekend.',
  galleryAuthor: 'Author of the programs',
  seasonProgram: 'Season program',
  handwrittenProgram: 'Handwritten program',
  openFullSize: 'Open in full size',
  added: 'Added',
  standingsTitle: (season) => `Overall standings ${season}`,
  standingsLead: "Men's World Cup.",
  standingsEmpty:
    'The season has not started yet. Standings will appear after the first competition.',
  standingsUpdated: 'As of',
  standingsSource: 'Source: FIS',
  onlyPoles: 'Poles only',
  rank: 'Rank',
  athlete: 'Athlete',
  country: 'Country',
  points: 'Points',
  teamTitle: (season) => `Polish team ${season}`,
  teamLead: "Men's national teams appointed by the Polish Ski Association.",
  teamNames: { a: 'National team A', b: 'National team B' },
  athletes: 'Athletes',
  staff: 'Coaching staff',
  staffRoles: {
    'head-coach': 'Head coach',
    'assistant-coach': 'Assistant coach',
    'service-technician': 'Service technician',
    physiotherapist: 'Physiotherapist',
    'team-manager': 'Team manager',
  },
  teamSource: 'Source: Polish Ski Association',
  verified: 'Verified',
  hillSection: 'Hill',
  hillRecord: 'Hill record',
  hillKPoint: 'Construction point (K)',
  hillHs: 'Hill size (HS)',
  hillInrun: 'Inrun length',
  hillTakeoff: 'Takeoff angle',
  hillLanding: 'Landing angle',
  hillOpened: 'Opened',
  hillRebuilt: 'Last rebuilt',
  hillCapacity: 'Spectator capacity',
  hillSource: 'Source: skisprungschanzen.com',
  about: 'approx.',
  otherSeasons: 'Seasons',
  navTournaments: 'Tournaments',
  shortcutTournaments: 'Tournaments',
  tournamentsTitle: 'World Cup tournaments',
  tournamentsLead:
    'Series held within the World Cup, with their own standings and prizes.',
  tournamentStatuses: {
    active: 'Active',
    paused: 'On hold',
    ended: 'Not held',
  },
  tournamentSince: 'First edition',
  tournamentHosts: 'Hills',
  tournamentFormat: 'Rules',
  tournamentPrize: 'Prizes',
  tournamentWinners: 'All editions',
  tournamentInSeason: (season) => `In the ${season} season`,
  tournamentSource: 'Source: Wikipedia',
  edition: 'Edition',
  placeLabels: ['1st place', '2nd place', '3rd place'],
  partOf: 'Part of the tournament',
  hillTypes: {
    normal: 'normal hill',
    large: 'large hill',
    flying: 'flying hill',
  },
  podium: 'Podium',
  navHills: 'Hills',
  shortcutHills: 'Hills',
  hillsTitle: 'World Cup hills',
  hillLocation: 'Location',
  tocTitle: 'On this page',
  hillsMap: 'Map of hills',
  eventsMap: 'Map of events',
  groupByCountry: 'Group by country',
  hillsLead:
    'Venues of the calendar: profile data, records and past competitions.',
  hillProfile: 'Hill profile',
  hillCompetitions: 'Competitions on this hill',
  hillTournaments: 'Tournaments',
  winner: 'Winner',
  photoBy: 'Photo',
  creditsTitle: 'Photo credits',
  creditsLead:
    'Photos come from Wikimedia Commons and are used under free licenses.',
  photo: 'Photo',
  author: 'Author',
  license: 'License',
  nationsTitle: 'Nations',
  shortcutNations: 'National teams',
  nationsLead: (range) =>
    `World Cup points scored by the athletes of each country in the ${range} seasons.`,
  nationLead: (range) =>
    `Points from the overall World Cup standings summed over the ${range} seasons.`,
  crystalGlobes: 'Crystal Globes',
  seasonsCount: 'Seasons',
  bestRank: 'Best rank',
  competitionWins: 'Wins / podiums',
  competitionWinsNote: () =>
    'Wins and podiums are individual World Cup competitions over the whole career, as counted by FIS.',
  trophies: 'Trophies',
  teamResults: 'Team results',
  teamResultsNote: (range) =>
    `Podium places in team competitions in the ${range} seasons.`,
  officials: 'Judges and delegates',
  officialRoles: {
    'technical-delegate': 'FIS Technical Delegate',
    'technical-delegate-assistant': 'Technical Delegate Assistant',
    judge: 'Judge',
  },
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
    'super-team': 'Super team competition',
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
