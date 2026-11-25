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
- `npm run e2e` - testy end-to-end (Playwright, headless). Same budują stronę z datą buildu przypiętą przez `BUILD_NOW` (`npm run build:e2e`), bo strona główna i odliczanie pomijają konkursy zakończone przed buildem
- `npm run lint` - ESLint
- `npm run format` / `npm run format:check` - Prettier
- `npm run standings` - pobiera klasyfikację generalną z FIS do `src/data/standings/`
- `npm run nations-cup` - pobiera Puchar Narodów z FIS do `src/data/nations-cup/`; `npm run nations-cup -- --all` sprawdza wszystkie sezony, które mają plik klasyfikacji
- `npm run documents` - pobiera z FIS pliki PDF zawodów (program, listy startowe, wyniki, Media Stats) dla nadchodzących i trwających zawodów; jedne zawody: `npm run documents -- 2026-2027 lillehammer`
- `npm run import-season -- 2025-2026` - importuje zakończony sezon z FIS (zawody, konkursy mężczyzn i mieszane, podia)
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
- `src/data/standings/` - klasyfikacja generalna, jeden plik na sezon
- `src/data/nations-cup/` - Puchar Narodów, jeden plik na sezon
- `src/data/teams/` - kadry reprezentacji ze sztabem
- `src/data/programs/` i `src/assets/programs/` - metadane i skany odręcznych programów
- `scripts/update-standings.ts` - skrypt aktualizujący klasyfikację
- `scripts/update-nations-cup.ts` - skrypt aktualizujący Puchar Narodów

Trasy:

- `/` - przekierowanie na `/pl/` albo `/en/`
- `/[lang]/` - najbliższy konkurs i trzy kolejne zawody
- `/[lang]/[season]/` - terminarz sezonu
- `/[lang]/[season]/[event]/` - program zawodów
- `/[lang]/[season]/calendar.ics` - kalendarz
- `/[lang]/[season]/standings/` - klasyfikacja generalna
- `/[lang]/[season]/nations-cup/` - Puchar Narodów
- `/[lang]/[season]/polish-team/` - kadry A i B ze sztabem
- `/[lang]/[season]/gallery/` - galeria odręcznych programów
- `/[lang]/tournaments/` i `/[lang]/tournaments/[slug]/` - lista i profile turniejów
- `/[lang]/hills/` i `/[lang]/hills/[slug]/` - lista (z mapą i grupowaniem według kraju) i profile skoczni
- `/[lang]/nations/` i `/[lang]/nations/[kod]/` - reprezentacje
- `/[lang]/credits/` - autorzy zdjęć
- `/[lang]/rules/` - zasady skoków ze schematami

## Dane sezonu

Plik `src/data/seasons/<sezon>.json`:

- `id` - np. `2026-2027`
- `channels` - słownik kanałów TV (`name`, `options`: serwisy online z linkiem, telewizja naziemna `antenna`, kablowa i satelitarna `pay-tv`)
- `events[]` - zawody:
  - `slug`, `type` (`world-cup` albo `world-championships`), `tags` (`four-hills`, `ski-flying`)
  - `fisEventId` - identyfikator wydarzenia w FIS
  - `city`, `countryCode`, `hillName`, `timeZone` (strefa IANA skoczni)
  - `channels` - klucze z `channels` sezonu: kanały pokazujące zawody
  - `competitions[]` - `fisRaceId`, `kind` (`qualification`, `individual`, `team`, `mixed-team`), `hillSize`, `date`, `time`, `status`, opcjonalnie `channels` (własna lista kanałów konkursu; bez pola obowiązuje lista zawodów, pusta lista znaczy "bez transmisji")

`date` i `time` są w czasie lokalnym skoczni. `time: null` oznacza, że godzina nie jest jeszcze znana; strona pokazuje wtedy samą datę. `status` przyjmuje `scheduled`, `cancelled` albo `moved`.

Linki do wyników powstają z `fisRaceId`, więc nie wpisuje się ich ręcznie.

## Aktualizacja danych

Źródłem prawdy jest kalendarz FIS:

