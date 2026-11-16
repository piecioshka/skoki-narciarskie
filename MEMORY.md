# Pamięć

Fakty o TYM repozytorium, których nie widać w kodzie ani w historii gita.

## Fakty

- [2026-11-16] [referencja] FIS nie podaje godzin startu w HTML (`data-time` jest puste); godziny są tylko w PDF "Event Program" na stronie zawodów (`/DB/v2/download/competition-attachment/<uuid>.pdf`), sekcja "Event schedule (LOC times)", wyciągać przez `pdftotext -layout`. Strony FIS wymagają nagłówka `User-Agent` przeglądarki.
- [2026-11-16] [referencja] FIS datuje kwalifikacje dniem konkursu, do którego należą, a nie dniem rozegrania (Ruka: kwalifikacje "28 Nov" odbywają się 27.11 o 18:15). Datę w pliku sezonu brać z PDF programu.
- [2026-11-16] [projekt] Godziny na 2026-11-16 nieznane dla: Zakopane, Lake Placid, Lahti, Oslo, Falun (`time: null`). Uzupełnić, gdy FIS opublikuje programy.
- [2026-11-16] [projekt] Nadawcy w sezonie 2026/2027: konkursy zagraniczne Eurosport, TVN i HBO Max; konkursy w Polsce (Wisła, Zakopane) TVP na mocy umowy z PZN od 2026/27. Nadawca MŚ w Falun niepotwierdzony, więc `broadcasts` jest tam puste.
- [2026-11-16] [projekt] Odręczne kartki z programem przygotowuje strona na Facebooku (link w `src/config.ts`). User przysyła je w rozmowie; zapisywać w `sources/<sezon>/` z wpisem w `index.json`, nie pobierać automatycznie z Facebooka i nie publikować na stronie.
- [2026-11-16] [referencja] `slot` jest w Astro zarezerwowanym atrybutem (nazwane sloty): prop komponentu o tej nazwie daje błąd typu `string & Slot`. Stąd `timeSlot` w `SlotTime.astro`.
