/**
 * Build 1, Admin P1: the Apple reviewer account. Email and password, no six-digit code, content
 * already unlocked. `verified` is what the code screen waits for and `unlockedAt` is what the panel's
 * Unlock button sets; preferences stay empty so a reviewer walks through onboarding.
 *
 * Refuses to touch an address that already has an account. The password is generated here, printed
 * once and never stored.
 *
 *   npm --prefix functions run create-reviewer -- reviewer@example.com
 */
export {};

async function main() {
  const { randomBytes } = await import('node:crypto');
  const { Timestamp } = await import('firebase-admin/firestore');
  const { adminAuth, db } = await import('../firebase');
  const email = process.argv[2];
  if (!email?.includes('@')) throw new Error('Pass the reviewer email address.');
  const existing = await adminAuth.getUserByEmail(email).catch(() => null);
  if (existing) throw new Error(`${email} already has an account (${existing.uid}). Nothing changed.`);

  const password = randomBytes(12).toString('base64url');
  const user = await adminAuth.createUser({ email, password, emailVerified: true, displayName: 'App Review' });
  const now = Timestamp.now();
  await db.collection('users').doc(user.uid).set({ email, name: 'App Review', accessLevel: 'user', verified: true, rhythmDaysCount: 0, lastCheckOffAt: null, unlockedAt: now, createdAt: now });
  console.log(`Created ${user.uid}\n  email:    ${email}\n  password: ${password}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
