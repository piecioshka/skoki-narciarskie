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

### Refresh scripts

The Node scripts in `scripts/` that read FIS pages and write data files: `documents`, `standings` and `nations-cup` run every hour in GitHub Actions, `import-season` and `careers` are run by hand. Their parsers live in `src/lib/fis-*.ts`, so they are unit-tested without the network.

### Nations Cup

The official FIS team classification of a season (`cupcode=NC-WC`): the points of all athletes of a country summed, team competitions included. It is not the sum of the overall standings, which leaves team events out and is what the nations pages add up. FIS has it from the 2018-19 season; older seasons have no file and no page, and only the latest season keeps an empty file before its first competition.

### FIS client

The one way the refresh scripts fetch FIS pages (`createFisClient` in `src/lib/fis-client.ts`): a browser User-Agent, a 3 s gap between requests, and a 60 s wait and retry after a 429. Its fetch and sleep can be swapped out in tests.

### FIS page cache

An optional disk cache of FIS pages in `tmp/fis-cache/`, one file per URL hash (`fileCache`). The hand-run scripts use it, so a rerun costs no requests; the hourly refresh does not, because it must see the current pages.

### Channel

A TV channel (Eurosport 1, TVN, TVP) with every way to watch it: online services, terrestrial TV or pay TV. Seasons keep them in `channels`, and events and competitions point at them by key; there is no separate broadcaster layer.

### Channels of a competition

The channels a competition is shown on (`getChannels` in `src/lib/links.ts`): its own `channels` list, or the event's when it has none. An empty result shows a note: "not announced yet" when the competition has no list of its own, "not on TV" when it has an empty one.

### Route

The identity of one page without language or base path, such as `{ name: 'event', seasonId, slug }` (`Route` in `src/lib/routes.ts`). `routePath` turns it into a path, `sectionOf` names the nav section it highlights, and `NAV` declares each top bar section once with its landing route, labels and shortcut key; pages hand their route to the layout instead of a path string.

### Shared watch panel

The where-to-watch panel of a channel set, rendered once per page as a `<template>` (`watchPanelId` in `src/lib/links.ts`). On the home page only the next card shown without JS has its panel inline; the other cards clone the shared one when their summary is first opened.

### Poster parts

The parts every countdown poster has in common: the backdrop, the clock with the live banner, and the footer (`PosterChrome.astro`). Only the poster shown without JS has them in the HTML; the page script copies them from templates into the poster it shows.