- lista zawodów: `https://www.fis-ski.com/DB/ski-jumping/calendar-results.html` (sezon, kategoria `WC` albo `WSC`, mężczyźni)
- strona zawodów: `event-details.html?sectorcode=JP&eventid=<fisEventId>&seasoncode=<rok>` z listą konkursów i ich `raceid`
- godziny startu: PDF "Event Program" na stronie zawodów, sekcja "Event schedule (LOC times)"

Po zmianie pliku sezonu uruchom `npm test` (walidacja schematu) i `npm run build`.

## Sezony archiwalne

`npm run import-season -- <sezon>` pobiera z FIS kalendarz Pucharu Świata mężczyzn, strony zawodów i wyniki, a potem zapisuje plik sezonu z podium każdego konkursu (`results`). Kwalifikacje są pomijane. FIS po około 50 szybkich zapytaniach odpowiada kodem 429, więc skrypt robi jedno zapytanie na 3 sekundy, a odpowiedzi zapisuje w `tmp/fis-cache/` (ponowne uruchomienie nie kosztuje zapytań).

Importowane sezony nie mają rozmiaru skoczni ani jej nazwy (FIS podaje tylko typ: normalna, duża, mamucia), stąd `hillSize: null`, `hillType` i `hillName: null`. Nazwa skoczni na stronie pochodzi wtedy z `src/data/hills.json`. Drugie zawody w tej samej miejscowości w jednym sezonie dostają slug z numerem, np. `planica-2`.

## Dodanie sezonu

1. Utwórz `src/data/seasons/<sezon>.json` według opisu wyżej.
2. Najnowszy sezon (największe `id`) staje się domyślny na stronie głównej.
3. Gdy sezonów jest więcej niż jeden, terminarz sam pokazuje przełącznik sezonu.

## Klasyfikacja generalna

`npm run standings` pobiera tabelę Pucharu Świata mężczyzn z FIS i zapisuje ją do `src/data/standings/<sezon>.json` (domyślnie najnowszy sezon, inny podaje się argumentem: `npm run standings -- 2025-2026`). Uruchom po każdym konkursie i zacommituj wynik. Zanim sezon się zacznie, strona pokazuje końcową tabelę poprzedniego sezonu.

## Puchar Narodów

`npm run nations-cup` pobiera z FIS Puchar Narodów Pucharu Świata mężczyzn (`cupcode=NC-WC`) i zapisuje go do `src/data/nations-cup/<sezon>.json` (domyślnie najnowszy sezon, inny podaje się argumentem). Co godzinę robi to workflow `refresh-data.yml`. `npm run nations-cup -- --all` sprawdza wszystkie sezony z `src/data/standings/` przez cache w `tmp/fis-cache/`. FIS publikuje Puchar Narodów od sezonu 2018/2019. Gdy strona FIS pokazuje inny puchar, skrypt nie zapisuje pliku, więc starsze sezony nie mają stron; wyjątkiem jest najnowszy sezon, który przed pierwszym konkursem dostaje plik z pustym `rows` i `updatedAt: null`. Oba skrypty (`standings` i `nations-cup`) nigdy nie zastępują zapisanych wierszy pustą tabelą i nie zmieniają pliku, gdy tabela się nie zmieniła, więc `updatedAt` to dzień ostatniej zmiany.

## Kadry

`src/data/teams/<sezon>.json` zawiera kadry A i B ze sztabem według strony PZN. Pole `url` dostają tylko osoby, których stronę (Wikipedia) udało się potwierdzić.

## Sędziowie

Pole `officials` wydarzenia w pliku sezonu: `role` (`technical-delegate`, `technical-delegate-assistant`, `judge`), `name`, `nation` (trzyliterowy kod FIS). Dane są w PDF-ach "Event Program" FIS, zwykle na kilka tygodni przed zawodami.

## Skocznie

`src/data/hills.json` zawiera parametry, oficjalny rekord mężczyzn i ciekawostki (po polsku i angielsku) każdej skoczni. Skocznia jest przypisana do zawodów polem `eventSlug`, więc te same dane obsługują kolejne sezony. Wartości niepotwierdzone w źródle mają `null` i nie są pokazywane.

## Turnieje

