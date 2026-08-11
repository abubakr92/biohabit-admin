process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT ?? 'biohabit';
export {};
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

async function main() {
  const [{ adminAuth, db }, seed] = await Promise.all([import('../firebase'), import('../seed-data')]);
  let admin;
  try { admin = await adminAuth.getUserByEmail('admin@biohabit.app'); } catch { admin = await adminAuth.createUser({ email: 'admin@biohabit.app', password: 'biohabit-dev', emailVerified: true }); }
  await adminAuth.setCustomUserClaims(admin.uid, { admin: true, accessLevel: 'admin' });
  const batch = db.batch(); const now = new Date().toISOString();
  batch.set(db.collection('users').doc(admin.uid), { email: 'admin@biohabit.app', accessLevel: 'admin', rhythmDaysCount: 7, unlockedAt: now, lastCheckOffAt: now, createdAt: now });
  seed.labels.forEach((label, index) => batch.set(db.collection('labels').doc(`label-${index + 1}`), label));
  seed.actions.forEach((action, index) => batch.set(db.collection('microActions').doc(`action-${index + 1}`), action));
  seed.stacks.forEach((stack, index) => { batch.set(db.collection('stacks').doc(`stack-${index + 1}`), { ...stack, createdAt: new Date(2026, 0, index + 2).toISOString(), updatedAt: now }); seed.contextRows(index).forEach((row, rowIndex) => batch.set(db.collection('contextRows').doc(`context-${index + 1}-${rowIndex + 1}`), { ...row, stackId: `stack-${index + 1}` })); });
  for (let index = 0; index < 15; index += 1) batch.set(db.collection('users').doc(`tester-${index + 1}`), { email: `tester${String(index + 1).padStart(2, '0')}@example.com`, accessLevel: ['test', 'free', 'premium'][index % 3], rhythmDaysCount: (index * 3) % 8, unlockedAt: index % 3 === 0 ? now : null, lastCheckOffAt: index % 5 === 0 ? null : new Date(Date.now() - (index % 6) * 86_400_000).toISOString(), createdAt: new Date(2026, 2, index + 1).toISOString() });
  await batch.commit(); console.log('Emulator seeded. Login: admin@biohabit.app / biohabit-dev');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
