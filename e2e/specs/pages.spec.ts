import { expect, test } from '@playwright/test';

const PAGES = [
  '/pl/2026-2027/standings/',
  '/pl/nations/pol/',
  '/pl/2026-2027/gallery/',
  '/pl/2026-2027/wisla/',
];

test.describe('navigation', () => {
  test('top bar links to every section', async ({ page }) => {
    await page.goto('/pl/');

    const nav = page.locator('.topbar__nav');

    await expect(nav.getByRole('link')).toHaveText([
      'Terminarz',
      'Klasyfikacja',
      'Galeria',
      'Skocznie',
      'Reprezentacje',
      'Turnieje',
      'Zasady',
    ]);
    await nav.getByRole('link', { name: 'Reprezentacje' }).click();
    await expect(page).toHaveURL(/\/pl\/nations\/$/);
  });

  test('"r", "n" and "g" open standings, nations and gallery', async ({
    page,
  }) => {
    await page.goto('/pl/');
    await page.keyboard.press('r');
    await expect(page).toHaveURL(/\/standings\/$/);
    await page.waitForLoadState('load');
    await page.keyboard.press('n');
    await expect(page).toHaveURL(/\/nations\/$/);
    // The shortcut handler exists only once the page script has run.
    await page.waitForLoadState('load');
    await page.keyboard.press('g');
    await expect(page).toHaveURL(/\/gallery\/$/);
  });
});

test.describe('active navigation link', () => {
  const cases = [
    ['/pl/2026-2027/', 'Terminarz'],
    ['/pl/2026-2027/wisla/', 'Terminarz'],
    ['/pl/2026-2027/standings/', 'Klasyfikacja'],
    ['/pl/nations/pol/', 'Reprezentacje'],
    ['/pl/2026-2027/gallery/', 'Galeria'],
  ] as const;

  for (const [path, label] of cases) {
    test(`${path} marks "${label}"`, async ({ page }) => {
      await page.goto(path);

      const current = page.locator('.topbar__nav [aria-current="page"]');

      await expect(current).toHaveCount(1);
      await expect(current).toHaveText(label);
    });
  }

  test('home page marks nothing', async ({ page }) => {
    await page.goto('/pl/');
    await expect(
      page.locator('.topbar__nav [aria-current="page"]'),
    ).toHaveCount(0);
  });
});

test.describe('standings', () => {
  test('before the season shows a notice and no table of another season', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/standings/');

    await expect(page.locator('.notice')).toContainText(
      'Sezon jeszcze się nie zaczął',
    );
    await expect(page.locator('.table')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: /Końcowa klasyfikacja/ }),
    ).toHaveCount(0);
  });

  test('a finished season shows its final table', async ({ page }) => {
    await page.goto('/pl/2025-2026/standings/');

    const rows = page.locator('.table__row');

    await expect(rows.first()).toContainText('Domen Prevc');
    await expect(rows.first()).toContainText('2148');
    await expect(page.locator('.table__row--home').first()).toContainText(
      'Kacper Tomasiak',
    );
  });

  test('"Tylko Polacy" hides athletes from other countries', async ({
    page,
  }) => {
    await page.goto('/pl/2025-2026/standings/');

    const button = page.getByRole('button', { name: 'Tylko Polacy' });
    const visibleRows = page.locator('.table__row:visible');

    await expect(visibleRows).toHaveCount(77);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(visibleRows).toHaveCount(8);
    await expect(visibleRows.first()).toContainText('Kacper Tomasiak');
    await button.click();
    await expect(visibleRows).toHaveCount(77);
  });

  test('"Tylko Polacy" is remembered when switching seasons', async ({
    page,
  }) => {
    await page.goto('/pl/2022-2023/standings/');
    await page.getByRole('button', { name: 'Tylko Polacy' }).click();
    await page
      .locator('.season-switch')
      .getByRole('link', { name: '2021/2022' })
      .click();
    await expect(page).toHaveURL(/\/2021-2022\/standings\/$/);
    await expect(
      page.getByRole('button', { name: 'Tylko Polacy' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.locator('.table__row:visible:not(.table__row--home)'),
    ).toHaveCount(0);
  });

  test('column headers are written in sentence case', async ({ page }) => {
    await page.goto('/pl/2025-2026/standings/');

    const transform = await page
      .locator('th')
      .first()
      .evaluate((element) => getComputedStyle(element).textTransform);

    expect(transform).toBe('none');
    await expect(page.locator('th')).toHaveText([
      'Miejsce',
      'Zawodnik',
      'Kraj',
      'Punkty',
    ]);
  });
});

