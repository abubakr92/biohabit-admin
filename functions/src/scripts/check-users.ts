export {};
// Reports user documents that the paginated /users endpoint cannot return. Firestore orders that
// query by `createdAt`, and an orderBy silently excludes documents missing the field — so a user
// document written without it is invisible in the admin panel. Read-only; writes nothing.
async function main() {
  const { db } = await import('../firebase');
  const snapshot = await db.collection('users').get();
  const missing = snapshot.docs.filter((document) => !document.get('createdAt'));
  console.log(`users: ${snapshot.size} document(s), ${missing.length} without createdAt.`);
  if (!missing.length) { console.log('Every user document is reachable by the admin panel.'); return; }
  console.log('\nInvisible in the paginated /users list until backfilled:');
  missing.slice(0, 20).forEach((document) => console.log(`  ${document.id}  ${document.get('email') ?? '(no email)'}`));
  if (missing.length > 20) console.log(`  … and ${missing.length - 20} more.`);
  console.log('\nFix with: CONFIRM_BACKFILL=biohabit npm --prefix functions run backfill-users');
  console.log('Then make the mobile signup path write createdAt so new accounts do not regress.');
  process.exitCode = 1;
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
