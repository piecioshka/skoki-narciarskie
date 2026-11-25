import { describe, expect, it } from 'vitest';
import {
  cupFileToWrite,
  parseNationsCup,
  parseStandings,
  selectedCupCode,
  splitName,
} from './fis-standings';

function row(
  id: number,
  name: string,
  nation: string,
  rank: string,
  points: string,
): string {
  return `
    <a class="table-row  reset-padding" href="https://www.fis-ski.com/DB/general/athlete-biography.html?sectorcode=JP&competitorid=${id}&type=cups&cupcode=WC" target="_self">
      <div class="container g-row">
        <div class="g-xs-10 justify-left bold align-xs-top">
          ${name}
        </div>
        <div class="country country_flag">
          <span class="country__flag"><span class="flag flag-${nation}"></span></span>
          <span class="country__name-short">${nation}</span>
        </div>
        <div class="g-xs-9 hidden-sm-up justify-left">ALL</div>
        <div class="g-xs-5 justify-right bold">${rank}</div>
        <div class="pl-xs-1 justify-right bold">${points}</div>
      </div>
    </a>`;
}

describe('splitName', () => {
  it('separates the upper-case family name from the given name', () => {
    expect(splitName('PREVC Domen')).toEqual({
      givenName: 'Domen',
      familyName: 'Prevc',
    });
  });

  it('keeps multi-word and hyphenated names', () => {
    expect(splitName('FORFANG Johann Andre')).toEqual({
      givenName: 'Johann Andre',
      familyName: 'Forfang',
    });
    expect(splitName('GASIENICA-KOTELNICKI Jan')).toEqual({
      givenName: 'Jan',
      familyName: 'Gasienica-Kotelnicki',
    });
  });
});

describe('parseStandings', () => {
  const html = `<div class="tbody">${row(186516, 'PREVC Domen', 'SLO', '1', "2'148")}${row(155620, 'KOBAYASHI Ryoyu', 'JPN', '2', '1’480')}</div>`;

  it('reads rank, athlete, nation and points of every row', () => {
    expect(parseStandings(html).rows).toEqual([
      {
        rank: 1,
        givenName: 'Domen',
        familyName: 'Prevc',
        nation: 'SLO',
        points: 2148,
        fisCompetitorId: 186516,
      },
      {
        rank: 2,
        givenName: 'Ryoyu',
        familyName: 'Kobayashi',
        nation: 'JPN',
        points: 1480,
        fisCompetitorId: 155620,
      },
    ]);
  });

  it('reports the cup the page actually shows', () => {
    expect(parseStandings(html).cupCode).toBe('WC');
    expect(
      parseStandings(html.replaceAll('cupcode=WC', 'cupcode=WRL')).cupCode,
    ).toBe('WRL');
  });

  it('returns no rows for a page without a table', () => {
    expect(parseStandings('<html></html>')).toEqual({
      cupCode: undefined,
      rows: [],
    });
  });
});

// Trimmed from the FIS "World Cup Nations Cup" page of the 2025-26 season.
function cupMenu(selected: string): string {
  const options = ['WC', 'GP', 'WRL', 'NC-GP', 'NC-WC', 'WCPR'];

  return `
    <select id="seasoncode" name="seasoncode">
      <option value="2026" selected="selected">2026</option>
    </select>
    <select id="cupcode" tabindex="2" title="select a cup" data-module="select" name="cupcode">
      ${options
        .map((code) =>
          code === selected
            ? `<option value="${code}" selected="selected">${code}</option>`
            : `<option value="${code}">${code}</option>`,
        )
        .join('')}
    </select>
    <select id="gendercode" name="gendercode">
      <option value="M" selected="selected">Men</option>
    </select>`;
}

