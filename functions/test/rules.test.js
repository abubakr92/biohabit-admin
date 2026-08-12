// Firestore security rules tests. These need the Firestore emulator:
//   npm run firebase:emulators        (terminal 1)
//   npm --prefix functions run test:rules   (terminal 2)
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
} = require('firebase/firestore');

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'biohabit-rules-test',
    firestore: {
      rules: readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'stacks/active-stack'), { isActive: true, title: { nl: 'A', en: 'A' } });
    await setDoc(doc(db, 'stacks/draft-stack'), { isActive: false, title: { nl: 'D', en: 'D' } });
    for (let index = 0; index < 12; index += 1)
      await setDoc(doc(db, `contextRows/active-${index}`), {
        stackId: 'active-stack',
        stackSortOrder: index,
      });
    await setDoc(doc(db, 'contextRows/draft-1'), { stackId: 'draft-stack', stackSortOrder: 0 });
    await setDoc(doc(db, 'microActions/action-1'), { durationMin: 3 });
    await setDoc(doc(db, 'labels/label-1'), { key: 'focus' });
    await setDoc(doc(db, 'users/member-1'), { email: 'member@example.com', accessLevel: 'free' });
    await setDoc(doc(db, 'users/member-2'), { email: 'other@example.com', accessLevel: 'free' });
    await setDoc(doc(db, 'auditLogs/entry-1'), { action: 'publish' });
  });
});

test.after(async () => {
  await env?.cleanup();
});

const admin = () => env.authenticatedContext('admin-1', { admin: true }).firestore();
const member = () => env.authenticatedContext('member-1').firestore();
// A member who signed up but has no users/{uid} profile document yet.
const profileless = () => env.authenticatedContext('member-99').firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

test('an admin reads content and every user profile', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'stacks/draft-stack')));
  await assertSucceeds(getDoc(doc(admin(), 'users/member-1')));
  await assertSucceeds(getDoc(doc(admin(), 'contextRows/draft-1')));
});

test('signed-out users read nothing', async () => {
  await assertFails(getDoc(doc(anonymous(), 'stacks/active-stack')));
  await assertFails(getDoc(doc(anonymous(), 'microActions/action-1')));
});

test('members read active stacks but not drafts', async () => {
  await assertSucceeds(getDoc(doc(member(), 'stacks/active-stack')));
  await assertFails(getDoc(doc(member(), 'stacks/draft-stack')));
});

// Regression: isAdmin() must not read a users/{uid} document, or a member without a profile
// would error out of the rule and be denied content the app needs.
test('a member with no profile document still reads active content', async () => {
  await assertSucceeds(getDoc(doc(profileless(), 'stacks/active-stack')));
  await assertSucceeds(getDoc(doc(profileless(), 'microActions/action-1')));
  await assertSucceeds(getDoc(doc(profileless(), 'labels/label-1')));
});

// Regression: rules allow ten document-access calls per query. The per-row get() on the parent
// stack must dedupe to one call, or a stack with more than ten rows becomes unreadable.
test('a member queries all twelve rows of one active stack in a single request', async () => {
  const rows = query(collection(member(), 'contextRows'), where('stackId', '==', 'active-stack'));
  const snapshot = await assertSucceeds(getDocs(rows));
  assert.equal(snapshot.size, 12);
});

test('members cannot read rows belonging to a draft stack', async () => {
  await assertFails(getDoc(doc(member(), 'contextRows/draft-1')));
});

test('members read their own profile only', async () => {
  await assertSucceeds(getDoc(doc(member(), 'users/member-1')));
  await assertFails(getDoc(doc(member(), 'users/member-2')));
});

test('all client writes are rejected, including by an admin', async () => {
  await assertFails(setDoc(doc(member(), 'stacks/active-stack'), { isActive: false }));
  await assertFails(setDoc(doc(admin(), 'stacks/active-stack'), { isActive: false }));
  await assertFails(setDoc(doc(admin(), 'microActions/action-1'), { durationMin: 99 }));
  await assertFails(deleteDoc(doc(admin(), 'labels/label-1')));
  await assertFails(setDoc(doc(member(), 'users/member-1'), { accessLevel: 'admin' }));
});

test('audit logs are server-only, unreadable even by an admin', async () => {
  await assertFails(getDoc(doc(admin(), 'auditLogs/entry-1')));
  await assertFails(setDoc(doc(admin(), 'auditLogs/entry-2'), { action: 'x' }));
});
