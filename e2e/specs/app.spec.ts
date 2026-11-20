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
      '4 dni 1 godz. 0 min 0 s',
    );
    await expect(
      next.getByRole('link', { name: 'Eurosport 1 (Pilot WP)' }),
    ).toBeVisible();
    await expect(
      next.getByRole('link', { name: 'Wyniki na żywo' }),
    ).toHaveAttribute('href', /fis-ski\.com/);
  });

  test('shows a photo of the hill next to the details', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAt(page, '/pl/', BEFORE_SEASON);

    const next = page.locator('.js-next:visible');
    const photo = next.locator('.next__photo');

    await expect(photo).toHaveAttribute('alt', 'Lysgårdsbakken');
    await expect
      .poll(() =>
        photo.evaluate(
          (element) =>
            element instanceof HTMLImageElement && element.naturalWidth > 0,
        ),
      )
      .toBe(true);

    const title = await next.locator('.next__title').boundingBox();
    const box = await photo.boundingBox();

    expect(box?.x).toBeGreaterThan((title?.x ?? 0) + (title?.width ?? 0));

    // The photo fills the card but must not make it taller than its text.
    const card = await next.boundingBox();
    const more = await next.locator('.next__more').boundingBox();

    expect(box?.height).toBeLessThanOrEqual(card?.height ?? 0);
    expect(
      (card?.y ?? 0) +
        (card?.height ?? 0) -
        ((more?.y ?? 0) + (more?.height ?? 0)),
    ).toBeLessThan(40);
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

test.describe('countdown poster', () => {
  test('counts down to the next competition', async ({ page }) => {
    await openAt(page, '/pl/countdown/', BEFORE_SEASON);

    const poster = page.locator('.js-poster:visible');

    await expect(poster).toHaveCount(1);
    await expect(poster.locator('.poster__city')).toContainText('Lillehammer');
    await expect(poster.locator('.poster__digits')).toHaveText([
      '04',
      '01',
      '00',
      '00',
    ]);
    await expect(poster.locator('.poster__photo')).toBeVisible();
  });

  test('shows the start time and the date of the hill record', async ({
    page,
  }) => {
    await openAt(page, '/pl/countdown/', BEFORE_SEASON);

    const poster = page.locator('.js-poster:visible');

    await expect(poster.locator('.poster__start')).toContainText(
      /Start o \d{4}-\d{2}-\d{2} \d{2}:\d{2}/,
    );
    await expect(poster.locator('.poster__record-date')).toHaveText(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  test('exports the poster as a PNG in the chosen format', async ({ page }) => {
    await openAt(page, '/pl/countdown/', BEFORE_SEASON);
    await page.getByRole('button', { name: 'Pionowo' }).click();

    const download = page.waitForEvent('download');

    await page.getByRole('button', { name: 'Eksportuj obrazek' }).click();
    expect((await download).suggestedFilename()).toBe(
      'countdown-lillehammer-2026-11-20-story.png',
    );
    await expect(page.locator('.js-poster-export-status')).toHaveText(
      'Plik zapisany w pobranych.',
    );
  });

  test('copies the poster as a PNG to the clipboard', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();

    await openAt(page, '/pl/countdown/', BEFORE_SEASON);
    await page.getByRole('button', { name: 'Pionowo' }).click();
    await page.getByRole('button', { name: 'Kopiuj obrazek' }).click();
    await expect(page.locator('.js-poster-export-status')).toHaveText(
      'Obrazek jest w schowku.',
    );

    const size = await page.evaluate(async () => {
      const [item] = await navigator.clipboard.read();
      const blob = await item?.getType('image/png');
      const bitmap = blob ? await createImageBitmap(blob) : undefined;

      return bitmap ? `${bitmap.width}x${bitmap.height}` : '';
    });

    expect(size).toBe('1080x1920');
    await context.close();
  });

  test('is linked from the next competition card', async ({ page }) => {
    await openAt(page, '/pl/', BEFORE_SEASON);
    await page
      .locator('.js-next:visible')
      .getByRole('link', { name: 'Odliczanie na plakacie' })
      .click();
    await expect(page).toHaveURL(/\/pl\/countdown\/$/);
  });

  test('switches to a portrait poster and remembers it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAt(page, '/pl/countdown/', BEFORE_SEASON);
    await page.getByRole('button', { name: 'Pionowo' }).click();

    const box = await page.locator('.js-poster:visible').boundingBox();

    expect(box?.height).toBeGreaterThan(box?.width ?? 0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Pionowo' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('shows a live banner instead of the clock', async ({ page }) => {
    await openAt(page, '/pl/countdown/', DURING_FIRST_RACE);

    const poster = page.locator('.js-poster:visible');

    await expect(poster.locator('.js-poster-live')).toHaveText('Konkurs trwa!');
    await expect(poster.locator('.js-poster-clock')).toBeHidden();
  });

  test('says the season is over after the last competition', async ({
    page,
  }) => {
    await openAt(page, '/pl/countdown/', AFTER_SEASON);

    await expect(page.locator('.js-poster:visible')).toHaveCount(0);
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
    expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(62);
  });
});

test.describe('event page', () => {
  test('shows the program with links per competition', async ({ page }) => {
    await openAt(page, '/pl/2026-2027/lillehammer/', BEFORE_SEASON);

    const rows = page.locator('.competition');

    await expect(rows).toHaveCount(6);
    await expect(rows.nth(1)).toContainText('Kwalifikacje');
    await expect(
      rows.nth(1).getByRole('link', { name: 'Wyniki', exact: true }),
    ).toHaveAttribute('href', /raceid=7796/);
  });

  test('keeps only results for a finished competition', async ({ page }) => {
    await openAt(page, '/pl/2026-2027/lillehammer/', AFTER_FIRST_EVENT);

    const row = page.locator('.competition[data-race="7796"]');

    await expect(row.locator('.js-phase')).toHaveText('Zakończony');
    await expect(
      row.getByRole('link', { name: 'Eurosport 1 (Pilot WP)' }),
    ).toBeHidden();
    await expect(
      row.getByRole('link', { name: 'Wyniki', exact: true }),
    ).toBeVisible();
  });

  test('lists the training and the broadcasters of each competition', async ({
    page,
  }) => {
    await page.goto('/pl/2026-2027/lillehammer/');

    const training = page.locator('.competition').first();
    const mixed = page.locator('.competition[data-race="7794"]');

    await expect(training).toContainText('Oficjalny trening');
    await expect(training).toContainText('Bez transmisji w telewizji');
    await expect(
      training.getByRole('link', { name: 'Wyniki', exact: true }),
    ).toHaveCount(0);
    await expect(mixed.getByRole('link', { name: /TTV/ })).toBeVisible();
    await expect(mixed.getByRole('link', { name: /TVN/ })).toHaveCount(0);
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
    await page.goto('/pl/2026-2027/lahti/');
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

test.describe('start notifications', () => {
  const JUST_AFTER_START = new Date('2026-11-21T15:51:00Z');

  async function mockNotifications(
    page: Page,
    permission: NotificationPermission,
  ): Promise<void> {
    await page.addInitScript((initial) => {
      const created: { title: string; body: string }[] = [];

      class FakeNotification extends EventTarget {
        static permission: NotificationPermission = initial;

        static requestPermission(): Promise<NotificationPermission> {
          FakeNotification.permission = 'granted';
          return Promise.resolve('granted');
        }

        constructor(title: string, options: NotificationOptions = {}) {
          super();
          created.push({ title, body: options.body ?? '' });
          Reflect.set(window, 'lastNotification', this);
        }

        close(): void {
          // Nothing to close in the fake.
        }
      }

      Reflect.set(window, 'Notification', FakeNotification);
      Reflect.set(window, 'createdNotifications', created);
    }, permission);
  }

  test('asks for permission, announces a start and opens its event', async ({
    page,
  }) => {
    await mockNotifications(page, 'default');
    await openAt(page, '/pl/2026-2027/', JUST_AFTER_START);

    const toggle = page.locator('#start-alerts-toggle');

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() =>
        page.evaluate(() => Reflect.get(window, 'createdNotifications')),
      )
      .toEqual([
        {
          title: 'Zawody wystartowały: Lillehammer',
          body: 'Konkurs indywidualny HS140. Kliknij, aby otworzyć stronę zawodów.',
        },
      ]);

    await page.evaluate(() => {
      const notification: unknown = Reflect.get(window, 'lastNotification');

      if (notification instanceof EventTarget) {
        notification.dispatchEvent(new Event('click'));
      }
    });
    await expect(page).toHaveURL(/\/pl\/2026-2027\/lillehammer\/$/);
  });

  test('announces each start once across page loads', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await page.addInitScript(() => {
      localStorage.setItem('ski-jumping:start-alerts', 'true');
    });
    await openAt(page, '/pl/', JUST_AFTER_START);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const created: unknown = Reflect.get(window, 'createdNotifications');

          return Array.isArray(created) ? created.length : -1;
        }),
      )
      .toBe(1);
    await page.reload();
    await page.waitForTimeout(1500);
    expect(
      await page.evaluate(() => {
        const created: unknown = Reflect.get(window, 'createdNotifications');

        return Array.isArray(created) ? created.length : -1;
      }),
    ).toBe(0);
  });

  test('shows the blocked state when the browser denies notifications', async ({
    page,
  }) => {
    await mockNotifications(page, 'denied');
    await page.goto('/pl/');

    const toggle = page.locator('#start-alerts-toggle');

    await expect(toggle).toHaveAttribute('aria-disabled', 'true');
    await expect(toggle).toHaveAttribute(
      'title',
      'Powiadomienia są zablokowane w ustawieniach przeglądarki',
    );
  });
});