test.describe('polish team', () => {
  test('shows both teams with their head coaches', async ({ page }) => {
    await page.goto('/pl/nations/pol/');

    const teamA = page.locator('.team[data-team="a"]');
    const teamB = page.locator('.team[data-team="b"]');

    await expect(teamA.locator('.people__item--lead')).toContainText(
      'Maciej Maciusiak',
    );
    await expect(teamA).toContainText('Kacper Tomasiak');
    await expect(teamB.locator('.people__item--lead')).toContainText(
      'Wojciech Topór',
    );
    await expect(teamB).toContainText('Aleksander Zniszczoł');
    await expect(
      teamA.getByRole('link', { name: 'Maciej Maciusiak' }),
    ).toHaveAttribute('href', /pl\.wikipedia\.org\/wiki\/Maciej_Maciusiak/);
  });
});

test.describe('gallery', () => {
  test('shows program scans with a credit and a full-size link', async ({
    page,
    request,
  }) => {
    await page.goto('/pl/2026-2027/gallery/');

    const item = page.locator('.gallery__item').first();
    const image = item.locator('img');

    await expect(item).toContainText('Program sezonu');
    await expect(
      item.getByRole('link', { name: 'Autor programów' }),
    ).toHaveAttribute('href', /facebook\.com/);
    await expect(image).toHaveAttribute('alt', /Odręczny program/);
    expect(
      await image.evaluate(
        (element) =>
          element instanceof HTMLImageElement && element.naturalWidth,
      ),
    ).toBeGreaterThan(0);

    const href = await item.locator('.gallery__link').getAttribute('href');
    const response = await request.get(href ?? '');

    expect(response.headers()['content-type']).toContain('image/webp');
  });
});

test.describe('tournaments', () => {
  test('index lists every tournament with its status', async ({ page }) => {
    await page.goto('/pl/tournaments/');

    await expect(page.locator('.tournament-card')).toHaveCount(8);
    await expect(page.locator('.tournament-card .banner--photo')).toHaveCount(
      8,
    );
    await expect(
      page.locator('.tournament-card[data-tournament="four-hills"]'),
    ).toContainText('Rozgrywany');
    await expect(
      page.locator('.tournament-card[data-tournament="raw-air"]'),
    ).toContainText('Zawieszony');
    await expect(page.locator('.topbar__nav [aria-current="page"]')).toHaveText(
      'Turnieje',
    );
  });

  test('profile shows rules, events of the season and recent winners', async ({
    page,
  }) => {
    await page.goto('/pl/tournaments/four-hills/');

    await expect(
      page.getByRole('heading', { name: 'Turniej Czterech Skoczni' }),
    ).toBeVisible();
    await expect(page.locator('.event-card')).toHaveCount(4);
    await expect(page.locator('.table__row').first()).toContainText(
      'Domen Prevc',
    );
    await expect(page.locator('main')).toContainText('systemem KO');
    await expect(page.locator('.photo__credit')).toContainText(
      /CC BY|Public domain/,
    );

    const rows = page.locator('.table__row');

    await expect(rows).toHaveCount(74);
    await expect(rows.last()).toContainText('1953');
    await expect(rows.last()).toContainText('Sepp Bradl');
    await expect(rows.filter({ hasText: '2005/06' })).toContainText(
      /Janne Ahonen, .*Jakub Janda/,
    );
    await expect(rows.filter({ hasText: '1957/58' })).toContainText(
      'GDR Helmut Recknagel',
    );
  });

  test('lists the tournaments of the 2000s as well', async ({ page }) => {
    await page.goto('/pl/tournaments/nordic-tournament/');
    await expect(page.locator('.table__row')).toHaveCount(14);
    await expect(
      page.locator('.table__row').filter({ hasText: '2007' }),
    ).toContainText('Adam Małysz');

    await page.goto('/pl/tournaments/fis-team-tour/');
    await expect(page.locator('.table__row').first()).toContainText('Norwegia');
  });

  test('team podium is printed in the page language', async ({ page }) => {
    await page.goto('/en/tournaments/polski-turniej/');
    await expect(page.locator('.table__row').first()).toContainText('Austria');
    await expect(page.locator('.table__row').first()).toContainText('Germany');
  });

  test('event page links to its tournament', async ({ page }) => {
    await page.goto('/pl/2026-2027/innsbruck/');
    await page
      .locator('.event-header')
      .getByRole('link', { name: 'Turniej Czterech Skoczni' })
      .click();
    await expect(page).toHaveURL(/\/pl\/tournaments\/four-hills\/$/);
  });

  test('navigation links stay inside a 320 px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/pl/tournaments/raw-air/');

    const links = page.locator('.topbar__nav a');
    const count = await links.count();

    for (let index = 0; index < count; index += 1) {
      const box = await links.nth(index).boundingBox();

      expect(box?.x).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }

    // The strip must not cover the page heading.
    const nav = await page.locator('.topbar__nav').boundingBox();
    const first = await page.locator('main > *').first().boundingBox();

    expect(first?.y).toBeGreaterThanOrEqual((nav?.y ?? 0) + (nav?.height ?? 0));
  });
});

