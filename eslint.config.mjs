// ESLint flat config for Atlas (Next.js core-web-vitals). Author: Satvik Hemant Gupta
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    'content/**',
    'public/data/**',
    '.next/**',
    'raw-data/**',
    'node_modules/**',
  ]),
]);
