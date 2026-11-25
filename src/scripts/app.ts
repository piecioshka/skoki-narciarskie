import { STORAGE_KEYS } from '../config';
import { isLang, t, type Lang } from '../i18n';
import {
  findFirstUnfinished,
  getPhase,
  getTimingPhase,
  readTiming,
  TIMING_SELECTOR,
  type Slot,
} from '../lib/timing';
import { countdown, formatLocal, isSameLocalDay } from '../lib/time';
import { setupPosterExport } from './poster-export';
import { setupLiveFavicon } from './live-favicon';
import { setupStartAlerts } from './start-alerts';

const MAX_UPCOMING_EVENTS = 3;

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked (private mode); the preference is then per page.
  }
}

function getLang(): Lang {
  const { lang } = document.documentElement;

  return isLang(lang) ? lang : 'pl';
}

function readSlot(element: HTMLElement): Slot | undefined {
  return readTiming(element.dataset)?.slot;
}

function all(selector: string, root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)];
}

function toggleTheme(): void {
  const root = document.documentElement;
  const next = root.dataset['theme'] === 'dark' ? 'light' : 'dark';

  root.dataset['theme'] = next;
  store(STORAGE_KEYS.theme, next);
}

function showLocalTimes(): void {
  for (const element of all('time.js-local-time')) {
    const value = element.getAttribute('datetime');

    if (value) {
      element.textContent = formatLocal(new Date(value));
    }
  }
  for (const element of all('.js-time-zone')) {
    element.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

/** A competition of the current day counts down to its start. */
function updateSlotCountdown(
  element: HTMLElement,
  now: Date,
  slot: Slot,
  lang: Lang,
): void {
  const visible =
    element.dataset['today'] === 'true' && getPhase(now, slot) === 'upcoming';

  for (const countdownElement of all('.js-slot-countdown', element)) {
    countdownElement.hidden = !visible;
  }
  if (visible) {
    for (const value of all('.js-slot-countdown-value', element)) {
      value.textContent = formatCountdown(now, slot.start, lang);
    }
  }
}

function updatePhases(now: Date, lang: Lang): void {
  const labels = t(lang).phases;

  for (const element of all(TIMING_SELECTOR)) {
    const timing = readTiming(element.dataset);

    if (timing) {
      const { slot } = timing;
      const phase = getTimingPhase(now, timing);

      element.dataset['phase'] = phase;
      element.dataset['today'] = String(isSameLocalDay(now, slot.start));
      updateSlotCountdown(element, now, slot, lang);
      for (const label of all('.js-phase', element)) {
        label.textContent = labels[phase];
      }
    }
  }
}

function formatCountdown(now: Date, target: Date, lang: Lang): string {
  const units = t(lang).countdownUnits;
  const left = countdown(now, target);
  const parts = [
    left.days > 0 ? `${left.days} ${units.days(left.days)}` : '',
    `${left.hours} ${units.hours}`,
    `${left.minutes} ${units.minutes}`,
    `${left.seconds} ${units.seconds}`,
  ];

  return parts.filter(Boolean).join(' ');
}

/** The first card whose competition has not finished; the rest are hidden. */
function showCurrent(cards: HTMLElement[], now: Date): HTMLElement | undefined {
  // Each page has one kind of card; an empty list must not flag the season.
  if (cards.length === 0) {
    return undefined;
  }

  // A card without timing (a cancelled competition) is never the current one.
  const current = findFirstUnfinished(cards, now, readSlot);

  for (const card of cards) {
    card.hidden = card !== current;
  }
  for (const element of all('.js-season-over')) {
    element.hidden = current !== undefined;
  }
  return current;
}

function updateNext(now: Date, lang: Lang): void {
  const current = showCurrent(all('.js-next'), now);
  const slot = current ? readSlot(current) : undefined;

  if (current && slot) {
    const upcoming = getPhase(now, slot) === 'upcoming';

    for (const element of all('.js-countdown', current)) {
      element.hidden = !upcoming;
    }
    for (const element of all('.js-countdown-value', current)) {
      element.textContent = formatCountdown(now, slot.start, lang);
    }
  }
}

function updatePoster(now: Date, lang: Lang): void {
  const current = showCurrent(all('.js-poster'), now);
  const slot = current ? readSlot(current) : undefined;

  if (!current || !slot) {
    return;
  }

  const phase = getPhase(now, slot);
  const left = countdown(now, slot.start);

  for (const element of all('.js-poster-clock', current)) {
    element.hidden = phase !== 'upcoming';
  }
  for (const element of all('.js-poster-live', current)) {
    element.hidden = phase === 'upcoming';
    element.textContent =
      phase === 'live' ? t(lang).posterLive : t(lang).posterToday;
  }
  for (const unit of ['days', 'hours', 'minutes', 'seconds'] as const) {
    for (const element of all(`.js-poster-${unit}`, current)) {
      element.textContent = String(left[unit]).padStart(2, '0');
    }
  }
}

function setupPosterFormats(): void {
  const stage = document.querySelector<HTMLElement>('.js-poster-stage');
  const buttons = all('.js-poster-format');

  if (!stage) {
    return;
  }

  // A phone screenshot fits a story better, so narrow screens start there.
  const fallback = matchMedia('(max-width: 640px)').matches ? 'story' : 'wide';
  const apply = (format: string): void => {
    stage.dataset['format'] = format;
    for (const button of buttons) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset['format'] === format),
      );
    }
  };

  apply(read(STORAGE_KEYS.posterFormat) ?? fallback);
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const format = button.dataset['format'] ?? 'wide';

      store(STORAGE_KEYS.posterFormat, format);
      apply(format);
    });
  }
}

