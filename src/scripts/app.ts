import { STORAGE_KEYS } from '../config';
import { isLang, t, type Lang } from '../i18n';
import { getPhase, type Slot } from '../lib/schedule';
import { countdown, formatLocal } from '../lib/time';

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

  return isLang(lang) ? lang : 'en';
}

function readSlot(element: HTMLElement): Slot | undefined {
  const { slotStart, slotEnd, slotTimed } = element.dataset;

  if (!slotStart || !slotEnd) {
    return undefined;
  }
  return {
    start: new Date(slotStart),
    end: new Date(slotEnd),
    timed: slotTimed === 'true',
  };
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

function updatePhases(now: Date, lang: Lang): void {
  const labels = t(lang).phases;

  for (const element of all('.js-slot')) {
    const slot = readSlot(element);

    if (slot) {
      const phase = getPhase(now, slot);

      element.dataset['phase'] = phase;
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
    left.days > 0 ? `${left.days} ${units.days}` : '',
    `${left.hours} ${units.hours}`,
    `${left.minutes} ${units.minutes}`,
    `${left.seconds} ${units.seconds}`,
  ];

  return parts.filter(Boolean).join(' ');
}

function updateNext(now: Date, lang: Lang): void {
  const cards = all('.js-next');

  if (cards.length === 0) {
    return;
  }

  const current = cards.find((card) => {
    const slot = readSlot(card);

    return slot !== undefined && getPhase(now, slot) !== 'finished';
  });

  for (const card of cards) {
    card.hidden = card !== current;
  }
  for (const element of all('.js-season-over')) {
    element.hidden = current !== undefined;
  }

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

function setupHillGrouping(): void {
  const button = document.querySelector<HTMLElement>('.js-group-hills');
  const flat = document.querySelector<HTMLElement>('.js-hills-flat');
  const grouped = document.querySelector<HTMLElement>('.js-hills-grouped');

  if (!button || !flat || !grouped) {
    return;
  }

  const apply = (pressed: boolean): void => {
    button.setAttribute('aria-pressed', String(pressed));
    flat.hidden = pressed;
    grouped.hidden = !pressed;
  };

  apply(read(STORAGE_KEYS.hillsGrouped) === 'true');
  button.addEventListener('click', () => {
    const pressed = button.getAttribute('aria-pressed') !== 'true';

    store(STORAGE_KEYS.hillsGrouped, String(pressed));
    apply(pressed);
  });
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

function refresh(): void {
  const now = new Date();
  const lang = getLang();

  updatePhases(now, lang);
  updateNext(now, lang);
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
    p: () => document.getElementById('team-link')?.click(),
    g: () => document.getElementById('gallery-link')?.click(),
    u: () => document.getElementById('tournaments-link')?.click(),
    k: () => document.getElementById('hills-link')?.click(),
    n: () => document.getElementById('nations-link')?.click(),
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
  openExternalLinksInNewTab();
  setupHomeOnlyFilters();
  setupHillGrouping();
  setupToc();
  showLocalTimes();
  refresh();
  setInterval(refresh, 1000);
}

setup();
