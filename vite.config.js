import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // SPA mode: Vite will serve index.html for any unmatched path.
  // This fixes "JS doesn't load on refresh" for non-root routes like /problems/two-sum
  appType: 'spa',

  server: {
    port: 5173,
  },

  preview: {
    port: 4173,
    // vite preview also respects appType: 'spa' - handles SPA routing correctly
  },
});