function updateUpcomingEvents(): void {
  const visible = all('.js-upcoming-event').filter((element) => {
    const finished = element.dataset['phase'] === 'finished';

    element.hidden = finished;
    return !finished;
  });

  visible.forEach((element, index) => {
    element.hidden = index >= MAX_UPCOMING_EVENTS;
  });
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function applyHomeOnly(button: HTMLElement, pressed: boolean): void {
  // The table follows its toolbar, so the filter stays per table.
  const table = button.closest('.table-tools')?.nextElementSibling;

  button.setAttribute('aria-pressed', String(pressed));
  table?.classList.toggle('table-wrap--home-only', pressed);
}

function setupHomeOnlyFilters(): void {
  const buttons = all('.js-home-only');
  // The choice is remembered, so it survives switching between seasons.
  const remembered = read(STORAGE_KEYS.homeOnly) === 'true';

  for (const button of buttons) {
    applyHomeOnly(button, remembered);
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') !== 'true';

      store(STORAGE_KEYS.homeOnly, String(pressed));
      for (const other of buttons) {
        applyHomeOnly(other, pressed);
      }
    });
  }
}

function setupViewToggles(): void {
  for (const button of all('.js-view-toggle')) {
    const {
      storage,
      flat: flatSelector,
      grouped: groupedSelector,
    } = button.dataset;
    const flat = flatSelector
      ? document.querySelector<HTMLElement>(flatSelector)
      : null;
    const grouped = groupedSelector
      ? document.querySelector<HTMLElement>(groupedSelector)
      : null;

    if (storage && flat && grouped) {
      const key = `ski-jumping:${storage}`;
      const apply = (pressed: boolean): void => {
        button.setAttribute('aria-pressed', String(pressed));
        flat.hidden = pressed;
        grouped.hidden = !pressed;
      };

      apply(read(key) === 'true');
      button.addEventListener('click', () => {
        const pressed = button.getAttribute('aria-pressed') !== 'true';

        store(key, String(pressed));
        apply(pressed);
      });
    }
  }
}

