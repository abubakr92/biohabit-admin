export {};
// Writes `createdAt` onto user documents that lack it, taking the value from the Firebase Auth
// account's creation time. Only touches documents missing the field; never overwrites an existing
// value and never deletes anything.
async function main() {
  if (process.env.CONFIRM_BACKFILL !== 'biohabit') throw new Error('Set CONFIRM_BACKFILL=biohabit to confirm the backfill.');
  const { adminAuth, db } = await import('../firebase');
  const snapshot = await db.collection('users').get();
  const missing = snapshot.docs.filter((document) => !document.get('createdAt'));
  if (!missing.length) { console.log('Nothing to backfill; every user document already has createdAt.'); return; }

  const guessed: string[] = [];
  let batch = db.batch(); let queued = 0;
  for (const document of missing) {
    let createdAt: string | null = null;
    try { const account = await adminAuth.getUser(document.id); createdAt = account.metadata.creationTime ? new Date(account.metadata.creationTime).toISOString() : null; }
    catch { createdAt = null; }
    if (!createdAt) guessed.push(document.id);
    batch.update(document.ref, { createdAt: createdAt ?? new Date().toISOString() });
    queued += 1;
    if (queued === 400) { await batch.commit(); batch = db.batch(); queued = 0; }
  }
  if (queued) await batch.commit();

  console.log(`Backfilled createdAt on ${missing.length} user document(s).`);
  if (guessed.length) {
    console.log(`\n${guessed.length} had no matching Firebase Auth account, so the current time was used and they will sort as newest:`);
    guessed.slice(0, 20).forEach((id) => console.log(`  ${id}`));
    if (guessed.length > 20) console.log(`  … and ${guessed.length - 20} more.`);
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
