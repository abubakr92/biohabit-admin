export {};
async function main() {
  const { db } = await import('../firebase');
  const collections = await db.listCollections();
  if (!collections.length) { console.log('No live Firestore collections found.'); return; }
  for (const collection of collections) { const snapshot = await collection.count().get(); console.log(`${collection.id}: ${snapshot.data().count}`); }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
