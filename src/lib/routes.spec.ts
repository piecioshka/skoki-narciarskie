import { describe, expect, it } from 'vitest';
import { NAV, routePath, sectionOf, withBase, type Route } from './routes';

describe('routePath', () => {
  it.each<[Route, string]>([
    [{ name: 'home' }, '/'],
    [{ name: 'season', seasonId: '2026-2027' }, '/2026-2027/'],
    [
      { name: 'event', seasonId: '2026-2027', slug: 'wisla' },
      '/2026-2027/wisla/',
    ],
    [{ name: 'standings', seasonId: '2026-2027' }, '/2026-2027/standings/'],
    [{ name: 'gallery', seasonId: '2026-2027' }, '/2026-2027/gallery/'],
    [{ name: 'tournaments' }, '/tournaments/'],
    [{ name: 'tournament', slug: 'tcs' }, '/tournaments/tcs/'],
    [{ name: 'hills' }, '/hills/'],
    [{ name: 'hill', slug: 'wisla' }, '/hills/wisla/'],
    [{ name: 'nations' }, '/nations/'],
    [{ name: 'nation', nation: 'POL' }, '/nations/pol/'],
    [{ name: 'nations-cup', seasonId: '2025-2026' }, '/2025-2026/nations-cup/'],
    [{ name: 'rules' }, '/rules/'],
    [{ name: 'credits' }, '/credits/'],
    [{ name: 'countdown' }, '/countdown/'],
  ])('builds the path of %o', (route, path) => {
    expect(routePath(route)).toBe(path);
  });
});

describe('withBase', () => {
  it('keeps a root path at the site root', () => {
    expect(withBase('/', '/pl/hills/')).toBe('/pl/hills/');
  });

  it('puts a subdirectory base in front', () => {
    expect(withBase('/skoki-narciarskie/', '/pl/hills/')).toBe(
      '/skoki-narciarskie/pl/hills/',
    );
    expect(withBase('/skoki-narciarskie', '/favicon.svg')).toBe(
      '/skoki-narciarskie/favicon.svg',
    );
  });
});

describe('sectionOf', () => {
  it.each<[Route, string | undefined]>([
    [{ name: 'home' }, undefined],
    [{ name: 'credits' }, undefined],
    [{ name: 'countdown' }, undefined],
    [{ name: 'season', seasonId: '2026-2027' }, 'schedule'],
    [{ name: 'event', seasonId: '2026-2027', slug: 'ruka' }, 'schedule'],
    [{ name: 'standings', seasonId: '2026-2027' }, 'standings'],
    [{ name: 'gallery', seasonId: '2026-2027' }, 'gallery'],
    [{ name: 'tournament', slug: 'tcs' }, 'tournaments'],
    [{ name: 'hill', slug: 'wisla' }, 'hills'],
    [{ name: 'nation', nation: 'POL' }, 'nations'],
    [{ name: 'nations-cup', seasonId: '2025-2026' }, 'nations'],
    [{ name: 'rules' }, 'rules'],
  ])('puts %o in %s', (route, section) => {
    expect(sectionOf(route)).toBe(section);
  });

  it('marks the landing page of every nav entry as its own section', () => {
    for (const entry of NAV) {
      expect(sectionOf(entry.route('2026-2027'))).toBe(entry.section);
    }
  });
});

describe('NAV', () => {
  it('gives every entry its own shortcut, apart from the fixed keys', () => {
    const keys = NAV.map((entry) => entry.shortcut);

    expect(new Set(keys).size).toBe(keys.length);
    for (const reserved of ['?', 'h', 't', 'l']) {
      expect(keys).not.toContain(reserved);
    }
  });
});