test.describe('season archive', () => {
  test('schedule switches between seasons', async ({ page }) => {
    await page.goto('/pl/2026-2027/');

    const switcher = page.locator('.season-switch');

    await expect(switcher.getByRole('link')).toHaveText([
      '2026/2027',
      '2025/2026',
      '2024/2025',
      '2023/2024',
    ]);
    await switcher.getByRole('link', { name: '2025/2026' }).click();
    await expect(page).toHaveURL(/\/pl\/2025-2026\/$/);
    await expect(page.locator('.event-card')).toHaveCount(19);
    await expect(
      page.locator('.event-card[data-event="klingenthal"]'),
    ).toHaveAttribute('data-phase', 'finished');
  });

  test('finished competition shows its podium and a link to results', async ({
    page,
  }) => {
    await page.goto('/pl/2025-2026/wisla/');

    const row = page.locator('.competition').first();

    await expect(row.locator('.podium__place')).toHaveText([
      /1\..*Domen Prevc/,
      /2\..*Philipp Raimund/,
      /3\..*Ryoyu Kobayashi/,
    ]);
    await expect(row).toContainText('skocznia duża');
    await expect(
      row.getByRole('link', { name: 'Wyniki', exact: true }),
    ).toBeVisible();
    await expect(
      row.getByRole('link', { name: 'Wyniki na żywo' }),
    ).toBeHidden();
  });

  test('team podium names countries and cancelled events are marked', async ({
    page,
  }) => {
    await page.goto('/pl/2025-2026/zakopane/');
    await expect(page.locator('.podium').first()).toContainText('Austria');
    await expect(page.locator('.competition').first()).toContainText(
      'Konkurs duetów',
    );

    await page.goto('/pl/2025-2026/lake-placid/');
    await expect(page.locator('.competition').first()).toContainText(
      'Odwołany',
    );
  });

  test('home page still shows the newest season', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-16T12:00:00Z'));
    await page.goto('/pl/');
    await expect(page.locator('.js-next:visible')).toContainText('Lillehammer');
    await expect(page.locator('.js-next:visible')).toContainText('2026-11-20');
  });
});

test.describe('external links', () => {
  const hasPictogram = (element: Element): boolean => {
    const after = getComputedStyle(element, '::after');

    return after.content !== 'none' && after.maskImage !== 'none';
  };

  test('links leaving the site end with a pictogram', async ({ page }) => {
    await page.goto('/pl/2026-2027/wisla/');

    const external = page.locator('main a[href^="http"]');
    const count = await external.count();

    expect(count).toBeGreaterThan(5);
    for (let index = 0; index < count; index += 1) {
      expect(await external.nth(index).evaluate(hasPictogram)).toBe(true);
    }
  });

  test('links leaving the site open in a new tab', async ({ page }) => {
    await page.goto('/pl/2026-2027/wisla/');

    const external = page.locator('main a[href^="http"]').first();

    await expect(external).toHaveAttribute('target', '_blank');
    await expect(external).toHaveAttribute('rel', /noopener/);
    await expect(page.locator('.back-link')).not.toHaveAttribute(
      'target',
      '_blank',
    );
  });

  test('internal links and the icon-only GitHub button have none', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/wisla/');

    const internal = page.locator('.back-link');
    const github = page.locator('.topbar__actions a[href^="https://github"]');

    expect(await internal.evaluate(hasPictogram)).toBe(false);
    expect(await github.evaluate(hasPictogram)).toBe(false);
  });
});

