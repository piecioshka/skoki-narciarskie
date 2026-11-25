// Parser of the podiums tab of a FIS athlete biography. Runtime imports carry
// the `.ts` extension: the careers script runs this module directly under Node.
import { htmlToText } from './html-text.ts';

export interface CareerPodiums {
  wins: number;
  second: number;
  third: number;
}

/** Sums the "World Cup Podiums Individual" table: one row per season. */
export function parsePodiums(html: string): CareerPodiums {
  const text = htmlToText(html);
  const table =
    /Position 1 Position 2 Position 3 Podiums((?: \d{4} \d+ \d+ \d+ \d+)*)/.exec(
      text,
    );
  const numbers = (table?.[1] ?? '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(Number);
  const totals = { wins: 0, second: 0, third: 0 };

  for (let index = 0; index + 4 < numbers.length + 1; index += 5) {
    totals.wins += numbers[index + 1] ?? 0;
    totals.second += numbers[index + 2] ?? 0;
    totals.third += numbers[index + 3] ?? 0;
  }
  return totals;
}
