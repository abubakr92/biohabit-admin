// Post-deploy smoke test for the live API. Needs no credentials — every check is either public or
// expects a rejection. Run immediately after `npm run firebase:deploy`.
//   node scripts/verify-deployment.mjs [apiBaseUrl] [panelOrigin]
const API = process.argv[2] ?? 'https://europe-west4-biohabit.cloudfunctions.net/api';
const PANEL_ORIGIN = process.argv[3] ?? 'http://localhost:3000';
const STRANGER = 'https://not-the-panel.example';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${detail && !ok ? `\n        ${detail}` : ''}`);
  if (!ok) failures += 1;
};
const get = async (path, origin) => {
  const response = await fetch(`${API}${path}`, { headers: origin ? { Origin: origin } : {} });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    status: response.status,
    acao: response.headers.get('access-control-allow-origin'),
    body,
  };
};

console.log(`\nVerifying ${API}\n`);

const health = await get('/health');
check('health responds 200', health.status === 200, `got ${health.status}`);
check(
  'health reports the right project',
  health.body?.project === 'biohabit',
  JSON.stringify(health.body),
);

const unauth = await get('/stacks');
check(
  'data endpoints reject an unauthenticated request',
  unauth.status === 401,
  `got ${unauth.status}`,
);

// Auth runs ahead of routing, so an unknown path is refused before it can reveal whether it
// exists. The authenticated JSON-404 behaviour is covered by functions/test/api.test.js.
const notFound = await get('/definitely-not-a-route');
check(
  'unknown routes are gated by auth, not enumerable',
  notFound.status === 401 && typeof notFound.body?.message === 'string',
  `got ${notFound.status} ${JSON.stringify(notFound.body)}`,
);

// The check the emulator cannot make: it injects a permissive CORS header of its own.
const panel = await get('/health', PANEL_ORIGIN);
check(
  `CORS admits the panel origin (${PANEL_ORIGIN})`,
  panel.acao === PANEL_ORIGIN,
  `Access-Control-Allow-Origin: ${panel.acao}\n        Add this origin to ADMIN_ORIGINS in functions/.env and redeploy.`,
);

const stranger = await get('/health', STRANGER);
check(
  'CORS refuses an unknown origin',
  stranger.acao === null,
  `Access-Control-Allow-Origin: ${stranger.acao}\n        An arbitrary origin is being echoed — the old permissive build is still live.`,
);

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
