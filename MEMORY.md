# Pamięć

Fakty o TYM repozytorium, których nie widać w kodzie ani w historii gita.

## Fakty

- [2026-11-16] [referencja] FIS nie podaje godzin startu w HTML (`data-time` jest puste); godziny są tylko w PDF "Event Program" na stronie zawodów (`/DB/v2/download/competition-attachment/<uuid>.pdf`), sekcja "Event schedule (LOC times)", wyciągać przez `pdftotext -layout`. Strony FIS wymagają nagłówka `User-Agent` przeglądarki.
- [2026-11-16] [referencja] FIS datuje kwalifikacje dniem konkursu, do którego należą, a nie dniem rozegrania (Ruka: kwalifikacje "28 Nov" odbywają się 27.11 o 18:15). Datę w pliku sezonu brać z PDF programu.
- [2026-11-16] [projekt] Godziny na 2026-11-16 nieznane dla: Zakopane, Lake Placid, Lahti, Oslo, Falun (`time: null`). Uzupełnić, gdy FIS opublikuje programy.
- [2026-11-16] [projekt] Nadawcy w sezonie 2026/2027: konkursy zagraniczne Eurosport, TVN i HBO Max; konkursy w Polsce (Wisła, Zakopane) TVP na mocy umowy z PZN od 2026/27. Nadawca MŚ w Falun niepotwierdzony, więc `broadcasts` jest tam puste.
- [2026-11-16] [projekt] Odręczne kartki z programem przygotowuje strona na Facebooku (link w `src/config.ts`), osobną na każdy weekend. User przysyła je w rozmowie i chce je mieć w publicznej galerii: skan do `src/assets/programs/<sezon>/`, wpis w `src/data/programs/<sezon>.json` (`eventSlug` zawodów albo `null` dla programu sezonu). Nie pobierać automatycznie z Facebooka.
- [2026-11-16] [projekt] Klasyfikację generalną odświeża `npm run standings` (pobiera stronę FIS i nadpisuje `src/data/standings/<sezon>.json`); trzeba ją uruchamiać po każdym konkursie i commitować. Przed pierwszym konkursem sezonu FIS zamiast pustej tabeli PŚ zwraca inny ranking (`cupcode=WRL`), dlatego skrypt odrzuca wiersze z innym kodem pucharu.
- [2026-11-16] [projekt] Kadry A i B są z `pzn.pl/skoki-narciarskie`. Linki do Wikipedii dostają tylko osoby ze sprawdzonym hasłem; bez linku zostali Kamil Skrobot, Kacper Skrobot, Maciej Kreczmer (hasło o biegaczu o tym samym nazwisku, tożsamość niepotwierdzona), Paweł Gurbisz, Paweł Leja, Wojciech Jurowicz, Kamil Waszek, Konrad Tomasiak.
- [2026-11-16] [projekt] Sędziowie i delegaci (`officials` w pliku sezonu) pochodzą z PDF-ów programów FIS; większość programów ich jeszcze nie podaje. Drugie nazwisko pod delegatem technicznym bywa bez etykiety i jest wpisane jako asystent delegata (tak jest opisane wprost tylko w programie Wisły).
- [2026-11-16] [referencja] Treści z apostrofami albo backtickami (TS, Python) nie przechodzą przez `bash -c '...'` z heredokiem: powłoka zjada cudzysłowy. Skrypty pomocnicze zapisywać narzędziem Write do `tmp/` i dopiero uruchamiać.
- [2026-11-16] [referencja] `slot` jest w Astro zarezerwowanym atrybutem (nazwane sloty): prop komponentu o tej nazwie daje błąd typu `string & Slot`. Stąd `timeSlot` w `SlotTime.astro`.
