import type { Page } from '@playwright/test';

export const JUST_AFTER_START = new Date('2026-11-21T15:51:00Z');

export const STORAGE = {
  startAlerts: 'ski-jumping:start-alerts',
  alertLog: 'ski-jumping:alert-log:v1',
};

export const START_NOTIFICATION = {
  title: 'Zawody wystartowały: Lillehammer',
  body: 'Konkurs indywidualny HS140 (K123). Kliknij, aby otworzyć stronę zawodów.',
};

interface FakeOptions {
  /** What `requestPermission()` answers; the permission changes with it. */
  answer?: NotificationPermission;
  /** Makes `new Notification()` throw, as Chrome on Android does. */
  failing?: boolean;
}

/**
 * Replaces `Notification` with a fake: headless Chromium reports `denied`
 * even with the permission granted. Created notifications are collected in
 * `window.createdNotifications`, permission requests counted in
 * `window.permissionRequests`.
 */
export async function mockNotifications(
  page: Page,
  permission: NotificationPermission,
  { answer = 'granted', failing = false }: FakeOptions = {},
): Promise<void> {
  await page.addInitScript(
    ({ initial, answer, failing }) => {
      const created: { title: string; body: string }[] = [];

      class FakeNotification extends EventTarget {
        static permission: NotificationPermission = initial;

        static requestPermission(): Promise<NotificationPermission> {
          const requests = Number(Reflect.get(window, 'permissionRequests'));

          Reflect.set(window, 'permissionRequests', requests + 1);
          FakeNotification.permission = answer;
          return Promise.resolve(answer);
        }

        constructor(title: string, options: NotificationOptions = {}) {
          super();
          if (failing) {
            throw new TypeError('Illegal constructor');
          }
          created.push({ title, body: options.body ?? '' });
          Reflect.set(window, 'lastNotification', this);
        }

        close(): void {
          // Nothing to close in the fake.
        }
      }

      Reflect.set(window, 'Notification', FakeNotification);
      Reflect.set(window, 'createdNotifications', created);
      Reflect.set(window, 'permissionRequests', 0);
    },
    { initial: permission, answer, failing },
  );
}

/** Removes the Notification API, as in a browser that never had it. */
export async function removeNotifications(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, 'Notification');
  });
}

/** Saves the choice of the switch before the page scripts run. */
export async function saveChoice(page: Page, enabled: boolean): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      // Only on the first load, so a later reload keeps what the page stored.
      if (key && value && localStorage.getItem(key) === null) {
        localStorage.setItem(key, value);
      }
    },
    [STORAGE.startAlerts, String(enabled)],
  );
}

export async function createdNotifications(page: Page): Promise<unknown> {
  return page.evaluate(() => Reflect.get(window, 'createdNotifications'));
}

export async function openAt(
  page: Page,
  path: string,
  now: Date,
): Promise<void> {
  await page.clock.setFixedTime(now);
  await page.goto(path);
}
