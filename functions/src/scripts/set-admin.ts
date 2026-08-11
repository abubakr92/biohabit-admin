export {};
async function main() {
  const email = process.argv[2]; if (!email) throw new Error('Usage: npm run set-admin -- admin@example.com');
  const { adminAuth, db } = await import('../firebase'); const user = await adminAuth.getUserByEmail(email); const existingClaims = user.customClaims ?? {};
  await adminAuth.setCustomUserClaims(user.uid, { ...existingClaims, admin: true, accessLevel: 'admin' });
  await db.collection('users').doc(user.uid).set({ email, accessLevel: 'admin', rhythmDaysCount: 0, unlockedAt: new Date().toISOString(), lastCheckOffAt: null, createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString() }, { merge: true });
  console.log(`Admin access granted to ${email} (${user.uid}).`);
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
