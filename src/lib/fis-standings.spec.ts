import { describe, expect, it } from 'vitest';
import { parseStandings, splitName } from './fis-standings';

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