`src/data/tournaments.json` opisuje turnieje rozgrywane w ramach Pucharu Świata: `status` (`active`, `paused`, `ended`), gospodarzy, zasady, nagrody, podium ostatnich edycji i pole `events` z listą zawodów turnieju w danym sezonie (`{ "2026-2027": ["oberstdorf", ...] }`). Po sezonie dopisz nową edycję do `winners`, a przy nowym sezonie uzupełnij `events`. Miejsce na podium bez `name` oznacza reprezentację kraju.

## Zdjęcia i portrety

Wszystkie zdjęcia pochodzą z Wikimedia Commons i są na wolnych licencjach. Autor, licencja i adres źródła są zapisane przy każdym pliku, a strona `/[lang]/credits/` wypisuje je wszystkie.

- skocznie: `src/assets/hills/`, opis w polu `photo` w `src/data/hills.json`
- turnieje: `src/assets/tournaments/`, pole `photo` w `src/data/tournaments.json`; bez zdjęcia pokazywany jest rysowany baner
- osoby: `src/assets/people/`, indeks w `src/data/avatars.json` pod kluczem z nazwiska bez znaków diakrytycznych (`piotr zyla`); osoba bez zdjęcia dostaje kółko z inicjałami

Portret trafia do indeksu tylko wtedy, gdy krótki opis hasła w Wikipedii potwierdza, że chodzi o skoczka albo trenera, żeby nie pokazać imiennika.

## Reprezentacje

Strony `/[lang]/nations/` i `/[lang]/nations/[kod]/` nie mają własnych danych: `src/lib/nations.ts` sumuje punkty z plików klasyfikacji (od 2000/2001), liczy Kryształowe Kule, zwycięstwa w turniejach oraz zwycięstwa, podia i wyniki drużynowe z zaimportowanych sezonów.

## Mapy

Mapy rysuje Leaflet na kafelkach OpenStreetMap (`src/scripts/map.ts`). Współrzędne skoczni są w `src/data/hills.json` (`lat`, `lon`); zawody bez danych skoczni nie trafiają na mapę terminarza.

## Kariery, trenerzy i składy

- `npm run careers` pobiera z biografii FIS zwycięstwa i podia w konkursach indywidualnych PŚ dla zawodników, którzy choć raz skończyli sezon w czołowej trzydziestce, i zapisuje je do `src/data/careers.json`.
- `src/data/coaches.json` to trenerzy główni reprezentacji jako kadencje pełnych sezonów (`from`, `to`); sezon należy do trenera, który go zaczynał. Sezony bez pewnego źródła zostają bez wpisu.
- `src/data/teams/<sezon>.json` trzyma kadry wszystkich krajów pod kluczem `nations` (kod FIS). Grupa może mieć własną nazwę (`name`), inaczej dostaje ogólną etykietę według `id` (`a`, `b`, `national`).

## Zasady

Treść strony z zasadami jest w `src/i18n/rules.ts`, a schematy (przekrój skoczni, wzór noty, noty sędziów, wiatr) są rysowane w `src/pages/[lang]/rules/index.astro` jako SVG i HTML stylowane klasami.

## Galeria odręcznych programów

Skan trafia do `src/assets/programs/<sezon>/<RRRR-MM-DD>-<slug>.png`, a wpis do `src/data/programs/<sezon>.json`: `file`, `receivedAt`, `eventSlug` (slug zawodów albo `null` dla programu całego sezonu), `sourceUrl`, `description`. Astro sam robi miniaturę i wersję do podglądu. Program przypisany do zawodów pokazuje się też na ich stronie.

## Baner

Źródłem banera jest `docs/banner.svg`. Po zmianie wygeneruj z niego oba pliki:

```bash
rsvg-convert -w 1200 -h 630 -o public/og-image.png docs/banner.svg
rsvg-convert -w 2560 -h 1280 -o docs/banner.png docs/banner.svg
```

## Wdrożenie

Workflow `.github/workflows/pages.yml` buduje stronę i publikuje `dist/` na GitHub Pages po każdym pushu do `main`. Ścieżkę bazową i adres strony przekazują zmienne `BASE_PATH` i `SITE_URL`.

## Konwencje

- kod, komentarze i commity po angielsku, commity w stylu Conventional Commits
- daty w interfejsie wyłącznie w formacie ISO (`YYYY-MM-DD`, `YYYY-MM-DD HH:mm`)
- CSS celuje w klasy, bez stylów inline
- pliki tymczasowe tylko w `tmp/`
