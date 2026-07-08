import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'public/**',
      // ESLint 9 flat config .eslintignore dosyasını okumaz;
      // eski hariç tutmalar buraya taşındı.
      'e2e/**',
      'playwright.config.js',
      'playwright.config.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'react/no-unescaped-entities': 'off',
    },
  },
  ...compat.extends('prettier'),
];

export default eslintConfig;
