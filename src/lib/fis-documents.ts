// Parser of the PDF attachments on a FIS event page (start lists, results,
// media stats, event program). It has no runtime imports on purpose: the
// update script runs it directly under Node, outside of the Astro build.
import type { Competition, SeasonEvent } from './schema';

export interface FisDocument {
  label: string;
  url: string;
}

export interface ParsedDocument extends FisDocument {
  codex: number;
  /** `M` men, `W` women, `A` mixed. */
  gender: string;
}

// The event program is attached to every race, always with the same file.
const EVENT_LEVEL = ['Event Program'];
const TRAINING = /^Results Training/;
// Only men's and mixed competitions are on the site.
const GENDERS = ['M', 'A'];

function attribute(tag: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1];
}

export function parseDocuments(html: string): ParsedDocument[] {
  const anchors = html.match(
    /<a\s[^>]*competition-attachment\/[a-z0-9-]+\.pdf[^>]*>/g,
  );

  return (anchors ?? []).flatMap((tag) => {
    const url = attribute(tag, 'href');
    const codex = Number(attribute(tag, 'data-ga-codex'));
    const gender = attribute(tag, 'data-ga-gender');
    const label = attribute(tag, 'data-ga-download')?.trim();

    return url && label && gender && Number.isInteger(codex)
      ? [{ url, codex, gender, label }]
      : [];
  });
}

function addUnique(list: FisDocument[], document: FisDocument): void {
  if (!list.some((item) => item.url === document.url)) {
    list.push({ label: document.label, url: document.url });
  }
}

/**
 * Puts each document on its competition (matched by codex), the event program
 * on the event, and training results on the training of the same day.
 */
export function assignDocuments(
  event: SeasonEvent,
  documents: ParsedDocument[],
): SeasonEvent {
  const eventDocuments: FisDocument[] = [];
  const competitions = event.competitions.map(
    (competition): Competition & { documents: FisDocument[] } => ({
      ...competition,
      documents: [],
    }),
  );

  for (const document of documents) {
    if (EVENT_LEVEL.includes(document.label)) {
      addUnique(eventDocuments, document);
    } else if (GENDERS.includes(document.gender)) {
      const race = competitions.find(
        (item) =>
          item.fisCodex !== undefined &&
          Number(item.fisCodex) === document.codex,
      );
      const training = TRAINING.test(document.label)
        ? competitions.find(
            (item) => item.kind === 'training' && item.date === race?.date,
          )
        : undefined;
      const target = training ?? race;

      if (target) {
        addUnique(target.documents, document);
      }
    }
  }
  // Competitions without files keep no empty list in the data.
  return {
    ...event,
    documents: eventDocuments,
    competitions: competitions.map(({ documents: files, ...rest }) =>
      files.length > 0 ? { ...rest, documents: files } : rest,
    ),
  };
}
