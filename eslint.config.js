// ESLint flat config — enforces ES2022 modern syntax across the project.
// html/js/**  : plain JavaScript browser modules
// src/**      : TypeScript source
// tests/**    : TypeScript Jest + Playwright tests (relaxed for test helpers)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ── Ignored outputs and generated files ──────────────────────────────────
  { ignores: ['dist/**', 'test-results/**', 'node_modules/**'] },

  // ── Browser JS (html/js and html/game.js) ────────────────────────────────
  {
    files: ['html/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      // Disallow legacy constructs that have modern ES2022 replacements
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'no-prototype-builtins': 'error',
    },
  },

  // ── TypeScript source ─────────────────────────────────────────────────────
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.ts'],
  })),
  {
    files: ['src/**/*.ts'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
    },
  },

  // ── Tests (TypeScript) ────────────────────────────────────────────────────
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: ['tests/**/*.ts'],
  })),
  {
    files: ['tests/**/*.ts'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      '@typescript-eslint/no-explicit-any': 'off', // test harnesses use `any` freely
    },
  },
);