function nationRow(
  name: string,
  nation: string,
  rank: string,
  points: string,
): string {
  return `
    <a class="table-row  reset-padding table-row_favorite" target="_self">
      <div class="container g-row">
        <div class="g-xs-10 g-sm-9 g-md-4 g-lg-4 justify-left bold align-xs-top">
          ${name}
        </div>
        <div class="g-xs-5 g-sm-3 g-md-2 g-lg-2 justify-left">
          <div class="country country_flag">
            <span class="country__flag"><span class="flag flag-${nation}"></span></span>
            <span class="country__name-short">${nation}</span>
          </div>
        </div>
        <div class="g-xs-9 g-sm-12 g-md-16 g-lg-16 flex-sm-wrap flex-xs-wrap">
          <div class="g-xs-24 g-sm-24 g-md">
            <div class="g-xs-9 hidden-sm-up justify-left">ALL</div>
            <div class="g-xs-5 g-sm-4 g-md-5 g-lg-8 justify-right bold">${rank}</div>
            <div class="pl-xs-1 pl-sm-1 g-xs-10 g-sm-7 g-md-9 g-lg-8 justify-right bold">${points}</div>
          </div>
        </div>
      </div>
    </a>`;
}

describe('selectedCupCode', () => {
  it('reads the selected option of the cup menu only', () => {
    expect(selectedCupCode(cupMenu('NC-WC'))).toBe('NC-WC');
    expect(selectedCupCode(cupMenu('WRL'))).toBe('WRL');
  });

  it('is undefined without a cup menu', () => {
    expect(selectedCupCode('<html></html>')).toBeUndefined();
  });
});

describe('parseNationsCup', () => {
  const html = `${cupMenu('NC-WC')}<div class="tbody">${nationRow('Austria', 'AUT', '1', "6'157")}${nationRow('Slovenia', 'SLO', '2', '5’318')}</div>`;

  it('reads rank, nation and points of every country', () => {
    expect(parseNationsCup(html)).toEqual({
      cupCode: 'NC-WC',
      rows: [
        { rank: 1, nation: 'AUT', points: 6157 },
        { rank: 2, nation: 'SLO', points: 5318 },
      ],
    });
  });

  it('reports another cup when FIS falls back to it', () => {
    expect(
      parseNationsCup(html.replace(cupMenu('NC-WC'), cupMenu('WRL'))).cupCode,
    ).toBe('WRL');
  });

  it('returns no rows for a page without a table', () => {
    expect(parseNationsCup('<html></html>')).toEqual({
      cupCode: undefined,
      rows: [],
    });
  });
});

describe('cupFileToWrite', () => {
  const rows = [{ rank: 1, nation: 'AUT', points: 6157 }];
  const base = {
    cupCode: 'NC-WC',
    expectedCup: 'NC-WC',
    rows,
    existingRows: undefined,
    createEmpty: false,
    today: '2026-11-25',
  };

  it('writes a new table with the day of the refresh', () => {
    expect(cupFileToWrite(base)).toEqual({ updatedAt: '2026-11-25', rows });
    expect(
      cupFileToWrite({
        ...base,
        rows: [{ ...rows[0], points: 6200 }],
        existingRows: rows,
      }),
    ).toEqual({
      updatedAt: '2026-11-25',
      rows: [{ rank: 1, nation: 'AUT', points: 6200 }],
    });
  });

  it('writes nothing when the table has not changed', () => {
    // Key order differs between the parser and the schema; it must not count.
    const stored = [{ nation: 'AUT', points: 6157, rank: 1 }];

    expect(cupFileToWrite({ ...base, existingRows: stored })).toBeUndefined();
  });

  it('never wipes stored rows when FIS shows another cup or no cup', () => {
    for (const cupCode of ['WRL', undefined]) {
      for (const createEmpty of [true, false]) {
        expect(
          cupFileToWrite({ ...base, cupCode, createEmpty, existingRows: rows }),
        ).toBeUndefined();
      }
    }
  });

  it('never wipes stored rows with an empty table of the right cup', () => {
    expect(
      cupFileToWrite({ ...base, rows: [], existingRows: rows }),
    ).toBeUndefined();
  });

  it('creates an empty file only when asked and none exists', () => {
    expect(
      cupFileToWrite({ ...base, cupCode: 'WRL', createEmpty: true }),
    ).toEqual({ updatedAt: null, rows: [] });
    expect(cupFileToWrite({ ...base, cupCode: 'WRL' })).toBeUndefined();
    expect(
      cupFileToWrite({
        ...base,
        cupCode: 'WRL',
        createEmpty: true,
        existingRows: [],
      }),
    ).toBeUndefined();
  });
});
