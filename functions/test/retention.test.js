// Guest data retention against the Auth and Firestore emulators. The emulator stamps every account
// with the current time, so "30 days later" is reached by running the job with a later `now`.
//   npm run firebase:emulators                 (terminal 1)
//   npm --prefix functions run test:emulated   (terminal 2)
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'biohabit-retention-test';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';

const test = require('node:test');
const assert = require('node:assert/strict');
const { adminAuth, db } = require('../lib/firebase');
const { runGuestRetention, isGuest, lastUse } = require('../lib/retention');
const { requestAnalyticsDeletion } = require('../lib/analytics');

const DAY = 86_400_000;
const later = (days) => Date.now() + days * DAY;
const exists = async (uid) => (await adminAuth.getUser(uid).then(() => true, () => false));

// Only this file's own accounts: the other suites run alongside and keep theirs. The job itself sees
// their accounts too, which is why the assertions below count guests and deletions, not totals.
const OWN = ['g', 'm', 'old-guest', 'recent-guest', 'edge-guest', 'converted', 'member', 'bare-guest'];
async function wipe() {
  await adminAuth.deleteUsers(OWN);
  for (const uid of OWN) await db.recursiveDelete(db.collection('users').doc(uid));
}

async function guestWithData(uid, profile = {}) {
  await adminAuth.createUser({ uid });
  await db.collection('users').doc(uid).set({ preferences: { need: 'regulate' }, ...profile });
  await db.collection('users').doc(uid).collection('routines').doc('r1').set({ title: 'Morning Start' });
  await db.collection('users').doc(uid).collection('checkOffs').doc('2026-11-01').set({ stepIds: ['a'] });
}

test.beforeEach(wipe);
test.after(wipe);

test('a guest is an account with no sign-in method; a member never is', async () => {
  const guest = await adminAuth.createUser({ uid: 'g' });
  const member = await adminAuth.createUser({ uid: 'm', email: 'm@example.com', password: 'secret12' });
  assert.equal(isGuest(guest), true);
  assert.equal(isGuest(member), false);
});

test('last use is the latest signal, and lastOpenAt from the app wins when newer', async () => {
  const user = await adminAuth.createUser({ uid: 'g' });
  const created = Date.parse(user.metadata.creationTime);
  assert.equal(lastUse(user, null), created);
  assert.equal(lastUse(user, new Date(created + 5 * DAY).toISOString()), created + 5 * DAY);
  assert.equal(lastUse(user, { toMillis: () => created + 9 * DAY }), created + 9 * DAY);
});

test('the dry run counts and deletes nothing', async () => {
  await guestWithData('old-guest');
  const report = await runGuestRetention({ apply: false, now: later(31) });
  assert.equal(report.guests, 1);
  assert.equal(report.expired, 1);
  assert.equal(report.deleted, 0);
  assert.equal(await exists('old-guest'), true);
  assert.equal((await db.collection('users').doc('old-guest').collection('routines').get()).size, 1);
});

test('a guest unused for over 30 days is deleted with all its data', async () => {
  await guestWithData('old-guest');
  const report = await runGuestRetention({ apply: true, now: later(31) });
  assert.equal(report.deleted, 1);
  assert.equal(await exists('old-guest'), false);
  assert.equal((await db.collection('users').doc('old-guest').get()).exists, false);
  for (const name of ['routines', 'checkOffs']) assert.equal((await db.collection('users').doc('old-guest').collection(name).get()).size, 0);
});

test('a guest used within 30 days stays, by lastOpenAt', async () => {
  await guestWithData('recent-guest', { lastOpenAt: new Date(later(25)).toISOString() });
  const report = await runGuestRetention({ apply: true, now: later(31) });
  assert.equal(report.expired, 0);
  assert.equal(await exists('recent-guest'), true);
});

test('exactly 30 days unused is not yet expired', async () => {
  await guestWithData('edge-guest');
  const report = await runGuestRetention({ apply: true, now: later(29.99) });
  assert.equal(report.expired, 0);
  assert.equal(await exists('edge-guest'), true);
});

test('a guest who created an account keeps everything, however long ago it was made', async () => {
  await guestWithData('converted');
  await adminAuth.updateUser('converted', { email: 'converted@example.com', password: 'secret12' });
  const report = await runGuestRetention({ apply: true, now: later(400) });
  assert.equal(report.guests, 0);
  assert.equal(await exists('converted'), true);
  assert.equal((await db.collection('users').doc('converted').collection('routines').get()).size, 1);
});

test('members are never touched', async () => {
  await adminAuth.createUser({ uid: 'member', email: 'member@example.com', password: 'secret12' });
  await db.collection('users').doc('member').set({ email: 'member@example.com' });
  await runGuestRetention({ apply: true, now: later(400) });
  assert.equal(await exists('member'), true);
  assert.equal((await db.collection('users').doc('member').get()).exists, true);
});

test('a guest without a profile is still removed', async () => {
  await adminAuth.createUser({ uid: 'bare-guest' });
  const report = await runGuestRetention({ apply: true, now: later(31) });
  assert.equal(report.deleted, 1);
  assert.equal(await exists('bare-guest'), false);
});

test('the report holds counts and dates only', async () => {
  await guestWithData('old-guest');
  const report = await runGuestRetention({ apply: false, now: later(31) });
  assert.doesNotMatch(JSON.stringify(report), /old-guest/);
});

test('no Analytics request without an app instance ID', async () => {
  assert.equal(await requestAnalyticsDeletion(undefined), 'none');
  assert.equal(await requestAnalyticsDeletion('  '), 'none');
});
