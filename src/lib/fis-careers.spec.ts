import { describe, expect, it } from 'vitest';
import { parsePodiums } from './fis-careers';

function podiumsPage(rows: [number, number, number, number, number][]) {
  const body = rows
    .map(
      (cells) =>
        `<div class="table-row">${cells.map((cell) => `<div class="g-xs-4">${cell}</div>`).join('\n')}</div>`,
    )
    .join('\n');

  return `
    <script>var podiums = "Position 1 Position 2 Position 3 Podiums 1999 9 9 9 27";</script>
    <h3>World Cup Podiums Individual</h3>
    <div class="table-header">
      <div>Position 1</div> <div>Position 2</div> <div>Position 3</div> <div>Podiums</div>
    </div>
    ${body}
    <h3>World Cup Podiums Team</h3>`;
}

describe('parsePodiums', () => {
  it('sums the seasons of the individual podiums table', () => {
    expect(
      parsePodiums(
        podiumsPage([
          [2024, 3, 1, 2, 6],
          [2025, 1, 0, 4, 5],
        ]),
      ),
    ).toEqual({ wins: 4, second: 1, third: 6 });
  });

  it('gives zeros when the athlete has no podium', () => {
    expect(parsePodiums('<p>No podiums</p>')).toEqual({
      wins: 0,
      second: 0,
      third: 0,
    });
  });
});
