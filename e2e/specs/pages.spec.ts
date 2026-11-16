import { expect, test } from '@playwright/test';

const PAGES = [
  '/pl/2026-2027/standings/',
  '/pl/2026-2027/polish-team/',
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
      'Kadra',
      'Galeria',
      'Turnieje',
    ]);
    await nav.getByRole('link', { name: 'Kadra' }).click();
    await expect(page).toHaveURL(/\/pl\/2026-2027\/polish-team\/$/);
  });

  test('"r", "p" and "g" open standings, team and gallery', async ({
    page,
  }) => {
    await page.goto('/pl/');
    await page.keyboard.press('r');
    await expect(page).toHaveURL(/\/standings\/$/);
    await page.keyboard.press('p');
    await expect(page).toHaveURL(/\/polish-team\/$/);
    await page.keyboard.press('g');
    await expect(page).toHaveURL(/\/gallery\/$/);
  });
});

test.describe('active navigation link', () => {
  const cases = [
    ['/pl/2026-2027/', 'Terminarz'],
    ['/pl/2026-2027/wisla/', 'Terminarz'],
    ['/pl/2026-2027/standings/', 'Klasyfikacja'],
    ['/pl/2026-2027/polish-team/', 'Kadra'],
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
  test('before the season shows a notice and the previous final table', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/standings/');

    await expect(page.locator('.notice')).toContainText(
      'Sezon jeszcze się nie zaczął',
    );
    await expect(
      page.getByRole('heading', {
        name: 'Końcowa klasyfikacja sezonu 2025/2026',
      }),
    ).toBeVisible();

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
    await page.goto('/pl/2026-2027/standings/');

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

  test('column headers are written in sentence case', async ({ page }) => {
    await page.goto('/pl/2026-2027/standings/');

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
    await page.goto('/pl/2026-2027/polish-team/');

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

    await expect(page.locator('.tournament-card')).toHaveCount(6);
    await expect(page.locator('.tournament-card .banner')).toHaveCount(6);
    await expect(
      page.locator(
        '.tournament-card[data-tournament="planica7"] .banner circle',
      ),
    ).toHaveCount(7);
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

  test('five navigation links fit a 320 px screen', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/pl/tournaments/raw-air/');

    const last = await page.locator('.topbar__nav a').last().boundingBox();
    const first = await page.locator('.topbar__nav a').first().boundingBox();

    expect((last?.x ?? 0) + (last?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(first?.x).toBeGreaterThanOrEqual(0);
    expect(last?.y).toBe(first?.y);
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

    await expect(switcher.getByRole('link')).toHaveCount(7);
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
