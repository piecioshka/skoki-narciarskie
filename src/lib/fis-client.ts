// The one way the refresh scripts talk to the FIS site: a browser User-Agent
// (FIS refuses others), a polite gap between requests, a wait and a retry
// after 429, and an optional disk cache. Only the scripts import it; the site
// never fetches from FIS.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const FIS_URL = 'https://www.fis-ski.com/DB';
export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// FIS answers 429 after about fifty quick requests, so requests are spaced out.
export const REQUEST_GAP_MS = 3000;
export const RETRY_WAIT_MS = 60_000;
export const MAX_ATTEMPTS = 6;
export const FIS_CACHE_DIR = new URL('../../tmp/fis-cache/', import.meta.url);

export interface FisResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FisFetch = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<FisResponse>;

/** Stores page bodies by URL. */
export interface FisCache {
  read(url: string): string | undefined;
  write(url: string, body: string): void;
}

export interface FisClientOptions {
  /** Without a cache every call goes to FIS (the hourly refresh needs fresh pages). */
  cache?: FisCache;
  fetch?: FisFetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

export interface FisClient {
  /** Body of a FIS page; throws on an HTTP error or when 429 does not stop. */
  get(url: string): Promise<string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cache of page bodies in a directory, one file per URL hash. */
export function fileCache(dir: URL = FIS_CACHE_DIR): FisCache {
  mkdirSync(dir, { recursive: true });

  function fileOf(url: string): URL {
    const key = createHash('sha256').update(url).digest('hex').slice(0, 32);

    return new URL(`${key}.html`, dir);
  }

  return {
    read(url) {
      const file = fileOf(url);

      return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
    },
    write(url, body) {
      writeFileSync(fileOf(url), body);
    },
  };
}

export function createFisClient(options: FisClientOptions = {}): FisClient {
  const doFetch: FisFetch = options.fetch ?? fetch;
  const wait = options.sleep ?? sleep;
  const log = options.log ?? console.log;
  const { cache } = options;
  let requested = false;

  async function request(url: string): Promise<FisResponse> {
    // The gap goes before every request but the first, so a script does not
    // wait after its last one.
    if (requested) {
      await wait(REQUEST_GAP_MS);
    }
    requested = true;
    return doFetch(url, { headers: { 'User-Agent': USER_AGENT } });
  }

  return {
    async get(url) {
      const cached = cache?.read(url);

      if (cached !== undefined) {
        return cached;
      }
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const response = await request(url);

        if (response.ok) {
          const body = await response.text();

          cache?.write(url, body);
          return body;
        }
        if (response.status !== 429) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        log(`429 from FIS, waiting (attempt ${attempt})`);
        await wait(RETRY_WAIT_MS);
      }
      throw new Error(`FIS keeps answering 429 for ${url}`);
    },
  };
}
