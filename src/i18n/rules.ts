import type { Lang } from './index';

interface RulesText {
  title: string;
  lead: string;
  nav: string;
  hill: {
    title: string;
    inrun: string;
    takeoff: string;
    landing: string;
    outrun: string;
    points: string[];
  };
  score: {
    title: string;
    intro: string;
    formulaLabel: string;
    distance: string;
    style: string;
    wind: string;
    gate: string;
  };
  distance: {
    title: string;
    intro: string;
    hillColumn: string;
    baseColumn: string;
    meterColumn: string;
    rows: { hill: string; base: string; meter: string }[];
    example: string;
  };
  style: {
    title: string;
    intro: string;
    marksLabel: string;
    points: string[];
  };
  wind: { title: string; head: string; tail: string; points: string[] };
  format: { title: string; points: string[] };
  equipment: { title: string; points: string[] };
  source: string;
  sourceUrl: string;
}

const pl: RulesText = {
  title: 'Zasady skoków narciarskich',
  lead: 'Skąd bierze się nota za skok, jak działa przelicznik za wiatr i kto skacze w drugiej serii.',
  nav: 'Zasady',
  hill: {
    title: 'Skocznia',
    inrun: 'najazd',
    takeoff: 'próg',
    landing: 'zeskok',
    outrun: 'wybieg',
    points: [
      'Punkt K (konstrukcyjny) to odległość, za którą zawodnik dostaje bazową liczbę punktów.',
      'HS (rozmiar skoczni) wyznacza koniec strefy bezpiecznego lądowania; skoki w jego okolice są najdłuższymi, jakie skocznia przewiduje.',
      'Skocznie dzieli się według punktu K: normalne (80-99 m), duże (od 100 m) i mamucie (od 180 m).',
    ],
  },
  score: {
    title: 'Z czego składa się nota',
    intro:
      'Nota za skok to suma punktów za odległość i za styl. Gdy w zawodach działa system kompensacji, dochodzą punkty dodatnie albo ujemne za wiatr i za zmianę belki startowej.',
    formulaLabel:
      'Nota: odległość plus styl, plus lub minus wiatr, plus lub minus belka',
    distance: 'odległość',
    style: 'styl',
    wind: 'wiatr',
    gate: 'belka',
  },
  distance: {
    title: 'Punkty za odległość',
    intro:
      'Za skok na punkt K zawodnik dostaje 60 punktów, a na skoczniach mamucich 120. Każdy metr dalej dodaje punkty, każdy metr bliżej je odejmuje.',
    hillColumn: 'Skocznia (punkt K)',
    baseColumn: 'Punkty za punkt K',
    meterColumn: 'Punkty za metr',
    rows: [
      { hill: 'normalna, 80-99 m', base: '60', meter: '2,0' },
      { hill: 'duża, od 100 m', base: '60', meter: '1,8' },
      { hill: 'mamucia, od 180 m', base: '120', meter: '1,2' },
    ],
    example:
      'Przykład: na dużej skoczni z punktem K na 125 m skok na 130 m daje 60 + 5 x 1,8 = 69 punktów.',
  },
  style: {
    title: 'Punkty za styl',
    intro:
      'Skok ocenia pięciu sędziów. Najwyższą i najniższą notę się odrzuca, a trzy pozostałe sumuje.',
    marksLabel:
      'Pięć not sędziowskich, dwie skrajne są skreślone, suma trzech pozostałych',
    points: [
      'Za błędy w locie sędzia może odjąć do 5 punktów: liczy się płynne przejście do lotu oraz symetryczna, stabilna sylwetka.',
      'Za lądowanie można stracić do 5 punktów, w tym 2 za brak telemarku.',
      'Najwięcej kosztuje odjazd: upadek to 7 punktów mniej, a podparcie 4-5 punktów.',
      'Tego, co skoczek robi na wybiegu za linią upadków, sędziowie już nie oceniają.',
    ],
  },
  wind: {
    title: 'Wiatr i belka',
    head: 'Wiatr pod narty niesie skoczka, więc punkty się odejmuje.',
    tail: 'Wiatr w plecy skraca lot, więc punkty się dodaje.',
    points: [
      'Dzięki przelicznikom jury może w trakcie serii zmienić długość najazdu, czyli przesunąć belkę startową, bez powtarzania serii.',
      'Skok z niższej belki oznacza mniejszą prędkość na progu, dlatego jest nagradzany dodatkowymi punktami, a skok z wyższej belki karany odjęciem punktów.',
    ],
  },
  format: {
    title: 'Przebieg konkursu',
    points: [
      'Kwalifikacje wyłaniają 50 uczestników konkursu, a na skoczniach mamucich 40.',
      'Konkurs indywidualny ma dwie serie: do drugiej awansuje 30 najlepszych zawodników pierwszej.',
      'Punkty Pucharu Świata dostaje czołowa trzydziestka: zwycięzca 100, drugi 80, trzeci 60.',
      'Przy remisie obaj zawodnicy dostają punkty za wyższe miejsce, a kolejne miejsce zostaje puste.',
      'W Turnieju Czterech Skoczni pierwsza seria to system KO: 50 skoczków w parach, dalej idzie 25 zwycięzców i 5 najlepszych przegranych.',
      'W konkursie drużynowym skacze czterech zawodników z kraju, w konkursie duetów dwóch, a w drużynie mieszanej dwie kobiety i dwóch mężczyzn.',
    ],
  },
  equipment: {
    title: 'Sprzęt',
    points: [
      'Kombinezon może mieć najwyżej 5 mm grubości, a jego wymiary muszą odpowiadać wymiarom ciała zawodnika.',
      'FIS kontroluje obwody kombinezonu w wyznaczonych miejscach, między innymi ramienia, uda, klatki piersiowej i pasa.',
      'Za sprzęt niezgodny z przepisami grozi dyskwalifikacja ze skoku albo z całego konkursu.',
    ],
  },
  source: 'Źródło: Wikipedia, na podstawie przepisów FIS',
  sourceUrl: 'https://pl.wikipedia.org/wiki/Skoki_narciarskie',
};

