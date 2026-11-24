// Bird erasure step, against a fake Bird API (no network, no real key).
const test = require('node:test');
const assert = require('node:assert/strict');
const { eraseFromBird, birdHost } = require('../lib/bird');

const KEY = 'bk_eu1_test';

function fakeBird({ contacts = [], suppressions = [], failOn } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const { pathname, searchParams } = new URL(url);
    calls.push(`${init.method} ${pathname}${init.method === 'GET' ? `?${searchParams}` : ''}`);
    assert.equal(init.headers.Authorization, `Bearer ${KEY}`);
    const reply = (status, body) => ({ ok: status < 300, status, json: async () => body });
    if (failOn && pathname.startsWith(failOn)) return reply(500, {});
    if (init.method === 'GET' && pathname === '/v1/contacts') return reply(200, { data: contacts.filter((c) => c.email === searchParams.get('email')) });
    if (init.method === 'GET' && pathname === '/v1/email/suppressions') {
      const all = suppressions.filter((s) => s.email.startsWith(searchParams.get('email')));
      const after = searchParams.get('starting_after');
      const start = after ? all.findIndex((s) => s.id === after) + 1 : 0;
      return reply(200, { data: all.slice(start, start + Number(searchParams.get('limit'))) });
    }
    if (init.method === 'DELETE' && pathname.startsWith('/v1/email/suppressions/')) {
      const record = suppressions.find((s) => s.id === pathname.split('/').pop());
      if (!record) return reply(404, {});
      return reply(record.reason === 'complaint' ? 422 : 204, {});
    }
    if (init.method === 'DELETE' && pathname.startsWith('/v1/contacts/')) return reply(204, {});
    return reply(400, {});
  };
  return { fetchImpl, calls };
}

test('the key prefix picks the region host', () => {
  assert.equal(birdHost('bk_eu1_abc'), 'https://eu1.platform.bird.com');
  assert.equal(birdHost('bk_us1_abc'), 'https://us1.platform.bird.com');
  assert.throws(() => birdHost('nonsense'));
});

test('no email address: nothing is sent to Bird', async () => {
  const bird = fakeBird();
  assert.equal(await eraseFromBird(undefined, KEY, bird.fetchImpl), 'none');
  assert.equal(await eraseFromBird('  ', KEY, bird.fetchImpl), 'none');
  assert.equal(bird.calls.length, 0);
});

test('removes the contact and the bounce and manual suppressions, matching the address exactly', async () => {
  const bird = fakeBird({
    contacts: [{ id: 'con_1', email: 'bob@example.com' }],
    suppressions: [
      { id: 'sup_1', email: 'bob@example.com', reason: 'hard_bounce' },
      { id: 'sup_2', email: 'bob@example.com', reason: 'manual' },
      { id: 'sup_3', email: 'bob@example.com.au', reason: 'manual' },
    ],
  });
  assert.deepEqual(await eraseFromBird(' Bob@Example.com ', KEY, bird.fetchImpl), { contacts: 1, suppressions: 2, notRemovable: 0 });
  assert.ok(bird.calls.includes('DELETE /v1/contacts/con_1'));
  assert.ok(!bird.calls.includes('DELETE /v1/email/suppressions/sup_3'), 'a longer address that shares the prefix is left alone');
});

test('a complaint suppression is counted as not removable, not deleted', async () => {
  const bird = fakeBird({ suppressions: [{ id: 'sup_c', email: 'c@example.com', reason: 'complaint' }] });
  assert.deepEqual(await eraseFromBird('c@example.com', KEY, bird.fetchImpl), { contacts: 0, suppressions: 0, notRemovable: 1 });
  assert.ok(!bird.calls.some((call) => call.startsWith('DELETE')));
});

test('follows pages of suppressions', async () => {
  const suppressions = Array.from({ length: 150 }, (_, n) => ({ id: `sup_${n}`, email: 'p@example.com', reason: 'manual' }));
  const bird = fakeBird({ suppressions });
  assert.deepEqual(await eraseFromBird('p@example.com', KEY, bird.fetchImpl), { contacts: 0, suppressions: 150, notRemovable: 0 });
});

test('nothing at Bird: zero counts', async () => {
  assert.deepEqual(await eraseFromBird('none@example.com', KEY, fakeBird().fetchImpl), { contacts: 0, suppressions: 0, notRemovable: 0 });
});

test('a Bird error is thrown, so the trigger logs it', async () => {
  await assert.rejects(eraseFromBird('x@example.com', KEY, fakeBird({ failOn: '/v1/contacts' }).fetchImpl), (error) => error.status === 500);
  await assert.rejects(eraseFromBird('x@example.com', undefined, fakeBird().fetchImpl), /key missing/);
});
