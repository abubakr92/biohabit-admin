/**
 * Live test of the Bird erasure step on a TEST address only — never a member's.
 *
 *   $env:BIRD_DELETION_KEY = '<key from the Bird dashboard>'   # in your own terminal, not in a file
 *   npm --prefix functions run bird-erasure-test -- --email test+bird@cintra.example
 *
 * 1. Creates a contact and a manual suppression for the test address (both Bird objects the
 *    erasure step removes), 2. runs the same erasure code the deletion trigger runs, 3. checks
 *    Bird again and prints what is left. Prints counts and the test address only.
 */
import { GoogleAuth } from 'google-auth-library';
import { birdHost, eraseFromBird } from '../bird';

async function secretFromManager() {
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
  const url = 'https://secretmanager.googleapis.com/v1/projects/biohabit/secrets/BIRD_DELETION_KEY/versions/latest:access';
  const { data } = await client.request<{ payload?: { data?: string } }>({ url });
  return data.payload?.data ? Buffer.from(data.payload.data, 'base64').toString('utf8') : undefined;
}

async function main() {
  const email = process.argv[process.argv.indexOf('--email') + 1];
  if (!process.argv.includes('--email') || !email || !email.includes('@')) throw new Error('Pass --email <test address>.');
  // The same key the deployed function uses, read from Secret Manager in memory; never printed.
  const key = (process.env.BIRD_DELETION_KEY || (await secretFromManager()))?.trim();
  if (!key) throw new Error('No Bird key: set the BIRD_DELETION_KEY secret first.');
  const host = birdHost(key);
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' };
  const count = async (path: string) => {
    const response = await fetch(`${host}${path}${encodeURIComponent(email.toLowerCase())}`, { headers });
    if (!response.ok) throw new Error(`GET ${path} -> ${response.status}`);
    return ((await response.json()) as { data?: Array<{ email?: string }> }).data?.filter((item) => item.email?.toLowerCase() === email.toLowerCase()).length ?? 0;
  };
  for (const [path, body] of [['/v1/contacts', { email }], ['/v1/email/suppressions', { email }]] as const) {
    const response = await fetch(`${host}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    console.log(`setup POST ${path}: ${response.status}`);
  }
  console.log('before:', { contacts: await count('/v1/contacts?email='), suppressions: await count('/v1/email/suppressions?limit=100&email=') });
  console.log('erasure:', await eraseFromBird(email, key));
  const after = { contacts: await count('/v1/contacts?email='), suppressions: await count('/v1/email/suppressions?limit=100&email=') };
  console.log('after:', after);
  console.log(after.contacts === 0 && after.suppressions === 0 ? 'PASS' : 'FAIL');
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
