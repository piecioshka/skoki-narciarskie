import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatJson } from './write-json.ts';

describe('formatJson', () => {
  it('keeps short arrays on one line like Prettier does', async () => {
    const text = await formatJson('data.json', {
      channels: ['eurosport', 'tvn'],
    });

    expect(text).toBe('{\n  "channels": ["eurosport", "tvn"]\n}\n');
  });

  it('reproduces a committed season file byte for byte', async () => {
    const file = 'src/data/seasons/2026-2027.json';
    const source = readFileSync(file, 'utf8');

    expect(await formatJson(file, JSON.parse(source))).toBe(source);
  });
});
