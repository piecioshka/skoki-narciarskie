import { expect, test, type Page } from '@playwright/test';
import {
  createdNotifications,
  JUST_AFTER_START,
  mockNotifications,
  openAt,
  removeNotifications,
  saveChoice,
  START_NOTIFICATION,
  STORAGE,
} from '../support/notifications';

const BLOCKED_HINT =
  'Powiadomienia są zablokowane w ustawieniach przeglądarki. Odblokuj je tam: strona nie może zapytać ponownie.';

function bell(page: Page) {
  return page.locator('#notifications-link');
}

function toggle(page: Page) {
  return page.locator('#start-alerts-switch');
}

async function expectBell(
  page: Page,
  state: string,
  label: string,
): Promise<void> {
  await expect(bell(page)).toHaveAttribute('data-state', state);
  await expect(bell(page)).toHaveAttribute('aria-label', label);
  await expect(bell(page)).toHaveAttribute('title', label);
  await expect(bell(page).locator('.icon--bell')).toBeVisible({
    visible: state === 'on',
  });
  await expect(bell(page).locator('.icon--bell-off')).toBeVisible({
    visible: state !== 'on',
  });
}

test.describe('notifications page', () => {
  test('names the page before the site and links to the alert log first', async ({
    page,
  }) => {
    await mockNotifications(page, 'default');
    await page.goto('/pl/notifications/');

    await expect(page).toHaveTitle('Powiadomienia | Skoki narciarskie');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main h2')).toHaveText('Powiadomienia');
    // The link to the log stands above the switches.
    await expect(
      page.locator('main .switches').locator('xpath=preceding::a[1]'),
    ).toHaveAttribute('href', '/pl/alerts/');
    await page.locator('#notifications-to-alerts').click();
    await expect(page).toHaveURL(/\/pl\/alerts\/$/);
  });

  test('holds the switch and no history', async ({ page }) => {
    await mockNotifications(page, 'default');
    await page.goto('/pl/notifications/');

    await expect(page.locator('main button[aria-pressed]')).toHaveCount(1);
    await expect(page.locator('.js-alert-log')).toHaveCount(0);
    await expect(page.locator('.switches__row')).toContainText('Start zawodów');
    await expect(page.locator('#start-alerts-hint')).toContainText(
      'Działa tylko wtedy, gdy strona jest otwarta w którejś karcie.',
    );
  });

  test('the switch asks for permission, turns on and off', async ({ page }) => {
    await mockNotifications(page, 'default');
    await page.goto('/pl/notifications/');

    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle(page)).toHaveText('Wyłączone');
    await expect(toggle(page)).toHaveAccessibleName('Start zawodów Wyłączone');
    await expectBell(page, 'off', 'Powiadomienia (wyłączone)');
    expect(
      await page.evaluate(() => Reflect.get(window, 'permissionRequests')),
    ).toBe(0);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle(page)).toHaveText('Włączone');
    await expectBell(page, 'on', 'Powiadomienia (włączone)');
    expect(
      await page.evaluate(() => Reflect.get(window, 'permissionRequests')),
    ).toBe(1);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    await expectBell(page, 'off', 'Powiadomienia (wyłączone)');
    expect(
      await page.evaluate(
        (key) => localStorage.getItem(key),
        STORAGE.startAlerts,
      ),
    ).toBe('false');

    // The permission is already there, so turning on again does not ask.
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    expect(
      await page.evaluate(() => Reflect.get(window, 'permissionRequests')),
    ).toBe(1);
  });

  test('the switch is remembered across page loads', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await page.goto('/pl/notifications/');

    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'true');
    await toggle(page).click();
    await page.reload();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
  });

  test('a refused permission disables the switch', async ({ page }) => {
    await mockNotifications(page, 'default', { answer: 'denied' });
    await page.goto('/pl/notifications/');
    await toggle(page).click();

    await expect(toggle(page)).toBeDisabled();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#start-alerts-hint')).toHaveText(BLOCKED_HINT);
    await expectBell(
      page,
      'blocked',
      'Powiadomienia (zablokowane w ustawieniach przeglądarki)',
    );
  });

  test('the switch is disabled when the browser blocks notifications', async ({
    page,
  }) => {
    await mockNotifications(page, 'denied');
    await saveChoice(page, true);
    await page.goto('/pl/notifications/');

    await expect(toggle(page)).toBeDisabled();
    await expect(toggle(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#start-alerts-hint')).toHaveText(BLOCKED_HINT);
  });

  test('the switch is disabled without the Notification API', async ({
    page,
  }) => {
    await removeNotifications(page);
    await page.goto('/pl/notifications/');

    await expect(toggle(page)).toBeDisabled();
    await expect(page.locator('#start-alerts-hint')).toHaveText(
      'Ta przeglądarka nie obsługuje powiadomień.',
    );
    await expectBell(
      page,
      'unsupported',
      'Powiadomienia (niedostępne w tej przeglądarce)',
    );
  });

  test('turning on announces a start that has just passed and opens its event', async ({
    page,
  }) => {
    await mockNotifications(page, 'default');
    await openAt(page, '/pl/notifications/', JUST_AFTER_START);
    await toggle(page).click();
    await expect
      .poll(() => createdNotifications(page))
      .toEqual([START_NOTIFICATION]);

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
    await saveChoice(page, true);
    await openAt(page, '/pl/', JUST_AFTER_START);
    await expect
      .poll(() => createdNotifications(page))
      .toEqual([START_NOTIFICATION]);
    await page.reload();
    await page.waitForTimeout(1500);
    expect(await createdNotifications(page)).toEqual([]);
  });

  test('gives the notification a 192 px PNG icon', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await openAt(page, '/pl/', JUST_AFTER_START);
    await expect
      .poll(() => createdNotifications(page))
      .toEqual([START_NOTIFICATION]);
    const icon = await page.evaluate(() =>
      String(Reflect.get(window, 'lastNotificationIcon')),
    );
    expect(icon).toMatch(/\/notification-icon\.png$/);
    const size = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    }, icon);
    expect(size).toEqual([192, 192]);
  });

  test('stays silent while the switch is off', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, false);
    await openAt(page, '/pl/', JUST_AFTER_START);
    await page.waitForTimeout(1500);
    expect(await createdNotifications(page)).toEqual([]);
  });

  test('has English texts', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await saveChoice(page, true);
    await page.goto('/en/notifications/');

    await expect(page).toHaveTitle('Notifications | Ski Jumping');
    await expect(toggle(page)).toHaveText('On');
    await expect(page.locator('.switches__row')).toContainText(
      'Competition start',
    );
    await expectBell(page, 'on', 'Notifications (on)');
    await expect(page.locator('#notifications-to-alerts')).toHaveAttribute(
      'href',
      '/en/alerts/',
    );
  });
});

