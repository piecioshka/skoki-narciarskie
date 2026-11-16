import astro from 'eslint-plugin-astro';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      '.astro/',
      'tmp/',
      'coverage/',
      'playwright-report/',
      'test-results/',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
    },
  },
);
