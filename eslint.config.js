// ESLint flat config — Svelte 5 + TypeScript.
// Semua aturan recommended diturunkan ke "warn" agar `npm run lint`
// melaporkan temuan tanpa menggagalkan build pada codebase lama.
import svelte from 'eslint-plugin-svelte';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** Ubah severity semua rules dalam satu blok config menjadi "warn". */
function asWarn(config) {
  const rules = {};
  for (const [name, entry] of Object.entries(config.rules ?? {})) {
    if (entry === 'off' || entry === 0) {
      rules[name] = 'off';
      continue;
    }
    rules[name] = Array.isArray(entry) ? ['warn', ...entry.slice(1)] : 'warn';
  }
  return { ...config, rules };
}

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'dist-server/**', 'coverage/**'],
  },

  // Aturan bawaan eslint-plugin-svelte (parser Svelte + a11y dasar)
  ...svelte.configs['flat/recommended'].map(asWarn),

  // File .svelte: sediakan global browser + parser TS untuk <script lang="ts">
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.svelte'],
      },
      globals: { ...globals.browser },
    },
  },

  // File TypeScript: parser TS, global node+browser (kode isomorphic)
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off', // diperiksa oleh tsc / svelte-check
      'no-console': 'off', // server memakai logger sendiri
    },
  },

  // Kode server murni Node
  {
    files: ['server/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
