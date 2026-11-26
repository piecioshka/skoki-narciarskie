// The alert log in localStorage: written by the one path that shows a
// notification, drawn on the alerts page.
import { STORAGE_KEYS } from '../config';
import { t } from '../i18n';
import {
  addToAlertLog,
  isSitePath,
  parseAlertLog,
  type AlertLogEntry,
} from '../lib/alert-log';
import { formatLocal } from '../lib/time';
import { getLang, readStored, store } from './page';

type Dictionary = ReturnType<typeof t>;

export function readAlertLog(): AlertLogEntry[] {
  return parseAlertLog(readStored(STORAGE_KEYS.alertLog));
}

// Set on the alerts page: the `storage` event reaches only the other tabs, so
// an entry written by this one is drawn directly.
let redraw: (() => void) | undefined;

/** Adds one fired notification to the log. */
export function recordAlert(entry: AlertLogEntry): void {
  store(
    STORAGE_KEYS.alertLog,
    JSON.stringify(addToAlertLog(readAlertLog(), entry)),
  );
  redraw?.();
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);

  node.className = className;
  node.append(...children);
  return node;
}

function titleNode(entry: AlertLogEntry): Node | string {
  // The address was read from storage, so only a page of this site is linked.
  if (!isSitePath(entry.url)) {
    return entry.title;
  }

  const link = element('a', 'table__link', entry.title);

  link.href = entry.url;
  return link;
}

function entryNode(entry: AlertLogEntry, dict: Dictionary): HTMLElement {
  const time = element(
    'time',
    'alert-log__time',
    formatLocal(new Date(entry.at)),
  );

  time.dateTime = entry.at;
  return element(
    'li',
    'alert-log__entry',
    element(
      'div',
      'alert-log__meta',
      time,
      element('span', 'badge', dict.alertKinds[entry.kind]),
      element(
        'span',
        `badge alert-log__outcome--${entry.outcome}`,
        dict.alertOutcomes[entry.outcome],
      ),
    ),
    element('p', 'alert-log__title', titleNode(entry)),
    element('p', 'alert-log__body', entry.body),
  );
}

function render(root: HTMLElement): void {
  const entries = readAlertLog();
  const dict = t(getLang());
  const empty = entries.length === 0;

  for (const node of root.querySelectorAll<HTMLElement>(
    '.js-alert-log-empty',
  )) {
    node.hidden = !empty;
  }
  for (const node of root.querySelectorAll<HTMLElement>(
    '.js-alert-log-filled',
  )) {
    node.hidden = empty;
  }
  root
    .querySelector('.js-alert-log-list')
    ?.replaceChildren(...entries.map((entry) => entryNode(entry, dict)));
}

/** Draws the log on the alerts page and keeps it current. */
export function setupAlertLog(): void {
  const root = document.querySelector<HTMLElement>('.js-alert-log');

  if (!root) {
    return;
  }

  redraw = () => render(root);
  render(root);
  root.querySelector('.js-alert-log-clear')?.addEventListener('click', () => {
    store(STORAGE_KEYS.alertLog, '[]');
    render(root);
  });
  // A notification shown by another tab lands here without a reload.
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key === STORAGE_KEYS.alertLog) {
      render(root);
    }
  });
}
