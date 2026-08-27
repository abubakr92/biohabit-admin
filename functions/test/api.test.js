// End-to-end HTTP tests against the deployed Express app running in the Functions emulator, using
// a real Firebase ID token from the Auth emulator. Covers routing, the auth middleware, CORS and
// the error handler — the layers the schema and store suites do not touch.
//   npm run firebase:emulators              (terminal 1)
//   npm run firebase:seed                   (terminal 2, once)
//   npm --prefix functions run test:api     (terminal 2)
const test = require('node:test');
const assert = require('node:assert/strict');

const API = process.env.API_BASE ?? 'http://127.0.0.1:5001/biohabit/europe-west4/api';
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const ORIGIN = 'http://localhost:3000';
let token;

const call = async (path, { method = 'GET', body, auth = true, origin = ORIGIN } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${token}`;
  if (origin) headers.Origin = origin;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
  };
};

const bilingual = (value) => ({ nl: value, en: value });
const draft = (overrides = {}) => ({
  title: bilingual('E2E draft'),
  description: bilingual(''),
  coherence: bilingual(''),
  suggestedTiming: bilingual(''),
  functionTag: 'regulate',
  primaryLabel: 'brain',
  supportingLabels: [],
  level: 'beginner',
  isPremium: false,
  isActive: false,
  ...overrides,
});

test.before(async () => {
  const response = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@biohabit.app',
        password: 'biohabit-dev',
        returnSecureToken: true,
      }),
    },
  );
  const data = await response.json();
  assert.ok(data.idToken, `could not sign in to the auth emulator: ${JSON.stringify(data)}`);
  token = data.idToken;
});

test('health is public; everything else demands a token', async () => {
  assert.equal((await call('/health', { auth: false })).status, 200);
  assert.equal((await call('/stacks', { auth: false })).status, 401);
  assert.equal((await call('/users', { auth: false })).status, 401);
});

test('a garbage token is rejected, not merely ignored', async () => {
  const saved = token;
  token = 'not-a-real-token';
  const response = await call('/stacks');
  token = saved;
  assert.equal(response.status, 401);
});

test('the session reports the signed-in admin', async () => {
  const { status, body } = await call('/auth/session');
  assert.equal(status, 200);
  assert.equal(body.user.email, 'admin@biohabit.app');
  assert.equal(body.user.accessLevel, 'admin');
});

// The Functions emulator injects its own permissive Access-Control-Allow-Origin on every response,
// so the deny case cannot be observed locally — `vary: Origin` is the evidence our middleware ran
// and declined to set the header itself. Verify the deny case against the deployed function with
// scripts/verify-deployment.sh, which is the only place the real behaviour is visible.
test('CORS admits the panel origin (deny case is emulator-masked)', async () => {
  const allowed = await call('/health', { auth: false, origin: ORIGIN });
  assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
  const stranger = await call('/health', { auth: false, origin: 'https://not-the-panel.example' });
  assert.equal(stranger.headers.get('vary'), 'Origin', 'our cors middleware evaluated the origin');
});

test('an unknown endpoint returns a JSON 404, not an HTML page', async () => {
  const { status, body } = await call('/does-not-exist');
  assert.equal(status, 404);
  assert.equal(body.message, 'Endpoint not found.');
});

// The defect that made the panel unusable: a draft with only a title was rejected outright.
test('B3 — a title-only draft is created, then activation reports missing copy per locale', async () => {
  const created = await call('/stacks', { method: 'POST', body: draft() });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.id;

  const activated = await call(`/stacks/${id}`, { method: 'PATCH', body: { isActive: true } });
  assert.equal(activated.status, 422);
  assert.deepEqual(
    Object.keys(activated.body.fieldErrors).sort(),
    [
      'coherence.en',
      'coherence.nl',
      'daypart',
      'description.en',
      'description.nl',
      'suggestedTiming.en',
      'suggestedTiming.nl',
    ],
    'dotted paths so the form can highlight the offending field',
  );

  const completed = await call(`/stacks/${id}`, {
    method: 'PATCH',
    body: {
      isActive: true,
      description: bilingual('d'),
      coherence: bilingual('c'),
      suggestedTiming: bilingual('s'),
      daypart: 'morning',
    },
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.isActive, true);
  assert.equal(completed.body.daypart, 'morning');
  assert.equal((await call(`/stacks/${id}`, { method: 'DELETE' })).status, 204);
});

test('H2 — a reorder that inverts a dependency is refused over HTTP', async () => {
  const stack = (
    await call('/stacks', { method: 'POST', body: draft({ title: bilingual('Reorder e2e') }) })
  ).body;
  const base = {
    microActionId: 'action-1',
    microActionTitle: bilingual('A'),
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
  };
  const first = (
    await call(`/stacks/${stack.id}/context-rows`, {
      method: 'POST',
      body: { ...base, stackSortOrder: 0 },
    })
  ).body;
  const second = (
    await call(`/stacks/${stack.id}/context-rows`, {
      method: 'POST',
      body: {
        ...base,
        stackSortOrder: 1,
        timingType: 'relative',
        relativeToContextId: first.id,
        dependencyText: bilingual('after'),
      },
    })
  ).body;

  const bad = await call('/context-rows/reorder', {
    method: 'POST',
    body: { stackId: stack.id, ids: [second.id, first.id] },
  });
  assert.equal(bad.status, 422);
  assert.match(bad.body.message, /before the row it depends on/);

  const good = await call('/context-rows/reorder', {
    method: 'POST',
    body: { stackId: stack.id, ids: [first.id, second.id] },
  });
  assert.equal(good.status, 204);
  assert.equal((await call(`/stacks/${stack.id}`, { method: 'DELETE' })).status, 204);
});

test('H3 — a malformed time is refused', async () => {
  const stack = (
    await call('/stacks', { method: 'POST', body: draft({ title: bilingual('Time e2e') }) })
  ).body;
  const response = await call(`/stacks/${stack.id}/context-rows`, {
    method: 'POST',
    body: {
      microActionId: 'action-1',
      microActionTitle: bilingual('A'),
      stackSortOrder: 0,
      priorityOrder: 1,
      isOptional: false,
      isActiveByDefault: true,
      includedInMode: 'essential',
      daypart: 'morning',
      durationOverrideMin: null,
      timingType: 'exact',
      startTime: 'half past nine',
      endTime: null,
      relativeToContextId: null,
      dependencyText: bilingual(''),
      contextEffect: bilingual(''),
      contextWarning: bilingual(''),
      centreTime: null,
      elasticityMin: null,
    },
  });
  assert.equal(response.status, 422);
  assert.ok(response.body.fieldErrors.startTime, 'the error is attached to startTime');
  await call(`/stacks/${stack.id}`, { method: 'DELETE' });
});

test('H1 — renaming a label key that is in use is blocked', async () => {
  const labels = (await call('/labels')).body;
  const used = labels.find((label) => label.usageCount > 0);
  assert.ok(used, 'the seed has at least one label in use');
  const blocked = await call(`/labels/${used.id}`, {
    method: 'PATCH',
    body: { key: `${used.key}-renamed` },
  });
  assert.equal(blocked.status, 409);
  const renamed = await call(`/labels/${used.id}`, {
    method: 'PATCH',
    body: { name: { nl: 'Nieuw', en: 'New name' } },
  });
  assert.equal(renamed.status, 200, 'the display name is still editable');
});

test('H4 — /users is paginated and the silent filter is reachable', async () => {
  const first = await call('/users?status=all&limit=5');
  assert.equal(first.status, 200);
  assert.equal(first.body.users.length, 5);
  assert.ok(first.body.nextCursor, 'a further page is offered');

  const second = await call(`/users?status=all&limit=5&cursor=${first.body.nextCursor}`);
  const overlap = second.body.users.filter((user) =>
    first.body.users.some((other) => other.id === user.id),
  );
  assert.equal(overlap.length, 0, 'pages do not overlap');

  assert.equal((await call('/users?status=silent&limit=50')).status, 200);
  assert.equal((await call('/users?limit=500')).status, 422, 'an oversized page is refused');
});

test('a micro-action still used by a stack cannot be deleted', async () => {
  const actions = (await call('/micro-actions')).body;
  const used = actions.find((action) => action.usedInStacksCount > 0);
  assert.ok(used, 'the seed has at least one action in use');
  const response = await call(`/micro-actions/${used.id}`, { method: 'DELETE' });
  assert.equal(response.status, 409);
  assert.match(response.body.message, /is used in/);
});

test('deleting a stack takes its context rows with it', async () => {
  const stack = (
    await call('/stacks', { method: 'POST', body: draft({ title: bilingual('Cascade e2e') }) })
  ).body;
  await call(`/stacks/${stack.id}/context-rows`, {
    method: 'POST',
    body: {
      microActionId: 'action-1',
      microActionTitle: bilingual('A'),
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
    },
  });
  assert.equal((await call(`/stacks/${stack.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await call(`/stacks/${stack.id}/context-rows`)).status, 404);
});

test('duplicating a stack yields a draft copy with its own rows', async () => {
  const stacks = (await call('/stacks')).body;
  const source = stacks.find((stack) => stack.actionCount > 0);
  assert.ok(source, 'the seed has a stack with rows');
  const copy = (await call(`/stacks/${source.id}/duplicate`, { method: 'POST' })).body;
  assert.equal(copy.isActive, false);
  assert.equal(copy.actionCount, source.actionCount);
  const rows = (await call(`/stacks/${copy.id}/context-rows`)).body;
  const sourceRows = (await call(`/stacks/${source.id}/context-rows`)).body;
  const sourceIds = new Set(sourceRows.map((row) => row.id));
  assert.ok(
    rows.every((row) => !sourceIds.has(row.relativeToContextId)),
    'no copied row points into the source stack',
  );
  assert.equal((await call(`/stacks/${copy.id}`, { method: 'DELETE' })).status, 204);
});