test.describe('top bar bell', () => {
  for (const path of ['/pl/', '/pl/2026-2027/lillehammer/', '/pl/alerts/']) {
    test(`${path} has the bell as a link to the notifications page`, async ({
      page,
    }) => {
      await mockNotifications(page, 'granted');
      await saveChoice(page, true);
      await page.goto(path);

      await expect(page.locator('a#notifications-link')).toHaveAttribute(
        'href',
        '/pl/notifications/',
      );
      await expect(bell(page)).toHaveText('');
      await expectBell(page, 'on', 'Powiadomienia (włączone)');
      // One bell, and no switch in the top bar or on the page it is about.
      await expect(page.locator('.topbar .icon--bell')).toHaveCount(1);
      await expect(page.locator('.topbar [aria-pressed]')).toHaveCount(0);
      await expect(page.locator('.js-start-alerts-switch')).toHaveCount(0);
    });
  }

  test('stands before the language, theme and repository buttons', async ({
    page,
  }) => {
    await page.goto('/pl/');

    const order = await page
      .locator('.topbar__actions > *')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.id || node.getAttribute('aria-label')),
      );

    expect(order).toEqual([
      'notifications-link',
      'language-switch',
      'theme-toggle',
      'Repozytorium na GitHubie',
    ]);
  });

  test('shows the off state by default and leads to the notifications page', async ({
    page,
  }) => {
    await mockNotifications(page, 'default');
    await page.goto('/pl/');
    await expectBell(page, 'off', 'Powiadomienia (wyłączone)');
    await bell(page).click();
    await expect(page).toHaveURL(/\/pl\/notifications\/$/);
    await expect(bell(page)).toHaveAttribute('aria-current', 'page');
  });

  test('shows the blocked state when the browser denies notifications', async ({
    page,
  }) => {
    await mockNotifications(page, 'denied');
    await page.goto('/pl/');
    await expectBell(
      page,
      'blocked',
      'Powiadomienia (zablokowane w ustawieniach przeglądarki)',
    );
  });

  test('follows a choice made in another tab', async ({ page }) => {
    await mockNotifications(page, 'granted');
    await page.goto('/pl/');
    await expectBell(page, 'off', 'Powiadomienia (wyłączone)');

    // What the browser does in this tab when another one saves the choice.
    await page.evaluate((key) => {
      localStorage.setItem(key, 'true');
      window.dispatchEvent(new StorageEvent('storage', { key }));
    }, STORAGE.startAlerts);
    await expectBell(page, 'on', 'Powiadomienia (włączone)');
  });
});

test.describe('layout of the notifications page', () => {
  for (const width of [320, 400, 1440]) {
    test(`fits ${width} px with a 56 px top bar`, async ({ page }) => {
      await mockNotifications(page, 'denied');
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/notifications/');

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      const topbar = await page.locator('.topbar').boundingBox();

      expect(overflow).toBeLessThanOrEqual(0);
      expect(topbar?.height).toBe(56);
    });
  }
});
