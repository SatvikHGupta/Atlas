import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // firestore.rules.test.js requires the Firestore emulator running
    // separately (see the comment at the top of that file) - it's excluded
    // from the default `npm test` run and executed via the documented
    // `firebase emulators:exec` command instead, so a plain `npm test`
    // doesn't fail on developer machines without the emulator installed.
    exclude: ['**/node_modules/**', '**/firestore.rules.test.js'],
  },
});
