import { describe, expect, it } from 'vitest';
import {
  parsePodium,
  parseRaces,
  slugify,
  toHillType,
  toKind,
  type Race,
} from './fis-season';

function raceRow(
  id: number,
  date: string,
  time: string,
  description: string,
  category: string,
  extra = '',
): string {
  return `
    <div class="table-row reset-padding">
      <a href="https://www.fis-ski.com/DB/general/results.html?sectorcode=JP&raceid=${id}">
        <div class="timezone-date" data-date="${date}" data-time="${time}" data-timezone="Europe/Berlin"></div>
        <div class="g-xs-24">10 Jan 2026</div>
        <div class="hidden-xs">${description}</div>
        <div class="hidden-sm-up">${description}</div>
        <div class="g-xs-2">${category}</div>
        ${extra}
      </a>
    </div>`;
}

function resultRow(
  rank: number,
  name: string,
  nation: string,
  options: { competitorId?: number; rankClass?: string } = {},
): string {
  const { competitorId = 1000 + rank, rankClass = 'bold' } = options;

  return `
    <a class="table-row" href="https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=JP&competitorid=${competitorId}">
      <div class="g-row container">
        <div class="g-lg-1 justify-right ${rankClass}">${rank}</div>
        <!-- bib --><div class="g-lg justify-left bold">${name}</div>
        <span class="country__name-short">${nation}</span>
      </div>
    </a>`;
}

function race(description: string, mixed = false): Race {
  return {
    fisRaceId: 1,
    date: '2026-01-10',
    time: null,
    timeZone: 'UTC',
    description,
    cancelled: false,
    mixed,
  };
}

describe('parseRaces', () => {
  it('reads men and mixed World Cup races and skips women and qualifications', () => {
    const html = [
      raceRow(101, '2026-01-10', '16:00', 'Large Hill HS137', 'WC M'),
      raceRow(102, '2026-01-10', '14:00', 'Large Hill HS137', 'QUA M'),
      raceRow(103, '2026-01-11', '', 'Large Hill HS137', 'WC W'),
      raceRow(104, '2026-01-11', '', 'Mixed Team HS137', 'WC A', 'Cancelled'),
    ].join('');

    expect(parseRaces(html)).toEqual([
      {
        fisRaceId: 101,
        date: '2026-01-10',
        time: '16:00',
        timeZone: 'Europe/Berlin',
        description: 'Large Hill HS137',
        cancelled: false,
        mixed: false,
      },
      {
        fisRaceId: 104,
        date: '2026-01-11',
        time: null,
        timeZone: 'Europe/Berlin',
        description: 'Mixed Team HS137',
        cancelled: true,
        mixed: true,
      },
    ]);
  });

  it('returns nothing for a page without rows', () => {
    expect(parseRaces('<p>No races</p>')).toEqual([]);
  });
});

describe('toKind', () => {
  it('tells the competition kinds apart', () => {
    expect(toKind(race('Team HS137', true))).toBe('mixed-team');
    expect(toKind(race('Super Team HS137'))).toBe('super-team');
    expect(toKind(race('Team HS137'))).toBe('team');
    expect(toKind(race('Large Hill HS137'))).toBe('individual');
  });
});

describe('toHillType', () => {
  it('reads the hill type from the description', () => {
    expect(toHillType('Flying Hill HS235')).toBe('flying');
    expect(toHillType('Normal Hill HS106')).toBe('normal');
    expect(toHillType('Large Hill HS137')).toBe('large');
    expect(toHillType('Team HS137')).toBe('large');
  });
});

describe('slugify', () => {
  it('drops diacritics and joins words with hyphens', () => {
    expect(slugify('Garmisch-Partenkirchen')).toBe('garmisch-partenkirchen');
    expect(slugify('Planica / Ratece')).toBe('planica-ratece');
    expect(slugify('Lillehammer ')).toBe('lillehammer');
    expect(slugify('Râșnov')).toBe('rasnov');
  });
});

describe('parsePodium', () => {
  it('reads the top three of an individual competition', () => {
    const html = [
      resultRow(1, 'KRAFT Stefan', 'AUT', { competitorId: 5001 }),
      resultRow(2, 'PREVC Domen', 'SLO', { competitorId: 5002 }),
      resultRow(3, 'KUBACKI Dawid', 'POL', { competitorId: 5003 }),
      resultRow(4, 'STOCH Kamil', 'POL', { competitorId: 5004 }),
    ].join('');

    expect(parsePodium(html, false)).toEqual([
      { rank: 1, name: 'Stefan Kraft', nation: 'AUT', fisCompetitorId: 5001 },
      { rank: 2, name: 'Domen Prevc', nation: 'SLO', fisCompetitorId: 5002 },
      { rank: 3, name: 'Dawid Kubacki', nation: 'POL', fisCompetitorId: 5003 },
    ]);
  });

  it('keeps team rows and skips the athletes listed under them', () => {
    const html = [
      resultRow(1, 'Austria', 'AUT'),
      resultRow(1, 'KRAFT Stefan', 'AUT', { rankClass: '' }),
      resultRow(2, 'Slovenia', 'SLO'),
      resultRow(3, 'Poland', 'POL'),
    ].join('');

    expect(parsePodium(html, true)).toEqual([
      { rank: 1, nation: 'AUT' },
      { rank: 2, nation: 'SLO' },
      { rank: 3, nation: 'POL' },
    ]);
  });

  it('skips rows with a gray rank', () => {
    const html = resultRow(1, 'KRAFT Stefan', 'AUT', {
      rankClass: 'bold gray',
    });

    expect(parsePodium(html, false)).toEqual([]);
  });

  it('decodes entities in names', () => {
    const html = resultRow(1, 'O&#039;NEIL Kevin', 'USA', {
      competitorId: 7,
    });

    expect(parsePodium(html, false)).toEqual([
      { rank: 1, name: "Kevin O'Neil", nation: 'USA', fisCompetitorId: 7 },
    ]);
  });
});