function setupToc(): void {
  const links = all('.js-toc-link');
  const sections = all('.js-toc-section');

  if (links.length === 0 || !('IntersectionObserver' in window)) {
    return;
  }

  // The section nearest to the top of the viewport is the current one.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          for (const link of links) {
            const current = link.getAttribute('href') === `#${entry.target.id}`;

            if (current) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          }
        }
      }
    },
    { rootMargin: '-80px 0px -70% 0px' },
  );

  for (const section of sections) {
    observer.observe(section);
  }
}

function openExternalLinksInNewTab(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="http"]',
  )) {
    if (link.host !== location.host) {
      link.target = '_blank';
      // Without `noopener` the opened page could control this one.
      link.rel = 'noopener noreferrer';
    }
  }
}

function setupSeasonSelects(): void {
  for (const select of document.querySelectorAll<HTMLSelectElement>(
    '.js-season-select',
  )) {
    const panels = all(
      '.js-season-panel',
      select.closest('section') ?? document,
    );
    const show = (): void => {
      for (const panel of panels) {
        panel.hidden = panel.dataset['season'] !== select.value;
      }
    };

    select.addEventListener('change', show);
    show();
  }
}

function refresh(): void {
  const now = new Date();
  const lang = getLang();

  updatePhases(now, lang);
  updateNext(now, lang);
  updatePoster(now, lang);
  updateUpcomingEvents();
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function setupShortcuts(): void {
  const dialog = document.getElementById('shortcuts-dialog');
  const open = (): void => {
    if (dialog instanceof HTMLDialogElement && !dialog.open) {
      // showModal() traps focus and restores it to the opener on close.
      dialog.showModal();
    }
  };
  const actions: Record<string, () => void> = {
    '?': open,
    t: toggleTheme,
    l: () => document.getElementById('language-switch')?.click(),
    h: () => document.getElementById('home-link')?.click(),
    s: () => document.getElementById('schedule-link')?.click(),
    r: () => document.getElementById('standings-link')?.click(),
    g: () => document.getElementById('gallery-link')?.click(),
    u: () => document.getElementById('tournaments-link')?.click(),
    k: () => document.getElementById('hills-link')?.click(),
    n: () => document.getElementById('nations-link')?.click(),
    z: () => document.getElementById('rules-link')?.click(),
  };

  document.getElementById('shortcuts-open')?.addEventListener('click', open);
  document.addEventListener('keydown', (event) => {
    const modified = event.metaKey || event.ctrlKey || event.altKey;
    const dialogOpen = dialog instanceof HTMLDialogElement && dialog.open;

    if (modified || dialogOpen || isTyping(event.target)) {
      return;
    }

    const action = actions[event.key];

    if (action) {
      event.preventDefault();
      action();
    }
  });
}

function setup(): void {
  document
    .getElementById('theme-toggle')
    ?.addEventListener('click', toggleTheme);
  document
    .getElementById('language-switch')
    ?.addEventListener('click', (event) => {
      const target = event.currentTarget;

      if (target instanceof HTMLElement && target.dataset['lang']) {
        store(STORAGE_KEYS.lang, target.dataset['lang']);
      }
    });
  setupShortcuts();
  setupSeasonSelects();
  openExternalLinksInNewTab();
  setupHomeOnlyFilters();
  setupViewToggles();
  setupPosterFormats();
  setupPosterExport({
    current: () => {
      const element = all('.js-poster').find((card) => !card.hidden);
      const slot = element ? readSlot(element) : undefined;

      return element && slot ? { element, slot } : undefined;
    },
    liveLabel: (slot) =>
      getPhase(new Date(), slot) === 'live'
        ? t(getLang()).posterLive
        : t(getLang()).posterToday,
  });
  setupToc();
  showLocalTimes();

  const checkStartAlerts = setupStartAlerts();
  const updateFavicon = setupLiveFavicon();
  const tick = (): void => {
    refresh();
    checkStartAlerts?.();
    updateFavicon();
  };

  tick();
  setInterval(tick, 1000);
}

setup();
