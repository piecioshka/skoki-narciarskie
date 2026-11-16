import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTime = z.string().regex(/^\d{2}:\d{2}$/);

export const competitionSchema = z.object({
  fisRaceId: z.number().int().positive(),
  kind: z.enum([
    'qualification',
    'individual',
    'team',
    'super-team',
    'mixed-team',
  ]),
  // Unknown for seasons imported from FIS, which publishes only the hill type.
  hillSize: z.number().int().positive().nullable(),
  hillType: z.enum(['normal', 'large', 'flying']).optional(),
  // Date and time are local to the venue; `time: null` means "not announced".
  date: isoDate,
  time: localTime.nullable(),
  status: z.enum(['scheduled', 'cancelled', 'moved']),
  // Podium of a finished competition; teams have no `name`.
  results: z
    .array(
      z.object({
        rank: z.number().int().positive(),
        name: z.string().min(1).optional(),
        nation: z.string().regex(/^[A-Z]{3}$/),
        fisCompetitorId: z.number().int().positive().optional(),
      }),
    )
    .default([]),
});

export const officialSchema = z.object({
  role: z.enum(['technical-delegate', 'technical-delegate-assistant', 'judge']),
  name: z.string().min(1),
  // FIS three-letter nation code, e.g. GER.
  nation: z.string().regex(/^[A-Z]{3}$/),
});

export const eventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['world-cup', 'world-championships']),
  tags: z.array(z.enum(['four-hills', 'ski-flying'])),
  fisEventId: z.number().int().positive(),
  city: z.string().min(1),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  hillName: z.string().min(1).nullable(),
  timeZone: z.string().min(1),
  broadcasts: z.array(z.string()),
  officials: z.array(officialSchema).default([]),
  competitions: z.array(competitionSchema).min(1),
});

export const broadcasterSchema = z.object({
  name: z.string().min(1),
  url: z.url(),
});

export const seasonSchema = z
  .object({
    id: z.string().regex(/^\d{4}-\d{4}$/),
    broadcasters: z.record(z.string(), broadcasterSchema),
    events: z.array(eventSchema).min(1),
  })
  .refine(
    (season) =>
      season.events.every((event) =>
        event.broadcasts.every((id) => id in season.broadcasters),
      ),
    { message: 'Event refers to an unknown broadcaster' },
  );

export type Competition = z.infer<typeof competitionSchema>;
export type SeasonEvent = z.infer<typeof eventSchema>;
export type Broadcaster = z.infer<typeof broadcasterSchema>;
export type Season = z.infer<typeof seasonSchema>;
export type CompetitionKind = Competition['kind'];
export type EventTag = SeasonEvent['tags'][number];

export const programSchema = z.object({
  file: z.string().min(1),
  receivedAt: isoDate,
  // Slug of the event the sheet covers; null for a whole-season program.
  eventSlug: z.string().nullable(),
  sourceUrl: z.url(),
  description: z.string().min(1),
});

export const standingsRowSchema = z.object({
  rank: z.number().int().positive(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  nation: z.string().regex(/^[A-Z]{3}$/),
  points: z.number().int().nonnegative(),
  fisCompetitorId: z.number().int().positive(),
});

export const standingsSchema = z.object({
  season: z.string().regex(/^\d{4}-\d{4}$/),
  // Day the table was fetched from FIS; null until the first fetch with rows.
  updatedAt: isoDate.nullable(),
  sourceUrl: z.url(),
  rows: z.array(standingsRowSchema),
});

export const athleteSchema = z.object({
  name: z.string().min(1),
  // Profile page (Wikipedia); omitted when no verified page exists.
  url: z.url().optional(),
});

export const staffSchema = z.object({
  name: z.string().min(1),
  url: z.url().optional(),
  role: z.enum([
    'head-coach',
    'assistant-coach',
    'service-technician',
    'physiotherapist',
    'team-manager',
  ]),
});

export const teamsSchema = z.object({
  season: z.string().regex(/^\d{4}-\d{4}$/),
  sourceUrl: z.url(),
  verifiedAt: isoDate,
  teams: z.array(
    z.object({
      id: z.string().min(1),
      athletes: z.array(athleteSchema).min(1),
      staff: z.array(staffSchema).min(1),
    }),
  ),
});

export type Official = z.infer<typeof officialSchema>;
export type OfficialRole = Official['role'];
export type Program = z.infer<typeof programSchema>;
export type StandingsRow = z.infer<typeof standingsRowSchema>;
export type Standings = z.infer<typeof standingsSchema>;
export type StaffMember = z.infer<typeof staffSchema>;
export type StaffRole = StaffMember['role'];
export type Teams = z.infer<typeof teamsSchema>;

export const hillSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  // Events are matched by slug, so the data also serves earlier seasons.
  eventSlug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  kPoint: z.number().positive(),
  hillSize: z.number().positive(),
  // Official men's record; longer unofficial jumps are mentioned in `facts`.
  record: z
    .object({
      distance: z.number().positive(),
      athlete: z.string().min(1),
      nation: z.string().regex(/^[A-Z]{3}$/),
      date: isoDate,
    })
    .nullable(),
  opened: z.number().int().nullable(),
  lastRebuilt: z.number().int().nullable(),
  capacity: z.number().int().nullable(),
  inrunLength: z.number().positive().nullable(),
  takeoffAngle: z.number().positive().nullable(),
  landingAngle: z.number().positive().nullable(),
  facts: z.array(z.object({ pl: z.string().min(1), en: z.string().min(1) })),
  sourceUrl: z.url(),
});

export type Hill = z.infer<typeof hillSchema>;

const localized = z.object({ pl: z.string().min(1), en: z.string().min(1) });
const podiumPlace = z.object({
  // Athlete name; omitted when a national team takes the place.
  name: z.string().min(1).optional(),
  // FIS nation code.
  nation: z.string().regex(/^[A-Z]{3}$/),
});

export const tournamentSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  firstEdition: z.number().int(),
  status: z.enum(['active', 'paused', 'ended']),
  // Drawn banner: gradient colors, color of the flight paths and their count.
  banner: z.object({
    from: z.string().regex(/^#[0-9a-f]{6}$/),
    to: z.string().regex(/^#[0-9a-f]{6}$/),
    accent: z.string().regex(/^#[0-9a-f]{6}$/),
    marks: z.number().int().min(1).max(8),
  }),
  // Host cities in tournament order.
  hosts: z.array(z.string().min(1)).min(1),
  // Events of a season that belong to the tournament, keyed by season id.
  events: z.record(z.string(), z.array(z.string())),
  description: localized,
  format: localized,
  prize: localized.nullable(),
  statusNote: localized.nullable(),
  winners: z.array(
    z.object({
      edition: z.string().min(1),
      podium: z.array(podiumPlace).min(1).max(3),
      // Second athlete of a shared victory (Four Hills 2005/06).
      coWinner: podiumPlace.optional(),
    }),
  ),
  sourceUrl: z.url(),
});

export type Tournament = z.infer<typeof tournamentSchema>;
