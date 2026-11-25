# Context

Domain terms used in the code of this repository.

### Slot

The time window of one competition: from its start until the expected end (start plus 150 minutes). A competition without an announced time gets an untimed slot that covers the whole day at the venue.

### Phase

Where a slot stands for the current time: `upcoming`, `today`, `live` or `finished`. An untimed slot is never `live`, only `today` on its day; an event card takes its phase from the slots of its competitions.

### Live

A competition with a known time between its start and its expected end. One definition (`isLive` in `src/lib/timing.ts`) drives the phase labels, the red frame and the live favicon.

### Scheduled competition

A competition that takes part in phases, "next" and start alerts: any competition that is not cancelled. Trainings count on the event page, but not in the next competition, the countdown or start alerts.

### Timing attributes

The data attributes through which the static build hands a slot to the browser script. Pages spread `timingAttributes` or `eventTimingAttributes` on an element, and the browser reads them back with `readTiming`; a cancelled competition gets none and so has no phase.

### Venue

The town an event is held in, together with whether the event is ski flying: a second visit in one season gets a numbered slug (`zakopane-2`) and still shares the venue, while ski flying uses a different hill than the other events of the same town. `venueKey` in `src/lib/hills.ts` is the one rule for matching venues.

### Hill of a competition

The venue hill whose size equals the competition's `hillSize` (`hillOfCompetition`). Per-competition things use it: the countdown poster, the hill label, start alerts and the calendar.

### Hill of an event

The hill that stands for a whole event (`hillOfEvent`): the largest hill its competitions use, or the largest venue hill when no competition has a size. Event-level things use it: the event photo and the map point. At a two-hill venue like Falun it is the large hill.

### Hill label

How a competition's hill is written (`competitionHillLabel`): "HS132 (K120)", plain "HS132" when the hill data has no hill of that size, the hill type ("large hill") when the size is unknown, and nothing when neither is known.