const en: RulesText = {
  title: 'Ski jumping rules',
  lead: 'Where the score of a jump comes from, how wind compensation works and who jumps in the second round.',
  nav: 'Rules',
  hill: {
    title: 'The hill',
    inrun: 'inrun',
    takeoff: 'takeoff',
    landing: 'landing hill',
    outrun: 'outrun',
    points: [
      'The K-point (construction point) is the distance that earns the base number of points.',
      'HS (hill size) marks the end of the safe landing zone; jumps around it are the longest the hill is built for.',
      'Hills are classed by their K-point: normal (80-99 m), large (from 100 m) and flying (from 180 m).',
    ],
  },
  score: {
    title: 'What a score is made of',
    intro:
      'The score of a jump is the sum of distance points and style points. When compensation is in use, positive or negative points for wind and for a gate change are added.',
    formulaLabel:
      'Score: distance plus style, plus or minus wind, plus or minus gate',
    distance: 'distance',
    style: 'style',
    wind: 'wind',
    gate: 'gate',
  },
  distance: {
    title: 'Distance points',
    intro:
      'A jump to the K-point earns 60 points, and 120 on flying hills. Every meter beyond adds points, every meter short takes them away.',
    hillColumn: 'Hill (K-point)',
    baseColumn: 'Points for the K-point',
    meterColumn: 'Points per meter',
    rows: [
      { hill: 'normal, 80-99 m', base: '60', meter: '2.0' },
      { hill: 'large, from 100 m', base: '60', meter: '1.8' },
      { hill: 'flying, from 180 m', base: '120', meter: '1.2' },
    ],
    example:
      'Example: on a large hill with the K-point at 125 m, a 130 m jump earns 60 + 5 x 1.8 = 69 points.',
  },
  style: {
    title: 'Style points',
    intro:
      'Five judges mark every jump. The highest and the lowest mark are dropped and the remaining three are added up.',
    marksLabel:
      'Five judges marks, the two extreme ones struck out, the sum of the other three',
    points: [
      'A judge can deduct up to 5 points for the flight: a smooth transition into flight and a symmetric, stable position count.',
      'Up to 5 points can be lost on landing, including 2 for landing without a telemark.',
      'The outrun costs the most: a fall means 7 points less, touching the snow 4-5 points.',
      'What the jumper does beyond the fall line is no longer judged.',
    ],
  },
  wind: {
    title: 'Wind and gate',
    head: 'Headwind carries the jumper, so points are deducted.',
    tail: 'Tailwind shortens the flight, so points are added.',
    points: [
      'Thanks to compensation the jury may change the inrun length, that is move the start gate, during a round without restarting it.',
      'A jump from a lower gate means less speed at the takeoff, so it is rewarded with extra points, and a jump from a higher gate is penalized.',
    ],
  },
  format: {
    title: 'How a competition runs',
    points: [
      'Qualification selects 50 starters for the competition, and 40 on flying hills.',
      'An individual competition has two rounds: the best 30 of the first round advance to the second.',
      'World Cup points go to the top thirty: 100 for the winner, 80 for second and 60 for third place.',
      'In a tie both athletes get the points of the higher place and the next place stays empty.',
      'At the Four Hills Tournament the first round is a knockout: 50 jumpers in pairs, with 25 winners and the 5 best losers advancing.',
      'A team competition has four athletes per country, a super team two, and a mixed team two women and two men.',
    ],
  },
  equipment: {
    title: 'Equipment',
    points: [
      'A suit may be at most 5 mm thick and its dimensions must match the body of the athlete.',
      'FIS checks the suit circumference at set points, among them the arm, thigh, chest and waist.',
      'Equipment that breaks the rules leads to disqualification from the jump or from the whole competition.',
    ],
  },
  source: 'Source: Wikipedia, based on the FIS rules',
  sourceUrl: 'https://pl.wikipedia.org/wiki/Skoki_narciarskie',
};

export const rules: Record<Lang, RulesText> = { pl, en };
