import { expect, test, type Page } from '@playwright/test';

const BEFORE_SEASON = new Date('2026-11-16T12:00:00Z');
const DURING_FIRST_RACE = new Date('2026-11-21T16:00:00Z');
const AFTER_FIRST_EVENT = new Date('2026-11-24T12:00:00Z');
const AFTER_SEASON = new Date('2027-06-01T12:00:00Z');

const PAGES = ['/pl/', '/pl/2026-2027/', '/pl/2026-2027/lillehammer/'];

async function openAt(page: Page, path: string, now: Date): Promise<void> {
  await page.clock.setFixedTime(now);
  await page.goto(path);
}

test.describe('language', () => {
  test('root redirects to Polish for a Polish browser', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'pl-PL' });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveURL(/\/pl\/$/);
    await context.close();
  });

  test('root redirects to English for other browsers', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'de-DE' });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
    await context.close();
  });

  test('language switch keeps the current page and is remembered', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/wisla/');
    await page.locator('#language-switch').click();
    await expect(page).toHaveURL(/\/en\/2026-2027\/wisla\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
  });
});

test.describe('home page', () => {
  test('shows the next competition with a countdown', async ({ page }) => {
    await openAt(page, '/pl/', BEFORE_SEASON);

    const next = page.locator('.js-next:visible');

    await expect(next).toHaveCount(1);
    await expect(next).toContainText('Lillehammer');
    await expect(next).toContainText('Kwalifikacje');
    await expect(next.locator('.js-countdown-value')).toHaveText(
      '4 d 1 h 0 min 0 s',
    );
    await expect(next.getByRole('link', { name: 'HBO Max' })).toBeVisible();
    await expect(
      next.getByRole('link', { name: 'Wyniki na żywo' }),
    ).toHaveAttribute('href', /fis-ski\.com/);
  });

  test('marks a running competition as live', async ({ page }) => {
    await openAt(page, '/pl/', DURING_FIRST_RACE);

    const next = page.locator('.js-next:visible');

    await expect(next).toHaveAttribute('data-race', '7795');
    await expect(next.locator('.js-phase')).toHaveText('Trwa');
    await expect(next.locator('.js-countdown')).toBeHidden();
  });

  test('lists only three upcoming events', async ({ page }) => {
    await openAt(page, '/pl/', AFTER_FIRST_EVENT);

    const events = page.locator('.js-upcoming-event:visible');

    await expect(events).toHaveCount(3);
    await expect(events.first()).toContainText('Ruka');
  });

  test('says the season is over after the last competition', async ({
    page,
  }) => {
    await openAt(page, '/pl/', AFTER_SEASON);

    await expect(page.locator('.js-next:visible')).toHaveCount(0);
    await expect(page.locator('.js-season-over')).toBeVisible();
  });
});

test.describe('schedule', () => {
  test('lists every event of the season', async ({ page }) => {
    await openAt(page, '/pl/2026-2027/', AFTER_FIRST_EVENT);

    await expect(page.locator('.event-card')).toHaveCount(18);
    await expect(
      page.locator('.event-card[data-event="lillehammer"]'),
    ).toHaveAttribute('data-phase', 'finished');
    await expect(
      page.locator('.event-card[data-event="ruka"]'),
    ).toHaveAttribute('data-phase', 'upcoming');
    await expect(page.locator('.event-card[data-event="falun"]')).toContainText(
      'Mistrzostwa Świata',
    );
  });

  test('offers the season as a calendar feed', async ({ page, request }) => {
    await page.goto('/pl/2026-2027/');

    const href = await page
      .getByRole('link', { name: /Dodaj do kalendarza/ })
      .getAttribute('href');
    const response = await request.get(href ?? '');
    const body = await response.text();

    expect(response.headers()['content-type']).toContain('text/calendar');
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(61);
  });
});

test.describe('event page', () => {
  test('shows the program with links per competition', async ({ page }) => {
    await openAt(page, '/pl/2026-2027/lillehammer/', BEFORE_SEASON);

    const rows = page.locator('.competition');

    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText('Kwalifikacje');
    await expect(
      rows.first().getByRole('link', { name: 'Wyniki', exact: true }),
    ).toHaveAttribute('href', /raceid=7796/);
  });

  test('keeps only results for a finished competition', async ({ page }) => {
    await openAt(page, '/pl/2026-2027/lillehammer/', AFTER_FIRST_EVENT);

    const row = page.locator('.competition').first();

    await expect(row.locator('.js-phase')).toHaveText('Zakończony');
    await expect(row.getByRole('link', { name: 'HBO Max' })).toBeHidden();
    await expect(
      row.getByRole('link', { name: 'Wyniki', exact: true }),
    ).toBeVisible();
  });

  test('shows times in the time zone of the viewer', async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
    const page = await context.newPage();

    await page.goto('/en/2026-2027/lillehammer/');
    await expect(
      page.locator('.competition[data-race="7795"] time'),
    ).toHaveText('2026-11-22 00:50');
    await expect(page.locator('.js-time-zone')).toHaveText('Asia/Tokyo');
    await context.close();
  });

  test('shows only the date when the time is not announced', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/zakopane/');
    await expect(page.locator('.competition').first()).toContainText(
      'godzina nieznana',
    );
  });
});

test.describe('theme', () => {
  test('toggle switches the theme and survives a reload', async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: 'light' });
    const page = await context.newPage();

    await page.goto('/pl/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.locator('#theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await context.close();
  });
});

test.describe('keyboard shortcuts', () => {
  test('"?" opens the cheat sheet and Escape restores focus', async ({
    page,
  }) => {
    await page.goto('/pl/');

    const opener = page.locator('#shortcuts-open');
    const dialog = page.locator('#shortcuts-dialog');

    await opener.focus();
    await page.keyboard.press('?');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('"s" opens the schedule and "t" toggles the theme', async ({ page }) => {
    await page.goto('/pl/');

    const before = await page.locator('html').getAttribute('data-theme');

    await page.keyboard.press('t');
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-theme',
      before ?? '',
    );
    await page.keyboard.press('s');
    await expect(page).toHaveURL(/\/pl\/2026-2027\/$/);
  });
});

test.describe('layout', () => {
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
