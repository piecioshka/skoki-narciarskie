// Browser notifications when a competition starts. The site is static, so
// there is no push server: a notification fires only while some page of the
// site is open (also in a background tab).
import { STORAGE_KEYS } from '../config';
import { t } from '../i18n';
import { isSitePath, type AlertOutcome } from '../lib/alert-log';
import { url } from '../lib/paths';
import {
  findDueAlerts,
  getStartAlertsState,
  type StartAlert,
  type StartAlertsState,
} from '../lib/start-alerts';
import { recordAlert } from './alert-log';
import { getLang, readStored, store } from './page';

// Old ids are dropped so the list in storage does not grow all season.
const SHOWN_LIMIT = 50;

function isAlert(value: unknown): value is StartAlert {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return ['id', 'start', 'title', 'body', 'url'].every(
    (key) => typeof Reflect.get(value, key) === 'string',
  );
}

export function readAlerts(): StartAlert[] {
  const text = document.getElementById('start-alerts-data')?.textContent;

  try {
    const parsed: unknown = JSON.parse(text ?? '[]');

    return Array.isArray(parsed) ? parsed.filter(isAlert) : [];
  } catch {
    return [];
  }
}

function readShown(): Set<string> {
  try {
    const parsed: unknown = JSON.parse(
      readStored(STORAGE_KEYS.startAlertsShown) ?? '[]',
    );

    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [],
    );
  } catch {
    return new Set();
  }
}

function rememberShown(ids: string[]): void {
  const all = [...readShown(), ...ids].slice(-SHOWN_LIMIT);

  store(STORAGE_KEYS.startAlertsShown, JSON.stringify(all));
}

function getState(): StartAlertsState {
  return getStartAlertsState(
    'Notification' in window ? Notification.permission : undefined,
    readStored(STORAGE_KEYS.startAlerts),
  );
}

// The address comes from data in the page, so only a page of this site is
// opened, never a full URL or a `javascript:` one.
function openOnSite(target: string): void {
  if (isSitePath(target)) {
    location.assign(target);
  }
}

function notify(alert: StartAlert): AlertOutcome {
  try {
    // The tag lets the system replace a duplicate from another open tab.
    const notification = new Notification(alert.title, {
      body: alert.body,
      tag: alert.id,
      icon: url('/favicon.svg'),
    });

    notification.addEventListener('click', () => {
      window.focus();
      notification.close();
      openOnSite(alert.url);
    });
    return 'shown';
  } catch {
    // Chrome on Android takes notifications only from a service worker and
    // throws here.
    return 'error';
  }
}

/** The one path that shows a notification; it also writes the alert log. */
function show(alert: StartAlert): void {
  const outcome = notify(alert);

  recordAlert({
    id: alert.id,
    at: new Date().toISOString(),
    kind: 'start',
    title: alert.title,
    body: alert.body,
    url: alert.url,
    outcome,
  });
}

function check(alerts: StartAlert[]): void {
  if (getState() !== 'on') {
    return;
  }

  const due = findDueAlerts(alerts, new Date(), readShown());

  if (due.length > 0) {
    // Remembered before showing, so other tabs checking a second later skip it.
    rememberShown(due.map((alert) => alert.id));
    // Only the latest start matters when several are due at once.
    const latest = due[due.length - 1];

    if (latest) {
      show(latest);
    }
  }
}

/** The bell in the top bar: a link whose icon and name tell the state. */
function renderBell(state: StartAlertsState): void {
  const label = t(getLang()).notificationsLabels[state];

  for (const link of document.querySelectorAll<HTMLElement>(
    '.js-notifications-link',
  )) {
    link.dataset['state'] = state;
    link.setAttribute('aria-label', label);
    link.title = label;
  }
}

/** The switch on the notifications page, when this is that page. */
function renderSwitch(state: StartAlertsState): void {
  const dict = t(getLang());
  const enabled = state === 'on';

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    'button.js-start-alerts-switch',
  )) {
    button.setAttribute('aria-pressed', String(enabled));
    // The page cannot ask again once the browser blocks notifications.
    button.disabled = state === 'blocked' || state === 'unsupported';
  }
  for (const label of document.querySelectorAll(
    '.js-start-alerts-switch-label',
  )) {
    label.textContent = enabled ? dict.switchOn : dict.switchOff;
  }
  for (const hint of document.querySelectorAll('.js-start-alerts-hint')) {
    hint.textContent = dict.startAlertsHints[state];
  }
}

function render(): void {
  const state = getState();

  renderBell(state);
  renderSwitch(state);
}

async function toggle(): Promise<void> {
  const state = getState();

  if (state === 'on') {
    store(STORAGE_KEYS.startAlerts, 'false');
  } else if (state === 'off') {
    // The click on the switch is the user gesture the browser requires.
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    store(STORAGE_KEYS.startAlerts, String(permission === 'granted'));
  }
  render();
}

/** Returns the check to run on every tick, or nothing when unsupported. */
export function setupStartAlerts(): (() => void) | undefined {
  render();
  for (const button of document.querySelectorAll('.js-start-alerts-switch')) {
    button.addEventListener('click', () => {
      void toggle();
    });
  }
  // A choice made in another tab reaches the bell and the switch at once.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === STORAGE_KEYS.startAlerts) {
      render();
    }
  });

  if (!('Notification' in window)) {
    return undefined;
  }

  const alerts = readAlerts();

  return () => check(alerts);
}
