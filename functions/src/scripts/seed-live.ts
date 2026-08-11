export {};
async function main() {
  if (process.env.CONFIRM_LIVE_SEED !== 'biohabit') throw new Error('Set CONFIRM_LIVE_SEED=biohabit to confirm the idempotent live seed.');
  const [{ db }, seed] = await Promise.all([import('../firebase'), import('../seed-data')]);
  const batch = db.batch(); const now = new Date().toISOString();
  seed.labels.forEach((label, index) => batch.set(db.collection('labels').doc(`label-${index + 1}`), label, { merge: true }));
  seed.actions.forEach((action, index) => batch.set(db.collection('microActions').doc(`action-${index + 1}`), action, { merge: true }));
  seed.stacks.forEach((stack, index) => { batch.set(db.collection('stacks').doc(`stack-${index + 1}`), { ...stack, createdAt: new Date(2026, 0, index + 2).toISOString(), updatedAt: now }, { merge: true }); seed.contextRows(index).forEach((row, rowIndex) => batch.set(db.collection('contextRows').doc(`context-${index + 1}-${rowIndex + 1}`), { ...row, stackId: `stack-${index + 1}` }, { merge: true })); });
  await batch.commit(); console.log('Live BIOHABIT content seeded: 8 labels, 25 actions, 8 stacks, 32 context rows.');
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
