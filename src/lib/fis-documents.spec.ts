import { describe, expect, it } from 'vitest';
import { assignDocuments, parseDocuments } from './fis-documents';
import type { Competition, SeasonEvent } from './schema';

const PDF = 'https://www.fis-ski.com/DB/v2/download/competition-attachment';

function anchor(uuid: string, codex: number, gender: string, label: string) {
  return `<div class="drop-btn__item"><span>${label} (1 MB)</span>
    <a href="${PDF}/${uuid}.pdf" target="_blank" role="button" tabindex="1"
      name="download" class="btn" data-ga-codex="${codex}"
      data-ga-gender="${gender}" data-ga-download="${label}"><span>download</span></a></div>`;
}

const HTML = [
  anchor('women-results', 4, 'W', 'Qualification Results'),
  anchor('men-start', 2, 'M', 'Start List Qualification'),
  anchor('men-training', 2, 'M', 'Results Training'),
  anchor('program', 315, 'A', 'Event Program'),
  anchor('mixed-stats', 315, 'A', 'Media Stats'),
  anchor('program', 315, 'A', 'Event Program'),
].join('\n');

function competition(overrides: Partial<Competition>): Competition {
  return {
    fisRaceId: 1,
    kind: 'qualification',
    hillSize: 140,
    date: '2026-11-20',
    time: '14:00',
    status: 'scheduled',
    results: [],
    polishAthletes: [],
    ...overrides,
  };
}

const event: SeasonEvent = {
  slug: 'lillehammer',
  type: 'world-cup',
  tags: [],
  fisEventId: 1,
  city: 'Lillehammer',
  countryCode: 'NO',
  hillName: 'Lysgårdsbakken',
  timeZone: 'Europe/Oslo',
  channels: [],
  officials: [],
  competitions: [
    competition({ kind: 'training', fisRaceId: null, time: '12:00' }),
    competition({ fisCodex: '0002' }),
    competition({ kind: 'mixed-team', fisCodex: '0315', time: '16:00' }),
    competition({ kind: 'individual', fisCodex: '0001', date: '2026-11-21' }),
  ],
};

describe('parseDocuments', () => {
  it('reads label, codex and gender of every attachment', () => {
    expect(parseDocuments(HTML)[0]).toEqual({
      url: `${PDF}/women-results.pdf`,
      codex: 4,
      gender: 'W',
      label: 'Qualification Results',
    });
    expect(parseDocuments(HTML)).toHaveLength(6);
  });
});

describe('assignDocuments', () => {
  const result = assignDocuments(event, parseDocuments(HTML));
  const [training, qualification, mixed, individual] = result.competitions;

  it('keeps the event program once, on the event', () => {
    expect(result.documents).toEqual([
      { label: 'Event Program', url: `${PDF}/program.pdf` },
    ]);
  });

  it('matches men and mixed documents by codex and skips women', () => {
    expect(qualification?.documents).toEqual([
      { label: 'Start List Qualification', url: `${PDF}/men-start.pdf` },
    ]);
    expect(mixed?.documents).toEqual([
      { label: 'Media Stats', url: `${PDF}/mixed-stats.pdf` },
    ]);
    expect(individual?.documents).toBeUndefined();
  });

  it('moves training results to the training of the same day', () => {
    expect(training?.documents).toEqual([
      { label: 'Results Training', url: `${PDF}/men-training.pdf` },
    ]);
  });
});