test.describe('hill profiles', () => {
  test('index lists every hill with a photo', async ({ page }) => {
    await page.goto('/pl/hills/');
    await expect(page.locator('.tournament-card:visible')).toHaveCount(43);
    expect(
      await page.locator('.hill-card__image:visible').count(),
    ).toBeGreaterThanOrEqual(19);
    await expect(page.locator('.topbar__nav [aria-current="page"]')).toHaveText(
      'Skocznie',
    );
  });

  test('button groups hills by country and remembers the choice', async ({
    page,
  }) => {
    await page.goto('/pl/hills/');

    const button = page.getByRole('button', { name: 'Grupuj według kraju' });
    const germany = page.locator('.country-group[data-country="DE"]');

    await expect(germany).toBeHidden();
    await button.click();
    await expect(germany).toBeVisible();
    await expect(germany.locator('.tournament-card')).toHaveCount(6);
    await expect(page.locator('.country-group__title').first()).toContainText(
      'Austria',
    );
    await expect(page.locator('.tournament-card:visible')).toHaveCount(43);
    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(germany).toBeVisible();
  });

  test('grouped view has a table of contents on the right', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/pl/hills/');

    const toc = page.locator('.toc');

    await expect(toc).toBeHidden();
    await page.getByRole('button', { name: 'Grupuj według kraju' }).click();
    await expect(toc).toBeVisible();
    await expect(toc.locator('.toc__link')).toHaveCount(17);

    const content = await page.locator('.with-toc__content').boundingBox();
    const box = await toc.boundingBox();

    expect(box?.x).toBeGreaterThan((content?.x ?? 0) + (content?.width ?? 0));
    await toc.getByRole('link', { name: /Polska/ }).click();
    await expect(page).toHaveURL(/#country-pl$/);
    await expect(page.locator('#country-pl')).toBeInViewport();
    await expect(toc.getByRole('link', { name: /Polska/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('profile shows the photo with credit, data and past winners', async ({
    page,
  }) => {
    await page.goto('/pl/hills/schattenbergschanze/');

    await expect(
      page.getByRole('heading', {
        name: 'Schattenbergschanze HS137',
        level: 2,
      }),
    ).toBeVisible();
    await expect(page.locator('.event-header')).toContainText('Oberstdorf');
    await expect(page.locator('.photo__credit')).toContainText(
      /CC BY|Public domain/,
    );
    await expect(page.locator('.hill__record')).toContainText('143,5 m');
    await expect(
      page.locator('.event-header').getByRole('link', {
        name: 'Turniej Czterech Skoczni',
      }),
    ).toBeVisible();

    const visits = page.locator('section', {
      has: page.getByRole('heading', { name: 'Konkursy na tej skoczni' }),
    });

    await expect(
      visits.locator('.table__row').filter({ hasText: '2025/2026' }),
    ).toContainText('Domen Prevc');
  });

  test('event page links to the hill profile and credits list the photos', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/zakopane/');
    await page.locator('.hill__title a').click();
    await expect(page).toHaveURL(/\/pl\/hills\/wielka-krokiew\/$/);

    await page.goto('/pl/credits/');
    await expect(page.locator('.table__row').first()).toBeVisible();
    expect(await page.locator('.table__row').count()).toBeGreaterThanOrEqual(
      18,
    );
  });
});

test.describe('rules', () => {
  test('explains scoring with diagrams', async ({ page }) => {
    await page.goto('/pl/rules/');

    await expect(
      page.getByRole('heading', { name: 'Zasady skoków narciarskich' }),
    ).toBeVisible();
    await expect(page.getByRole('img', { name: 'Skocznia' })).toBeVisible();
    await expect(page.locator('.formula__part')).toHaveText([
      'odległość',
      'styl',
      'wiatr',
      'belka',
    ]);
    // 18.5, 19, 19, 19.5, 18: the highest and the lowest mark are dropped.
    await expect(page.locator('.marks__item--dropped')).toHaveText([
      '19,5',
      '18',
    ]);
    await expect(page.locator('.marks__item--total')).toHaveText('56,5');
    await expect(page.locator('main')).toContainText('60 + 5 x 1,8 = 69');
    await expect(page.locator('.topbar__nav [aria-current="page"]')).toHaveText(
      'Zasady',
    );
  });

  test('is available in English', async ({ page }) => {
    await page.goto('/en/rules/');
    await expect(page.locator('.marks__item--total')).toHaveText('56.5');
    await expect(page.locator('main')).toContainText('telemark');
  });
});

test.describe('event tags', () => {
  test('championships, Four Hills and ski flying use different colors', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/');

    const colorOf = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor);
    const colors = [
      await colorOf('.badge--championships'),
      await colorOf('.badge--four-hills'),
      await colorOf('.badge--ski-flying'),
    ];

    expect(new Set(colors).size).toBe(3);
  });
});

test.describe('maps', () => {
  test('hills page shows every venue on a map', async ({ page }) => {
    await page.goto('/pl/hills/');

    const map = page.locator('.js-map');

    await expect(map).toHaveAttribute('data-ready', 'true');
    // Two Falun hills share one marker.
    await expect(map.locator('path.leaflet-interactive')).toHaveCount(42);
    await expect(
      page.locator('.tournament-card[data-hill="zakopane"]:visible'),
    ).toContainText('Zakopane, Polska');
  });

  test('schedule shows the venues of the season on a map', async ({ page }) => {
    await page.goto('/pl/2026-2027/');

    const map = page.locator('.js-map');

    await expect(map).toHaveAttribute('data-ready', 'true');
    await expect(map.locator('path.leaflet-interactive')).toHaveCount(18);
  });

  test('hill profile ends with a map of its location', async ({ page }) => {
    await page.goto('/pl/hills/mackenzie-intervale/');

    const map = page.locator('.js-map');

    await expect(map).toHaveAttribute('data-ready', 'true');
    await expect(map.locator('path.leaflet-interactive')).toHaveCount(1);
    await expect(page.locator('.event-header')).toContainText(
      'Lake Placid, Stany Zjednoczone',
    );
  });

  test('map stays under the sticky top bar', async ({ page }) => {
    await page.goto('/pl/hills/');
    await page.locator('.js-map').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);

    const covered = await page.evaluate(() => {
      const bar = document.querySelector('.topbar');
      const top = document.elementFromPoint(window.innerWidth / 2, 20);

      return bar !== null && top !== null && bar.contains(top);
    });

    expect(covered).toBe(true);
  });
});

test.describe('nations', () => {
  test('index ranks countries by World Cup points', async ({ page }) => {
    await page.goto('/pl/nations/');

    const rows = page.locator('.table__row');

    expect(await rows.count()).toBeGreaterThan(15);
    await rows.filter({ hasText: 'Polska' }).getByRole('link').click();
    await expect(page).toHaveURL(/\/pl\/nations\/pol\/$/);
  });

  test('navigation fits one line beside the logo on a desktop', async ({
    page,
  }) => {
    for (const width of [1150, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/nations/');

      const links = page.locator('.topbar__nav a');
      const first = await links.first().boundingBox();
      const last = await links.last().boundingBox();
      const actions = await page.locator('.topbar__actions').boundingBox();

      expect(last?.y).toBe(first?.y);
      expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(
        actions?.x ?? 0,
      );
    }
    await expect(page.locator('.topbar__nav [aria-current="page"]')).toHaveText(
      'Reprezentacje',
    );
  });

  test('button groups nations by continent', async ({ page }) => {
    await page.goto('/pl/nations/');

    const button = page.getByRole('button', {
      name: 'Grupuj według kontynentu',
    });
    const asia = page.locator('.country-group[data-continent="asia"]');

    await expect(asia).toBeHidden();
    await button.click();
    await expect(asia).toBeVisible();
    await expect(asia.locator('.country-group__title')).toHaveText('Azja');
    await expect(asia.locator('.table__row').first()).toContainText('Japonia');
    await expect(
      page.locator('.country-group[data-continent="north-america"]'),
    ).toContainText('Stany Zjednoczone');
    await page.reload();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('wins and podiums cover the whole career', async ({ page }) => {
    await page.goto('/pl/nations/pol/');
    await expect(
      page.locator('.table__row').filter({ hasText: 'Kamil Stoch' }),
    ).toContainText('39 / 80');
    await expect(
      page.locator('.table__row').filter({ hasText: 'Adam Malysz' }),
    ).toContainText('39 / 92');
  });

  test('old team address leads to the Polish nation page', async ({ page }) => {
    await page.goto('/pl/2026-2027/polish-team/');
    await expect(page).toHaveURL(/\/pl\/nations\/pol\/$/);
    await expect(page.locator('.team')).toHaveCount(2);
    await page.goto('/pl/nations/aut/');
    await expect(page.locator('.team')).toHaveCount(0);
  });

  test('nation page sums points, lists trophies and team results', async ({
    page,
  }) => {
    await page.goto('/pl/nations/pol/');

    const stoch = page
      .locator('.table__row')
      .filter({ hasText: 'Kamil Stoch' });

    await expect(stoch).toContainText('Kryształowe Kule: 2');
    await expect(stoch).toContainText('Turniej Czterech Skoczni 2016/17');
    await expect(
      page.locator('.table__row').filter({ hasText: 'Adam Malysz' }),
    ).toContainText('Kryształowe Kule');

    const team = page.locator('section', {
      has: page.getByRole('heading', { name: 'Wyniki drużyny' }),
    });

    await expect(
      team.locator('.table__row').filter({ hasText: 'Zakopane' }).first(),
    ).toContainText('Konkurs duetów');
  });

  test('standings link every athlete nation to its page', async ({ page }) => {
    await page.goto('/pl/2025-2026/standings/');
    await page
      .locator('.table__row')
      .first()
      .getByRole('link', { name: /SLO/ })
      .click();
    await expect(page).toHaveURL(/\/pl\/nations\/slo\/$/);
  });
});

test.describe('hill', () => {
  test('event page shows technical data, the record and facts', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/zakopane/');

    const hill = page.locator('.hill[data-hill="zakopane"]');

    await expect(hill).toContainText('Wielka Krokiew HS140');
    await expect(hill.locator('.hill__record')).toContainText('147 m');
    await expect(hill.locator('.hill__record')).toContainText('Yukiya Satō');
    await expect(hill).toContainText('Punkt konstrukcyjny (K)');
    await expect(hill).toContainText('34,3°');
    await expect(hill.locator('.hill__fact')).toHaveCount(3);
  });

  test('Falun shows both hills of the World Championships', async ({
    page,
  }) => {
    await page.goto('/en/2026-2027/falun/');
    await expect(page.locator('.hill')).toHaveCount(2);
    await expect(page.locator('.hill').first()).toContainText('Lugnet HS95');
  });
});

test.describe('standings archive', () => {
  test('season switcher opens final standings of earlier seasons', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/standings/');

    const switcher = page.locator('.season-switch');

    await expect(switcher.getByRole('link')).toHaveCount(27);
    await switcher.getByRole('link', { name: '2020/2021' }).click();
    await expect(page).toHaveURL(/\/pl\/2020-2021\/standings\/$/);
    await expect(page.locator('.table__row').first()).toContainText(
      'Halvor Egner Granerud',
    );
    await expect(page.locator('.notice')).toHaveCount(0);
  });
});

test.describe('officials', () => {
  test('event page lists judges when FIS has published them', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/wisla/');

    const officials = page.locator('section', {
      has: page.getByRole('heading', { name: 'Sędziowie i delegaci' }),
    });

    await expect(officials.locator('.people__item')).toHaveCount(7);
    await expect(officials).toContainText('Jan Ciapała');
    await expect(officials).toContainText('Delegat techniczny FIS');
  });

  test('event page skips the section when nothing is known', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/zakopane/');
    await expect(
      page.getByRole('heading', { name: 'Sędziowie i delegaci' }),
    ).toHaveCount(0);
  });
});

test.describe('layout of section pages', () => {
  for (const width of [320, 400, 1440]) {
    for (const path of PAGES) {
      test(`${path} fits ${width} px with a 56 px top bar`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        const topbar = await page.locator('.topbar').boundingBox();

        expect(overflow).toBeLessThanOrEqual(0);
        expect(topbar?.height).toBe(56);
        await expect(page.locator('h1')).toHaveCount(1);
      });
    }
  }
});
