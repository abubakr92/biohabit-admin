/**
 * Account deletion, Bird step: removes what Bird keeps about a member's email address that its API
 * can remove — the contact record (if one exists) and the bounce / manual suppressions. Sending a
 * code does not create a contact, so usually there is nothing but suppressions, and often nothing.
 *
 * Not removable through the API, so not attempted:
 *  - the message log (sender, recipient, subject, delivery events): no delete endpoint exists; it
 *    expires under the workspace's retention;
 *  - a `complaint` suppression: Bird lets only a signed-in dashboard user remove it (422).
 *
 * Docs: bird.com/docs/api/regions, /guides/email/contacts, /guides/email/suppressions.
 * The key needs email_marketing:write (contacts) and email_management:write (suppressions).
 */

export interface BirdErasure { contacts: number; suppressions: number; notRemovable: number }

type Fetch = typeof fetch;

/** The key's prefix names its region (bk_eu1_…, bk_us1_…); a request to the other region fails with 421. */
export function birdHost(apiKey: string) {
  const region = /^b[km]_([a-z]+\d+)_/.exec(apiKey)?.[1];
  if (!region) throw new Error('Bird key has no region prefix');
  return `https://${region}.platform.bird.com`;
}

export async function eraseFromBird(email: unknown, apiKey: string | undefined, fetchImpl: Fetch = fetch): Promise<BirdErasure | 'none'> {
  if (typeof email !== 'string' || !email.trim()) return 'none';
  if (!apiKey) throw new Error('Bird key missing');
  const address = email.trim().toLowerCase();
  const host = birdHost(apiKey);
  type Page = { data?: Array<{ id: string; email?: string; reason?: string }> };
  const call = async (method: 'GET' | 'DELETE', path: string): Promise<{ response: Response; body: Page | null }> => {
    const response = await fetchImpl(`${host}${path}`, { method, headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
    if (method === 'DELETE' && response.status === 404) return { response, body: null };
    if (!response.ok && !(method === 'DELETE' && response.status === 422)) throw Object.assign(new Error(`Bird ${method} failed`), { status: response.status });
    return { response, body: method === 'GET' ? ((await response.json()) as Page) : null };
  };
  const query = encodeURIComponent(address);
  const result: BirdErasure = { contacts: 0, suppressions: 0, notRemovable: 0 };

  // `email` on contacts is an exact, case-insensitive match: at most one contact.
  const contacts = (await call('GET', `/v1/contacts?email=${query}`)).body?.data ?? [];
  for (const contact of contacts) { await call('DELETE', `/v1/contacts/${encodeURIComponent(contact.id)}`); result.contacts++; }

  // `email` on suppressions is a prefix match, so compare each address; one record per reason.
  let cursor: string | null = null;
  const matches: Array<{ id: string; reason?: string }> = [];
  do {
    const page: Page | null = (await call('GET', `/v1/email/suppressions?email=${query}&limit=100${cursor ? `&starting_after=${encodeURIComponent(cursor)}` : ''}`)).body;
    matches.push(...(page?.data ?? []).filter((record) => record.email?.toLowerCase() === address));
    // A full page may have more after it; `starting_after` takes the last record's ID.
    const data: NonNullable<Page['data']> = page?.data ?? [];
    cursor = data.length === 100 ? data[data.length - 1].id : null;
  } while (cursor);
  for (const record of matches) {
    if (record.reason === 'complaint') { result.notRemovable++; continue; }
    const { response } = await call('DELETE', `/v1/email/suppressions/${encodeURIComponent(record.id)}`);
    if (response.status === 422) result.notRemovable++; else result.suppressions++;
  }
  return result;
}
