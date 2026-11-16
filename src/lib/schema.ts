import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTime = z.string().regex(/^\d{2}:\d{2}$/);

export const competitionSchema = z.object({
  fisRaceId: z.number().int().positive(),
  kind: z.enum(['qualification', 'individual', 'team', 'mixed-team']),
  hillSize: z.number().int().positive(),
  // Date and time are local to the venue; `time: null` means "not announced".
  date: isoDate,
  time: localTime.nullable(),
  status: z.enum(['scheduled', 'cancelled', 'moved']),
});

export const eventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(['world-cup', 'world-championships']),
  tags: z.array(z.enum(['four-hills', 'ski-flying'])),
  fisEventId: z.number().int().positive(),
  city: z.string().min(1),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  hillName: z.string().min(1),
  timeZone: z.string().min(1),
  broadcasts: z.array(z.string()),
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
