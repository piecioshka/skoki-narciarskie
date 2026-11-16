# Rozwój projektu

## Uruchomienie

```bash
nvm use
npm install
npm run dev
```

Serwer deweloperski startuje na pierwszym wolnym porcie od 3000.

## Skrypty

- `npm run dev` - serwer deweloperski Astro
- `npm run build` - statyczny build do `dist/`
- `npm run preview` - podgląd zbudowanej strony
- `npm run typecheck` - `astro check`
- `npm test` - testy jednostkowe (Vitest)
- `npm run e2e` - testy end-to-end (Playwright, headless, na zbudowanej stronie)
- `npm run lint` - ESLint
- `npm run format` / `npm run format:check` - Prettier
- `npm run ci` - wszystko, co uruchamia CI; ten sam skrypt odpala hook `pre-push`

## Architektura

Strona jest w pełni statyczna (Astro, `output: 'static'`). Build nie zna bieżącego czasu, więc wszystko, co zależy od "teraz", liczy mały skrypt w przeglądarce.

- `src/data/seasons/` - dane, jeden plik JSON na sezon
- `src/lib/schema.ts` - schemat Zod sezonu, walidowany przy buildzie i w testach
- `src/lib/time.ts` - przeliczanie czasu lokalnego skoczni na UTC i formatowanie dat
- `src/lib/schedule.ts` - lista konkursów, najbliższy konkurs, fazy (`upcoming`, `today`, `live`, `finished`)
- `src/lib/ics.ts` - kalendarz ICS
- `src/lib/links.ts` - adresy FIS i nadawców
- `src/i18n/` - słowniki `pl` i `en`
- `src/scripts/app.ts` - skrypt przeglądarkowy: godziny w strefie widza, fazy, odliczanie, motyw, skróty
- `src/pages/[lang]/` - widoki: strona główna, terminarz sezonu, strona zawodów, endpoint `calendar.ics`
- `e2e/specs/` - testy Playwright z podmienionym zegarem
- `sources/` - archiwum odręcznych kartek z programem (poza buildem)

Trasy:

- `/` - przekierowanie na `/pl/` albo `/en/`
- `/[lang]/` - najbliższy konkurs i trzy kolejne zawody
- `/[lang]/[season]/` - terminarz sezonu
- `/[lang]/[season]/[event]/` - program zawodów
- `/[lang]/[season]/calendar.ics` - kalendarz

## Dane sezonu

Plik `src/data/seasons/<sezon>.json`:

- `id` - np. `2026-2027`
- `broadcasters` - słownik nadawców (`name`, `url`)
- `events[]` - zawody:
  - `slug`, `type` (`world-cup` albo `world-championships`), `tags` (`four-hills`, `ski-flying`)
  - `fisEventId` - identyfikator wydarzenia w FIS
  - `city`, `countryCode`, `hillName`, `timeZone` (strefa IANA skoczni)
  - `broadcasts` - identyfikatory nadawców
  - `competitions[]` - `fisRaceId`, `kind` (`qualification`, `individual`, `team`, `mixed-team`), `hillSize`, `date`, `time`, `status`

`date` i `time` są w czasie lokalnym skoczni. `time: null` oznacza, że godzina nie jest jeszcze znana; strona pokazuje wtedy samą datę. `status` przyjmuje `scheduled`, `cancelled` albo `moved`.

Linki do wyników powstają z `fisRaceId`, więc nie wpisuje się ich ręcznie.

## Aktualizacja danych

Źródłem prawdy jest kalendarz FIS:

- lista zawodów: `https://www.fis-ski.com/DB/ski-jumping/calendar-results.html` (sezon, kategoria `WC` albo `WSC`, mężczyźni)
- strona zawodów: `event-details.html?sectorcode=JP&eventid=<fisEventId>&seasoncode=<rok>` z listą konkursów i ich `raceid`
- godziny startu: PDF "Event Program" na stronie zawodów, sekcja "Event schedule (LOC times)"

Po zmianie pliku sezonu uruchom `npm test` (walidacja schematu) i `npm run build`.

## Dodanie sezonu

1. Utwórz `src/data/seasons/<sezon>.json` według opisu wyżej.
2. Najnowszy sezon (największe `id`) staje się domyślny na stronie głównej.
3. Gdy sezonów jest więcej niż jeden, terminarz sam pokazuje przełącznik sezonu.

## Archiwum kartek

Odręczne programy trafiają do `sources/<sezon>/<RRRR-MM-DD>-<slug>.png` z wpisem w `sources/<sezon>/index.json`. To cudze grafiki: zostają w repozytorium jako materiał źródłowy i nie są publikowane na stronie.

## Wdrożenie

Workflow `.github/workflows/pages.yml` buduje stronę i publikuje `dist/` na GitHub Pages po każdym pushu do `main`. Ścieżkę bazową i adres strony przekazują zmienne `BASE_PATH` i `SITE_URL`.

## Konwencje

- kod, komentarze i commity po angielsku, commity w stylu Conventional Commits
- daty w interfejsie wyłącznie w formacie ISO (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm`)
- CSS celuje w klasy, bez stylów inline
- pliki tymczasowe tylko w `tmp/`
