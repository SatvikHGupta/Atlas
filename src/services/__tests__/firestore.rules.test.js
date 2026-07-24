/**
 * Run against the Firestore emulator:
 *   firebase emulators:exec --only firestore "npx vitest run src/services/__tests__/firestore.rules.test.js"
 *
 * (Requires the Firebase CLI and Java installed locally - this is a
 * developer-machine/CI test, not something that runs as part of `npm run
 * build`.) See docs/09-TESTING-AND-QA.md §1 for the full test matrix this
 * implements.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

const USER_A = 'user-a-uid';
const USER_B = 'user-b-uid';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'atlas-cp-test',
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('progress/{uid}', () => {
  it('owner can read their own doc', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(db.collection('progress').doc(USER_A).set({ items: {} }));
    await assertSucceeds(db.collection('progress').doc(USER_A).get());
  });

  it('owner can write their own doc', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(db.collection('progress').doc(USER_A).set({ items: { p1: { status: 'solved' } } }));
  });

  it('a different authenticated user CANNOT read another user\'s doc', async () => {
    const dbA = testEnv.authenticatedContext(USER_A).firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('progress').doc(USER_A).set({ items: {} });
    });
    const dbB = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(dbB.collection('progress').doc(USER_A).get());
  });

  it('a different authenticated user CANNOT write another user\'s doc', async () => {
    const dbB = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(dbB.collection('progress').doc(USER_A).set({ items: {} }));
  });

  it('unauthenticated client CANNOT read', async () => {
    const dbAnon = testEnv.unauthenticatedContext().firestore();
    await assertFails(dbAnon.collection('progress').doc(USER_A).get());
  });

  it('unauthenticated client CANNOT write', async () => {
    const dbAnon = testEnv.unauthenticatedContext().firestore();
    await assertFails(dbAnon.collection('progress').doc(USER_A).set({ items: {} }));
  });
});

describe('bookmarks/{uid} and users/{uid} — same ownership rule', () => {
  it('owner can read/write their own bookmarks doc', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(db.collection('bookmarks').doc(USER_A).set({ items: {} }));
  });

  it('non-owner cannot write another user\'s bookmarks doc', async () => {
    const dbB = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(dbB.collection('bookmarks').doc(USER_A).set({ items: {} }));
  });

  it('owner can read/write their own users doc', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertSucceeds(db.collection('users').doc(USER_A).set({ display_name: 'Test' }));
  });

  it('non-owner cannot write another user\'s users doc', async () => {
    const dbB = testEnv.authenticatedContext(USER_B).firestore();
    await assertFails(dbB.collection('users').doc(USER_A).set({ display_name: 'Hijacked' }));
  });
});

describe('deny-all default', () => {
  it('an undeclared collection is denied entirely', async () => {
    const db = testEnv.authenticatedContext(USER_A).firestore();
    await assertFails(db.collection('admin').doc('anything').set({ foo: 'bar' }));
  });
});
