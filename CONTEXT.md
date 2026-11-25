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
