// Firestore security rules tests. These need the Firestore emulator:
//   npm run firebase:emulators              (terminal 1)
//   npm --prefix functions run test:rules   (terminal 2)
//
// ../../firestore.rules is a verbatim mirror of the ruleset deployed on the project, which the
// mobile lead owns. It is never deployed from this repo — `npm run firebase:deploy` carries
// `--only functions:api`. Refresh the mirror with `npm --prefix functions run check-rules -- --pull`
// after the lead changes anything, then re-run this suite: these assertions describe what
// production actually enforces, not what this panel would have chosen.
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
  updateDoc,
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
    await setDoc(doc(db, 'notificationTemplates/series_anchor'), {
      title: { nl: 'Tijd', en: 'Time' },
      body: { nl: 'Klaar', en: 'Ready' },
      isActive: true,
    });
    await setDoc(doc(db, 'users/member-1'), {
      email: 'member@example.com',
      accessLevel: 'user',
      verified: true,
      rhythmDaysCount: 3,
      lastCheckOffAt: null,
    });
    await setDoc(doc(db, 'users/member-2'), { email: 'other@example.com', accessLevel: 'user' });
    await setDoc(doc(db, 'users/member-1/checkOffs/2026-09-01'), { stepIds: ['active-0'] });
    await setDoc(doc(db, 'users/member-1/routines/routine-1'), { title: 'Morning' });
    await setDoc(doc(db, 'users/member-2/routines/routine-9'), { title: 'Theirs' });
    await setDoc(doc(db, 'auditLogs/entry-1'), { action: 'publish' });
    await setDoc(doc(db, 'emailOtps/member-1'), { code: '123456' });
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
  await assertFails(getDoc(doc(anonymous(), 'notificationTemplates/series_anchor')));
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

test('a member queries all twelve rows of one active stack in a single request', async () => {
  const rows = query(collection(member(), 'contextRows'), where('stackId', '==', 'active-stack'));
  const snapshot = await assertSucceeds(getDocs(rows));
  assert.equal(snapshot.size, 12);
});

// A deliberate trade-off in the deployed rules, documented there: checking the parent stack per
// row cannot work, because a query is refused outright if one document in it fails and rules allow
// only ten document lookups per query. So a draft stack's ROWS are readable even though the stack
// itself is not. Pinned here so the exposure stays a known decision rather than a surprise; the
// note in the deployed rules says how to close it (put isActive on the rows and filter on it).
test('a draft stack is hidden but its rows are readable — a known trade-off', async () => {
  await assertFails(getDoc(doc(member(), 'stacks/draft-stack')));
  await assertSucceeds(getDoc(doc(member(), 'contextRows/draft-1')));
});

test('members read their own profile only', async () => {
  await assertSucceeds(getDoc(doc(member(), 'users/member-1')));
  await assertFails(getDoc(doc(member(), 'users/member-2')));
});

// The app owns a member's own day: ticks, routines and plans are written from the device.
test('a member owns their own subcollections and cannot reach anyone else', async () => {
  await assertSucceeds(getDoc(doc(member(), 'users/member-1/checkOffs/2026-09-01')));
  await assertSucceeds(
    setDoc(doc(member(), 'users/member-1/checkOffs/2026-09-02'), { stepIds: [] }),
  );
  await assertSucceeds(getDoc(doc(member(), 'users/member-1/routines/routine-1')));
  await assertFails(getDoc(doc(member(), 'users/member-2/routines/routine-9')));
});

// accessLevel, verified, rhythmDaysCount and lastCheckOffAt are granted by an admin or written by
// a trigger. A member may edit the rest of their profile but must not be able to promote itself.
test('a member cannot grant itself privileges on its own profile', async () => {
  await assertFails(updateDoc(doc(member(), 'users/member-1'), { accessLevel: 'admin' }));
  await assertFails(updateDoc(doc(member(), 'users/member-1'), { rhythmDaysCount: 99 }));
  await assertSucceeds(updateDoc(doc(member(), 'users/member-1'), { name: 'Renamed' }));
});

// Content is admin-writable from a client, not server-only: the deployed rules gate it on the
// admin custom claim. A member gets nowhere near it.
test('content is writable by an admin claim and by nobody else', async () => {
  await assertFails(setDoc(doc(member(), 'stacks/active-stack'), { isActive: false }));
  await assertFails(setDoc(doc(member(), 'microActions/action-1'), { durationMin: 99 }));
  await assertFails(deleteDoc(doc(member(), 'labels/label-1')));
  await assertSucceeds(setDoc(doc(admin(), 'microActions/action-1'), { durationMin: 4 }));
});

// B1: the app reads notification copy straight by trigger key, and cannot change it.
test('notification templates are readable by any member and writable only by an admin', async () => {
  await assertSucceeds(getDoc(doc(member(), 'notificationTemplates/series_anchor')));
  await assertFails(
    setDoc(doc(member(), 'notificationTemplates/series_anchor'), { isActive: false }),
  );
  await assertSucceeds(
    setDoc(doc(admin(), 'notificationTemplates/series_anchor'), {
      title: { nl: 'Tijd', en: 'Time' },
      body: { nl: 'Klaar', en: 'Ready' },
      isActive: true,
    }),
  );
});

test('audit logs are admin-only and closed to members', async () => {
  await assertSucceeds(getDoc(doc(admin(), 'auditLogs/entry-1')));
  await assertFails(getDoc(doc(member(), 'auditLogs/entry-1')));
  await assertFails(setDoc(doc(member(), 'auditLogs/entry-2'), { action: 'x' }));
});

// The one-time code a member is meant to be proving they received. Nobody reads it from a client.
test('email OTPs are unreachable from any client, admin included', async () => {
  await assertFails(getDoc(doc(admin(), 'emailOtps/member-1')));
  await assertFails(getDoc(doc(member(), 'emailOtps/member-1')));
});
