// Browser notifications when a competition starts. The site is static, so
// there is no push server: a notification fires only while some page of the
// site is open (also in a background tab).
import { STORAGE_KEYS } from '../config';
import { findDueAlerts, type StartAlert } from '../lib/start-alerts';

// Old ids are dropped so the list in storage does not grow all season.
const SHOWN_LIMIT = 50;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Without storage the choice lasts only for this page.
  }
}

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
      read(STORAGE_KEYS.startAlertsShown) ?? '[]',
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

function isEnabled(): boolean {
  return (
    Notification.permission === 'granted' &&
    read(STORAGE_KEYS.startAlerts) === 'true'
  );
}

// Event pages are plain paths such as /pl/2026-2027/ruka/ (with the base
// path in front on GitHub Pages).
const EVENT_PATH = /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/;

// The address comes from data in the page, so only an event path of this site
// is opened, never a full URL or a `javascript:` one.
function openOnSite(url: string): void {
  if (EVENT_PATH.test(url)) {
    location.assign(url);
  }
}

function show(alert: StartAlert): void {
  // The tag lets the system replace a duplicate from another open tab.
  const notification = new Notification(alert.title, {
    body: alert.body,
    tag: alert.id,
    icon: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/favicon.svg`,
  });

  notification.addEventListener('click', () => {
    window.focus();
    notification.close();
    openOnSite(alert.url);
  });
}

function check(alerts: StartAlert[]): void {
  if (!isEnabled()) {
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

function render(button: HTMLElement): void {
  const { labelOn, labelOff, labelBlocked } = button.dataset;
  const blocked = Notification.permission === 'denied';
  const enabled = isEnabled();
  const label = blocked ? labelBlocked : enabled ? labelOn : labelOff;

  button.setAttribute('aria-pressed', String(enabled));
  button.setAttribute('aria-disabled', String(blocked));
  if (label) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

async function toggle(button: HTMLElement): Promise<void> {
  if (isEnabled()) {
    store(STORAGE_KEYS.startAlerts, 'false');
  } else if (Notification.permission !== 'denied') {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    store(STORAGE_KEYS.startAlerts, String(permission === 'granted'));
  }
  render(button);
}

/** Returns the check to run on every tick, or nothing when unsupported. */
export function setupStartAlerts(): (() => void) | undefined {
  const button = document.getElementById('start-alerts-toggle');

  if (!button || !('Notification' in window)) {
    return undefined;
  }

  const alerts = readAlerts();

  button.hidden = false;
  render(button);
  button.addEventListener('click', () => {
    void toggle(button);
  });
  return () => check(alerts);
}
