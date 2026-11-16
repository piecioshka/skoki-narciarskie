# skoki-narciarskie

@MEMORY.md

## What this is

A public static site with the Ski Jumping World Cup schedule: next competition with a countdown, season schedule, event program, links to Polish broadcasters and FIS live results. Polish and English.

## Layout

- `src/data/seasons/` holds one JSON file per season, validated by `src/lib/schema.ts`
- `src/lib/` holds all logic, with `*.spec.ts` next to the code it tests
- `src/scripts/app.ts` is the only browser script; anything that depends on "now" lives there
- `src/pages/[lang]/` holds the views, `e2e/specs/` drives the built site
- `src/data/programs/` and `src/assets/programs/` hold the gallery of handwritten programs
- `src/data/standings/` is refreshed by `npm run standings`, `src/data/teams/` is edited by hand
- `tmp/` takes logs, screenshots and throwaway scripts, and is ignored by git

## Conventions

- Code, comments and commit messages in English; README and CONTRIBUTING in Polish
- Dates in UI only as ISO (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm`)
- CSS targets classes only, no inline styles
- Conventional Commits, no `Co-Authored-By`

## Before calling a task done

```bash
npm run ci
```
