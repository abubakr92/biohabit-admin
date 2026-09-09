// Store integration tests against the Firestore emulator. Cover the data-integrity and pagination
// behaviour that unit tests cannot reach, including Firestore's cross-type sort order.
//   npm run firebase:emulators              (terminal 1)
//   npm --prefix functions run test:store   (terminal 2)
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'biohabit-store-test';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

const test = require('node:test');
const assert = require('node:assert/strict');
const { db } = require('../lib/firebase');
const store = require('../lib/store');

const bilingual = (value) => ({ nl: value, en: value });
const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();

async function wipe() {
  for (const name of ['stacks', 'contextRows', 'microActions', 'labels', 'users']) {
    const snapshot = await db.collection(name).get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  }
}

const row = (overrides = {}) => ({
  microActionId: 'action-1',
  microActionTitle: bilingual('Breathe'),
  stackSortOrder: 0,
  priorityOrder: 1,
  isOptional: false,
  isActiveByDefault: true,
  includedInMode: 'essential',
  daypart: 'morning',
  durationOverrideMin: null,
  timingType: 'none',
  startTime: null,
  endTime: null,
  relativeToContextId: null,
  dependencyText: bilingual(''),
  contextEffect: bilingual(''),
  contextWarning: bilingual(''),
  centreTime: null,
  elasticityMin: null,
  ...overrides,
});

test.before(async () => {
  await wipe();
  await db
    .collection('microActions')
    .doc('action-1')
    .set({
      title: bilingual('Breathe'),
      effect: bilingual('e'),
      howTo: bilingual('h'),
      warning: bilingual('w'),
      labels: ['focus'],
      durationMin: 5,
      level: 'beginner',
    });
  await db
    .collection('labels')
    .doc('label-1')
    .set({ key: 'focus', name: bilingual('Focus') });
});

