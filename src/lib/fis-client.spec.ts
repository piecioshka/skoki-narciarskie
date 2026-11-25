import { describe, expect, it } from 'vitest';
import {
  createFisClient,
  MAX_ATTEMPTS,
  REQUEST_GAP_MS,
  RETRY_WAIT_MS,
  USER_AGENT,
  type FisCache,
  type FisFetch,
} from './fis-client';

const URL_A = 'https://www.fis-ski.com/DB/a.html';
const URL_B = 'https://www.fis-ski.com/DB/b.html';

function fakeFetch(statuses: number[]) {
  const calls: { url: string; userAgent: string | undefined }[] = [];
  const fetch: FisFetch = async (url, init) => {
    const status = statuses[calls.length] ?? 200;

    calls.push({ url, userAgent: init.headers['User-Agent'] });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => `body of ${url}`,
    };
  };

  return { fetch, calls };
}

function fakeSleep() {
  const waits: number[] = [];

  return { waits, sleep: async (ms: number) => void waits.push(ms) };
}

function memoryCache(): FisCache & { entries: Map<string, string> } {
  const entries = new Map<string, string>();

  return {
    entries,
    read: (url) => entries.get(url),
    write: (url, body) => void entries.set(url, body),
  };
}

const silent = () => {};

describe('createFisClient', () => {
  it('sends a browser User-Agent', async () => {
    const { fetch, calls } = fakeFetch([200]);
    const client = createFisClient({ fetch, sleep: fakeSleep().sleep });

    expect(await client.get(URL_A)).toBe(`body of ${URL_A}`);
    expect(calls).toEqual([{ url: URL_A, userAgent: USER_AGENT }]);
  });

  it('keeps a gap between requests but not before the first one', async () => {
    const { fetch } = fakeFetch([200, 200]);
    const { sleep, waits } = fakeSleep();
    const client = createFisClient({ fetch, sleep });

    await client.get(URL_A);
    expect(waits).toEqual([]);
    await client.get(URL_B);
    expect(waits).toEqual([REQUEST_GAP_MS]);
  });

  it('waits and retries after 429', async () => {
    const { fetch, calls } = fakeFetch([429, 429, 200]);
    const { sleep, waits } = fakeSleep();
    const client = createFisClient({ fetch, sleep, log: silent });

    expect(await client.get(URL_A)).toBe(`body of ${URL_A}`);
    expect(calls).toHaveLength(3);
    expect(waits).toEqual([
      RETRY_WAIT_MS,
      REQUEST_GAP_MS,
      RETRY_WAIT_MS,
      REQUEST_GAP_MS,
    ]);
  });

  it('gives up when FIS keeps answering 429', async () => {
    const { fetch, calls } = fakeFetch(Array(MAX_ATTEMPTS + 1).fill(429));
    const client = createFisClient({
      fetch,
      sleep: fakeSleep().sleep,
      log: silent,
    });

    await expect(client.get(URL_A)).rejects.toThrow(/keeps answering 429/);
    expect(calls).toHaveLength(MAX_ATTEMPTS);
  });

  it('fails at once on another HTTP error', async () => {
    const { fetch, calls } = fakeFetch([500]);
    const client = createFisClient({ fetch, sleep: fakeSleep().sleep });

    await expect(client.get(URL_A)).rejects.toThrow(`HTTP 500 for ${URL_A}`);
    expect(calls).toHaveLength(1);
  });

  it('answers from the cache without a request', async () => {
    const { fetch, calls } = fakeFetch([200]);
    const { sleep, waits } = fakeSleep();
    const cache = memoryCache();
    const client = createFisClient({ fetch, sleep, cache });

    await client.get(URL_A);
    expect(cache.entries.get(URL_A)).toBe(`body of ${URL_A}`);
    expect(await client.get(URL_A)).toBe(`body of ${URL_A}`);
    expect(calls).toHaveLength(1);
    expect(waits).toEqual([]);
  });

  it('does not cache failed responses', async () => {
    const { fetch } = fakeFetch([500]);
    const cache = memoryCache();
    const client = createFisClient({ fetch, sleep: fakeSleep().sleep, cache });

    await expect(client.get(URL_A)).rejects.toThrow();
    expect(cache.entries.size).toBe(0);
  });

  it('always asks FIS without a cache', async () => {
    const { fetch, calls } = fakeFetch([200, 200]);
    const client = createFisClient({ fetch, sleep: fakeSleep().sleep });

    await client.get(URL_A);
    await client.get(URL_A);
    expect(calls).toHaveLength(2);
  });
});
