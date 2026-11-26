import { expect, test, type Page } from '@playwright/test';
import {
  createdNotifications,
  JUST_AFTER_START,
  mockNotifications,
  openAt,
  saveChoice,
  START_NOTIFICATION,
  STORAGE,
} from '../support/notifications';

// The log shows the viewer's own time, so the zone is pinned.
test.use({ timezoneId: 'Europe/Warsaw' });

interface Entry {
  id: string;
  at: string;
  kind: string;
  title: string;
  body: string;
  url: string;
  outcome: string;
}

function entry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    at: '2026-11-21T15:50:20.000Z',
    kind: 'start',
    title: `Zawody wystartowały: ${id}`,
    body: 'Konkurs indywidualny HS140 (K123). Kliknij, aby otworzyć stronę zawodów.',
    url: '/pl/2026-2027/lillehammer/',
    outcome: 'shown',
    ...overrides,
  };
}

/** Puts a log in storage before the page scripts run. */
async function saveLog(page: Page, entries: Entry[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      // Only on the first load, so a later reload keeps what the page stored.
      if (key && value && localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    },
    [STORAGE.alertLog, JSON.stringify(entries)],
  );
}

function rows(page: Page) {
  return page.locator('#alert-log-list .alert-log__entry');
}

test.describe('alerts page', () => {
  test('names the page before the site and links to the switches first', async ({
    page,
  }) => {
    await page.goto('/pl/alerts/');

    await expect(page).toHaveTitle('Alerty | Skoki narciarskie');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main h2')).toHaveText('Alerty');
    // The link to the switches stands above the log.
    await expect(
      page.locator('main .alert-log').locator('xpath=preceding::a[1]'),
    ).toHaveAttribute('href', '/pl/notifications/');
    await page.locator('#alerts-to-notifications').click();
    await expect(page).toHaveURL(/\/pl\/notifications\/$/);
  });

  test('is an empty log without switches at first', async ({ page }) => {
    await page.goto('/pl/alerts/');

    await expect(page.locator('#alert-log-empty')).toHaveText(
      'Dziennik jest pusty: żadne powiadomienie się jeszcze nie pokazało.',
    );
    await expect(page.locator('#alert-log-list')).toBeHidden();
    await expect(page.locator('#alert-log-clear')).toBeHidden();
    await expect(page.locator('main [aria-pressed]')).toHaveCount(0);
    await expect(page.locator('.js-start-alerts-switch')).toHaveCount(0);
  });

  test('shows a notification that fired on another page', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await openAt(page, '/pl/', JUST_AFTER_START);
    await expect
      .poll(() => createdNotifications(page))
      .toEqual([START_NOTIFICATION]);

    await page.locator('#alerts-link').click();
    await expect(page).toHaveURL(/\/pl\/alerts\/$/);
    await expect(rows(page)).toHaveCount(1);

    const row = rows(page).first();

    await expect(row.locator('time')).toHaveText('2026-11-21 16:51');
    await expect(row.locator('time')).toHaveAttribute(
      'datetime',
      '2026-11-21T15:51:00.000Z',
    );
    await expect(row.locator('.badge').nth(0)).toHaveText('Start zawodów');
    await expect(row.locator('.badge').nth(1)).toHaveText('Pokazane');
    await expect(row.locator('.alert-log__body')).toHaveText(
      START_NOTIFICATION.body,
    );
    await expect(page.locator('#alert-log-empty')).toBeHidden();
    await row.getByRole('link', { name: START_NOTIFICATION.title }).click();
    await expect(page).toHaveURL(/\/pl\/2026-2027\/lillehammer\/$/);
  });

  test('logs a notification the browser refused to show', async ({ page }) => {
    await mockNotifications(page, 'granted', { failing: true });
    await saveChoice(page, true);
    await openAt(page, '/pl/alerts/', JUST_AFTER_START);

    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first().locator('.badge').nth(1)).toHaveText(
      'Błąd przeglądarki',
    );
  });

  test('lists the newest first and puts a new one on top', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await saveLog(page, [
      entry('Ruka', { at: '2026-11-20T17:00:00.000Z' }),
      entry('Wisła', { at: '2026-11-19T15:00:00.000Z', outcome: 'error' }),
    ]);
    await openAt(page, '/pl/alerts/', JUST_AFTER_START);

    await expect(rows(page).locator('.alert-log__title')).toHaveText([
      START_NOTIFICATION.title,
      'Zawody wystartowały: Ruka',
      'Zawody wystartowały: Wisła',
    ]);
    await expect(rows(page).locator('time')).toHaveText([
      '2026-11-21 16:51',
      '2026-11-20 18:00',
      '2026-11-19 16:00',
    ]);
  });

  test('keeps at most 200 entries', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await saveLog(
      page,
      Array.from({ length: 200 }, (_, index) => entry(`old-${index}`)),
    );
    await openAt(page, '/pl/alerts/', JUST_AFTER_START);

    await expect(rows(page).first().locator('.alert-log__title')).toHaveText(
      START_NOTIFICATION.title,
    );
    await expect(rows(page)).toHaveCount(200);
    await expect(rows(page).last().locator('.alert-log__title')).toHaveText(
      'Zawody wystartowały: old-198',
    );
  });

  test('clears the log', async ({ page }) => {
    await saveLog(page, [entry('Ruka'), entry('Wisła')]);
    await page.goto('/pl/alerts/');
    await expect(rows(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Wyczyść dziennik' }).click();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.locator('#alert-log-empty')).toBeVisible();
    await expect(page.locator('#alert-log-clear')).toBeHidden();
    await page.reload();
    await expect(page.locator('#alert-log-empty')).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test('skips broken entries and never links outside the site', async ({
    page,
  }) => {
    await saveLog(page, [
      entry('Ruka', { url: 'https://example.com/' }),
      entry('Wisła', { kind: 'weather' }),
    ]);
    await page.goto('/pl/alerts/');

    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page).first()).toContainText('Zawody wystartowały: Ruka');
    await expect(rows(page).locator('a')).toHaveCount(0);
  });

  test('follows a notification shown in another tab', async ({ page }) => {
    await page.goto('/pl/alerts/');
    await expect(rows(page)).toHaveCount(0);

    // What the browser does in this tab when another one writes the log.
    await page.evaluate(
      ([key, value]) => {
        if (key && value) {
          localStorage.setItem(key, value);
          window.dispatchEvent(new StorageEvent('storage', { key }));
        }
      },
      [STORAGE.alertLog, JSON.stringify([entry('Ruka')])],
    );
    await expect(rows(page)).toHaveCount(1);
  });

  test('has English texts', async ({ page }) => {
    await saveLog(page, [entry('Ruka')]);
    await page.goto('/en/alerts/');

    await expect(page).toHaveTitle('Alerts | Ski Jumping');
    await expect(rows(page).first().locator('.badge')).toHaveText([
      'Competition start',
      'Shown',
    ]);
    await expect(
      page.getByRole('button', { name: 'Clear the log' }),
    ).toBeVisible();
    await expect(page.locator('#alerts-to-notifications')).toHaveAttribute(
      'href',
      '/en/notifications/',
    );
  });

  test('is reached by a text link in the footer of every page', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/');

    const link = page.locator('.footer a#alerts-link');

    await expect(link).toHaveText('Alerty');
    await expect(link.locator('svg')).toHaveCount(0);
    await link.click();
    await expect(page).toHaveURL(/\/pl\/alerts\/$/);
  });
});

test.describe('layout of the alerts page', () => {
  const longEntries = [
    entry('Garmisch-Partenkirchen', {
      body: 'Kwalifikacje do konkursu indywidualnego na skoczni HS142 (K125) Große Olympiaschanze. Kliknij, aby otworzyć stronę zawodów.',
      url: '/pl/2026-2027/garmisch-partenkirchen/',
    }),
    entry('Titisee-Neustadt-Hochfirstschanze-Schwarzwald', {
      outcome: 'error',
    }),
  ];

  for (const width of [320, 400, 1440]) {
    for (const entries of [[], longEntries]) {
      test(`fits ${width} px with ${entries.length} entries`, async ({
        page,
      }) => {
        await saveLog(page, entries);
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/pl/alerts/');
        await expect(rows(page)).toHaveCount(entries.length);

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        const topbar = await page.locator('.topbar').boundingBox();
        // Nothing inside the log may stick out of it either.
        const widest = await page
          .locator('.alert-log')
          .evaluate((log) => log.scrollWidth - log.clientWidth);

        expect(overflow).toBeLessThanOrEqual(0);
        expect(widest).toBeLessThanOrEqual(0);
        expect(topbar?.height).toBe(56);
      });
    }
  }
});