test('a label key in use cannot be renamed, but its display name can', async () => {
  const stack = await store.createStack({
    title: bilingual('Uses focus'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'focus',
    supportingLabels: [],
    level: 'beginner',
    isPremium: false,
    isActive: false,
  });
  await assert.rejects(
    () => store.updateLabel('label-1', { key: 'focus-v2', name: bilingual('Focus') }),
    (error) => error.status === 409 && /still used by/.test(error.message),
  );
  const renamed = await store.updateLabel('label-1', {
    key: 'focus',
    name: bilingual('Deep focus'),
  });
  assert.equal(renamed.name.en, 'Deep focus');
  // One stack (primaryLabel) plus one micro-action (labels) both reference the key.
  assert.equal(renamed.usageCount, 2);
  await store.deleteStack(stack.id);
});

test('a reorder that inverts a relative dependency is rejected and changes nothing', async () => {
  const stack = await store.createStack({
    title: bilingual('Ordered'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'focus',
    supportingLabels: [],
    level: 'beginner',
    isPremium: false,
    isActive: false,
  });
  const first = await store.createContextRow(stack.id, row({ stackSortOrder: 0 }));
  const second = await store.createContextRow(
    stack.id,
    row({
      stackSortOrder: 1,
      timingType: 'relative',
      relativeToContextId: first.id,
      dependencyText: bilingual('after'),
    }),
  );

  await assert.rejects(
    () => store.reorderContextRows(stack.id, [second.id, first.id]),
    (error) => error.status === 422 && /before the row it depends on/.test(error.message),
  );
  const unchanged = await store.listContextRows(stack.id);
  assert.deepEqual(
    unchanged.map((item) => item.id),
    [first.id, second.id],
  );

  // The same rows in a valid order still reorder normally.
  await store.reorderContextRows(stack.id, [first.id, second.id]);
  assert.deepEqual(
    (await store.listContextRows(stack.id)).map((item) => item.stackSortOrder),
    [0, 1],
  );
  await store.deleteStack(stack.id);
});

test('duplicating a stack repoints relative rows at the copies, not the source', async () => {
  const stack = await store.createStack({
    title: bilingual('Source'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'focus',
    supportingLabels: [],
    level: 'beginner',
    isPremium: false,
    isActive: true,
  });
  const first = await store.createContextRow(stack.id, row({ stackSortOrder: 0 }));
  await store.createContextRow(
    stack.id,
    row({
      stackSortOrder: 1,
      timingType: 'relative',
      relativeToContextId: first.id,
      dependencyText: bilingual('after'),
    }),
  );

  const copy = await store.duplicateStack(stack.id);
  const copiedRows = await store.listContextRows(copy.id);
  const dependent = copiedRows.find((item) => item.timingType === 'relative');
  assert.equal(copy.isActive, false, 'a duplicate starts as a draft');
  assert.equal(dependent.relativeToContextId, copiedRows[0].id, 'points at the copied row');
  assert.notEqual(dependent.relativeToContextId, first.id, 'does not point at the source stack');
  await Promise.all([store.deleteStack(stack.id), store.deleteStack(copy.id)]);
});

test('deleting a stack removes its context rows with it', async () => {
  const stack = await store.createStack({
    title: bilingual('Doomed'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'focus',
    supportingLabels: [],
    level: 'beginner',
    isPremium: false,
    isActive: false,
  });
  await store.createContextRow(stack.id, row());
  await store.deleteStack(stack.id);
  assert.equal((await store.listContextRows(stack.id)).length, 0);
  await assert.rejects(
    () => store.getStack(stack.id),
    (error) => error.status === 404,
  );
});

// 12 testers: 0–3 have never checked off, 4–7 checked off yesterday, 8–11 went quiet nine days
// ago. Silent (no check-off within three days) is therefore 0–3 and 8–11 — eight in total.
const NEVER = ['tester-00', 'tester-01', 'tester-02', 'tester-03'];
const RECENT = ['tester-04', 'tester-05', 'tester-06', 'tester-07'];
const STALE = ['tester-08', 'tester-09', 'tester-10', 'tester-11'];

async function seedUsers() {
  await wipe();
  for (let index = 0; index < 12; index += 1)
    await db
      .collection('users')
      .doc(`tester-${String(index).padStart(2, '0')}`)
      .set({
        email: `t${index}@example.com`,
        accessLevel: 'test',
        rhythmDaysCount: 0,
        unlockedAt: index % 2 === 0 ? iso(1) : null,
        lastCheckOffAt: index < 4 ? null : index < 8 ? iso(1) : iso(9),
        createdAt: iso(index),
      });
}

const walk = async (status, pageSize) => {
  const seen = [];
  let cursor;
  let guard = 0;
  do {
    const page = await store.listUsers(status, pageSize, cursor);
    seen.push(...page.users.map((user) => user.id));
    cursor = page.nextCursor ?? undefined;
    if ((guard += 1) > 50) throw new Error('pagination did not terminate');
  } while (cursor);
  return seen;
};

test('user paging walks the whole collection exactly once', async () => {
  await seedUsers();
  const seen = await walk('all', 5);
  assert.equal(seen.length, 12, 'every user is returned');
  assert.equal(new Set(seen).size, 12, 'no user is returned twice');
});

// Regression: a Firestore inequality filter skips nulls, so a `<=` range alone silently loses
// every tester who has never checked off — the exact group this filter exists to surface.
test('the silent filter includes testers who have never checked off', async () => {
  const ids = (await store.listUsers('silent', 100)).users.map((user) => user.id);
  for (const id of NEVER) assert.ok(ids.includes(id), `${id} has never checked off and is silent`);
  for (const id of STALE)
    assert.ok(ids.includes(id), `${id} went quiet nine days ago and is silent`);
  for (const id of RECENT)
    assert.ok(!ids.includes(id), `${id} checked off yesterday and is not silent`);
  assert.equal(ids.length, 8);
});

test('silent paging spans both passes without dropping or repeating anyone', async () => {
  for (const pageSize of [1, 3, 5, 8]) {
    const seen = await walk('silent', pageSize);
    assert.equal(new Set(seen).size, 8, `page size ${pageSize} returns all eight silent testers`);
    assert.equal(seen.length, 8, `page size ${pageSize} repeats nobody`);
    assert.deepEqual([...new Set(seen)].sort(), [...NEVER, ...STALE].sort());
  }
});

test('unlocked and locked filters split the collection cleanly', async () => {
  const [unlocked, locked] = await Promise.all([
    store.listUsers('unlocked', 100),
    store.listUsers('locked', 100),
  ]);
  assert.equal(unlocked.users.length, 6);
  assert.equal(locked.users.length, 6);
  assert.ok(unlocked.users.every((user) => user.unlockedAt));
  assert.ok(locked.users.every((user) => user.unlockedAt === null));
});

test.after(async () => {
  await wipe();
});

// ---------------------------------------------------------------------------
// Admin checklist — A2, A3, A4, B1
// ---------------------------------------------------------------------------

// A4/A3. Fields added after documents were already written come back undefined. The panel must
// receive a usable value without the stored documents being rewritten behind the client's back.
test('A4/A3 — records written before stackOrder and row daypart still read cleanly', async () => {
  await wipe();
  // Written straight to Firestore, bypassing the schema, exactly as the live records were.
  const legacy = await db.collection('stacks').add({
    title: bilingual('Legacy'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'energy',
    supportingLabels: [],
    level: 'beginner',
    isPremium: false,
    isActive: false,
    createdAt: iso(10),
    updatedAt: iso(10),
  });
  const stack = await store.getStack(legacy.id);
  assert.equal(stack.stackOrder, 0, 'a stack written before the field reads as 0');
  assert.equal(stack.daypart, null, 'and an absent daypart reads as null, not undefined');

  await db
    .collection('microActions')
    .doc('action-1')
    .set({
      title: bilingual('Breathe'),
      effect: bilingual('e'),
      howTo: bilingual('h'),
      warning: bilingual(''),
      labels: ['energy'],
      durationMin: 2,
      level: 'beginner',
    });
  const legacyRow = await db
    .collection('contextRows')
    .add({ ...row(), daypart: undefined, functionTag: undefined, stackId: legacy.id });
  const [read] = await store.listContextRows(legacy.id);
  assert.equal(read.id, legacyRow.id);
  assert.equal(read.daypart, null, 'an absent row daypart means inherit from the stack');
  assert.equal(read.functionTag, null, 'an absent row function means inherit from the action');
});

// A2. stackSortOrder is the effective order and drag-and-drop owns it. priorityOrder is stored but
// never sorted by, so reordering must not touch it.
test('A2 — rows are ordered by stackSortOrder, and a reorder leaves priorityOrder alone', async () => {
  await wipe();
  const stack = await store.createStack({
    title: bilingual('Order'),
    description: bilingual(''),
    coherence: bilingual(''),
    suggestedTiming: bilingual(''),
    functionTag: 'regulate',
    primaryLabel: 'energy',
    supportingLabels: [],
    level: 'beginner',
    daypart: 'morning',
    stackOrder: 2,
    isPremium: false,
    isActive: false,
  });
  assert.equal(stack.stackOrder, 2, 'the stack keeps the order it was created with');
  await db
    .collection('microActions')
    .doc('action-1')
    .set({
      title: bilingual('Breathe'),
      effect: bilingual('e'),
      howTo: bilingual('h'),
      warning: bilingual(''),
      labels: ['energy'],
      durationMin: 2,
      level: 'beginner',
    });
  const created = [];
  for (const index of [0, 1, 2])
    created.push(
      await store.createContextRow(stack.id, {
        ...row(),
        // priorityOrder deliberately runs opposite to stackSortOrder: if anything sorted by it,
        // the assertions below would come back reversed.
        stackSortOrder: index,
        priorityOrder: 3 - index,
        microActionTitle: bilingual(`Row ${index}`),
      }),
    );
  assert.deepEqual(
    (await store.listContextRows(stack.id)).map((item) => item.microActionTitle.en),
    ['Row 0', 'Row 1', 'Row 2'],
    'listed by stackSortOrder, not priorityOrder',
  );

  const reversed = [created[2].id, created[1].id, created[0].id];
  await store.reorderContextRows(stack.id, reversed);
  const after = await store.listContextRows(stack.id);
  assert.deepEqual(
    after.map((item) => item.microActionTitle.en),
    ['Row 2', 'Row 1', 'Row 0'],
    'dragging changes the effective order',
  );
  assert.deepEqual(
    after.map((item) => item.priorityOrder),
    [1, 2, 3],
    'each row keeps the priorityOrder it was stored with',
  );
});

// B1. One template per trigger: two rows claiming the same key would make the copy the app sends
// arbitrary.
test('B1 — notification templates round-trip and refuse a duplicate trigger', async () => {
  for (const document of (await db.collection('notificationTemplates').get()).docs)
    await document.ref.delete();
  const input = {
    triggerKey: 'series_anchor',
    title: bilingual('Time for your series'),
    body: bilingual('Your first action is ready.'),
    deeplinkTarget: 'biohabit://home',
    isActive: true,
  };
  const created = await store.createNotificationTemplate(input);
  assert.equal(created.triggerKey, 'series_anchor');
  assert.equal(
    created.id,
    'series_anchor',
    'the trigger key is the document id, so the app can fetch copy straight by path',
  );
  assert.ok(created.updatedAt, 'the panel shows when copy last changed');

  await assert.rejects(
    () => store.createNotificationTemplate({ ...input, title: bilingual('Second') }),
    (error) => error.status === 409,
    'a second template for the same trigger is refused',
  );

  const updated = await store.updateNotificationTemplate(created.id, {
    ...input,
    body: bilingual('Edited without an app release.'),
    isActive: false,
  });
  assert.equal(updated.body.en, 'Edited without an app release.');
  assert.equal(updated.isActive, false);
  assert.deepEqual(
    (await store.listNotificationTemplates()).map((item) => item.body.en),
    ['Edited without an app release.'],
  );

  // The key identifies the record; changing it would move the document out from under the app.
  await assert.rejects(
    () => store.updateNotificationTemplate(created.id, { ...input, triggerKey: 'renamed_key' }),
    (error) => error.status === 422,
    'the trigger key cannot be changed in place',
  );

  await store.deleteNotificationTemplate(created.id);
  assert.deepEqual(await store.listNotificationTemplates(), []);
});
